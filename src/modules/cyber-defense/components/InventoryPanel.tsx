import { memo, type ReactNode } from "react";
import { outlined, panel, v } from "@idosgames/react/ui";
import { DEFENDERS, DEFENDER_ORDER, type DefenderId } from "../data/balance";
import type { SkinLoadout } from "../data/skins";
import { t, type StringKey } from "../i18n";
import { DataPacketIcon, DefenderArt } from "./art";

// The side panel of defender cards (a strip above the board on a phone). A card shows its price in
// data packets; the picked one is placed by the next tap on an empty cell of the board. How the
// cards are laid out, and what they drop when there is no room for all of them, is in styles.ts.

const INFO: Record<DefenderId, StringKey> = {
  firewall: "firewallInfo",
  serverRack: "serverRackInfo",
  spamFilter: "spamFilterInfo",
  mechKeyboard: "mechKeyboardInfo",
  cooler: "coolerInfo",
};

export const InventoryPanel = memo(function InventoryPanel({
  resources,
  selected,
  loadout,
  onPick,
  compact,
}: {
  resources: number;
  selected: DefenderId | null;
  /** The skins the player owns: a card shows its defender as it will stand on the board. */
  loadout: SkinLoadout;
  onPick: (id: DefenderId) => void;
  /** Phone: a strip of small cards, one row, instead of a column. */
  compact: boolean;
}): ReactNode {
  const hint: StringKey =
    selected !== null
      ? "hintPlace"
      : DEFENDER_ORDER.some((id) => resources >= DEFENDERS[id].cost)
        ? "hintPick"
        : "hintCollect";

  return (
    <aside
      className={`cd-inventory ${compact ? "cd-inventory-strip" : "cd-inventory-side"}`}
      style={panel}
    >
      <div className="cd-inventory-title" style={outlined}>
        {t("inventory")}
      </div>
      <div
        className="cd-cards"
        style={
          compact
            ? {
                gridTemplateColumns: `repeat(${DEFENDER_ORDER.length}, minmax(0, 1fr))`,
              }
            : undefined
        }
      >
        {DEFENDER_ORDER.map((id) => {
          const cost = DEFENDERS[id].cost;
          const skin = loadout[id];
          const picked = selected === id;
          const short = resources < cost;
          return (
            <button
              key={id}
              type="button"
              className={`cd-card${picked ? " cd-card-picked" : ""}${short ? " cd-card-short" : ""}`}
              aria-pressed={picked}
              title={t(INFO[id])}
              data-card={id}
              onClick={() => onPick(id)}
            >
              <DefenderArt id={id} skin={skin} />
              <span className="cd-card-text">
                <span className="cd-card-name" style={outlined}>
                  {t(skin ?? id)}
                </span>
                <span className="cd-card-info">{t(INFO[id])}</span>
                <span
                  className="cd-card-price"
                  style={{ color: short ? v.red : v.gold }}
                >
                  <DataPacketIcon size={16} />
                  {cost}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="cd-inventory-hint">{t(hint)}</div>
    </aside>
  );
});
