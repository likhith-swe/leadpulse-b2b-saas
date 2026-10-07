"use client";

import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Radio, Loader2, CheckCircle2 } from "lucide-react";
import { useUI } from "@/components/AppShell";

export function NewsletterModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useUI();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subscribe(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, sourcePage: window.location.pathname }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) {
        setError(body.error ?? "Subscription failed. Retry.");
        setBusy(false);
        return;
      }
      setDone(true);
      toast("Subscribed to the Weekly Hiring Radar.", "success");
    } catch {
      setError("Network error. Retry.");
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
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
            className="relative w-full max-w-md rounded-xl border border-line-2 bg-panel p-6 shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded p-1 text-mute transition hover:text-zinc-200"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-2 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="lp-live-dot absolute h-2 w-2 rounded-full bg-pulse" />
              </span>
              <Radio className="h-4 w-4 text-pulse" />
              <h2 className="text-[15px] font-semibold tracking-tight text-zinc-100">
                Weekly Hiring Radar
              </h2>
            </div>

            {done ? (
              <div className="rounded-lg border border-pulse/25 bg-pulse/10 p-4">
                <div className="mb-1.5 flex items-center gap-2 text-pulse">
                  <CheckCircle2 className="h-4 w-4" />
                  <p className="text-sm font-semibold">You are on the list.</p>
                </div>
                <p className="text-[13px] leading-relaxed text-zinc-300">
                  The first issue lands Monday at 8:00 AM IST. Each issue lists
                  the 50 fastest-growing funded startups hiring in tech this
                  week, with exact roles and stacks.
                </p>
              </div>
            ) : (
              <>
                <p className="mb-5 text-[13px] leading-relaxed text-mute">
                  Get the 50 fastest-growing funded startups hiring in tech
                  this week, delivered every Monday at 8:00 AM IST. Sponsors
                  reach this list at $60–$100 CPM.
                </p>
                <form onSubmit={subscribe} className="space-y-3">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-lg border border-line-2 bg-ink px-3 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-pulse/50 focus:ring-2 focus:ring-pulse/20"
                  />
                  {error && (
                    <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[12px] text-danger">
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-pulse px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-pulse-dim disabled:opacity-50"
                  >
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    Subscribe — free
                  </button>
                </form>
                <p className="mt-3 text-[11px] text-zinc-600">
                  Synced to Resend/Loops CRM on signup. Unsubscribe anytime.
                </p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
