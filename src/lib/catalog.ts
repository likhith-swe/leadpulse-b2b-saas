/** Canonical tech-stack and city catalogs that drive search, pSEO pages, and the sitemap. */

export interface TechEntry {
  slug: string;
  label: string;
  query: string;
  tags: string[];
  intent: "engineering" | "ecommerce" | "growth" | "data";
}

export interface CityEntry {
  slug: string;
  label: string;
  country: string;
  currency: "INR" | "USD" | "GBP" | "SGD";
}

export const TECH_CATALOG: TechEntry[] = [
  {
    slug: "react",
    label: "React",
    query: "React developer",
    tags: ["React", "Next.js", "TypeScript", "Redux"],
    intent: "engineering",
  },
  {
    slug: "node",
    label: "Node.js",
    query: "Node.js backend engineer",
    tags: ["Node.js", "NestJS", "PostgreSQL", "Redis"],
    intent: "engineering",
  },
  {
    slug: "python",
    label: "Python",
    query: "Python engineer",
    tags: ["Python", "FastAPI", "Airflow", "Django"],
    intent: "engineering",
  },
  {
    slug: "aws",
    label: "AWS / DevOps",
    query: "AWS DevOps engineer",
    tags: ["AWS", "Terraform", "Kubernetes", "EKS"],
    intent: "engineering",
  },
  {
    slug: "shopify",
    label: "Shopify",
    query: "Shopify developer",
    tags: ["Shopify", "Liquid", "Hydrogen", "Shopify Plus"],
    intent: "ecommerce",
  },
  {
    slug: "flutter",
    label: "Flutter",
    query: "Flutter developer",
    tags: ["Flutter", "Dart", "Bloc", "Firebase"],
    intent: "engineering",
  },
  {
    slug: "golang",
    label: "Go",
    query: "Golang backend engineer",
    tags: ["Go", "gRPC", "Kubernetes", "Kafka"],
    intent: "engineering",
  },
  {
    slug: "data",
    label: "Data / Analytics",
    query: "Analytics engineer",
    tags: ["dbt", "Snowflake", "Looker", "SQL"],
    intent: "data",
  },
];

export const CITY_CATALOG: CityEntry[] = [
  { slug: "bangalore", label: "Bengaluru", country: "India", currency: "INR" },
  { slug: "pune", label: "Pune", country: "India", currency: "INR" },
  { slug: "hyderabad", label: "Hyderabad", country: "India", currency: "INR" },
  { slug: "mumbai", label: "Mumbai", country: "India", currency: "INR" },
  { slug: "delhi-ncr", label: "Delhi NCR", country: "India", currency: "INR" },
  { slug: "new-york", label: "New York", country: "United States", currency: "USD" },
  { slug: "san-francisco", label: "San Francisco", country: "United States", currency: "USD" },
  { slug: "london", label: "London", country: "United Kingdom", currency: "GBP" },
  { slug: "singapore", label: "Singapore", country: "Singapore", currency: "SGD" },
  { slug: "remote", label: "Remote", country: "Global", currency: "USD" },
];

export function findTech(slug: string): TechEntry | undefined {
  return TECH_CATALOG.find(
    (t) => t.slug === slug || t.label.toLowerCase() === slug.toLowerCase(),
  );
}

export function findCity(slug: string): CityEntry | undefined {
  return CITY_CATALOG.find(
    (c) => c.slug === slug || c.label.toLowerCase().replace(/\s+/g, "-") === slug.toLowerCase(),
  );
}

export interface PlanDef {
  tier: "free" | "pro" | "agency";
  name: string;
  priceINR: number;
  priceUSD: number;
  cadence: string;
  verifiedEmails: string;
  features: string[];
  cta: string;
}

export const PLANS: PlanDef[] = [
  {
    tier: "free",
    name: "Free",
    priceINR: 0,
    priceUSD: 0,
    cadence: "no card required",
    verifiedEmails: "5 signal lookups / day",
    features: [
      "5 hiring-signal lookups per day",
      "Decision-maker names and roles",
      "Partially masked emails",
      "Hiring Velocity Score on every row",
    ],
    cta: "Start free",
  },
  {
    tier: "pro",
    name: "Pro",
    priceINR: 1999,
    priceUSD: 29,
    cadence: "per user / month",
    verifiedEmails: "500 verified emails / month",
    features: [
      "500 verified decision-maker emails / month",
      "Unmasked emails with syntax + MX validation",
      "1-click AI pitch drafts (Llama 3.3 70B via Groq)",
      "CSV and JSON export",
      "120 signal lookups per day",
    ],
    cta: "Upgrade to Pro",
  },
  {
    tier: "agency",
    name: "Agency",
    priceINR: 4999,
    priceUSD: 79,
    cadence: "per workspace / month",
    verifiedEmails: "2,500 verified emails / month",
    features: [
      "2,500 verified decision-maker emails / month",
      "Daily automated lead digest by email",
      "Webhook export to your CRM or sheets",
      "400 signal lookups per day",
      "Priority queue for pitch generation",
    ],
    cta: "Upgrade to Agency",
  },
];

export interface TopUpDef {
  sku: string;
  credits: number;
  priceINR: number;
  priceUSD: number;
}

export const TOPUPS: TopUpDef[] = [
  { sku: "topup-100", credits: 100, priceINR: 499, priceUSD: 6 },
  { sku: "topup-500", credits: 500, priceINR: 1999, priceUSD: 24 },
];

export interface PartnerDef {
  slug: string;
  label: string;
  baseUrl: string;
  commission: string;
}

export const PARTNERS: Record<string, PartnerDef> = {
  instantly: {
    slug: "instantly",
    label: "Instantly.ai",
    baseUrl: "https://instantly.ai/?via=leadpulse",
    commission: "30% lifetime recurring",
  },
  smartlead: {
    slug: "smartlead",
    label: "Smartlead.ai",
    baseUrl: "https://www.smartlead.ai/?ref=leadpulse",
    commission: "30% lifetime recurring",
  },
  clay: {
    slug: "clay",
    label: "Clay.com",
    baseUrl: "https://www.clay.com/?ref=leadpulse",
    commission: "20% first year",
  },
};
