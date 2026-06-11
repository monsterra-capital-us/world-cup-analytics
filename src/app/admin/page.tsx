import { loadState } from "@/lib/store";
import { FIXTURES } from "@/data/fixtures";
import { TEAMS } from "@/data/teams";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const state = await loadState();
  return (
    <AdminClient
      teams={TEAMS.map((t) => ({
        id: t.id,
        name: t.name,
        flag: t.flag,
        keyPlayers: t.keyPlayers.map((p) => p.name),
      }))}
      fixtures={FIXTURES.map((f) => ({
        id: f.id,
        group: f.group,
        home: f.home,
        away: f.away,
        kickoff: f.kickoff,
        played: Boolean(state.results[f.id]),
      }))}
      injuries={state.injuries}
      marketOdds={state.marketOdds}
      version={state.version}
    />
  );
}
