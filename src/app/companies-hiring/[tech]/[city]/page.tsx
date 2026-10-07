import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next/types";
import { Clock, Building2, Gauge } from "lucide-react";
import { findTech, findCity, TECH_CATALOG, CITY_CATALOG } from "@/lib/catalog";
import { resolveSignals } from "@/lib/signals";
import { maskEmail, timeAgo } from "@/lib/types";
import type { SignalRow } from "@/lib/types";
import { StaticLeadTable } from "@/components/LeadDataTable";
import { RadarCTA } from "@/components/RadarCTA";
import { AdContainer } from "@/components/AdContainer";
import { NewsletterCTA } from "@/components/NewsletterCTA";

export const revalidate = 43200; // ISR: regenerate radar pages every 12 hours
export const dynamicParams = true;

interface RouteParams {
  tech: string;
  city: string;
}

export async function generateStaticParams(): Promise<RouteParams[]> {
  const combos: RouteParams[] = [];
  for (const tech of TECH_CATALOG.slice(0, 4)) {
    for (const city of CITY_CATALOG.slice(0, 2)) {
      combos.push({ tech: tech.slug, city: city.slug });
    }
  }
  return combos;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://leadpulse.ai";

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { tech: techSlug, city: citySlug } = await params;
  const tech = findTech(techSlug);
  const city = findCity(citySlug);
  if (!tech || !city) return {};
  const title = `Companies Hiring ${tech.label} Talent in ${city.label} — Live Signals`;
  const description = `Live list of companies hiring ${tech.label} roles (${tech.tags.join(
    ", ",
  )}) in ${city.label}, updated from job-board feeds every 12 hours. Includes Hiring Velocity Score and the relevant decision-maker for each opening.`;
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/companies-hiring/${tech.slug}/${city.slug}`,
    },
    openGraph: { title, description, type: "website" },
  };
}

export default async function RadarPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { tech: techSlug, city: citySlug } = await params;
  const tech = findTech(techSlug);
  const city = findCity(citySlug);
  if (!tech || !city) notFound();

  const bundle = await resolveSignals(tech, city, 18);
  const rows: SignalRow[] = bundle.signals
    .sort((a, b) => b.velocityScore - a.velocityScore)
    .map((s) => {
      const lead = bundle.leadBySignal.get(s.id);
      return {
        id: s.id,
        companyName: s.companyName,
        companyDomain: s.companyDomain,
        jobTitle: s.jobTitle,
        jobUrl: s.jobUrl,
        location: s.location,
        techStackTags: s.techStackTags,
        salaryRange: s.salaryRange,
        postedAt: s.postedAt.toISOString(),
        velocityScore: s.velocityScore,
        openRoles: s.openRoles,
        lead: lead
          ? {
              id: lead.id,
              name: lead.decisionMakerName,
              roleTitle: lead.roleTitle,
              email: maskEmail(lead.email),
              emailStatus: lead.status,
              confidence: Number(lead.confidenceScore),
              linkedinUrl: lead.linkedinUrl,
              obfuscated: true,
            }
          : null,
      };
    });

  const avgVelocity =
    rows.length > 0
      ? Math.round(rows.reduce((acc, r) => acc + r.velocityScore, 0) / rows.length)
      : 0;
  const freshCount = rows.filter((r) => r.velocityScore >= 80).length;

  const faqs = [
    {
      q: `How current is this list of ${tech.label} jobs in ${city.label}?`,
      a: `The page regenerates from job-board feeds on a 12-hour ISR cycle, and the underlying cache expires after 48 hours. Rows carry a Hiring Velocity Score that weights posts from the last 24 hours most heavily.`,
    },
    {
      q: `Who should I contact about these ${tech.label} openings?`,
      a: `For ${tech.intent} roles, the budget owner is typically the ${
        tech.intent === "engineering"
          ? "CTO or VP Engineering"
          : tech.intent === "ecommerce"
            ? "Founder or Head of Ecommerce"
            : tech.intent === "data"
              ? "Head of Data or CTO"
              : "Founder or Head of Growth"
      }. LeadPulse resolves that person per row and validates the email with syntax and MX checks before revealing it on paid plans.`,
    },
    {
      q: `Why does a job post matter for outbound?`,
      a: `A posted role is evidence of $50k–$150k in approved budget and an active problem to solve. Contacting the company while the role is open converts materially better than emailing from a static list, which decays about 30% per year.`,
    },
  ];

  const datasetSchema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `${tech.label} hiring signals in ${city.label}`,
    description: `Structured, refreshed dataset of companies hiring for ${tech.label} roles in ${city.label}, including role titles, stack tags, salary bands, and Hiring Velocity Scores.`,
    creator: { "@type": "Organization", name: "LeadPulse AI" },
    license: `${SITE_URL}/terms`,
    keywords: tech.tags.join(", "),
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${tech.label} jobs in ${city.label}`,
    numberOfItems: rows.length,
    itemListElement: rows.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${r.jobTitle} at ${r.companyName}`,
      url: r.jobUrl,
    })),
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <nav className="mb-6 text-[12px] text-mute">
        <Link href="/" className="hover:text-pulse">Home</Link>
        <span className="mx-1.5 text-zinc-700">/</span>
        <span>Companies hiring</span>
        <span className="mx-1.5 text-zinc-700">/</span>
        <span className="text-zinc-300">{tech.label}</span>
        <span className="mx-1.5 text-zinc-700">/</span>
        <span className="text-zinc-300">{city.label}</span>
      </nav>

      <div className="mb-8 max-w-3xl">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-line-2 bg-panel px-3 py-1">
          <span className="relative flex h-1.5 w-1.5">
            <span className="lp-live-dot absolute h-1.5 w-1.5 rounded-full bg-pulse" />
          </span>
          <span className="text-[11px] text-zinc-300">
            Regenerates every 12 hours · cache TTL 48h
          </span>
        </div>
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
          Companies hiring {tech.label} talent in {city.label}
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-mute">
          {rows.length} live openings tagged {tech.tags.join(", ")}. Each row
          includes the Hiring Velocity Score and the decision-maker relevant to
          the role. Emails are masked on this page — unmask them inside the app.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-line-2 bg-panel px-4 py-3">
          <div className="mb-1 flex items-center gap-1.5 text-mute">
            <Building2 className="h-3 w-3" />
            <span className="text-[10px] uppercase tracking-[0.14em]">Openings</span>
          </div>
          <p className="text-xl font-semibold tabular-nums text-zinc-50">{rows.length}</p>
        </div>
        <div className="rounded-lg border border-line-2 bg-panel px-4 py-3">
          <div className="mb-1 flex items-center gap-1.5 text-mute">
            <Gauge className="h-3 w-3" />
            <span className="text-[10px] uppercase tracking-[0.14em]">Avg velocity</span>
          </div>
          <p className="text-xl font-semibold tabular-nums text-zinc-50">{avgVelocity}</p>
        </div>
        <div className="rounded-lg border border-line-2 bg-panel px-4 py-3">
          <div className="mb-1 flex items-center gap-1.5 text-mute">
            <Clock className="h-3 w-3" />
            <span className="text-[10px] uppercase tracking-[0.14em]">Hot (80+)</span>
          </div>
          <p className="text-xl font-semibold tabular-nums text-pulse">{freshCount}</p>
        </div>
      </div>

      {rows.length > 0 ? <StaticLeadTable rows={rows} /> : (
        <div className="rounded-xl border border-dashed border-line-2 p-10 text-center text-[13px] text-mute">
          No signals indexed for this pair yet. Check back within 12 hours or run a live search.
        </div>
      )}

      <div className="mt-6">
        <RadarCTA />
      </div>

      <AdContainer placement={`radar-${tech.slug}-${city.slug}`} />

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-zinc-50">
            {tech.label} hiring in other cities
          </h2>
          <div className="flex flex-wrap gap-2">
            {CITY_CATALOG.filter((c) => c.slug !== city.slug).map((c) => (
              <Link
                key={c.slug}
                href={`/companies-hiring/${tech.slug}/${c.slug}`}
                className="rounded-md border border-line-2 bg-panel px-3 py-1.5 text-[12.5px] text-zinc-300 transition hover:border-pulse/40 hover:text-pulse"
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-zinc-50">
            Other stacks hiring in {city.label}
          </h2>
          <div className="flex flex-wrap gap-2">
            {TECH_CATALOG.filter((t) => t.slug !== tech.slug).map((t) => (
              <Link
                key={t.slug}
                href={`/companies-hiring/${t.slug}/${city.slug}`}
                className="rounded-md border border-line-2 bg-panel px-3 py-1.5 text-[12.5px] text-zinc-300 transition hover:border-pulse/40 hover:text-pulse"
              >
                {t.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-14 max-w-3xl">
        <h2 className="mb-5 text-lg font-semibold tracking-tight text-zinc-50">
          {tech.label} hiring in {city.label} — FAQ
        </h2>
        <div className="space-y-3">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="group rounded-lg border border-line-2 bg-panel px-5 py-4 open:border-pulse/30"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between text-[13.5px] font-medium text-zinc-200">
                {f.q}
                <span className="ml-4 text-mute transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-[13px] leading-relaxed text-mute">{f.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-6">
          <NewsletterCTA />
        </div>
        <p className="mt-6 text-[11px] text-zinc-600">
          Page generated {new Date().toISOString().slice(0, 16).replace("T", " ")} UTC ·
          freshest signal posted {rows.length > 0 ? timeAgo(rows[0].postedAt) : "n/a"}.
        </p>
      </div>
    </div>
  );
}
