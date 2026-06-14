import { notFound } from "next/navigation";
import Link from "next/link";
import { getPredictions, loadState } from "@/lib/store";
import { FIXTURE_BY_ID } from "@/data/fixtures";
import { TEAM_BY_ID } from "@/data/teams";
import { pct, signed } from "@/lib/format";
import { LocalTime } from "@/components/LocalTime";
import { Card, CompareBars, InjuryBadge, SectionTitle, TeamChip, WdlBar } from "@/components/ui";
import { TeamFactors } from "@/lib/types";

export const dynamic = "force-dynamic";

const HEAT_MAX_GOALS = 5; // displayed slice of the full matrix

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fixture = FIXTURE_BY_ID[id];
  if (!fixture) notFound();

  const predictions = await getPredictions();
  const state = await loadState();
  const mp = predictions.matchPredictions[id];
  const result = state.results[id];
  const home = TEAM_BY_ID[fixture.home];
  const away = TEAM_BY_ID[fixture.away];
  const heatPeak = Math.max(...mp.scoreMatrix.flat());

  return (
    <div className="space-y-6">
      <Link href="/matches" className="text-xs text-accent hover:underline">
        ← All fixtures
      </Link>

      {/* header */}
      <Card className="px-4 py-4 sm:px-6 sm:py-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Group {fixture.group} · Matchday {fixture.matchday} · {fixture.venue} ·{" "}
          <LocalTime iso={fixture.kickoff} />
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-x-6">
          <span className="text-xl font-bold sm:text-2xl">
            {home.flag} {home.name}
          </span>
          {result ? (
            <span className="rounded-xl bg-surface-2 px-3 py-1 text-xl font-black tabular-nums sm:px-4 sm:py-1.5 sm:text-2xl">
              {result.homeGoals}–{result.awayGoals}
            </span>
          ) : (
            <span className="text-lg text-muted sm:text-xl">vs</span>
          )}
          <span className="text-xl font-bold sm:text-2xl">
            {away.flag} {away.name}
          </span>
        </div>

        {result && (
          <p className="mt-3 text-sm text-muted">
            Full time. This result is folded into both teams&apos; Elo ratings — the
            panels below are the model&apos;s pre-match view.
          </p>
        )}

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {/* outcome panel */}
          <div className="rounded-2xl bg-surface-2/40 p-4 sm:p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
              {result ? "Pre-match probabilities" : "Match outcome"}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <OutcomeStat label={home.id} sub="win" value={mp.pHome} color="var(--accent)" />
              <OutcomeStat label="Draw" sub="" value={mp.pDraw} color="var(--muted)" />
              <OutcomeStat label={away.id} sub="win" value={mp.pAway} color="var(--info)" />
            </div>
            <WdlBar className="mt-4" pHome={mp.pHome} pDraw={mp.pDraw} pAway={mp.pAway} />
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <Stat label="Expected goals">
                {home.id} {mp.expHomeGoals.toFixed(2)} · {away.id} {mp.expAwayGoals.toFixed(2)}
              </Stat>
              <Stat label="Host advantage">
                {mp.homeEdge === 0
                  ? "Neutral venue"
                  : `${mp.homeEdge > 0 ? home.id : away.id} +${Math.abs(mp.homeEdge)} Elo`}
              </Stat>
            </dl>
          </div>

          {/* right panel: market benchmark when present, else projected score */}
          <div className="rounded-2xl bg-surface-2/40 p-4 sm:p-5">
            {mp.market ? (
              <>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                  Our model vs {mp.market.source ?? "market"}
                </p>
                <div className="mt-3">
                  <CompareBars
                    labels={[`${home.id} win`, "Draw", `${away.id} win`]}
                    model={[mp.pHome, mp.pDraw, mp.pAway]}
                    market={[mp.market.pHome, mp.market.pDraw, mp.market.pAway]}
                  />
                </div>
              </>
            ) : (
              <>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                  Projected scoreline
                </p>
                <div className="mt-3 flex items-baseline gap-3">
                  <span className="text-3xl font-black tabular-nums">
                    {mp.topScores[0].home}
                    <span className="mx-1.5 text-muted">–</span>
                    {mp.topScores[0].away}
                  </span>
                  <span className="text-sm text-muted">
                    {home.id} v {away.id} · {pct(mp.topScores[0].p)} likely
                  </span>
                </div>
                <p className="mt-4 mb-1.5 text-[11px] uppercase tracking-wider text-muted">
                  Other likely results
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {mp.topScores.slice(1, 5).map((s) => (
                    <span
                      key={`${s.home}-${s.away}`}
                      className="rounded-lg bg-surface px-2.5 py-1 text-xs tabular-nums shadow-sm"
                    >
                      <span className="font-bold">
                        {s.home}–{s.away}
                      </span>{" "}
                      <span className="text-muted">{pct(s.p)}</span>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* score heatmap */}
        <Card>
          <SectionTitle
            title="Scoreline probabilities"
            hint={`Dixon-Coles adjusted Poisson model — rows ${home.id}, columns ${away.id}`}
          />
          <div className="px-5 pb-5">
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `auto repeat(${HEAT_MAX_GOALS + 1}, 1fr)` }}
            >
              <span />
              {Array.from({ length: HEAT_MAX_GOALS + 1 }, (_, b) => (
                <span key={b} className="text-center text-xs text-muted tabular-nums">
                  {b}
                </span>
              ))}
              {mp.scoreMatrix.slice(0, HEAT_MAX_GOALS + 1).map((row, a) => (
                <Row key={a} a={a} row={row.slice(0, HEAT_MAX_GOALS + 1)} peak={heatPeak} />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {mp.topScores.map((s) => (
                <span
                  key={`${s.home}-${s.away}`}
                  className="rounded-lg bg-surface-2 px-2.5 py-1 text-xs tabular-nums"
                >
                  <span className="font-bold">
                    {s.home}–{s.away}
                  </span>{" "}
                  <span className="text-muted">{pct(s.p)}</span>
                </span>
              ))}
            </div>
          </div>
        </Card>

        {/* model factors */}
        <Card>
          <SectionTitle
            title="Model factors"
            hint="How each team's effective rating is built"
          />
          <div className="space-y-5 px-5 pb-5">
            {mp.factors.map((f) => (
              <FactorBlock key={f.teamId} factors={f} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function OutcomeStat({
  label,
  sub,
  value,
  color,
}: {
  label: string;
  sub: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-surface px-2 py-2.5 text-center shadow-sm">
      <p className="text-lg font-bold tabular-nums sm:text-xl" style={{ color }}>
        {pct(value)}
      </p>
      <p className="mt-0.5 text-[11px] text-muted">
        {label}
        {sub ? ` ${sub}` : ""}
      </p>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-0.5 tabular-nums">{children}</dd>
    </div>
  );
}

function Row({ a, row, peak }: { a: number; row: number[]; peak: number }) {
  return (
    <>
      <span className="pr-1 text-right text-xs text-muted tabular-nums">{a}</span>
      {row.map((p, b) => (
        <div
          key={b}
          className="grid aspect-[5/3] place-items-center rounded-md text-[11px] tabular-nums"
          style={{
            backgroundColor: `rgba(61, 92, 245, ${(p / peak) * 0.8 + 0.03})`,
            color: p / peak > 0.55 ? "#ffffff" : undefined,
          }}
          title={`P(${a}–${b}) = ${pct(p, 2)}`}
        >
          {p >= 0.005 ? pct(p, 1) : ""}
        </div>
      ))}
    </>
  );
}

function FactorBlock({ factors }: { factors: TeamFactors }) {
  const team = TEAM_BY_ID[factors.teamId];
  return (
    <div className="rounded-xl bg-surface-2/60 p-4">
      <div className="flex items-center justify-between">
        <TeamChip teamId={factors.teamId} bold />
        <span className="text-sm font-bold tabular-nums">
          {Math.round(factors.effectiveRating)}
          <span className="ml-1 text-xs font-normal text-muted">effective</span>
        </span>
      </div>
      <dl className="mt-3 space-y-1.5 text-xs">
        <FactorRow label="Pre-tournament Elo" value={String(Math.round(factors.baseElo))} />
        <FactorRow
          label="In-tournament form (Elo Δ)"
          value={signed(factors.currentElo - factors.baseElo, 1)}
          tone={
            factors.currentElo > factors.baseElo
              ? "good"
              : factors.currentElo < factors.baseElo
                ? "bad"
                : undefined
          }
        />
        <FactorRow
          label="Injury penalty"
          value={factors.injuryPenalty > 0 ? `−${factors.injuryPenalty.toFixed(1)}` : "0"}
          tone={factors.injuryPenalty > 0 ? "bad" : undefined}
        />
      </dl>
      {factors.injuries.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-edge/60 pt-3">
          {factors.injuries.map((inj) => (
            <li key={inj.id} className="flex items-center gap-2 text-xs">
              <InjuryBadge status={inj.status} />
              <span className="font-medium">{inj.player}</span>
              <span className="truncate text-muted">{inj.detail}</span>
            </li>
          ))}
        </ul>
      )}
      {factors.injuries.length === 0 && (
        <p className="mt-3 border-t border-edge/60 pt-3 text-xs text-muted">
          No injury concerns — full-strength squad assumed. Key players:{" "}
          {team.keyPlayers.map((p) => p.name).join(", ")}.
        </p>
      )}
    </div>
  );
}

function FactorRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd
        className={`tabular-nums ${tone === "good" ? "text-success" : tone === "bad" ? "text-danger" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
