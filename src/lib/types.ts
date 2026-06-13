export type GroupId =
  | "A" | "B" | "C" | "D" | "E" | "F"
  | "G" | "H" | "I" | "J" | "K" | "L";

export interface KeyPlayer {
  name: string;
  position: string;
  /** 0–1: how much of the team's strength rides on this player */
  importance: number;
}

export interface Team {
  id: string; // FIFA-style trigram, e.g. "ARG"
  name: string;
  flag: string;
  group: GroupId;
  /** Pre-tournament Elo-style rating */
  baseElo: number;
  fifaRank: number;
  keyPlayers: KeyPlayer[];
}

export type InjuryStatus = "out" | "doubtful" | "returning";

export interface Injury {
  id: string;
  teamId: string;
  player: string;
  status: InjuryStatus;
  detail?: string;
  reportedAt: string; // ISO date
}

export interface Fixture {
  id: string; // e.g. "A1"
  group: GroupId;
  home: string; // team id
  away: string; // team id
  kickoff: string; // ISO datetime (UTC)
  venue: string;
  /** host country of the venue — host teams get a home-advantage boost */
  country: "USA" | "MEX" | "CAN";
  matchday: 1 | 2 | 3;
}

/** outcome probabilities frozen at the moment the result was recorded */
export interface ForecastSnapshot {
  model: OutcomeProbs;
  /** sharp-book benchmark, when odds were entered pre-match */
  market?: OutcomeProbs;
}

export interface OutcomeProbs {
  pHome: number;
  pDraw: number;
  pAway: number;
}

export interface MatchResult {
  fixtureId: string;
  homeGoals: number;
  awayGoals: number;
  recordedAt: string;
  /** pre-match forecast, stored for honest out-of-sample evaluation */
  forecast?: ForecastSnapshot;
}

/** decimal odds for a fixture, e.g. from Pinnacle */
export interface MarketOdds {
  fixtureId: string;
  home: number;
  draw: number;
  away: number;
  source?: string;
  recordedAt: string;
}

/** Mutable tournament state persisted to disk */
export interface TournamentState {
  /** bumped on every mutation; used as the simulation cache key */
  version: number;
  /** live Elo ratings, updated after every recorded result */
  elo: Record<string, number>;
  results: Record<string, MatchResult>;
  injuries: Injury[];
  /** sportsbook odds entered per fixture; used as a benchmark, not blended in */
  marketOdds: Record<string, MarketOdds>;
  /** last time the injuries feed was queried (throttles polling) */
  lastInjurySyncAt?: string;
}

export interface MatchPrediction {
  fixtureId: string;
  /** our model's probabilities — these are the published prediction */
  pHome: number;
  pDraw: number;
  pAway: number;
  /** de-vigged sharp-book benchmark, when odds have been entered */
  market?: OutcomeProbs & { source?: string };
  /** Elo points of home advantage applied to the home side (host nations) */
  homeEdge: number;
  expHomeGoals: number;
  expAwayGoals: number;
  /** most likely scorelines, descending probability */
  topScores: { home: number; away: number; p: number }[];
  /** P(score) matrix, [homeGoals][awayGoals], 0..MAX_GOALS */
  scoreMatrix: number[][];
  factors: TeamFactors[];
}

export interface TeamFactors {
  teamId: string;
  baseElo: number;
  currentElo: number;
  injuryPenalty: number;
  effectiveRating: number;
  injuries: Injury[];
}

export interface TeamOutlook {
  teamId: string;
  /** probability of reaching each stage */
  pR32: number;
  pR16: number;
  pQF: number;
  pSF: number;
  pFinal: number;
  pChampion: number;
  /** mean group-stage points across simulations */
  expGroupPts: number;
}

export interface GroupStandingRow {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  pts: number;
}

export interface Predictions {
  stateVersion: number;
  computedAt: string;
  simulations: number;
  outlooks: TeamOutlook[];
  matchPredictions: Record<string, MatchPrediction>;
  standings: Record<GroupId, GroupStandingRow[]>;
}
