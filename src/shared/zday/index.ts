import type { UserState } from "@idosgames/core";

// The $ZDAY token as this game knows it: the ids it goes by on the Title and the pure rules around
// holding it. Shared by the lobby's wallet chip (src/walletButton.tsx) and the game module. The ids
// are configured in the platform (the Title's configuration), not in this repo — keep them in step.
//
// $ZDAY is never earned in the game and nothing is sold for it: a player who HOLDS it gets perks —
// tower skins and a start bonus — for as long as they hold it.

/**
 * $ZDAY as a currency of the Title: its MAIN crypto currency ("Zero Day"), which the platform
 * created with the title and bound to the SPL token on the "solana" network. The id is the
 * platform's, not ours — `Main` is a protected entry of the Currency section — so there is no
 * "ZDAY" id anywhere on the Title.
 */
export const ZDAY_CURRENCY_ID = "Main";
export const ZDAY_NETWORK_ID = "solana";

/** The virtual currency standing in for $ZDAY the title's pool has not backed yet. */
const ZDAY_IOU_ID = `${ZDAY_CURRENCY_ID}_IOU`;

export type HoldPerkId = "rgbFirewall" | "retroKeyboard" | "holder";

/**
 * A perk for holding $ZDAY. On the Title it is a timed boost: the game switches the boost on for
 * a player who holds enough and keeps renewing it; the perk works while the boost is active.
 */
export interface HoldPerk {
  id: HoldPerkId;
  /** Holding at least this much $ZDAY earns the perk. */
  minZday: number;
  /** The timed boost of the Title that carries it. */
  boostId: string;
}

/** The perks, cheapest first: two tower skins, then the "Zero Day Holder" start bonus. */
export const HOLD_PERKS: readonly HoldPerk[] = [
  { id: "rgbFirewall", minZday: 25, boostId: "skin_rgb_firewall" },
  { id: "retroKeyboard", minZday: 50, boostId: "skin_retro_keyboard" },
  { id: "holder", minZday: 100, boostId: "zero_day_holder" },
];

/**
 * The key of the player's custom data (the Private bucket) where the game keeps what it last read
 * from the chain: how much $ZDAY the wallet holds. The lobby's chip and the game both show it.
 */
export const WALLET_HOLD_KEY = "zday_hold";

/** A reading of a wallet's $ZDAY, as stored under WALLET_HOLD_KEY. */
export interface WalletHold {
  wallet: string;
  balance: number;
}

/** A balance as the SDK gives it (a decimal string for crypto, a number otherwise) as a number. */
export function toAmount(value: string | number | null | undefined): number {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

/** The wallet of the account: the one it signed in with, else one attached to it. */
export function walletOf(
  user: UserState | null | undefined,
): { address: string; networkID: string } | null {
  const chain = user?.Blockchain;
  const login = chain?.LastWalletLogin;
  if (login?.Address) {
    return { address: login.Address, networkID: login.NetworkID ?? "" };
  }
  for (const [networkID, wallet] of Object.entries(chain?.LinkedWallets ?? {})) {
    if (wallet?.Address) {
      return { address: wallet.Address, networkID: wallet.NetworkID ?? networkID };
    }
  }
  return null;
}

/** The account's wallet on the token's own network — the one whose $ZDAY counts. */
export function zdayWalletOf(user: UserState | null | undefined): string | null {
  const wallet = walletOf(user);
  return wallet?.networkID === ZDAY_NETWORK_ID ? wallet.address : null;
}

/** What `hold` looks like in the player's custom data. */
export function encodeWalletHold(hold: WalletHold): string {
  return JSON.stringify(hold);
}

/**
 * $ZDAY on the player's wallet as the game last read it from the chain, or null when it has not
 * read this wallet yet. A reading of another wallet (the account's wallet changed) does not count.
 */
export function walletZday(user: UserState | null | undefined): number | null {
  const wallet = zdayWalletOf(user);
  const stored = user?.CustomData?.Private?.[WALLET_HOLD_KEY]?.Value;
  if (!wallet || !stored) return null;
  try {
    const hold = JSON.parse(stored) as Partial<WalletHold> | null;
    return hold?.wallet === wallet ? toAmount(hold.balance) : null;
  } catch {
    return null;
  }
}

/**
 * $ZDAY the player has moved INTO THE GAME through the lobby's wallet (a deposit), with its IOU
 * part. Nothing is sold for it; it still is the player's, so it counts as held.
 */
export function inGameZday(user: UserState | null | undefined): number {
  const inventory = user?.InventoryV2;
  return (
    toAmount(inventory?.CryptoCurrencies?.[ZDAY_CURRENCY_ID]?.Amount) +
    toAmount(inventory?.VirtualCurrencies?.[ZDAY_IOU_ID]?.Amount)
  );
}

/** All the $ZDAY the player holds: on the wallet and deposited into the game. */
export function heldZday(user: UserState | null | undefined): number {
  return (walletZday(user) ?? 0) + inGameZday(user);
}

/** The perks that holding this much $ZDAY earns. */
export function perksFor(held: number): HoldPerk[] {
  return HOLD_PERKS.filter((perk) => held >= perk.minZday);
}

/** Until when the perk's boost is active for the player, ms; 0 — it is not. */
export function perkActiveUntil(
  user: UserState | null | undefined,
  perk: HoldPerk,
  nowMs: number,
): number {
  let until = 0;
  for (const boost of Object.values(user?.TimedBoost?.Active ?? {})) {
    if (boost.BoostID !== perk.boostId || boost.RemainingCharges === 0) continue;
    // A boost with no end is a boost that does not run out.
    const endsAt = boost.ExpiresAtUtc
      ? Date.parse(boost.ExpiresAtUtc)
      : Number.POSITIVE_INFINITY;
    if (endsAt > nowMs) until = Math.max(until, endsAt);
  }
  return until;
}

/** Whether the perk works for the player right now. */
export function hasPerk(
  user: UserState | null | undefined,
  id: HoldPerkId,
  nowMs: number,
): boolean {
  const perk = HOLD_PERKS.find((p) => p.id === id);
  return perk !== undefined && perkActiveUntil(user, perk, nowMs) > nowMs;
}

/** "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" → "7xKX…gAsU". */
export function shortAddress(address: string): string {
  return address.length <= 10
    ? address
    : `${address.slice(0, 4)}…${address.slice(-4)}`;
}

/** A $ZDAY amount for a chip: whole tokens as they are, a fraction to two places. */
export function formatZday(value: string | number | null | undefined): string {
  const amount = toAmount(value);
  return Number.isInteger(amount)
    ? String(amount)
    : amount.toFixed(2).replace(/\.?0+$/, "");
}
