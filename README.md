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
- **Live updating** — finished matches are pulled automatically from a
  results feed (or POSTed to the API). Elo ratings update (high K-factor,
  goal-difference weighted), the state version bumps, and the full
  simulation re-runs on the next read.
- **Market-anchored ensemble** — enter pre-match sportsbook odds (e.g.
  Pinnacle closing lines) per fixture; the vig is stripped and the de-vigged
  probabilities are blended with the model (70/30 market/model). Sharp
  closing lines are the strongest public predictor of football outcomes, so
  the blend is designed to be at least as sharp as either input alone.
- **Honest scoring** — every forecast is frozen at the moment its result is
  recorded, then scored out-of-sample (Brier, log loss, RPS) on the Model
  page, with a direct model-vs-market-vs-blend comparison. Whether the
  system is "on par with the books" is a number the app reports, not a
  claim.
- **Group intelligence** — live standings plus simulated advancement
  probabilities under the real 2026 format (top two per group + the eight
  best third-placed teams reach the round of 32).

## Model

| Layer | Approach |
| --- | --- |
| Team strength | Elo-style ratings, seeded pre-tournament, updated per result with K=50 and a goal-difference multiplier |
| Injuries | Penalty = player importance × status severity × 65 Elo, capped at 160 per team |
| Home advantage | Host nations (USA/MEX/CAN) get +55 Elo in their own country's venues |
| Match scores | Rating difference → expected goals (exponential elasticity), independent Poisson with a Dixon-Coles low-score correction; knockout expected goals damped ×0.88 |
| Market ensemble | Decimal odds → de-vig (proportional) → 70/30 market/model blend; score matrix rescaled to blended outcome masses, preserving scoreline shape |
| Tournament | Monte Carlo: simulate remaining group games, rank groups & best thirds (pts / GD / GF), fixed R32 bracket template, knockouts with strength-weighted extra-time/penalty resolution |
| Evaluation | Pre-match forecast snapshots scored out-of-sample: multiclass Brier, log loss, ranked probability score |

Deterministic seeded RNG: the same state always produces the same odds.

## Running locally

```bash
npm install
npm run dev   # http://localhost:3000
```

With no database configured, state persists to `data/state.json` —
zero-setup for local use.

## Deploying to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import this
   repository (framework is auto-detected as Next.js — no settings needed).
2. In the project's **Storage** tab, create a **Postgres** database (Neon,
   free tier is fine) and connect it. This injects `POSTGRES_URL` into the
   deployment automatically.
3. Add a `FOOTBALL_DATA_API_KEY` environment variable (free key from
   [football-data.org](https://www.football-data.org/)) so finished matches
   sync in automatically.
4. Redeploy. Done — the app creates its one table on first request and all
   recorded results/injuries persist in the database.

Any host works the same way: set `POSTGRES_URL` (or `DATABASE_URL`) to any
Postgres connection string, or set nothing and rely on file storage on
hosts with a persistent disk.

## Updating data after each match

Results update **automatically, around the clock**: a Vercel cron polls
`/api/sync` every 10 minutes and page reads trigger the same check, but the
feed is only queried — and the model only recomputed — when a fixture
should have ended without a recorded result.

- `FOOTBALL_DATA_API_KEY` — free key from football-data.org (the default
  feed is their FIFA World Cup endpoint).
- `RESULTS_FEED_URL` — optional override; any endpoint returning the same
  match-list shape works.
- `GET /api/sync` — trigger the check manually and see what was recorded
  (`?force=1` queries the feed unconditionally).

Everything below remains available for webhooks, corrections on a fresh
state, or running without a feed:

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

# pre-match market odds (decimal), e.g. Pinnacle closing line
curl -X POST localhost:3000/api/odds \
  -H 'Content-Type: application/json' \
  -d '{"fixtureId":"A1","home":1.65,"draw":3.9,"away":5.6,"source":"Pinnacle"}'

curl localhost:3000/api/predictions   # full computed payload
curl localhost:3000/api/state         # raw state + teams + fixtures
```

## Is this on par with leading sportsbooks?

Treat sharp closing lines (Pinnacle et al.) as the benchmark, not a target
to beat: they embed proprietary models *plus* the information content of
sharp betting volume, and consistently outperforming them is the hardest
problem in sports forecasting. This app takes the credible route instead:

1. anchor on the market when odds are entered (the blend can't be much
   worse than the market, and the model adds scoreline shape, injury
   reactions between line moves, and full-tournament simulation the odds
   don't give you), and
2. measure everything — the Model page scores model vs market vs blend on
   identical matches, so the question is answered empirically as results
   accumulate rather than asserted.

## Data notes & caveats

- Groups reflect the real draw of 5 December 2025; pre-tournament Elo
  ratings and key-player importance weights are editable estimates
  (`src/data/teams.ts`).
- Group-stage kickoff slots and venue assignments approximate the real
  calendar windows; edit `src/data/fixtures.ts` to match the official
  schedule exactly.
- The round-of-32 bracket template is a close simplification of FIFA's
  published bracket (see `R32_TEMPLATE` in `src/lib/model/simulate.ts`).
- Storage is pluggable (`src/lib/storage.ts`): a Postgres JSONB row when
  `POSTGRES_URL`/`DATABASE_URL` is set, otherwise a gitignored
  `data/state.json` reseeded on first run.

## Stack

Next.js 16 (App Router, server components) · React 19 · TypeScript ·
Tailwind CSS 4. The prediction engine is dependency-free TypeScript in
`src/lib/model/`.
