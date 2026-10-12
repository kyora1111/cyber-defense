import type { HoldPerkId } from "../../../shared/zday";
import type { DefenderId } from "./balance";

// Tower skins: another look for a defender, nothing else. A skin is not bought and not owned — it
// is a perk for holding $ZDAY (src/shared/zday), worn while the perk works. The game only knows
// which perk dresses which defender and how the skin is drawn.

export type SkinId = "rgbFirewall" | "retroKeyboard";

export interface SkinDef {
  id: SkinId;
  defender: DefenderId;
  /** The perk for holding $ZDAY that gives the skin. */
  perk: HoldPerkId;
}

export const SKINS: Record<SkinId, SkinDef> = {
  rgbFirewall: { id: "rgbFirewall", defender: "firewall", perk: "rgbFirewall" },
  retroKeyboard: {
    id: "retroKeyboard",
    defender: "mechKeyboard",
    perk: "retroKeyboard",
  },
};

/** The skin each defender wears; a defender with none is drawn as it comes. */
export type SkinLoadout = Partial<Record<DefenderId, SkinId>>;

/** What the player wears given the perks that work for them: a skin is put on by itself. */
export function loadoutFor(hasPerk: (perk: HoldPerkId) => boolean): SkinLoadout {
  const loadout: SkinLoadout = {};
  for (const skin of Object.values(SKINS)) {
    if (hasPerk(skin.perk)) loadout[skin.defender] = skin.id;
  }
  return loadout;
}

/** The skin a perk gives, if it is a skin's perk. */
export function skinOfPerk(perk: HoldPerkId): SkinDef | null {
  return Object.values(SKINS).find((skin) => skin.perk === perk) ?? null;
}
