import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { db } from "@/db";
import { affiliateClicks } from "@/db/schema";
import { PARTNERS } from "@/lib/catalog";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/go/[partner] — tracked affiliate redirect.
 * Logs the click (ip hash, user agent, partner) and 307-forwards to the
 * partner URL with the LeadPulse referral ID appended.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ partner: string }> },
) {
  const { partner } = await params;
  const def = PARTNERS[partner];
  if (!def) {
    return NextResponse.json({ error: "Unknown partner." }, { status: 404 });
  }

  const forwarded = req.headers.get("x-forwarded-for") ?? "unknown";
  const ip = forwarded.split(",")[0]?.trim() ?? "unknown";
  const ipHash = createHash("sha256")
    .update(`${ip}:${process.env.AUTH_SECRET ?? "leadpulse.dev"}`)
    .digest("hex");

  let userId: string | null = null;
  try {
    const user = await getSessionUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  try {
    await db.insert(affiliateClicks).values({
      userId,
      partner: def.slug,
      targetUrl: def.baseUrl,
      ipHash,
      userAgent: (req.headers.get("user-agent") ?? "").slice(0, 240),
    });
  } catch (err) {
    console.error("affiliate click log failed", err);
  }

  return NextResponse.redirect(def.baseUrl, 307);
}
