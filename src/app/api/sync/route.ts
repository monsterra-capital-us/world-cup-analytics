import { NextResponse } from "next/server";
import { syncResults } from "@/lib/sync";

export const dynamic = "force-dynamic";

/**
 * GET/POST /api/sync
 *
 * Pulls finished matches from the configured results feed and records any
 * that are missing (see src/lib/sync.ts for configuration). Pages also
 * trigger this lazily, so the cron/manual call is just a backstop.
 */
export async function GET() {
  const summary = await syncResults();
  return NextResponse.json(summary, { status: summary.ok ? 200 : 503 });
}

export const POST = GET;
