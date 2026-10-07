"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import type { SessionUser, SignalRow } from "@/lib/types";
import { SignInModal } from "@/components/SignInModal";
import { PricingModal } from "@/components/PricingModal";
import { NewsletterModal } from "@/components/NewsletterModal";
import { PitchModal } from "@/components/PitchModal";

type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface UIContextValue {
  user: SessionUser | null;
  toast: (message: string, kind?: ToastKind) => void;
  openSignIn: () => void;
  openPricing: (prefillPlan?: "pro" | "agency") => void;
  openNewsletter: () => void;
  openPitch: (signal: SignalRow) => void;
  refreshUser: () => Promise<void>;
}

const UIContext = createContext<UIContextValue | null>(null);

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used inside <AppShell>");
  return ctx;
}

let toastSeq = 1;

export function AppShell({
  user,
  children,
}: {
  user: SessionUser | null;
  children: ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [signInOpen, setSignInOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [prefillPlan, setPrefillPlan] = useState<"pro" | "agency" | undefined>();
  const [newsletterOpen, setNewsletterOpen] = useState(false);
  const [pitchSignal, setPitchSignal] = useState<SignalRow | null>(null);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(user);

  const toast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = toastSeq++;
    setToasts((prev) => [...prev.slice(-3), { id, message, kind }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4600);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth", { cache: "no-store" });
      const body = (await res.json()) as { user: SessionUser | null };
      setCurrentUser(body.user);
    } catch {
      setCurrentUser(null);
    }
  }, []);

  const value = useMemo<UIContextValue>(
    () => ({
      user: currentUser,
      toast,
      openSignIn: () => setSignInOpen(true),
      openPricing: (plan) => {
        setPrefillPlan(plan);
        setPricingOpen(true);
      },
      openNewsletter: () => setNewsletterOpen(true),
      openPitch: (signal) => setPitchSignal(signal),
      refreshUser,
    }),
    [currentUser, toast, refreshUser],
  );

  return (
    <UIContext.Provider value={value}>
      {children}

      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
      <PricingModal
        open={pricingOpen}
        prefillPlan={prefillPlan}
        onClose={() => setPricingOpen(false)}
      />
      <NewsletterModal
        open={newsletterOpen}
        onClose={() => setNewsletterOpen(false)}
      />
      <PitchModal signal={pitchSignal} onClose={() => setPitchSignal(null)} />

      <div className="pointer-events-none fixed bottom-5 right-5 z-[90] flex w-full max-w-sm flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="pointer-events-auto flex items-start gap-2.5 rounded-lg border border-line-2 bg-panel-2 px-3.5 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
            >
              {t.kind === "success" && (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-pulse" />
              )}
              {t.kind === "error" && (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              )}
              {t.kind === "info" && (
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-ember" />
              )}
              <p className="flex-1 text-[13px] leading-snug text-zinc-200">
                {t.message}
              </p>
              <button
                onClick={() =>
                  setToasts((prev) => prev.filter((x) => x.id !== t.id))
                }
                className="rounded p-0.5 text-mute transition hover:text-zinc-200"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </UIContext.Provider>
  );
}
