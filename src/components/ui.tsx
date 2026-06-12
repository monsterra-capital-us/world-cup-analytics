import Link from "next/link";
import { TEAM_BY_ID } from "@/data/teams";
import { pct } from "@/lib/format";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 rounded-2xl border border-edge bg-surface shadow-[0_1px_2px_rgba(0,9,26,0.04)] ${className}`}
    >
      {children}
    </section>
  );
}

export function SectionTitle({
  title,
  hint,
  right,
}: {
  title: string;
  hint?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-5 pt-4 pb-3">
      <div>
        {/* kit .eyebrow — mono micro-label in capital blue */}
        <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-accent">
          {title}
        </h2>
        {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

export function TeamChip({
  teamId,
  bold = false,
  short = false,
}: {
  teamId: string;
  bold?: boolean;
  short?: boolean;
}) {
  const t = TEAM_BY_ID[teamId];
  return (
    <span className={`inline-flex min-w-0 max-w-full items-center gap-2 ${bold ? "font-semibold" : ""}`}>
      <span className="shrink-0 text-base leading-none">{t.flag}</span>
      {short ? (
        <span className="truncate">{t.id}</span>
      ) : (
        <span className="truncate">
          {/* 3-letter code on phones, full name from sm up */}
          <span className="sm:hidden">{t.id}</span>
          <span className="hidden sm:inline">{t.name}</span>
        </span>
      )}
    </span>
  );
}

/** Three-segment home/draw/away probability bar */
export function WdlBar({
  pHome,
  pDraw,
  pAway,
  className = "",
}: {
  pHome: number;
  pDraw: number;
  pAway: number;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface-2">
        <div className="bg-accent-dim" style={{ width: `${pHome * 100}%` }} />
        <div className="bg-slate-400/80" style={{ width: `${pDraw * 100}%` }} />
        <div className="bg-info" style={{ width: `${pAway * 100}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] tabular-nums text-muted">
        <span className="text-accent">{pct(pHome)}</span>
        <span>draw {pct(pDraw)}</span>
        <span className="text-info">{pct(pAway)}</span>
      </div>
    </div>
  );
}

export const STATUS_STYLE: Record<string, string> = {
  out: "bg-danger/15 text-danger",
  doubtful: "bg-gold/15 text-gold",
  returning: "bg-info/15 text-info",
};

export function InjuryBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.14em] ${STATUS_STYLE[status] ?? "bg-surface-2 text-muted"}`}
    >
      {status}
    </span>
  );
}

export function MatchLink({
  fixtureId,
  children,
}: {
  fixtureId: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/match/${fixtureId}`}
      className="block min-w-0 rounded-xl transition-colors hover:bg-surface-2/60"
    >
      {children}
    </Link>
  );
}
