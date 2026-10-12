# $ZDAY — rewards for holding

$ZDAY is an SPL token on Solana mainnet:
[`5HcLXTufXwi5B8vJH9RHd5Rz5jUtqs8D4CQQqq1idos`](https://solscan.io/token/5HcLXTufXwi5B8vJH9RHd5Rz5jUtqs8D4CQQqq1idos)
(6 decimals, a supply of one billion, no mint authority). It trades on a bonding curve on the
[game's page on iDos Games](https://idosgames.com/app/6G9IP66H/).

## The rule

The game never pays $ZDAY out and never takes it. A player who **holds** it gets rewards for as
long as they do:

| Holding | Reward |
|---------|--------|
| 25+ | RGB Firewall — a skin for the Firewall |
| 50+ | Retro Keyboard — a skin for the Mech Keyboard |
| 100+ | Zero Day Holder — +20% starting data packets and a badge in the lobby |

"Holding" is what the signed-in wallet has on-chain plus anything the player deposited into the
game through the lobby's wallet.

## Why not play-to-earn

The match runs in the player's browser. A faucet there — a token per so many viruses — can be
capped by the server but never verified, so it would be farmed. Selling skins for the token was
the first design and was dropped too: holding gives the token a use without the game ever
touching it.

## How it works

1. The player signs in with a Solana wallet — one message signature, no transaction.
2. The game derives the wallet's associated token account for the $ZDAY mint and reads its balance
   with a single `getAccountInfo` call. It reads again every five minutes and on **Check the wallet**.
3. For every reward the holding earns, the game switches on a **timed boost** of the iDos Games
   title: `skin_rgb_firewall`, `skin_retro_keyboard`, `zero_day_holder`. A boost lasts an hour and
   is renewed while the wallet still holds enough.
4. A reward works exactly while its boost is active. Nobody switches it off: once the tokens are
   gone the boost is simply not renewed, and the reward is gone within the hour.

The lobby's **Hold rewards** tab shows the wallet, what it holds, each reward and how far away it is.

## What it relies on

- The token's mint is not written in the code: it comes from the title's configuration (the main
  crypto currency and its Solana binding).
- The table of rewards — thresholds and boost ids — is `HOLD_PERKS` in `src/shared/zday/index.ts`.
  The boosts themselves are defined on the title; the code and the title must agree on the ids.
- The balance is read from a public RPC endpoint that answers browsers. Only the associated token
  account is read, which is where wallet apps keep a token.

## Limits

The balance is read on the client, like the rest of this browser game. That fits what the rewards
are — two looks and a slightly better start — and is the reason nothing of real value hangs on it.
Checking the holding on the server, through the platform's token gate, is the next step.
