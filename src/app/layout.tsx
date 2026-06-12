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

/** Minimalist ball — capital-blue disc with knocked-out pentagon panel and seams. */
function Mark() {
  return (
    <svg viewBox="0 0 104 104" aria-hidden="true" className="size-9 shrink-0">
      <circle cx="52" cy="52" r="48" fill="#0059FF" />
      <g stroke="#fff" strokeWidth="4.5" strokeLinecap="round">
        <line x1="52" y1="37" x2="52" y2="6" />
        <line x1="66.3" y1="47.4" x2="95.7" y2="37.8" />
        <line x1="60.8" y1="64.1" x2="79" y2="89.2" />
        <line x1="43.2" y1="64.1" x2="25" y2="89.2" />
        <line x1="37.7" y1="47.4" x2="8.3" y2="37.8" />
      </g>
      <polygon fill="#fff" points="52,37 66.3,47.4 60.8,64.1 43.2,64.1 37.7,47.4" />
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
