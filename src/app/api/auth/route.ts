import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  isValidEmail,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  getSessionUser,
  upsertProfile,
  toSessionUser,
} from "@/lib/auth";

export const runtime = "nodejs";

/**
 * POST /api/auth — session issuance.
 * body: { action: "signin", email, fullName?, method: "google" | "magic" }
 *     | { action: "signout" }
 * In production this is replaced by Supabase OAuth / magic-link flows
 * (BLUEPRINT.md §2); the session contract is identical.
 */
export async function POST(req: NextRequest) {
  let body: { action?: string; email?: string; fullName?: string; method?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.action === "signout") {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
      path: "/",
    });
    return res;
  }

  if (body.action !== "signin") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "Enter a valid work email address." },
      { status: 400 },
    );
  }

  const method = body.method === "google" ? "google" : "magic";
  const fullName =
    typeof body.fullName === "string" && body.fullName.trim().length > 0
      ? body.fullName.trim().slice(0, 120)
      : email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

  const profile = await upsertProfile(email, fullName);
  const token = createSessionToken(profile.id, profile.email);

  const res = NextResponse.json({
    ok: true,
    method,
    user: toSessionUser(profile),
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
  return res;
}

/** GET /api/auth — current session (used by client components after refresh). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  return NextResponse.json({ user });
}
