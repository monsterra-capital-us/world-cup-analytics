import { MarketOdds, OutcomeProbs } from "@/lib/types";

/**
 * Market-anchored ensemble. Sharp sportsbook closing lines (Pinnacle et al.)
 * are the strongest public predictor of football outcomes, so when odds are
 * available the published probabilities are a blend that leans on the
 * market and uses the model for the score distribution's shape.
 */

/** weight given to the de-vigged market when blending with the model */
export const MARKET_WEIGHT = 0.7;

/** strip the bookmaker margin (proportional / multiplicative method) */
export function devig(odds: MarketOdds): OutcomeProbs {
  const rh = 1 / odds.home;
  const rd = 1 / odds.draw;
  const ra = 1 / odds.away;
  const total = rh + rd + ra;
  return { pHome: rh / total, pDraw: rd / total, pAway: ra / total };
}

export function blendOutcomes(model: OutcomeProbs, market: OutcomeProbs): OutcomeProbs {
  const w = MARKET_WEIGHT;
  return {
    pHome: w * market.pHome + (1 - w) * model.pHome,
    pDraw: w * market.pDraw + (1 - w) * model.pDraw,
    pAway: w * market.pAway + (1 - w) * model.pAway,
  };
}

/**
 * Rescale a score matrix so its win/draw/loss masses hit target outcome
 * probabilities while preserving the model's scoreline shape within each
 * outcome region.
 */
export function rescaleMatrix(matrix: number[][], target: OutcomeProbs): number[][] {
  let mH = 0, mD = 0, mA = 0;
  matrix.forEach((row, a) =>
    row.forEach((p, b) => {
      if (a > b) mH += p;
      else if (a === b) mD += p;
      else mA += p;
    }),
  );
  const fH = mH > 0 ? target.pHome / mH : 0;
  const fD = mD > 0 ? target.pDraw / mD : 0;
  const fA = mA > 0 ? target.pAway / mA : 0;
  return matrix.map((row, a) =>
    row.map((p, b) => p * (a > b ? fH : a === b ? fD : fA)),
  );
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
