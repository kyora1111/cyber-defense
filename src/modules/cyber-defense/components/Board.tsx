import { memo, type ReactNode } from "react";
import { COLS, DEFENDERS } from "../data/balance";
import type { SkinId, SkinLoadout } from "../data/skins";
import type { Tower } from "../game/state";
import { t } from "../i18n";
import { DefenderArt, HpBar } from "./art";

// The "motherboard": ROWS × COLS cells, row by row. `children` are layered over the cells (what
// moves on the board, the falling data packets). The match changes many times a second, so a cell
// is memoized: it redraws only when its own tower does.

const Cell = memo(function Cell({
  cell,
  tower,
  skin,
  free,
  onClick,
}: {
  cell: number;
  tower: Tower | null;
  /** The skin this cell's tower wears, if the player owns one for it. */
  skin: SkinId | undefined;
  /** A card is picked and this cell is empty: it invites a tap. */
  free: boolean;
  onClick: (cell: number) => void;
}): ReactNode {
  const row = Math.floor(cell / COLS);
  const col = cell % COLS;
  const classes = ["cd-cell"];
  if ((row + col) % 2 === 1) classes.push("cd-cell-alt");
  if (free) classes.push("cd-cell-free");
  const fullHp = tower ? DEFENDERS[tower.kind].hp : 0;

  return (
    <button
      type="button"
      className={classes.join(" ")}
      aria-label={`${row + 1}:${col + 1}${tower ? ` — ${t(tower.kind)}` : ""}`}
      data-cell={cell}
      data-defender={tower?.kind}
      onClick={() => onClick(cell)}
    >
      {tower ? (
        <>
          <span className="cd-defender">
            <DefenderArt id={tower.kind} skin={skin} />
          </span>
          {tower.hp < fullHp ? (
            <HpBar className="cd-tower-hp" value={tower.hp / fullHp} />
          ) : null}
        </>
      ) : null}
    </button>
  );
});

export function Board({
  grid,
  loadout,
  placing,
  onCellClick,
  children,
}: {
  grid: readonly (Tower | null)[];
  loadout: SkinLoadout;
  /** A card is picked: empty cells invite a tap. */
  placing: boolean;
  /** Must keep its identity between renders, or every cell redraws on every frame. */
  onCellClick: (cell: number) => void;
  children?: ReactNode;
}): ReactNode {
  return (
    <div className="cd-board" role="group" aria-label={t("board")}>
      <div className="cd-cells">
        {grid.map((tower, cell) => (
          <Cell
            key={cell}
            cell={cell}
            tower={tower}
            skin={tower ? loadout[tower.kind] : undefined}
            free={placing && tower === null}
            onClick={onCellClick}
          />
        ))}
      </div>
      {children}
    </div>
  );
}
