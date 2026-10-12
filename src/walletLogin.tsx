import { LazySolanaWalletLogin } from "@idosgames/wallet/react/lazy";
import type { RenderLinkWallet, RenderWalletLogin } from "@idosgames/app-shell";
import { ENV_WALLETCONNECT_PROJECT_ID } from "./env";
import {
  IDOS_WEB3_NETWORK_ID,
  IDOS_WEB3_WALLETCONNECT_PROJECT_ID,
} from "./idos.title";

// Wallet sign-in seam — ON by default: every project offers "Sign in with wallet".
//
// This game is a Solana title ($ZDAY is an SPL token), so the button is the Solana one: Phantom,
// Solflare and any other wallet the browser has, through the wallet's own extension. The challenge
// network comes from the title (IDOS_WEB3_NETWORK_ID in ./idos.title.ts); the "solana" fallback
// keeps the button alive if that is left empty. A title whose Blockchain config has no such network
// will surface the server's error under the button — fix that by configuring the network (backend
// MCP: get_blockchain / save_blockchain), not by hiding the button.
//
// Keeping the seam in its own file is what makes swapping the chain (and your own edits) safe.
//
// The import is "@idosgames/wallet/react/lazy", NOT "@idosgames/wallet/react/solana". The wallet
// stack (Reown AppKit + the Solana adapter) is megabytes of code most players never need; the lazy
// entry keeps it out of the first load until the player actually taps sign-in. The packages it
// loads then — @reown/appkit-adapter-solana, @solana/web3.js, buffer — are this project's own
// dependencies (package.json): @idosgames/wallet only names them as optional peers.
//
// walletConnectProjectId adds MOBILE wallets via the WalletConnect QR/deep-link modal; without it
// the button only works with wallets installed in the browser and mobile login is unavailable. It
// comes from the title's blockchain config (IDOS_WEB3_WALLETCONNECT_PROJECT_ID, baked by the
// platform); VITE_WALLETCONNECT_PROJECT_ID in .env.local is a local-dev fallback.

const networkID = IDOS_WEB3_NETWORK_ID || "solana";
const walletConnectProjectId =
  IDOS_WEB3_WALLETCONNECT_PROJECT_ID || ENV_WALLETCONNECT_PROJECT_ID || undefined;

export const renderWalletLogin: RenderWalletLogin = ({
  client,
  onAuthenticated,
  disabled,
  style,
}) => (
  <LazySolanaWalletLogin
    client={client}
    networkID={networkID}
    onAuthenticated={onAuthenticated}
    disabled={disabled}
    style={style}
    appName="Cyber Defense"
    walletConnectProjectId={walletConnectProjectId}
  />
);

// "Link wallet" on the play-access screen (mounted in ./main.tsx) — the same button in link mode. When
// the title's login mode requires a token balance, a player who signed in another way attaches a
// wallet to the account by signature, and the server checks the balance against exactly that
// wallet. `networkID` is the network a requirement needs; the title's own network otherwise.
export const renderWalletLink: RenderLinkWallet = ({
  client,
  networkID: requiredNetworkID,
  onLinked,
  disabled,
  style,
}) => (
  <LazySolanaWalletLogin
    mode="link"
    client={client}
    networkID={requiredNetworkID || networkID}
    onLinked={onLinked}
    disabled={disabled}
    style={style}
    appName="Cyber Defense"
    walletConnectProjectId={walletConnectProjectId}
  />
);
