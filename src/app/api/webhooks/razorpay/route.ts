import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { grantPlan, periodEndFromNow } from "@/lib/billing";
import type { PlanTier } from "@/lib/types";

export const runtime = "nodejs";

/**
 * POST /api/webhooks/razorpay — Razorpay webhook receiver.
 * Verifies the X-Razorpay-Signature HMAC-SHA256 over the raw body, then
 * credits the user on subscription events. Notes carry lp_user_id and
 * lp_plan, set when the subscription is created in /api/billing.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "RAZORPAY_WEBHOOK_SECRET not configured.", configured: false },
      { status: 503 },
    );
  }

  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const expected = createHmac("sha256", secret).update(raw).digest("hex");

  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: {
      payment?: { entity?: RazorpayEntity };
      subscription?: { entity?: RazorpayEntity };
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const entity =
    event.payload?.subscription?.entity ?? event.payload?.payment?.entity;
  if (!entity) {
    return NextResponse.json({ ok: true, handled: false });
  }

  const userId = entity.notes?.lp_user_id;
  const plan = entity.notes?.lp_plan;

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ ok: true, handled: false });
  }

  const rows = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, handled: false });
  }

  switch (event.event) {
    case "subscription.charged":
    case "subscription.created":
    case "subscription.updated":
    case "payment.captured": {
      if (plan !== "pro" && plan !== "agency") {
        return NextResponse.json({ ok: true, handled: false });
      }
      await grantPlan({
        userId,
        plan: plan as Exclude<PlanTier, "free">,
        provider: "razorpay",
        subscriptionId: String(entity.id ?? `sub_${Date.now()}`),
        amount: Math.round((entity.amount ?? 0) / 100),
        currency: "INR",
        periodEnd: periodEndFromNow(30),
      });
      return NextResponse.json({ ok: true, handled: true });
    }
    case "subscription.halted":
    case "subscription.cancelled":
    case "subscription.completed": {
      await db
        .update(profiles)
        .set({ plan: "free", isPro: false })
        .where(eq(profiles.id, userId));
      return NextResponse.json({ ok: true, handled: true });
    }
    default:
      return NextResponse.json({ ok: true, handled: false });
  }
}

interface RazorpayEntity {
  id?: string;
  amount?: number;
  notes?: Record<string, string>;
}
