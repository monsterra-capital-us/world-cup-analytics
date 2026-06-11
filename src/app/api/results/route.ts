import { NextResponse } from "next/server";
import { recordResult } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/results
 * Body: { fixtureId: string, homeGoals: number, awayGoals: number }
 *
 * Records a finished match. Elo ratings update immediately and all
 * tournament predictions are recomputed on the next read — this is the
 * hook to call from any feed/webhook whenever a World Cup match ends.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const state = recordResult(body.fixtureId, body.homeGoals, body.awayGoals);
    return NextResponse.json({ ok: true, version: state.version });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Invalid request" },
      { status: 400 },
    );
  }
}
