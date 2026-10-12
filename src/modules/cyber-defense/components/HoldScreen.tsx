import { useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { useUserState } from "@idosgames/react";
import {
  Button,
  Card,
  outlined,
  panel,
  ProgressBar,
  SectionTitle,
  toneSurface,
  useGameLayout,
  useNow,
  v,
} from "@idosgames/react/ui";
import {
  HOLD_PERKS,
  formatZday,
  heldZday,
  inGameZday,
  perkActiveUntil,
  shortAddress,
  walletZday,
  zdayWalletOf,
  type HoldPerk,
} from "../../../shared/zday";
import { ZdayIcon } from "../../../shared/zday/ZdayIcon";
import { skinOfPerk } from "../data/skins";
import { t, type StringKey } from "../i18n";
import type { Session } from "../platform/session";
import { DataPacketIcon, DefenderArt } from "./art";
import { CSS } from "./styles";

// The lobby's "Hold rewards" tab: what the player holds, and the perks holding $ZDAY gives — the
// two tower skins and the holder's start bonus. Nothing is bought here: a perk switches on by
// itself once the wallet holds enough, and stays on while it does. Reading the wallet and keeping
// the perks on is the session's (platform/hold.ts); this screen only shows it and offers "Check".

const INFO: Record<HoldPerk["id"], StringKey> = {
  rgbFirewall: "perkRgbFirewallInfo",
  retroKeyboard: "perkRetroKeyboardInfo",
  holder: "perkHolderInfo",
};

const dim: CSSProperties = { fontSize: 13, lineHeight: 1.4, color: v.textDim };

/** What a perk gives, drawn: the tower in its skin, or the bonus to the starting packets. */
function PerkPicture({ perk }: { perk: HoldPerk }): ReactNode {
  const skin = skinOfPerk(perk.id);
  return (
    <span
      style={{
        width: 72,
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
        aspectRatio: "1",
      }}
    >
      {skin ? (
        <DefenderArt id={skin.defender} skin={skin.id} />
      ) : (
        <span
          style={{
            ...outlined,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 26,
          }}
        >
          +<DataPacketIcon size={38} />
        </span>
      )}
    </span>
  );
}

function PerkCard({
  perk,
  held,
  activeUntil,
  bonusPercent,
  now,
}: {
  perk: HoldPerk;
  held: number;
  /** Until when the perk's boost is on, ms; 0 — it is off. */
  activeUntil: number;
  /** The start bonus the perk gives while it is on, %; 0 for a perk that is a skin. */
  bonusPercent: number;
  now: number;
}): ReactNode {
  const active = activeUntil > now;
  const earned = held >= perk.minZday;
  const name = perk.id === "holder" ? t("holder") : t(perk.id);
  return (
    <Card highlight={active}>
      <div
        data-perk={perk.id}
        data-perk-state={active ? "active" : earned ? "earned" : "locked"}
        style={{ display: "flex", gap: 14, alignItems: "center" }}
      >
        <PerkPicture perk={perk} />
        <div style={{ display: "grid", gap: 6, minWidth: 0, flex: 1 }}>
          <div style={{ ...outlined, fontSize: 17 }}>{name}</div>
          <div style={dim}>{t(INFO[perk.id])}</div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 14,
              fontWeight: 700,
              color: v.gold,
            }}
          >
            <ZdayIcon size={16} />
            {t("perkFrom")} {formatZday(perk.minZday)} $ZDAY
          </div>
          {active ? (
            <div style={{ fontSize: 14, fontWeight: 700, color: v.green }}>
              ✓ {t("perkActive")}
              {bonusPercent > 0 ? ` · +${bonusPercent}%` : null}
            </div>
          ) : earned ? (
            <div style={{ fontSize: 14, fontWeight: 700, color: v.gold }}>
              {t("perkTurningOn")}
            </div>
          ) : (
            <>
              <ProgressBar value={held} max={perk.minZday} tone="gold" height={14} />
              <div style={dim}>
                {t("perkShort")} {formatZday(perk.minZday - held)} $ZDAY
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

export function makeHoldScreen(session: Session) {
  return function HoldScreen(): ReactNode {
    const user = useUserState();
    const platform = useSyncExternalStore(session.subscribe, session.getState);
    const layout = useGameLayout();
    // A perk's boost runs out by the clock: the cards are redrawn as it goes.
    const now = useNow(15_000);

    const wallet = zdayWalletOf(user);
    const onWallet = walletZday(user);
    const inGame = inGameZday(user);
    const held = heldZday(user);
    const { status, error } = platform.hold;
    const checking = status === "checking" || status === "idle";

    const note =
      status === "noWallet"
        ? t("holdNoWallet")
        : status === "failed"
          ? `${t("holdFailed")}: ${error ?? ""}`
          : checking
            ? t("holdChecking")
            : t("holdReady");

    return (
      <div style={{ display: "grid", gap: 16 }}>
        {/* The towers are drawn with the game's own styles (a skin's glow, the data packet). */}
        <style>{CSS}</style>
        <div
          data-hold={status}
          style={{
            ...panel,
            ...toneSurface("blue"),
            padding: 18,
            display: "grid",
            gap: 10,
            justifyItems: "center",
            textAlign: "center",
          }}
        >
          <div style={dim}>{t("holdYouHold")}</div>
          <div
            data-hold-total={held}
            style={{
              ...outlined,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              fontSize: 34,
            }}
          >
            <ZdayIcon size={36} />
            {formatZday(held)}
          </div>
          {wallet ? (
            <div style={dim}>
              {t("holdWallet")} <b title={wallet}>{shortAddress(wallet)}</b>:{" "}
              {onWallet === null ? "—" : formatZday(onWallet)}
              {inGame > 0 ? ` · ${t("holdInGame")}: ${formatZday(inGame)}` : null}
            </div>
          ) : null}
          <div
            style={{ ...dim, color: status === "failed" ? v.red : v.textDim }}
          >
            {note}
          </div>
          {wallet ? (
            <Button
              tone="gold"
              size="sm"
              disabled={checking}
              onClick={() => void session.checkHold()}
            >
              {t("holdCheck")}
            </Button>
          ) : null}
        </div>

        <div>
          <SectionTitle>{t("perksTitle")}</SectionTitle>
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns:
                layout === "desktop" ? "repeat(3, minmax(0, 1fr))" : "minmax(0, 1fr)",
              alignItems: "stretch",
            }}
          >
            {HOLD_PERKS.map((perk) => (
              <PerkCard
                key={perk.id}
                perk={perk}
                held={held}
                activeUntil={perkActiveUntil(user, perk, now)}
                bonusPercent={
                  perk.id === "holder" ? platform.startBonusPercent : 0
                }
                now={now}
              />
            ))}
          </div>
        </div>

        <div style={dim}>{t("perksRule")}</div>
      </div>
    );
  };
}
