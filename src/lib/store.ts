import fs from "node:fs";
import path from "node:path";
import { Injury, MatchResult, Predictions, TournamentState } from "./types";
import { TEAM_BY_ID, TEAMS } from "@/data/teams";
import { FIXTURE_BY_ID } from "@/data/fixtures";
import { eloUpdate } from "./model/elo";
import { injuryPenalty } from "./model/strength";
import { runSimulation } from "./model/simulate";

const DATA_DIR = path.join(process.cwd(), "data");
const STATE_FILE = path.join(DATA_DIR, "state.json");

/**
 * Illustrative seed entries so the dashboard demonstrates injury impact
 * out of the box — replace with real squad news via the Data Manager.
 */
const SEED_INJURIES: Injury[] = [
  {
    id: "seed-1",
    teamId: "FRA",
    player: "William Saliba",
    status: "doubtful",
    detail: "Hamstring tightness in final training (sample entry — edit in Data Manager)",
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
  };
}

export function loadState(): TournamentState {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) as TournamentState;
  } catch {
    const state = freshState();
    saveState(state);
    return state;
  }
}

function saveState(state: TournamentState): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ─────────────── predictions cache (recomputed when version changes) ───────────────

let cached: Predictions | null = null;

export function getPredictions(): Predictions {
  const state = loadState();
  if (!cached || cached.stateVersion !== state.version) {
    cached = runSimulation(state);
  }
  return cached;
}

// ─────────────── mutations (each bumps version → triggers recompute) ───────────────

export function recordResult(
  fixtureId: string,
  homeGoals: number,
  awayGoals: number,
): TournamentState {
  const fixture = FIXTURE_BY_ID[fixtureId];
  if (!fixture) throw new Error(`Unknown fixture: ${fixtureId}`);
  if (!Number.isInteger(homeGoals) || !Number.isInteger(awayGoals) || homeGoals < 0 || awayGoals < 0) {
    throw new Error("Goals must be non-negative integers");
  }

  const state = loadState();
  const prior = state.results[fixtureId];
  if (prior) throw new Error(`Result already recorded for ${fixtureId} (${prior.homeGoals}-${prior.awayGoals})`);

  const result: MatchResult = {
    fixtureId,
    homeGoals,
    awayGoals,
    recordedAt: new Date().toISOString(),
  };
  state.results[fixtureId] = result;

  const { newA, newB } = eloUpdate(
    state.elo[fixture.home], state.elo[fixture.away], homeGoals, awayGoals,
  );
  state.elo[fixture.home] = Math.round(newA * 10) / 10;
  state.elo[fixture.away] = Math.round(newB * 10) / 10;

  state.version++;
  saveState(state);
  return state;
}

export function addInjury(input: {
  teamId: string;
  player: string;
  status: Injury["status"];
  detail?: string;
}): TournamentState {
  if (!TEAM_BY_ID[input.teamId]) throw new Error(`Unknown team: ${input.teamId}`);
  if (!input.player.trim()) throw new Error("Player name is required");
  if (!["out", "doubtful", "returning"].includes(input.status)) {
    throw new Error(`Invalid status: ${input.status}`);
  }

  const state = loadState();
  state.injuries.push({
    id: `inj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    teamId: input.teamId,
    player: input.player.trim(),
    status: input.status,
    detail: input.detail?.trim() || undefined,
    reportedAt: new Date().toISOString().slice(0, 10),
  });
  state.version++;
  saveState(state);
  return state;
}

export function removeInjury(id: string): TournamentState {
  const state = loadState();
  const before = state.injuries.length;
  state.injuries = state.injuries.filter((i) => i.id !== id);
  if (state.injuries.length === before) throw new Error(`Unknown injury id: ${id}`);
  state.version++;
  saveState(state);
  return state;
}

export function resetState(): TournamentState {
  const state = freshState();
  saveState(state);
  return state;
}

export { injuryPenalty };
