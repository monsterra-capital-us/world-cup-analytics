import { Injury, TeamFactors, TournamentState } from "@/lib/types";
import { TEAM_BY_ID } from "@/data/teams";

/** Elo points a fully-important (1.0) player is worth when ruled out */
const INJURY_ELO_SCALE = 65;
/** total injury damage is capped so a long list can't zero a team out */
const MAX_INJURY_PENALTY = 160;

const STATUS_SEVERITY: Record<Injury["status"], number> = {
  out: 1.0,
  doubtful: 0.5,
  returning: 0.25,
};

export function injuryPenalty(teamId: string, injuries: Injury[]): number {
  const team = TEAM_BY_ID[teamId];
  let penalty = 0;
  for (const inj of injuries) {
    if (inj.teamId !== teamId) continue;
    const kp = team.keyPlayers.find(
      (p) => p.name.toLowerCase() === inj.player.toLowerCase(),
    );
    // unlisted squad players still cost a little
    const importance = kp ? kp.importance : 0.3;
    penalty += importance * STATUS_SEVERITY[inj.status] * INJURY_ELO_SCALE;
  }
  return Math.min(penalty, MAX_INJURY_PENALTY);
}

/** Injury-adjusted rating used everywhere in the prediction model. */
export function effectiveRating(teamId: string, state: TournamentState): number {
  return currentElo(teamId, state) - injuryPenalty(teamId, state.injuries);
}

export function currentElo(teamId: string, state: TournamentState): number {
  return state.elo[teamId] ?? TEAM_BY_ID[teamId].baseElo;
}

export function teamFactors(teamId: string, state: TournamentState): TeamFactors {
  const injuries = state.injuries.filter((i) => i.teamId === teamId);
  const elo = currentElo(teamId, state);
  const penalty = injuryPenalty(teamId, state.injuries);
  return {
    teamId,
    baseElo: TEAM_BY_ID[teamId].baseElo,
    currentElo: elo,
    injuryPenalty: penalty,
    effectiveRating: elo - penalty,
    injuries,
  };
}
