import { associatedTokenAddress } from "./tokenAccount";

// How much of a token a wallet holds, read from the chain by the browser.
//
// The endpoint is a public one that answers browsers: Solana's own api.mainnet-beta.solana.com
// refuses any request that carries a page's Origin. Public endpoints do not answer "all token
// accounts of this owner" for free either (an indexed query), so one account is asked by its
// address — the wallet's associated token account, where wallet apps keep a token. Tokens parked
// on some other account of the same owner are not counted.
//
// Inside the idosgames.com frame the game may call only the hosts listed in the Title's
// Blockchain.IframeConnectHosts — this host has to be there.

const RPC_URL = "https://solana-rpc.publicnode.com";
const TIMEOUT_MS = 12_000;

interface AccountInfoAnswer {
  error?: { message?: string } | null;
  result?: {
    value: {
      data?: {
        parsed?: {
          info?: {
            mint?: string;
            owner?: string;
            tokenAmount?: { uiAmountString?: string };
          };
        };
      };
    } | null;
  } | null;
}

/**
 * Whole tokens of `mint` on the wallet's associated token account; 0 when the wallet has none.
 * Throws when the chain could not be read — "could not read" must never look like "holds nothing".
 */
export async function readWalletTokens(
  wallet: string,
  mint: string,
): Promise<number> {
  const account = await associatedTokenAddress(wallet, mint);
  if (!account) throw new Error("Not a Solana address");

  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getAccountInfo",
      params: [account, { encoding: "jsonParsed", commitment: "confirmed" }],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Solana RPC answered ${response.status}`);
  const answer = (await response.json()) as AccountInfoAnswer;
  if (answer.error) {
    throw new Error(`Solana RPC: ${answer.error.message ?? "error"}`);
  }
  if (!answer.result) throw new Error("Solana RPC: an answer without a result");

  // No such account: the wallet never held the token.
  if (answer.result.value === null) return 0;
  const info = answer.result.value.data?.parsed?.info;
  const amount = Number(info?.tokenAmount?.uiAmountString);
  if (info?.mint !== mint || info.owner !== wallet || !Number.isFinite(amount)) {
    throw new Error("Solana RPC: not the wallet's token account");
  }
  return amount;
}
