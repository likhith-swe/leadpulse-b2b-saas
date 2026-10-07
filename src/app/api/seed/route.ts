import { NextRequest, NextResponse } from "next/server";
import { TECH_CATALOG, CITY_CATALOG } from "@/lib/catalog";
import { resolveSignals } from "@/lib/signals";

export const runtime = "nodejs";
export const maxDuration = 60;

const warmingKey = "__leadpulse_warming";
type GlobalWithFlag = typeof globalThis & { [warmingKey]?: boolean };

/**
 * GET /api/seed — warms hiring_signals + verified_leads across the radar
 * grid by running the real retrieval pipeline (cache → JSearch → corpus).
 * Idempotent; safe to call repeatedly. Guarded by SEED_SECRET when set.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.SEED_SECRET;
  if (secret) {
    const provided = req.nextUrl.searchParams.get("secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
  }

  const g = globalThis as GlobalWithFlag;
  if (g[warmingKey]) {
    return NextResponse.json({ ok: true, status: "already_running" });
  }
  g[warmingKey] = true;

  const cities = CITY_CATALOG.slice(0, 3);
  const combos = TECH_CATALOG.flatMap((tech) =>
    cities.map((city) => ({ tech, city })),
  );

  const summary: { combo: string; count: number; source: string }[] = [];

  try {
    for (const { tech, city } of combos) {
      const bundle = await resolveSignals(tech, city, 18);
      summary.push({
        combo: `${tech.slug}/${city.slug}`,
        count: bundle.signals.length,
        source: bundle.source,
      });
    }
  } catch (err) {
    console.error("seed error", err);
    return NextResponse.json(
      { ok: false, error: "Seeding failed partway.", warmed: summary },
      { status: 500 },
    );
  } finally {
    g[warmingKey] = false;
  }

  const total = summary.reduce((acc, s) => acc + s.count, 0);
  return NextResponse.json({
    ok: true,
    combos: summary.length,
    signals: total,
    detail: summary,
  });
}
