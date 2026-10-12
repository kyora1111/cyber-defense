import { useEffect, useSyncExternalStore } from "react";
import { FIRST_PACKET_DELAY_MS, PACKET_INTERVAL_MS } from "../data/balance";
import type { GameState } from "../game/state";
import type { GameStore } from "../game/store";

/** The longest step the match is ever advanced by, whatever the gap between two frames. */
const MAX_FRAME_MS = 50;

/** The match, re-rendering the component on every change. */
export function useMatch(store: GameStore): GameState {
  return useSyncExternalStore(store.subscribe, store.getState);
}

/**
 * The game loop: advances the match once per animation frame while `running`. It lives in the
 * game's panel, so it stops with it — in the lobby the match stands still — and the browser itself
 * holds the frames of a hidden tab.
 */
export function useGameLoop(store: GameStore, running: boolean): void {
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      // Capped: the first frame after a pause must not teleport the Trojans across the board.
      const dtMs = Math.min(Math.max(now - last, 0), MAX_FRAME_MS);
      last = now;
      store.dispatch({
        type: "tick",
        dtMs,
        laneRoll: Math.random(),
        eliteRoll: Math.random(),
      });
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [store, running]);
}

/**
 * Drops a data packet every few seconds while `running`, and removes the ones nobody caught. The
 * packets in the air are dropped on the way out: their fall is a CSS animation that would start
 * over on return.
 */
export function usePacketRain(store: GameStore, running: boolean): void {
  useEffect(() => {
    if (!running) return;
    let nextDropAt = performance.now() + FIRST_PACKET_DELAY_MS;
    const timer = setInterval(() => {
      const now = performance.now();
      store.dispatch({ type: "expirePackets", now });
      if (now < nextDropAt) return;
      // Scheduled from "now", not from the missed slot: a tab that slept does not wake to a burst.
      nextDropAt = now + PACKET_INTERVAL_MS;
      store.dispatch({
        type: "dropPacket",
        // Kept off the edges so a packet never hangs half outside the board.
        x: 7 + Math.random() * 86,
        landY: 14 + Math.random() * 72,
        now,
      });
    }, 200);
    return () => {
      clearInterval(timer);
      store.dispatch({ type: "clearPackets" });
    };
  }, [store, running]);
}
