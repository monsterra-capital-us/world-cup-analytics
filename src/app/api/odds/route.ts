import { NextResponse } from "next/server";
import { removeMarketOdds, setMarketOdds } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/odds
 * Body: { fixtureId, home, draw, away, source? } — decimal odds, e.g. from
 * Pinnacle. The vig is stripped and the probabilities are blended into all
 * predictions. Re-posting for the same fixture overwrites (use closing lines).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const state = await setMarketOdds(body);
    return NextResponse.json({ ok: true, version: state.version });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Invalid request" },
      { status: 400 },
    );
  }
}

/** DELETE /api/odds?fixtureId=… */
export async function DELETE(req: Request) {
  try {
    const fixtureId = new URL(req.url).searchParams.get("fixtureId");
    if (!fixtureId) throw new Error("fixtureId query param required");
    const state = await removeMarketOdds(fixtureId);
    return NextResponse.json({ ok: true, version: state.version });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Invalid request" },
      { status: 400 },
    );
  }
}
