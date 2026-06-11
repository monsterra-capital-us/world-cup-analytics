import { loadState } from "@/lib/store";
import { evaluate, AggregateScore } from "@/lib/model/evaluate";
import { FIXTURE_BY_ID } from "@/data/fixtures";
import { pct } from "@/lib/format";
import { Card, SectionTitle, TeamChip } from "@/components/ui";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, string> = {
  model: "Model (Elo + Poisson)",
  market: "Market (de-vigged odds)",
  blend: "Blend (published)",
};

export default async function ModelPage() {
  const state = await loadState();
  const { rows, overall, marketSubset } = evaluate(Object.values(state.results));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold">Model performance</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Every forecast is frozen the moment a result is recorded, then scored
          out-of-sample. Brier, log loss and RPS are all{" "}
          <span className="text-foreground">lower-is-better</span>. The market
          rows benchmark against sportsbook odds (enter them per fixture in the
          Data Manager — sharp closing lines like Pinnacle&apos;s are the
          toughest public baseline; matching them is the realistic target, and
          the published blend is designed to be at least as sharp as either
          input alone.
        </p>
      </header>

      {rows.length === 0 ? (
        <Card className="px-6 py-8 text-sm text-muted">
          No completed matches yet. Once results are recorded, forecast accuracy
          appears here automatically — and if you enter sportsbook odds before
          matches, you get a direct model-vs-market scoreboard.
        </Card>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <ScoreCard
              title="All completed matches"
              hint={`${rows.length} matches with stored forecasts`}
              scores={overall}
            />
            <ScoreCard
              title="Matches with market odds"
              hint={
                marketSubset.length
                  ? "Apples-to-apples: every source scored on the same matches"
                  : "Enter pre-match odds in the Data Manager to unlock this comparison"
              }
              scores={marketSubset}
            />
          </div>

          <Card>
            <SectionTitle
              title="Match-by-match"
              hint="Probability each source gave to the outcome that actually happened (higher = better call)"
            />
            <div className="overflow-x-auto px-5 pb-5">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted">
                    <th className="pb-2 font-medium">Match</th>
                    <th className="pb-2 text-center font-medium">Score</th>
                    <th className="pb-2 text-right font-medium">Model</th>
                    <th className="pb-2 text-right font-medium">Market</th>
                    <th className="pb-2 text-right font-medium">Blend</th>
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .slice()
                    .reverse()
                    .map((row) => {
                      const f = FIXTURE_BY_ID[row.fixtureId];
                      const probFor = (p?: {
                        pHome: number;
                        pDraw: number;
                        pAway: number;
                      }) =>
                        p
                          ? row.outcome === "home"
                            ? p.pHome
                            : row.outcome === "draw"
                              ? p.pDraw
                              : p.pAway
                          : undefined;
                      return (
                        <tr key={row.fixtureId} className="border-t border-edge/60">
                          <td className="py-2">
                            <span className="flex items-center gap-2">
                              <TeamChip teamId={f.home} short />
                              <span className="text-muted">v</span>
                              <TeamChip teamId={f.away} short />
                            </span>
                          </td>
                          <td className="py-2 text-center font-semibold tabular-nums">
                            {row.homeGoals}–{row.awayGoals}
                          </td>
                          <ProbCell p={probFor(row.forecast.model)} />
                          <ProbCell p={probFor(row.forecast.market)} />
                          <ProbCell p={probFor(row.forecast.blend)} />
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function ScoreCard({
  title,
  hint,
  scores,
}: {
  title: string;
  hint: string;
  scores: AggregateScore[];
}) {
  const best = (metric: "brier" | "logLoss" | "rps") =>
    scores.length ? Math.min(...scores.map((s) => s[metric])) : 0;
  return (
    <Card>
      <SectionTitle title={title} hint={hint} />
      <div className="overflow-x-auto px-5 pb-5">
        {scores.length === 0 ? (
          <p className="py-2 text-sm text-muted">No data yet.</p>
        ) : (
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-right text-xs uppercase tracking-wider text-muted">
                <th className="pb-2 text-left font-medium">Source</th>
                <th className="pb-2 font-medium">N</th>
                <th className="pb-2 font-medium">Brier</th>
                <th className="pb-2 font-medium">Log loss</th>
                <th className="pb-2 font-medium">RPS</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s) => (
                <tr key={s.source} className="border-t border-edge/60">
                  <td className="py-2">{SOURCE_LABEL[s.source]}</td>
                  <td className="py-2 text-right tabular-nums text-muted">{s.n}</td>
                  {(["brier", "logLoss", "rps"] as const).map((m) => (
                    <td
                      key={m}
                      className={`py-2 text-right tabular-nums ${
                        s[m] === best(m) ? "font-semibold text-accent" : ""
                      }`}
                    >
                      {s[m].toFixed(4)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}

function ProbCell({ p }: { p?: number }) {
  if (p === undefined)
    return <td className="py-2 text-right text-muted">—</td>;
  return (
    <td className="py-2 text-right tabular-nums">
      <span
        className="inline-block min-w-14 rounded px-1.5 py-0.5"
        style={{ backgroundColor: `rgba(16, 185, 129, ${p * 0.4})` }}
      >
        {pct(p)}
      </span>
    </td>
  );
}
