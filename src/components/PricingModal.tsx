"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check, Loader2, Zap, Building2, Package } from "lucide-react";
import { PLANS, TOPUPS } from "@/lib/catalog";
import { useUI } from "@/components/AppShell";

export function PricingModal({
  open,
  prefillPlan,
  onClose,
}: {
  open: boolean;
  prefillPlan?: "pro" | "agency";
  onClose: () => void;
}) {
  const { user, toast, openSignIn, refreshUser } = useUI();
  const router = useRouter();
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [busy, setBusy] = useState<string | null>(null);

  async function subscribe(tier: "pro" | "agency") {
    if (!user) {
      onClose();
      openSignIn();
      toast("Sign in first, then pick a plan.", "info");
      return;
    }
    setBusy(tier);
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "subscribe",
          plan: tier,
          provider: currency === "INR" ? "razorpay" : "stripe",
          currency,
        }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        mode?: string;
        error?: string;
        message?: string;
        checkoutUrl?: string | null;
      };
      if (!res.ok || !body.ok) {
        toast(body.error ?? "Checkout failed. Retry.", "error");
        setBusy(null);
        return;
      }
      if (body.checkoutUrl) {
        window.location.href = body.checkoutUrl;
        return;
      }
      await refreshUser();
      router.refresh();
      toast(body.message ?? "Plan activated.", "success");
      onClose();
    } catch {
      toast("Network error. Retry.", "error");
      setBusy(null);
    }
  }

  async function buyTopUp(sku: string) {
    if (!user) {
      onClose();
      openSignIn();
      return;
    }
    setBusy(sku);
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "topup", sku, currency }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok || !body.ok) {
        toast(body.error ?? "Top-up failed. Retry.", "error");
        setBusy(null);
        return;
      }
      await refreshUser();
      router.refresh();
      toast(body.message ?? "Credits added.", "success");
      setBusy(null);
    } catch {
      toast("Network error. Retry.", "error");
      setBusy(null);
    }
  }

  const price = (inr: number, usd: number) =>
    currency === "INR" ? `₹${inr.toLocaleString("en-IN")}` : `$${usd}`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="relative my-6 w-full max-w-4xl rounded-xl border border-line-2 bg-panel p-6 shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded p-1 text-mute transition hover:text-zinc-200"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
                  Plans and credit packs
                </h2>
                <p className="mt-0.5 text-[13px] text-mute">
                  Verified decision-maker emails, unmasked exports, AI pitch
                  drafts. Cancel anytime.
                </p>
              </div>
              <div className="flex rounded-lg border border-line-2 bg-ink p-0.5">
                {(["INR", "USD"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition ${
                      currency === c
                        ? "bg-panel-3 text-zinc-100"
                        : "text-mute hover:text-zinc-300"
                    }`}
                  >
                    {c === "INR" ? "₹ INR · Razorpay" : "$ USD · Stripe"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {PLANS.map((plan) => {
                const isCurrent = user?.plan === plan.tier;
                const highlighted = plan.tier === "pro";
                return (
                  <div
                    key={plan.tier}
                    className={`relative flex flex-col rounded-lg border p-5 ${
                      highlighted
                        ? "border-pulse/40 bg-pulse/[0.05]"
                        : "border-line-2 bg-panel-2/60"
                    }`}
                  >
                    {highlighted && (
                      <span className="absolute -top-2.5 left-4 rounded-full border border-pulse/40 bg-ink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-pulse">
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
                      <span className="text-2xl font-semibold tabular-nums tracking-tight text-zinc-50">
                        {price(plan.priceINR, plan.priceUSD)}
                      </span>
                      {plan.priceINR > 0 && (
                        <span className="text-[11px] text-mute">/ {plan.cadence}</span>
                      )}
                    </div>
                    <p className="mb-4 text-[12px] font-medium text-pulse">
                      {plan.verifiedEmails}
                    </p>
                    <ul className="mb-5 flex-1 space-y-2">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-[12.5px] leading-snug text-zinc-300">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pulse" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      disabled={isCurrent || busy !== null}
                      onClick={() => plan.tier !== "free" && subscribe(plan.tier)}
                      className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-default ${
                        isCurrent
                          ? "border border-line-2 bg-panel-3 text-mute"
                          : highlighted
                            ? "bg-pulse text-ink hover:bg-pulse-dim disabled:opacity-50"
                            : "border border-line-2 bg-panel-3 text-zinc-200 hover:border-pulse/40 disabled:opacity-50"
                      }`}
                    >
                      {isCurrent ? "Current plan" : busy === plan.tier ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Processing…
                        </span>
                      ) : (
                        plan.cta
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {user && user.plan !== "free" && (
              <div className="mt-6 rounded-lg border border-line-2 bg-ink/60 p-4">
                <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.14em] text-mute">
                  Pay-as-you-go credit top-ups · {user.creditsRemaining} credits left
                </p>
                <div className="flex flex-wrap gap-3">
                  {TOPUPS.map((t) => (
                    <button
                      key={t.sku}
                      disabled={busy !== null}
                      onClick={() => buyTopUp(t.sku)}
                      className="flex items-center gap-3 rounded-lg border border-line-2 bg-panel-2 px-4 py-2.5 text-left transition hover:border-pulse/40 disabled:opacity-50"
                    >
                      {busy === t.sku ? (
                        <Loader2 className="h-4 w-4 animate-spin text-pulse" />
                      ) : (
                        <Package className="h-4 w-4 text-pulse" />
                      )}
                      <span className="text-[13px] font-medium text-zinc-200">
                        +{t.credits} verified emails
                      </span>
                      <span className="text-[13px] tabular-nums text-pulse">
                        {price(t.priceINR, t.priceUSD)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-4 text-[11px] text-zinc-600">
              Indian customers are billed through Razorpay Subscriptions; international
              customers through Stripe Billing. Invoices carry GST/VAT fields.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
