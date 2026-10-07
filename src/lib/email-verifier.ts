import { promises as dns } from "node:dns";

export type MxStatus = "ok" | "none" | "unknown";

export interface VerificationResult {
  syntaxValid: boolean;
  disposable: boolean;
  mx: MxStatus;
  status: "verified" | "syntax_valid" | "no_mx" | "disposable" | "invalid";
  confidenceAdjustment: number;
}

/** Known disposable-mail domains (subset of the public blocklists). */
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "10minutemail.com",
  "yopmail.com",
  "tempmail.com",
  "temp-mail.org",
  "getnada.com",
  "maildrop.cc",
  "sharklasers.com",
  "trashmail.com",
  "dispostable.com",
  "throwawaymail.com",
  "fakeinbox.com",
  "mailnesia.com",
  "mintemail.com",
]);

const RFC5322_SIMPLE =
  /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("dns_timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * Verifies an email address in three stages:
 * 1. RFC-shaped syntax check.
 * 2. Disposable-domain blocklist.
 * 3. MX record lookup (3s timeout; sandboxed/offline environments yield "unknown").
 */
export async function verifyEmail(email: string): Promise<VerificationResult> {
  const trimmed = email.trim().toLowerCase();

  if (!RFC5322_SIMPLE.test(trimmed)) {
    return {
      syntaxValid: false,
      disposable: false,
      mx: "unknown",
      status: "invalid",
      confidenceAdjustment: -1,
    };
  }

  const domain = trimmed.split("@")[1];
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      syntaxValid: true,
      disposable: true,
      mx: "unknown",
      status: "disposable",
      confidenceAdjustment: -1,
    };
  }

  let mx: MxStatus = "unknown";
  try {
    const records = await withTimeout(dns.resolveMx(domain), 3000);
    mx = records && records.length > 0 ? "ok" : "none";
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENODATA" || code === "ENOTFOUND" || code === "EBADNAME") {
      mx = "none";
    } else {
      mx = "unknown"; // timeout or resolver unavailable — do not penalize
    }
  }

  if (mx === "ok") {
    return {
      syntaxValid: true,
      disposable: false,
      mx,
      status: "verified",
      confidenceAdjustment: 0.12,
    };
  }
  if (mx === "none") {
    return {
      syntaxValid: true,
      disposable: false,
      mx,
      status: "no_mx",
      confidenceAdjustment: -0.18,
    };
  }
  return {
    syntaxValid: true,
    disposable: false,
    mx,
    status: "syntax_valid",
    confidenceAdjustment: 0,
  };
}

export function maskEmailServer(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return email;
  const local = email.slice(0, at);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"•".repeat(Math.max(3, local.length - 2))}${email.slice(at)}`;
}
