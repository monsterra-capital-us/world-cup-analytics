import { loadState } from "@/lib/store";
import { evaluate, ScoreRow } from "@/lib/model/evaluate";
import { FIXTURE_BY_ID } from "@/data/fixtures";
import { pct } from "@/lib/format";
import { Card, LegendDot, SectionTitle, TeamChip } from "@/components/ui";
import { WhitePaper } from "@/components/WhitePaper";

export const dynamic = "force-dynamic";

const METRICS = [
  { key: "brier", label: "Brier score", blurb: "mean squared error over the 3 outcomes" },
  { key: "rps", label: "Ranked probability", blurb: "respects home > draw > away ordering" },
  { key: "logLoss", label: "Log loss", blurb: "penalises confident wrong calls hardest" },
] as const;

export default async function ModelPage() {
  const state = await loadState();
  const { rows, overall, marketSubset } = evaluate(Object.values(state.results));

  const model = marketSubset.find((s) => s.source === "model");
  const market = marketSubset.find((s) => s.source === "market");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold">Model vs the market</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Our model&apos;s forecast is frozen the moment each result is recorded,
          then scored out-of-sample. Where you enter a sharp book&apos;s pre-match
          odds (e.g. Pinnacle) we score them on the same matches as a benchmark.
          All three metrics are{" "}
          <span className="text-foreground">lower is better</span>. Sharp closing
          lines are the toughest public baseline in football — landing near them
          is the realistic bar.
        </p>
      </header>

      {rows.length === 0 ? (
        <Card className="px-6 py-8 text-sm text-muted">
          No completed matches yet. Once results are recorded, model accuracy
          appears here — and if you enter pre-match odds, you get a direct,
          like-for-like model-vs-market scoreboard.
        </Card>
      ) : (
        <>
          {/* headline comparison */}
          {model && market ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {METRICS.map((m) => (
                <MetricCompareCard
                  key={m.key}
                  label={m.label}
                  blurb={m.blurb}
                  modelValue={model[m.key]}
                  marketValue={market[m.key]}
                  n={model.n}
                />
              ))}
            </div>
          ) : (
            <Card className="px-6 py-5">
              <SectionTitle
                title="Model accuracy so far"
                hint={`${rows.length} completed matches with stored forecasts`}
              />
              <div className="grid gap-4 px-5 pb-2 sm:grid-cols-3">
                {overall[0] &&
                  METRICS.map((m) => (
                    <div key={m.key} className="rounded-xl bg-surface-2/60 p-4">
                      <p className="text-xs text-muted">{m.label}</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-accent">
                        {overall[0][m.key].toFixed(4)}
                      </p>
                    </div>
                  ))}
              </div>
              <p className="px-5 pb-4 text-xs text-muted">
                POST pre-match odds to <code>/api/odds</code> to unlock the
                head-to-head benchmark against the market.
              </p>
            </Card>
          )}

          {/* per-match calls */}
          <Card>
            <SectionTitle
              title="Match-by-match"
              hint="Probability each gave to the outcome that actually happened — longer bar = better call"
            />
            <div className="flex gap-4 px-5 pb-2">
              <LegendDot which="model" />
              <LegendDot which="market" />
            </div>
            <div className="space-y-2 px-5 pb-5">
              {rows
                .slice()
                .reverse()
                .map((row) => (
                  <MatchRow key={row.fixtureId} row={row} />
                ))}
            </div>
          </Card>
        </>
      )}

      <WhitePaper />
    </div>
  );
}

function MetricCompareCard({
  label,
  blurb,
  modelValue,
  marketValue,
  n,
}: {
  label: string;
  blurb: string;
  modelValue: number;
  marketValue: number;
  n: number;
}) {
  const max = Math.max(modelValue, marketValue, 1e-6);
  const modelWins = modelValue <= marketValue;
  const gap = ((marketValue - modelValue) / marketValue) * 100;
  return (
    <Card className="p-5">
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-0.5 text-xs text-muted">{blurb}</p>

      <div className="mt-4 space-y-2">
        <ScoreBar label="Our model" value={modelValue} max={max} color="var(--accent)" />
        <ScoreBar label="Market" value={marketValue} max={max} color="var(--info)" />
      </div>

      <p className="mt-3 text-xs">
        {Math.abs(gap) < 0.5 ? (
          <span className="text-muted">Effectively level with the market</span>
        ) : modelWins ? (
          <span className="text-accent">
            Model {Math.abs(gap).toFixed(0)}% better over {n} matches
          </span>
        ) : (
          <span className="text-muted">
            Market {Math.abs(gap).toFixed(0)}% better over {n} matches
          </span>
        )}
      </p>
    </Card>
  );
}

function ScoreBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs text-muted">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full"
          style={{ width: `${(value / max) * 100}%`, background: color }}
        />
      </div>
      <span className="w-16 text-right text-xs font-semibold tabular-nums">
        {value.toFixed(4)}
      </span>
    </div>
  );
}

function MatchRow({ row }: { row: ScoreRow }) {
  const f = FIXTURE_BY_ID[row.fixtureId];
  const probFor = (p?: { pHome: number; pDraw: number; pAway: number }) =>
    p
      ? row.outcome === "home"
        ? p.pHome
        : row.outcome === "draw"
          ? p.pDraw
          : p.pAway
      : undefined;
  const modelP = probFor(row.forecast.model)!;
  const marketP = probFor(row.forecast.market);

  return (
    <div className="flex items-center gap-4 rounded-xl bg-surface-2/40 px-4 py-2.5">
      <span className="flex w-40 shrink-0 items-center gap-1.5 text-sm">
        <TeamChip teamId={f.home} short />
        <span className="font-bold tabular-nums">
          {row.homeGoals}–{row.awayGoals}
        </span>
        <TeamChip teamId={f.away} short />
      </span>
      <div className="flex-1 space-y-1">
        <CallBar value={modelP} color="var(--accent)" />
        {marketP !== undefined ? (
          <CallBar value={marketP} color="var(--info)" />
        ) : (
          <div className="h-2 text-[10px] leading-none text-muted">no market odds</div>
        )}
      </div>
      <span className="w-28 shrink-0 text-right text-xs tabular-nums">
        <span className="text-accent">{pct(modelP)}</span>
        {marketP !== undefined && (
          <>
            <span className="text-muted"> / </span>
            <span className="text-info">{pct(marketP)}</span>
          </>
        )}
      </span>
    </div>
  );
}

function CallBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.max(value * 100, 1.5)}%`, background: color }}
      />
    </div>
  );
}
