import { loadState } from "@/lib/store";
import { maybeSyncResults } from "@/lib/sync";
import {
  evaluate,
  scoreDeviations,
  AggregateScore,
  ScoreDeviationRow,
} from "@/lib/model/evaluate";
import { computeCalibration } from "@/lib/model/calibrate";
import { FIXTURE_BY_ID } from "@/data/fixtures";
import { pct, signed } from "@/lib/format";
import { Card, SectionTitle, TeamChip } from "@/components/ui";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, string> = {
  model: "Model (Elo + Poisson)",
  market: "Market (de-vigged odds)",
  blend: "Blend (published)",
};

export default async function ModelPage() {
  await maybeSyncResults();
  const state = await loadState();
  const results = Object.values(state.results);
  const { rows, overall, marketSubset } = evaluate(results);
  const { rows: devRows, summary } = scoreDeviations(results);
  const calibration = computeCalibration(results);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold">Model performance</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Every forecast is frozen the moment a result is recorded, then scored
          out-of-sample. Brier, log loss and RPS are all{" "}
          <span className="text-foreground">lower-is-better</span>. The market
          rows benchmark against sportsbook odds (POST them per fixture to
          /api/odds — sharp closing lines like Pinnacle&apos;s are the
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
                  : "Pinnacle lines are stored for all upcoming fixtures — this fills in as the first of them finishes"
              }
              scores={marketSubset}
            />
          </div>

          <Card>
            <SectionTitle
              title="Predicted vs actual scores"
              hint="Bar = goals actually scored · tick = pre-match expected goals (frozen at kickoff). Deviations feed the auto-calibration below."
            />
            <div className="grid grid-cols-2 gap-3 px-5 pb-4 sm:grid-cols-3 lg:grid-cols-6">
              <Mini label="Matches" value={String(summary.n)} />
              <Mini
                label="Outcome calls"
                value={`${summary.outcomeHits}/${summary.n}`}
              />
              <Mini
                label="Exact scores"
                value={`${summary.exactHits}/${summary.n}`}
              />
              <Mini
                label="Goals act / pred"
                value={`${summary.actualGoals} / ${summary.predictedGoals.toFixed(1)}`}
              />
              <Mini label="MAE (goals)" value={summary.mae.toFixed(2)} />
              <Mini
                label="Bias"
                value={signed(summary.bias, 2)}
                tone={Math.abs(summary.bias) >= 0.5 ? "bad" : undefined}
              />
            </div>
            <div className="space-y-2 px-5 pb-4">
              {devRows.map((row) => (
                <DeviationBlock key={row.fixtureId} row={row} />
              ))}
            </div>
            <p className="border-t border-edge/60 px-5 py-3 text-xs text-muted">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                Auto-calibration
              </span>{" "}
              — expected goals are currently scaled ×
              <span className="font-semibold text-foreground">
                {calibration.goalScale.toFixed(3)}
              </span>
              , re-fit from these deviations after every recorded match
              (shrunk toward 1.000 by a 10-match prior, capped at ±25%), and
              applied to every forecast and tournament simulation.
            </p>
          </Card>

          <Card>
            <SectionTitle
              title="Match-by-match"
              hint="Probability each source gave to the outcome that actually happened (higher = better call)"
            />
            <div className="overflow-x-auto px-5 pb-5">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-left font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
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
              <tr className="text-right font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
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

function Mini({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "bad";
}) {
  return (
    <div className="rounded-lg bg-surface-2/60 px-3 py-2">
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-bold tabular-nums ${tone === "bad" ? "text-danger" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

const GOAL_BAR_MAX = 5;

function DeviationBlock({ row }: { row: ScoreDeviationRow }) {
  const f = FIXTURE_BY_ID[row.fixtureId];
  return (
    <div className="rounded-xl bg-surface-2/40 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted">
            {f.group}
          </span>
          <TeamChip teamId={f.home} short />
          <span className="rounded-lg bg-surface-2 px-2 py-0.5 font-bold tabular-nums">
            {row.homeGoals}–{row.awayGoals}
          </span>
          <TeamChip teamId={f.away} short />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          predicted {row.expHome.toFixed(1)}–{row.expAway.toFixed(1)}
          {row.topScore && ` · likely ${row.topScore.home}–${row.topScore.away}`}
        </span>
        <span className="ml-auto flex gap-1.5">
          <Verdict ok={row.outcomeHit} label={row.outcomeHit ? "outcome ✓" : `outcome ✗ (${row.predictedOutcome})`} />
          {row.exactHit && <Verdict ok label="exact ✓" />}
        </span>
      </div>
      <div className="mt-2 grid gap-1.5 sm:grid-cols-2 sm:gap-x-6">
        <GoalBar teamId={f.home} exp={row.expHome} actual={row.homeGoals} dev={row.devHome} />
        <GoalBar teamId={f.away} exp={row.expAway} actual={row.awayGoals} dev={row.devAway} />
      </div>
    </div>
  );
}

function Verdict({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.1em] ${
        ok ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
      }`}
    >
      {label}
    </span>
  );
}

function GoalBar({
  teamId,
  exp,
  actual,
  dev,
}: {
  teamId: string;
  exp: number;
  actual: number;
  dev: number;
}) {
  const width = (g: number) => `${Math.min(g / GOAL_BAR_MAX, 1) * 100}%`;
  const abs = Math.abs(dev);
  const devClass =
    abs >= 1.5
      ? "bg-danger/15 text-danger"
      : abs >= 0.75
        ? "bg-gold/15 text-gold"
        : "bg-surface-2 text-muted";
  return (
    <div className="flex items-center gap-2">
      <span className="w-9 shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted">
        {teamId}
      </span>
      <div className="relative h-3.5 min-w-0 flex-1 overflow-hidden rounded bg-surface-2">
        <div
          className="absolute inset-y-0 left-0 rounded bg-accent-dim/75"
          style={{ width: width(actual) }}
        />
        <div
          className="absolute inset-y-0 w-0.5 bg-foreground/60"
          style={{ left: width(exp) }}
          title={`predicted ${exp.toFixed(2)} goals`}
        />
      </div>
      <span
        className={`w-12 shrink-0 rounded px-1 py-0.5 text-right font-mono text-[10px] tabular-nums ${devClass}`}
        title="actual − predicted goals"
      >
        {signed(dev, 1)}
      </span>
    </div>
  );
}

function ProbCell({ p }: { p?: number }) {
  if (p === undefined)
    return <td className="py-2 text-right text-muted">—</td>;
  return (
    <td className="py-2 text-right tabular-nums">
      <span
        className="inline-block min-w-14 rounded px-1.5 py-0.5"
        style={{ backgroundColor: `rgba(46, 119, 255, ${p * 0.45})` }}
      >
        {pct(p)}
      </span>
    </td>
  );
}
