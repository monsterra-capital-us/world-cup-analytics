import Link from "next/link";
import { getPredictions, loadState } from "@/lib/store";
import { FIXTURES } from "@/data/fixtures";
import { TEAM_BY_ID } from "@/data/teams";
import { kickoffLabel, pct, signed } from "@/lib/format";
import {
  Card,
  InjuryBadge,
  MatchLink,
  SectionTitle,
  TeamChip,
  WdlBar,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default function Dashboard() {
  const predictions = getPredictions();
  const state = loadState();

  const played = Object.keys(state.results).length;
  const upcoming = FIXTURES.filter((f) => !state.results[f.id]).slice(0, 6);
  const recent = Object.values(state.results)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
    .slice(0, 6);
  const contenders = predictions.outlooks.slice(0, 12);
  const maxTitle = contenders[0]?.pChampion || 1;
  const stageTable = predictions.outlooks.slice(0, 16);

  return (
    <div className="space-y-6">
      {/* hero strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Title favourite">
          <span className="flex items-center gap-2 text-lg font-bold">
            <TeamChip teamId={contenders[0].teamId} bold />
            <span className="text-accent">{pct(contenders[0].pChampion)}</span>
          </span>
        </Stat>
        <Stat label="Group stage progress">
          <span className="text-lg font-bold tabular-nums">
            {played} <span className="text-muted font-normal">/ 72 matches</span>
          </span>
        </Stat>
        <Stat label="Active injury flags">
          <span className="text-lg font-bold tabular-nums">
            {state.injuries.length}{" "}
            <span className="text-muted font-normal">affecting ratings</span>
          </span>
        </Stat>
        <Stat label="Model run">
          <span className="text-lg font-bold tabular-nums">
            {predictions.simulations.toLocaleString()}
            <span className="text-muted font-normal"> sims · v{predictions.stateVersion}</span>
          </span>
        </Stat>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* title race */}
        <Card className="lg:col-span-3">
          <SectionTitle
            title="Title race"
            hint="Probability of winning the World Cup — Monte Carlo over the full remaining tournament"
          />
          <div className="space-y-1 px-5 pb-5">
            {contenders.map((o, i) => {
              const t = TEAM_BY_ID[o.teamId];
              const eloDelta = (state.elo[o.teamId] ?? t.baseElo) - t.baseElo;
              return (
                <div key={o.teamId} className="flex items-center gap-3 py-1">
                  <span className="w-5 text-right text-xs tabular-nums text-muted">
                    {i + 1}
                  </span>
                  <span className="w-44 shrink-0 truncate text-sm">
                    <TeamChip teamId={o.teamId} bold={i < 3} />
                  </span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={`h-full rounded-full ${i === 0 ? "bg-gold" : "bg-accent-dim"}`}
                      style={{ width: `${(o.pChampion / maxTitle) * 100}%` }}
                    />
                  </div>
                  <span className="w-14 text-right text-sm font-semibold tabular-nums">
                    {pct(o.pChampion)}
                  </span>
                  <span
                    className={`w-12 text-right text-[11px] tabular-nums ${
                      eloDelta > 0.5
                        ? "text-accent"
                        : eloDelta < -0.5
                          ? "text-danger"
                          : "text-muted"
                    }`}
                    title="Elo change since tournament start"
                  >
                    {signed(eloDelta)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* injuries */}
        <Card className="lg:col-span-2">
          <SectionTitle
            title="Injury watch"
            hint="Each flag lowers the team's effective rating in every forecast"
            right={
              <Link href="/admin" className="text-xs text-accent hover:underline">
                Manage →
              </Link>
            }
          />
          <div className="space-y-2 px-5 pb-5">
            {state.injuries.length === 0 && (
              <p className="py-4 text-sm text-muted">
                No active injury flags. Add squad news in the Data Manager.
              </p>
            )}
            {state.injuries.map((inj) => (
              <div
                key={inj.id}
                className="flex items-start gap-3 rounded-xl bg-surface-2/60 px-3 py-2.5"
              >
                <span className="mt-0.5 text-base">{TEAM_BY_ID[inj.teamId].flag}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{inj.player}</span>
                    <InjuryBadge status={inj.status} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {TEAM_BY_ID[inj.teamId].name}
                    {inj.detail ? ` — ${inj.detail}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* upcoming matches */}
        <Card>
          <SectionTitle
            title="Next matches"
            hint="Win/draw/win probabilities and the model's most likely score"
            right={
              <Link href="/matches" className="text-xs text-accent hover:underline">
                All fixtures →
              </Link>
            }
          />
          <div className="space-y-1 px-3 pb-4">
            {upcoming.map((f) => {
              const mp = predictions.matchPredictions[f.id];
              const top = mp.topScores[0];
              return (
                <MatchLink key={f.id} fixtureId={f.id}>
                  <div className="px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                          {f.group}
                        </span>
                        <TeamChip teamId={f.home} />
                        <span className="text-muted">vs</span>
                        <TeamChip teamId={f.away} />
                      </span>
                      <span className="shrink-0 text-xs text-muted tabular-nums">
                        {kickoffLabel(f.kickoff)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-4">
                      <WdlBar
                        pHome={mp.pHome}
                        pDraw={mp.pDraw}
                        pAway={mp.pAway}
                        className="flex-1"
                      />
                      <span className="shrink-0 rounded-lg bg-surface-2 px-2 py-1 text-xs tabular-nums">
                        likely{" "}
                        <span className="font-bold">
                          {top.home}–{top.away}
                        </span>{" "}
                        <span className="text-muted">({pct(top.p)})</span>
                      </span>
                    </div>
                  </div>
                </MatchLink>
              );
            })}
            {upcoming.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted">Group stage complete.</p>
            )}
          </div>
        </Card>

        {/* recent results */}
        <Card>
          <SectionTitle
            title="Latest results"
            hint="Each final score updates Elo ratings and re-runs the simulation"
          />
          <div className="space-y-1 px-3 pb-4">
            {recent.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted">
                No results yet — the tournament starts today. Record final scores
                in the Data Manager (or POST to /api/results) as matches finish.
              </p>
            )}
            {recent.map((r) => {
              const f = FIXTURES.find((x) => x.id === r.fixtureId)!;
              return (
                <MatchLink key={r.fixtureId} fixtureId={r.fixtureId}>
                  <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                        {f.group}
                      </span>
                      <TeamChip teamId={f.home} />
                      <span className="rounded-lg bg-surface-2 px-2 py-0.5 font-bold tabular-nums">
                        {r.homeGoals}–{r.awayGoals}
                      </span>
                      <TeamChip teamId={f.away} />
                    </span>
                    <span className="shrink-0 text-xs text-muted">FT</span>
                  </div>
                </MatchLink>
              );
            })}
          </div>
        </Card>
      </div>

      {/* stage probabilities */}
      <Card>
        <SectionTitle
          title="Road to the final"
          hint="Probability of reaching each stage, top 16 teams by title odds"
          right={
            <Link href="/groups" className="text-xs text-accent hover:underline">
              Group detail →
            </Link>
          }
        />
        <div className="overflow-x-auto px-5 pb-5">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted">
                <th className="pb-2 font-medium">Team</th>
                <th className="pb-2 text-right font-medium">Exp. pts</th>
                <th className="pb-2 text-right font-medium">R32</th>
                <th className="pb-2 text-right font-medium">R16</th>
                <th className="pb-2 text-right font-medium">QF</th>
                <th className="pb-2 text-right font-medium">SF</th>
                <th className="pb-2 text-right font-medium">Final</th>
                <th className="pb-2 text-right font-medium">Champion</th>
              </tr>
            </thead>
            <tbody>
              {stageTable.map((o) => (
                <tr key={o.teamId} className="border-t border-edge/60">
                  <td className="py-2">
                    <TeamChip teamId={o.teamId} />
                  </td>
                  <td className="py-2 text-right tabular-nums text-muted">
                    {o.expGroupPts.toFixed(1)}
                  </td>
                  {[o.pR32, o.pR16, o.pQF, o.pSF, o.pFinal].map((p, i) => (
                    <td key={i} className="py-2 text-right tabular-nums">
                      <CellProb p={p} />
                    </td>
                  ))}
                  <td className="py-2 text-right font-semibold tabular-nums text-accent">
                    {pct(o.pChampion)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card className="px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-muted">{label}</p>
      <div className="mt-1">{children}</div>
    </Card>
  );
}

function CellProb({ p }: { p: number }) {
  const alpha = Math.min(0.85, p) * 0.35;
  return (
    <span
      className="inline-block min-w-14 rounded px-1.5 py-0.5"
      style={{ backgroundColor: `rgba(16, 185, 129, ${alpha})` }}
    >
      {pct(p)}
    </span>
  );
}
