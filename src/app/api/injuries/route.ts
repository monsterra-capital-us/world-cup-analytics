import { NextResponse } from "next/server";
import { addInjury, removeInjury } from "@/lib/store";

export const dynamic = "force-dynamic";

/** POST /api/injuries — body: { teamId, player, status: "out"|"doubtful"|"returning", detail? } */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const state = addInjury(body);
    return NextResponse.json({ ok: true, version: state.version });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Invalid request" },
      { status: 400 },
    );
  }
}

/** DELETE /api/injuries?id=… */
export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) throw new Error("id query param required");
    const state = removeInjury(id);
    return NextResponse.json({ ok: true, version: state.version });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Invalid request" },
      { status: 400 },
    );
  }
}
