// Tuning of a Cyber Defense match — change the numbers here, not in the components. Lengths are in
// cells of the board, speeds in cells per second, times in milliseconds.

/** The "motherboard": lanes (rows) the Trojans come along, and cells per lane. */
export const ROWS = 5;
export const COLS = 9;

/** Data packets a match starts with — enough for the first Firewall. */
export const START_RESOURCES = 50;

/** What one caught data packet adds to the counter. */
export const PACKET_VALUE = 25;
/** A new packet drops this often… */
export const PACKET_INTERVAL_MS = 4_000;
/** …and the first one sooner, so a match does not open on an empty board. */
export const FIRST_PACKET_DELAY_MS = 1_200;
/** How long a packet falls to its landing spot, then how long it waits there to be caught. */
export const PACKET_FALL_MS = 4_500;
export const PACKET_LINGER_MS = 7_000;

/** The Trojan: walks its lane right to left and eats what stands in its way. */
export const TROJAN_HP = 100;
export const TROJAN_SPEED = 0.22;
/** Damage per second to the tower it stands at. */
export const TROJAN_BITE_DPS = 75;
/** The first Trojan gives the player time to build. */
export const FIRST_TROJAN_DELAY_MS = 10_000;

/**
 * Pressure grows with every arrival, so no defense holds forever and a run always ends — which is
 * what makes "the best score of a single run" mean something: the wait for the next Trojan shrinks
 * by this factor each time, down to the floor, and each newcomer has this share of the base health
 * more than the one before.
 */
export const TROJAN_SPAWN_INTERVAL_MS = 7_000;
export const TROJAN_SPAWN_INTERVAL_MIN_MS = 1_400;
export const TROJAN_SPAWN_ACCELERATION = 0.94;
export const TROJAN_HP_GROWTH = 1 / 14;

/** The Elite Virus: a rare arrival with several times a Trojan's health. */
export const ELITE_CHANCE = 0.05;
export const ELITE_HP_FACTOR = 3;

/**
 * Score — the only thing a destroyed virus gives, and what the leaderboard ranks a run by. No
 * virus pays in $ZDAY: the token is not earned in the game at all.
 */
export const TROJAN_SCORE = 10;
export const ELITE_SCORE = 50;

/** A shot flies right along its lane at this speed, whoever fired it. */
export const BIT_SPEED = 4;

/** The Firewall — the measure the other towers are set against: its health, its bit, its pace. */
const FIREWALL_HP = 300;
export const BIT_DAMAGE = 20;
export const FIRE_INTERVAL_MS = 1_400;

/** The Cooler's icy shot barely hurts… */
export const ICE_DAMAGE = 5;
/**
 * …but it chills: the virus it hits walks at this share of its speed for this long. Another icy hit
 * starts the time over and slows the virus no further.
 */
export const CHILL_SPEED_FACTOR = 0.5;
export const CHILL_MS = 3_000;

/** How long a mine's blast stays on screen. */
export const BLAST_MS = 450;

export type DefenderId =
  | "firewall"
  | "serverRack"
  | "spamFilter"
  | "mechKeyboard"
  | "cooler";

/** What a shooter fires: one shot per interval while a virus is in its lane. */
export interface ShotDef {
  damage: number;
  intervalMs: number;
  /** An icy shot: the virus it hits is chilled as well. */
  chills?: boolean;
}

interface DefenderBase {
  id: DefenderId;
  /** Price in data packets. */
  cost: number;
  /** What a virus has to eat through. */
  hp: number;
}

/**
 * "shooter" fires its shot along its lane while a virus is in it; "mine" blows up under the first
 * virus that touches it and takes every virus in its cell with it; "wall" only stands in the way.
 */
export type DefenderDef = DefenderBase &
  ({ role: "shooter"; shot: ShotDef } | { role: "mine" | "wall" });

export const DEFENDERS: Record<DefenderId, DefenderDef> = {
  firewall: {
    id: "firewall",
    cost: 50,
    hp: FIREWALL_HP,
    role: "shooter",
    shot: { damage: BIT_DAMAGE, intervalMs: FIRE_INTERVAL_MS },
  },
  // A wall: five times a Firewall's health.
  serverRack: { id: "serverRack", cost: 50, hp: FIREWALL_HP * 5, role: "wall" },
  // A rapid shooter: three shots to a Firewall's one, each half as strong.
  spamFilter: {
    id: "spamFilter",
    cost: 125,
    hp: FIREWALL_HP,
    role: "shooter",
    shot: { damage: BIT_DAMAGE / 2, intervalMs: FIRE_INTERVAL_MS / 3 },
  },
  mechKeyboard: { id: "mechKeyboard", cost: 150, hp: FIREWALL_HP, role: "mine" },
  cooler: {
    id: "cooler",
    cost: 175,
    hp: FIREWALL_HP,
    role: "shooter",
    shot: { damage: ICE_DAMAGE, intervalMs: FIRE_INTERVAL_MS, chills: true },
  },
};

/** The inventory's cards, cheapest first. */
export const DEFENDER_ORDER: readonly DefenderId[] = [
  "firewall",
  "serverRack",
  "spamFilter",
  "mechKeyboard",
  "cooler",
];
