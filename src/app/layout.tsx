import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import "./globals.css";

// Type pairing: Poppins for display/headings (geometric, circular — the
// closest free match to Google's Product Sans), Inter for body (legible),
// JetBrains Mono for data and micro-labels.
const fontHead = localFont({
  src: [
    { path: "../fonts/poppins-500-latin.woff2", weight: "500" },
    { path: "../fonts/poppins-600-latin.woff2", weight: "600" },
    { path: "../fonts/poppins-700-latin.woff2", weight: "700" },
  ],
  variable: "--font-head",
});

const fontBody = localFont({
  src: "../fonts/inter-latin.woff2",
  weight: "100 900",
  variable: "--font-body",
});

const fontMono = localFont({
  src: "../fonts/jetbrains-mono-latin.woff2",
  weight: "100 800",
  variable: "--font-plex-mono",
});

export const viewport: Viewport = {
  themeColor: "#F5F7FB",
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

/** Minimalist tactics board — open ring and an upward play arrow past two
 *  defender X's, on the capital-blue tile. */
function Mark() {
  return (
    <svg viewBox="0 0 104 104" aria-hidden="true" className="size-9 shrink-0">
      <rect x="2" y="2" width="100" height="100" rx="26" fill="#0059FF" />
      <g fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="27" cy="74" r="7" />
        <path d="M36 71 Q 54 64 72 30" />
        <path d="M59.5 36.4 L72 30 L73.7 43.9" />
        <path d="M27 26 L39 38 M39 26 L27 38" />
        <circle cx="74" cy="71" r="6" />
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
