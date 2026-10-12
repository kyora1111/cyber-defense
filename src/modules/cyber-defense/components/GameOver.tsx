import type { ReactNode } from "react";
import {
  Button,
  errorText,
  Icon,
  outlined,
  panel,
  v,
} from "@idosgames/react/ui";
import type { GameState } from "../game/state";
import { t } from "../i18n";
import type { RunReport } from "../platform/session";

// The screen a lost run ends on: over the board as the virus left it, with what the run came to —
// the score, and how it is getting to the leaderboard — and the way into a new run.

function Row({ label, value }: { label: string; value: ReactNode }): ReactNode {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        fontSize: 15,
      }}
    >
      <span style={{ color: v.textDim }}>{label}</span>
      <span style={{ ...outlined, fontSize: 17 }}>{value}</span>
    </div>
  );
}

export function GameOver({
  match,
  report,
  onRestart,
  onOpenLeaderboard,
}: {
  match: GameState;
  report: RunReport;
  onRestart: () => void;
  /** Absent while the Title has no leaderboard to show. */
  onOpenLeaderboard?: () => void;
}): ReactNode {
  const scoreNote =
    report.score === "sending"
      ? t("scoreSending")
      : report.score === "sent"
        ? t("scoreSent")
        : report.score === "failed"
          ? `${t("scoreFailed")}: ${errorText(report.scoreError)}`
          : null;

  return (
    <div className="cd-over" role="dialog" aria-label={t("gameOver")}>
      <div
        style={{
          ...panel,
          display: "grid",
          gap: 10,
          padding: "22px 28px",
          width: "min(100%, 400px)",
        }}
      >
        <div
          style={{
            ...outlined,
            fontSize: 34,
            color: v.red,
            textAlign: "center",
          }}
        >
          {t("gameOver")}
        </div>
        <div style={{ fontSize: 14, color: v.textDim, textAlign: "center" }}>
          {t("gameOverText")}
        </div>

        <Row label={t("score")} value={match.score} />
        {scoreNote ? (
          <div
            data-report="score"
            style={{
              fontSize: 12,
              textAlign: "right",
              color: report.score === "failed" ? v.red : v.textDim,
            }}
          >
            {scoreNote}
          </div>
        ) : null}
        <Row label={t("kills")} value={match.kills} />
        <Row label={t("elites")} value={match.eliteKills} />

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 10,
            marginTop: 6,
          }}
        >
          <Button attract size="lg" style={{ minWidth: 180 }} onClick={onRestart}>
            {t("playAgain")}
          </Button>
          {onOpenLeaderboard ? (
            <Button tone="blue" onClick={onOpenLeaderboard}>
              <Icon glyph="trophy" size={18} /> {t("toTable")}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
