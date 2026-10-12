import {
  COLS,
  DEFENDERS,
  FIRST_TROJAN_DELAY_MS,
  PACKET_FALL_MS,
  PACKET_LINGER_MS,
  PACKET_VALUE,
  ROWS,
  START_RESOURCES,
  type DefenderId,
} from "../data/balance";
import { advance } from "./simulate";

// A match as plain data and a pure reducer: no timers, no randomness, no React. Whoever drives it
// (the game loop, the packet rain, the player's taps) passes the time and the dice in with the
// action, so the same actions always give the same match.

export interface Packet {
  id: number;
  /** Horizontal position, % of the board's width. */
  x: number;
  /** Where it comes to rest, % of the board's height. */
  landY: number;
  value: number;
  /** `performance.now()` of the drop; the packet expires counting from it. */
  bornAt: number;
}

/** A defender standing on a cell. */
export interface Tower {
  kind: DefenderId;
  hp: number;
  /** Match time from which a shooter may fire again. */
  readyAtMs: number;
}

/** A Trojan, or the rare Elite Virus. */
export interface Enemy {
  id: number;
  kind: "trojan" | "elite";
  row: number;
  /** Its front (left) edge, in cells from the board's left edge. */
  x: number;
  hp: number;
  /** The health it arrived with — newcomers get tougher as the run goes on. */
  maxHp: number;
  /** Standing at a tower and biting it. */
  eating: boolean;
  /** Match time until which it is chilled and walks slower; an icy hit moves it on. */
  chilledUntilMs: number;
}

/** A shooter's projectile, flying right along its lane. */
export interface Bit {
  id: number;
  row: number;
  x: number;
  /** The tower that fired it: what a hit does, and how the shot looks. */
  from: DefenderId;
}

/** A mine that has just gone off — only something to draw. */
export interface Blast {
  id: number;
  row: number;
  col: number;
  untilMs: number;
}

export interface GameState {
  /** "lost" — a Trojan reached the left edge: the match stands still until "restart". */
  status: "playing" | "lost";
  /** The match's own clock: it runs only while the game loop ticks. */
  timeMs: number;
  /** Data packets the player can spend. */
  resources: number;
  /** What this run started with, the holder's bonus included. */
  startResources: number;
  /** Extra starting packets, % — kept for the runs that follow (see "setStartBonus"). */
  startBonusPercent: number;
  /** Viruses destroyed in this run, Elite ones included… */
  kills: number;
  /** …and how many of them were Elite. */
  eliteKills: number;
  /** What the leaderboard ranks the run by. */
  score: number;
  /** Arrivals so far — what the growing pressure is counted from. */
  spawned: number;
  /** ROWS × COLS cells, row by row; `null` — empty. */
  grid: readonly (Tower | null)[];
  /** The inventory card picked for placing. */
  selected: DefenderId | null;
  /** Packets falling or waiting on the board. */
  packets: readonly Packet[];
  enemies: readonly Enemy[];
  bits: readonly Bit[];
  blasts: readonly Blast[];
  nextSpawnAtMs: number;
  /** One counter for everything that needs an id (packets, viruses, shots, blasts). */
  nextId: number;
}

export type GameAction =
  | { type: "tick"; dtMs: number; laneRoll: number; eliteRoll: number }
  | { type: "dropPacket"; x: number; landY: number; now: number }
  | { type: "collectPacket"; id: number }
  | { type: "expirePackets"; now: number }
  | { type: "clearPackets" }
  | { type: "toggleCard"; id: DefenderId }
  | { type: "placeAt"; cell: number }
  | { type: "setStartBonus"; percent: number }
  | { type: "restart" };

function startResourcesWith(bonusPercent: number): number {
  return Math.round(START_RESOURCES * (1 + bonusPercent / 100));
}

export function createInitialState(startBonusPercent = 0): GameState {
  const startResources = startResourcesWith(startBonusPercent);
  return {
    status: "playing",
    timeMs: 0,
    resources: startResources,
    startResources,
    startBonusPercent,
    kills: 0,
    eliteKills: 0,
    score: 0,
    spawned: 0,
    grid: new Array<Tower | null>(ROWS * COLS).fill(null),
    selected: null,
    packets: [],
    enemies: [],
    bits: [],
    blasts: [],
    nextSpawnAtMs: FIRST_TROJAN_DELAY_MS,
    nextId: 1,
  };
}

export function canAfford(state: GameState, id: DefenderId): boolean {
  return state.resources >= DEFENDERS[id].cost;
}

/** Whether the picked card can go to this cell: a card is picked and paid for, the cell is empty. */
export function canPlaceAt(state: GameState, cell: number): boolean {
  return (
    state.selected !== null &&
    canAfford(state, state.selected) &&
    // A cell off the board reads `undefined`, so it is refused as well.
    state.grid[cell] === null
  );
}

/** Returns the SAME state object when the action changes nothing — the store relies on it. */
export function reduce(state: GameState, action: GameAction): GameState {
  if (action.type === "restart") {
    return {
      ...createInitialState(state.startBonusPercent),
      // Ids go on: something of the lost match may still be fading out on screen under its key.
      nextId: state.nextId,
    };
  }
  if (action.type === "setStartBonus") {
    if (action.percent === state.startBonusPercent) return state;
    // Known from the next run on — and in this one too while it has not really begun (no Trojan
    // has arrived yet), so a bonus that loads a moment after "Play" is not lost for a whole run.
    const fresh = state.status === "playing" && state.spawned === 0;
    const startResources = fresh
      ? startResourcesWith(action.percent)
      : state.startResources;
    return {
      ...state,
      startBonusPercent: action.percent,
      startResources,
      resources: state.resources + (startResources - state.startResources),
    };
  }
  // A lost match stands still: nothing moves, nothing can be bought or caught.
  if (state.status !== "playing") return state;

  switch (action.type) {
    case "tick":
      return advance(state, action.dtMs, action.laneRoll, action.eliteRoll);

    case "dropPacket":
      return {
        ...state,
        packets: [
          ...state.packets,
          {
            id: state.nextId,
            x: action.x,
            landY: action.landY,
            value: PACKET_VALUE,
            bornAt: action.now,
          },
        ],
        nextId: state.nextId + 1,
      };

    case "collectPacket": {
      const packet = state.packets.find((p) => p.id === action.id);
      if (!packet) return state;
      return {
        ...state,
        resources: state.resources + packet.value,
        packets: state.packets.filter((p) => p !== packet),
      };
    }

    case "expirePackets": {
      const packets = state.packets.filter(
        (p) => action.now - p.bornAt < PACKET_FALL_MS + PACKET_LINGER_MS,
      );
      return packets.length === state.packets.length
        ? state
        : { ...state, packets };
    }

    case "clearPackets":
      return state.packets.length === 0 ? state : { ...state, packets: [] };

    case "toggleCard":
      if (state.selected === action.id) return { ...state, selected: null };
      return canAfford(state, action.id)
        ? { ...state, selected: action.id }
        : state;

    case "placeAt": {
      const id = state.selected;
      if (id === null || !canPlaceAt(state, action.cell)) return state;
      const grid = state.grid.slice();
      grid[action.cell] = { kind: id, hp: DEFENDERS[id].hp, readyAtMs: 0 };
      return {
        ...state,
        grid,
        resources: state.resources - DEFENDERS[id].cost,
        // One card — one defender: the next one is picked again, as in the genre.
        selected: null,
      };
    }
  }
}
