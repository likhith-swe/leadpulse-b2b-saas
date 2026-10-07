"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X, Mail, Loader2, KeyRound, ShieldCheck } from "lucide-react";
import { useUI } from "@/components/AppShell";

export function SignInModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { toast, refreshUser } = useUI();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState<null | "google" | "magic">(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(method: "google" | "magic", e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim())) {
      setError("Enter a valid work email to continue.");
      return;
    }
    setBusy(method);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "signin",
          email: email.trim(),
          fullName: fullName.trim() || undefined,
          method,
        }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !body.ok) {
        setError(body.error ?? "Sign-in failed. Retry.");
        setBusy(null);
        return;
      }
      await refreshUser();
      router.refresh();
      toast("Signed in. Free tier includes 5 signal lookups per day.", "success");
      setEmail("");
      setFullName("");
      onClose();
    } catch {
      setError("Network error. Retry.");
      setBusy(null);
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

            <div className="mb-1 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-pulse" />
              <h2 className="text-[15px] font-semibold tracking-tight text-zinc-100">
                Access LeadPulse
              </h2>
            </div>
            <p className="mb-5 text-[13px] leading-relaxed text-mute">
              5 free signal lookups per day. No card required. Production auth
              runs on Supabase Google OAuth and magic links; this preview uses
              an equivalent signed-cookie session.
            </p>

            <form onSubmit={(e) => signIn("magic", e)} className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.12em] text-mute">
                  Work email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@agency.com"
                  className="w-full rounded-lg border border-line-2 bg-ink px-3 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-pulse/50 focus:ring-2 focus:ring-pulse/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.12em] text-mute">
                  Full name <span className="normal-case text-zinc-600">(optional)</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Priya Nair"
                  className="w-full rounded-lg border border-line-2 bg-ink px-3 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-pulse/50 focus:ring-2 focus:ring-pulse/20"
                />
              </div>

              {error && (
                <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[12px] text-danger">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy !== null}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-pulse px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-pulse-dim disabled:opacity-50"
              >
                {busy === "magic" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Continue with magic link
              </button>

              <div className="flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-line" />
                <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                  or
                </span>
                <div className="h-px flex-1 bg-line" />
              </div>

              <button
                type="button"
                disabled={busy !== null}
                onClick={(e) => signIn("google", undefined)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-line-2 bg-panel-2 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-line-2 hover:bg-panel-3 disabled:opacity-50"
              >
                {busy === "google" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z"
                    />
                  </svg>
                )}
                Continue with Google
              </button>
            </form>

            <p className="mt-4 flex items-center gap-1.5 text-[11px] text-zinc-600">
              <ShieldCheck className="h-3.5 w-3.5" />
              Session is an httpOnly signed cookie; emails are never resold.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
