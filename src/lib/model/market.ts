import { MarketOdds, OutcomeProbs } from "@/lib/types";

/**
 * Sharp sportsbook closing lines (Pinnacle et al.) are the strongest public
 * predictor of football outcomes, so we use the de-vigged market purely as a
 * benchmark to score our model against — the model is never blended with it.
 */

/** strip the bookmaker margin (proportional / multiplicative method) */
export function devig(odds: MarketOdds): OutcomeProbs {
  const rh = 1 / odds.home;
  const rd = 1 / odds.draw;
  const ra = 1 / odds.away;
  const total = rh + rd + ra;
  return { pHome: rh / total, pDraw: rd / total, pAway: ra / total };
}

export function validateOdds(input: { home: number; draw: number; away: number }): void {
  for (const k of ["home", "draw", "away"] as const) {
    const v = input[k];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 1.01 || v > 1000) {
      throw new Error(`Invalid ${k} odds: decimal odds must be between 1.01 and 1000`);
    }
  }
  const overround = 1 / input.home + 1 / input.draw + 1 / input.away;
  if (overround < 0.9 || overround > 1.35) {
    throw new Error(
      `Implied probabilities sum to ${(overround * 100).toFixed(1)}% — check the odds are decimal and for the right match`,
    );
  }
}
