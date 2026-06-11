import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WC26 Analytics — World Cup 2026 Predictions",
  description:
    "Live tournament predictions for the FIFA World Cup 2026: title odds, score forecasts and injury-adjusted team ratings, recomputed after every match.",
};

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/matches", label: "Matches" },
  { href: "/groups", label: "Groups" },
  { href: "/model", label: "Model" },
  { href: "/admin", label: "Data Manager" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-40 border-b border-edge bg-background/80 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-accent-dim/15 text-lg">
                ⚽
              </span>
              <span className="leading-tight">
                <span className="block text-sm font-bold tracking-wide">
                  WC26 <span className="text-accent">Analytics</span>
                </span>
                <span className="block text-[11px] text-muted">
                  FIFA World Cup 2026 · prediction engine
                </span>
              </span>
            </Link>
            <nav className="ml-auto flex items-center gap-1 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
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
        <footer className="border-t border-edge py-5 text-center text-xs text-muted">
          Injury-adjusted Elo · Dixon-Coles score model · Monte Carlo tournament
          simulation — recomputed after every recorded match
        </footer>
      </body>
    </html>
  );
}
