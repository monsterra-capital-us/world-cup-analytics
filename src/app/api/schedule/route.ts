import { NextResponse } from "next/server";
import { FIXTURES } from "@/data/fixtures";
import { resolveTeamId } from "@/lib/sync";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * GET /api/schedule
 *
 * Diagnostics: the results feed's full match list (real kickoff times,
 * pairings, venues) compared against this app's fixture calendar. Used to
 * keep src/data/fixtures.ts honest against the official schedule.
 * ?match=<feed id> proxies a single match's detail (for inspecting what
 * the feed exposes, e.g. lineups).
 */
export async function GET(req: Request) {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) {
    return NextResponse.json(
      { ok: false, error: "FOOTBALL_DATA_API_KEY not set" },
      { status: 503 },
    );
  }

  // temporary diagnostics for the API-Football key (whitelisted paths only)
  const url = new URL(req.url);
  const af = url.searchParams.get("af");
  if (af) {
    const afKey = process.env.API_FOOTBALL_KEY;
    if (!afKey) {
      return NextResponse.json({ ok: false, error: "API_FOOTBALL_KEY not set" }, { status: 503 });
    }
    const paths: Record<string, string> = {
      status: "/status",
      fixtures: "/fixtures?league=1&season=2026",
      injuries: "/injuries?league=1&season=2026",
      lineups: `/fixtures/lineups?fixture=${encodeURIComponent(url.searchParams.get("fixture") ?? "")}`,
    };
    const path = paths[af];
    if (!path) return NextResponse.json({ ok: false, error: "unknown probe" }, { status: 400 });
    const r = await fetch(`https://v3.football.api-sports.io${path}`, {
      headers: { "x-apisports-key": afKey },
      cache: "no-store",
    });
    const body = await r.json();
    if (Array.isArray(body?.response) && body.response.length > 3) {
      body.response = body.response.slice(0, 3);
      body.truncated = true;
    }
    return NextResponse.json({ ok: r.ok, status: r.status, body });
  }

  const matchId = url.searchParams.get("match");
  if (matchId) {
    const res = await fetch(`https://api.football-data.org/v4/matches/${encodeURIComponent(matchId)}`, {
      headers: { "X-Auth-Token": key },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `Feed responded ${res.status}` }, { status: 502 });
    }
    return NextResponse.json({ ok: true, match: await res.json() });
  }

  const res = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
    headers: { "X-Auth-Token": key },
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: `Feed responded ${res.status}` }, { status: 502 });
  }
  const data = await res.json();
  const matches = (data?.matches ?? []).map((m: any) => ({
    id: m.id,
    utcDate: m.utcDate,
    stage: m.stage,
    group: m.group ?? null,
    home: resolveTeamId(m.homeTeam) ?? m.homeTeam?.tla ?? null,
    away: resolveTeamId(m.awayTeam) ?? m.awayTeam?.tla ?? null,
    status: m.status,
    venue: m.venue ?? null,
    score:
      m.score?.fullTime?.home != null
        ? `${m.score.fullTime.home}-${m.score.fullTime.away}`
        : null,
  }));

  // flag local fixtures whose kickoff disagrees with the feed
  const feedByPair = new Map<string, any>();
  for (const m of matches) {
    if (m.home && m.away) feedByPair.set([m.home, m.away].sort().join("|"), m);
  }
  const mismatches: Record<string, unknown>[] = [];
  for (const f of FIXTURES) {
    const feed = feedByPair.get([f.home, f.away].sort().join("|"));
    if (!feed) {
      mismatches.push({ fixture: f.id, pair: `${f.home} v ${f.away}`, issue: "not in feed" });
    } else if (feed.utcDate !== f.kickoff) {
      mismatches.push({ fixture: f.id, pair: `${f.home} v ${f.away}`, local: f.kickoff, feed: feed.utcDate });
    }
  }

  return NextResponse.json({ ok: true, count: matches.length, mismatches, matches });
}
