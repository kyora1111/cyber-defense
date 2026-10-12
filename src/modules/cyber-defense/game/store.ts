import {
  createInitialState,
  reduce,
  type GameAction,
  type GameState,
} from "./state";

// The match of this session, kept outside React: the game's panel unmounts when the player goes to
// the lobby and mounts again on "Play", and the match must outlive that. The module creates one in
// `setup()`; it is gone with the session (the host tears the module down on logout).

export interface GameStore {
  getState(): GameState;
  /** Called after every action that changed the match. Returns the unsubscribe function. */
  subscribe(listener: () => void): () => void;
  dispatch(action: GameAction): void;
}

export function createGameStore(): GameStore {
  let state = createInitialState();
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispatch(action) {
      const next = reduce(state, action);
      if (next === state) return;
      state = next;
      for (const listener of listeners) listener();
    },
  };
}
