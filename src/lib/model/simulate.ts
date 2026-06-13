import {
  GroupId,
  GroupStandingRow,
  MatchPrediction,
  Predictions,
  TeamOutlook,
  TournamentState,
} from "@/lib/types";
import { FIXTURES } from "@/data/fixtures";
import { GROUPS, TEAMS, teamsInGroup } from "@/data/teams";
import {
  KNOCKOUT_GOAL_SCALE,
  sampleScore,
  scoreDistribution,
  topScorelines,
  ScoreDistribution,
} from "./poisson";
import { effectiveRating, teamFactors } from "./strength";
import { computeCalibration } from "./calibrate";
import { eloExpected } from "./elo";
import { blendOutcomes, devig, rescaleMatrix } from "./market";
import { Fixture, OutcomeProbs } from "@/lib/types";

export const SIMULATIONS = 5000;

/** deterministic RNG so identical state always yields identical odds */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** memoised score distributions keyed by rating diff rounded to 4 Elo pts */
function makeDistCache(goalScale = 1) {
  const cache = new Map<number, ScoreDistribution>();
  return (diff: number): ScoreDistribution => {
    const key = Math.round(diff / 4);
    let d = cache.get(key);
    if (!d) {
      d = scoreDistribution(key * 4, goalScale);
      cache.set(key, d);
    }
    return d;
  };
}

/** Elo points credited to a host nation playing in its own country */
export const HOME_ADVANTAGE = 55;

function homeEdge(f: Fixture): number {
  if (f.home === f.country) return HOME_ADVANTAGE;
  if (f.away === f.country) return -HOME_ADVANTAGE;
  return 0;
}

// ───────────────────────── group standings ─────────────────────────

interface Row extends GroupStandingRow { rnd: number }

function emptyRows(group: GroupId, rand: () => number): Map<string, Row> {
  const rows = new Map<string, Row>();
  for (const t of teamsInGroup(group)) {
    rows.set(t.id, {
      teamId: t.id, played: 0, won: 0, drawn: 0, lost: 0,
      gf: 0, ga: 0, pts: 0, rnd: rand(),
    });
  }
  return rows;
}

function applyScore(rows: Map<string, Row>, home: string, away: string, hg: number, ag: number) {
  const h = rows.get(home)!, a = rows.get(away)!;
  h.played++; a.played++;
  h.gf += hg; h.ga += ag; a.gf += ag; a.ga += hg;
  if (hg > ag) { h.won++; a.lost++; h.pts += 3; }
  else if (hg < ag) { a.won++; h.lost++; a.pts += 3; }
  else { h.drawn++; a.drawn++; h.pts++; a.pts++; }
}

/** points → goal difference → goals for → random (head-to-head omitted) */
function rankRows(rows: Row[]): Row[] {
  return [...rows].sort(
    (x, y) =>
      y.pts - x.pts ||
      (y.gf - y.ga) - (x.gf - x.ga) ||
      y.gf - x.gf ||
      y.rnd - x.rnd,
  );
}

/** Standings from actually recorded results only (for display). */
export function actualStandings(state: TournamentState): Record<GroupId, GroupStandingRow[]> {
  const rand = mulberry32(7);
  const out = {} as Record<GroupId, GroupStandingRow[]>;
  for (const g of GROUPS) {
    const rows = emptyRows(g, rand);
    for (const f of FIXTURES) {
      if (f.group !== g) continue;
      const r = state.results[f.id];
      if (r) applyScore(rows, f.home, f.away, r.homeGoals, r.awayGoals);
    }
    out[g] = rankRows([...rows.values()]).map((row) => {
      const { rnd, ...rest } = row;
      void rnd;
      return rest;
    });
  }
  return out;
}

// ───────────────────────── knockout bracket ─────────────────────────

/**
 * Round-of-32 template (close to FIFA's published bracket, simplified):
 * eight group winners meet the eight qualified third-placed teams
 * (best third vs the "weakest-slot" winner), the other four winners meet
 * runners-up from distant groups, and the remaining runners-up pair off.
 * Order below is the bracket order: R16 pairs (0,1), (2,3), … onwards.
 */
type Slot = ["W" | "R", GroupId] | ["T", number]; // T = qualified third, by rank (0 = best)

const R32_TEMPLATE: [Slot, Slot][] = [
  [["W", "A"], ["T", 7]],
  [["R", "E"], ["R", "H"]],
  [["W", "C"], ["T", 5]],
  [["W", "I"], ["R", "B"]],
  [["W", "E"], ["T", 3]],
  [["R", "F"], ["R", "G"]],
  [["W", "G"], ["T", 1]],
  [["W", "K"], ["R", "D"]],
  [["W", "B"], ["T", 6]],
  [["R", "I"], ["R", "L"]],
  [["W", "D"], ["T", 4]],
  [["W", "J"], ["R", "A"]],
  [["W", "F"], ["T", 2]],
  [["R", "J"], ["R", "K"]],
  [["W", "H"], ["T", 0]],
  [["W", "L"], ["R", "C"]],
];

// ───────────────────────── tournament simulation ─────────────────────────

type StageKey = "pR32" | "pR16" | "pQF" | "pSF" | "pFinal" | "pChampion";

export function predictFixture(
  fixtureId: string,
  state: TournamentState,
): { model: OutcomeProbs; market?: OutcomeProbs; blend: OutcomeProbs; matrix: number[][]; d: ScoreDistribution; edge: number } {
  const f = FIXTURES.find((x) => x.id === fixtureId)!;
  const edge = homeEdge(f);
  const diff = effectiveRating(f.home, state) - effectiveRating(f.away, state) + edge;
  // self-calibration: goal rate re-fit from past predicted-vs-actual totals
  const { goalScale } = computeCalibration(Object.values(state.results));
  const d = scoreDistribution(diff, goalScale);
  const model: OutcomeProbs = { pHome: d.pA, pDraw: d.pDraw, pAway: d.pB };
  const odds = state.marketOdds[fixtureId];
  if (!odds) return { model, blend: model, matrix: d.matrix, d, edge };
  const market = devig(odds);
  const blend = blendOutcomes(model, market);
  return { model, market, blend, matrix: rescaleMatrix(d.matrix, blend), d, edge };
}

export function runSimulation(state: TournamentState, nSims = SIMULATIONS): Predictions {
  const rand = mulberry32(20260611 ^ state.version);
  const { goalScale } = computeCalibration(Object.values(state.results));
  const koDist = makeDistCache(KNOCKOUT_GOAL_SCALE * goalScale);
  const ratings: Record<string, number> = {};
  for (const t of TEAMS) ratings[t.id] = effectiveRating(t.id, state);

  // exact (non-MC) per-fixture predictions; market-blended where odds exist
  const matchPredictions: Record<string, MatchPrediction> = {};
  const samplingMatrix: Record<string, number[][]> = {};
  for (const f of FIXTURES) {
    const { model, market, blend, matrix, d, edge } = predictFixture(f.id, state);
    samplingMatrix[f.id] = matrix;
    matchPredictions[f.id] = {
      fixtureId: f.id,
      pHome: blend.pHome, pDraw: blend.pDraw, pAway: blend.pAway,
      model,
      market: market ? { ...market, source: state.marketOdds[f.id]?.source } : undefined,
      homeEdge: edge,
      expHomeGoals: d.lambdaA, expAwayGoals: d.lambdaB,
      topScores: topScorelines(matrix, 5),
      scoreMatrix: matrix.map((row) => row.map((p) => Number(p.toFixed(5)))),
      factors: [teamFactors(f.home, state), teamFactors(f.away, state)],
    };
  }

  const tally: Record<string, Record<StageKey, number> & { pts: number }> = {};
  for (const t of TEAMS) {
    tally[t.id] = { pR32: 0, pR16: 0, pQF: 0, pSF: 0, pFinal: 0, pChampion: 0, pts: 0 };
  }

  const groupFixtures = GROUPS.map((g) => FIXTURES.filter((f) => f.group === g));

  for (let s = 0; s < nSims; s++) {
    const winners = {} as Record<GroupId, string>;
    const runners = {} as Record<GroupId, string>;
    const thirds: Row[] = [];

    GROUPS.forEach((g, gi) => {
      const rows = emptyRows(g, rand);
      for (const f of groupFixtures[gi]) {
        const r = state.results[f.id];
        if (r) {
          applyScore(rows, f.home, f.away, r.homeGoals, r.awayGoals);
        } else {
          const sc = sampleScore(samplingMatrix[f.id], rand);
          applyScore(rows, f.home, f.away, sc.a, sc.b);
        }
      }
      const ranked = rankRows([...rows.values()]);
      winners[g] = ranked[0].teamId;
      runners[g] = ranked[1].teamId;
      thirds.push(ranked[2]);
      for (const row of ranked) tally[row.teamId].pts += row.pts;
    });

    const qualifiedThirds = rankRows(thirds).slice(0, 8).map((r) => r.teamId);

    // resolve round of 32
    let round: string[] = [];
    for (const [s1, s2] of R32_TEMPLATE) {
      round.push(resolveSlot(s1, winners, runners, qualifiedThirds));
      round.push(resolveSlot(s2, winners, runners, qualifiedThirds));
    }
    for (const id of round) tally[id].pR32++;

    // knockout rounds: R32 → R16 → QF → SF → Final
    const stageCounters: ((id: string) => void)[] = [
      (id) => tally[id].pR16++,
      (id) => tally[id].pQF++,
      (id) => tally[id].pSF++,
      (id) => tally[id].pFinal++,
      (id) => tally[id].pChampion++,
    ];

    for (const advance of stageCounters) {
      const next: string[] = [];
      for (let i = 0; i < round.length; i += 2) {
        const winner = playKnockout(round[i], round[i + 1], ratings, koDist, rand);
        next.push(winner);
        advance(winner);
      }
      round = next;
    }
  }

  const outlooks: TeamOutlook[] = TEAMS.map((t) => ({
    teamId: t.id,
    pR32: tally[t.id].pR32 / nSims,
    pR16: tally[t.id].pR16 / nSims,
    pQF: tally[t.id].pQF / nSims,
    pSF: tally[t.id].pSF / nSims,
    pFinal: tally[t.id].pFinal / nSims,
    pChampion: tally[t.id].pChampion / nSims,
    expGroupPts: tally[t.id].pts / nSims,
  })).sort((a, b) => b.pChampion - a.pChampion || b.pFinal - a.pFinal);

  return {
    stateVersion: state.version,
    computedAt: new Date().toISOString(),
    simulations: nSims,
    outlooks,
    matchPredictions,
    standings: actualStandings(state),
  };
}

function resolveSlot(
  slot: Slot,
  winners: Record<GroupId, string>,
  runners: Record<GroupId, string>,
  thirds: string[],
): string {
  const [kind, ref] = slot;
  if (kind === "W") return winners[ref as GroupId];
  if (kind === "R") return runners[ref as GroupId];
  return thirds[(ref as number) % thirds.length];
}

function playKnockout(
  a: string,
  b: string,
  ratings: Record<string, number>,
  dist: (diff: number) => ScoreDistribution,
  rand: () => number,
): string {
  const sc = sampleScore(dist(ratings[a] - ratings[b]).matrix, rand);
  if (sc.a !== sc.b) return sc.a > sc.b ? a : b;
  // extra time + penalties: strength still matters, but less
  const pA = eloExpected(ratings[a] / 3, ratings[b] / 3);
  return rand() < pA ? a : b;
}
