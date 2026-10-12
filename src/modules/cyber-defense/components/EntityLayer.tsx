import { memo, type ReactNode } from "react";
import type { Bit, Blast, Enemy } from "../game/state";
import { HpBar, VirusArt } from "./art";

// Everything that moves on the board: viruses, the shots flying at them, a mine's blast. It only
// draws where the simulation put them (game/simulate.ts) and takes no taps — those go through to
// the cells underneath.

/**
 * A unit is a cell-sized box at the board's top-left corner, so moving it by its own size moves it
 * by one cell: `x` cells right, `row` cells down. A transform, not left/top — no layout per frame.
 */
function at(x: number, row: number): string {
  return `translate(${x * 100}%, ${row * 100}%)`;
}

export const EntityLayer = memo(function EntityLayer({
  enemies,
  bits,
  blasts,
  timeMs,
}: {
  /** The match's clock: a virus is drawn chilled until its chill runs out. */
  timeMs: number;
  enemies: readonly Enemy[];
  bits: readonly Bit[];
  blasts: readonly Blast[];
}): ReactNode {
  return (
    <div className="cd-entities">
      {bits.map((bit) => (
        <div
          key={bit.id}
          className="cd-unit"
          style={{ transform: at(bit.x, bit.row) }}
        >
          {/* A Firewall's bit is a 0 or a 1; the other towers' shots are only a shape. */}
          <span className={`cd-bit cd-bit-${bit.from}`} data-shot={bit.from}>
            {bit.from === "firewall" ? bit.id % 2 : null}
          </span>
        </div>
      ))}
      {enemies.map((enemy) => {
        const classes = ["cd-unit", `cd-virus-${enemy.kind}`];
        if (enemy.eating) classes.push("cd-virus-eating");
        if (timeMs < enemy.chilledUntilMs) classes.push("cd-virus-chilled");
        return (
          <div
            key={enemy.id}
            className={classes.join(" ")}
            style={{ transform: at(enemy.x, enemy.row) }}
            data-virus={enemy.kind}
          >
            {enemy.hp < enemy.maxHp ? (
              <HpBar className="cd-virus-hp" value={enemy.hp / enemy.maxHp} />
            ) : null}
            <span className="cd-virus-body">
              <VirusArt kind={enemy.kind} />
            </span>
          </div>
        );
      })}
      {blasts.map((blast) => (
        <div
          key={blast.id}
          className="cd-unit"
          style={{ transform: at(blast.col, blast.row) }}
        >
          <span className="cd-blast" />
        </div>
      ))}
    </div>
  );
});
