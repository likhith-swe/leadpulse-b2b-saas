import { fnv1a, slugify } from "@/lib/fallback-data";

/**
 * Decision-maker enrichment. Maps a hiring signal to the most relevant
 * budget owner for the open role, synthesizes a contact record, and scores it.
 * In production this stage calls a people-data provider (see BLUEPRINT.md §3);
 * here it is a deterministic synthesis so the pipeline runs end-to-end offline.
 */

const FIRST_NAMES = [
  "Priya", "Rohan", "Ananya", "Vikram", "Sneha", "Arjun", "Kavya", "Aditya",
  "Meera", "Karthik", "Divya", "Siddharth", "Elena", "Marcus", "Sofia", "James",
  "Aisha", "Daniel", "Nadia", "Tom", "Grace", "Leo", "Ingrid", "Ravi",
];

const LAST_NAMES = [
  "Nair", "Mehta", "Iyer", "Sharma", "Reddy", "Kulkarni", "Bose", "Menon",
  "Whitfield", "Okafor", "Lindqvist", "Tanaka", "Alvarez", "Kowalski", "Brennan", "Da Silva",
];

const ROLE_MAP: Record<string, string[]> = {
  engineering: ["CTO", "VP Engineering", "Head of Engineering"],
  ecommerce: ["Founder", "Head of Ecommerce", "COO"],
  growth: ["Founder", "Head of Growth", "CMO"],
  data: ["Head of Data", "CTO", "VP Engineering"],
};

const EMAIL_PATTERNS = [
  (f: string, l: string) => `${f}.${l}`,
  (f: string, l: string) => `${f[0]}${l}`,
  (f: string, l: string) => `${f}_${l}`,
  (f: string, l: string) => `${f}.${l[0]}`,
];

export interface DecisionMaker {
  name: string;
  roleTitle: string;
  email: string;
  confidence: number;
  linkedinUrl: string;
}

export function synthesizeDecisionMaker(
  companyDomain: string,
  companyName: string,
  intent: "engineering" | "ecommerce" | "growth" | "data",
): DecisionMaker {
  const seed = fnv1a(`${companyDomain}:${intent}`);
  const first = FIRST_NAMES[seed % FIRST_NAMES.length];
  const last = LAST_NAMES[(seed >>> 3) % LAST_NAMES.length];
  const rolePool = ROLE_MAP[intent] ?? ROLE_MAP.engineering;
  const role = rolePool[(seed >>> 5) % rolePool.length];
  const pattern = EMAIL_PATTERNS[(seed >>> 7) % EMAIL_PATTERNS.length];
  const localPart = pattern(first.toLowerCase(), last.toLowerCase().replace(/\s+/g, ""));
  const confidence = Math.round((0.62 + ((seed >>> 9) % 30) / 100) * 100) / 100;
  const personSlug = slugify(`${first}-${last}-${companyName}`).slice(0, 42);

  return {
    name: `${first} ${last}`,
    roleTitle: role,
    email: `${localPart}@${companyDomain}`,
    confidence,
    linkedinUrl: `https://www.linkedin.com/in/${personSlug}`,
  };
}

/**
 * Hiring Velocity Score (0–99): how fast and how hard a company is hiring.
 *  - Recency: fresher posts score higher (signal of active budget).
 *  - Breadth: more concurrent open roles at the same company.
 *  - Salary transparency: posted compensation correlates with funded roles.
 */
export function computeVelocityScore(
  postedAt: Date,
  openRoles: number,
  hasSalary: boolean,
  jobUrl: string,
): number {
  const hours = Math.max(0, (Date.now() - postedAt.getTime()) / 3_600_000);
  const recency = hours <= 24 ? 26 : hours <= 72 ? 20 : hours <= 168 ? 13 : 6;
  const breadth = Math.min(18, Math.max(0, openRoles - 1) * 5);
  const salary = hasSalary ? 8 : 0;
  const base = 44;
  const jitter = fnv1a(jobUrl) % 7;
  return Math.min(99, Math.max(40, base + recency + breadth + salary + jitter));
}

/** Counts open roles per company domain in a signal set. */
export function openRolesByDomain(signals: { companyDomain: string }[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of signals) {
    map.set(s.companyDomain, (map.get(s.companyDomain) ?? 0) + 1);
  }
  return map;
}
