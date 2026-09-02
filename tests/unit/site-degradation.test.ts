/*
  The honest disclosure for a failed name-run website step (v1.6).

  Rules under test: the synthetic check validates against the schema, its
  copy passes the language lint, the summary fits the 300-char honesty
  reason cap BY CONSTRUCTION (the crt.sh overflow class), and the tail
  reconciliation replaces the not_found story when research later finds
  the site — replace, never append.
*/
import { describe, expect, it } from "vitest";
import { siteForensicsFor } from "@shared/site-degradation.ts";

describe("siteForensicsFor (methodology 1.8 usage diagnostics)", () => {
  it("keeps only the outcome, the step, the discovery tags, and capped reason strings", () => {
    const f = siteForensicsFor("unreadable", {
      step: "fetch",
      fetch_failures: ["apex=fetch failed www=HTTP 403", "", "x".repeat(500), 1, null, "a", "b", "c", "d", "e"],
      extract_attempts: ["attempt1:schema", "attempt2:timeout"],
      pages: [{ text: "never persisted" }],
      domain_text: "should not appear",
    });
    expect(f.outcome).toBe("unreadable");
    expect(f.step).toBe("fetch");
    expect(f.fetch_failures).toHaveLength(6);
    expect(f.fetch_failures[1]).toHaveLength(200);
    expect(f.extract_attempts).toEqual(["attempt1:schema", "attempt2:timeout"]);
    expect(f.discovery_outcome).toBeNull();
    expect(JSON.stringify(f)).not.toContain("never persisted");
    expect(JSON.stringify(f)).not.toContain("should not appear");
    expect(Object.keys(f).sort()).toEqual([
      "discovery_attempts",
      "discovery_outcome",
      "extract_attempts",
      "fetch_failures",
      "outcome",
      "step",
    ]);
  });
  it("carries the discovery lookup's outcome and attempts on not_found", () => {
    expect(siteForensicsFor("not_found", { discovery_outcome: "no_candidate", discovery_attempts: 2 })).toEqual({
      outcome: "not_found",
      step: null,
      fetch_failures: [],
      extract_attempts: [],
      discovery_outcome: "no_candidate",
      discovery_attempts: 2,
    });
  });
});
import {
  LATE_FOUND_SUMMARY,
  SITE_DISCOVERY_CHECK_ID,
  reconcileLateFoundSite,
  siteDiscoveryFailureCheck,
} from "@shared/site-degradation.ts";
import { RegistryCheck } from "@shared/schemas.ts";
import { lintText } from "@shared/lint.ts";

const AT = "2026-09-01T12:00:00.000Z";
/* 63 characters is the DNS label maximum: the longest legal domain label. */
const LONG_DOMAIN = `${"a".repeat(63)}.example`;

describe("siteDiscoveryFailureCheck", () => {
  it("builds a schema-valid, lint-clean not_found check", () => {
    const check = siteDiscoveryFailureCheck("not_found", null, AT, {
      discovery_outcome: "infra_failure",
      discovery_attempts: 2,
    });
    expect(RegistryCheck.parse(check)).toBeTruthy();
    expect(check.check_id).toBe(SITE_DISCOVERY_CHECK_ID);
    expect(check.status).toBe("coverage_limited");
    expect(check.summary.length).toBeLessThanOrEqual(300);
    expect(lintText(check.summary)).toEqual([]);
    expect(check.summary).toContain("does not count against the vendor");
    expect(check.evidence_url).toBeNull();
    expect(check.data).toMatchObject({
      failure_kind: "not_found",
      discovery_attempts: 2,
    });
  });

  it("builds a schema-valid, lint-clean unreadable check naming the domain", () => {
    const check = siteDiscoveryFailureCheck("unreadable", "acmeai.com", AT);
    expect(RegistryCheck.parse(check)).toBeTruthy();
    expect(check.status).toBe("coverage_limited");
    expect(check.summary).toContain("acmeai.com");
    expect(check.summary.length).toBeLessThanOrEqual(300);
    expect(lintText(check.summary)).toEqual([]);
    expect(check.evidence_url).toBe("https://acmeai.com");
  });

  it("stays under the 300-char cap with the longest legal domain label, dropping the domain if needed", () => {
    const check = siteDiscoveryFailureCheck("unreadable", LONG_DOMAIN, AT);
    expect(check.summary.length).toBeLessThanOrEqual(300);
    expect(lintText(check.summary)).toEqual([]);
    /* Whether or not the name fit, the sentence must stay grammatical and
       the record must still carry the domain in data. */
    expect(check.data).toMatchObject({ domain: LONG_DOMAIN });
  });

  it("the late-found template is lint-clean and inside the cap", () => {
    expect(LATE_FOUND_SUMMARY.length).toBeLessThanOrEqual(300);
    expect(lintText(LATE_FOUND_SUMMARY)).toEqual([]);
  });

  it("caller data can never clobber the typed fields the tail keys on", () => {
    const check = siteDiscoveryFailureCheck("not_found", null, AT, {
      failure_kind: "bogus",
      domain: "evil.example",
      step: "diagnostic",
    });
    expect(check.data).toMatchObject({
      failure_kind: "not_found",
      domain: null,
      step: "diagnostic",
    });
    const checks = [check];
    reconcileLateFoundSite(checks);
    expect(checks[0].summary).toBe(LATE_FOUND_SUMMARY);
  });

  it("an unreadable call without a domain normalizes to not_found so summary and record agree", () => {
    const check = siteDiscoveryFailureCheck("unreadable", null, AT);
    expect(check.data).toMatchObject({ failure_kind: "not_found", domain: null });
    expect(check.summary).toContain("could not find this vendor's website");
    expect(check.evidence_url).toBeNull();
  });
});

describe("reconcileLateFoundSite", () => {
  it("replaces a not_found summary with the late-found story", () => {
    const checks = [
      siteDiscoveryFailureCheck("not_found", null, AT, {
        discovery_outcome: "no_match",
        discovery_attempts: 1,
      }),
    ];
    reconcileLateFoundSite(checks);
    expect(checks[0].summary).toBe(LATE_FOUND_SUMMARY);
    expect(checks[0].status).toBe("coverage_limited");
    expect(checks[0].data).toMatchObject({
      late_found: true,
      discovery_attempts: 1,
    });
  });

  it("leaves an unreadable row alone: its pages were found, just not read", () => {
    const checks = [siteDiscoveryFailureCheck("unreadable", "acmeai.com", AT)];
    const before = checks[0].summary;
    reconcileLateFoundSite(checks);
    expect(checks[0].summary).toBe(before);
  });

  it("does nothing when no disclosure row exists", () => {
    const checks: RegistryCheck[] = [];
    expect(() => reconcileLateFoundSite(checks)).not.toThrow();
    expect(checks).toEqual([]);
  });
});
