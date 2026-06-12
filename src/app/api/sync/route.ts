import { NextResponse } from "next/server";
import { syncResults } from "@/lib/sync";

export const dynamic = "force-dynamic";

/**
 * GET/POST /api/sync
 *
 * Records any finished matches missing from the state. The feed is only
 * queried when a fixture should have ended without a result, so this is
 * safe to poll continuously (the Vercel cron hits it every 10 minutes);
 * add ?force=1 to query the feed unconditionally.
 */
export async function GET(req: Request) {
  const force = new URL(req.url).searchParams.get("force") === "1";
  const summary = await syncResults({ force });
  return NextResponse.json(summary, { status: summary.ok ? 200 : 503 });
}

export const POST = GET;
