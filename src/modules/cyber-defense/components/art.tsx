import type { CSSProperties, ReactNode } from "react";
import type { DefenderId } from "../data/balance";
import type { SkinId } from "../data/skins";

// The game's drawn pieces. No image files: assets are not stored in the project, and these are
// simple enough to draw in place. Every figure is a square SVG as wide as its box.

const figure: CSSProperties = { display: "block", width: "100%", height: "auto" };

const FIREWALL_LOOK = {
  plain: {
    wall: "#9a3412",
    edge: "#fdba74",
    mortar: "#431407",
    flame: "#fbbf24",
    flameEdge: "#7c2d12",
    core: "#fef9c3",
    glow: "rgba(251, 146, 60, .75)",
  },
  // "RGB Firewall": the same wall lit like a gaming rig — the hue runs round (the cd-rgb class).
  rgbFirewall: {
    wall: "#be185d",
    edge: "#f9a8d4",
    mortar: "#1e1b4b",
    flame: "#22d3ee",
    flameEdge: "#164e63",
    core: "#ecfeff",
    glow: "rgba(244, 114, 182, .9)",
  },
} as const;

/** A wall of bricks with a flame on it. */
function FirewallArt({ skin }: { skin?: SkinId }): ReactNode {
  const rgb = skin === "rgbFirewall";
  const look = FIREWALL_LOOK[rgb ? "rgbFirewall" : "plain"];
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={rgb ? "cd-rgb" : undefined}
      style={{ ...figure, filter: `drop-shadow(0 0 4px ${look.glow})` }}
    >
      <rect
        x="5"
        y="7"
        width="38"
        height="34"
        rx="4"
        fill={look.wall}
        stroke={look.edge}
        strokeWidth="2"
      />
      <path
        d="M6 15.5h36M6 24h36M6 32.5h36M18 8v7.5M31 8v7.5M12 15.5V24M24.5 15.5V24M37 15.5V24M18 24v8.5M31 24v8.5M12 32.5V40M24.5 32.5V40M37 32.5V40"
        stroke={look.mortar}
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M24 11C28 16 32 20 32 26.5A8 8 0 0 1 16 26.5C16 22.5 18 20 20 17C20.8 19.5 21.8 21 23 21C23 18 23.2 14 24 11Z"
        fill={look.flame}
        stroke={look.flameEdge}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <ellipse cx="24" cy="28.5" rx="3.2" ry="4.2" fill={look.core} />
    </svg>
  );
}

const KEY_COLUMNS = [8, 14, 20, 26, 32, 38];

const KEYBOARD_LOOK = {
  plain: {
    body: "#1e1b4b",
    edge: "#c4b5fd",
    rows: ["#a78bfa", "#67e8f9"],
    space: "#e2e8f0",
    side: "#a78bfa",
    glow: "rgba(167, 139, 250, .8)",
  },
  // "Retro Keyboard": beige plastic and grey caps of an eighties terminal.
  retroKeyboard: {
    body: "#e7dfc6",
    edge: "#8b8166",
    rows: ["#b8ae90", "#cfc6a8"],
    space: "#f5f0df",
    side: "#b8ae90",
    glow: "rgba(231, 223, 198, .7)",
  },
} as const;

/** A mechanical keyboard with a red key waiting to be pressed — the mine. */
function MechKeyboardArt({ skin }: { skin?: SkinId }): ReactNode {
  const look = KEYBOARD_LOOK[skin === "retroKeyboard" ? "retroKeyboard" : "plain"];
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      style={{ ...figure, filter: `drop-shadow(0 0 4px ${look.glow})` }}
    >
      <rect
        x="4"
        y="12"
        width="40"
        height="26"
        rx="4"
        fill={look.body}
        stroke={look.edge}
        strokeWidth="2"
      />
      {look.rows.map((fill, row) =>
        KEY_COLUMNS.map((x) => (
          <rect
            key={`${row}:${x}`}
            x={x - 2}
            y={16 + row * 6}
            width="4.4"
            height="4"
            rx="1"
            fill={fill}
          />
        )),
      )}
      <rect x="12" y="29" width="18" height="4" rx="1" fill={look.space} />
      <rect x="6" y="29" width="4.4" height="4" rx="1" fill={look.side} />
      <rect x="33" y="28" width="8" height="6" rx="1.5" fill="#ef4444" />
      <path
        d="M37 29.5v2.2M37 32.6v.1"
        stroke="#fee2e2"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

const RACK_UNITS = [7.5, 16.1, 24.7, 33.3];

/** A server cabinet, four units high, its lamps on — the wall. */
function ServerRackArt(): ReactNode {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      style={{
        ...figure,
        filter: "drop-shadow(0 0 4px rgba(148, 163, 184, .8))",
      }}
    >
      <path
        d="M14 44v2.5M34 44v2.5"
        stroke="#94a3b8"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect
        x="9"
        y="4"
        width="30"
        height="40"
        rx="3"
        fill="#1e293b"
        stroke="#cbd5e1"
        strokeWidth="2"
      />
      {RACK_UNITS.map((y, unit) => (
        <g key={y}>
          <rect
            x="12.5"
            y={y}
            width="23"
            height="6.4"
            rx="1.2"
            fill="#334155"
            stroke="#64748b"
            strokeWidth=".8"
          />
          <circle cx="16" cy={y + 3.2} r="1.3" fill="#4ade80" />
          <circle
            cx="19.8"
            cy={y + 3.2}
            r="1.3"
            fill={unit % 2 === 0 ? "#22d3ee" : "#fbbf24"}
          />
          <path
            d={`M24.5 ${y + 3.2}h8.5`}
            stroke="#94a3b8"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeDasharray="1.6 1.9"
          />
        </g>
      ))}
    </svg>
  );
}

/** A router with two antennas and a signal between them — the rapid shooter. */
function SpamFilterArt(): ReactNode {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      style={{
        ...figure,
        filter: "drop-shadow(0 0 4px rgba(253, 224, 71, .75))",
      }}
    >
      <path
        d="M14 29L9.5 8M34 29L38.5 8"
        stroke="#fde047"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="9.5" cy="7.5" r="2.6" fill="#f43f5e" stroke="#fecdd3" />
      <circle cx="38.5" cy="7.5" r="2.6" fill="#f43f5e" stroke="#fecdd3" />
      <path
        d="M17 14.5a9.6 9.6 0 0 1 14 0M20.3 18.6a5 5 0 0 1 7.4 0"
        stroke="#fef9c3"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="24" cy="22.6" r="1.6" fill="#fef9c3" />
      <path
        d="M11 41v3M37 41v3"
        stroke="#a16207"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect
        x="4"
        y="27"
        width="40"
        height="14"
        rx="4"
        fill="#713f12"
        stroke="#fde047"
        strokeWidth="2"
      />
      <circle cx="11" cy="34" r="1.7" fill="#4ade80" />
      <circle cx="16.5" cy="34" r="1.7" fill="#4ade80" />
      <circle cx="22" cy="34" r="1.7" fill="#fef9c3" />
      <rect x="28" y="31.5" width="11.5" height="5" rx="1.2" fill="#422006" />
      <path d="M31 32.5v3M33.8 32.5v3M36.6 32.5v3" stroke="#fde047" />
    </svg>
  );
}

const FAN_BLADES = [0, 72, 144, 216, 288];

/** A case fan, light blue; its blades turn while it stands on the board — the one that chills. */
function CoolerArt(): ReactNode {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      style={{
        ...figure,
        filter: "drop-shadow(0 0 4px rgba(125, 211, 252, .85))",
      }}
    >
      <rect
        x="5"
        y="5"
        width="38"
        height="38"
        rx="8"
        fill="#0c4a6e"
        stroke="#7dd3fc"
        strokeWidth="2"
      />
      <circle
        cx="24"
        cy="24"
        r="15.5"
        fill="#082f49"
        stroke="#38bdf8"
        strokeWidth="1.2"
      />
      <g className="cd-fan">
        {FAN_BLADES.map((angle) => (
          <path
            key={angle}
            d="M24 24C20.6 18.6 21.6 12.4 27.4 9.8C30.6 14.8 29.4 20.6 24 24Z"
            transform={`rotate(${angle} 24 24)`}
            fill="#7dd3fc"
            stroke="#e0f2fe"
            strokeWidth=".8"
            strokeLinejoin="round"
          />
        ))}
      </g>
      <circle
        cx="24"
        cy="24"
        r="3.8"
        fill="#e0f2fe"
        stroke="#0369a1"
        strokeWidth="1.2"
      />
      <path
        d="M9.6 9.6v.1M38.4 9.6v.1M9.6 38.4v.1M38.4 38.4v.1"
        stroke="#bae6fd"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

const VIRUS_LOOK = {
  trojan: {
    body: "#6d28d9",
    edge: "#c4b5fd",
    dark: "#2e1065",
    glow: "rgba(167, 139, 250, .8)",
  },
  // The Elite Virus is the red one — and wears a crown.
  elite: {
    body: "#dc2626",
    edge: "#fecaca",
    dark: "#450a0a",
    glow: "rgba(248, 113, 113, .95)",
  },
} as const;

/** A horned, toothy bug of a virus: the violet Trojan, or the red, crowned Elite Virus. */
export function VirusArt({ kind }: { kind: "trojan" | "elite" }): ReactNode {
  const look = VIRUS_LOOK[kind];
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      style={{ ...figure, filter: `drop-shadow(0 0 4px ${look.glow})` }}
    >
      <path
        d="M13 39v6M21 40v5M28 40v5M36 39v6"
        stroke={look.dark}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M13 10L9 2L19 8ZM35 10L39 2L29 8Z"
        fill={look.body}
        stroke={look.edge}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect
        x="6"
        y="8"
        width="36"
        height="32"
        rx="9"
        fill={look.body}
        stroke={look.edge}
        strokeWidth="2"
      />
      <path d="M11 17L21 21V25L11 23ZM37 17L27 21V25L37 23Z" fill="#fef08a" />
      <path d="M12 29H36L33 36H15Z" fill={look.dark} />
      <path
        d="M15 29.5l2.2 3.2 2.2-3.2M21.8 29.5l2.2 3.2 2.2-3.2M28.6 29.5l2.2 3.2 2.2-3.2"
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill="none"
      />
      {kind === "elite" ? (
        <path
          d="M16 9L17.5 1.5L21.5 5.5L24 0.5L26.5 5.5L30.5 1.5L32 9Z"
          fill="#fbbf24"
          stroke="#78350f"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
}

const DEFENDER_ART: Record<
  DefenderId,
  (props: { skin?: SkinId }) => ReactNode
> = {
  firewall: FirewallArt,
  serverRack: ServerRackArt,
  spamFilter: SpamFilterArt,
  mechKeyboard: MechKeyboardArt,
  cooler: CoolerArt,
};

/** A defender as it looks on the board and on its inventory card, in the skin it wears. */
export function DefenderArt({
  id,
  skin,
}: {
  id: DefenderId;
  skin?: SkinId;
}): ReactNode {
  const Art = DEFENDER_ART[id];
  return <Art skin={skin} />;
}

/** The small data packet shown next to a number (the counter, a price). */
export function DataPacketIcon({ size }: { size: number }): ReactNode {
  return (
    <span
      className="cd-data cd-data-icon"
      aria-hidden="true"
      style={{ width: size, borderWidth: size < 20 ? 1 : 2 }}
    >
      <span className="cd-core" />
    </span>
  );
}

/** What is left of a virus's or a tower's health, 0..1. `className` places it. */
export function HpBar({
  value,
  className,
}: {
  value: number;
  className: string;
}): ReactNode {
  return (
    <span className={`cd-hp ${className}`} aria-hidden="true">
      <i style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </span>
  );
}
