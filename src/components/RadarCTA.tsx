"use client";

import { Lock, Sparkles } from "lucide-react";
import { useUI } from "@/components/AppShell";

/** Call-to-action panel embedded on pSEO radar pages. */
export function RadarCTA() {
  const { user, openSignIn, openPricing } = useUI();

  return (
    <div className="rounded-xl border border-pulse/30 bg-pulse/[0.05] p-6">
      <h2 className="mb-1.5 text-[15px] font-semibold text-zinc-100">
        Unmask every email on this page
      </h2>
      <p className="mb-4 max-w-2xl text-[13px] leading-relaxed text-mute">
        Sign in for 5 free lookups per day with masked contacts. Pro unmasks
        all decision-maker emails with syntax + MX validation, adds CSV/JSON
        export, and drafts the first cold email against each live job post.
      </p>
      <div className="flex flex-wrap gap-2">
        {!user ? (
          <button
            onClick={openSignIn}
            className="flex items-center gap-2 rounded-lg bg-pulse px-4 py-2.5 text-[13px] font-semibold text-ink transition hover:bg-pulse-dim"
          >
            <Lock className="h-4 w-4" /> Sign in — 5 free lookups/day
          </button>
        ) : (
          <button
            onClick={() => openPricing("pro")}
            className="flex items-center gap-2 rounded-lg bg-pulse px-4 py-2.5 text-[13px] font-semibold text-ink transition hover:bg-pulse-dim"
          >
            <Sparkles className="h-4 w-4" /> Upgrade to unmask emails
          </button>
        )}
        <a
          href="/#signals"
          className="rounded-lg border border-line-2 bg-panel px-4 py-2.5 text-[13px] font-medium text-zinc-200 transition hover:border-pulse/40"
        >
          Run a custom search
        </a>
      </div>
    </div>
  );
}
