"use client";

import { useSyncExternalStore } from "react";

type Variant = "datetime" | "time";

function format(iso: string, variant: Variant, timeZone?: string): string {
  const base: Intl.DateTimeFormatOptions =
    variant === "time"
      ? { hour: "2-digit", minute: "2-digit", hour12: false, timeZoneName: "short" }
      : {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZoneName: "short",
        };
  const opts = timeZone ? { ...base, timeZone } : base;
  // Intl emits "GMT+8"-style names; keep the explicit UTC label readable.
  return new Intl.DateTimeFormat("en-GB", opts).format(new Date(iso)).replace("GMT", "UTC");
}

// server (and first client paint) → UTC; after hydration → the viewer's zone
const noop = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * Renders a kickoff time in the viewer's own timezone. Server and the first
 * client paint render UTC so hydration matches; once hydrated, the same
 * instant is shown on the viewer's local clock.
 */
export function LocalTime({
  iso,
  variant = "datetime",
  className,
}: {
  iso: string;
  variant?: Variant;
  className?: string;
}) {
  const hydrated = useSyncExternalStore(noop, onClient, onServer);
  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {format(iso, variant, hydrated ? undefined : "UTC")}
    </time>
  );
}
