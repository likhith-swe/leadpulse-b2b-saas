import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, findProfileByUserId, toSessionUser } from "@/lib/auth";
import { consumeSearchQuota, QuotaError, type ProfileRow } from "@/lib/quota";
import { resolveSignals } from "@/lib/signals";
import { findTech, findCity, TECH_CATALOG, CITY_CATALOG } from "@/lib/catalog";
import { maskEmail } from "@/lib/types";
import type { SearchResponse, SignalRow } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

interface SearchBody {
  tech?: string;
  city?: string;
  velocityMin?: number;
  limit?: number;
}

/**
 * POST /api/search — core signal extraction endpoint.
 * Validates quota → resolves signals (cache → JSearch → corpus) →
 * enriches decision makers → returns structured rows.
 */
export async function POST(req: NextRequest) {
  const started = Date.now();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to run signal lookups. Free accounts get 5/day.", code: "auth_required" },
      { status: 401 },
    );
  }

  let body: SearchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const tech = findTech(body.tech ?? "react") ?? TECH_CATALOG[0];
  const city = findCity(body.city ?? "bangalore") ?? CITY_CATALOG[0];
  const velocityMin = Math.min(95, Math.max(0, Number(body.velocityMin) || 0));
  const limit = Math.min(30, Math.max(5, Number(body.limit) || 18));

  const profile = await findProfileByUserId(user.id);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 401 });
  }

  try {
    await consumeSearchQuota(profile as ProfileRow);
  } catch (err) {
    if (err instanceof QuotaError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.code === "quota_exhausted" ? 429 : 402 },
      );
    }
    throw err;
  }

  try {
    const bundle = await resolveSignals(tech, city, limit);
    const freshProfile = await findProfileByUserId(user.id);
    const sessionUser = toSessionUser(freshProfile ?? profile);
    const obfuscate = sessionUser.plan === "free";

    const rows: SignalRow[] = bundle.signals
      .filter((s) => s.velocityScore >= velocityMin)
      .sort((a, b) => b.velocityScore - a.velocityScore)
      .map((s) => {
        const lead = bundle.leadBySignal.get(s.id);
        return {
          id: s.id,
          companyName: s.companyName,
          companyDomain: s.companyDomain,
          jobTitle: s.jobTitle,
          jobUrl: s.jobUrl,
          location: s.location,
          techStackTags: s.techStackTags,
          salaryRange: s.salaryRange,
          postedAt: s.postedAt.toISOString(),
          velocityScore: s.velocityScore,
          openRoles: s.openRoles,
          lead: lead
            ? {
                id: lead.id,
                name: lead.decisionMakerName,
                roleTitle: lead.roleTitle,
                email: obfuscate ? maskEmail(lead.email) : lead.email,
                emailStatus: lead.status,
                confidence: Number(lead.confidenceScore),
                linkedinUrl: lead.linkedinUrl,
                obfuscated: obfuscate,
              }
            : null,
        };
      });

    const response: SearchResponse = {
      rows,
      source: bundle.source,
      quota: { used: sessionUser.dailyQuotaUsed, limit: sessionUser.dailyQuotaLimit },
      creditsRemaining: sessionUser.creditsRemaining,
      plan: sessionUser.plan,
      tookMs: Date.now() - started,
    };
    return NextResponse.json(response);
  } catch (err) {
    console.error("search pipeline error", err);
    return NextResponse.json(
      { error: "Signal pipeline failed. Retry in a moment.", code: "pipeline_error" },
      { status: 502 },
    );
  }
}
