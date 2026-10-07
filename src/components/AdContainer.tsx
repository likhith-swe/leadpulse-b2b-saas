"use client";

import { Megaphone } from "lucide-react";

/**
 * Passive native ad container slot. In production this mounts a Carbon Ads
 * or EthicalAds unit ($6–$20 CPM) below the results table. Until a network
 * account is attached, it serves a house placement for the outreach-tool
 * affiliate, routed through the tracked /api/go handler.
 */
export function AdContainer({ placement }: { placement: string }) {
  return (
    <div
      data-ad-slot={placement}
      className="mt-6 overflow-hidden rounded-lg border border-dashed border-line-2 bg-panel/60"
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-600">
          Sponsored · Carbon Ads / EthicalAds slot
        </span>
        <span className="text-[10px] tabular-nums text-zinc-600">$6–$20 CPM</span>
      </div>
      <a
        href="/api/go/instantly"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-4 px-4 py-3.5 transition hover:bg-panel-2"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line-2 bg-panel-2 text-pulse">
          <Megaphone className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-zinc-200 group-hover:text-pulse">
            Cold outreach infrastructure for agencies — unlimited inboxes, warm-up included
          </p>
          <p className="truncate text-[12px] text-mute">
            Instantly.ai · 30% lifetime commission program · used by 4,000+ agencies
          </p>
        </div>
        <span className="hidden shrink-0 rounded-md border border-line-2 px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition group-hover:border-pulse/40 group-hover:text-pulse sm:block">
          Visit →
        </span>
      </a>
    </div>
  );
}
