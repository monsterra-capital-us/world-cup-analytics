import { getPredictions, loadState } from "@/lib/store";
import { FIXTURES } from "@/data/fixtures";
import { dayLabel, pct } from "@/lib/format";
import { LocalTime } from "@/components/LocalTime";
import { Card, MatchLink, TeamChip, WdlBar } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const predictions = await getPredictions();
  const state = await loadState();

  const byDay = new Map<string, typeof FIXTURES>();
  for (const f of FIXTURES) {
    const day = f.kickoff.slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(f);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold">Group-stage fixtures</h1>
        <p className="mt-1 text-sm text-muted">
          All 72 matches, 11–27 June 2026. Played matches show the final score;
          upcoming matches show live model probabilities. Click any match for the
          full score-probability breakdown.
        </p>
      </header>

      {[...byDay.entries()].map(([day, fixtures]) => (
        <Card key={day}>
          <h2 className="px-5 pt-4 pb-2 text-sm font-semibold text-muted">
            {dayLabel(fixtures[0].kickoff)}
          </h2>
          <div className="grid gap-1 px-3 pb-4 lg:grid-cols-2">
            {fixtures.map((f) => {
              const result = state.results[f.id];
              const mp = predictions.matchPredictions[f.id];
              return (
                <MatchLink key={f.id} fixtureId={f.id}>
                  <div className="px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                          {f.group}
                        </span>
                        <TeamChip teamId={f.home} />
                        {result ? (
                          <span className="rounded-lg bg-surface-2 px-2 py-0.5 font-bold tabular-nums">
                            {result.homeGoals}–{result.awayGoals}
                          </span>
                        ) : (
                          <span className="text-muted">vs</span>
                        )}
                        <TeamChip teamId={f.away} />
                      </span>
                      <span className="shrink-0 text-xs text-muted tabular-nums">
                        {result ? "FT" : <LocalTime iso={f.kickoff} />}
                      </span>
                    </div>
                    {!result && (
                      <div className="mt-2 flex items-center gap-4">
                        <WdlBar
                          pHome={mp.pHome}
                          pDraw={mp.pDraw}
                          pAway={mp.pAway}
                          className="flex-1"
                        />
                        <span className="shrink-0 text-xs tabular-nums text-muted">
                          {mp.topScores[0].home}–{mp.topScores[0].away} (
                          {pct(mp.topScores[0].p)})
                        </span>
                      </div>
                    )}
                  </div>
                </MatchLink>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
