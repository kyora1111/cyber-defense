import {
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { FeatureRegistry } from "@idosgames/module-sdk";
import {
  outlined,
  screenBackground,
  useGameLayout,
  useSound,
  v,
  well,
} from "@idosgames/react/ui";
import { COLS, ROWS, type DefenderId } from "../data/balance";
import { canAfford, canPlaceAt, type Packet } from "../game/state";
import type { GameStore } from "../game/store";
import { t } from "../i18n";
import type { Session } from "../platform/session";
import { useGameLoop, useMatch, usePacketRain } from "../react/useMatch";
import { DataPacketIcon, VirusArt } from "./art";
import { Board } from "./Board";
import { EntityLayer } from "./EntityLayer";
import { GameOver } from "./GameOver";
import { InventoryPanel } from "./InventoryPanel";
import { PacketLayer } from "./PacketLayer";
import { CSS } from "./styles";

// The game's mode — the whole screen while it is on (the lobby's "Play" starts it, the base's round
// button top-left returns to the lobby): the counters, the inventory and the board. It also keeps
// the run going — the game loop and the packet rain run while this panel is on screen and the run
// is not lost. The rules are the reducer's (game/state.ts, game/simulate.ts); this screen asks them
// first only to pick the right sound. What the run means outside the match — the leaderboard, the
// skins, the holder's bonus — is the session's (platform/session.ts); this screen only shows it.

/** Calls `react` when `value` grows — not on mount, and not when a new run resets it. */
function useOnIncrease(value: number, react: () => void): void {
  const seen = useRef(value);
  const latest = useRef(react);
  latest.current = react;
  useEffect(() => {
    if (value > seen.current) latest.current();
    seen.current = value;
  }, [value]);
}

/** A counter of the header: an icon and a number in a recessed chip, tighter on a phone. */
function counterStyle(phone: boolean): CSSProperties {
  return {
    ...well,
    ...outlined,
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: phone ? 5 : 8,
    padding: phone ? "4px 10px 4px 5px" : "5px 14px 5px 6px",
    borderRadius: 999,
    fontSize: phone ? 16 : 20,
  };
}

const oneLine: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const caption: CSSProperties = { fontSize: 13, color: v.textDim };

/** Re-keyed by the value, so the number bumps on every change. */
function Bump({ value }: { value: number }): ReactNode {
  return (
    <span
      key={value}
      className="idos-bump"
      style={{ display: "inline-block", minWidth: "2ch", textAlign: "right" }}
    >
      {value}
    </span>
  );
}

export function makeCyberDefensePanel(
  store: GameStore,
  session: Session,
  features: FeatureRegistry,
): ComponentType {
  return function CyberDefensePanel(): ReactNode {
    const match = useMatch(store);
    const platform = useSyncExternalStore(session.subscribe, session.getState);
    const playing = match.status === "playing";
    useGameLoop(store, playing);
    usePacketRain(store, playing);
    const phone = useGameLayout() === "phone";

    // The match re-renders this screen every frame. The handlers below read it from the store
    // when called and keep their identity, so the board and the inventory are not redrawn with it.
    const play = useSound();
    const sound = useRef(play);
    sound.current = play;

    const pickCard = useCallback((id: DefenderId) => {
      const now = store.getState();
      if (now.status !== "playing") return;
      // Putting a card back is always allowed; picking one needs its price.
      if (now.selected !== id && !canAfford(now, id)) {
        sound.current("error");
        return;
      }
      sound.current("click");
      store.dispatch({ type: "toggleCard", id });
    }, []);

    const clickCell = useCallback((cell: number) => {
      const now = store.getState();
      if (now.status !== "playing" || now.selected === null) return;
      if (!canPlaceAt(now, cell)) {
        sound.current("error");
        return;
      }
      sound.current("purchase");
      store.dispatch({ type: "placeAt", cell });
    }, []);

    const collect = useCallback((packet: Packet) => {
      sound.current("coin");
      store.dispatch({ type: "collectPacket", id: packet.id });
    }, []);

    const restart = useCallback(() => {
      store.dispatch({ type: "restart" });
    }, []);

    // What the simulation did, heard: a virus destroyed, a mine gone off, the run lost.
    useOnIncrease(match.kills, () => play("countTick"));
    useOnIncrease(match.blasts.at(-1)?.id ?? 0, () => play("lootbox"));
    useOnIncrease(playing ? 0 : 1, () => play("error"));

    const leaderboard = features.get("leaderboard");

    return (
      <div
        className="cd-screen"
        style={{
          background: screenBackground,
          fontFamily: v.font,
          color: v.text,
        }}
      >
        <style>{CSS}</style>
        <header className="cd-header">
          <div style={{ minWidth: 0 }}>
            <div style={{ ...outlined, ...oneLine, fontSize: phone ? 18 : 22 }}>
              {t("title")}
            </div>
            <div style={{ ...oneLine, fontSize: 12, color: v.textDim }}>
              {platform.startBonusPercent > 0 ? (
                <span data-badge="holder" style={{ color: v.gold }}>
                  {t("holder")} · +{platform.startBonusPercent}%{" "}
                  {t("holderBonus")}
                </span>
              ) : (
                <>
                  {t("board")} · {ROWS}×{COLS}
                </>
              )}
            </div>
          </div>
          <div className="cd-counters">
            <div
              title={t("kills")}
              data-counter="kills"
              style={counterStyle(phone)}
            >
              <span style={{ width: phone ? 22 : 28, flexShrink: 0 }}>
                <VirusArt kind="trojan" />
              </span>
              <Bump value={match.kills} />
            </div>
            <div
              title={t("score")}
              data-counter="score"
              style={counterStyle(phone)}
            >
              {phone ? null : <span style={caption}>{t("score")}</span>}
              <Bump value={match.score} />
            </div>
            <div
              title={t("packets")}
              data-counter="packets"
              style={counterStyle(phone)}
            >
              <DataPacketIcon size={phone ? 22 : 28} />
              <Bump value={match.resources} />
            </div>
          </div>
        </header>
        <div className={phone ? "cd-body cd-body-phone" : "cd-body"}>
          <InventoryPanel
            resources={match.resources}
            selected={match.selected}
            loadout={platform.loadout}
            onPick={pickCard}
            compact={phone}
          />
          <div className="cd-stage">
            <Board
              grid={match.grid}
              loadout={platform.loadout}
              placing={match.selected !== null}
              onCellClick={clickCell}
            >
              <EntityLayer
                enemies={match.enemies}
                bits={match.bits}
                blasts={match.blasts}
                timeMs={match.timeMs}
              />
              <PacketLayer packets={match.packets} onCollect={collect} />
            </Board>
          </div>
        </div>
        {playing ? null : (
          <GameOver
            match={match}
            report={platform.run}
            onRestart={restart}
            onOpenLeaderboard={
              leaderboard?.available
                ? () => features.open("leaderboard")
                : undefined
            }
          />
        )}
      </div>
    );
  };
}
