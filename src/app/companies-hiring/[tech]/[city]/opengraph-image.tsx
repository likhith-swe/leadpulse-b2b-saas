import { ImageResponse } from "next/og";
import { findTech, findCity } from "@/lib/catalog";

export const alt = "LeadPulse AI hiring radar";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ tech: string; city: string }>;
}) {
  const { tech: techSlug, city: citySlug } = await params;
  const tech = findTech(techSlug);
  const city = findCity(citySlug);
  const techLabel = tech?.label ?? techSlug;
  const cityLabel = city?.label ?? citySlug;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background: "#08090E",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "rgba(61,220,151,0.15)",
              border: "1px solid rgba(61,220,151,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#3ddc97",
              fontSize: "24px",
              fontWeight: 700,
            }}
          >
            ⌁
          </div>
          <span style={{ color: "#e7e9ef", fontSize: "28px", fontWeight: 600 }}>
            LeadPulse AI
          </span>
          <span
            style={{
              marginLeft: "8px",
              color: "#8b91a3",
              fontSize: "18px",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: "999px",
              padding: "4px 14px",
            }}
          >
            Hiring Radar
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              color: "#3ddc97",
              fontSize: "22px",
              fontWeight: 600,
              letterSpacing: "0.08em",
            }}
          >
            ● LIVE HIRING SIGNALS
          </div>
          <div
            style={{
              color: "#f4f5f7",
              fontSize: "64px",
              fontWeight: 700,
              lineHeight: 1.1,
              maxWidth: "1000px",
            }}
          >
            Companies hiring {techLabel} talent in {cityLabel}
          </div>
          <div style={{ color: "#8b91a3", fontSize: "24px" }}>
            Velocity-scored openings · decision-maker contacts · AI-drafted first touch
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#8b91a3", fontSize: "20px" }}>
            leadpulse.ai/companies-hiring/{techSlug}/{citySlug}
          </span>
          <span
            style={{
              color: "#08090E",
              background: "#3ddc97",
              fontSize: "22px",
              fontWeight: 700,
              borderRadius: "10px",
              padding: "12px 28px",
            }}
          >
            Scan the feed
          </span>
        </div>
      </div>
    ),
    size,
  );
}
