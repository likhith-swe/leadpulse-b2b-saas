"use client";

import { Radio, ArrowRight } from "lucide-react";
import { useUI } from "@/components/AppShell";

export function NewsletterCTA({ variant = "link" }: { variant?: "link" | "band" }) {
  const { openNewsletter } = useUI();

  if (variant === "band") {
    return (
      <div className="border-y border-line bg-panel/40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-pulse/30 bg-pulse/10">
              <Radio className="h-4 w-4 text-pulse" />
            </span>
            <div>
              <p className="text-[14px] font-semibold text-zinc-100">
                The Weekly Hiring Radar
              </p>
              <p className="text-[12.5px] text-mute">
                50 fastest-growing funded startups hiring in tech · every Monday, 8:00 AM IST.
              </p>
            </div>
          </div>
          <button
            onClick={openNewsletter}
            className="flex items-center gap-2 rounded-lg bg-pulse px-4 py-2.5 text-[13px] font-semibold text-ink transition hover:bg-pulse-dim"
          >
            Get the Monday issue <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={openNewsletter}
      className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-pulse underline-offset-2 hover:underline"
    >
      Subscribe free <ArrowRight className="h-3.5 w-3.5" />
    </button>
  );
}
