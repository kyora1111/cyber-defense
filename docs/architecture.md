# Architecture

Cyber Defense is a web game with no engine: React, the DOM and inline SVG. It runs on the
[iDos Games](https://idosgames.com) platform — the platform's host shell signs the player in and
draws the lobby, and the game is one module plugged into it.

## Layout

```
src/
├── main.tsx                 creates the SDK client, mounts the host shell and the modules
├── modules.ts               the list of modules the app is made of
├── walletButton.tsx         the lobby's wallet chip: address, $ZDAY held, holder badge
├── shared/zday/             the token's ids, the hold rewards table, pure helpers
└── modules/
    ├── cyber-defense/       THE GAME
    │   ├── data/            balance.ts — every tuning number; skins.ts; platform.ts
    │   ├── game/            state.ts — the match as plain data and a pure reducer
    │   │                    simulate.ts — one step of a running match
    │   │                    store.ts — the match of this session, kept outside React
    │   ├── react/           useMatch.ts — the frame loop and the packet rain
    │   ├── components/      the screen: board, entities, cards, Game Over, Hold rewards, SVG art
    │   ├── platform/        session.ts — score out, rewards in; hold.ts — the wallet and the boosts
    │   └── chain/           tokenAccount.ts — the wallet's token account; balance.ts — reading it
    └── leaderboard/ inventory/ quests/ …   systems from the iDos Games catalog
```

## The match is a pure function

`game/state.ts` holds a match as plain data and changes it with a reducer. Nothing in it reads a
clock or rolls dice: whoever drives the match — the frame loop, the packet rain, the player's taps —
passes the elapsed time and the random numbers in with the action. The same actions always give the
same match, which is what lets the rules be checked without a browser.

One step of the simulation (`game/simulate.ts`), in order:

1. a virus arrives when its time comes — tougher and sooner than the one before;
2. towers that shoot fire, but only at a virus in their lane that has not passed them;
3. shots fly right and stop in the first virus on their way; an icy one also chills it;
4. viruses act: a mine goes off under the first to touch it, a tower is stood at and bitten, an
   open lane is walked — at half pace while chilled;
5. the destroyed are counted and scored;
6. a virus at the left edge ends the match.

The match lives in a store created with the module, not in a component, so a trip to the lobby
pauses a run instead of resetting it.

## Where the game meets the platform

`platform/session.ts` is the only seam between the match and the iDos Games title:

| Direction | What | How |
|-----------|------|-----|
| out | a finished run's score | `client.leaderboard.submitScore("best_run_score", score)` |
| in | the tower skins | the player's active timed boosts `skin_rgb_firewall`, `skin_retro_keyboard` |
| in | the start bonus | the effect of the active `zero_day_holder` boost (+20%) |

`platform/hold.ts` keeps those boosts in step with what the wallet holds — see
[hold-rewards.md](hold-rewards.md).

## Reading a wallet without a transaction

```
signed-in wallet ──▶ associated token account ──▶ getAccountInfo ──▶ balance
   (from the SDK)      derived in the browser       public RPC        of $ZDAY
```

A wallet keeps a token on its *associated token account* — an address derived from the wallet and
the token's mint. `chain/tokenAccount.ts` derives it the way the chain does (SHA-256 of the seeds,
the first result that is not a point of the ed25519 curve) in about a hundred lines, instead of
shipping `@solana/web3.js` to every player for one address. The result was checked against
`@solana/web3.js` on thousands of random wallets. `chain/balance.ts` then asks a public RPC for
that one account.

## The platform, configured through MCP

Nothing on the backend was written by hand. The live title was configured section by section through
the iDos Games Title-configuration MCP:

- `Blockchain.WalletLogin` — sign-in by a Solana wallet's signature;
- `Leaderboard.best_run_score` — the best score of a single run, never reset;
- `TimedBoost` — the three boosts that carry the hold rewards;
- `Blockchain.IframeConnectHosts` — the RPC host the game may call inside the iDos Games frame;
- the build itself — uploaded, staged, checked and put live.

## Known limits

Stated plainly, because they shape what the token is used for:

- **The match runs in the browser**, so the leaderboard takes the score the client reports.
- **The wallet's balance is read by the browser** too, and only from the associated token account.
  That is enough for skins and a start bonus, and not for anything worth real money — which is
  why the game neither pays out nor sells anything for $ZDAY.
- Verifying the holding on the server (the platform's token gate) is on the roadmap.
