"use client";

import { Check, Package, Zap, Building2 } from "lucide-react";
import { PLANS } from "@/lib/catalog";
import { useUI } from "@/components/AppShell";

export function PricingSection() {
  const { user, openPricing, openSignIn } = useUI();

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {PLANS.map((plan) => {
        const highlighted = plan.tier === "pro";
        const isCurrent = user?.plan === plan.tier;
        return (
          <div
            key={plan.tier}
            className={`relative flex flex-col rounded-xl border p-6 ${
              highlighted
                ? "border-pulse/40 bg-pulse/[0.05]"
                : "border-line-2 bg-panel"
            }`}
          >
            {highlighted && (
              <span className="absolute -top-2.5 left-5 rounded-full border border-pulse/40 bg-ink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-pulse">
                Most picked
              </span>
            )}
            <div className="mb-3 flex items-center gap-2">
              {plan.tier === "free" && <Package className="h-4 w-4 text-mute" />}
              {plan.tier === "pro" && <Zap className="h-4 w-4 text-pulse" />}
              {plan.tier === "agency" && <Building2 className="h-4 w-4 text-ember" />}
              <h3 className="text-sm font-semibold text-zinc-100">{plan.name}</h3>
            </div>
            <div className="mb-1 flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold tabular-nums tracking-tight text-zinc-50">
                {plan.priceINR === 0
                  ? "₹0"
                  : `₹${plan.priceINR.toLocaleString("en-IN")}`}
              </span>
              {plan.priceINR > 0 && (
                <span className="text-[11px] text-mute">/mo · or ${plan.priceUSD}/mo</span>
              )}
            </div>
            <p className="mb-5 text-[12px] font-medium text-pulse">{plan.verifiedEmails}</p>
            <ul className="mb-6 flex-1 space-y-2.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[13px] leading-snug text-zinc-300">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pulse" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() =>
                plan.tier === "free"
                  ? user
                    ? undefined
                    : openSignIn()
                  : openPricing(plan.tier)
              }
              disabled={isCurrent}
              className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                isCurrent
                  ? "border border-line-2 bg-panel-2 text-mute"
                  : highlighted
                    ? "bg-pulse text-ink hover:bg-pulse-dim"
                    : "border border-line-2 bg-panel-2 text-zinc-200 hover:border-pulse/40"
              }`}
            >
              {isCurrent ? "Current plan" : plan.cta}
            </button>
          </div>
        );
      })}
    </div>
  );
}
