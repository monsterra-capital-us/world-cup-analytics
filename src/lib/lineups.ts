import { Fixture } from "./types";
import { TEAM_BY_ID } from "@/data/teams";

/**
 * Match lineups via API-Football (v3.football.api-sports.io), reusing the
 * API_FOOTBALL_KEY that also powers the injuries feed. Without the key (or
 * before a lineup is published — typically ~40 minutes pre-kickoff) the
 * match page shows the reason instead.
 *
 * The provider's fixture ids differ from ours, so its World Cup fixture
 * list is fetched (cached an hour) and matched by team names.
 */

const BASE = "https://v3.football.api-sports.io";
const LEAGUE = "1"; // FIFA World Cup
const SEASON = "2026";

export interface LineupPlayer {
  name: string;
  number?: string;
  position?: string;
}

export interface TeamLineup {
  teamName: string;
  formation?: string;
  coach?: string;
  starting: LineupPlayer[];
  bench: LineupPlayer[];
}

export interface LineupsResult {
  available: boolean;
  configured: boolean;
  reason?: string;
  home?: TeamLineup;
  away?: TeamLineup;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

function normalise(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// API-Football team names that differ from ours
const NAME_ALIASES: Record<string, string> = {
  "south korea": "korea republic",
  "ivory coast": "cote divoire",
  czechia: "czech republic",
  turkiye: "turkey",
  "dr congo": "congo dr",
};

function feedNameFor(teamId: string): string[] {
  const ours = normalise(TEAM_BY_ID[teamId].name);
  return [ours, NAME_ALIASES[ours] ?? ours];
}

async function feedJson(path: string, revalidateSeconds: number): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
    next: { revalidate: revalidateSeconds },
  });
  if (!res.ok) throw new Error(`Lineups feed responded ${res.status}`);
  const data = await res.json();
  if (data?.errors && !Array.isArray(data.errors) && Object.keys(data.errors).length > 0) {
    throw new Error(`Lineups feed error: ${JSON.stringify(data.errors)}`);
  }
  return data;
}

/** find the provider's fixture id for one of our fixtures, by team names */
async function findProviderFixtureId(fixture: Fixture): Promise<number | null> {
  const data = await feedJson(`/fixtures?league=${LEAGUE}&season=${SEASON}`, 3600);
  const wantHome = feedNameFor(fixture.home);
  const wantAway = feedNameFor(fixture.away);
  for (const e of data?.response ?? []) {
    const names = [e?.teams?.home?.name, e?.teams?.away?.name]
      .filter((n): n is string => Boolean(n))
      .map(normalise);
    if (
      names.length === 2 &&
      wantHome.some((w) => names.includes(w)) &&
      wantAway.some((w) => names.includes(w))
    ) {
      const id = e?.fixture?.id;
      if (id != null) return Number(id);
    }
  }
  return null;
}

function parsePlayer(p: any): LineupPlayer | null {
  const inner = p?.player ?? p;
  if (!inner?.name) return null;
  return {
    name: String(inner.name),
    number: inner.number != null ? String(inner.number) : undefined,
    position: inner.pos ?? inner.position ?? undefined,
  };
}

function parseTeamLineup(t: any, fallbackName: string): TeamLineup {
  const players = (arr: any) =>
    (Array.isArray(arr) ? arr : [])
      .map(parsePlayer)
      .filter((p): p is LineupPlayer => p !== null);
  return {
    teamName: t?.team?.name ?? fallbackName,
    formation: t?.formation ?? undefined,
    coach: t?.coach?.name ?? undefined,
    starting: players(t?.startXI),
    bench: players(t?.substitutes),
  };
}

export async function getLineups(fixture: Fixture): Promise<LineupsResult> {
  if (!process.env.API_FOOTBALL_KEY) {
    return {
      available: false,
      configured: false,
      reason: "Set API_FOOTBALL_KEY (api-sports.io) to enable lineups.",
    };
  }

  try {
    const fixtureId = await findProviderFixtureId(fixture);
    if (!fixtureId) {
      return { available: false, configured: true, reason: "Match not found in the lineups feed." };
    }

    const data = await feedJson(`/fixtures/lineups?fixture=${fixtureId}`, 300);
    const sides: any[] = data?.response ?? [];
    if (sides.length === 0) {
      return {
        available: false,
        configured: true,
        reason: "Lineups not published yet — they typically appear shortly before kickoff.",
      };
    }

    // order the two entries to our home/away by team name
    const wantHome = feedNameFor(fixture.home);
    const homeRaw =
      sides.find((s) => wantHome.includes(normalise(s?.team?.name ?? ""))) ?? sides[0];
    const awayRaw = sides.find((s) => s !== homeRaw) ?? sides[1] ?? sides[0];

    return {
      available: true,
      configured: true,
      home: parseTeamLineup(homeRaw, TEAM_BY_ID[fixture.home].name),
      away: parseTeamLineup(awayRaw, TEAM_BY_ID[fixture.away].name),
    };
  } catch (e) {
    return {
      available: false,
      configured: true,
      reason: e instanceof Error ? e.message : "Lineups feed request failed",
    };
  }
}
