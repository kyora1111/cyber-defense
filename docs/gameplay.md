# Gameplay

A run is one defense of the motherboard. It ends when a virus reaches the left edge; what counts
is the score, and the best run goes on the global leaderboard.

## The board

- 5 lanes of 9 cells. Viruses appear beyond the right edge in a random lane and walk left.
- **Data packets** fall onto the board. Tap one to catch it: +25 to the counter. A new packet drops
  every 4 seconds; a run starts with 50 (60 for a Zero Day Holder).
- Pick a tower card, then tap an empty cell: the tower is placed and its price is taken.
- A virus that meets a tower stops and eats it. A virus at the left edge is **Game Over**.

## Towers

| Tower | Price | Health | Role |
|-------|------:|-------:|------|
| Firewall | 50 | 300 | Shoots a bit along its lane every 1.4 s — 20 damage. Fires only while a virus is in its lane and has not passed it |
| Server Rack | 50 | 1500 | A wall. Never shoots; takes five times as long to eat as a Firewall |
| Spam Filter | 125 | 300 | Three shots to a Firewall's one, each half as strong (10 damage) |
| Mech Keyboard | 150 | 300 | A mine: explodes under the first virus that touches it and destroys every virus in its cell |
| Cooler | 175 | 300 | An icy shot every 1.4 s — 5 damage, and the virus walks at half speed for 3 s. Another hit starts the 3 s over; the slow-down never stacks |

The chill slows the walk, not the bite: a chilled virus at a tower eats it as fast as any other.

## Viruses

| Virus | Health | Score | Notes |
|-------|-------:|------:|-------|
| Trojan | 100, growing | 10 | Walks 0.22 cells per second, bites for 75 damage per second |
| Elite Virus | 3 × a Trojan's | 50 | Red and crowned; a 5% chance on every arrival |

## Why a run always ends

Each arrival has about 7% of the base health more than the one before, and the wait for the next
one shrinks by 6% every time, from 7 seconds down to 1.4. No defense holds forever, so "the best
score of a single run" measures how well the board was built, not how long someone waited. A good
run lasts about three minutes.

## Tuning

Every number above lives in one file: `src/modules/cyber-defense/data/balance.ts`.
