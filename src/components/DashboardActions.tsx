"use client";

import { KeyRound, ArrowRight, Package } from "lucide-react";
import { useUI } from "@/components/AppShell";

export function DashboardActions({ plan }: { plan: string }) {
  const { openPricing } = useUI();
  return (
    <div className="flex flex-wrap gap-2">
      {plan === "free" ? (
        <button
          onClick={() => openPricing("pro")}
          className="flex items-center gap-2 rounded-lg bg-pulse px-4 py-2 text-[13px] font-semibold text-ink transition hover:bg-pulse-dim"
        >
          <KeyRound className="h-4 w-4" /> Upgrade to Pro
        </button>
      ) : (
        <button
          onClick={() => openPricing(plan === "agency" ? "agency" : "pro")}
          className="flex items-center gap-2 rounded-lg border border-pulse/40 bg-pulse/10 px-4 py-2 text-[13px] font-semibold text-pulse transition hover:bg-pulse/20"
        >
          <Package className="h-4 w-4" /> Buy credit top-up
        </button>
      )}
      <a
        href="/#signals"
        className="flex items-center gap-2 rounded-lg border border-line-2 bg-panel px-4 py-2 text-[13px] font-medium text-zinc-200 transition hover:border-pulse/40"
      >
        Run a signal lookup <ArrowRight className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
