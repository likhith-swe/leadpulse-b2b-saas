import Link from "next/link";
import {
  ArrowRight,
  Database,
  Fingerprint,
  Sparkles,
  Gauge,
  Radio,
  ShieldCheck,
} from "lucide-react";
import { SearchExperience } from "@/components/SearchExperience";
import { StaticLeadTable } from "@/components/LeadDataTable";
import { PricingSection } from "@/components/PricingSection";
import { resolveSignals } from "@/lib/signals";
import { findTech, findCity, TECH_CATALOG, CITY_CATALOG } from "@/lib/catalog";
import { maskEmail } from "@/lib/types";
import type { SignalRow } from "@/lib/types";
import { NewsletterCTA } from "@/components/NewsletterCTA";

export const dynamic = "force-dynamic";

async function previewRows(): Promise<SignalRow[]> {
  const tech = findTech("react") ?? TECH_CATALOG[0];
  const city = findCity("bangalore") ?? CITY_CATALOG[0];
  try {
    const bundle = await resolveSignals(tech, city, 8);
    return bundle.signals.map((s) => {
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
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const rows = await previewRows();

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "LeadPulse AI",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Real-time B2B hiring signal and decision-maker intelligence engine.",
    offers: [
      { "@type": "Offer", name: "Pro", price: "1999", priceCurrency: "INR" },
      { "@type": "Offer", name: "Agency", price: "4999", priceCurrency: "INR" },
    ],
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />

      {/* Hero + live search */}
      <section className="lp-grid-bg relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[720px] -translate-x-1/2 rounded-full bg-pulse/[0.07] blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-14 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-line-2 bg-panel px-3 py-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="lp-live-dot absolute h-1.5 w-1.5 rounded-full bg-pulse" />
              </span>
              <span className="text-[11px] font-medium tracking-wide text-zinc-300">
                Live ingestion · JSearch API · 48h cache · Groq inference
              </span>
            </div>
            <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-zinc-50 sm:text-5xl">
              Prospect from live hiring signals,
              <span className="text-pulse"> not stale lead lists.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-[15px] leading-relaxed text-mute">
              Static B2B lists decay about 30% a year and bounce around 40%.
              A job post is different: it is proof of $50k–$150k in approved
              budget. LeadPulse ingests openings as they go live, resolves the
              decision-maker at the hiring company, validates the email, and
              drafts the first outreach.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#signals"
                className="flex items-center gap-2 rounded-lg bg-pulse px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-pulse-dim"
              >
                Scan the hiring feed <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#pricing"
                className="rounded-lg border border-line-2 bg-panel px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-pulse/40"
              >
                Pricing — from ₹1,999/mo
              </a>
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-5xl">
            <SearchExperience />
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-b border-line bg-panel/40">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-line px-4 sm:px-6 md:grid-cols-4">
          {[
            { k: "30%/yr", v: "data decay on static lead lists" },
            { k: "40%", v: "typical bounce rate on purchased lists" },
            { k: "48h", v: "cache window before every re-ingest" },
            { k: "1:1", v: "one credit = one verified email" },
          ].map((s) => (
            <div key={s.k} className="px-5 py-6 text-center">
              <p className="text-2xl font-semibold tabular-nums tracking-tight text-zinc-50">
                {s.k}
              </p>
              <p className="mt-1 text-[12px] leading-snug text-mute">{s.v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Signal preview */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.16em] text-pulse">
              Signal preview · React · Bengaluru
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-50">
              What a lookup returns
            </h2>
            <p className="mt-1 max-w-xl text-[13px] text-mute">
              Emails are masked for anonymous visitors. Sign in for 5 free
              lookups per day; Pro unmasks every address with syntax and MX
              validation.
            </p>
          </div>
          <Link
            href="/companies-hiring/react/bangalore"
            className="text-[13px] text-pulse underline-offset-2 hover:underline"
          >
            Open the Bengaluru radar page →
          </Link>
        </div>
        {rows.length > 0 ? (
          <StaticLeadTable rows={rows} />
        ) : (
          <div className="rounded-xl border border-dashed border-line-2 p-10 text-center text-[13px] text-mute">
            Signal store is warming up — run a search above to populate it.
          </div>
        )}
      </section>

      {/* Pipeline */}
      <section id="how" className="border-y border-line bg-panel/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="mb-10 text-2xl font-semibold tracking-tight text-zinc-50">
            The pipeline, end to end
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Database,
                step: "01 · Ingest",
                title: "Job posts, polled and cached",
                body: "Every query hits the JSearch aggregator (or the 48-hour cache first). Each result is parsed into company, domain, role, stack tags, salary band, and post timestamp.",
              },
              {
                icon: Fingerprint,
                step: "02 · Enrich",
                title: "Decision-maker resolution + validation",
                body: "The budget owner is mapped to the role type — CTO for engineering, Founder for growth, Head of Talent for team roles. Emails pass syntax checks, disposable-domain blocklists, and MX lookups before a confidence score is assigned.",
              },
              {
                icon: Sparkles,
                step: "03 · Draft",
                title: "Groq-speed pitch generation",
                body: "One click sends the exact job requirements to Llama 3.3 70B on Groq. The output is a 3-sentence cold email that names the role, the stack, and a concrete outcome — no filler.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-line-2 bg-panel p-6 transition hover:border-line-2 hover:bg-panel-2/60"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-pulse/30 bg-pulse/10">
                    <item.icon className="h-4 w-4 text-pulse" />
                  </span>
                  <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-mute">
                    {item.step}
                  </span>
                </div>
                <h3 className="mb-2 text-[15px] font-semibold text-zinc-100">
                  {item.title}
                </h3>
                <p className="text-[13px] leading-relaxed text-mute">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-4 rounded-xl border border-line-2 bg-panel p-6">
              <Gauge className="mt-1 h-5 w-5 shrink-0 text-ember" />
              <div>
                <h3 className="mb-1 text-[14px] font-semibold text-zinc-100">
                  Hiring Velocity Score, explained
                </h3>
                <p className="text-[13px] leading-relaxed text-mute">
                  44 base points, plus up to 26 for recency (posted within 24h),
                  up to 18 for concurrent openings at the same company, 8 for a
                  published salary band, and a small deterministic jitter. Scores
                  above 80 indicate active, funded, time-pressured hiring.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-xl border border-line-2 bg-panel p-6">
              <Radio className="mt-1 h-5 w-5 shrink-0 text-pulse" />
              <div>
                <h3 className="mb-1 text-[14px] font-semibold text-zinc-100">
                  Weekly Hiring Radar
                </h3>
                <p className="text-[13px] leading-relaxed text-mute">
                  Every Monday at 8:00 AM IST: the 50 fastest-growing funded
                  startups hiring in tech that week, with exact roles and
                  stacks. Sponsorship runs $60–$100 CPM.
                </p>
                <NewsletterCTA />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Pricing that maps to email credits
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-[13px] text-mute">
            Razorpay Subscriptions for INR billing, Stripe Billing for
            international. Top-up packs cover any month that runs long.
          </p>
        </div>
        <PricingSection />
        <p className="mt-6 text-center text-[12px] text-zinc-600">
          Ran out mid-month? Top up instantly: ₹499 for 100 credits, ₹1,999 for 500.
        </p>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-50">
          Questions outbound teams ask
        </h2>
        <div className="space-y-3">
          {[
            {
              q: "How is this different from Apollo or ZoomInfo lists?",
              a: "Those are static snapshots with roughly 30% annual decay. LeadPulse triggers on events: a company posts a role, which means budget is approved right now. You contact them while the pain is active, with the relevant decision-maker already resolved.",
            },
            {
              q: "What exactly does one credit buy?",
              a: "One unmasked, syntax- and MX-validated decision-maker email, plus the AI pitch draft for that signal. Pro includes 500 credits/month, Agency 2,500. Lookups themselves draw on the daily quota, not credits.",
            },
            {
              q: "Can I pipe leads straight into my outreach tool?",
              a: "Yes. CSV and JSON exports are one click on paid plans, and the export flow offers a direct handoff to Instantly.ai or Smartlead.ai through tracked partner links.",
            },
            {
              q: "Where do the job signals come from?",
              a: "The JSearch aggregator on RapidAPI, polled per query with a 48-hour cache. In preview mode without an API key, a deterministic synthetic corpus keeps every pipeline stage testable.",
            },
          ].map((f) => (
            <details
              key={f.q}
              className="group rounded-lg border border-line-2 bg-panel px-5 py-4 open:border-pulse/30"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between text-[14px] font-medium text-zinc-200">
                {f.q}
                <span className="ml-4 text-mute transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-[13px] leading-relaxed text-mute">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <NewsletterCTA variant="band" />
    </div>
  );
}
