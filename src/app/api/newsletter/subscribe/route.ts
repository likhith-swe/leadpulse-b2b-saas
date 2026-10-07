import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { newsletterSubscribers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isValidEmail } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * POST /api/newsletter/subscribe — "Weekly Hiring Radar" lead capture.
 * Upserts the subscriber, then syncs to Resend/Loops when keys exist.
 */
export async function POST(req: NextRequest) {
  let body: { email?: string; sourcePage?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  const disposable = ["mailinator.com", "yopmail.com", "tempmail.com", "getnada.com", "10minutemail.com"];
  const domain = email.split("@")[1] ?? "";
  if (disposable.includes(domain)) {
    return NextResponse.json(
      { error: "Disposable addresses are not accepted." },
      { status: 400 },
    );
  }

  const sourcePage =
    typeof body.sourcePage === "string" ? body.sourcePage.slice(0, 300) : "/";

  const inserted = await db
    .insert(newsletterSubscribers)
    .values({ email, sourcePage })
    .onConflictDoUpdate({
      target: newsletterSubscribers.email,
      set: { status: "active", sourcePage },
    })
    .returning();

  let providerSynced = false;
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM ?? "Hiring Radar <radar@leadpulse.ai>",
          to: [email],
          subject: "You are on the Weekly Hiring Radar",
          text: `Confirmed. Every Monday at 8:00 AM IST you will receive the 50 fastest-growing funded startups hiring in tech this week, with the exact roles and stacks they are hiring for.\n\n— The LeadPulse team`,
        }),
        signal: AbortSignal.timeout(8000),
      });
      providerSynced = res.ok;
    } catch {
      providerSynced = false;
    }
  }

  const loopsKey = process.env.LOOPS_API_KEY;
  if (loopsKey) {
    try {
      await fetch("https://app.loops.so/api/v1/contacts/create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${loopsKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, source: "hiring-radar", subscribed: true }),
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      // Non-fatal: the local record is the source of truth.
    }
  }

  if (providerSynced && !inserted[0].providerSynced) {
    await db
      .update(newsletterSubscribers)
      .set({ providerSynced: true })
      .where(eq(newsletterSubscribers.email, email))
      .catch(() => undefined);
  }

  return NextResponse.json({
    ok: true,
    email,
    providerSynced,
    message:
      "Subscribed. The first Hiring Radar lands Monday at 8:00 AM IST.",
  });
}
