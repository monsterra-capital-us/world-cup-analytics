/**
 * Elo rating updates applied when a final score is recorded.
 * K is high (World Cup weighting) so in-tournament form moves the model.
 */

const K = 50;

export function eloExpected(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/** goal-difference multiplier per standard Elo football conventions */
function gdMultiplier(goalDiff: number): number {
  const d = Math.abs(goalDiff);
  if (d <= 1) return 1;
  if (d === 2) return 1.5;
  return (11 + d) / 8;
}

export function eloUpdate(
  ratingA: number,
  ratingB: number,
  goalsA: number,
  goalsB: number,
): { newA: number; newB: number } {
  const actual = goalsA > goalsB ? 1 : goalsA === goalsB ? 0.5 : 0;
  const expected = eloExpected(ratingA, ratingB);
  const delta = K * gdMultiplier(goalsA - goalsB) * (actual - expected);
  return { newA: ratingA + delta, newB: ratingB - delta };
}
