import { FIXTURES } from "@/data/fixtures";
import { TEAMS } from "@/data/teams";
import { Injury, TournamentState } from "./types";
import {
  loadState,
  recordResult,
  replaceFeedInjuries,
  setMarketOddsBatch,
} from "./store";
import { getStorage } from "./storage";

/**
 * Persist a feed-attempt timestamp BEFORE querying, so a feed that errors
 * persistently can't be hammered by the 10-minute poller into burning the
 * provider's quota.
 */
async function recordSyncAttempt(
  state: TournamentState,
  field: "lastInjurySyncAt" | "lastOddsSyncAt",
): Promise<void> {
  state[field] = new Date().toISOString();
  await getStorage().save(state);
}

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
  /** why the feed wasn't queried, when it wasn't */
  skipped?: string;
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

// feed TLAs that differ from FIFA trigrams (football-data quirks)
const TLA_ALIASES: Record<string, string> = {
  CUR: "CUW", // Curaçao
  URY: "URU", // Uruguay
};

export function resolveTeamId(team?: FeedTeam): string | null {
  if (!team) return null;
  const tla = team.tla?.toUpperCase();
  if (tla) {
    const mapped = TLA_ALIASES[tla] ?? tla;
    if (TEAM_ID_SET.has(mapped)) return mapped;
  }
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

/**
 * Record every finished, not-yet-recorded match. The feed is only queried
 * when a fixture should have ended but has no result — so the system can be
 * polled around the clock and still only does work when a match is done.
 * Pass force to query the feed unconditionally.
 */
export async function syncResults(opts: { force?: boolean } = {}): Promise<SyncSummary> {
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

  const state = await loadState();
  if (!opts.force) {
    const now = Date.now();
    const due = FIXTURES.some(
      (f) => !state.results[f.id] && now - Date.parse(f.kickoff) > MATCH_DURATION_MS,
    );
    if (!due) {
      return {
        ok: true,
        configured: true,
        recorded: [],
        unmatched: [],
        skipped: "no finished fixture awaiting a result — feed not queried",
      };
    }
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

// ───────────────────────── injuries feed ─────────────────────────

/**
 * Squad-availability ingestion. Default provider is API-Football
 * (api-sports.io; their free tier covers the injuries endpoint), or any
 * custom endpoint via INJURIES_FEED_URL. Feed entries replace previous
 * feed-sourced flags wholesale — a player no longer listed is fit again —
 * while manually POSTed flags are never touched.
 *
 * Polling is throttled via state.lastInjurySyncAt (persisted, so serverless
 * cold starts don't burn through free-tier quotas).
 */
const DEFAULT_INJURIES_URL =
  "https://v3.football.api-sports.io/injuries?league=1&season=2026";
const INJURY_SYNC_INTERVAL_MS = 60 * 60_000; // hourly ≈ 24 calls/day

export interface InjurySyncSummary {
  ok: boolean;
  configured: boolean;
  /** whether the active flag set changed (and the model re-simulates) */
  changed: boolean;
  active: number;
  skipped?: string;
  error?: string;
}

function injuriesConfigured(): boolean {
  return Boolean(process.env.API_FOOTBALL_KEY || process.env.INJURIES_FEED_URL);
}

function slug(s: string): string {
  return normalise(s).replace(/ /g, "-");
}

function mapStatus(raw: string): Injury["status"] {
  if (/return/i.test(raw)) return "returning";
  if (/quest|doubt/i.test(raw)) return "doubtful";
  return "out"; // e.g. API-Football "Missing Fixture"
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function parseInjuryItem(item: any): Injury | null {
  const teamRef =
    typeof item?.team === "string" ? { name: item.team } : item?.team ?? { name: item?.teamId };
  const teamId = resolveTeamId({
    tla: typeof item?.teamId === "string" ? item.teamId : teamRef?.tla,
    name: teamRef?.name,
  });
  const player: string | undefined =
    typeof item?.player === "string" ? item.player : item?.player?.name;
  if (!teamId || !player) return null;

  const rawStatus: string =
    item?.player?.type ?? item?.type ?? item?.status ?? "out";
  const detail: string | undefined =
    item?.player?.reason ?? item?.reason ?? item?.detail ?? undefined;

  return {
    id: `feed-${teamId}-${slug(player)}`,
    teamId,
    player,
    status: mapStatus(String(rawStatus)),
    detail,
    reportedAt: new Date().toISOString().slice(0, 10),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Fetch the injuries feed and reconcile feed-sourced flags. */
export async function syncInjuries(opts: { force?: boolean } = {}): Promise<InjurySyncSummary> {
  if (!injuriesConfigured()) {
    return {
      ok: false,
      configured: false,
      changed: false,
      active: 0,
      error:
        "No injuries feed configured — set API_FOOTBALL_KEY (api-sports.io) or INJURIES_FEED_URL.",
    };
  }

  const state = await loadState();
  if (!opts.force && state.lastInjurySyncAt) {
    const age = Date.now() - Date.parse(state.lastInjurySyncAt);
    if (age < INJURY_SYNC_INTERVAL_MS) {
      return {
        ok: true,
        configured: true,
        changed: false,
        active: state.injuries.length,
        skipped: `injuries checked ${Math.round(age / 60_000)}m ago — feed not queried`,
      };
    }
  }

  await recordSyncAttempt(state, "lastInjurySyncAt");

  const url = process.env.INJURIES_FEED_URL ?? DEFAULT_INJURIES_URL;
  const headers: Record<string, string> = {};
  if (process.env.API_FOOTBALL_KEY) {
    headers["x-apisports-key"] = process.env.API_FOOTBALL_KEY;
  }

  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) {
      return { ok: false, configured: true, changed: false, active: state.injuries.length, error: `Feed responded ${res.status}` };
    }
    const data = await res.json();
    // API-Football reports auth/plan problems as 200 + an errors object
    if (data?.errors && !Array.isArray(data.errors) && Object.keys(data.errors).length > 0) {
      return {
        ok: false,
        configured: true,
        changed: false,
        active: state.injuries.length,
        error: `Feed error: ${JSON.stringify(data.errors)}`,
      };
    }
    const items: unknown[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.response) // API-Football envelope
        ? data.response
        : Array.isArray(data?.injuries)
          ? data.injuries
          : [];

    // one flag per player — feeds list one entry per missed fixture
    const byId = new Map<string, Injury>();
    for (const item of items) {
      const inj = parseInjuryItem(item);
      if (inj) byId.set(inj.id, inj);
    }
    const feed = [...byId.values()];
    const changed = await replaceFeedInjuries(feed);
    return { ok: true, configured: true, changed, active: feed.length };
  } catch (e) {
    return {
      ok: false,
      configured: true,
      changed: false,
      active: state.injuries.length,
      error: e instanceof Error ? e.message : "Feed request failed",
    };
  }
}

// ───────────────────────── market odds feed ─────────────────────────

/**
 * Pinnacle match odds via The Odds API (the-odds-api.com), enabled by
 * ODDS_API_KEY. De-vigged Pinnacle lines are the sharpest public benchmark;
 * each refreshed line flows into the existing 70/30 market/model blend and
 * the model-vs-market scoreboard. Polled at most every 6 hours (persisted
 * attempt throttle — the free tier is ~500 requests/month) and only while
 * fixtures still await results.
 */
const DEFAULT_ODDS_SPORT = "soccer_fifa_world_cup";
const ODDS_SYNC_INTERVAL_MS = 6 * 60 * 60_000;

export interface OddsSyncSummary {
  ok: boolean;
  configured: boolean;
  /** fixtures whose line was added or moved in this run */
  updated: string[];
  /** feed events that could not be mapped to a fixture */
  unmatched: string[];
  skipped?: string;
  error?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function syncOdds(opts: { force?: boolean } = {}): Promise<OddsSyncSummary> {
  if (!process.env.ODDS_API_KEY) {
    return {
      ok: false,
      configured: false,
      updated: [],
      unmatched: [],
      error: "No odds feed configured — set ODDS_API_KEY (the-odds-api.com).",
    };
  }

  const state = await loadState();
  if (!opts.force && state.lastOddsSyncAt) {
    const age = Date.now() - Date.parse(state.lastOddsSyncAt);
    if (age < ODDS_SYNC_INTERVAL_MS) {
      return {
        ok: true,
        configured: true,
        updated: [],
        unmatched: [],
        skipped: `odds checked ${Math.round(age / 60_000)}m ago — feed not queried`,
      };
    }
  }
  if (FIXTURES.every((f) => state.results[f.id])) {
    return { ok: true, configured: true, updated: [], unmatched: [], skipped: "all fixtures decided" };
  }

  await recordSyncAttempt(state, "lastOddsSyncAt");

  const sport = process.env.ODDS_SPORT_KEY ?? DEFAULT_ODDS_SPORT;
  const base = process.env.ODDS_API_BASE ?? "https://api.the-odds-api.com";
  const url =
    `${base}/v4/sports/${encodeURIComponent(sport)}/odds` +
    `?apiKey=${process.env.ODDS_API_KEY}&markets=h2h&oddsFormat=decimal&bookmakers=pinnacle`;

  let events: any[];
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const body = await res.text();
      return {
        ok: false,
        configured: true,
        updated: [],
        unmatched: [],
        error: `Odds feed responded ${res.status}: ${body.slice(0, 200)}`,
      };
    }
    const data = await res.json();
    events = Array.isArray(data) ? data : [];
  } catch (e) {
    return {
      ok: false,
      configured: true,
      updated: [],
      unmatched: [],
      error: e instanceof Error ? e.message : "Odds feed request failed",
    };
  }

  const entries: { fixtureId: string; home: number; draw: number; away: number; source: string }[] = [];
  const unmatched: string[] = [];

  for (const ev of events) {
    const home = resolveTeamId({ name: ev?.home_team });
    const away = resolveTeamId({ name: ev?.away_team });
    const fixture = home && away ? FIXTURE_BY_PAIR[[home, away].sort().join("|")] : undefined;
    if (!home || !away || !fixture) {
      unmatched.push(`${ev?.home_team ?? "?"} v ${ev?.away_team ?? "?"}`);
      continue;
    }
    if (state.results[fixture.id]) continue;

    const market = (ev?.bookmakers ?? [])
      .find((b: any) => b?.key === "pinnacle")
      ?.markets?.find((m: any) => m?.key === "h2h");
    if (!market?.outcomes) continue;

    let homePrice: number | undefined;
    let drawPrice: number | undefined;
    let awayPrice: number | undefined;
    for (const o of market.outcomes) {
      const price = Number(o?.price);
      if (!Number.isFinite(price)) continue;
      if (/^draw$/i.test(o?.name ?? "")) drawPrice = price;
      else if (resolveTeamId({ name: o?.name }) === fixture.home) homePrice = price;
      else if (resolveTeamId({ name: o?.name }) === fixture.away) awayPrice = price;
    }
    if (homePrice == null || drawPrice == null || awayPrice == null) {
      unmatched.push(`${home} v ${away} (incomplete h2h)`);
      continue;
    }
    entries.push({ fixtureId: fixture.id, home: homePrice, draw: drawPrice, away: awayPrice, source: "Pinnacle" });
  }

  const updated = await setMarketOddsBatch(entries);
  return { ok: true, configured: true, updated, unmatched };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

declare global {
  // per-instance throttle so page reads don't hammer the feed
  var __wc26LastSyncAttempt: number | undefined;
}

/**
 * Cheap lazy trigger, called on prediction reads. syncResults itself only
 * queries the feed when a fixture should have finished but has no result;
 * this adds a per-instance throttle. Never throws — pages keep serving on
 * feed outages.
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
    await syncResults();
  } catch {
    // feed problems must never take down the site
  }
}
