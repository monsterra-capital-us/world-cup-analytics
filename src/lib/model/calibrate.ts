import { MatchResult } from "@/lib/types";

/**
 * Self-calibration: after every recorded match the model re-fits a goal-rate
 * multiplier from the deviation between pre-match expected goals (frozen in
 * each result's forecast snapshot) and the goals actually scored. The
 * multiplier scales expected goals everywhere — match forecasts, the score
 * matrix and the Monte Carlo tournament simulation — so systematic over- or
 * under-prediction self-corrects as the tournament progresses.
 *
 * Regularisation: the estimate is shrunk toward 1.0 with a pseudo-sample of
 * PRIOR_MATCHES perfectly-predicted matches (so a couple of freak scorelines
 * can't whipsaw the model) and hard-capped at ±25%.
 */

/** average goals per team per match (matches BASE_GOALS in poisson.ts) */
const PRIOR_GOALS_PER_TEAM = 1.32;
/** pseudo-matches anchoring the multiplier at 1.0 */
const PRIOR_MATCHES = 10;
const MIN_SCALE = 0.75;
const MAX_SCALE = 1.25;

export interface Calibration {
  /** multiplier applied to expected goals everywhere */
  goalScale: number;
  /** completed matches with stored pre-match expected goals */
  sampleSize: number;
  predictedGoals: number;
  actualGoals: number;
}

export function computeCalibration(results: Iterable<MatchResult>): Calibration {
  let predicted = 0;
  let actual = 0;
  let n = 0;
  for (const r of results) {
    const f = r.forecast;
    if (!f || f.expHomeGoals == null || f.expAwayGoals == null) continue;
    predicted += f.expHomeGoals + f.expAwayGoals;
    actual += r.homeGoals + r.awayGoals;
    n++;
  }
  const prior = PRIOR_MATCHES * 2 * PRIOR_GOALS_PER_TEAM;
  const raw = (actual + prior) / (predicted + prior);
  return {
    goalScale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, raw)),
    sampleSize: n,
    predictedGoals: predicted,
    actualGoals: actual,
  };
}
