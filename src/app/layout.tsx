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
  themeColor: "#00091A",
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

/** Star-ball mark in Monsterra capital blue (capital-400 for contrast on ink). */
function Mark() {
  return (
    <svg viewBox="0 0 104 104" aria-hidden="true" className="size-9 shrink-0">
      <defs>
        <clipPath id="mark-ball">
          <circle cx="52" cy="52" r="48" />
        </clipPath>
      </defs>
      <g fill="#2E77FF" clipPath="url(#mark-ball)">
        <circle cx="52" cy="52" r="46.5" fill="none" stroke="#2E77FF" strokeWidth="3" />
        <polygon points="46.6,28.6 56.0,44.9 74.5,41.0 61.9,55.0 71.3,71.4 54.1,63.7 41.4,77.8 43.4,59.0 26.1,51.3 44.6,47.4" />
        <polygon points="49.6,-3.9 48.9,7.0 59.0,11.0 48.4,13.7 47.6,24.6 41.9,15.3 31.3,17.9 38.3,9.6 32.5,0.4 42.6,4.4" />
        <polygon points="78.7,12.7 84.7,20.9 94.3,17.8 88.3,26.0 94.3,34.2 84.7,31.1 78.7,39.3 78.7,29.1 69.0,26.0 78.7,22.9" />
        <polygon points="101.5,50.7 99.5,60.0 107.7,64.7 98.3,65.7 96.4,74.9 92.5,66.3 83.1,67.3 90.1,61.0 86.3,52.3 94.5,57.1" />
        <polygon points="70.4,80.2 71.8,90.3 81.9,92.1 72.7,96.5 74.1,106.6 67.1,99.3 57.9,103.7 62.7,94.7 55.6,87.4 65.7,89.2" />
        <polygon points="22.5,78.2 28.9,85.1 37.5,81.1 32.9,89.4 39.4,96.3 30.1,94.5 25.5,102.8 24.4,93.4 15.1,91.6 23.7,87.6" />
        <polygon points="10.4,43.4 10.9,52.9 20.0,55.3 11.2,58.7 11.7,68.1 5.7,60.8 -3.1,64.2 2.0,56.3 -3.9,48.9 5.2,51.4" />
        <polygon points="26.4,14.0 22.8,22.8 30.1,28.9 20.6,28.2 17.1,37.0 14.8,27.8 5.4,27.1 13.4,22.1 11.1,13.0 18.3,19.0" />
      </g>
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
