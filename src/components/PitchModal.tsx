"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Sparkles,
  Copy,
  Check,
  Lock,
  Loader2,
  RefreshCw,
  Send,
  ArrowUpRight,
} from "lucide-react";
import type { SignalRow } from "@/lib/types";
import { useUI } from "@/components/AppShell";

interface PitchState {
  pitch: string;
  subject: string;
  model: string;
  locked: boolean;
}

export function PitchModal({
  signal,
  onClose,
}: {
  signal: SignalRow | null;
  onClose: () => void;
}) {
  const { user, toast, openPricing, openSignIn } = useUI();
  const [state, setState] = useState<PitchState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paywall, setPaywall] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!signal) return;
    setLoading(true);
    setError(null);
    setPaywall(false);
    setState(null);
    try {
      const res = await fetch("/api/generate-pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signalId: signal.id }),
      });
      const body = (await res.json()) as PitchState & {
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        if (body.code === "upgrade_required" || body.code === "credits_exhausted") {
          setPaywall(true);
          setError(body.error ?? "Upgrade required.");
        } else if (body.code === "auth_required") {
          setError(body.error ?? "Sign in to generate pitches.");
        } else {
          setError(body.error ?? "Pitch generation failed.");
        }
        setLoading(false);
        return;
      }
      setState({
        pitch: body.pitch,
        subject: body.subject,
        model: body.model,
        locked: body.locked,
      });
      setLoading(false);
    } catch {
      setError("Network error. Retry.");
      setLoading(false);
    }
  }, [signal]);

  useEffect(() => {
    if (signal) {
      if (!user) {
        setError("Sign in to generate a 1-click pitch.");
        setState(null);
        setPaywall(false);
        setLoading(false);
      } else {
        generate();
      }
    } else {
      setState(null);
      setError(null);
      setPaywall(false);
      setCopied(false);
    }
  }, [signal, user, generate]);

  async function copyPitch() {
    if (!state) return;
    try {
      await navigator.clipboard.writeText(`Subject: ${state.subject}\n\n${state.pitch}`);
      setCopied(true);
      toast("Pitch copied to clipboard.", "success");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Clipboard unavailable in this browser.", "error");
    }
  }

  return (
    <AnimatePresence>
      {signal && (
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
            className="relative w-full max-w-xl rounded-xl border border-line-2 bg-panel p-6 shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded p-1 text-mute transition hover:text-zinc-200"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-pulse" />
              <h2 className="text-[15px] font-semibold tracking-tight text-zinc-100">
                1-Click Pitch — {signal.companyName}
              </h2>
            </div>

            <div className="mb-4 rounded-lg border border-line bg-ink/70 px-4 py-3 text-[12px] text-mute">
              <span className="font-medium text-zinc-300">{signal.jobTitle}</span>
              <span className="mx-1.5 text-zinc-700">·</span>
              {signal.techStackTags.slice(0, 3).join(", ")}
              <span className="mx-1.5 text-zinc-700">·</span>
              {signal.location}
              {signal.lead && (
                <>
                  <span className="mx-1.5 text-zinc-700">·</span>
                  to {signal.lead.name} ({signal.lead.roleTitle})
                </>
              )}
            </div>

            {loading && (
              <div className="space-y-2.5 rounded-lg border border-line bg-panel-2/60 p-5">
                <div className="lp-skeleton h-3 w-2/5 rounded" />
                <div className="lp-skeleton h-3 w-full rounded" />
                <div className="lp-skeleton h-3 w-11/12 rounded" />
                <div className="lp-skeleton h-3 w-4/5 rounded" />
                <p className="pt-2 text-[11px] text-zinc-600">
                  Groq Llama 3.3 70B is drafting against the live job requirements…
                </p>
              </div>
            )}

            {!loading && error && !paywall && (
              <div className="rounded-lg border border-danger/30 bg-danger/10 p-4">
                <p className="text-[13px] text-danger">{error}</p>
                {!user && (
                  <button
                    onClick={() => {
                      onClose();
                      openSignIn();
                    }}
                    className="mt-3 rounded-lg bg-pulse px-4 py-2 text-[13px] font-semibold text-ink transition hover:bg-pulse-dim"
                  >
                    Sign in
                  </button>
                )}
              </div>
            )}

            {!loading && paywall && (
              <div className="rounded-lg border border-ember/30 bg-ember/[0.07] p-5">
                <div className="mb-2 flex items-center gap-2 text-ember">
                  <Lock className="h-4 w-4" />
                  <p className="text-[13px] font-semibold">
                    AI pitch drafts are a Pro feature
                  </p>
                </div>
                <p className="mb-4 text-[13px] leading-relaxed text-zinc-300">
                  {error} Pro includes 500 verified emails per month, unmasked
                  exports, and 1-click pitches referencing the exact job post.
                </p>
                <button
                  onClick={() => {
                    onClose();
                    openPricing("pro");
                  }}
                  className="rounded-lg bg-pulse px-4 py-2 text-[13px] font-semibold text-ink transition hover:bg-pulse-dim"
                >
                  View plans — from ₹1,999/mo
                </button>
              </div>
            )}

            {!loading && state && (
              <>
                <div className="rounded-lg border border-line bg-panel-2/60 p-5">
                  <p className="mb-3 border-b border-line pb-3 text-[13px]">
                    <span className="text-mute">Subject: </span>
                    <span className="font-medium text-zinc-100">{state.subject}</span>
                  </p>
                  <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-zinc-200">
                    {state.pitch}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    onClick={copyPitch}
                    className="flex items-center gap-2 rounded-lg bg-pulse px-3.5 py-2 text-[13px] font-semibold text-ink transition hover:bg-pulse-dim"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied" : "Copy to clipboard"}
                  </button>
                  <a
                    href="/api/go/instantly"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-line-2 bg-panel-3 px-3.5 py-2 text-[13px] font-medium text-zinc-200 transition hover:border-pulse/40 hover:text-pulse"
                  >
                    <Send className="h-4 w-4" />
                    Export to Instantly
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                  <a
                    href="/api/go/smartlead"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-line-2 bg-panel-3 px-3.5 py-2 text-[13px] font-medium text-zinc-200 transition hover:border-pulse/40 hover:text-pulse"
                  >
                    <Send className="h-4 w-4" />
                    Smartlead
                  </a>
                  <button
                    onClick={generate}
                    className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[12px] text-mute transition hover:text-zinc-200"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Regenerate
                  </button>
                </div>
                <p className="mt-3 text-[11px] text-zinc-600">
                  Generated by {state.model} · 1 email credit deducted · tracked
                  partner links log to affiliate_clicks.
                </p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
