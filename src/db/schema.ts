import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/**
 * LeadPulse AI — core schema.
 * Mirrors the Supabase PostgreSQL DDL documented in BLUEPRINT.md §4.
 * All access is server-side only (route handlers + server components),
 * which is the application-level equivalent of RLS `auth.uid()` policies.
 */

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  plan: text("plan").notNull().default("free"),
  isPro: boolean("is_pro").notNull().default(false),
  creditsRemaining: integer("credits_remaining").notNull().default(0),
  dailyQuotaUsed: integer("daily_quota_used").notNull().default(0),
  quotaResetAt: timestamp("quota_reset_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const hiringSignals = pgTable(
  "hiring_signals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyName: text("company_name").notNull(),
    companyDomain: text("company_domain").notNull(),
    jobTitle: text("job_title").notNull(),
    jobUrl: text("job_url").notNull(),
    location: text("location").notNull(),
    techStackTags: text("tech_stack_tags").array().notNull().default([]),
    salaryRange: text("salary_range"),
    postedAt: timestamp("posted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    cachedAt: timestamp("cached_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    source: text("source").notNull().default("jsearch"),
    velocityScore: integer("velocity_score").notNull().default(50),
    openRoles: integer("open_roles").notNull().default(1),
  },
  (t) => [
    uniqueIndex("hiring_signals_job_url_idx").on(t.jobUrl),
    index("hiring_signals_location_idx").on(t.location),
    index("hiring_signals_velocity_idx").on(t.velocityScore),
  ],
);

export const verifiedLeads = pgTable(
  "verified_leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    signalId: uuid("signal_id")
      .notNull()
      .references(() => hiringSignals.id, { onDelete: "cascade" }),
    decisionMakerName: text("decision_maker_name").notNull(),
    roleTitle: text("role_title").notNull(),
    email: text("email").notNull(),
    confidenceScore: numeric("confidence_score", { precision: 4, scale: 2 })
      .notNull()
      .default("0.70"),
    linkedinUrl: text("linkedin_url"),
    status: text("status").notNull().default("syntax_valid"),
    verifiedAt: timestamp("verified_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("verified_leads_signal_id_idx").on(t.signalId)],
);

export const pitchDrafts = pgTable(
  "pitch_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id").references(() => verifiedLeads.id, {
      onDelete: "set null",
    }),
    signalId: uuid("signal_id").references(() => hiringSignals.id, {
      onDelete: "set null",
    }),
    generatedPitch: text("generated_pitch").notNull(),
    subject: text("subject"),
    model: text("model").notNull().default("local-composer"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("pitch_drafts_user_idx").on(t.userId)],
);

export const affiliateClicks = pgTable(
  "affiliate_clicks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    partner: text("partner").notNull(),
    targetUrl: text("target_url").notNull(),
    ipHash: text("ip_hash").notNull(),
    userAgent: text("user_agent"),
    clickedAt: timestamp("clicked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("affiliate_clicks_partner_idx").on(t.partner)],
);

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  sourcePage: text("source_page").notNull().default("/"),
  status: text("status").notNull().default("active"),
  providerSynced: boolean("provider_synced").notNull().default(false),
  subscribedAt: timestamp("subscribed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // razorpay | stripe | sandbox
    planTier: text("plan_tier").notNull(), // pro | agency | topup-100 | topup-500
    subscriptionId: text("subscription_id").notNull(),
    status: text("status").notNull().default("active"),
    amount: integer("amount").notNull().default(0),
    currency: text("currency").notNull().default("INR"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("subscriptions_user_idx").on(t.userId)],
);

/** 48-hour response cache for upstream job-board queries. */
export const searchCache = pgTable("search_cache", {
  key: text("key").primaryKey(),
  payload: jsonb("payload").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
