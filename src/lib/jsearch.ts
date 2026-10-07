/**
 * Typed client for the JSearch API on RapidAPI (jsearch.p.rapidapi.com).
 * Every call is wrapped so a missing key, rate limit, or upstream error
 * degrades to the deterministic corpus instead of throwing to the caller.
 */

export interface JSearchJob {
  job_id: string;
  job_title: string;
  job_city: string | null;
  job_state: string | null;
  job_country: string | null;
  job_apply_link: string | null;
  job_description: string | null;
  job_posted_at: string | null;
  job_posted_at_datetime_utc: string | null;
  job_salary: string | null;
  job_employment_type: string | null;
  employer_name: string | null;
  employer_website: string | null;
}

interface JSearchResponse {
  status: string;
  data: JSearchJob[];
}

export interface NormalizedJob {
  jobTitle: string;
  companyName: string;
  companyDomain: string;
  jobUrl: string;
  location: string;
  salaryRange: string | null;
  postedAt: Date;
}

export function domainFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    return host.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function parsePostedAt(raw: string | null): Date {
  if (!raw) return new Date();
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return new Date();
  // JSearch occasionally returns future timestamps on syndicated posts.
  if (parsed.getTime() > Date.now()) return new Date();
  return parsed;
}

/**
 * Calls the live JSearch endpoint. Returns [] when the key is unset or the
 * upstream fails — callers fall back to the corpus.
 */
export async function fetchJSearchJobs(
  query: string,
  page = 1,
): Promise<NormalizedJob[]> {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return [];

  const params = new URLSearchParams({
    query,
    page: String(page),
    num_pages: "1",
    date_posted: "week",
  });

  let res: Response;
  try {
    res = await fetch(`https://jsearch.p.rapidapi.com/search?${params}`, {
      headers: {
        "X-RapidAPI-Key": key,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
      },
      signal: AbortSignal.timeout(9000),
    });
  } catch {
    return [];
  }

  if (!res.ok) return [];

  let body: JSearchResponse;
  try {
    body = (await res.json()) as JSearchResponse;
  } catch {
    return [];
  }

  if (body.status !== "OK" || !Array.isArray(body.data)) return [];

  const jobs: NormalizedJob[] = [];
  for (const job of body.data) {
    if (!job.employer_name || !job.job_title) continue;
    const domain = domainFromUrl(job.employer_website);
    if (!domain) continue;
    const locationParts = [job.job_city, job.job_state, job.job_country].filter(
      Boolean,
    ) as string[];
    jobs.push({
      jobTitle: job.job_title.trim(),
      companyName: job.employer_name.trim(),
      companyDomain: domain,
      jobUrl:
        job.job_apply_link ??
        `https://${domain}/careers/${job.job_id ?? "role"}`,
      location: locationParts.length > 0 ? locationParts.join(", ") : "Remote",
      salaryRange: job.job_salary,
      postedAt: parsePostedAt(
        job.job_posted_at_datetime_utc ?? job.job_posted_at,
      ),
    });
  }
  return jobs;
}
