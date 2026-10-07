import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { hiringSignals, verifiedLeads } from "@/db/schema";
import { sql } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { LEAD_EXPORT_HEADER, toCsv } from "@/lib/csv";
import { maskEmailServer } from "@/lib/email-verifier";

export const runtime = "nodejs";

/**
 * POST /api/export — CSV/JSON lead export.
 * body: { signalIds: string[], format: "csv" | "json" }
 * Free tier: exports are blocked (402) — unmasked export is a paid feature;
 * masked previews stay in-product. Pro/Agency: full export, capped at 500 rows.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to export leads.", code: "auth_required" },
      { status: 401 },
    );
  }
  if (user.plan === "free") {
    return NextResponse.json(
      {
        error:
          "CSV/JSON export is available on Pro and Agency plans. Upgrade to export unmasked decision-maker emails.",
        code: "upgrade_required",
      },
      { status: 402 },
    );
  }

  let body: { signalIds?: string[]; format?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const ids = Array.isArray(body.signalIds)
    ? body.signalIds.filter((id) => typeof id === "string").slice(0, 500)
    : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "signalIds is required." }, { status: 400 });
  }

  const signals = await db
    .select()
    .from(hiringSignals)
    .where(
      sql`${hiringSignals.id} IN (${sql.join(
        ids.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    );

  const leads = await db
    .select()
    .from(verifiedLeads)
    .where(
      sql`${verifiedLeads.signalId} IN (${sql.join(
        ids.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    );
  const leadBySignal = new Map(leads.map((l) => [l.signalId, l]));

  const rows = signals.map((s) => {
    const lead = leadBySignal.get(s.id);
    return [
      s.companyName,
      s.companyDomain,
      s.jobTitle,
      s.location,
      s.techStackTags.join("; "),
      s.salaryRange,
      String(s.velocityScore),
      lead?.decisionMakerName ?? "",
      lead?.roleTitle ?? "",
      lead?.email ?? "",
      lead?.status ?? "",
      lead?.confidenceScore ?? "",
      lead?.linkedinUrl ?? "",
      s.jobUrl,
      s.postedAt.toISOString(),
    ];
  });

  const stamp = new Date().toISOString().slice(0, 10);
  if (body.format === "json") {
    const payload = signals.map((s) => {
      const lead = leadBySignal.get(s.id);
      return {
        company: s.companyName,
        domain: s.companyDomain,
        role: s.jobTitle,
        location: s.location,
        stack: s.techStackTags,
        salary: s.salaryRange,
        velocityScore: s.velocityScore,
        decisionMaker: lead
          ? {
              name: lead.decisionMakerName,
              role: lead.roleTitle,
              email: lead.email,
              status: lead.status,
              confidence: Number(lead.confidenceScore),
              linkedin: lead.linkedinUrl,
            }
          : null,
        jobUrl: s.jobUrl,
        postedAt: s.postedAt.toISOString(),
      };
    });
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="leadpulse-leads-${stamp}.json"`,
      },
    });
  }

  const csv = toCsv(LEAD_EXPORT_HEADER, rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leadpulse-leads-${stamp}.csv"`,
    },
  });
}
