import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import "./globals.css";

// Monsterra brand fonts, self-hosted (extracted from the Mobile UI kit)
const fontHead = localFont({
  src: "../fonts/hanken-grotesk-latin.woff2",
  weight: "100 900",
  variable: "--font-head",
});

const fontBody = localFont({
  src: "../fonts/nunito-sans-latin.woff2",
  weight: "100 900",
  variable: "--font-body",
});

const fontMono = localFont({
  src: [
    { path: "../fonts/ibm-plex-mono-400-latin.woff2", weight: "400" },
    { path: "../fonts/ibm-plex-mono-500-latin.woff2", weight: "500" },
  ],
  variable: "--font-plex-mono",
});

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};

export const metadata: Metadata = {
  title: "WC26 Analytics — Monsterra Capital",
  description:
    "Live tournament predictions for the FIFA World Cup 2026: title odds, score forecasts and injury-adjusted team ratings, recomputed after every match.",
};

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/matches", label: "Matches" },
  { href: "/groups", label: "Groups" },
  { href: "/model", label: "Model" },
];

/** Tactics mark — a dotted movement path curving from the ball to a target. */
function Mark() {
  return (
    <svg viewBox="0 0 104 104" aria-hidden="true" className="size-9 shrink-0">
      <circle cx="52" cy="52" r="48" fill="#0059FF" />
      {/* dotted tactics trajectory */}
      <path
        d="M30 74 Q 50 28 78 40"
        fill="none"
        stroke="#fff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="0.1 10"
      />
      {/* ball at the start of the play */}
      <circle cx="30" cy="74" r="8" fill="#fff" />
      {/* arrowhead at the target */}
      <path
        d="M70 33 L80 39.5 L71 47"
        fill="none"
        stroke="#fff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontHead.variable} ${fontBody.variable} ${fontMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-40 border-b border-edge bg-background/80 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-0.5 px-4 py-2.5 sm:py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <Mark />
              <span className="leading-tight">
                <span className="block font-head text-sm font-extrabold tracking-[-0.02em]">
                  WC26 <span className="text-accent">Analytics</span>
                </span>
                <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
                  Monsterra Capital · World Cup 2026
                </span>
              </span>
            </Link>
            <nav className="no-scrollbar -mx-1 flex w-full items-center gap-1 overflow-x-auto px-1 text-sm md:ml-auto md:w-auto md:overflow-visible md:px-0">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
          {children}
        </main>
        <footer className="border-t border-edge px-4 py-5 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          Injury-adjusted Elo · Dixon-Coles score model · Monte Carlo simulation
          — recomputed after every match
        </footer>
      </body>
    </html>
  );
}
