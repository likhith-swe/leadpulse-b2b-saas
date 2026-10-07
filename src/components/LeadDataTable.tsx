"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Sparkles,
  Lock,
  Copy,
  ExternalLink,
  ShieldCheck,
  Database,
  Loader2,
  Info,
} from "lucide-react";
import type { SignalRow } from "@/lib/types";
import { timeAgo } from "@/lib/types";
import { useUI } from "@/components/AppShell";

function VelocityCell({ score }: { score: number }) {
  const tone =
    score >= 80 ? "bg-pulse" : score >= 65 ? "bg-ember" : "bg-zinc-600";
  const text =
    score >= 80 ? "text-pulse" : score >= 65 ? "text-ember" : "text-zinc-400";
  return (
    <div className="flex items-center gap-2" title="Hiring Velocity Score: recency + concurrent openings + salary transparency">
      <span className={`text-[13px] font-semibold tabular-nums ${text}`}>{score}</span>
      <div className="h-1 w-14 overflow-hidden rounded-full bg-panel-3">
        <div className={`h-full ${tone}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function EmailCell({ row }: { row: SignalRow }) {
  const { toast, openPricing } = useUI();
  const [copied, setCopied] = useState(false);
  const lead = row.lead;
  if (!lead) return <span className="text-zinc-600">—</span>;

  if (lead.obfuscated) {
    return (
      <button
        onClick={() => openPricing("pro")}
        className="group flex items-center gap-1.5 text-[12.5px] text-mute transition hover:text-ember"
        title="Unmask with Pro"
      >
        <span className="font-mono">{lead.email}</span>
        <Lock className="h-3 w-3 opacity-70 transition group-hover:opacity-100" />
      </button>
    );
  }

  const email = lead.email;

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      toast(`${email} copied.`, "success");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast("Clipboard unavailable.", "error");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[12px] text-zinc-200">{email}</span>
      <span
        className={`flex items-center gap-1 rounded border px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
          lead.emailStatus === "verified"
            ? "border-pulse/40 text-pulse"
            : "border-line-2 text-mute"
        }`}
        title={`Confidence ${(lead.confidence * 100).toFixed(0)}% · status: ${lead.emailStatus}`}
      >
        <ShieldCheck className="h-2.5 w-2.5" />
        {lead.emailStatus === "verified" ? "MX" : "syntax"}
      </span>
      <button onClick={copy} className="text-mute transition hover:text-pulse" aria-label="Copy email">
        {copied ? <Copy className="h-3.5 w-3.5 text-pulse" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

export function LeadDataTable({
  rows,
  loading,
  source,
  error,
  onGeneratePitch,
  onRetry,
  compact,
}: {
  rows: SignalRow[];
  loading: boolean;
  source?: string;
  error?: string | null;
  onGeneratePitch: (row: SignalRow) => void;
  onRetry?: () => void;
  compact?: boolean;
}) {
  const { user, toast, openPricing } = useUI();
  const [exporting, setExporting] = useState(false);

  async function exportCsv() {
    if (!user) return;
    if (user.plan === "free") {
      openPricing("pro");
      toast("CSV/JSON export is a Pro feature.", "info");
      return;
    }
    if (rows.length === 0) return;
    setExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signalIds: rows.map((r) => r.id), format: "csv" }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        toast(body.error ?? "Export failed.", "error");
        setExporting(false);
        return;
      }
      const csvText = await res.text();
      const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leadpulse-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast("CSV downloaded. Send it straight to your outreach tool below.", "success");
    } catch {
      toast("Network error during export.", "error");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line-2 bg-panel">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <p className="text-[13px] font-medium text-zinc-200">
          {loading ? "Scanning live job feeds…" : `${rows.length} hiring signals`}
        </p>
        {source && !loading && (
          <span className="flex items-center gap-1.5 rounded border border-line-2 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-mute">
            <Database className="h-3 w-3" />
            source: {source}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {user && user.plan !== "free" && rows.length > 0 && (
            <button
              onClick={exportCsv}
              disabled={exporting}
              className="flex items-center gap-1.5 rounded-md border border-line-2 bg-panel-2 px-3 py-1.5 text-[12px] font-medium text-zinc-200 transition hover:border-pulse/40 hover:text-pulse disabled:opacity-50"
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Export CSV
            </button>
          )}
          {user && user.plan === "free" && rows.length > 0 && (
            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 rounded-md border border-line-2 bg-panel-2 px-3 py-1.5 text-[12px] font-medium text-mute transition hover:text-ember"
            >
              <Lock className="h-3 w-3" /> Export CSV — Pro
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 border-b border-line bg-danger/[0.06] px-4 py-3">
          <Info className="h-4 w-4 shrink-0 text-danger" />
          <p className="flex-1 text-[13px] text-danger">{error}</p>
          {onRetry && (
            <button onClick={onRetry} className="text-[12px] font-medium text-zinc-200 underline-offset-2 hover:underline">
              Retry
            </button>
          )}
        </div>
      )}

      <div className={compact ? "max-h-[430px] overflow-auto" : "max-h-[600px] overflow-auto"}>
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-panel-2/95 backdrop-blur">
            <tr className="border-b border-line text-[10px] uppercase tracking-[0.14em] text-mute">
              <th className="px-4 py-2.5 font-medium">Company</th>
              <th className="px-4 py-2.5 font-medium">Open role</th>
              <th className="px-4 py-2.5 font-medium">Velocity</th>
              <th className="px-4 py-2.5 font-medium">Decision-maker</th>
              <th className="px-4 py-2.5 font-medium">Verified email</th>
              <th className="px-4 py-2.5 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b border-line">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3.5">
                      <div className="lp-skeleton h-3.5 rounded" style={{ width: `${55 + ((i + j) % 4) * 12}%` }} />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading &&
              rows.map((row, i) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.03, 0.4), duration: 0.25 }}
                  className="group border-b border-line transition-colors last:border-0 hover:bg-panel-2/50"
                >
                  <td className="px-4 py-3 align-top">
                    <p className="text-[13px] font-semibold text-zinc-100">{row.companyName}</p>
                    <p className="text-[11px] text-mute">
                      {row.companyDomain} · {row.openRoles} open role{row.openRoles > 1 ? "s" : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <a
                      href={row.jobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] text-zinc-200 underline-offset-2 transition hover:text-pulse hover:underline"
                    >
                      {row.jobTitle}
                    </a>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {row.techStackTags.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded border border-line-2 bg-ink px-1.5 py-0.5 text-[10px] text-zinc-400">
                          {tag}
                        </span>
                      ))}
                      {row.salaryRange && (
                        <span className="text-[10px] tabular-nums text-ember">{row.salaryRange}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <VelocityCell score={row.velocityScore} />
                    <p className="mt-1 text-[10px] text-zinc-600">{timeAgo(row.postedAt)}</p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    {row.lead ? (
                      <>
                        <p className="text-[13px] text-zinc-200">{row.lead.name}</p>
                        <a
                          href={row.lead.linkedinUrl ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] text-mute transition hover:text-pulse"
                        >
                          {row.lead.roleTitle} <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <EmailCell row={row} />
                  </td>
                  <td className="px-4 py-3 text-right align-top">
                    <button
                      onClick={() => onGeneratePitch(row)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-pulse/40 bg-pulse/10 px-3 py-1.5 text-[12px] font-semibold text-pulse transition hover:bg-pulse/20"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Generate Pitch
                    </button>
                  </td>
                </motion.tr>
              ))}

            {!loading && rows.length === 0 && !error && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[13px] text-mute">
                  No signals match this filter yet. Lower the velocity threshold or switch stack.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Server-rendered variant for pSEO pages: static rows, no quota actions. */
export function StaticLeadTable({ rows }: { rows: SignalRow[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line-2 bg-panel">
      <div className="max-h-[560px] overflow-auto">
        <table className="w-full min-w-[820px] border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-panel-2/95 backdrop-blur">
            <tr className="border-b border-line text-[10px] uppercase tracking-[0.14em] text-mute">
              <th className="px-4 py-2.5 font-medium">Company</th>
              <th className="px-4 py-2.5 font-medium">Open role</th>
              <th className="px-4 py-2.5 font-medium">Velocity</th>
              <th className="px-4 py-2.5 font-medium">Decision-maker</th>
              <th className="px-4 py-2.5 font-medium">Verified email</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-line last:border-0 hover:bg-panel-2/50">
                <td className="px-4 py-3">
                  <p className="text-[13px] font-semibold text-zinc-100">{row.companyName}</p>
                  <p className="text-[11px] text-mute">{row.companyDomain}</p>
                </td>
                <td className="px-4 py-3">
                  <a href={row.jobUrl} target="_blank" rel="noopener noreferrer" className="text-[13px] text-zinc-200 hover:text-pulse">
                    {row.jobTitle}
                  </a>
                  <p className="mt-0.5 text-[10px] text-zinc-600">{row.techStackTags.join(" · ")}</p>
                </td>
                <td className="px-4 py-3">
                  <VelocityCell score={row.velocityScore} />
                </td>
                <td className="px-4 py-3">
                  {row.lead ? (
                    <>
                      <p className="text-[13px] text-zinc-200">{row.lead.name}</p>
                      <p className="text-[11px] text-mute">{row.lead.roleTitle}</p>
                    </>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5 font-mono text-[12px] text-mute">
                    {row.lead?.email ?? "—"}
                    <Lock className="h-3 w-3" />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
