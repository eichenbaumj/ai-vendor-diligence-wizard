/*
  Honest disclosure when the name-run website step fails.

  Before 1.6, a failed website discovery or an unreadable site left NO
  trace in the report: the run's tier could drop to "not enough to
  evaluate" with the honesty panel silent about why (the only records were
  console logs and stage timings). That violates the panel's promise that
  every check the tool meant to run is accounted for.

  This module builds a synthetic RegistryCheck (the domain_inference
  precedent) whose coverage_limited status flows through assemble's
  existing honesty mapping into a could_not_check row, grouped
  "unavailable". The copy is a CODE TEMPLATE (load-bearing
  self-description, never model-phrased), lint-safe, and sized to the
  honesty reason cap of 300 characters BY CONSTRUCTION: the domain is
  included only when the total fits, because a schema-cap overflow here
  would fail whole-report validation (the crt.sh incident, 2026-09-01).

  Pure module: no Deno APIs, no side effects.
*/
import type { RegistryCheck } from "./schemas.ts";

/* Methodology 1.8 (operational, not a rule): the name-run website step's
   failure diagnostics, persisted in the stored row's usage jsonb because
   RegistryCheck.data is not persisted on standard runs and function
   console logs are unreachable post hoc. Record-free by construction:
   short reason strings only, no page text, capped in count and length.
   Reads as data downstream; nothing in the report depends on it. */
export interface SiteForensics {
  outcome: "not_found" | "unreadable";
  step: string | null;
  fetch_failures: string[];
  extract_attempts: string[];
  /* The discovery lookup's own outcome tag and attempt count (not_found). */
  discovery_outcome: string | null;
  discovery_attempts: number | null;
}

const FORENSIC_STRING_CAP = 200;
const FORENSIC_LIST_CAP = 6;

function capList(v: unknown): string[] {
  return Array.isArray(v)
    ? v
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .slice(0, FORENSIC_LIST_CAP)
        .map((x) => x.slice(0, FORENSIC_STRING_CAP))
    : [];
}

export function siteForensicsFor(
  outcome: "not_found" | "unreadable",
  data: Record<string, unknown>,
): SiteForensics {
  const step = typeof data["step"] === "string" ? (data["step"] as string).slice(0, 40) : null;
  const discoveryOutcome = data["discovery_outcome"];
  const discoveryAttempts = data["discovery_attempts"];
  return {
    outcome,
    step,
    fetch_failures: capList(data["fetch_failures"]),
    extract_attempts: capList(data["extract_attempts"]),
    discovery_outcome: typeof discoveryOutcome === "string" ? discoveryOutcome.slice(0, 40) : null,
    discovery_attempts:
      typeof discoveryAttempts === "number" && Number.isFinite(discoveryAttempts) ? discoveryAttempts : null,
  };
}

export const SITE_DISCOVERY_CHECK_ID = "site_discovery";
export const SITE_DISCOVERY_SOURCE = "Vendor website discovery";

/* HonestyItem.reason caps at 300; assemble copies the check summary into
   it verbatim for could_not_check rows. */
const SUMMARY_CAP = 300;

const NOT_FOUND_SUMMARY =
  "We could not find this vendor's website from its name alone, so the " +
  "website checks did not run. This does not count against the vendor. " +
  "To include those checks, run a new check with the vendor's web " +
  "address pasted in.";

const UNREADABLE_SUFFIX =
  "but could not read its pages during this run, so they were not " +
  "checked and its registration record could not count toward identity. " +
  "This does not count against the vendor. Run a new check with the " +
  "vendor's web address to include it.";

export const LATE_FOUND_SUMMARY =
  "A likely website turned up in research citations after the site " +
  "reading step had passed, so its pages were not read this run. Its " +
  "registration and mail checks appear in this panel. This does not " +
  "count against the vendor.";

function unreadableSummary(domain: string): string {
  const withDomain = `We found a likely website for this vendor (${domain}) ${UNREADABLE_SUFFIX}`;
  if (withDomain.length <= SUMMARY_CAP) return withDomain;
  return `We found a likely website for this vendor ${UNREADABLE_SUFFIX}`;
}

export type SiteDiscoveryFailureKind = "not_found" | "unreadable";

/* Build the disclosure check. `domain` is the discovered domain for the
   unreadable case (null when discovery itself found nothing — an
   "unreadable" without a domain normalizes to not_found so summary and
   record can never disagree). Typed fields win over caller data: the
   summary and the failure_kind the tail reconciliation keys on must
   never be clobbered by a diagnostic key. */
export function siteDiscoveryFailureCheck(
  kind: SiteDiscoveryFailureKind,
  domain: string | null,
  retrievedAt: string,
  data?: Record<string, unknown>,
): RegistryCheck {
  const effectiveKind: SiteDiscoveryFailureKind =
    domain === null ? "not_found" : kind;
  return {
    check_id: SITE_DISCOVERY_CHECK_ID,
    source: SITE_DISCOVERY_SOURCE,
    status: "coverage_limited",
    summary:
      effectiveKind === "not_found"
        ? NOT_FOUND_SUMMARY
        : unreadableSummary(domain as string),
    evidence_url: domain ? `https://${domain}` : null,
    confidence: null,
    retrieved_at: retrievedAt,
    data: { ...(data ?? {}), failure_kind: effectiveKind, domain },
  };
}

/* Tail reconciliation: research later inferred a domain, so "could not
   find the website" is no longer the honest story — the pages still went
   unread, but the hygiene checks now appear in the panel. REPLACE the
   summary (never append: the 300 cap is load-bearing). */
export function reconcileLateFoundSite(checks: RegistryCheck[]): void {
  const row = checks.find(
    (c) =>
      c.check_id === SITE_DISCOVERY_CHECK_ID &&
      ((c.data ?? {}) as { failure_kind?: string }).failure_kind === "not_found",
  );
  if (!row) return;
  row.summary = LATE_FOUND_SUMMARY;
  row.data = {
    ...((row.data ?? {}) as Record<string, unknown>),
    late_found: true,
  };
}
