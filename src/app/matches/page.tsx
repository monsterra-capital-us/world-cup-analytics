import { getPredictions, loadState } from "@/lib/store";
import { FIXTURES } from "@/data/fixtures";
import { MatchSchedule, MatchRow } from "./MatchSchedule";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const predictions = await getPredictions();
  const state = await loadState();

  const rows: MatchRow[] = [...FIXTURES]
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
    .map((f) => {
      const result = state.results[f.id];
      const mp = predictions.matchPredictions[f.id];
      const top = mp.topScores[0];
      return {
        id: f.id,
        group: f.group,
        home: f.home,
        away: f.away,
        kickoff: f.kickoff,
        result: result ? { h: result.homeGoals, a: result.awayGoals } : null,
        pHome: mp.pHome,
        pDraw: mp.pDraw,
        pAway: mp.pAway,
        topH: top.home,
        topA: top.away,
        topP: top.p,
      };
    });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold">Group-stage fixtures</h1>
        <p className="mt-1 text-sm text-muted">
          All 72 matches, grouped by day in your local time. Played matches show
          the final score; upcoming matches show live model probabilities. Click
          any match for the full score-probability breakdown.
        </p>
      </header>

      <MatchSchedule rows={rows} />
    </div>
  );
}
