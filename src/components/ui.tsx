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
      className={`rounded-2xl border border-edge bg-surface/80 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset] ${className}`}
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
        <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
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
    <span className={`inline-flex items-center gap-2 ${bold ? "font-semibold" : ""}`}>
      <span className="text-base leading-none">{t.flag}</span>
      <span className="truncate">{short ? t.id : t.name}</span>
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
        <div className="bg-accent" style={{ width: `${pHome * 100}%` }} />
        <div className="bg-slate-500/70" style={{ width: `${pDraw * 100}%` }} />
        <div className="bg-sky-400" style={{ width: `${pAway * 100}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] tabular-nums text-muted">
        <span className="text-accent">{pct(pHome)}</span>
        <span>draw {pct(pDraw)}</span>
        <span className="text-sky-400">{pct(pAway)}</span>
      </div>
    </div>
  );
}

export const STATUS_STYLE: Record<string, string> = {
  out: "bg-danger/15 text-danger",
  doubtful: "bg-gold/15 text-gold",
  returning: "bg-sky-400/15 text-sky-400",
};

export function InjuryBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLE[status] ?? "bg-surface-2 text-muted"}`}
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
      className="block rounded-xl transition-colors hover:bg-surface-2/60"
    >
      {children}
    </Link>
  );
}
