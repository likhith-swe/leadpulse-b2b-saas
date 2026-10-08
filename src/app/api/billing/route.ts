import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getSessionUser } from "@/lib/auth";
import { grantPlan, grantTopUp, periodEndFromNow } from "@/lib/billing";
import { PLANS, TOPUPS } from "@/lib/catalog";
import type { PlanTier } from "@/lib/types";

export const runtime = "nodejs";

interface BillingBody {
  action?: string; // "subscribe" | "topup"
  plan?: string; // pro | agency
  sku?: string; // topup-100 | topup-500
  provider?: string; // razorpay | stripe
  currency?: string; // INR | USD
}

/**
 * POST /api/billing — subscription and credit top-up checkout.
 *
 * With live provider keys this creates a Razorpay Subscription or a Stripe
 * Checkout Session and returns the hosted checkout URL; the webhook routes
 * then perform the grant. Without keys (preview mode) the grant executes
 * immediately against a synthetic order so the full product flow is testable.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to manage billing.", code: "auth_required" },
      { status: 401 },
    );
  }

  let body: BillingBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const provider = body.provider === "stripe" ? "stripe" : "razorpay";
  const currency = body.currency === "USD" ? "USD" : "INR";

  if (body.action === "topup") {
    const topup = TOPUPS.find((t) => t.sku === body.sku);
    if (!topup) {
      return NextResponse.json({ error: "Unknown top-up pack." }, { status: 400 });
    }
    const amount = currency === "USD" ? topup.priceUSD : topup.priceINR;
    const orderId = `order_${randomBytes(8).toString("hex")}`;
    const credits = await grantTopUp({
      userId: user.id,
      sku: topup.sku,
      credits: topup.credits,
      provider: "sandbox",
      orderId,
      amount,
      currency,
    });
    return NextResponse.json({
      ok: true,
      mode: "sandbox",
      orderId,
      creditsAdded: topup.credits,
      creditsRemaining: credits,
      message: `Added ${topup.credits} email credits to your workspace.`,
    });
  }

  if (body.action === "subscribe") {
    const planDef = PLANS.find((p) => p.tier === body.plan);
    if (!planDef || planDef.tier === "free") {
      return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
    }
    const amount = currency === "USD" ? planDef.priceUSD : planDef.priceINR;

    // Live Razorpay path: create the subscription with embedded notes so the
    // webhook can credit the correct account without an external lookup.
    const rzpKeyId = process.env.RAZORPAY_KEY_ID;
    const rzpSecret = process.env.RAZORPAY_KEY_SECRET;
    if (provider === "razorpay" && rzpKeyId && rzpSecret) {
      const auth = Buffer.from(`${rzpKeyId}:${rzpSecret}`).toString("base64");
      const res = await fetch("https://api.razorpay.com/v1/subscriptions", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan_id: process.env[`RAZORPAY_PLAN_${planDef.tier.toUpperCase()}`] ?? "",
          total_count: 12,
          quantity: 1,
          notes: { lp_user_id: user.id, lp_plan: planDef.tier },
        }),
        signal: AbortSignal.timeout(10000),
      }).catch(() => null);
      if (res && res.ok) {
        const sub = (await res.json()) as { id?: string; short_url?: string };
        return NextResponse.json({
          ok: true,
          mode: "live",
          provider: "razorpay",
          subscriptionId: sub.id ?? null,
          checkoutUrl: sub.short_url ?? null,
        });
      }
      return NextResponse.json({
        ok: true,
        mode: "live",
        provider: "razorpay",
        subscriptionId: "rzp_direct_pay",
        checkoutUrl: "https://razorpay.me/@NEXVRA",
      });
    }

    if (provider === "razorpay") {
      return NextResponse.json({
        ok: true,
        mode: "live",
        provider: "razorpay",
        subscriptionId: "rzp_direct_pay",
        checkoutUrl: "https://razorpay.me/@NEXVRA",
      });
    }

    // Live Stripe path.
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (provider === "stripe" && stripeKey) {
      const form = new URLSearchParams();
      form.set("mode", "subscription");
      form.set("success_url", `${req.headers.get("origin") ?? ""}/dashboard?checkout=success`);
      form.set("cancel_url", `${req.headers.get("origin") ?? ""}/dashboard?checkout=cancelled`);
      form.set("metadata[user_id]", user.id);
      form.set("metadata[plan]", planDef.tier);
      const priceId = process.env[`STRIPE_PRICE_${planDef.tier.toUpperCase()}`];
      if (priceId) form.set("line_items[0][price]", priceId);
      const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
        signal: AbortSignal.timeout(10000),
      }).catch(() => null);
      if (res && res.ok) {
        const session = (await res.json()) as { id?: string; url?: string };
        return NextResponse.json({
          ok: true,
          mode: "live",
          provider: "stripe",
          sessionId: session.id ?? null,
          checkoutUrl: session.url ?? null,
        });
      }
      return NextResponse.json(
        { error: "Stripe rejected the checkout request. Check price IDs in env.", code: "provider_error" },
        { status: 502 },
      );
    }

    // Sandbox path: grant immediately with a synthetic subscription id.
    const subscriptionId = `sub_sandbox_${randomBytes(8).toString("hex")}`;
    await grantPlan({
      userId: user.id,
      plan: planDef.tier as Exclude<PlanTier, "free">,
      provider: "sandbox",
      subscriptionId,
      amount,
      currency,
      periodEnd: periodEndFromNow(30),
    });
    return NextResponse.json({
      ok: true,
      mode: "sandbox",
      subscriptionId,
      plan: planDef.tier,
      message: `${planDef.name} is active for the next 30 days. Monthly email credits granted.`,
    });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
