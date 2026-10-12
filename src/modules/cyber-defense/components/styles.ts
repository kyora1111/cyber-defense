import { v } from "@idosgames/react/ui";
import { BLAST_MS, COLS, PACKET_FALL_MS, ROWS } from "../data/balance";

// The game's own art and layout — what inline styles cannot express (keyframes, :hover, container
// units), "cd-" prefixed. The chrome around the board (screen background, the inventory's card, text)
// takes the kit's theme from src/ui.config.ts; the board and what stands or falls on it are the
// game's and are drawn here.

export const CSS = `
.cd-screen { position: absolute; inset: 0; display: flex; flex-direction: column; gap: 10px;
  padding: 10px 14px 14px; overflow: hidden; pointer-events: auto;
  user-select: none; -webkit-user-select: none }
/* Room on the left for the base's round "To the lobby" button in the top-left corner. */
.cd-header { display: flex; align-items: center; justify-content: space-between; gap: 12px;
  min-height: 48px; padding-left: 62px }
/* The counters wrap onto a second line when the screen is too narrow for all of them. */
.cd-counters { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end;
  gap: 8px }
.cd-body { flex: 1; min-height: 0; display: flex; gap: 12px }
.cd-body-phone { flex-direction: column }

/* The stage measures the room left for the board; the board is the largest COLS:ROWS box in it. */
.cd-stage { flex: 1; min-width: 0; min-height: 0; container-type: size; display: grid;
  place-items: center }
.cd-board { position: relative; width: min(100cqw, calc(100cqh * ${COLS} / ${ROWS}));
  aspect-ratio: ${COLS} / ${ROWS}; container-type: inline-size; overflow: hidden;
  border: 3px solid #115e59; border-radius: 14px; background-color: #052e26;
  background-image:
    radial-gradient(circle, rgba(94, 234, 212, .22) 0 1.5px, transparent 2px),
    linear-gradient(90deg, rgba(94, 234, 212, .07) 1px, transparent 1px),
    linear-gradient(rgba(94, 234, 212, .07) 1px, transparent 1px);
  background-size: 22px 22px;
  box-shadow: 0 0 0 2px #042f2e, 0 0 28px rgba(45, 212, 191, .35),
    inset 0 0 44px rgba(0, 0, 0, .55) }

.cd-cells { position: absolute; inset: 0; display: grid;
  grid-template-columns: repeat(${COLS}, 1fr); grid-template-rows: repeat(${ROWS}, 1fr) }
.cd-cell { position: relative; appearance: none; margin: 0; padding: 9%; min-width: 0;
  min-height: 0; display: grid;
  place-items: center; border: 1px solid rgba(94, 234, 212, .2); border-radius: 0;
  background: rgba(13, 148, 136, .07); color: inherit; font: inherit; cursor: default;
  -webkit-tap-highlight-color: transparent; touch-action: manipulation }
.cd-cell-alt { background: rgba(13, 148, 136, .17) }
.cd-cell-free { cursor: pointer; box-shadow: inset 0 0 0 1px rgba(250, 204, 21, .3) }
.cd-cell-free:hover { background: rgba(250, 204, 21, .2);
  box-shadow: inset 0 0 0 2px rgba(250, 204, 21, .85) }
.cd-defender { display: block; width: 100%;
  animation: cd-place 260ms cubic-bezier(.2, .9, .3, 1.25) both }
/* The "RGB Firewall" skin: its colours run round the wheel. The glow is repeated in the keyframes
   because an animated filter replaces the element's own. */
.cd-rgb { animation: cd-rgb 3.2s linear infinite }
@keyframes cd-rgb {
  from { filter: hue-rotate(0deg) drop-shadow(0 0 4px rgba(244, 114, 182, .9)) }
  to { filter: hue-rotate(360deg) drop-shadow(0 0 4px rgba(244, 114, 182, .9)) } }
@keyframes cd-place { from { transform: scale(.4); opacity: 0 } to { transform: none; opacity: 1 } }

/* What moves on the board. A unit is a cell-sized box in the top-left corner, moved by a transform
   (see EntityLayer); what it shows is laid out inside it in % of a cell. */
.cd-entities { position: absolute; inset: 0; overflow: hidden; pointer-events: none }
.cd-unit { position: absolute; left: 0; top: 0; width: calc(100% / ${COLS});
  height: calc(100% / ${ROWS}); will-change: transform }
.cd-virus-body { position: absolute; left: 0; bottom: 6%; width: 74%;
  animation: cd-walk 700ms ease-in-out infinite }
.cd-virus-eating .cd-virus-body { animation: cd-chomp 260ms ease-in-out infinite }
/* The Elite Virus fills its lane: the same front edge, a taller body. */
.cd-virus-elite .cd-virus-body { bottom: 0; width: 92% }
.cd-virus-elite .cd-virus-hp { top: -2%; width: 80% }
@keyframes cd-walk { 50% { transform: translateY(-5%) rotate(-3deg) } }
@keyframes cd-chomp { 50% { transform: translateX(-7%) rotate(-10deg) } }
.cd-bit { position: absolute; left: 0; top: 50%; width: 22%; aspect-ratio: 1;
  transform: translate(-50%, -50%); display: grid; place-items: center; border-radius: 28%;
  border: 1.5px solid #bef264; background: #1a2e05; color: #d9f99d;
  font: 700 clamp(8px, 1.5cqw, 14px) / 1 ui-monospace, "Cascadia Mono", Consolas, monospace;
  box-shadow: 0 0 8px 1px rgba(190, 242, 100, .75) }
/* The Spam Filter's shot: a smaller, paler one — there are three of them to a Firewall's bit. */
.cd-bit-spamFilter { width: 13%; border-radius: 50%; border-color: #fef9c3; background: #fde047;
  box-shadow: 0 0 7px 1px rgba(253, 224, 71, .8) }
/* The Cooler's: a shard of ice. */
.cd-bit-cooler { width: 19%; border-radius: 18%; border-color: #f0f9ff;
  background: linear-gradient(135deg, #e0f2fe, #38bdf8);
  transform: translate(-50%, -50%) rotate(45deg);
  box-shadow: 0 0 10px 2px rgba(125, 211, 252, .9) }
/* A chilled virus: a slower walk, and a crust of frost laid over the body of its figure. */
.cd-virus-chilled .cd-virus-body { animation-duration: 1400ms }
.cd-virus-chilled .cd-virus-body::after { content: ""; position: absolute; left: 12.5%;
  top: 16.7%; width: 75%; height: 66.6%; border-radius: 25% / 28%;
  background: rgba(186, 230, 253, .42);
  box-shadow: 0 0 9px 2px rgba(125, 211, 252, .9), inset 0 0 7px rgba(240, 249, 255, .9) }
.cd-virus-chilled.cd-virus-eating .cd-virus-body { animation-duration: 260ms }
/* The Cooler's blades turn while it stands on the board (not on its card). */
.cd-defender .cd-fan { transform-origin: 24px 24px; animation: cd-spin 900ms linear infinite }
@keyframes cd-spin { to { transform: rotate(360deg) } }
.cd-blast { position: absolute; inset: -45%; border-radius: 50%;
  background: radial-gradient(circle, #fef08a 0%, #fb923c 38%, rgba(239, 68, 68, .6) 58%,
    transparent 72%);
  animation: cd-blast ${BLAST_MS}ms ease-out both }
@keyframes cd-blast { from { transform: scale(.25); opacity: 1 } to { transform: scale(1.1); opacity: 0 } }

/* Health left: over a hurt virus, under a bitten tower. */
.cd-hp { position: absolute; height: 6%; min-height: 3px; overflow: hidden; border-radius: 99px;
  background: rgba(0, 0, 0, .65) }
.cd-hp > i { display: block; height: 100%; border-radius: inherit; background: #f87171 }
.cd-virus-hp { left: 6%; top: 3%; width: 62% }
.cd-tower-hp { left: 14%; right: 14%; bottom: 5% }
.cd-tower-hp > i { background: #4ade80 }

/* Game Over: over the whole screen of the game, the board dimmed behind it. */
.cd-over { position: absolute; inset: 0; z-index: 5; display: grid; place-items: center;
  padding: 16px; background: rgba(2, 6, 23, .74); animation: cd-fade 240ms ease-out both }
@keyframes cd-fade { from { opacity: 0 } to { opacity: 1 } }

/* A data packet: the glowing cube that falls over the board, and its small copy next to a number. */
.cd-data { display: grid; place-items: center; aspect-ratio: 1; flex-shrink: 0;
  border: 2px solid #a5f3fc; border-radius: 24%;
  background: linear-gradient(145deg, #22d3ee, #0e7490);
  box-shadow: 0 0 12px 2px rgba(34, 211, 238, .6), inset 0 0 8px rgba(255, 255, 255, .35);
  color: #ecfeff; font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
  font-weight: 700; line-height: 1; text-align: center }
.cd-data-icon { box-shadow: 0 0 6px rgba(34, 211, 238, .55) }
.cd-core { width: 40%; aspect-ratio: 1; border-radius: 22%; background: #ecfeff }

.cd-packets { position: absolute; inset: 0; overflow: hidden; pointer-events: none }
.cd-packet { position: absolute; top: var(--cd-land); width: clamp(40px, 7cqw, 66px);
  font-size: clamp(11px, 1.9cqw, 17px); transform: translate(-50%, -50%); cursor: pointer;
  pointer-events: auto; touch-action: manipulation;
  animation: cd-fall ${PACKET_FALL_MS}ms linear both,
    cd-beacon 900ms ease-in-out ${PACKET_FALL_MS}ms infinite }
.cd-packet:hover { filter: brightness(1.2) }
@keyframes cd-fall { from { top: -12% } to { top: var(--cd-land) } }
@keyframes cd-beacon { 50% { box-shadow: 0 0 20px 6px rgba(34, 211, 238, .9),
  inset 0 0 8px rgba(255, 255, 255, .35) } }
.cd-pop { position: absolute; transform: translate(-50%, -50%); pointer-events: none;
  white-space: nowrap; font-size: clamp(15px, 2.6cqw, 24px); font-weight: 800; color: #a5f3fc;
  text-shadow: 0 2px 0 rgba(0, 0, 0, .65); animation: cd-pop 650ms ease-out both }
@keyframes cd-pop { from { opacity: 1; translate: 0 0 } to { opacity: 0; translate: 0 -40px } }

/* The inventory: a column of cards beside the board, a strip of small ones above it on a phone. */
.cd-inventory { flex-shrink: 0; display: flex; flex-direction: column; gap: 8px; min-height: 0;
  padding: 10px }
.cd-inventory-title { font-size: 16px }
.cd-inventory-hint { min-width: 0; font-size: 12px; line-height: 1.35; color: ${v.textDim} }
/* The list scrolls when even the smallest cards do not fit. It reaches out to the panel's edges so
   that the picked card's glow is not cut off by the scrolling box. */
.cd-cards { display: flex; flex-direction: column; gap: 8px; min-height: 0; margin: -6px -10px;
  padding: 6px 10px; overflow-y: auto; scrollbar-width: thin }
.cd-card { appearance: none; margin: 0; flex-shrink: 0; display: grid;
  grid-template-columns: 44px minmax(0, 1fr); align-items: center; gap: 9px;
  padding: 6px 10px 6px 7px; border: 2px solid ${v.line}; border-radius: 12px;
  background: ${v.well}; color: inherit; font: inherit; text-align: left; cursor: pointer;
  transition: border-color ${v.fast}, box-shadow ${v.fast}, opacity ${v.fast}, transform ${v.fast};
  -webkit-tap-highlight-color: transparent; touch-action: manipulation }
.cd-card-picked { border-color: ${v.gold}; transform: translateY(-2px);
  box-shadow: 0 0 16px color-mix(in srgb, ${v.gold} 55%, transparent) }
.cd-card-short { opacity: .55; cursor: not-allowed }
.cd-card-text { display: grid; gap: 2px; min-width: 0 }
.cd-card-name { font-size: 14px; line-height: 1.2 }
.cd-card-info { font-size: 11px; line-height: 1.25; color: ${v.textDim} }
.cd-card-price { display: inline-flex; align-items: center; gap: 5px; font-size: 14px;
  font-weight: 700; line-height: 1.2 }

/* Beside the board the panel is as tall as the room it is given, and its cards follow that: when
   all five do not fit they lose their descriptions, then the panel its title and hint, then the
   cards their padding. */
.cd-inventory-side { width: 214px; container: cd-inventory / size }
@container cd-inventory (max-height: 535px) {
  .cd-card-info { display: none } }
@container cd-inventory (max-height: 425px) {
  .cd-inventory-title, .cd-inventory-hint { display: none } }
@container cd-inventory (max-height: 335px) {
  .cd-cards { gap: 5px }
  .cd-card { grid-template-columns: 34px minmax(0, 1fr); padding-block: 2px } }

/* On a phone: one row of all the cards, each a picture with its name and price under it. */
.cd-inventory-strip { container: cd-inventory / inline-size }
.cd-inventory-strip .cd-inventory-title, .cd-inventory-strip .cd-card-info { display: none }
.cd-inventory-strip .cd-cards { display: grid; gap: 6px; overflow: visible }
.cd-inventory-strip .cd-card { grid-template-columns: minmax(0, 1fr); justify-items: center;
  gap: 3px; padding: 6px 2px; text-align: center }
.cd-inventory-strip .cd-card > svg { max-width: 44px }
.cd-inventory-strip .cd-card-text { justify-items: center }
.cd-inventory-strip .cd-card-name { display: grid; align-items: center; min-height: 2.2em;
  font-size: clamp(8.5px, 2.9cqi, 13px); line-height: 1.1 }
.cd-inventory-strip .cd-card-price { font-size: 13px }
`;
