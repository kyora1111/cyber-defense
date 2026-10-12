import {
  BIT_SPEED,
  BLAST_MS,
  CHILL_MS,
  CHILL_SPEED_FACTOR,
  COLS,
  DEFENDERS,
  ELITE_CHANCE,
  ELITE_HP_FACTOR,
  ELITE_SCORE,
  ROWS,
  TROJAN_BITE_DPS,
  TROJAN_HP,
  TROJAN_HP_GROWTH,
  TROJAN_SCORE,
  TROJAN_SPAWN_ACCELERATION,
  TROJAN_SPAWN_INTERVAL_MIN_MS,
  TROJAN_SPAWN_INTERVAL_MS,
  TROJAN_SPEED,
  type DefenderId,
  type ShotDef,
} from "../data/balance";
import type { Bit, Blast, Enemy, GameState, Tower } from "./state";

// One step of a running match: viruses arrive and walk, shooters fire, shots hit and icy ones chill,
// mines go off, towers get eaten, kills are scored, and a virus at the left edge loses the match.
// Everything on the board moves here and nowhere else — the screen only draws what this returns.
// Geometry is in cells: `x` from the board's left edge, a lane is a row.

/** A Trojan's body, measured from its front (left) edge. */
const TROJAN_WIDTH = 0.7;
/** The part of a cell a tower stands on — what a Trojan has to reach to touch it. */
const TOWER_LEFT = 0.15;
const TOWER_RIGHT = 0.85;
/** Where a shooter's bit leaves it. */
const MUZZLE = 0.8;
/** A new Trojan's front is this far beyond the right edge, so its whole body starts off the board. */
const SPAWN_OFFSET = 0.1;

/** What a tower of this kind fires, if it fires at all. */
function shotOf(kind: DefenderId): ShotDef | null {
  const def = DEFENDERS[kind];
  return def.role === "shooter" ? def.shot : null;
}

function overlaps(enemy: Enemy, from: number, to: number): boolean {
  return enemy.x <= to && enemy.x + TROJAN_WIDTH >= from;
}

/** The tower this Trojan touches — the rightmost one, the first it met — or -1. */
function touchedCell(grid: readonly (Tower | null)[], enemy: Enemy): number {
  for (let col = COLS - 1; col >= 0; col--) {
    const cell = enemy.row * COLS + col;
    if (grid[cell] && overlaps(enemy, col + TOWER_LEFT, col + TOWER_RIGHT)) {
      return cell;
    }
  }
  return -1;
}

/**
 * The match `dtMs` later. The rolls are this step's dice in [0, 1), used only if a virus arrives:
 * `laneRoll` picks its lane, `eliteRoll` decides whether it is an Elite one. The caller keeps `dtMs`
 * small (a frame); nothing here is fast enough to skip over a cell in one.
 */
export function advance(
  state: GameState,
  dtMs: number,
  laneRoll: number,
  eliteRoll: number,
): GameState {
  const dt = dtMs / 1000;
  const timeMs = state.timeMs + dtMs;
  let nextId = state.nextId;

  // The grid is copied on the first write only: the board redraws just the cells that changed.
  let draft: (Tower | null)[] | null = null;
  const grid = (): readonly (Tower | null)[] => draft ?? state.grid;
  const setCell = (cell: number, tower: Tower | null): void => {
    draft ??= state.grid.slice();
    draft[cell] = tower;
  };

  // Trojans are copied once and then changed in place for the rest of the step.
  const enemies: Enemy[] = state.enemies.map((e) => ({ ...e }));
  let nextSpawnAtMs = state.nextSpawnAtMs;
  let spawned = state.spawned;
  if (timeMs >= nextSpawnAtMs) {
    const elite = eliteRoll < ELITE_CHANCE;
    // Every arrival is a little tougher than the last, and the next one comes a little sooner.
    const hp = Math.round(
      TROJAN_HP *
        (1 + spawned * TROJAN_HP_GROWTH) *
        (elite ? ELITE_HP_FACTOR : 1),
    );
    enemies.push({
      id: nextId++,
      kind: elite ? "elite" : "trojan",
      row: Math.min(ROWS - 1, Math.floor(laneRoll * ROWS)),
      x: COLS + SPAWN_OFFSET,
      hp,
      maxHp: hp,
      eating: false,
      chilledUntilMs: 0,
    });
    nextSpawnAtMs += Math.max(
      TROJAN_SPAWN_INTERVAL_MIN_MS,
      TROJAN_SPAWN_INTERVAL_MS * TROJAN_SPAWN_ACCELERATION ** spawned,
    );
    spawned++;
  }

  // Shooters fire ONLY while a Trojan is in their lane: on the board and not yet past them.
  const bits: Bit[] = state.bits.slice();
  state.grid.forEach((tower, cell) => {
    const shot = tower ? shotOf(tower.kind) : null;
    if (!tower || !shot || timeMs < tower.readyAtMs) return;
    const row = Math.floor(cell / COLS);
    const col = cell % COLS;
    const hasTarget = enemies.some(
      (e) => e.row === row && e.x <= COLS && e.x + TROJAN_WIDTH >= col,
    );
    if (!hasTarget) return;
    bits.push({ id: nextId++, row, x: col + MUZZLE, from: tower.kind });
    // The next shot is timed from when this one was due, not from the frame that fired it, so a
    // tower's rate of fire does not depend on the frame rate. A tower that had been waiting for a
    // target, not for its reload, counts from now.
    const dueAt = tower.readyAtMs > state.timeMs ? tower.readyAtMs : timeMs;
    setCell(cell, { ...tower, readyAtMs: dueAt + shot.intervalMs });
  });

  // Bits fly right; each one stops in the first Trojan on its way. The whole stretch flown this
  // step is checked, not just where the bit ends up.
  const flying: Bit[] = [];
  for (const bit of bits) {
    const to = bit.x + BIT_SPEED * dt;
    let hit: Enemy | undefined;
    for (const e of enemies) {
      if (e.row !== bit.row || e.hp <= 0 || !overlaps(e, bit.x, to)) continue;
      if (!hit || e.x < hit.x) hit = e;
    }
    if (!hit) {
      // A bit that passed everyone is gone at the right edge.
      if (to <= COLS) flying.push({ ...bit, x: to });
      continue;
    }
    const shot = shotOf(bit.from);
    if (!shot) continue;
    hit.hp -= shot.damage;
    // The chill does not add up: a virus already chilled is only chilled for longer.
    if (shot.chills) hit.chilledUntilMs = timeMs + CHILL_MS;
  }

  // Trojans: a mine goes off under the first one to touch it, a tower is stood at and bitten,
  // an open lane is walked — slower while chilled. The chill is on the walk only, not on the bite.
  const blasts: Blast[] = state.blasts.filter((b) => b.untilMs > timeMs);
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    const cell = touchedCell(grid(), e);
    const tower = cell === -1 ? null : grid()[cell];
    if (!tower) {
      e.eating = false;
      const pace = timeMs < e.chilledUntilMs ? CHILL_SPEED_FACTOR : 1;
      e.x -= TROJAN_SPEED * pace * dt;
      continue;
    }
    if (DEFENDERS[tower.kind].role === "mine") {
      // Lethal to every Trojan in the mine's cell, whatever its health.
      const col = cell % COLS;
      for (const other of enemies) {
        if (other.row === e.row && overlaps(other, col, col + 1)) other.hp = 0;
      }
      setCell(cell, null);
      blasts.push({
        id: nextId++,
        row: e.row,
        col,
        untilMs: timeMs + BLAST_MS,
      });
      continue;
    }
    e.eating = true;
    const hp = tower.hp - TROJAN_BITE_DPS * dt;
    setCell(cell, hp > 0 ? { ...tower, hp } : null);
  }

  // The destroyed leave the board and are counted: every virus scores, an Elite one more.
  const alive: Enemy[] = [];
  let kills = state.kills;
  let eliteKills = state.eliteKills;
  let score = state.score;
  for (const e of enemies) {
    if (e.hp > 0) {
      alive.push(e);
      continue;
    }
    kills++;
    if (e.kind === "elite") eliteKills++;
    score += e.kind === "elite" ? ELITE_SCORE : TROJAN_SCORE;
  }

  const next: GameState = {
    ...state,
    timeMs,
    nextSpawnAtMs,
    spawned,
    nextId,
    grid: grid(),
    enemies: alive,
    bits: flying,
    blasts,
    kills,
    eliteKills,
    score,
  };
  // A Trojan at the left edge of the board ends the match; the board stays as it was for the
  // Game Over screen, minus what the player could still act on.
  return alive.some((e) => e.x <= 0)
    ? { ...next, status: "lost", selected: null, packets: [] }
    : next;
}
