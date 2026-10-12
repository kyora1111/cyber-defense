import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  LazyWalletPanel,
  isEmbeddedInPlatform,
  isEmbeddedOnForeignSite,
  openPlatformWalletPanel,
  useWalletTopUp,
} from "@idosgames/wallet/react/lazy";
import { useIDosGamesClient, useUserState } from "@idosgames/react";
import {
  Icon,
  makeT,
  outlined,
  Popup,
  useGameLayout,
  useUiKit,
  v,
  well,
} from "@idosgames/react/ui";
import {
  HOLD_PERKS,
  formatZday,
  hasPerk,
  heldZday,
  shortAddress,
  walletOf,
} from "./shared/zday";
import { ZdayIcon } from "./shared/zday/ZdayIcon";

// The strings of the button; the rest of the lobby's strings live in the SDK.
const t = makeT<"wallet" | "topUp" | "holder">(
  { wallet: "Wallet", topUp: "Top up", holder: "Zero Day Holder" },
  { wallet: "Кошелёк", topUp: "Пополнение", holder: "Zero Day Holder" },
);

// The lobby's wallet button (passed to `createBaseModule` in main.tsx as `WalletButton`). The base is in
// @idosgames/app-shell and knows nothing about the wallet stack, so the project owns this file.
//
// The app's one wallet entry (deposit / withdraw), next to the balances in the lobby header, on any
// web3 title — EVM or Solana, the panel is the same and picks the chain by itself.
//
// Where the game runs decides what the button does (owner, 2026-09-29):
//  - inside idosgames.com's frame — crypto goes through the SITE's wallet card only, so the button
//    asks the page to show it (`openPlatformWalletPanel`); the game never opens a wallet there;
//  - framed by somebody else's site — no button: there is no wallet of ours to show;
//  - by its own link (`{id}.idos.games`, a custom domain, the AI Coder preview) — the game's own
//    panel with its own wallet connection.
//
// Import is "@idosgames/wallet/react/lazy", NOT "@idosgames/wallet/react": the latter pulls Reown
// AppKit into the startup graph. The wallet config is memoised per project id, so a wallet connected
// on the sign-in screen is already connected here.

//
// In this game the button is also where the lobby shows the player's wallet and token: the
// shortened address of the wallet the account is tied to, the $ZDAY the player holds (on the wallet,
// as the game last read it from the chain, plus what was deposited into the game), and the "Zero
// Day Holder" badge while the holder's perk is on (see src/shared/zday).

export function WalletButton(): ReactNode {
  const client = useIDosGamesClient();
  const user = useUserState();
  const kit = useUiKit();
  const layout = useGameLayout();
  const [open, setOpen] = useState(false);
  const embedded = isEmbeddedInPlatform();

  // The wallet and the measured balance are in the player's Blockchain state, which a sign-in by
  // e-mail does not bring along: ask for it once the lobby is up.
  useEffect(() => {
    void client.blockchain.getUserState();
  }, [client]);

  if (isEmbeddedOnForeignSite()) return null;

  const wallet = walletOf(user);
  const holder = hasPerk(user, "holder", Date.now());
  const holderFrom = HOLD_PERKS.find((perk) => perk.id === "holder")?.minZday;
  const balance = heldZday(user);

  return (
    <>
      {/* A phone's header has no room for a badge of its own: there the chip itself turns gold. */}
      {holder && layout !== "phone" ? (
        <span
          title={`${t("holder")}: ${holderFrom}+ $ZDAY`}
          data-badge="holder"
          style={badge}
        >
          <ZdayIcon size={16} />
          {t("holder")}
        </span>
      ) : null}
      <button
        type="button"
        className="idos-press"
        aria-label={t("wallet")}
        title={wallet?.address}
        onClick={() => {
          kit.play("click");
          if (embedded) void openPlatformWalletPanel();
          else setOpen(true);
        }}
        style={holder ? holderChip : chip}
        data-holder={holder || undefined}
        data-tutorial-anchor="lobby:wallet"
      >
        <Icon glyph="👛" size={layout === "phone" ? 26 : 22} />
        {wallet ? (
          <span data-wallet="address">{shortAddress(wallet.address)}</span>
        ) : layout !== "phone" ? (
          <span>{t("wallet")}</span>
        ) : null}
        <span data-wallet="zday" style={zday}>
          <ZdayIcon size={16} />
          {formatZday(balance)}
        </span>
      </button>
      {open && !embedded ? (
        <Popup title={t("wallet")} onClose={() => setOpen(false)} width={420}>
          <LazyWalletPanel client={client} appName="iDosGames" />
        </Popup>
      ) : null}
    </>
  );
}

const chip: CSSProperties = {
  ...outlined,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "3px 10px 3px 5px",
  borderRadius: 999,
  ...well,
  cursor: "pointer",
  whiteSpace: "nowrap",
  fontSize: 14,
};

/** The chip of a "Zero Day Holder": framed in gold. */
const holderChip: CSSProperties = { ...chip, border: `2px solid ${v.gold}` };

/** The $ZDAY balance inside the chip, set off from the address by a hairline. */
const zday: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  paddingLeft: 8,
  borderLeft: `1px solid ${v.line}`,
  color: v.gold,
};

const badge: CSSProperties = {
  ...outlined,
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "3px 10px 3px 5px",
  borderRadius: 999,
  border: `1px solid ${v.gold}`,
  background: `color-mix(in srgb, ${v.gold} 18%, transparent)`,
  color: v.gold,
  whiteSpace: "nowrap",
  fontSize: 13,
};

// The top-up window (passed to `createBaseModule` as `WalletTopUp`; the base keeps it mounted over every
// mode). A purchase refused because the player is short on crypto opens the game's own wallet on the
// missing amount, and the purchase repeats by itself once the deposit is credited (owner, 2026-10-09).
// Inside idosgames.com's frame the SITE's window does this instead, and this renders nothing.
export function WalletTopUp(): ReactNode {
  const client = useIDosGamesClient();
  const request = useWalletTopUp(client);
  if (!request) return null;
  return (
    <Popup title={t("topUp")} onClose={() => request.onDone(false)} width={420}>
      {/* A new shortfall is a new panel: it picks its network for the currency once. */}
      <LazyWalletPanel
        key={`${request.currencyID}:${request.amount}`}
        client={client}
        appName="iDosGames"
        topUp={request}
      />
    </Popup>
  );
}
