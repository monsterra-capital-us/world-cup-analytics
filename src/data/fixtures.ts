import { Fixture, GroupId } from "@/lib/types";
import { GROUPS, teamsInGroup } from "./teams";

type HostCountry = "USA" | "MEX" | "CAN";

const VENUES: { name: string; country: HostCountry }[] = [
  { name: "Estadio Azteca, Mexico City", country: "MEX" },
  { name: "MetLife Stadium, New York/New Jersey", country: "USA" },
  { name: "SoFi Stadium, Los Angeles", country: "USA" },
  { name: "AT&T Stadium, Dallas", country: "USA" },
  { name: "Hard Rock Stadium, Miami", country: "USA" },
  { name: "Mercedes-Benz Stadium, Atlanta", country: "USA" },
  { name: "NRG Stadium, Houston", country: "USA" },
  { name: "Arrowhead Stadium, Kansas City", country: "USA" },
  { name: "Lincoln Financial Field, Philadelphia", country: "USA" },
  { name: "Lumen Field, Seattle", country: "USA" },
  { name: "Levi's Stadium, San Francisco Bay Area", country: "USA" },
  { name: "Gillette Stadium, Boston", country: "USA" },
  { name: "BMO Field, Toronto", country: "CAN" },
  { name: "BC Place, Vancouver", country: "CAN" },
  { name: "Estadio BBVA, Monterrey", country: "MEX" },
  { name: "Estadio Akron, Guadalajara", country: "MEX" },
];

/** host teams play their group matches in their own country, as in the real schedule */
const HOST_VENUES: Record<string, number[]> = {
  MEX: [0, 14, 15], // Azteca, Monterrey, Guadalajara
  USA: [2, 9, 3], // SoFi, Seattle, Dallas
  CAN: [12, 13, 12], // Toronto, Vancouver, Toronto
};

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

        // route host-nation matches to that country's venues
        const host = [home, away].find((t) => HOST_VENUES[t]);
        const venueIdx = host
          ? HOST_VENUES[host][md]
          : (gi * 3 + md * 5 + pi) % VENUES.length;
        const venue = VENUES[venueIdx];

        fixtures.push({
          id: `${group}${md * 2 + pi + 1}`,
          group: group as GroupId,
          home,
          away,
          kickoff,
          venue: venue.name,
          country: venue.country,
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
