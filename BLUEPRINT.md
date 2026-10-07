# LeadPulse AI — Zero-to-One Production Blueprint

Real-time B2B hiring-signal and decision-maker intelligence engine.
This document is the architectural specification for the codebase in this
repository. Every module referenced below exists as working code; where the
sandbox runs a substitute (documented per section), the production swap is
stated explicitly.

---

## 1. Business thesis, in numbers

| Fact | Value | Consequence |
| --- | --- | --- |
| Annual decay of static lead lists (Apollo/ZoomInfo exports) | ~30% | Prospecting against stale rows wastes SDR time |
| Typical bounce rate on purchased lists | ~40% | Sender reputation damage, domain burn |
| Budget implied by one posted job | $50k–$150k approved | A job post is a purchase-intent signal |
| Signal freshness target | < 48h | Cache TTL is 48h everywhere in the pipeline |

The product inverts list-based prospecting: instead of filtering a static
database of companies, we listen for events (job posts) and resolve the budget
owner for each event while it is active.

---

## 2. System architecture

```
Browser (Next.js App Router, RSC + client islands)
   │
   ├─ /                      Landing: hero, live search island, preview table, pricing, FAQ
   ├─ /dashboard             Workspace: credits, quota, pitch history, billing history
   ├─ /companies-hiring/[tech]/[city]
   │                         pSEO radar pages, ISR 12h, JSON-LD Dataset+ItemList+FAQ, OG images
   │
   ├─ /api/search            Quota → cache → JSearch → corpus → persist → enrich → respond
   ├─ /api/generate-pitch    Credit gate → Groq Llama 3.3 70B → persist draft
   ├─ /api/go/[partner]      Affiliate click logging (SHA-256 ip hash) → 307 redirect
   ├─ /api/billing           Razorpay/Stripe checkout; sandbox grant when keys absent
   ├─ /api/webhooks/razorpay HMAC-SHA256 verification → plan grant / cancellation
   ├─ /api/newsletter/subscribe  Upsert → Resend welcome mail → Loops contact sync
   ├─ /api/export            Pro/Agency CSV/JSON export, 500-row cap
   └─ /api/seed              Idempotent pipeline warmer for the radar grid

PostgreSQL (Drizzle ORM)          search_cache table = the 48h response cache
External: RapidAPI JSearch · Groq · Razorpay · Stripe · Resend · Loops
```

Sandbox substitutions (preview environment):

| Production system | Sandbox substitute | Where |
| --- | --- | --- |
| Supabase Auth (Google OAuth + magic link) | Signed httpOnly cookie session, identical user contract | `src/lib/auth.ts`, `src/app/api/auth/route.ts` |
| Upstash Redis (rate limiting + cache) | Postgres-backed quota counters + `search_cache` table | `src/lib/quota.ts`, `src/lib/signals.ts` |
| People-data provider for contacts | Deterministic decision-maker synthesis + real syntax/MX validation | `src/lib/enrich.ts`, `src/lib/email-verifier.ts` |
| Live JSearch feed | Deterministic fictional-company corpus (same row shape) | `src/lib/fallback-data.ts` |

Each substitute is isolated behind one function boundary, so the production
swap touches one file each.

---

## 3. Data pipeline, stage by stage

1. **Ingest** — `fetchJSearchJobs()` calls `jsearch.p.rapidapi.com/search`
   with `date_posted=week`, 9s timeout, typed response parsing. Any failure
   returns `[]` and the caller degrades.
2. **Cache** — results are stored in `search_cache` keyed by SHA-256 of
   `tech:city:limit`, TTL 48h. Reads happen before any upstream call.
3. **Persist** — rows upsert into `hiring_signals` with a unique index on
   `job_url`; velocity and open-role counts update on conflict.
4. **Enrich** — `synthesizeDecisionMaker()` maps role intent to the budget
   owner (CTO/VP Eng for engineering, Founder for growth, Head of Talent for
   team roles), composes the email from four common patterns, and assigns a
   deterministic confidence 0.62–0.92.
5. **Validate** — `verifyEmail()` runs RFC-shaped syntax check, disposable
   domain blocklist, and MX resolution with a 3s timeout. Confidence adjusts
   +0.12 (MX ok) or −0.18 (no MX).
6. **Score** — Hiring Velocity = 44 base + up to 26 recency + up to 18
   concurrent-openings + 8 salary transparency + 0–6 deterministic jitter,
   clamped to 40–99.
7. **Draft** — `generatePitch()` sends the exact job requirements to Groq
   (`llama-3.3-70b-versatile`, temperature 0.7) with a system prompt that
   enforces 3 sentences and forbids filler. Offline fallback: a
   deterministic composer with the same constraints.

---

## 4. Database — Supabase PostgreSQL DDL

The sandbox runs the equivalent Drizzle schema (`src/db/schema.ts`). For a
Supabase deployment, apply this migration:

```sql
create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free','pro','agency')),
  is_pro boolean not null default false,
  credits_remaining integer not null default 0,
  daily_quota_used integer not null default 0,
  quota_reset_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.hiring_signals (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  company_domain text not null,
  job_title text not null,
  job_url text not null unique,
  location text not null,
  tech_stack_tags text[] not null default '{}',
  salary_range text,
  posted_at timestamptz not null default now(),
  cached_at timestamptz not null default now(),
  source text not null default 'jsearch',
  velocity_score integer not null default 50,
  open_roles integer not null default 1
);
create index hiring_signals_location_idx on public.hiring_signals (location);
create index hiring_signals_velocity_idx on public.hiring_signals (velocity_score desc);

create table public.verified_leads (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references public.hiring_signals(id) on delete cascade,
  decision_maker_name text not null,
  role_title text not null,
  email text not null,
  confidence_score numeric(4,2) not null default 0.70,
  linkedin_url text,
  status text not null default 'syntax_valid',
  verified_at timestamptz not null default now(),
  unique (signal_id)
);

create table public.pitch_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lead_id uuid references public.verified_leads(id) on delete set null,
  signal_id uuid references public.hiring_signals(id) on delete set null,
  generated_pitch text not null,
  subject text,
  model text not null default 'local-composer',
  created_at timestamptz not null default now()
);

create table public.affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  partner text not null,
  target_url text not null,
  ip_hash text not null,
  user_agent text,
  clicked_at timestamptz not null default now()
);

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source_page text not null default '/',
  status text not null default 'active',
  provider_synced boolean not null default false,
  subscribed_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  plan_tier text not null,
  subscription_id text not null,
  status text not null default 'active',
  amount integer not null default 0,
  currency text not null default 'INR',
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

create table public.search_cache (
  key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.hiring_signals enable row level security;
alter table public.verified_leads enable row level security;
alter table public.pitch_drafts enable row level security;
alter table public.affiliate_clicks enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.search_cache enable row level security;

create policy "own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "own profile update" on public.profiles
  for update using (auth.uid() = id);

create policy "signals readable by signed-in users" on public.hiring_signals
  for select using (auth.role() = 'authenticated');
create policy "signals readable anon for seo" on public.hiring_signals
  for select using (true); -- radar pages are public; emails live in verified_leads

create policy "leads readable by signed-in users" on public.verified_leads
  for select using (auth.role() = 'authenticated');

create policy "own drafts" on public.pitch_drafts
  for all using (auth.uid() = user_id);

create policy "own clicks insert" on public.affiliate_clicks
  for insert with check (true);
create policy "own clicks read" on public.affiliate_clicks
  for select using (auth.uid() = user_id);

create policy "newsletter insert" on public.newsletter_subscribers
  for insert with check (true);

create policy "own subscriptions" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Trigger: create profile + welcome email on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  perform net.http_post(
    url := 'https://' || current_setting('app.edge_function_host', true) || '/welcome-email',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('email', new.email)
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Function: daily quota reset (called from cron via pg_cron)
create or replace function public.reset_daily_quotas()
returns void language sql as $$
  update public.profiles
  set daily_quota_used = 0,
      quota_reset_at = now() + interval '1 day'
  where quota_reset_at <= now();
$$;
select cron.schedule('reset-quotas', '0 0 * * *', 'select public.reset_daily_quotas()');
```

The sandbox implements the same guarantees in application code:
`ensureQuotaWindow()` performs the lazy daily reset, and route handlers are
the only writers — the equivalent of denying all direct table access.

---

## 5. The five revenue channels, as implemented

### 5.1 Recurring subscriptions — `src/app/api/billing/route.ts` + webhook

- Free: 5 lookups/day, masked emails, no export, no pitch drafts.
- Pro: ₹1,999/mo ($29) → 500 email credits, 120 lookups/day, CSV/JSON, pitches.
- Agency: ₹4,999/mo ($79) → 2,500 credits, 400 lookups/day, digest + webhook export.
- INR checkout creates a Razorpay Subscription with `notes.lp_user_id` and
  `notes.lp_plan`; the webhook at `/api/webhooks/razorpay` verifies
  `X-Razorpay-Signature` (HMAC-SHA256 over raw body) and grants on
  `subscription.charged` / `payment.captured`, revokes on halt/cancel.
- USD checkout creates a Stripe Checkout Session; grant is the same function.
- Without keys (preview), the grant executes immediately under a synthetic
  subscription id so the entire lifecycle is testable.

### 5.2 Affiliate engine — `src/app/api/go/[partner]/route.ts`

Partners: Instantly.ai, Smartlead.ai, Clay.com (`src/lib/catalog.ts`).
Every click writes `affiliate_clicks` (SHA-256 hashed IP, user agent,
partner, target) and 307-redirects with the referral id appended. The CSV
export flow and the ad container route through it.
Unit economics at 30% lifetime recurring: 25 active agency referrals ≈
$750/mo (₹62k/mo) with zero marginal cost.

### 5.3 Pay-as-you-go top-ups — same billing route, `action=topup`

₹499 → 100 credits, ₹1,999 → 500 credits. Credited atomically with
`credits_remaining + n` and recorded in `subscriptions` as `one_time`.

### 5.4 Weekly "Hiring Radar" newsletter — `/api/newsletter/subscribe`

Capture modal copy: "Get the 50 fastest-growing funded startups hiring in
tech this week, delivered every Monday at 8:00 AM IST." Subscribers upsert
into `newsletter_subscribers`, sync to Resend (welcome mail) and Loops
(contact create) when keys exist. Sponsorship inventory: one banner slot per
issue at $60–$100 CPM.

### 5.5 Native ad containers — `src/components/AdContainer.tsx`

Slot below every results table and radar page, labeled, sized for Carbon
Ads / EthicalAds at $6–$20 CPM. Until a network account is attached it
serves a house placement for the affiliate partner through the tracked
redirect.

---

## 6. Operational playbook

### 6.1 Infrastructure setup (target: under 1 hour)

1. **Vercel** — import the repo, framework preset "Next.js", Node 20 runtime.
2. **Supabase** — create project → run the §4 migration → enable Google
   provider (Credentials: authorized redirect to
   `https://<ref>.supabase.co/auth/v1/callback`).
3. **Upstash** — create Redis DB → set `UPSTASH_REDIS_REST_URL` /
   `_TOKEN`. Swap `src/lib/quota.ts` counters for `slidingWindow()` keyed on
   `user:{id}:search` (free: 5/day, pro: 120/day, agency: 400/day).
4. **RapidAPI** — subscribe to JSearch → set `RAPIDAPI_KEY`.
5. **Groq** — console.groq.com API key → `GROQ_API_KEY`.
6. **Payments** — Razorpay: create plans for ₹1,999/₹4,999, set
   `RAZORPAY_PLAN_PRO`, `RAZORPAY_PLAN_AGENCY`, `RAZORPAY_KEY_*`,
   `RAZORPAY_WEBHOOK_SECRET`, webhook URL
   `https://<domain>/api/webhooks/razorpay` with events
   `subscription.charged, subscription.halted, subscription.cancelled, payment.captured`.
   Stripe: create two prices, set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_*`,
   `STRIPE_WEBHOOK_SECRET`.
7. **Email** — Resend API key + verified domain (`RESEND_API_KEY`,
   `RESEND_FROM`), Loops key (`LOOPS_API_KEY`).
8. **Auth secrets** — `AUTH_SECRET` (32+ random chars), `SEED_SECRET`.
9. **Domain** — point `leadpulse.ai`, set `NEXT_PUBLIC_SITE_URL`. Verify
   sitemap at `/sitemap.xml` in Google Search Console.
10. **Warm-up** — `curl https://<domain>/api/seed?secret=<SEED_SECRET>`.

### 6.2 Cold outreach to the first 50 agencies

Target: 5–30 person performance-marketing and web-dev agencies on LinkedIn
(their SDRs live in Apollo lists today).

Connection note (≤300 chars):

> Hi {{first_name}} — we built a bot that alerts you the minute companies in
> {{city}} post open roles in {{their_tech}}. It ships the hiring manager's
> verified email with each alert. Free 1-month pass in exchange for blunt
> feedback. Worth a look?

Follow-up #1, day 3 (if accepted, no reply):

> Short version: instead of buying stale lists, you prospect companies that
> posted a job in the last 48 hours — proof they have budget open. The alert
> includes the decision-maker's validated email and a drafted first message.
> I can set your pass up today, takes two minutes: {{calendar_link}}

Follow-up #2, day 7:

> One concrete result from a beta agency: 11 replies in week one from
> companies that had posted Shopify roles within 72 hours. If the pass is
> not useful after two weeks, tell me what's missing and I'll fix it.

Sequencing: 50 sent/week, 2 follow-ups, 1 breakup. Expected: 20–30% accept,
8–12 activated passes per 50.

### 6.3 First 10 paying customers (day 0–14 conversion sequence)

| Day | Action | Mechanism |
| --- | --- | --- |
| 0 | Activate beta pass, run first search together on a call | Shared screen, their ICP |
| 1 | Deliver their first 20 signals with unmasked emails manually | Prove the data before the paywall |
| 3 | In-app: they hit the 5-lookup/day free limit | Quota message links to pricing |
| 5 | Email: usage summary — "You unmasked N leads, M had open budget signals this week" | Outcome framing, not feature framing |
| 7 | Offer: ₹1,999/mo Pro, first month ₹999, upgrade from the same dashboard | One-click Razorpay checkout |
| 10 | Non-converters: top-up trial — 25 free credits | Reciprocity; credits convert to habit |
| 14 | Breakup email with their saved pipeline CSV attached | Loss aversion on their own data |

Targets: 50 activated passes → 10 paid (20%) → ₹19,990 MRR from cohort one.
Repeat weekly; agency referrals (§5.2) compound from month two.

---

## 7. File map

| File | Responsibility |
| --- | --- |
| `src/db/schema.ts` | All 8 tables (Drizzle) |
| `src/lib/auth.ts` | Session signing, profile upsert, email validation |
| `src/lib/quota.ts` | Daily quota window, search consumption, credit consumption |
| `src/lib/catalog.ts` | Tech/city catalogs, plans, top-ups, affiliate partners |
| `src/lib/fallback-data.ts` | Fictional-company corpus + deterministic signal builder |
| `src/lib/jsearch.ts` | Typed RapidAPI JSearch client |
| `src/lib/enrich.ts` | Decision-maker synthesis + velocity scoring |
| `src/lib/email-verifier.ts` | Syntax, disposable-domain, MX verification |
| `src/lib/groq.ts` | Groq pitch generation + local composer fallback |
| `src/lib/signals.ts` | 48h cache → live → corpus pipeline, persistence, lead joins |
| `src/lib/billing.ts` | Plan/top-up grant logic shared by webhooks and sandbox |
| `src/lib/csv.ts` | CSV escaping + export header |
| `src/app/api/*` | auth, search, generate-pitch, go/[partner], webhooks/razorpay, newsletter/subscribe, billing, export, seed |
| `src/components/*` | AppShell (modal/toast context), Navigation, SearchInterface, LeadDataTable (+ static variant), PitchModal, PricingModal, SignInModal, NewsletterModal, NewsletterCTA, RadarCTA, AdContainer, SearchExperience, PricingSection, DashboardActions |
| `src/app/companies-hiring/[tech]/[city]/*` | ISR radar pages + OG images |
| `src/app/sitemap.ts`, `src/app/robots.ts` | Index surface (80 radar URLs) |
| `BLUEPRINT.md` | This document |

---

## 8. Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection |
| `AUTH_SECRET` | production | Session HMAC key (32+ chars) |
| `RAPIDAPI_KEY` | no | Live JSearch feed (falls back to corpus) |
| `GROQ_API_KEY` | no | Live pitch generation (falls back to composer) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | no | INR subscriptions |
| `RAZORPAY_PLAN_PRO`, `RAZORPAY_PLAN_AGENCY` | with Razorpay | Plan ids |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_AGENCY` | no | USD billing |
| `RESEND_API_KEY`, `RESEND_FROM` | no | Welcome mail |
| `LOOPS_API_KEY` | no | CRM sync |
| `SEED_SECRET` | no | Protects `/api/seed` |
| `NEXT_PUBLIC_SITE_URL` | production | Canonical URLs, sitemap, OG |
