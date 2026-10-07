"use client";

import { useCallback, useState } from "react";
import { SearchInterface, type SearchParams } from "@/components/SearchInterface";
import { LeadDataTable } from "@/components/LeadDataTable";
import { AdContainer } from "@/components/AdContainer";
import { useUI } from "@/components/AppShell";
import type { SearchResponse, SignalRow } from "@/lib/types";

/**
 * Client-side composition of the search form, results table, and the native
 * ad unit. Server pages embed this island wherever the live pipeline runs.
 */
export function SearchExperience({
  defaultTech,
  defaultCity,
}: {
  defaultTech?: string;
  defaultCity?: string;
}) {
  const { user, toast, openPricing, openPitch } = useUI();
  const [rows, setRows] = useState<SignalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | undefined>();
  const [lastParams, setLastParams] = useState<SearchParams | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const runSearch = useCallback(
    async (params: SearchParams) => {
      setLoading(true);
      setError(null);
      setLastParams(params);
      setHasSearched(true);
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...params, limit: 18 }),
        });
        const body = (await res.json()) as SearchResponse & {
          error?: string;
          code?: string;
        };
        if (!res.ok) {
          if (body.code === "quota_exhausted") {
            setError(body.error ?? "Daily limit reached.");
            openPricing("pro");
          } else if (body.code === "auth_required") {
            setError(body.error ?? "Sign in required.");
          } else {
            setError(body.error ?? "Search failed.");
          }
          setRows([]);
          setLoading(false);
          return;
        }
        setRows(body.rows);
        setSource(body.source);
        toast(
          `${body.rows.length} signals in ${body.tookMs}ms · ${body.quota.used}/${body.quota.limit} lookups used today.`,
          "success",
        );
        setLoading(false);
      } catch {
        setError("Network error. Retry the scan.");
        setRows([]);
        setLoading(false);
      }
    },
    [openPricing, toast],
  );

  return (
    <div id="signals" className="space-y-4">
      <SearchInterface
        onSearch={runSearch}
        loading={loading}
        defaultTech={defaultTech}
        defaultCity={defaultCity}
      />
      {(hasSearched || loading) && (
        <LeadDataTable
          rows={rows}
          loading={loading}
          source={source}
          error={error}
          onGeneratePitch={(row) => openPitch(row)}
          onRetry={lastParams ? () => runSearch(lastParams) : undefined}
        />
      )}
      {!hasSearched && user && (
        <div className="rounded-xl border border-dashed border-line-2 bg-panel/50 px-6 py-10 text-center">
          <p className="text-[13px] text-mute">
            Pick a stack and a city above, then scan. Each lookup returns up to
            18 live hiring signals with the budget owner for every role.
          </p>
        </div>
      )}
      {hasSearched && rows.length > 0 && <AdContainer placement="below-results" />}
    </div>
  );
}
