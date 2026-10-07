import { redirect } from "next/navigation";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import {
  KeyRound,
  Sparkles,
  Search,
  CreditCard,
  Radio,
  FileDown,
} from "lucide-react";
import { db } from "@/db";
import {
  hiringSignals,
  pitchDrafts,
  subscriptions,
  newsletterSubscribers,
} from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { DashboardActions } from "@/components/DashboardActions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/?signin=1");

  const drafts = await db
    .select({
      id: pitchDrafts.id,
      pitch: pitchDrafts.generatedPitch,
      subject: pitchDrafts.subject,
      model: pitchDrafts.model,
      createdAt: pitchDrafts.createdAt,
      company: hiringSignals.companyName,
      jobTitle: hiringSignals.jobTitle,
    })
    .from(pitchDrafts)
    .leftJoin(hiringSignals, eq(pitchDrafts.signalId, hiringSignals.id))
    .where(eq(pitchDrafts.userId, user.id))
    .orderBy(desc(pitchDrafts.createdAt))
    .limit(8);

  const subs = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .orderBy(desc(subscriptions.createdAt))
    .limit(6);

  const subscriberRows = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.email, user.email))
    .limit(1);
  const subscribed = subscriberRows.length > 0;

  const quotaPct = Math.min(
    100,
    Math.round((user.dailyQuotaUsed / user.dailyQuotaLimit) * 100),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Workspace overview
          </h1>
          <p className="mt-1 text-[13px] text-mute">
            Signed in as {user.email} · plan: {user.plan}
          </p>
        </div>
        <DashboardActions plan={user.plan} />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-line-2 bg-panel p-5">
          <div className="mb-2 flex items-center gap-2 text-mute">
            <KeyRound className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-[0.14em]">
              Email credits
            </span>
          </div>
          <p className="text-3xl font-semibold tabular-nums text-zinc-50">
            {user.creditsRemaining}
          </p>
          <p className="mt-1 text-[11.5px] text-mute">
            1 credit = 1 unmasked email + pitch draft
          </p>
        </div>

        <div className="rounded-xl border border-line-2 bg-panel p-5">
          <div className="mb-2 flex items-center gap-2 text-mute">
            <Search className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-[0.14em]">
              Lookups today
            </span>
          </div>
          <p className="text-3xl font-semibold tabular-nums text-zinc-50">
            {user.dailyQuotaUsed}
            <span className="text-base text-mute"> / {user.dailyQuotaLimit}</span>
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel-3">
            <div
              className={`h-full ${quotaPct > 80 ? "bg-danger" : "bg-pulse"}`}
              style={{ width: `${Math.max(4, quotaPct)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11.5px] text-mute">Resets 00:00 UTC</p>
        </div>

        <div className="rounded-xl border border-line-2 bg-panel p-5">
          <div className="mb-2 flex items-center gap-2 text-mute">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-[0.14em]">
              Pitch drafts
            </span>
          </div>
          <p className="text-3xl font-semibold tabular-nums text-zinc-50">
            {drafts.length}
          </p>
          <p className="mt-1 text-[11.5px] text-mute">stored in pitch_drafts</p>
        </div>

        <div className="rounded-xl border border-line-2 bg-panel p-5">
          <div className="mb-2 flex items-center gap-2 text-mute">
            <Radio className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-[0.14em]">
              Hiring Radar
            </span>
          </div>
          <p className="text-[15px] font-semibold text-zinc-50">
            {subscribed ? "Subscribed" : "Not subscribed"}
          </p>
          <p className="mt-1 text-[11.5px] leading-snug text-mute">
            {subscribed
              ? "Monday issue lands at 8:00 AM IST."
              : "50 funded startups hiring this week, every Monday."}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-xl border border-line-2 bg-panel">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="text-[13px] font-semibold text-zinc-100">
              Recent pitch drafts
            </h2>
            <span className="text-[11px] text-mute">{drafts.length} of last 8</span>
          </div>
          {drafts.length === 0 ? (
            <div className="px-5 py-10 text-center text-[13px] text-mute">
              No drafts yet. Run a lookup and press{" "}
              <span className="text-pulse">Generate Pitch</span> on any row.
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {drafts.map((d) => (
                <li key={d.id} className="px-5 py-4">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-semibold text-zinc-100">
                      {d.company ?? "Signal"} · {d.jobTitle ?? ""}
                    </span>
                    <span className="rounded border border-line-2 px-1.5 py-0.5 text-[9.5px] uppercase tracking-wide text-mute">
                      {d.model}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-[12.5px] leading-relaxed text-zinc-400">
                    {d.pitch}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-line-2 bg-panel">
            <div className="flex items-center gap-2 border-b border-line px-5 py-3.5">
              <CreditCard className="h-3.5 w-3.5 text-mute" />
              <h2 className="text-[13px] font-semibold text-zinc-100">
                Billing history
              </h2>
            </div>
            {subs.length === 0 ? (
              <div className="px-5 py-8 text-center text-[12.5px] text-mute">
                No transactions yet. Upgrades and top-ups appear here with
                provider, amount, and period.
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {subs.map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-[12.5px] font-medium text-zinc-200">
                        {s.planTier} · {s.provider}
                      </p>
                      <p className="text-[11px] text-mute">
                        {new Date(s.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        · {s.status}
                      </p>
                    </div>
                    <span className="text-[12.5px] tabular-nums text-zinc-300">
                      {s.currency === "INR" ? "₹" : "$"}
                      {s.amount.toLocaleString("en-IN")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-line-2 bg-panel p-5">
            <div className="mb-2 flex items-center gap-2">
              <FileDown className="h-3.5 w-3.5 text-mute" />
              <h2 className="text-[13px] font-semibold text-zinc-100">Outbound handoff</h2>
            </div>
            <p className="mb-3 text-[12.5px] leading-relaxed text-mute">
              After a CSV export, send the list straight to warm-up and
              sequencing. Tracked partner links log every click.
            </p>
            <div className="flex flex-col gap-2">
              <a
                href="/api/go/instantly"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-line-2 bg-panel-2 px-3.5 py-2 text-center text-[12.5px] font-medium text-zinc-200 transition hover:border-pulse/40 hover:text-pulse"
              >
                Send to Instantly.ai →
              </a>
              <a
                href="/api/go/smartlead"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-line-2 bg-panel-2 px-3.5 py-2 text-center text-[12.5px] font-medium text-zinc-200 transition hover:border-pulse/40 hover:text-pulse"
              >
                Send to Smartlead.ai →
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-line-2 bg-panel/50 p-5">
            <p className="text-[12px] leading-relaxed text-mute">
              Radar pages generate long-tail traffic 24/7.{" "}
              <Link
                href="/companies-hiring/react/bangalore"
                className="text-pulse underline-offset-2 hover:underline"
              >
                View an example →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
