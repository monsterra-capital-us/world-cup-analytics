export function pct(p: number, digits = 1): string {
  if (p > 0 && p < 0.001) return "<0.1%";
  return `${(p * 100).toFixed(digits)}%`;
}

export function signed(n: number, digits = 0): string {
  const v = n.toFixed(digits);
  return n > 0 ? `+${v}` : v;
}

export function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
