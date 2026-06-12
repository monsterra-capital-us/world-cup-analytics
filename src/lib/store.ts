import { Injury, MarketOdds, MatchResult, Predictions, TournamentState } from "./types";
import { TEAM_BY_ID, TEAMS } from "@/data/teams";
import { FIXTURE_BY_ID } from "@/data/fixtures";
import { eloUpdate } from "./model/elo";
import { injuryPenalty } from "./model/strength";
import { topScorelines } from "./model/poisson";
import { predictFixture, runSimulation } from "./model/simulate";
import { validateOdds } from "./model/market";
import { getStorage } from "./storage";

function freshState(): TournamentState {
  return {
    version: 1,
    elo: Object.fromEntries(TEAMS.map((t) => [t.id, t.baseElo])),
    results: {},
    injuries: [],
    marketOdds: {},
  };
}

export async function loadState(): Promise<TournamentState> {
  const stored = await getStorage().load();
  if (stored) {
    stored.marketOdds ??= {}; // migrate pre-market states
    let changed = false;

    // drop the illustrative sample injuries earlier versions seeded — only
    // real squad news (POST /api/injuries) should move ratings
    const real = stored.injuries.filter((i) => !i.id.startsWith("seed-"));
    if (real.length !== stored.injuries.length) {
      stored.injuries = real;
      changed = true;
    }

    // backfill score expectations for results recorded before snapshots
    // stored them. Only safe for matchday-1 fixtures: their pre-match state
    // is exactly the pristine seed state (base Elo, no injuries, no odds).
    for (const r of Object.values(stored.results)) {
      if (!r.forecast || r.forecast.expHomeGoals != null) continue;
      if (FIXTURE_BY_ID[r.fixtureId]?.matchday !== 1) continue;
      const { matrix, d } = predictFixture(r.fixtureId, freshState());
      r.forecast.expHomeGoals = d.lambdaA;
      r.forecast.expAwayGoals = d.lambdaB;
      r.forecast.topScore = topScorelines(matrix, 1)[0];
      changed = true;
    }

    if (changed) {
      stored.version++;
      await getStorage().save(stored);
    }
    return stored;
  }
  const state = freshState();
  await getStorage().save(state);
  return state;
}

// ─────────────── predictions cache (recomputed when version changes) ───────────────

let cached: Predictions | null = null;

export async function getPredictions(): Promise<Predictions> {
  // lazy auto-sync (dynamic import: sync.ts imports recordResult from here)
  const { maybeSyncResults } = await import("./sync");
  await maybeSyncResults();

  const state = await loadState();
  if (!cached || cached.stateVersion !== state.version) {
    cached = runSimulation(state);
  }
  return cached;
}

// ─────────────── mutations (each bumps version → triggers recompute) ───────────────

export async function recordResult(
  fixtureId: string,
  homeGoals: number,
  awayGoals: number,
): Promise<TournamentState> {
  const fixture = FIXTURE_BY_ID[fixtureId];
  if (!fixture) throw new Error(`Unknown fixture: ${fixtureId}`);
  if (!Number.isInteger(homeGoals) || !Number.isInteger(awayGoals) || homeGoals < 0 || awayGoals < 0) {
    throw new Error("Goals must be non-negative integers");
  }

  const state = await loadState();
  const prior = state.results[fixtureId];
  if (prior) throw new Error(`Result already recorded for ${fixtureId} (${prior.homeGoals}-${prior.awayGoals})`);

  // freeze the pre-match forecast before Elo moves, for honest evaluation
  const { model, market, blend, matrix, d } = predictFixture(fixtureId, state);
  const result: MatchResult = {
    fixtureId,
    homeGoals,
    awayGoals,
    recordedAt: new Date().toISOString(),
    forecast: {
      model,
      market,
      blend,
      expHomeGoals: d.lambdaA,
      expAwayGoals: d.lambdaB,
      topScore: topScorelines(matrix, 1)[0],
    },
  };
  state.results[fixtureId] = result;

  const { newA, newB } = eloUpdate(
    state.elo[fixture.home], state.elo[fixture.away], homeGoals, awayGoals,
  );
  state.elo[fixture.home] = Math.round(newA * 10) / 10;
  state.elo[fixture.away] = Math.round(newB * 10) / 10;

  state.version++;
  await getStorage().save(state);
  return state;
}

export async function addInjury(input: {
  teamId: string;
  player: string;
  status: Injury["status"];
  detail?: string;
}): Promise<TournamentState> {
  if (!TEAM_BY_ID[input.teamId]) throw new Error(`Unknown team: ${input.teamId}`);
  if (!input.player?.trim()) throw new Error("Player name is required");
  if (!["out", "doubtful", "returning"].includes(input.status)) {
    throw new Error(`Invalid status: ${input.status}`);
  }

  const state = await loadState();
  state.injuries.push({
    id: `inj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    teamId: input.teamId,
    player: input.player.trim(),
    status: input.status,
    detail: input.detail?.trim() || undefined,
    reportedAt: new Date().toISOString().slice(0, 10),
  });
  state.version++;
  await getStorage().save(state);
  return state;
}

export async function removeInjury(id: string): Promise<TournamentState> {
  const state = await loadState();
  const before = state.injuries.length;
  state.injuries = state.injuries.filter((i) => i.id !== id);
  if (state.injuries.length === before) throw new Error(`Unknown injury id: ${id}`);
  state.version++;
  await getStorage().save(state);
  return state;
}

/**
 * Replace all feed-sourced injuries (id prefix "feed-") with the feed's
 * current list, leaving manual flags untouched. Recoveries clear
 * automatically because absent players simply stop being in the list.
 * Bumps the version (→ re-simulation) only when something changed; always
 * records the sync time for throttling.
 */
export async function replaceFeedInjuries(feed: Injury[]): Promise<boolean> {
  const state = await loadState();
  const manual = state.injuries.filter((i) => !i.id.startsWith("feed-"));
  const current = state.injuries.filter((i) => i.id.startsWith("feed-"));

  const key = (i: Injury) => `${i.id}|${i.status}|${i.detail ?? ""}`;
  const changed =
    current.length !== feed.length ||
    new Set([...current.map(key), ...feed.map(key)]).size !== feed.length;

  if (changed) {
    state.injuries = [...manual, ...feed];
    state.version++;
  }
  state.lastInjurySyncAt = new Date().toISOString();
  await getStorage().save(state);
  return changed;
}

export async function setMarketOdds(input: {
  fixtureId: string;
  home: number;
  draw: number;
  away: number;
  source?: string;
}): Promise<TournamentState> {
  const fixture = FIXTURE_BY_ID[input.fixtureId];
  if (!fixture) throw new Error(`Unknown fixture: ${input.fixtureId}`);
  validateOdds(input);

  const state = await loadState();
  if (state.results[input.fixtureId]) {
    throw new Error(`Match ${input.fixtureId} already finished — odds can no longer be set`);
  }
  state.marketOdds[input.fixtureId] = {
    fixtureId: input.fixtureId,
    home: input.home,
    draw: input.draw,
    away: input.away,
    source: input.source?.trim() || undefined,
    recordedAt: new Date().toISOString(),
  } satisfies MarketOdds;
  state.version++;
  await getStorage().save(state);
  return state;
}

export async function removeMarketOdds(fixtureId: string): Promise<TournamentState> {
  const state = await loadState();
  if (!state.marketOdds[fixtureId]) throw new Error(`No odds recorded for ${fixtureId}`);
  delete state.marketOdds[fixtureId];
  state.version++;
  await getStorage().save(state);
  return state;
}

export { injuryPenalty };
