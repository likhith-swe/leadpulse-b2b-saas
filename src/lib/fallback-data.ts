/**
 * Deterministic hiring-signal corpus.
 * Used when RAPIDAPI_KEY is not configured and as the guaranteed baseline
 * for pSEO pages, so every route renders real-shaped data in preview.
 * Companies are fictional; roles, stacks, and salary bands are market-realistic.
 */

export interface CorpusCompany {
  name: string;
  domain: string;
  hq: string; // city slug
  stage: string;
  size: string;
  vertical: string;
}

export interface CorpusRole {
  tech: string; // tech slug
  title: string;
  tags: string[];
  salaryINR?: [number, number]; // LPA
  salaryUSD?: [number, number]; // k
}

export const CORPUS_COMPANIES: CorpusCompany[] = [
  { name: "KiranaKart", domain: "kiranakart.in", hq: "bangalore", stage: "Series B", size: "201-500", vertical: "quick commerce" },
  { name: "NudgeIQ", domain: "nudgeiq.ai", hq: "bangalore", stage: "Series A", size: "51-200", vertical: "AI CRM" },
  { name: "Credmint", domain: "credmint.in", hq: "bangalore", stage: "Series A", size: "51-200", vertical: "lending infrastructure" },
  { name: "Loopwell", domain: "loopwell.app", hq: "bangalore", stage: "Seed", size: "11-50", vertical: "consumer fintech" },
  { name: "StackRoute Labs", domain: "stackroutelabs.com", hq: "bangalore", stage: "Bootstrapped", size: "11-50", vertical: "devtooling" },
  { name: "Payload Systems", domain: "payloadsystems.io", hq: "pune", stage: "Series A", size: "51-200", vertical: "logistics APIs" },
  { name: "Shoplyft", domain: "shoplyft.com", hq: "pune", stage: "Seed", size: "11-50", vertical: "Shopify apps" },
  { name: "Terraquote", domain: "terraquote.io", hq: "pune", stage: "Seed", size: "2-10", vertical: "insurance tech" },
  { name: "Medlark Health", domain: "medlark.health", hq: "hyderabad", stage: "Series A", size: "51-200", vertical: "healthtech" },
  { name: "GenomeGrid", domain: "genomegrid.io", hq: "hyderabad", stage: "Series B", size: "201-500", vertical: "biotech data" },
  { name: "Saffron Ledger", domain: "saffronledger.com", hq: "mumbai", stage: "Series B", size: "201-500", vertical: "fintech" },
  { name: "Adstacks Media", domain: "adstacksmedia.co", hq: "mumbai", stage: "Bootstrapped", size: "51-200", vertical: "performance agency" },
  { name: "Reelkart", domain: "reelkart.in", hq: "mumbai", stage: "Seed", size: "11-50", vertical: "video commerce" },
  { name: "PaperTrail Edu", domain: "papertrailedu.com", hq: "delhi-ncr", stage: "Series A", size: "51-200", vertical: "edtech" },
  { name: "Fleetline", domain: "fleetline.io", hq: "delhi-ncr", stage: "Series A", size: "51-200", vertical: "fleet SaaS" },
  { name: "UrbanNest", domain: "urbannest.in", hq: "delhi-ncr", stage: "Series B", size: "201-500", vertical: "proptech" },
  { name: "DataMint Analytics", domain: "datamint.ai", hq: "new-york", stage: "Series A", size: "51-200", vertical: "product analytics" },
  { name: "Quantabird", domain: "quantabird.io", hq: "new-york", stage: "Seed", size: "11-50", vertical: "quant research tools" },
  { name: "Halcyon Robotics", domain: "halcyonrobotics.com", hq: "san-francisco", stage: "Series B", size: "201-500", vertical: "warehouse robotics" },
  { name: "Beacon Pay", domain: "beaconpay.com", hq: "san-francisco", stage: "Series A", size: "51-200", vertical: "payments" },
  { name: "Ferrous Labs", domain: "ferrouslabs.dev", hq: "san-francisco", stage: "Seed", size: "2-10", vertical: "infra tooling" },
  { name: "Lombard Analytics", domain: "lombardanalytics.com", hq: "london", stage: "Series A", size: "51-200", vertical: "financial data" },
  { name: "Thamesbridge AI", domain: "thamesbridge.ai", hq: "london", stage: "Seed", size: "11-50", vertical: "compliance AI" },
  { name: "Nimbus Cloudworks", domain: "nimbuscloudworks.cloud", hq: "singapore", stage: "Series A", size: "51-200", vertical: "cloud MSP" },
  { name: "Merlion Mart", domain: "merlionmart.sg", hq: "singapore", stage: "Series B", size: "201-500", vertical: "ecommerce" },
  { name: "Orbitful", domain: "orbitful.com", hq: "remote", stage: "Bootstrapped", size: "11-50", vertical: "D2C studio" },
  { name: "GrowthGrid", domain: "growthgrid.io", hq: "remote", stage: "Bootstrapped", size: "11-50", vertical: "growth agency" },
  { name: "Zenstack", domain: "zenstack.dev", hq: "remote", stage: "Seed", size: "2-10", vertical: "devtools" },
  { name: "Northbeam Health", domain: "northbeam.health", hq: "remote", stage: "Series A", size: "51-200", vertical: "telehealth" },
  { name: "Copperfield", domain: "copperfield.io", hq: "remote", stage: "Seed", size: "11-50", vertical: "sales automation" },
];

export const CORPUS_ROLES: CorpusRole[] = [
  { tech: "react", title: "Senior React Developer", tags: ["React", "TypeScript", "Redux Toolkit"], salaryINR: [28, 45], salaryUSD: [130, 165] },
  { tech: "react", title: "Founding Frontend Engineer (Next.js)", tags: ["Next.js", "React", "Tailwind CSS"], salaryINR: [35, 60], salaryUSD: [150, 190] },
  { tech: "react", title: "UI Engineer — Design Systems", tags: ["React", "Storybook", "TypeScript"], salaryINR: [24, 38], salaryUSD: [120, 150] },
  { tech: "node", title: "Senior Node.js Engineer", tags: ["Node.js", "NestJS", "PostgreSQL"], salaryINR: [30, 48], salaryUSD: [135, 170] },
  { tech: "node", title: "Backend Engineer — Payments", tags: ["Node.js", "Redis", "Razorpay APIs"], salaryINR: [32, 52], salaryUSD: [140, 175] },
  { tech: "python", title: "Python Engineer — Platform", tags: ["Python", "FastAPI", "Airflow"], salaryINR: [26, 44], salaryUSD: [130, 160] },
  { tech: "python", title: "Data Engineer (Python, dbt)", tags: ["Python", "dbt", "Snowflake"], salaryINR: [28, 46], salaryUSD: [135, 168] },
  { tech: "aws", title: "DevOps Engineer (AWS, EKS)", tags: ["AWS", "EKS", "Terraform"], salaryINR: [26, 42], salaryUSD: [140, 175] },
  { tech: "aws", title: "Cloud Infrastructure Engineer", tags: ["AWS", "CloudFormation", "Python"], salaryINR: [24, 40], salaryUSD: [130, 160] },
  { tech: "shopify", title: "Shopify Theme Developer", tags: ["Shopify", "Liquid", "Hydrogen"], salaryINR: [14, 26], salaryUSD: [95, 125] },
  { tech: "shopify", title: "Ecommerce Manager (Shopify Plus)", tags: ["Shopify Plus", "Klaviyo", "GA4"], salaryINR: [16, 28], salaryUSD: [100, 130] },
  { tech: "flutter", title: "Flutter Engineer — Payments SDK", tags: ["Flutter", "Dart", "UPI SDKs"], salaryINR: [22, 38], salaryUSD: [120, 150] },
  { tech: "flutter", title: "Senior Flutter Developer", tags: ["Flutter", "Bloc", "Firebase"], salaryINR: [20, 34], salaryUSD: [110, 140] },
  { tech: "golang", title: "Go Backend Engineer", tags: ["Go", "gRPC", "Kubernetes"], salaryINR: [30, 50], salaryUSD: [145, 180] },
  { tech: "golang", title: "Staff Engineer — Distributed Systems", tags: ["Go", "Kafka", "PostgreSQL"], salaryINR: [48, 75], salaryUSD: [185, 230] },
  { tech: "data", title: "Analytics Engineer (dbt + Looker)", tags: ["dbt", "Looker", "SQL"], salaryINR: [18, 32], salaryUSD: [110, 140] },
  { tech: "data", title: "Data Analyst — Growth", tags: ["SQL", "Python", "Amplitude"], salaryINR: [12, 22], salaryUSD: [90, 120] },
];

const INR_CITIES = new Set(["bangalore", "pune", "hyderabad", "mumbai", "delhi-ncr"]);

/** Stable 32-bit FNV-1a hash, used for deterministic pseudo-random selection. */
export function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export interface CorpusSignal {
  companyName: string;
  companyDomain: string;
  jobTitle: string;
  jobUrl: string;
  location: string;
  techStackTags: string[];
  salaryRange: string | null;
  postedHoursAgo: number;
  techSlug: string;
}

/**
 * Builds a deterministic list of hiring signals for a tech/city pair.
 * The same inputs always produce the same job URLs so upserts stay idempotent.
 */
export function buildCorpusSignals(
  techSlug: string,
  citySlug: string,
  limit: number,
): CorpusSignal[] {
  const roles = CORPUS_ROLES.filter((r) => r.tech === techSlug);
  const localCompanies = CORPUS_COMPANIES.filter((c) =>
    citySlug === "remote" ? c.hq === "remote" : c.hq === citySlug,
  );
  const remotePool = CORPUS_COMPANIES.filter((c) => c.hq === "remote");
  const nationalPool = CORPUS_COMPANIES.filter((c) => c.hq !== "remote");

  const pool: CorpusCompany[] = [];
  if (citySlug === "remote") {
    pool.push(...remotePool, ...nationalPool.slice(0, 8));
  } else if (localCompanies.length > 0) {
    pool.push(...localCompanies);
    const seedBase = fnv1a(`${techSlug}:${citySlug}`);
    for (let i = 0; i < 3 && i < nationalPool.length; i++) {
      pool.push(nationalPool[(seedBase + i * 7) % nationalPool.length]);
    }
    pool.push(...remotePool.slice(0, 2));
  } else {
    const seedBase = fnv1a(`${techSlug}:${citySlug}`);
    for (let i = 0; i < 6; i++) {
      pool.push(nationalPool[(seedBase + i * 5) % nationalPool.length]);
    }
    pool.push(...remotePool.slice(0, 2));
  }

  const deduped = Array.from(new Map(pool.map((c) => [c.domain, c])).values());

  const signals: CorpusSignal[] = [];
  deduped.forEach((company, idx) => {
    if (signals.length >= limit) return;
    const roleCount = fnv1a(`${company.domain}:${techSlug}`) % 3 === 0 ? 2 : 1;
    for (let k = 0; k < roleCount && signals.length < limit; k++) {
      const role = roles[(fnv1a(`${company.domain}:${techSlug}:${k}`)) % roles.length];
      const hoursAgo = 2 + (fnv1a(`${company.domain}:${role.title}`) % 160);
      const inrCity = INR_CITIES.has(citySlug) || (citySlug === "remote" && fnv1a(company.domain) % 2 === 0);
      let salaryRange: string | null = null;
      if (role.salaryINR && inrCity) {
        salaryRange = `₹${role.salaryINR[0]}–${role.salaryINR[1]} LPA`;
      } else if (role.salaryUSD) {
        salaryRange = `$${role.salaryUSD[0]}k–$${role.salaryUSD[1]}k`;
      }
      const urlKey = slugify(`${company.domain}-${role.title}-${citySlug}`);
      signals.push({
        companyName: company.name,
        companyDomain: company.domain,
        jobTitle: role.title,
        jobUrl: `https://${company.domain}/careers/${urlKey}`,
        location: citySlug === "remote" ? "Remote" : citySlug.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
        techStackTags: role.tags,
        salaryRange,
        postedHoursAgo: hoursAgo,
        techSlug,
      });
    }
    void idx;
  });

  return signals.slice(0, limit);
}
