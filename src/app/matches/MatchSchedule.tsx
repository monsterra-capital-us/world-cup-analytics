"use client";

import { useSyncExternalStore } from "react";
import { LocalTime } from "@/components/LocalTime";
import { Card, MatchLink, TeamChip, WdlBar } from "@/components/ui";
import { pct } from "@/lib/format";

export interface MatchRow {
  id: string;
  group: string;
  home: string;
  away: string;
  kickoff: string;
  result: { h: number; a: number } | null;
  pHome: number;
  pDraw: number;
  pAway: number;
  topH: number;
  topA: number;
  topP: number;
}

// server + first client paint → UTC; after hydration → the viewer's zone
const noop = () => () => {};
const onClient = () => true;
const onServer = () => false;

function dayKeyAndLabel(iso: string, local: boolean): { key: string; label: string } {
  const d = new Date(iso);
  if (local) {
    return {
      key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
      label: d.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    };
  }
  return {
    key: iso.slice(0, 10),
    label: new Intl.DateTimeFormat("en-GB", {
      timeZone: "UTC",
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(d),
  };
}

export function MatchSchedule({ rows }: { rows: MatchRow[] }) {
  const hydrated = useSyncExternalStore(noop, onClient, onServer);

  // rows arrive pre-sorted by kickoff; group preserving that order
  const groups: { key: string; label: string; rows: MatchRow[] }[] = [];
  const index = new Map<string, number>();
  for (const r of rows) {
    const { key, label } = dayKeyAndLabel(r.kickoff, hydrated);
    let i = index.get(key);
    if (i === undefined) {
      i = groups.length;
      index.set(key, i);
      groups.push({ key, label, rows: [] });
    }
    groups[i].rows.push(r);
  }

  return (
    <>
      {groups.map((g) => (
        <Card key={g.key}>
          <h2
            className="px-5 pt-4 pb-2 text-sm font-semibold text-muted"
            suppressHydrationWarning
          >
            {g.label}
          </h2>
          <div className="grid gap-1 px-3 pb-4 lg:grid-cols-2">
            {g.rows.map((f) => (
              <MatchLink key={f.id} fixtureId={f.id}>
                <div className="px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                        {f.group}
                      </span>
                      <TeamChip teamId={f.home} />
                      {f.result ? (
                        <span className="rounded-lg bg-surface-2 px-2 py-0.5 font-bold tabular-nums">
                          {f.result.h}–{f.result.a}
                        </span>
                      ) : (
                        <span className="text-muted">vs</span>
                      )}
                      <TeamChip teamId={f.away} />
                    </span>
                    <span className="shrink-0 text-xs text-muted tabular-nums">
                      {f.result ? "FT" : <LocalTime iso={f.kickoff} variant="time" />}
                    </span>
                  </div>
                  {!f.result && (
                    <div className="mt-2 flex items-center gap-4">
                      <WdlBar pHome={f.pHome} pDraw={f.pDraw} pAway={f.pAway} className="flex-1" />
                      <span className="shrink-0 text-xs tabular-nums text-muted">
                        {f.topH}–{f.topA} ({pct(f.topP)})
                      </span>
                    </div>
                  )}
                </div>
              </MatchLink>
            ))}
          </div>
        </Card>
      ))}
    </>
  );
}
