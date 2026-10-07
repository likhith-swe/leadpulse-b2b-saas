import { db } from "@/db";
import { profiles, subscriptions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { MONTHLY_EMAIL_CREDITS, type PlanTier } from "@/lib/types";

/**
 * Grant logic shared by the Razorpay webhook, the Stripe webhook path, and
 * the sandbox checkout used in previews without provider keys.
 */

export async function grantPlan(opts: {
  userId: string;
  plan: Exclude<PlanTier, "free">;
  provider: "razorpay" | "stripe" | "sandbox";
  subscriptionId: string;
  amount: number;
  currency: string;
  periodEnd: Date;
}): Promise<void> {
  const credits = MONTHLY_EMAIL_CREDITS[opts.plan] ?? 500;

  await db
    .update(profiles)
    .set({
      plan: opts.plan,
      isPro: true,
      creditsRemaining: credits,
    })
    .where(eq(profiles.id, opts.userId));

  await db.insert(subscriptions).values({
    userId: opts.userId,
    provider: opts.provider,
    planTier: opts.plan,
    subscriptionId: opts.subscriptionId,
    status: "active",
    amount: opts.amount,
    currency: opts.currency,
    currentPeriodEnd: opts.periodEnd,
  });
}

export async function grantTopUp(opts: {
  userId: string;
  sku: string;
  credits: number;
  provider: "razorpay" | "stripe" | "sandbox";
  orderId: string;
  amount: number;
  currency: string;
}): Promise<number> {
  const updated = await db
    .update(profiles)
    .set({ creditsRemaining: sql`${profiles.creditsRemaining} + ${opts.credits}` })
    .where(eq(profiles.id, opts.userId))
    .returning();

  await db.insert(subscriptions).values({
    userId: opts.userId,
    provider: opts.provider,
    planTier: opts.sku,
    subscriptionId: opts.orderId,
    status: "one_time",
    amount: opts.amount,
    currency: opts.currency,
    currentPeriodEnd: null,
  });

  return updated[0]?.creditsRemaining ?? opts.credits;
}

export async function cancelPlan(userId: string): Promise<void> {
  await db
    .update(profiles)
    .set({ plan: "free", isPro: false })
    .where(eq(profiles.id, userId));
}

export function periodEndFromNow(days: number): Date {
  return new Date(Date.now() + days * 86_400_000);
}
