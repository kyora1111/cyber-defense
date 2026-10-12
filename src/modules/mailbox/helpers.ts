import { type MailboxCategory } from "@idosgames/core";
import { errorText, type Glyph } from "@idosgames/react/ui";
import { mailError } from "./i18n";

export type Tab = "all" | "Reward" | "Gift" | "System";

/** What `ctx.features.open("mailbox", args)` understands — the friends system sends it. */
export interface MailboxArgs {
  friendUserID?: string;
  friendName?: string;
  mode?: "gift" | "transfer";
}

export interface Friend {
  UserID: string;
  PublicData?: { Username?: string | null; AvatarUrl?: string | null } | null;
}

export function words(error: string | null | undefined): string {
  return mailError(error) ?? errorText(error);
}

export function friendName(f: Friend): string {
  const name = f.PublicData?.Username?.trim();
  if (name) return name;
  return f.UserID.length > 10
    ? `${f.UserID.slice(0, 5)}…${f.UserID.slice(-4)}`
    : f.UserID;
}

export const CATEGORY_GLYPH: Record<MailboxCategory, Glyph> = {
  System: "bell",
  Reward: "chest",
  Gift: "gift",
  Social: "friends",
};

export const MODULE_GLYPH: Record<string, Glyph> = {
  Leaderboard: "trophy",
  CoopEvent: "swords",
  Season: "crown",
  Referral: "link",
};
