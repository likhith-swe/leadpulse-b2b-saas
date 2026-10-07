export type PlanTier = "free" | "pro" | "agency";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string | null;
  plan: PlanTier;
  isPro: boolean;
  creditsRemaining: number;
  dailyQuotaUsed: number;
  dailyQuotaLimit: number;
  quotaResetAt: string;
}

export interface LeadInfo {
  id: string;
  name: string;
  roleTitle: string;
  email: string;
  emailStatus: string;
  confidence: number;
  linkedinUrl: string | null;
  obfuscated: boolean;
}

export interface SignalRow {
  id: string;
  companyName: string;
  companyDomain: string;
  jobTitle: string;
  jobUrl: string;
  location: string;
  techStackTags: string[];
  salaryRange: string | null;
  postedAt: string;
  velocityScore: number;
  openRoles: number;
  lead: LeadInfo | null;
}

export interface SearchResponse {
  rows: SignalRow[];
  source: "cache" | "jsearch" | "corpus";
  quota: { used: number; limit: number };
  creditsRemaining: number;
  plan: PlanTier;
  tookMs: number;
}

export interface PitchResponse {
  pitch: string;
  subject: string;
  model: string;
  creditsRemaining: number;
  locked: boolean;
}

export const DAILY_LIMITS: Record<PlanTier, number> = {
  free: 5,
  pro: 120,
  agency: 400,
};

export const MONTHLY_EMAIL_CREDITS: Record<string, number> = {
  pro: 500,
  agency: 2500,
};

export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"•".repeat(Math.max(3, local.length - 2))}${domain}`;
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const hours = Math.max(1, Math.round((Date.now() - then) / 3_600_000));
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.round(days / 7);
  return `${weeks}w ago`;
}
