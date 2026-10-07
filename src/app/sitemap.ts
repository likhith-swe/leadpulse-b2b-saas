import type { MetadataRoute } from "next";
import { TECH_CATALOG, CITY_CATALOG } from "@/lib/catalog";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://leadpulse.ai";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/dashboard`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  const radarRoutes: MetadataRoute.Sitemap = TECH_CATALOG.flatMap((tech) =>
    CITY_CATALOG.map((city) => ({
      url: `${SITE_URL}/companies-hiring/${tech.slug}/${city.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  );

  return [...staticRoutes, ...radarRoutes];
}
