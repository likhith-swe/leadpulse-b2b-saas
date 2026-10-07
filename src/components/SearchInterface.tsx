"use client";

import { useState } from "react";
import { Search, MapPin, Gauge, Loader2, Lock } from "lucide-react";
import { TECH_CATALOG, CITY_CATALOG } from "@/lib/catalog";
import { useUI } from "@/components/AppShell";

export interface SearchParams {
  tech: string;
  city: string;
  velocityMin: number;
}

export function SearchInterface({
  onSearch,
  loading,
  defaultTech = "react",
  defaultCity = "bangalore",
}: {
  onSearch: (params: SearchParams) => void;
  loading: boolean;
  defaultTech?: string;
  defaultCity?: string;
}) {
  const { user, openSignIn } = useUI();
  const [tech, setTech] = useState(defaultTech);
  const [city, setCity] = useState(defaultCity);
  const [velocityMin, setVelocityMin] = useState(0);

  const lookupsLeft = user
    ? Math.max(0, user.dailyQuotaLimit - user.dailyQuotaUsed)
    : null;

  function submit() {
    if (!user) {
      openSignIn();
      return;
    }
    onSearch({ tech, city, velocityMin });
  }

  return (
    <div className="rounded-xl border border-line-2 bg-panel p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-mute">
          Query the live hiring feed
        </p>
        {user ? (
          <p className="text-[11px] tabular-nums text-mute">
            {lookupsLeft}/{user.dailyQuotaLimit} lookups left today · resets 00:00 UTC
          </p>
        ) : (
          <button onClick={openSignIn} className="flex items-center gap-1 text-[11px] text-pulse hover:underline">
            <Lock className="h-3 w-3" /> Sign in for 5 free lookups/day
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {TECH_CATALOG.map((t) => (
          <button
            key={t.slug}
            onClick={() => setTech(t.slug)}
            className={`rounded-md border px-3 py-1.5 text-[12.5px] font-medium transition ${
              tech === t.slug
                ? "border-pulse/50 bg-pulse/10 text-pulse"
                : "border-line-2 bg-panel-2/60 text-zinc-300 hover:border-line-2 hover:text-zinc-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full appearance-none rounded-lg border border-line-2 bg-ink py-2.5 pl-9 pr-8 text-sm text-zinc-100 outline-none transition focus:border-pulse/50 focus:ring-2 focus:ring-pulse/20"
          >
            {CITY_CATALOG.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label} · {c.country}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-line-2 bg-ink px-3">
          <Gauge className="h-4 w-4 shrink-0 text-mute" />
          <input
            type="range"
            min={0}
            max={90}
            step={5}
            value={velocityMin}
            onChange={(e) => setVelocityMin(Number(e.target.value))}
            className="w-full accent-[#3ddc97]"
          />
          <span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-mute">
            {velocityMin > 0 ? `score ≥${velocityMin}` : "any score"}
          </span>
        </div>

        <button
          onClick={submit}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-lg bg-pulse px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-pulse-dim disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {loading ? "Scanning…" : "Scan hiring feed"}
        </button>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
        Pipeline: JSearch ingestion → 48h cache → company parsing → decision-maker
        enrichment → syntax + MX validation → Hiring Velocity Score. A job post is
        proof of $50k–$150k in approved budget.
      </p>
    </div>
  );
}
