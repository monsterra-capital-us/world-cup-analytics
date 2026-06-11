import { Fixture, GroupId } from "@/lib/types";
import { GROUPS, teamsInGroup } from "./teams";

const VENUES = [
  "Estadio Azteca, Mexico City",
  "MetLife Stadium, New York/New Jersey",
  "SoFi Stadium, Los Angeles",
  "AT&T Stadium, Dallas",
  "Hard Rock Stadium, Miami",
  "Mercedes-Benz Stadium, Atlanta",
  "NRG Stadium, Houston",
  "Arrowhead Stadium, Kansas City",
  "Lincoln Financial Field, Philadelphia",
  "Lumen Field, Seattle",
  "Levi's Stadium, San Francisco Bay Area",
  "Gillette Stadium, Boston",
  "BMO Field, Toronto",
  "BC Place, Vancouver",
  "Estadio BBVA, Monterrey",
  "Estadio Akron, Guadalajara",
];

/**
 * Group-stage round-robin (72 matches). Matchday windows mirror the real
 * tournament calendar (11–16, 17–22, 23–27 June 2026); exact kickoff slots
 * are approximations and can be edited here without touching the model.
 */
function buildGroupFixtures(): Fixture[] {
  const fixtures: Fixture[] = [];
  const mdStart = [Date.UTC(2026, 5, 11), Date.UTC(2026, 5, 17), Date.UTC(2026, 5, 23)];
  const kickoffHoursUTC = [16, 19, 22, 1]; // four daily slots

  GROUPS.forEach((group, gi) => {
    const [t1, t2, t3, t4] = teamsInGroup(group).map((t) => t.id);
    const rounds: [string, string][][] = [
      [[t1, t2], [t3, t4]],
      [[t1, t3], [t4, t2]],
      [[t4, t1], [t2, t3]],
    ];

    rounds.forEach((pairs, md) => {
      pairs.forEach(([home, away], pi) => {
        const dayOffset = Math.floor(gi / 2); // two groups per day
        const slot = (gi % 2) * 2 + pi;
        const kickoff = new Date(
          mdStart[md] + dayOffset * 86_400_000 + kickoffHoursUTC[slot] * 3_600_000,
        ).toISOString();
        fixtures.push({
          id: `${group}${md * 2 + pi + 1}`,
          group: group as GroupId,
          home,
          away,
          kickoff,
          venue: VENUES[(gi * 3 + md * 5 + pi) % VENUES.length],
          matchday: (md + 1) as 1 | 2 | 3,
        });
      });
    });
  });

  return fixtures.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
}

export const FIXTURES: Fixture[] = buildGroupFixtures();

export const FIXTURE_BY_ID: Record<string, Fixture> = Object.fromEntries(
  FIXTURES.map((f) => [f.id, f]),
);
