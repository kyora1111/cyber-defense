import type { IDosGamesClient, UserState } from "@idosgames/core";
import { configSection } from "@idosgames/react/ui";
import {
  HOLD_PERKS,
  hasPerk,
  perkActiveUntil,
  type HoldPerk,
} from "../../../shared/zday";
import { LEADERBOARD_ID } from "../data/platform";
import { loadoutFor, type SkinLoadout } from "../data/skins";
import type { GameState } from "../game/state";
import type { GameStore } from "../game/store";
import { createHoldWatch, type HoldState } from "./hold";

// The seam between the match and the platform. The match itself is client-side and knows nothing of
// the SDK (game/); this is where what happens in it reaches the Title, and what the Title holds for
// the player reaches the match:
//   out — a finished run's score to the leaderboard;
//   in  — the perks for holding $ZDAY: the skins the towers wear and the start bonus.
// Nothing here pays the player: $ZDAY is not earned in the game. It lives for the session next to
// the match's store (the module creates both in setup()), so a score on its way to the server
// survives the game's panel being closed.

/** How a run's score is getting on with the server — what the Game Over screen tells. */
export interface RunReport {
  /** "none" — nothing to send (a zero score), or no such board on the Title. */
  score: "none" | "sending" | "sent" | "failed";
  scoreError: string | null;
}

export interface SessionState {
  /** The skin each defender wears — the skins whose perk works for the player. */
  loadout: SkinLoadout;
  /** Extra starting data packets, %: the holder's perk. */
  startBonusPercent: number;
  /** How reading the player's wallet is getting on. */
  hold: HoldState;
  run: RunReport;
}

export interface Session {
  getState(): SessionState;
  subscribe(listener: () => void): () => void;
  /** Starts watching the match and the player's state; returns the function that stops it. */
  start(): () => void;
  /** Reads the player's wallet now. */
  checkHold(): Promise<void>;
}

const NO_REPORT: RunReport = { score: "none", scoreError: null };

const BOOSTS_REFRESH_MS = 5 * 60_000;
/** A perk's boost runs out by the clock, with no event: the perks are looked at again this often. */
const PERKS_TICK_MS = 30_000;

type BoostEffect = { Operation?: string | null; Value?: number | null };

/**
 * A boost's effect as extra percent. `Value` is a share, as everywhere on the platform: AddPercent
 * 0.2 is +20%, Multiply 1.2 is ×1.2.
 */
function percentOf(effect: BoostEffect | null | undefined): number {
  const value = Number(effect?.Value ?? 0);
  if (effect?.Operation === "AddPercent") return value * 100;
  if (effect?.Operation === "Multiply") return (value - 1) * 100;
  return 0;
}

/**
 * The start bonus of the holder's perk, %. A boost's effect is normally folded in by the server,
 * inside the action it boosts; a run's starting packets are not a server action — the match is
 * client-side — so this one effect is read here and handed to the match.
 */
function startBonusOf(user: UserState | null, perk: HoldPerk, nowMs: number): number {
  if (perkActiveUntil(user, perk, nowMs) <= nowMs) return 0;
  const boost = Object.values(user?.TimedBoost?.Active ?? {}).find(
    (active) => active.BoostID === perk.boostId,
  );
  return Math.max(0, Math.round(percentOf(boost?.EffectSnapshot)));
}

function sameLoadout(a: SkinLoadout, b: SkinLoadout): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof SkinLoadout>;
  for (const key of keys) if (a[key] !== b[key]) return false;
  return true;
}

export function createSession(client: IDosGamesClient, store: GameStore): Session {
  const hold = createHoldWatch(client);
  let state: SessionState = {
    loadout: {},
    startBonusPercent: 0,
    hold: hold.getState(),
    run: NO_REPORT,
  };
  const listeners = new Set<() => void>();
  const set = (patch: Partial<SessionState>): void => {
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  };

  // ── The leaderboard: the best score of a single run ─────────────────────────────────────────
  // A run is told apart by a number, so an answer that arrives after "Play again" is not booked
  // to the new run's report.
  let runId = 0;
  const reportRun = (forRun: number, report: RunReport): void => {
    if (forRun === runId) set({ run: report });
  };

  function boardEnabled(): boolean {
    const section = configSection<{
      Definitions?: Record<string, { IsEnabled?: boolean | null } | null> | null;
    }>(client, "Leaderboard");
    const board = section?.Definitions?.[LEADERBOARD_ID];
    return board != null && board.IsEnabled !== false;
  }

  async function submitScore(score: number): Promise<void> {
    if (score <= 0 || !boardEnabled()) return;
    const forRun = runId;
    reportRun(forRun, { score: "sending", scoreError: null });
    // The board keeps the best of what it is sent (BestScore), so every finished run is sent.
    const result = await client.leaderboard.submitScore(LEADERBOARD_ID, score);
    reportRun(
      forRun,
      result.ok
        ? { score: "sent", scoreError: null }
        : { score: "failed", scoreError: result.error || result.reason },
    );
  }

  let seen: GameState = store.getState();
  function onMatch(): void {
    const now = store.getState();
    const before = seen;
    seen = now;
    // The clock going back is a new run: its report starts clean.
    if (now.timeMs < before.timeMs) {
      runId++;
      set({ run: NO_REPORT });
      return;
    }
    if (before.status === "playing" && now.status === "lost") {
      void submitScore(now.score);
    }
  }

  // ── The perks for holding $ZDAY: what the Title holds for the player ────────────────────────
  // Switching them on and renewing them is the hold watch's; here they are only read, from the
  // player's active boosts, and handed to the match.
  function applyPerks(): void {
    const user = client.data.user.state;
    const nowMs = Date.now();
    const loadout = loadoutFor((perk) => hasPerk(user, perk, nowMs));
    const holder = HOLD_PERKS.find((perk) => perk.id === "holder");
    const startBonusPercent = holder ? startBonusOf(user, holder, nowMs) : 0;
    if (
      startBonusPercent !== state.startBonusPercent ||
      !sameLoadout(loadout, state.loadout)
    ) {
      set({ loadout, startBonusPercent });
    }
    store.dispatch({ type: "setStartBonus", percent: startBonusPercent });
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    checkHold: () => hold.check(),
    start() {
      seen = store.getState();
      const offMatch = store.subscribe(onMatch);
      const offUser = client.on("user:anyUpdated", applyPerks);
      const offHold = hold.subscribe(() => set({ hold: hold.getState() }));
      const stopHold = hold.start();
      // The player's boosts land in the SDK's cache and come back through applyPerks().
      const refreshBoosts = () => void client.timedBoost.getActive();
      const boostsTimer = setInterval(refreshBoosts, BOOSTS_REFRESH_MS);
      const perksTimer = setInterval(applyPerks, PERKS_TICK_MS);
      refreshBoosts();
      applyPerks();
      return () => {
        offMatch();
        offUser();
        offHold();
        stopHold();
        clearInterval(boostsTimer);
        clearInterval(perksTimer);
      };
    },
  };
}
