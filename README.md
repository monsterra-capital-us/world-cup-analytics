# WC26 Analytics — FIFA World Cup 2026 Prediction Engine

Advanced tournament analytics for the 2026 FIFA World Cup (Canada / Mexico /
USA, 48 teams). The app forecasts the likely champion and individual match
scorelines, adjusts in real time for injuries and in-tournament form, and
recomputes everything each time a finished match is recorded.

## What it does

- **Title race & road to the final** — probability of winning the tournament
  and of reaching each stage (R32 → R16 → QF → SF → Final → Champion) for all
  48 teams, from a 5,000-run Monte Carlo simulation of the entire remaining
  tournament.
- **Match forecasts** — win/draw/win probabilities, expected goals and a full
  scoreline-probability heatmap for every fixture, with the most likely
  scores highlighted.
- **Injury-aware ratings** — each team's effective strength is its live Elo
  rating minus an injury penalty weighted by player importance and status
  (`out` / `doubtful` / `returning`). Flagging Mbappé as out moves France's
  odds everywhere, instantly.
- **Live updating** — when a match finishes, record the final score (UI or
  API). Elo ratings update (high K-factor, goal-difference weighted), the
  state version bumps, and the full simulation re-runs on the next read.
- **Group intelligence** — live standings plus simulated advancement
  probabilities under the real 2026 format (top two per group + the eight
  best third-placed teams reach the round of 32).

## Model

| Layer | Approach |
| --- | --- |
| Team strength | Elo-style ratings, seeded pre-tournament, updated per result with K=50 and a goal-difference multiplier |
| Injuries | Penalty = player importance × status severity × 65 Elo, capped at 160 per team |
| Match scores | Rating difference → expected goals (exponential elasticity), independent Poisson with a Dixon-Coles low-score correction |
| Tournament | Monte Carlo: simulate remaining group games, rank groups & best thirds (pts / GD / GF), fixed R32 bracket template, knockouts with strength-weighted extra-time/penalty resolution |

Deterministic seeded RNG: the same state always produces the same odds.

## Running

```bash
npm install
npm run dev   # http://localhost:3000
```

## Updating data after each match

Via the **Data Manager** page, or programmatically (this is the hook for a
results feed / webhook):

```bash
# final score: Mexico 2-0 South Africa (fixture A1)
curl -X POST localhost:3000/api/results \
  -H 'Content-Type: application/json' \
  -d '{"fixtureId":"A1","homeGoals":2,"awayGoals":0}'

# squad news
curl -X POST localhost:3000/api/injuries \
  -H 'Content-Type: application/json' \
  -d '{"teamId":"FRA","player":"Kylian Mbappé","status":"doubtful","detail":"ankle knock"}'

curl -X DELETE 'localhost:3000/api/injuries?id=<injury-id>'

curl localhost:3000/api/predictions   # full computed payload
curl localhost:3000/api/state         # raw state + teams + fixtures
```

## Data notes & caveats

- Groups reflect the real draw of 5 December 2025; pre-tournament Elo
  ratings, key-player importance weights and the three seeded injury flags
  are editable estimates (`src/data/teams.ts`, `src/lib/store.ts`).
- Group-stage kickoff slots and venue assignments approximate the real
  calendar windows; edit `src/data/fixtures.ts` to match the official
  schedule exactly.
- The round-of-32 bracket template is a close simplification of FIFA's
  published bracket (see `R32_TEMPLATE` in `src/lib/model/simulate.ts`).
- State persists to `data/state.json` (gitignored, reseeded on first run).
  For serverless deployment, swap `src/lib/store.ts` for a database-backed
  implementation — the model layer is storage-agnostic.

## Stack

Next.js 16 (App Router, server components) · React 19 · TypeScript ·
Tailwind CSS 4. The prediction engine is dependency-free TypeScript in
`src/lib/model/`.
