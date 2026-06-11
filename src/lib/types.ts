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
  matchday: 1 | 2 | 3;
}

export interface MatchResult {
  fixtureId: string;
  homeGoals: number;
  awayGoals: number;
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
}

export interface MatchPrediction {
  fixtureId: string;
  pHome: number;
  pDraw: number;
  pAway: number;
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
