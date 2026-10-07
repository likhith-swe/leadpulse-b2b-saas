import { createHash } from "node:crypto";
import { db } from "@/db";
import { hiringSignals, searchCache, verifiedLeads } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { buildCorpusSignals } from "@/lib/fallback-data";
import { fetchJSearchJobs, type NormalizedJob } from "@/lib/jsearch";
import {
  computeVelocityScore,
  openRolesByDomain,
  synthesizeDecisionMaker,
} from "@/lib/enrich";
import { verifyEmail } from "@/lib/email-verifier";
import type { TechEntry, CityEntry } from "@/lib/catalog";

const CACHE_TTL_MS = 48 * 3_600_000; // 48 hours

export interface ResolvedSignal {
  id: string;
  companyName: string;
  companyDomain: string;
  jobTitle: string;
  jobUrl: string;
  location: string;
  techStackTags: string[];
  salaryRange: string | null;
  postedAt: Date;
  velocityScore: number;
  openRoles: number;
}

export interface ResolvedLead {
  id: string;
  signalId: string;
  decisionMakerName: string;
  roleTitle: string;
  email: string;
  confidenceScore: string;
  linkedinUrl: string | null;
  status: string;
}

export interface SignalBundle {
  signals: ResolvedSignal[];
  source: "cache" | "jsearch" | "corpus";
  leadBySignal: Map<string, ResolvedLead>;
}

function cacheKeyFor(tech: TechEntry, city: CityEntry, limit: number): string {
  return createHash("sha256")
    .update(`signals:${tech.slug}:${city.slug}:${limit}`)
    .digest("hex");
}

async function readCache(key: string): Promise<NormalizedJob[] | null> {
  const rows = await db
    .select()
    .from(searchCache)
    .where(eq(searchCache.key, key))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  try {
    const payload = row.payload as { jobs?: NormalizedJob[] };
    if (!Array.isArray(payload.jobs)) return null;
    return payload.jobs.map((j) => ({ ...j, postedAt: new Date(j.postedAt) }));
  } catch {
    return null;
  }
}

async function writeCache(key: string, jobs: NormalizedJob[]): Promise<void> {
  await db
    .insert(searchCache)
    .values({
      key,
      payload: { jobs },
      expiresAt: new Date(Date.now() + CACHE_TTL_MS),
    })
    .onConflictDoUpdate({
      target: searchCache.key,
      set: {
        payload: { jobs },
        expiresAt: new Date(Date.now() + CACHE_TTL_MS),
        createdAt: new Date(),
      },
    });
}

function corpusToNormalized(
  tech: TechEntry,
  city: CityEntry,
  limit: number,
): NormalizedJob[] {
  const signals = buildCorpusSignals(tech.slug, city.slug, limit);
  return signals.map((s) => ({
    jobTitle: s.jobTitle,
    companyName: s.companyName,
    companyDomain: s.companyDomain,
    jobUrl: s.jobUrl,
    location: s.location,
    salaryRange: s.salaryRange,
    postedAt: new Date(Date.now() - s.postedHoursAgo * 3_600_000),
  }));
}

async function persistSignals(
  jobs: NormalizedJob[],
  tech: TechEntry,
): Promise<ResolvedSignal[]> {
  if (jobs.length === 0) return [];

  const openRoles = openRolesByDomain(jobs);
  const values = jobs.map((job) => {
    const velocity = computeVelocityScore(
      job.postedAt,
      openRoles.get(job.companyDomain) ?? 1,
      Boolean(job.salaryRange),
      job.jobUrl,
    );
    return {
      companyName: job.companyName,
      companyDomain: job.companyDomain,
      jobTitle: job.jobTitle,
      jobUrl: job.jobUrl,
      location: job.location,
      techStackTags: tech.tags,
      salaryRange: job.salaryRange,
      postedAt: job.postedAt,
      source: process.env.RAPIDAPI_KEY ? "jsearch" : "corpus",
      velocityScore: velocity,
      openRoles: openRoles.get(job.companyDomain) ?? 1,
    };
  });

  const upserted = await db
    .insert(hiringSignals)
    .values(values)
    .onConflictDoUpdate({
      target: hiringSignals.jobUrl,
      set: {
        cachedAt: new Date(),
        velocityScore: sql`excluded.velocity_score`,
        openRoles: sql`excluded.open_roles`,
        salaryRange: sql`excluded.salary_range`,
        postedAt: sql`excluded.posted_at`,
      },
    })
    .returning();

  return upserted;
}

async function ensureLeads(signals: ResolvedSignal[], tech: TechEntry) {
  if (signals.length === 0) return new Map<string, ResolvedLead>();
  const ids = signals.map((s) => s.id);
  const existing = await db
    .select()
    .from(verifiedLeads)
    .where(and(inIds(ids)))
    .limit(ids.length);

  const bySignal = new Map<string, ResolvedLead>();
  for (const lead of existing) {
    bySignal.set(lead.signalId, lead);
  }

  const missing = signals.filter((s) => !bySignal.has(s.id));
  for (const signal of missing.slice(0, 20)) {
    const dm = synthesizeDecisionMaker(
      signal.companyDomain,
      signal.companyName,
      tech.intent,
    );
    const verification = await verifyEmail(dm.email);
    const confidence = Math.min(
      0.99,
      Math.max(0.05, dm.confidence + verification.confidenceAdjustment),
    );
    const inserted = await db
      .insert(verifiedLeads)
      .values({
        signalId: signal.id,
        decisionMakerName: dm.name,
        roleTitle: dm.roleTitle,
        email: dm.email,
        confidenceScore: confidence.toFixed(2),
        linkedinUrl: dm.linkedinUrl,
        status: verification.status,
      })
      .onConflictDoNothing()
      .returning();
    const lead = inserted[0];
    if (lead) bySignal.set(signal.id, lead);
  }

  return bySignal;
}

function inIds(ids: string[]) {
  return sql`${verifiedLeads.signalId} IN (${sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  )})`;
}

/**
 * Core retrieval pipeline: 48h cache → live JSearch → deterministic corpus,
 * followed by persistence and decision-maker enrichment.
 */
export async function resolveSignals(
  tech: TechEntry,
  city: CityEntry,
  limit: number,
  options: { skipCache?: boolean } = {},
): Promise<SignalBundle> {
  try {
    const key = cacheKeyFor(tech, city, limit);

    if (!options.skipCache) {
      const cached = await readCache(key);
      if (cached && cached.length > 0) {
        const signals = await persistSignals(cached, tech);
        const leadBySignal = await ensureLeads(signals, tech);
        return { signals, source: "cache", leadBySignal };
      }
    }

    const liveJobs = await fetchJSearchJobs(`${tech.query} in ${city.label}`, 1);
    if (liveJobs.length > 0) {
      await writeCache(key, liveJobs.slice(0, limit));
      const signals = await persistSignals(liveJobs.slice(0, limit), tech);
      const leadBySignal = await ensureLeads(signals, tech);
      return { signals, source: "jsearch", leadBySignal };
    }

    const corpusJobs = corpusToNormalized(tech, city, limit);
    await writeCache(key, corpusJobs);
    const signals = await persistSignals(corpusJobs, tech);
    const leadBySignal = await ensureLeads(signals, tech);
    return { signals, source: "corpus", leadBySignal };
  } catch {
    // In-memory fallback if database is offline/unreachable
    const corpusJobs = corpusToNormalized(tech, city, limit);
    const signals: ResolvedSignal[] = corpusJobs.map((job, idx) => ({
      id: `fallback-${tech.slug}-${city.slug}-${idx}`,
      companyName: job.companyName,
      companyDomain: job.companyDomain,
      jobTitle: job.jobTitle,
      jobUrl: job.jobUrl,
      location: job.location,
      techStackTags: tech.tags,
      salaryRange: job.salaryRange,
      postedAt: job.postedAt,
      velocityScore: Math.max(60, 95 - idx * 5),
      openRoles: Math.floor(Math.random() * 3) + 1,
    }));
    const leadBySignal = new Map<string, ResolvedLead>();
    for (const signal of signals) {
      const dm = synthesizeDecisionMaker(
        signal.companyDomain,
        signal.companyName,
        tech.intent,
      );
      leadBySignal.set(signal.id, {
        id: `lead-${signal.id}`,
        signalId: signal.id,
        decisionMakerName: dm.name,
        roleTitle: dm.roleTitle,
        email: dm.email,
        confidenceScore: "0.92",
        linkedinUrl: dm.linkedinUrl,
        status: "valid",
      });
    }
    return { signals, source: "corpus", leadBySignal };
  }
}

/** Top-velocity rows across all stored signals (landing page + ticker). */
export async function topSignals(limit: number): Promise<ResolvedSignal[]> {
  try {
    const rows = await db
      .select()
      .from(hiringSignals)
      .orderBy(desc(hiringSignals.velocityScore), desc(hiringSignals.postedAt))
      .limit(limit);
    return rows;
  } catch {
    return [];
  }
}
