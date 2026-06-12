import { NextResponse } from "next/server";
import { FIXTURES } from "@/data/fixtures";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * GET /api/schedule
 *
 * Diagnostics: the results feed's full match list (real kickoff times,
 * pairings, venues) compared against this app's fixture calendar. Used to
 * keep src/data/fixtures.ts honest against the official schedule.
 */
export async function GET() {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) {
    return NextResponse.json(
      { ok: false, error: "FOOTBALL_DATA_API_KEY not set" },
      { status: 503 },
    );
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
    home: m.homeTeam?.tla ?? m.homeTeam?.name ?? null,
    away: m.awayTeam?.tla ?? m.awayTeam?.name ?? null,
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
