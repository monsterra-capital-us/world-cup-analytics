"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, InjuryBadge, SectionTitle } from "@/components/ui";
import { Injury, MarketOdds } from "@/lib/types";

interface TeamLite {
  id: string;
  name: string;
  flag: string;
  keyPlayers: string[];
}

interface FixtureLite {
  id: string;
  group: string;
  home: string;
  away: string;
  kickoff: string;
  played: boolean;
}

export default function AdminClient({
  teams,
  fixtures,
  injuries,
  marketOdds,
  version,
}: {
  teams: TeamLite[];
  fixtures: FixtureLite[];
  injuries: Injury[];
  marketOdds: Record<string, MarketOdds>;
  version: number;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const teamById = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t])),
    [teams],
  );
  const pending = fixtures.filter((f) => !f.played);

  // result form
  const [fixtureId, setFixtureId] = useState(pending[0]?.id ?? "");
  const [homeGoals, setHomeGoals] = useState("0");
  const [awayGoals, setAwayGoals] = useState("0");

  // odds form
  const [oddsFixture, setOddsFixture] = useState(pending[0]?.id ?? "");
  const [oddsHome, setOddsHome] = useState("");
  const [oddsDraw, setOddsDraw] = useState("");
  const [oddsAway, setOddsAway] = useState("");
  const [oddsSource, setOddsSource] = useState("Pinnacle");

  // injury form
  const [injTeam, setInjTeam] = useState(teams[0]?.id ?? "");
  const [injPlayer, setInjPlayer] = useState("");
  const [injStatus, setInjStatus] = useState<Injury["status"]>("out");
  const [injDetail, setInjDetail] = useState("");

  async function call(path: string, init: RequestInit, successText: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(path, init);
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setMessage({ ok: true, text: successText });
      router.refresh();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Request failed" });
    } finally {
      setBusy(false);
    }
  }

  const selected = fixtures.find((f) => f.id === fixtureId);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold">Data Manager</h1>
        <p className="mt-1 text-sm text-muted">
          Record final scores as matches finish and keep squad availability
          current — every change immediately re-runs the full tournament
          simulation (state v{version}). Automated feeds can hit the same
          endpoints: <code className="rounded bg-surface-2 px-1.5 py-0.5">POST /api/results</code>{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5">POST /api/injuries</code>{" "}
          and <code className="rounded bg-surface-2 px-1.5 py-0.5">POST /api/odds</code>.
        </p>
      </header>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.ok
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* record result */}
        <Card>
          <SectionTitle
            title="Record a final score"
            hint="Updates both teams' Elo ratings and recomputes every probability"
          />
          <form
            className="space-y-4 px-5 pb-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!fixtureId) return;
              call(
                "/api/results",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    fixtureId,
                    homeGoals: Number(homeGoals),
                    awayGoals: Number(awayGoals),
                  }),
                },
                "Result recorded — predictions updated.",
              );
            }}
          >
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-muted">Fixture</span>
              <select
                value={fixtureId}
                onChange={(e) => setFixtureId(e.target.value)}
                className="w-full rounded-lg border border-edge bg-surface-2 px-3 py-2"
              >
                {pending.length === 0 && <option value="">All matches recorded</option>}
                {pending.map((f) => (
                  <option key={f.id} value={f.id}>
                    [{f.group}] {teamById[f.home].name} vs {teamById[f.away].name} —{" "}
                    {f.kickoff.slice(0, 10)}
                  </option>
                ))}
              </select>
            </label>
            {selected && (
              <div className="flex items-end gap-3">
                <label className="flex-1 text-sm">
                  <span className="mb-1 block text-xs text-muted">
                    {teamById[selected.home].flag} {teamById[selected.home].name}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={15}
                    value={homeGoals}
                    onChange={(e) => setHomeGoals(e.target.value)}
                    className="w-full rounded-lg border border-edge bg-surface-2 px-3 py-2 tabular-nums"
                  />
                </label>
                <span className="pb-2 text-muted">–</span>
                <label className="flex-1 text-sm">
                  <span className="mb-1 block text-xs text-muted">
                    {teamById[selected.away].flag} {teamById[selected.away].name}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={15}
                    value={awayGoals}
                    onChange={(e) => setAwayGoals(e.target.value)}
                    className="w-full rounded-lg border border-edge bg-surface-2 px-3 py-2 tabular-nums"
                  />
                </label>
              </div>
            )}
            <button
              type="submit"
              disabled={busy || !fixtureId}
              className="w-full rounded-lg bg-accent-dim px-4 py-2.5 text-sm font-semibold text-[#04110b] transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {busy ? "Updating model…" : "Record final score"}
            </button>
          </form>
        </Card>

        {/* add injury */}
        <Card>
          <SectionTitle
            title="Flag an injury / availability change"
            hint="out = full impact · doubtful = 50% · returning = 25% (importance-weighted)"
          />
          <form
            className="space-y-4 px-5 pb-5"
            onSubmit={(e) => {
              e.preventDefault();
              call(
                "/api/injuries",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    teamId: injTeam,
                    player: injPlayer,
                    status: injStatus,
                    detail: injDetail,
                  }),
                },
                `Injury flag added for ${injPlayer}.`,
              );
              setInjPlayer("");
              setInjDetail("");
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-xs text-muted">Team</span>
                <select
                  value={injTeam}
                  onChange={(e) => setInjTeam(e.target.value)}
                  className="w-full rounded-lg border border-edge bg-surface-2 px-3 py-2"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs text-muted">Status</span>
                <select
                  value={injStatus}
                  onChange={(e) => setInjStatus(e.target.value as Injury["status"])}
                  className="w-full rounded-lg border border-edge bg-surface-2 px-3 py-2"
                >
                  <option value="out">Out</option>
                  <option value="doubtful">Doubtful</option>
                  <option value="returning">Returning</option>
                </select>
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-muted">
                Player (key players have the largest model impact)
              </span>
              <input
                value={injPlayer}
                onChange={(e) => setInjPlayer(e.target.value)}
                list="key-players"
                required
                placeholder="e.g. Kylian Mbappé"
                className="w-full rounded-lg border border-edge bg-surface-2 px-3 py-2"
              />
              <datalist id="key-players">
                {teamById[injTeam]?.keyPlayers.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-muted">Detail (optional)</span>
              <input
                value={injDetail}
                onChange={(e) => setInjDetail(e.target.value)}
                placeholder="e.g. hamstring, out 2 weeks"
                className="w-full rounded-lg border border-edge bg-surface-2 px-3 py-2"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-accent-dim px-4 py-2.5 text-sm font-semibold text-[#04110b] transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {busy ? "Updating model…" : "Add injury flag"}
            </button>
          </form>
        </Card>
      </div>


      {/* market odds */}
      <Card>
        <SectionTitle
          title="Market odds (optional, sharpens predictions)"
          hint="Enter pre-match decimal odds from a sharp book (e.g. Pinnacle). The vig is stripped and the de-vigged probabilities are blended into every forecast; the Model page then scores model vs market vs blend."
        />
        <div className="grid gap-6 px-5 pb-5 lg:grid-cols-2">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!oddsFixture) return;
              call(
                "/api/odds",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    fixtureId: oddsFixture,
                    home: Number(oddsHome),
                    draw: Number(oddsDraw),
                    away: Number(oddsAway),
                    source: oddsSource,
                  }),
                },
                "Odds recorded — predictions now market-anchored for this match.",
              );
            }}
          >
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-muted">Fixture</span>
              <select
                value={oddsFixture}
                onChange={(e) => setOddsFixture(e.target.value)}
                className="w-full rounded-lg border border-edge bg-surface-2 px-3 py-2"
              >
                {pending.map((f) => (
                  <option key={f.id} value={f.id}>
                    [{f.group}] {teamById[f.home].name} vs {teamById[f.away].name}
                    {marketOdds[f.id] ? " (odds set)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {([
                ["Home win", oddsHome, setOddsHome],
                ["Draw", oddsDraw, setOddsDraw],
                ["Away win", oddsAway, setOddsAway],
              ] as const).map(([label, value, setter]) => (
                <label key={label} className="text-sm">
                  <span className="mb-1 block text-xs text-muted">{label}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1.01"
                    required
                    placeholder="2.50"
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    className="w-full rounded-lg border border-edge bg-surface-2 px-3 py-2 tabular-nums"
                  />
                </label>
              ))}
            </div>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-muted">Source</span>
              <input
                value={oddsSource}
                onChange={(e) => setOddsSource(e.target.value)}
                className="w-full rounded-lg border border-edge bg-surface-2 px-3 py-2"
              />
            </label>
            <button
              type="submit"
              disabled={busy || !oddsFixture}
              className="w-full rounded-lg bg-accent-dim px-4 py-2.5 text-sm font-semibold text-[#04110b] transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {busy ? "Updating model…" : "Save market odds"}
            </button>
          </form>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted">Recorded odds</p>
            {Object.values(marketOdds).length === 0 && (
              <p className="text-sm text-muted">
                None yet — predictions are running on the pure model.
              </p>
            )}
            {Object.values(marketOdds).map((o) => {
              const f = fixtures.find((x) => x.id === o.fixtureId);
              if (!f) return null;
              return (
                <div
                  key={o.fixtureId}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl bg-surface-2/60 px-4 py-2.5 text-sm"
                >
                  <span className="min-w-0 flex-1 basis-48 truncate">
                    {teamById[f.home].flag} {teamById[f.home].name} v{" "}
                    {teamById[f.away].flag} {teamById[f.away].name}
                  </span>
                  <span className="tabular-nums text-muted">
                    {o.home.toFixed(2)} / {o.draw.toFixed(2)} / {o.away.toFixed(2)}
                  </span>
                  {o.source && (
                    <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted">
                      {o.source}
                    </span>
                  )}
                  <button
                    onClick={() =>
                      call(
                        `/api/odds?fixtureId=${encodeURIComponent(o.fixtureId)}`,
                        { method: "DELETE" },
                        "Odds removed — match back to pure model.",
                      )
                    }
                    disabled={busy}
                    className="rounded-lg border border-edge px-3 py-1 text-xs text-muted transition-colors hover:border-danger/60 hover:text-danger disabled:opacity-40"
                  >
                    Clear
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* current injuries */}
      <Card>
        <SectionTitle
          title="Active flags"
          hint="Clear a flag when the player is fit again — predictions update instantly"
        />
        <div className="space-y-2 px-5 pb-5">
          {injuries.length === 0 && (
            <p className="py-3 text-sm text-muted">No active injury flags.</p>
          )}
          {injuries.map((inj) => (
            <div
              key={inj.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl bg-surface-2/60 px-4 py-2.5 text-sm"
            >
              <span className="text-base">{teamById[inj.teamId]?.flag}</span>
              <span className="font-medium">{inj.player}</span>
              <InjuryBadge status={inj.status} />
              <span className="min-w-0 flex-1 basis-48 truncate text-xs text-muted">
                {teamById[inj.teamId]?.name}
                {inj.detail ? ` — ${inj.detail}` : ""} · reported {inj.reportedAt}
              </span>
              <button
                onClick={() =>
                  call(
                    `/api/injuries?id=${encodeURIComponent(inj.id)}`,
                    { method: "DELETE" },
                    `Cleared flag for ${inj.player}.`,
                  )
                }
                disabled={busy}
                className="rounded-lg border border-edge px-3 py-1 text-xs text-muted transition-colors hover:border-danger/60 hover:text-danger disabled:opacity-40"
              >
                Clear
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
