import { NextResponse } from "next/server";
import { loadState } from "@/lib/store";
import { TEAMS } from "@/data/teams";
import { FIXTURES } from "@/data/fixtures";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ state: await loadState(), teams: TEAMS, fixtures: FIXTURES });
}
