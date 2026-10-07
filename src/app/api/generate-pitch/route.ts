import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { hiringSignals, pitchDrafts, verifiedLeads } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser, findProfileByUserId } from "@/lib/auth";
import { consumeCredit, QuotaError, type ProfileRow } from "@/lib/quota";
import { generatePitch } from "@/lib/groq";
import { findTech, TECH_CATALOG } from "@/lib/catalog";

export const runtime = "nodejs";
export const maxDuration = 30;

interface PitchBody {
  signalId?: string;
}

/**
 * POST /api/generate-pitch — 1-click AI cold email.
 * Free tier: 402 upgrade_required. Paid tiers: consumes 1 verified-email
 * credit, calls Groq (Llama 3.3 70B), persists the draft, returns pitch.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to generate pitches.", code: "auth_required" },
      { status: 401 },
    );
  }

  let body: PitchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.signalId || typeof body.signalId !== "string") {
    return NextResponse.json({ error: "signalId is required." }, { status: 400 });
  }

  const signals = await db
    .select()
    .from(hiringSignals)
    .where(eq(hiringSignals.id, body.signalId))
    .limit(1);
  const signal = signals[0];
  if (!signal) {
    return NextResponse.json({ error: "Signal not found." }, { status: 404 });
  }

  const leads = await db
    .select()
    .from(verifiedLeads)
    .where(eq(verifiedLeads.signalId, signal.id))
    .limit(1);
  const lead = leads[0];

  const profile = await findProfileByUserId(user.id);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 401 });
  }

  try {
    await consumeCredit(profile as ProfileRow, 1, "AI pitch generation");
  } catch (err) {
    if (err instanceof QuotaError) {
      const status = err.code === "upgrade_required" ? 402 : 402;
      return NextResponse.json(
        { error: err.message, code: err.code, locked: true },
        { status },
      );
    }
    throw err;
  }

  const tech = findTech(signal.techStackTags[0]?.toLowerCase() ?? "") ??
    TECH_CATALOG.find((t) => signal.techStackTags.some((tag) => t.tags.includes(tag))) ??
    TECH_CATALOG[0];

  const output = await generatePitch({
    companyName: signal.companyName,
    jobTitle: signal.jobTitle,
    techStackTags: signal.techStackTags,
    decisionMakerName: lead?.decisionMakerName ?? "the hiring team",
    decisionMakerRole: lead?.roleTitle ?? "Hiring Manager",
    location: signal.location,
  });

  await db.insert(pitchDrafts).values({
    userId: user.id,
    leadId: lead?.id ?? null,
    signalId: signal.id,
    generatedPitch: output.pitch,
    subject: output.subject,
    model: output.model,
  });

  const fresh = await findProfileByUserId(user.id);
  return NextResponse.json({
    pitch: output.pitch,
    subject: output.subject,
    model: output.model,
    creditsRemaining: fresh?.creditsRemaining ?? 0,
    locked: false,
  });
}
