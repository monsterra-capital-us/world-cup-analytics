import { NextResponse } from "next/server";
import { syncInjuries, syncOdds, syncResults } from "@/lib/sync";

export const dynamic = "force-dynamic";

/**
 * GET/POST /api/sync
 *
 * Reconciles all feeds and reports what happened:
 * - results: feed queried only when a fixture should have ended without a
 *   recorded result
 * - injuries: feed queried at most hourly (persisted throttle)
 * - odds: Pinnacle lines queried at most every 6 hours (persisted throttle)
 *
 * Safe to poll continuously (the scheduled job hits it every 10 minutes);
 * add ?force=1 to query all feeds unconditionally.
 */
export async function GET(req: Request) {
  const force = new URL(req.url).searchParams.get("force") === "1";
  // sequential on purpose — each feed reads and writes the same state row
  const results = await syncResults({ force });
  const injuries = await syncInjuries({ force });
  const odds = await syncOdds({ force });
  const ok =
    (results.ok || !results.configured) &&
    (injuries.ok || !injuries.configured) &&
    (odds.ok || !odds.configured);
  return NextResponse.json({ ok, results, injuries, odds }, { status: ok ? 200 : 503 });
}

export const POST = GET;
