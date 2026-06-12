import { Injury, MarketOdds, MatchResult, Predictions, TournamentState } from "./types";
import { TEAM_BY_ID, TEAMS } from "@/data/teams";
import { FIXTURE_BY_ID } from "@/data/fixtures";
import { eloUpdate } from "./model/elo";
import { injuryPenalty } from "./model/strength";
import { predictFixture, runSimulation } from "./model/simulate";
import { validateOdds } from "./model/market";
import { getStorage } from "./storage";

/**
 * Illustrative seed entries so the dashboard demonstrates injury impact
 * out of the box — replace with real squad news via POST /api/injuries.
 */
const SEED_INJURIES: Injury[] = [
  {
    id: "seed-1",
    teamId: "FRA",
    player: "William Saliba",
    status: "doubtful",
    detail: "Hamstring tightness in final training (sample entry)",
    reportedAt: "2026-06-09",
  },
  {
    id: "seed-2",
    teamId: "BEL",
    player: "Kevin De Bruyne",
    status: "returning",
    detail: "Back from calf injury, short of match fitness (sample entry)",
    reportedAt: "2026-06-08",
  },
  {
    id: "seed-3",
    teamId: "GHA",
    player: "Thomas Partey",
    status: "out",
    detail: "Ruled out of the group stage, knee (sample entry)",
    reportedAt: "2026-06-07",
  },
];

function freshState(): TournamentState {
  return {
    version: 1,
    elo: Object.fromEntries(TEAMS.map((t) => [t.id, t.baseElo])),
    results: {},
    injuries: SEED_INJURIES,
    marketOdds: {},
  };
}

export async function loadState(): Promise<TournamentState> {
  const stored = await getStorage().load();
  if (stored) {
    stored.marketOdds ??= {}; // migrate pre-market states
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
  const { model, market, blend } = predictFixture(fixtureId, state);
  const result: MatchResult = {
    fixtureId,
    homeGoals,
    awayGoals,
    recordedAt: new Date().toISOString(),
    forecast: { model, market, blend },
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
