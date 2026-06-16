import { Calibration } from "@/lib/types";
import { scoreDistribution } from "./poisson";

/**
 * Online self-calibration. After every completed match the engine takes one
 * regularised gradient step on the model's free hyper-parameters to reduce
 * the log-loss it would have assigned to the result that actually happened.
 *
 * Three identifiable parameters are learned (others are partially redundant
 * and held fixed):
 *   - ratingScale : how sharply a rating gap maps to win probability
 *                   (an inverse-temperature / confidence knob)
 *   - homeAdv     : host-nation home advantage, in Elo points
 *   - baseGoals   : the neutral scoring level (shapes draw rate & margins)
 *
 * Steps are taken in a scale-normalised space, capped per match, decayed as
 * data accumulates, and pulled gently back toward the priors — so a handful
 * of early games can't make the model lurch, while a full tournament's worth
 * of results meaningfully sharpens it.
 */

export const PRIOR_CALIBRATION: Calibration = {
  ratingScale: 1,
  homeAdv: 55,
  baseGoals: 1.32,
  n: 0,
};

type Key = "ratingScale" | "homeAdv" | "baseGoals";
const KEYS: Key[] = ["ratingScale", "homeAdv", "baseGoals"];

/** characteristic scale of each parameter (for normalised gradient steps) */
const CHAR: Record<Key, number> = { ratingScale: 1, homeAdv: 50, baseGoals: 1.3 };
/** valid range per parameter */
const RANGE: Record<Key, [number, number]> = {
  ratingScale: [0.55, 1.8],
  homeAdv: [0, 120],
  baseGoals: [0.95, 1.7],
};
/** largest change allowed from a single match (stability) */
const MAX_STEP: Record<Key, number> = { ratingScale: 0.04, homeAdv: 6, baseGoals: 0.04 };

const LR = 0.06; // base learning rate (normalised space)
const REG = 0.03; // pull toward prior each step

export type Outcome = "home" | "draw" | "away";

function outcomeProbs(
  rawDiff: number,
  hostSign: number,
  cal: Pick<Calibration, "ratingScale" | "homeAdv" | "baseGoals">,
): [number, number, number] {
  const diff = (rawDiff + hostSign * cal.homeAdv) * cal.ratingScale;
  const d = scoreDistribution(diff, { baseGoals: cal.baseGoals });
  return [d.pA, d.pDraw, d.pB]; // home, draw, away
}

function logLossAt(
  rawDiff: number,
  hostSign: number,
  cal: Pick<Calibration, "ratingScale" | "homeAdv" | "baseGoals">,
  oIdx: number,
): number {
  const p = outcomeProbs(rawDiff, hostSign, cal);
  return -Math.log(Math.max(p[oIdx], 1e-9));
}

function clampRange(k: Key, v: number): number {
  return Math.min(RANGE[k][1], Math.max(RANGE[k][0], v));
}

/**
 * One online learning step. `rawDiff` is the pre-match effective-rating gap
 * (home − away, before any home edge); `hostSign` is +1 if the home team is
 * the host nation, −1 if the away team is, else 0.
 */
export function calibrationStep(
  prev: Calibration,
  rawDiff: number,
  hostSign: number,
  outcome: Outcome,
): Calibration {
  const cal = {
    ratingScale: prev.ratingScale,
    homeAdv: prev.homeAdv,
    baseGoals: prev.baseGoals,
  };
  const oIdx = outcome === "home" ? 0 : outcome === "draw" ? 1 : 2;
  const lossBefore = logLossAt(rawDiff, hostSign, cal, oIdx);

  // step size shrinks as evidence accumulates (Robbins–Monro style)
  const lr = LR / Math.sqrt(1 + prev.n / 8);

  const next = { ...cal };
  for (const k of KEYS) {
    const c = CHAR[k];
    const h = 0.01 * c;
    const lossPlus = logLossAt(rawDiff, hostSign, { ...cal, [k]: cal[k] + h }, oIdx);
    const lossMinus = logLossAt(rawDiff, hostSign, { ...cal, [k]: cal[k] - h }, oIdx);
    const gradP = (lossPlus - lossMinus) / (2 * h); // dLoss/dParam
    // normalised-space step → back to param space: dp = -lr * c² * dLoss/dp
    let dp = -lr * c * c * gradP;
    dp = Math.max(-MAX_STEP[k], Math.min(MAX_STEP[k], dp));
    let v = cal[k] + dp;
    v += REG * (PRIOR_CALIBRATION[k] - v); // regularise toward prior
    next[k] = clampRange(k, v);
  }

  const lossAfter = logLossAt(rawDiff, hostSign, next, oIdx);
  void lossAfter; // (kept for clarity; running mean uses the realised pre-step loss)

  const n = prev.n + 1;
  const meanLogLoss =
    prev.meanLogLoss === undefined
      ? lossBefore
      : prev.meanLogLoss + (lossBefore - prev.meanLogLoss) / n;

  return {
    ...next,
    n,
    meanLogLoss,
    updatedAt: new Date().toISOString(),
  };
}
