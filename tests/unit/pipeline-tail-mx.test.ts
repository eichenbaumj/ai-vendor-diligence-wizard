/*
  The MX-retry execution path (v1.6).

  Two defects fixed and locked here: (1) needsMxRetry ignored a
  coverage_limited DNS row (the DoH SERVFAIL class), so the fallback never
  fired for it; (2) the merge replaced only status==="error" rows, so a
  successful retry after a coverage_limited first answer was silently
  discarded. A hit or a definitive miss is an answer: never retried, never
  replaced.
*/
import { describe, expect, it } from "vitest";
import { mergeMxRetryResult, needsMxRetry } from "@shared/pipeline-tail.ts";
import type { RegistryCheck } from "@shared/schemas.ts";

const AT = "2026-09-01T12:00:00.000Z";

function check(
  check_id: string,
  status: RegistryCheck["status"],
  data: Record<string, unknown> | null = null,
): RegistryCheck {
  return {
    check_id,
    source: "Test source",
    status,
    summary: "Test summary.",
    evidence_url: null,
    confidence: null,
    retrieved_at: AT,
    data,
  };
}

const rdapDown = check("rdap_domain_age", "coverage_limited");

describe("needsMxRetry", () => {
  it("fires when RDAP is unavailable and the DNS check is missing, errored, or coverage_limited", () => {
    expect(needsMxRetry([rdapDown])).toBe(true);
    expect(needsMxRetry([rdapDown, check("dns_email_hygiene", "error")])).toBe(true);
    expect(
      needsMxRetry([rdapDown, check("dns_email_hygiene", "coverage_limited")]),
    ).toBe(true);
  });

  it("never fires when the DNS check answered", () => {
    expect(needsMxRetry([rdapDown, check("dns_email_hygiene", "hit")])).toBe(false);
    expect(
      needsMxRetry([rdapDown, check("dns_email_hygiene", "definitive_miss")]),
    ).toBe(false);
  });

  it("never fires when RDAP answered (hit or definitive miss)", () => {
    expect(needsMxRetry([check("rdap_domain_age", "hit")])).toBe(false);
    expect(needsMxRetry([check("rdap_domain_age", "definitive_miss")])).toBe(false);
    expect(needsMxRetry([])).toBe(false);
  });

  it("any answered dns row suppresses the retry, wherever it sits in the list", () => {
    /* Duplicate-row hardening: with [error, hit] the old first-row read
       fired a pointless retry. */
    expect(
      needsMxRetry([
        rdapDown,
        check("dns_email_hygiene", "error"),
        check("dns_email_hygiene", "hit"),
      ]),
    ).toBe(false);
    expect(
      needsMxRetry([
        rdapDown,
        check("dns_email_hygiene", "coverage_limited"),
        check("dns_email_hygiene", "definitive_miss"),
      ]),
    ).toBe(false);
  });
});

describe("mergeMxRetryResult", () => {
  const retryHit = check("dns_email_hygiene", "hit", { has_mx: true });

  it("pushes when no DNS row exists", () => {
    const checks: RegistryCheck[] = [rdapDown];
    mergeMxRetryResult(checks, retryHit);
    expect(checks.filter((c) => c.check_id === "dns_email_hygiene")).toHaveLength(1);
    expect(checks.at(-1)?.status).toBe("hit");
  });

  it("replaces an errored row", () => {
    const checks = [check("dns_email_hygiene", "error")];
    mergeMxRetryResult(checks, retryHit);
    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe("hit");
    expect(checks[0].data).toMatchObject({ has_mx: true });
  });

  it("replaces a coverage_limited row (the DoH SERVFAIL class)", () => {
    const checks = [check("dns_email_hygiene", "coverage_limited")];
    mergeMxRetryResult(checks, retryHit);
    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe("hit");
  });

  it("never replaces a hit or a definitive miss", () => {
    for (const answered of ["hit", "definitive_miss"] as const) {
      const original = check("dns_email_hygiene", answered, { original: true });
      const checks = [original];
      mergeMxRetryResult(checks, retryHit);
      expect(checks).toHaveLength(1);
      expect(checks[0]).toBe(original);
    }
  });
});
