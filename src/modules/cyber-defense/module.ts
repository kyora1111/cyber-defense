import { defineModule, type Module } from "@idosgames/module-sdk";
import { makeCyberDefensePanel } from "./components/CyberDefensePanel";
import { makeHoldScreen } from "./components/HoldScreen";
import { createGameStore } from "./game/store";
import { t } from "./i18n";
import { createSession } from "./platform/session";

// Cyber Defense — this project's game: a lane tower defense on a 5×9 "motherboard". A mode of its
// own (a route + one full-screen React panel, no engine scene): the base's lobby offers it as "Play"
// and keeps the sign-in, balances and wallet to itself.
export const cyberDefenseModule: Module = defineModule({
  id: "cyber-defense",
  meta: {
    name: "Cyber Defense",
    type: "game",
    genre: "tower-defense",
    engine: "dom",
  },
  setup(ctx) {
    // The match lives here, not in the panel: the panel unmounts when the player goes to the lobby.
    const store = createGameStore();
    // …and so does its link to the platform: a score on its way to the server must not be dropped
    // because the player left the game's screen.
    const session = createSession(ctx.client, store);
    ctx.effect(() => session.start());

    ctx.registerRoute({ id: "cyber-defense", label: t("title"), icon: "🛡️" });
    // The game's own lobby tab: the perks for holding $ZDAY (the towers' skins, the start bonus).
    ctx.features.register({
      id: "hold-rewards",
      label: t("holdTab"),
      icon: "gift",
      group: "economy",
      order: 10,
      primary: true,
      Screen: makeHoldScreen(session),
    });
    ctx.registerPanel({
      id: "match",
      slot: "overlay",
      component: makeCyberDefensePanel(store, session, ctx.features),
    });

    // Ordinary React in the DOM: an agent reads it and presses it like a person (cells, cards,
    // packets and viruses carry data-* attributes). The snapshot saves it measuring the board.
    ctx.exposeToAgent({
      state: () => {
        const match = store.getState();
        const platform = session.getState();
        return {
          ui: "dom",
          mode: ctx.modes.current(),
          status: match.status,
          resources: match.resources,
          score: match.score,
          kills: match.kills,
          eliteKills: match.eliteKills,
          selected: match.selected,
          defenders: match.grid.filter((cell) => cell !== null).length,
          viruses: match.enemies.map((e) => ({
            kind: e.kind,
            row: e.row,
            x: Number(e.x.toFixed(2)),
            hp: e.hp,
            chilled: e.chilledUntilMs > match.timeMs,
          })),
          packetsOnBoard: match.packets.length,
          skins: platform.loadout,
          startBonusPercent: platform.startBonusPercent,
          hold: platform.hold,
          report: platform.run,
        };
      },
      describeActions: {},
    });
  },
});
