import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Navigation } from "@/components/Navigation";
import { TECH_CATALOG, CITY_CATALOG, PARTNERS } from "@/lib/catalog";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://leadpulse.ai",
  ),
  title: {
    default:
      "LeadPulse AI — Real-Time B2B Hiring Signal & Decision-Maker Intelligence",
    template: "%s · LeadPulse AI",
  },
  description:
    "Static lead lists decay 30% a year. LeadPulse monitors live job posts, enriches the hiring company with a verified decision-maker contact, validates the email, and drafts the first outreach.",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getSessionUser();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-ink font-sans text-zinc-100 antialiased">
        <AppShell user={user}>
          <Navigation />
          <main>{children}</main>

          <footer className="mt-20 border-t border-line bg-panel/40">
            <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
              <div>
                <p className="mb-3 text-[13px] font-semibold text-zinc-100">
                  LeadPulse AI
                </p>
                <p className="text-[12px] leading-relaxed text-mute">
                  Hiring-signal intelligence for outbound teams. Every job post
                  is proof of approved budget; every row ships with the budget
                  owner&apos;s validated contact.
                </p>
                <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
                  Preview build: when no RapidAPI key is attached, the corpus
                  engine serves a synthetic dataset of fictional companies so
                  every pipeline stage stays testable.
                </p>
              </div>
              <div>
                <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-mute">
                  Radar pages
                </p>
                <ul className="space-y-1.5">
                  {TECH_CATALOG.slice(0, 4).flatMap((tech) =>
                    [CITY_CATALOG[0], CITY_CATALOG[5]].map((city) => (
                      <li key={`${tech.slug}-${city.slug}`}>
                        <Link
                          href={`/companies-hiring/${tech.slug}/${city.slug}`}
                          className="text-[12px] text-zinc-400 transition hover:text-pulse"
                        >
                          {tech.label} hiring in {city.label}
                        </Link>
                      </li>
                    )),
                  )}
                </ul>
              </div>
              <div>
                <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-mute">
                  Product
                </p>
                <ul className="space-y-1.5 text-[12px]">
                  <li>
                    <a href="/#signals" className="text-zinc-400 transition hover:text-pulse">
                      Live signal search
                    </a>
                  </li>
                  <li>
                    <a href="/#how" className="text-zinc-400 transition hover:text-pulse">
                      The pipeline
                    </a>
                  </li>
                  <li>
                    <a href="/#pricing" className="text-zinc-400 transition hover:text-pulse">
                      Pricing and credits
                    </a>
                  </li>
                  <li>
                    <Link href="/dashboard" className="text-zinc-400 transition hover:text-pulse">
                      Dashboard
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-mute">
                  Outreach partners
                </p>
                <ul className="space-y-1.5 text-[12px]">
                  {Object.values(PARTNERS).map((p) => (
                    <li key={p.slug}>
                      <a
                        href={`/api/go/${p.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-400 transition hover:text-pulse"
                      >
                        {p.label} · {p.commission}
                      </a>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-[11px] text-zinc-600">
                  Partner clicks route through /api/go and log to
                  affiliate_clicks before redirecting.
                </p>
              </div>
            </div>
            <div className="border-t border-line py-4 text-center text-[11px] text-zinc-600">
              © {new Date().getFullYear()} LeadPulse AI · Built for outbound teams that prospect on evidence, not lists.
            </div>
          </footer>
        </AppShell>
      </body>
    </html>
  );
}
