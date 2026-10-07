import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DAILY_LIMITS, type PlanTier } from "@/lib/types";

export type QuotaErrorCode =
  | "auth_required"
  | "quota_exhausted"
  | "credits_exhausted"
  | "upgrade_required";

export class QuotaError extends Error {
  code: QuotaErrorCode;
  upgradeUrl: string;
  constructor(code: QuotaErrorCode, message: string) {
    super(message);
    this.code = code;
    this.upgradeUrl = "#pricing";
  }
}

function nextUtcMidnight(): Date {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d;
}

export interface ProfileRow {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  plan: string;
  isPro: boolean;
  creditsRemaining: number;
  dailyQuotaUsed: number;
  quotaResetAt: Date;
  createdAt: Date;
}

/** Resets the daily search counter when the UTC window has rolled over. */
export async function ensureQuotaWindow(row: ProfileRow): Promise<ProfileRow> {
  if (row.quotaResetAt.getTime() > Date.now()) return row;
  const updated = await db
    .update(profiles)
    .set({ dailyQuotaUsed: 0, quotaResetAt: nextUtcMidnight() })
    .where(eq(profiles.id, row.id))
    .returning();
  return updated[0] ?? row;
}

export function planOf(row: ProfileRow): PlanTier {
  return (["free", "pro", "agency"].includes(row.plan) ? row.plan : "free") as PlanTier;
}

/**
 * Consumes one signal lookup. Free: hard cap of 5/day. Pro/Agency: soft daily
 * ceilings so a runaway script cannot drain a workspace.
 */
export async function consumeSearchQuota(row: ProfileRow): Promise<{ used: number; limit: number }> {
  const fresh = await ensureQuotaWindow(row);
  const plan = planOf(fresh);
  const limit = DAILY_LIMITS[plan];
  if (fresh.dailyQuotaUsed >= limit) {
    throw new QuotaError(
      "quota_exhausted",
      plan === "free"
        ? "Daily limit reached: the free tier includes 5 signal lookups per day. Upgrade to Pro for 120/day."
        : "Daily lookup ceiling reached for your plan. It resets at 00:00 UTC.",
    );
  }
  await db
    .update(profiles)
    .set({ dailyQuotaUsed: fresh.dailyQuotaUsed + 1 })
    .where(eq(profiles.id, fresh.id));
  return { used: fresh.dailyQuotaUsed + 1, limit };
}

/**
 * Consumes a verified-email credit (pitch generation, unmasking, export).
 * Free accounts have no credits and must upgrade.
 */
export async function consumeCredit(
  row: ProfileRow,
  cost: number,
  purpose: string,
): Promise<number> {
  const plan = planOf(row);
  if (plan === "free") {
    throw new QuotaError(
      "upgrade_required",
      `${purpose} is a paid feature. Upgrade to Pro for 500 verified emails per month.`,
    );
  }
  if (row.creditsRemaining < cost) {
    throw new QuotaError(
      "credits_exhausted",
      "Monthly email credits exhausted. Add a top-up pack (₹499 for 100 credits) or wait for the next billing cycle.",
    );
  }
  const updated = await db
    .update(profiles)
    .set({ creditsRemaining: row.creditsRemaining - cost })
    .where(eq(profiles.id, row.id))
    .returning();
  return updated[0]?.creditsRemaining ?? row.creditsRemaining - cost;
}
