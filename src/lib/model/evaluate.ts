import { ForecastSnapshot, MatchResult, OutcomeProbs } from "@/lib/types";

/**
 * Forecast scoring on finished matches. Forecasts are snapshotted at the
 * moment each result is recorded (pre-match state), so these are honest
 * out-of-sample scores with no hindsight leakage.
 *
 * All three metrics are negatively oriented (lower = better).
 */

export type Outcome = "home" | "draw" | "away";

export function outcomeOf(r: { homeGoals: number; awayGoals: number }): Outcome {
  if (r.homeGoals > r.awayGoals) return "home";
  if (r.homeGoals < r.awayGoals) return "away";
  return "draw";
}

function asVector(p: OutcomeProbs): [number, number, number] {
  return [p.pHome, p.pDraw, p.pAway];
}

function outcomeVector(o: Outcome): [number, number, number] {
  return [o === "home" ? 1 : 0, o === "draw" ? 1 : 0, o === "away" ? 1 : 0];
}

/** multiclass Brier score: mean squared error over the 3 outcomes */
export function brier(p: OutcomeProbs, o: Outcome): number {
  const pv = asVector(p);
  const ov = outcomeVector(o);
  return pv.reduce((s, x, i) => s + (x - ov[i]) ** 2, 0);
}

/** negative log-likelihood of the realised outcome */
export function logLoss(p: OutcomeProbs, o: Outcome): number {
  const prob = o === "home" ? p.pHome : o === "draw" ? p.pDraw : p.pAway;
  return -Math.log(Math.max(prob, 1e-10));
}

/** ranked probability score — respects the home>draw>away ordering */
export function rps(p: OutcomeProbs, o: Outcome): number {
  const pv = asVector(p);
  const ov = outcomeVector(o);
  let cumP = 0, cumO = 0, score = 0;
  for (let i = 0; i < 2; i++) {
    cumP += pv[i];
    cumO += ov[i];
    score += (cumP - cumO) ** 2;
  }
  return score / 2;
}

export interface ScoreRow {
  fixtureId: string;
  outcome: Outcome;
  homeGoals: number;
  awayGoals: number;
  forecast: ForecastSnapshot;
}

export interface AggregateScore {
  source: "model" | "market";
  n: number;
  brier: number;
  logLoss: number;
  rps: number;
}

/**
 * Aggregate scores per forecast source. The market row is computed only over
 * matches where odds existed pre-match, and the model is scored on that same
 * subset for an apples-to-apples comparison.
 */
export function evaluate(results: MatchResult[]): {
  rows: ScoreRow[];
  overall: AggregateScore[];
  marketSubset: AggregateScore[];
} {
  const rows: ScoreRow[] = results
    .filter((r) => r.forecast)
    .map((r) => ({
      fixtureId: r.fixtureId,
      outcome: outcomeOf(r),
      homeGoals: r.homeGoals,
      awayGoals: r.awayGoals,
      forecast: r.forecast!,
    }));

  const aggregate = (
    subset: ScoreRow[],
    source: AggregateScore["source"],
    pick: (f: ForecastSnapshot) => OutcomeProbs | undefined,
  ): AggregateScore | null => {
    const scored = subset
      .map((row) => ({ row, p: pick(row.forecast) }))
      .filter((x): x is { row: ScoreRow; p: OutcomeProbs } => Boolean(x.p));
    if (scored.length === 0) return null;
    const n = scored.length;
    return {
      source,
      n,
      brier: scored.reduce((s, x) => s + brier(x.p, x.row.outcome), 0) / n,
      logLoss: scored.reduce((s, x) => s + logLoss(x.p, x.row.outcome), 0) / n,
      rps: scored.reduce((s, x) => s + rps(x.p, x.row.outcome), 0) / n,
    };
  };

  const withMarket = rows.filter((r) => r.forecast.market);

  const overall = [aggregate(rows, "model", (f) => f.model)].filter(
    (x): x is AggregateScore => Boolean(x),
  );

  const marketSubset = [
    aggregate(withMarket, "model", (f) => f.model),
    aggregate(withMarket, "market", (f) => f.market),
  ].filter((x): x is AggregateScore => Boolean(x));

  return { rows, overall, marketSubset };
}
