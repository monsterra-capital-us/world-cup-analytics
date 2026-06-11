import { getPredictions } from "@/lib/store";
import { GROUPS, teamsInGroup } from "@/data/teams";
import { pct } from "@/lib/format";
import { Card, SectionTitle, TeamChip } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const predictions = await getPredictions();
  const outlookById = Object.fromEntries(
    predictions.outlooks.map((o) => [o.teamId, o]),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold">Group stage</h1>
        <p className="mt-1 text-sm text-muted">
          Live standings from recorded results. <span className="text-foreground">Adv%</span> is
          the simulated probability of reaching the round of 32 (top two plus the
          eight best third-placed teams advance).
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {GROUPS.map((g) => {
          const rows = predictions.standings[g] ?? [];
          const display = rows.length
            ? rows
            : teamsInGroup(g).map((t) => ({
                teamId: t.id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0,
              }));
          return (
            <Card key={g}>
              <SectionTitle title={`Group ${g}`} />
              <div className="px-4 pb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-right text-[11px] uppercase tracking-wider text-muted">
                      <th className="pb-1.5 text-left font-medium">Team</th>
                      <th className="pb-1.5 font-medium">P</th>
                      <th className="pb-1.5 font-medium">GD</th>
                      <th className="pb-1.5 font-medium">Pts</th>
                      <th className="pb-1.5 font-medium">Adv%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {display.map((row, i) => {
                      const o = outlookById[row.teamId];
                      return (
                        <tr key={row.teamId} className="border-t border-edge/60">
                          <td className="py-1.5 pr-2">
                            <span className="flex items-center gap-1.5">
                              <span
                                className={`inline-block size-1.5 rounded-full ${
                                  i < 2 ? "bg-accent" : i === 2 ? "bg-gold" : "bg-surface-2"
                                }`}
                                title={i < 2 ? "direct qualification spot" : i === 2 ? "possible best-third spot" : ""}
                              />
                              <TeamChip teamId={row.teamId} />
                            </span>
                          </td>
                          <td className="py-1.5 text-right tabular-nums text-muted">
                            {row.played}
                          </td>
                          <td className="py-1.5 text-right tabular-nums text-muted">
                            {row.gf - row.ga > 0 ? "+" : ""}
                            {row.gf - row.ga}
                          </td>
                          <td className="py-1.5 text-right font-semibold tabular-nums">
                            {row.pts}
                          </td>
                          <td className="py-1.5 text-right tabular-nums text-accent">
                            {o ? pct(o.pR32, 0) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
