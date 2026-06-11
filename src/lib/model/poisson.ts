/**
 * Score model: effective-rating difference → expected goals → bivariate
 * (independent) Poisson score matrix with a Dixon-Coles low-score
 * correction so draw frequencies match observed international football.
 */

export const MAX_GOALS = 8;

/** average goals per team per match at recent World Cups */
const BASE_GOALS = 1.32;
/** how strongly a rating edge converts into a goals edge */
const GOAL_ELASTICITY = 1.05;
/** Dixon-Coles correlation for 0-0/1-0/0-1/1-1 */
const RHO = -0.08;

export function expectedGoals(ratingDiff: number): { lambdaA: number; lambdaB: number } {
  const shift = Math.exp((GOAL_ELASTICITY * ratingDiff) / 400);
  return {
    lambdaA: clamp(BASE_GOALS * shift, 0.15, 4.6),
    lambdaB: clamp(BASE_GOALS / shift, 0.15, 4.6),
  };
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

function poissonPmf(lambda: number, k: number): number {
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p = (p * lambda) / i;
  return p;
}

function dixonColesTau(x: number, y: number, la: number, lb: number): number {
  if (x === 0 && y === 0) return 1 - la * lb * RHO;
  if (x === 0 && y === 1) return 1 + la * RHO;
  if (x === 1 && y === 0) return 1 + lb * RHO;
  if (x === 1 && y === 1) return 1 - RHO;
  return 1;
}

export interface ScoreDistribution {
  matrix: number[][]; // [aGoals][bGoals], normalised
  pA: number;
  pDraw: number;
  pB: number;
  lambdaA: number;
  lambdaB: number;
}

export function scoreDistribution(ratingDiff: number): ScoreDistribution {
  const { lambdaA, lambdaB } = expectedGoals(ratingDiff);
  const pmfA = Array.from({ length: MAX_GOALS + 1 }, (_, k) => poissonPmf(lambdaA, k));
  const pmfB = Array.from({ length: MAX_GOALS + 1 }, (_, k) => poissonPmf(lambdaB, k));

  const matrix: number[][] = [];
  let total = 0;
  for (let a = 0; a <= MAX_GOALS; a++) {
    const row: number[] = [];
    for (let b = 0; b <= MAX_GOALS; b++) {
      const p = pmfA[a] * pmfB[b] * dixonColesTau(a, b, lambdaA, lambdaB);
      row.push(p);
      total += p;
    }
    matrix.push(row);
  }

  let pA = 0, pDraw = 0, pB = 0;
  for (let a = 0; a <= MAX_GOALS; a++) {
    for (let b = 0; b <= MAX_GOALS; b++) {
      matrix[a][b] /= total;
      if (a > b) pA += matrix[a][b];
      else if (a === b) pDraw += matrix[a][b];
      else pB += matrix[a][b];
    }
  }

  return { matrix, pA, pDraw, pB, lambdaA, lambdaB };
}

export function topScorelines(
  matrix: number[][],
  n = 5,
): { home: number; away: number; p: number }[] {
  const all: { home: number; away: number; p: number }[] = [];
  matrix.forEach((row, a) => row.forEach((p, b) => all.push({ home: a, away: b, p })));
  return all.sort((x, y) => y.p - x.p).slice(0, n);
}

/** Sample a scoreline from a normalised score matrix (for Monte Carlo). */
export function sampleScore(
  matrix: number[][],
  rand: () => number,
): { a: number; b: number } {
  let r = rand();
  for (let a = 0; a <= MAX_GOALS; a++) {
    for (let b = 0; b <= MAX_GOALS; b++) {
      r -= matrix[a][b];
      if (r <= 0) return { a, b };
    }
  }
  return { a: MAX_GOALS, b: MAX_GOALS };
}
