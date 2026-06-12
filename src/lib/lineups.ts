import { Fixture } from "./types";
import { TEAM_BY_ID } from "@/data/teams";

/**
 * Match lineups via the WorldCupAPI (api.worldcupapi.com — see the Postman
 * collection: /fixtures and /lineups?match_id=…). Enabled by setting
 * WORLDCUP_API_KEY; without it (or when the provider has no data yet) pages
 * simply omit the lineups card.
 *
 * The provider's match ids differ from our fixture ids, so the provider's
 * fixture list is fetched (cached an hour) and matched by team names.
 * Parsing is deliberately tolerant — field names vary across providers.
 */

const BASE = process.env.WORLDCUP_API_BASE ?? "https://api.worldcupapi.com";

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

/** pull a team name out of whatever shape the feed uses */
function teamName(v: any): string | null {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") return v.name ?? v.team_name ?? v.title ?? null;
  return null;
}

function asArray(data: any, ...keys: string[]): any[] {
  if (Array.isArray(data)) return data;
  for (const k of keys) if (Array.isArray(data?.[k])) return data[k];
  return [];
}

function parsePlayer(p: any): LineupPlayer | null {
  if (typeof p === "string") return { name: p };
  const name = p?.name ?? p?.player_name ?? p?.player?.name;
  if (!name) return null;
  return {
    name: String(name),
    number: p?.number != null ? String(p.number) : p?.shirt_number != null ? String(p.shirt_number) : undefined,
    position: p?.position ?? p?.pos ?? undefined,
  };
}

function parseTeamLineup(t: any, fallbackName: string): TeamLineup {
  const starting = asArray(t?.startXI ?? t?.starting_xi ?? t?.starting ?? t?.lineup ?? t?.players)
    .map(parsePlayer)
    .filter((p): p is LineupPlayer => p !== null);
  const bench = asArray(t?.substitutes ?? t?.bench ?? t?.subs)
    .map(parsePlayer)
    .filter((p): p is LineupPlayer => p !== null);
  return {
    teamName: teamName(t?.team) ?? teamName(t) ?? fallbackName,
    formation: t?.formation ?? undefined,
    coach: typeof t?.coach === "string" ? t.coach : t?.coach?.name ?? undefined,
    starting,
    bench,
  };
}

async function feedJson(path: string, revalidateSeconds: number): Promise<any> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE}${path}${sep}key=${process.env.WORLDCUP_API_KEY}`, {
    next: { revalidate: revalidateSeconds },
  });
  if (!res.ok) throw new Error(`Lineups feed responded ${res.status}`);
  return res.json();
}

/** find the provider's match id for one of our fixtures, by team names */
async function findProviderMatchId(fixture: Fixture): Promise<string | null> {
  const data = await feedJson("/fixtures", 3600);
  const entries = asArray(data, "fixtures", "data", "matches", "result");
  const want = [
    normalise(TEAM_BY_ID[fixture.home].name),
    normalise(TEAM_BY_ID[fixture.away].name),
  ];
  for (const e of entries) {
    const names = [
      teamName(e?.home_team ?? e?.homeTeam ?? e?.home ?? e?.team1),
      teamName(e?.away_team ?? e?.awayTeam ?? e?.away ?? e?.team2),
    ]
      .filter((n): n is string => Boolean(n))
      .map(normalise);
    if (want.every((w) => names.includes(w))) {
      const id = e?.match_id ?? e?.id ?? e?.fixture_id;
      if (id != null) return String(id);
    }
  }
  return null;
}

export async function getLineups(fixture: Fixture): Promise<LineupsResult> {
  if (!process.env.WORLDCUP_API_KEY) {
    return {
      available: false,
      configured: false,
      reason: "Set WORLDCUP_API_KEY (api.worldcupapi.com) to enable lineups.",
    };
  }

  try {
    const matchId = await findProviderMatchId(fixture);
    if (!matchId) {
      return { available: false, configured: true, reason: "Match not found in the lineups feed." };
    }

    const data = await feedJson(`/lineups?match_id=${encodeURIComponent(matchId)}`, 300);
    const root = data?.lineups ?? data?.data ?? data;
    const homeRaw = root?.home ?? root?.home_team ?? root?.homeTeam ?? asArray(root)[0];
    const awayRaw = root?.away ?? root?.away_team ?? root?.awayTeam ?? asArray(root)[1];

    const home = parseTeamLineup(homeRaw, TEAM_BY_ID[fixture.home].name);
    const away = parseTeamLineup(awayRaw, TEAM_BY_ID[fixture.away].name);
    if (home.starting.length === 0 && away.starting.length === 0) {
      return {
        available: false,
        configured: true,
        reason: "Lineups not published yet for this match.",
      };
    }
    return { available: true, configured: true, home, away };
  } catch (e) {
    return {
      available: false,
      configured: true,
      reason: e instanceof Error ? e.message : "Lineups feed request failed",
    };
  }
}
