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

// ─────────────── score deviations (predicted vs actual goals) ───────────────

export interface ScoreDeviationRow {
  fixtureId: string;
  homeGoals: number;
  awayGoals: number;
  expHome: number;
  expAway: number;
  topScore?: { home: number; away: number; p: number };
  /** actual − predicted goals, per side */
  devHome: number;
  devAway: number;
  outcome: Outcome;
  predictedOutcome: Outcome;
  outcomeHit: boolean;
  exactHit: boolean;
}

export interface DeviationSummary {
  n: number;
  outcomeHits: number;
  exactHits: number;
  predictedGoals: number;
  actualGoals: number;
  /** mean absolute per-team goal error */
  mae: number;
  /** mean signed per-team error: > 0 means the model under-predicts goals */
  bias: number;
}

function mostLikelyOutcome(p: OutcomeProbs): Outcome {
  if (p.pHome >= p.pDraw && p.pHome >= p.pAway) return "home";
  if (p.pAway >= p.pDraw) return "away";
  return "draw";
}

/**
 * Per-match deviation between the frozen pre-match score expectation and the
 * final score — the raw material for the calibration loop.
 */
export function scoreDeviations(results: MatchResult[]): {
  rows: ScoreDeviationRow[];
  summary: DeviationSummary;
} {
  const rows: ScoreDeviationRow[] = results
    .filter(
      (r) =>
        r.forecast?.expHomeGoals != null && r.forecast.expAwayGoals != null,
    )
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
    .map((r) => {
      const f = r.forecast!;
      const outcome = outcomeOf(r);
      const predictedOutcome = mostLikelyOutcome(f.blend);
      return {
        fixtureId: r.fixtureId,
        homeGoals: r.homeGoals,
        awayGoals: r.awayGoals,
        expHome: f.expHomeGoals!,
        expAway: f.expAwayGoals!,
        topScore: f.topScore,
        devHome: r.homeGoals - f.expHomeGoals!,
        devAway: r.awayGoals - f.expAwayGoals!,
        outcome,
        predictedOutcome,
        outcomeHit: outcome === predictedOutcome,
        exactHit:
          f.topScore != null &&
          f.topScore.home === r.homeGoals &&
          f.topScore.away === r.awayGoals,
      };
    });

  const n = rows.length;
  const summary: DeviationSummary = {
    n,
    outcomeHits: rows.filter((r) => r.outcomeHit).length,
    exactHits: rows.filter((r) => r.exactHit).length,
    predictedGoals: rows.reduce((s, r) => s + r.expHome + r.expAway, 0),
    actualGoals: rows.reduce((s, r) => s + r.homeGoals + r.awayGoals, 0),
    mae: n
      ? rows.reduce((s, r) => s + Math.abs(r.devHome) + Math.abs(r.devAway), 0) /
        (2 * n)
      : 0,
    bias: n
      ? rows.reduce((s, r) => s + r.devHome + r.devAway, 0) / (2 * n)
      : 0,
  };
  return { rows, summary };
}

export interface AggregateScore {
  source: "model" | "market" | "blend";
  n: number;
  brier: number;
  logLoss: number;
  rps: number;
}

/**
 * Aggregate scores per forecast source. Market/blend rows are computed only
 * over matches where market odds existed pre-match, and the model is also
 * scored on that subset (`modelOnMarketSubset`) for an apples-to-apples
 * comparison.
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

  const overall = [
    aggregate(rows, "model", (f) => f.model),
    aggregate(rows, "blend", (f) => f.blend),
  ].filter((x): x is AggregateScore => Boolean(x));

  const marketSubset = [
    aggregate(withMarket, "model", (f) => f.model),
    aggregate(withMarket, "market", (f) => f.market),
    aggregate(withMarket, "blend", (f) => f.blend),
  ].filter((x): x is AggregateScore => Boolean(x));

  return { rows, overall, marketSubset };
}
