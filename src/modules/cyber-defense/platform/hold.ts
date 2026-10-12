import type { IDosGamesClient } from "@idosgames/core";
import { configSection } from "@idosgames/react/ui";
import {
  WALLET_HOLD_KEY,
  ZDAY_CURRENCY_ID,
  ZDAY_NETWORK_ID,
  encodeWalletHold,
  inGameZday,
  perkActiveUntil,
  perksFor,
  walletZday,
  zdayWalletOf,
} from "../../../shared/zday";
import { readWalletTokens } from "../chain/balance";

// Keeps the perks for holding $ZDAY in step with what the player holds. Two jobs:
//   1. read the wallet's $ZDAY from the chain and note it in the player's custom data, where the
//      rest of the app (the lobby's chip, the perks' screen) finds it;
//   2. switch on — and keep renewing — the timed boost of every perk the holding earns.
// A perk is never switched off: its boost is short and simply runs out once the player no longer
// holds enough to have it renewed.
//
// The reading is the browser's own. Neither the platform nor a script of the Title can read a
// wallet for the game (see docs/feature-history/zday-economy.md), so the perks are as trustworthy
// as the rest of this client-side game — which is enough for skins and a start bonus.

export interface HoldState {
  /**
   * "noWallet" — the account has no Solana wallet, only what was deposited into the game counts;
   * "failed" — the chain could not be read, the last reading stands.
   */
  status: "idle" | "checking" | "ready" | "noWallet" | "failed";
  error: string | null;
}

export interface HoldWatch {
  getState(): HoldState;
  subscribe(listener: () => void): () => void;
  /** Starts looking after the perks; returns the function that stops it. */
  start(): () => void;
  /** Reads the wallet now (the "Check" button). */
  check(): Promise<void>;
}

/** The wallet is read again this often… */
const CHECK_EVERY_MS = 5 * 60_000;
/** …and a perk's boost is renewed when it has less than this left (the boost itself lasts an hour). */
const RENEW_BEFORE_MS = 25 * 60_000;
/** A boost the server refused to switch on (not configured, a server rule) is not hammered. */
const RETRY_REFUSED_MS = 10 * 60_000;

interface CurrencySection {
  CryptoCurrencies?: Record<
    string,
    {
      Networks?:
        | { NetworkID?: string | null; ContractAddress?: string | null }[]
        | null;
    } | null
  > | null;
}

/** The token's mint, from the Title's configuration. */
function zdayMint(client: IDosGamesClient): string | null {
  const networks =
    configSection<CurrencySection>(client, "Currency")?.CryptoCurrencies?.[
      ZDAY_CURRENCY_ID
    ]?.Networks ?? [];
  return (
    networks.find((n) => n.NetworkID === ZDAY_NETWORK_ID)?.ContractAddress ?? null
  );
}

export function createHoldWatch(client: IDosGamesClient): HoldWatch {
  let state: HoldState = { status: "idle", error: null };
  const listeners = new Set<() => void>();
  const set = (next: HoldState): void => {
    state = next;
    for (const listener of listeners) listener();
  };

  // ── The perks' boosts ───────────────────────────────────────────────────────────────────────
  const activating = new Set<string>();
  const refusedUntil = new Map<string, number>();

  function renewPerks(): void {
    const user = client.data.user.state;
    const now = Date.now();
    // The wallet counts only as read in this session: a note left by an earlier one may be days
    // old, and while the chain cannot be read nobody can tell whether it still holds.
    const onWallet = state.status === "ready" ? (walletZday(user) ?? 0) : 0;
    for (const perk of perksFor(onWallet + inGameZday(user))) {
      if (perkActiveUntil(user, perk, now) - now > RENEW_BEFORE_MS) continue;
      if (activating.has(perk.id) || now < (refusedUntil.get(perk.id) ?? 0)) continue;
      activating.add(perk.id);
      void client.timedBoost.activate(perk.boostId).then((result) => {
        activating.delete(perk.id);
        if (!result.ok) refusedUntil.set(perk.id, Date.now() + RETRY_REFUSED_MS);
      });
    }
  }

  // ── The wallet ──────────────────────────────────────────────────────────────────────────────
  let reading: Promise<void> | null = null;

  async function readWallet(): Promise<void> {
    const wallet = zdayWalletOf(client.data.user.state);
    if (!wallet) {
      set({ status: "noWallet", error: null });
      return;
    }
    const mint = zdayMint(client);
    if (!mint) {
      set({ status: "failed", error: "The title has no $ZDAY token on Solana" });
      return;
    }
    set({ status: "checking", error: null });
    let balance: number;
    try {
      balance = await readWalletTokens(wallet, mint);
    } catch (error) {
      set({
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }
    // The player may have signed out, or into another wallet, while the chain was answering.
    const user = client.data.user.state;
    if (zdayWalletOf(user) !== wallet) return;
    if (walletZday(user) !== balance) {
      const saved = await client.userCustomData.setPrivateData(
        WALLET_HOLD_KEY,
        encodeWalletHold({ wallet, balance }),
      );
      if (!saved.ok) {
        set({ status: "failed", error: saved.error || saved.reason });
        return;
      }
    }
    set({ status: "ready", error: null });
  }

  function check(): Promise<void> {
    reading ??= readWallet()
      .catch((error: unknown) => {
        set({
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => {
        reading = null;
        renewPerks();
      });
    return reading;
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    check,
    start() {
      let wallet = zdayWalletOf(client.data.user.state);
      const offUser = client.on("user:anyUpdated", () => {
        // A wallet that has just been linked is read at once; anything else that changed (a
        // deposit, a boost that ran out and was reported) only needs the perks looked at again.
        const now = zdayWalletOf(client.data.user.state);
        if (now !== wallet) {
          wallet = now;
          void check();
        } else if (!reading) {
          renewPerks();
        }
      });
      const timer = setInterval(() => void check(), CHECK_EVERY_MS);
      // The wallet is in the Blockchain state, which a sign-in by e-mail does not bring along.
      void client.blockchain.getUserState().then(() => check());
      return () => {
        offUser();
        clearInterval(timer);
      };
    },
  };
}
