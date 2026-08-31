/*
  Government-email normalization and domain policy for the verified quota
  tier. Pure platform-agnostic TS (no Deno APIs) so vitest can import it.

  Policy at launch: strictly .gov and .mil as the final domain label. The
  optional extraDomains list exists for staging only (exact matches, set via
  the GOV_EXTRA_DOMAINS secret); production leaves it empty.
*/
import { sha256Hex } from "./ratelimit.ts";

/* Conservative ASCII-only shapes. Anything fancier (quoted local parts,
   internationalized addresses, punycode lookalikes) is rejected on purpose:
   real government mailboxes are plain, and the cost of a false reject is a
   polite error, not a lockout. */
const LOCAL_RE = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;
const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

/*
  Normalize a submitted email: trim, lowercase, strip the +tag from the local
  part (dots are kept — no provider-specific dot folding), and validate the
  ASCII-only shape. Returns null when the input is not a working address.
*/
export function normalizeGovEmail(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.length === 0 || trimmed.length > 254) return null;

  const parts = trimmed.split("@");
  if (parts.length !== 2) return null;

  /* Subaddress tags (jane+intake@) alias the same mailbox; strip them so one
     mailbox maps to one hash and one quota. */
  const local = parts[0].split("+")[0];
  const domain = parts[1];
  if (!LOCAL_RE.test(local) || !DOMAIN_RE.test(domain)) return null;

  return `${local}@${domain}`;
}

/*
  True when the email's domain ends in .gov or .mil as the final label with
  at least one label before it (a.gov, ci.springfield.gov, army.mil), or
  exactly matches an entry in extraDomains (compared lowercased). foo.gov.com
  fails: "gov" must be the FINAL label. Non-ASCII domains fail the shape
  check regardless of suffix.
*/
export function isAllowedGovDomain(email: string, extraDomains: string[] = []): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  const host = email.slice(at + 1).toLowerCase();
  if (!DOMAIN_RE.test(host)) return false;
  if (/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:gov|mil)$/.test(host)) {
    return true;
  }
  return extraDomains.some((d) => d.trim().toLowerCase() === host);
}

/*
  The stored identifier for a verified address: sha256 of the normalized
  email, sliced to 24 hex chars (96 bits — same shape as the IP hashes in
  the rate limiter). The plaintext address is never stored anywhere.
*/
export async function emailHash24(email: string): Promise<string> {
  return (await sha256Hex(email)).slice(0, 24);
}
