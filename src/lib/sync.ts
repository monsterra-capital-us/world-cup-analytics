import { FIXTURES } from "@/data/fixtures";
import { TEAMS } from "@/data/teams";
import { loadState, recordResult } from "./store";

/**
 * Automatic results ingestion — replaces manual score entry.
 *
 * Finished matches are pulled from a results feed and recorded exactly as a
 * POST to /api/results would be (frozen pre-match forecast, Elo update,
 * version bump → full re-simulation on the next read).
 *
 * Configuration (environment variables):
 * - FOOTBALL_DATA_API_KEY — free key from football-data.org; the default
 *   feed is their FIFA World Cup endpoint.
 * - RESULTS_FEED_URL — optional override; any endpoint returning the same
 *   shape ({ matches: [{ status, stage?, utcDate?, homeTeam, awayTeam,
 *   score.fullTime }] }) works.
 *
 * With neither set, sync is a no-op and results can still be recorded via
 * POST /api/results (e.g. from your own webhook).
 */

const DEFAULT_FEED_URL = "https://api.football-data.org/v4/competitions/WC/matches";

/** group games end roughly 1h50 after kickoff (no extra time) */
const MATCH_DURATION_MS = 110 * 60_000;
/** don't hit the feed more than once per interval per server instance */
const SYNC_INTERVAL_MS = 5 * 60_000;

interface FeedTeam {
  tla?: string;
  name?: string;
}

interface FeedMatch {
  status?: string;
  stage?: string;
  utcDate?: string;
  homeTeam?: FeedTeam;
  awayTeam?: FeedTeam;
  score?: { fullTime?: { home?: number | null; away?: number | null } };
}

export interface SyncSummary {
  ok: boolean;
  configured: boolean;
  /** fixture ids newly recorded in this run */
  recorded: string[];
  /** finished feed matches that could not be mapped to a fixture */
  unmatched: string[];
  error?: string;
}

// feed team names that differ from ours (compared after normalisation)
const NAME_ALIASES: Record<string, string> = {
  "korea republic": "KOR",
  "ir iran": "IRN",
  "cote divoire": "CIV",
  turkey: "TUR",
  turkiye: "TUR",
  "bosnia and herzegovina": "BIH",
  "bosnia herzegovina": "BIH",
  usa: "USA",
  "united states of america": "USA",
  "cabo verde": "CPV",
  "congo dr": "COD",
  "democratic republic of the congo": "COD",
  "czech republic": "CZE",
};

function normalise(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const TEAM_ID_SET = new Set(TEAMS.map((t) => t.id));
const TEAM_BY_NORMALISED_NAME = Object.fromEntries(
  TEAMS.map((t) => [normalise(t.name), t.id]),
);

function resolveTeamId(team?: FeedTeam): string | null {
  if (!team) return null;
  const tla = team.tla?.toUpperCase();
  if (tla && TEAM_ID_SET.has(tla)) return tla;
  if (team.name) {
    const norm = normalise(team.name);
    return NAME_ALIASES[norm] ?? TEAM_BY_NORMALISED_NAME[norm] ?? null;
  }
  return null;
}

// group-stage pairings are unique, so an unordered pair identifies the fixture
const FIXTURE_BY_PAIR = Object.fromEntries(
  FIXTURES.map((f) => [[f.home, f.away].sort().join("|"), f]),
);

function feedConfigured(): boolean {
  return Boolean(process.env.FOOTBALL_DATA_API_KEY || process.env.RESULTS_FEED_URL);
}

/** Fetch the feed once and record every finished, not-yet-recorded match. */
export async function syncResults(): Promise<SyncSummary> {
  if (!feedConfigured()) {
    return {
      ok: false,
      configured: false,
      recorded: [],
      unmatched: [],
      error:
        "No results feed configured — set FOOTBALL_DATA_API_KEY (free at football-data.org) or RESULTS_FEED_URL.",
    };
  }

  const url = process.env.RESULTS_FEED_URL ?? DEFAULT_FEED_URL;
  const headers: Record<string, string> = {};
  if (process.env.FOOTBALL_DATA_API_KEY) {
    headers["X-Auth-Token"] = process.env.FOOTBALL_DATA_API_KEY;
  }

  let matches: FeedMatch[];
  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) {
      return { ok: false, configured: true, recorded: [], unmatched: [], error: `Feed responded ${res.status}` };
    }
    const data = await res.json();
    matches = Array.isArray(data?.matches) ? data.matches : [];
  } catch (e) {
    return {
      ok: false,
      configured: true,
      recorded: [],
      unmatched: [],
      error: e instanceof Error ? e.message : "Feed request failed",
    };
  }

  const state = await loadState();
  const recorded: string[] = [];
  const unmatched: string[] = [];

  for (const m of matches) {
    if (m.status !== "FINISHED") continue;
    if (m.stage && m.stage !== "GROUP_STAGE") continue; // knockouts can repeat pairings

    const home = resolveTeamId(m.homeTeam);
    const away = resolveTeamId(m.awayTeam);
    const ft = m.score?.fullTime;
    if (!home || !away || !Number.isInteger(ft?.home) || !Number.isInteger(ft?.away)) {
      unmatched.push(`${m.homeTeam?.name ?? "?"} v ${m.awayTeam?.name ?? "?"}`);
      continue;
    }

    const fixture = FIXTURE_BY_PAIR[[home, away].sort().join("|")];
    if (!fixture) {
      unmatched.push(`${home} v ${away}`);
      continue;
    }
    if (state.results[fixture.id]) continue;
    // guard against a same-pair rematch when the feed omits the stage
    if (m.utcDate && Math.abs(Date.parse(m.utcDate) - Date.parse(fixture.kickoff)) > 3 * 86_400_000) {
      unmatched.push(`${home} v ${away} (${m.utcDate})`);
      continue;
    }

    const [hg, ag] =
      fixture.home === home ? [ft!.home!, ft!.away!] : [ft!.away!, ft!.home!];
    const updated = await recordResult(fixture.id, hg, ag);
    state.results = updated.results;
    recorded.push(fixture.id);
  }

  return { ok: true, configured: true, recorded, unmatched };
}

declare global {
  // per-instance throttle so page reads don't hammer the feed
  var __wc26LastSyncAttempt: number | undefined;
}

/**
 * Cheap lazy trigger, called on prediction reads: hits the feed only when a
 * configured feed exists, a fixture should have finished but has no result,
 * and the last attempt was more than SYNC_INTERVAL_MS ago. Never throws —
 * pages keep serving on feed outages.
 */
export async function maybeSyncResults(): Promise<void> {
  if (!feedConfigured()) return;
  const now = Date.now();
  if (
    globalThis.__wc26LastSyncAttempt &&
    now - globalThis.__wc26LastSyncAttempt < SYNC_INTERVAL_MS
  ) {
    return;
  }
  globalThis.__wc26LastSyncAttempt = now;

  try {
    const state = await loadState();
    const due = FIXTURES.some(
      (f) => !state.results[f.id] && now - Date.parse(f.kickoff) > MATCH_DURATION_MS,
    );
    if (due) await syncResults();
  } catch {
    // feed problems must never take down the site
  }
}
