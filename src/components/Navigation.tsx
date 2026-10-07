"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Menu,
  X,
  KeyRound,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  Radar,
} from "lucide-react";
import { useUI } from "@/components/AppShell";
import { TECH_CATALOG } from "@/lib/catalog";

export function Navigation() {
  const { user, openSignIn, openPricing, toast } = useUI();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "signout" }),
    });
    setMenuOpen(false);
    window.location.href = "/";
  }

  const planBadge =
    user && user.plan === "agency" ? (
      <span className="rounded border border-ember/40 bg-ember/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ember">
        Agency
      </span>
    ) : user && user.plan === "pro" ? (
      <span className="rounded border border-pulse/40 bg-pulse/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-pulse">
        Pro
      </span>
    ) : (
      <span className="rounded border border-line-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-mute">
        Free
      </span>
    );

  const navLinks = (
    <>
      <a href="/#signals" className="text-[13px] text-mute transition hover:text-zinc-100">
        Live Signals
      </a>
      <a href="/#how" className="text-[13px] text-mute transition hover:text-zinc-100">
        Pipeline
      </a>
      <a href="/#pricing" className="text-[13px] text-mute transition hover:text-zinc-100">
        Pricing
      </a>
      <Link
        href="/companies-hiring/react/bangalore"
        className="flex items-center gap-1.5 text-[13px] text-mute transition hover:text-zinc-100"
      >
        <Radar className="h-3.5 w-3.5" />
        Radar Pages
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-[60] border-b border-line bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-pulse/40 bg-pulse/10">
            <Activity className="h-4 w-4 text-pulse" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-zinc-50">
            LeadPulse<span className="text-pulse"> AI</span>
          </span>
        </Link>

        <nav className="ml-6 hidden items-center gap-5 lg:flex">{navLinks}</nav>

        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <div className="hidden items-center gap-2 sm:flex">
                <span className="flex items-center gap-1.5 rounded-md border border-line-2 bg-panel px-2.5 py-1 text-[11px] tabular-nums text-zinc-300">
                  <KeyRound className="h-3 w-3 text-pulse" />
                  {user.creditsRemaining} credits
                </span>
                {planBadge}
              </div>

              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-md border border-line-2 bg-panel px-2.5 py-1.5 transition hover:border-line-2 hover:bg-panel-2"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-pulse/15 text-[10px] font-bold text-pulse">
                    {(user.fullName ?? user.email).slice(0, 1).toUpperCase()}
                  </span>
                  <span className="hidden max-w-[110px] truncate text-[12px] text-zinc-200 md:block">
                    {user.fullName ?? user.email.split("@")[0]}
                  </span>
                  <ChevronDown className="h-3 w-3 text-mute" />
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.14 }}
                      className="absolute right-0 top-full mt-1.5 w-52 rounded-lg border border-line-2 bg-panel-2 p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.5)]"
                    >
                      <div className="border-b border-line px-3 py-2">
                        <p className="truncate text-[12px] font-medium text-zinc-200">
                          {user.email}
                        </p>
                        <p className="text-[11px] tabular-nums text-mute">
                          {user.dailyQuotaUsed}/{user.dailyQuotaLimit} lookups today
                        </p>
                      </div>
                      <Link
                        href="/dashboard"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-[13px] text-zinc-300 transition hover:bg-panel-3 hover:text-zinc-100"
                      >
                        <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
                      </Link>
                      {user.plan === "free" && (
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            openPricing("pro");
                          }}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-pulse transition hover:bg-pulse/10"
                        >
                          <KeyRound className="h-3.5 w-3.5" /> Upgrade to Pro
                        </button>
                      )}
                      <button
                        onClick={signOut}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-zinc-300 transition hover:bg-panel-3 hover:text-danger"
                      >
                        <LogOut className="h-3.5 w-3.5" /> Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={openSignIn}
                className="hidden rounded-md border border-line-2 px-3.5 py-1.5 text-[13px] font-medium text-zinc-200 transition hover:border-line-2 hover:bg-panel-2 sm:block"
              >
                Sign in
              </button>
              <button
                onClick={() => openPricing("pro")}
                className="rounded-md bg-pulse px-3.5 py-1.5 text-[13px] font-semibold text-ink transition hover:bg-pulse-dim"
              >
                Get Pro
              </button>
            </>
          )}

          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-md border border-line-2 p-1.5 text-zinc-300 lg:hidden"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-t border-line bg-panel lg:hidden"
          >
            <div className="flex flex-col gap-3 px-5 py-4">
              {navLinks}
              <div className="mt-1 border-t border-line pt-3">
                <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-mute">
                  Radar pages
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {TECH_CATALOG.slice(0, 4).map((t) => (
                    <Link
                      key={t.slug}
                      href={`/companies-hiring/${t.slug}/bangalore`}
                      onClick={() => setMobileOpen(false)}
                      className="rounded border border-line-2 px-2 py-1 text-[11px] text-zinc-300"
                    >
                      {t.label} · Bengaluru
                    </Link>
                  ))}
                </div>
              </div>
              {user && pathname !== "/dashboard" && (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="text-[13px] text-pulse"
                >
                  Open dashboard →
                </Link>
              )}
              {!user && (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    openSignIn();
                  }}
                  className="rounded-md border border-line-2 px-3.5 py-2 text-[13px] text-zinc-200"
                >
                  Sign in
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
