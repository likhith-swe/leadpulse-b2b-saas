import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DAILY_LIMITS, type PlanTier, type SessionUser } from "@/lib/types";

const COOKIE_NAME = "lp_session";
const SESSION_DAYS = 30;

/**
 * Session signing key. In production set AUTH_SECRET (32+ chars) in the
 * environment. The fallback exists so local previews boot; any deployment
 * with real users must set the variable (see BLUEPRINT.md §6.1).
 */
function signingKey(): string {
  const envSecret = process.env.AUTH_SECRET;
  if (envSecret && envSecret.length >= 16) return envSecret;
  return createHmac("sha256", "leadpulse.dev")
    .update("session-signing-key")
    .digest("hex");
}

function sign(payload: string): string {
  return createHmac("sha256", signingKey()).update(payload).digest("hex");
}

export function createSessionToken(userId: string, email: string): string {
  const exp = Date.now() + SESSION_DAYS * 86_400_000;
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, email, exp }),
    "utf8",
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string): { uid: string; email: string } | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = sign(payload);
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      uid?: string;
      email?: string;
      exp?: number;
    };
    if (!decoded.uid || !decoded.email || !decoded.exp) return null;
    if (decoded.exp < Date.now()) return null;
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = COOKIE_NAME;
export const SESSION_MAX_AGE = SESSION_DAYS * 86_400;

export async function findProfileByUserId(userId: string) {
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return rows[0] ?? null;
}

export function toSessionUser(row: typeof profiles.$inferSelect): SessionUser {
  const plan = (["free", "pro", "agency"].includes(row.plan) ? row.plan : "free") as PlanTier;
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    plan,
    isPro: row.isPro,
    creditsRemaining: row.creditsRemaining,
    dailyQuotaUsed: row.dailyQuotaUsed,
    dailyQuotaLimit: DAILY_LIMITS[plan],
    quotaResetAt: row.quotaResetAt.toISOString(),
  };
}

/** Server-side session lookup used by layouts, pages, and route handlers. */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const store = await cookies();
    const token = store.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const claims = verifySessionToken(token);
    if (!claims) return null;
    const row = await findProfileByUserId(claims.uid);
    if (!row) return null;
    return toSessionUser(row);
  } catch {
    return null;
  }
}

export async function upsertProfile(
  email: string,
  fullName: string | null,
): Promise<typeof profiles.$inferSelect> {
  const normalized = email.trim().toLowerCase();
  const inserted = await db
    .insert(profiles)
    .values({ email: normalized, fullName })
    .onConflictDoUpdate({
      target: profiles.email,
      set: fullName ? { fullName } : {},
    })
    .returning();
  return inserted[0];
}

export function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
}
