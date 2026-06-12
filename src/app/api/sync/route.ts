import { NextResponse } from "next/server";
import { syncInjuries, syncResults } from "@/lib/sync";

export const dynamic = "force-dynamic";

/**
 * GET/POST /api/sync
 *
 * Reconciles both feeds and reports what happened:
 * - results: feed queried only when a fixture should have ended without a
 *   recorded result
 * - injuries: feed queried at most hourly (persisted throttle)
 *
 * Safe to poll continuously (the scheduled job hits it every 10 minutes);
 * add ?force=1 to query both feeds unconditionally.
 */
export async function GET(req: Request) {
  const force = new URL(req.url).searchParams.get("force") === "1";
  const [results, injuries] = [await syncResults({ force }), await syncInjuries({ force })];
  const ok = (results.ok || !results.configured) && (injuries.ok || !injuries.configured);
  return NextResponse.json({ ok, results, injuries }, { status: ok ? 200 : 503 });
}

export const POST = GET;
