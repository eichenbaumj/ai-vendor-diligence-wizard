import { describe, expect, it } from "vitest";
import {
  DISCOVERY_RETRY_CUTOFF_MS,
  S2_OVERHEAD_ALLOWANCE_MS,
  S3_START_BOUND_MS,
  SITE_EXTRACT_RETRY_CUTOFF_MS,
  SITE_EXTRACT_TIMEOUT_MS,
  SITE_FETCH_PAUSE_ALLOWANCE_MS,
  SITE_FETCH_SECOND_ATTEMPT_CUTOFF_MS,
  SITE_PASS_CUTOFF_MS,
  canRetryDiscovery,
  canRetrySiteExtract,
  canStartSitePass,
  siteFetchAttempts,
} from "@shared/s1b-budget.ts";
import { SITE_DEADLINE_MS, SITE_RETRY_PAUSE_MS } from "@shared/ingest-site.ts";
import { DISCOVERY_ATTEMPT_2_DEADLINE_MS } from "@shared/discovery.ts";

describe("s1b budget composition against the S3 start bound", () => {
  /* The module's whole point: the cutoffs must COMPOSE, retries
     included, inside the bound its derivation claims. Re-derive the
     worst case from the constants so a future cutoff bump that breaks
     the arithmetic fails here instead of at the 400s wall in
     production. */
  it("the composed worst-case S1b end + S2 overhead stays inside the S3 start bound", () => {
    /* Branch A: latest possible pass start, single fetch pass, extract
       attempt 1 runs to its full timeout; the extract retry gate is
       checked AFTER attempt 1, so a retry only happens when attempt 1
       ENDED before the retry cutoff. */
    const branchA_extract1End =
      SITE_PASS_CUTOFF_MS + SITE_DEADLINE_MS + SITE_EXTRACT_TIMEOUT_MS;
    const branchA_end =
      branchA_extract1End < SITE_EXTRACT_RETRY_CUTOFF_MS
        ? branchA_extract1End + SITE_EXTRACT_TIMEOUT_MS
        : branchA_extract1End;

    /* Branch B: two fetch passes plus the inter-pass pause (granted only
       under the second-attempt cutoff), then the latest retry the
       extract gate can grant. */
    const branchB_fetchEnd =
      SITE_FETCH_SECOND_ATTEMPT_CUTOFF_MS +
      2 * SITE_DEADLINE_MS +
      SITE_FETCH_PAUSE_ALLOWANCE_MS;
    const branchB_extract1End = branchB_fetchEnd + SITE_EXTRACT_TIMEOUT_MS;
    const branchB_end = Math.max(
      branchB_extract1End,
      /* retry granted at the last allowed instant */
      Math.min(branchB_extract1End, SITE_EXTRACT_RETRY_CUTOFF_MS) +
        SITE_EXTRACT_TIMEOUT_MS,
    );

    /* Branch C: a retry granted at the last allowed instant, wherever
       attempt 1 started. */
    const branchC_end = SITE_EXTRACT_RETRY_CUTOFF_MS + SITE_EXTRACT_TIMEOUT_MS;

    const worstS1bEnd = Math.max(branchA_end, branchB_end, branchC_end);
    expect(worstS1bEnd + S2_OVERHEAD_ALLOWANCE_MS).toBeLessThanOrEqual(
      S3_START_BOUND_MS,
    );
  });

  it("the pause allowance mirrors the real inter-pass pause", () => {
    expect(SITE_FETCH_PAUSE_ALLOWANCE_MS).toBe(SITE_RETRY_PAUSE_MS);
  });

  it("a discovery retry always finishes before the site-pass gate", () => {
    expect(
      DISCOVERY_RETRY_CUTOFF_MS + DISCOVERY_ATTEMPT_2_DEADLINE_MS,
    ).toBeLessThanOrEqual(SITE_PASS_CUTOFF_MS);
  });

  it("orders the cutoffs sanely", () => {
    expect(SITE_FETCH_SECOND_ATTEMPT_CUTOFF_MS).toBeLessThan(SITE_PASS_CUTOFF_MS);
    expect(DISCOVERY_RETRY_CUTOFF_MS).toBeLessThan(SITE_PASS_CUTOFF_MS);
    expect(SITE_PASS_CUTOFF_MS).toBeLessThan(SITE_EXTRACT_RETRY_CUTOFF_MS);
  });
});

describe("s1b budget predicates", () => {
  it("canStartSitePass flips exactly at the cutoff", () => {
    expect(canStartSitePass(0)).toBe(true);
    expect(canStartSitePass(SITE_PASS_CUTOFF_MS - 1)).toBe(true);
    expect(canStartSitePass(SITE_PASS_CUTOFF_MS)).toBe(false);
    expect(canStartSitePass(SITE_PASS_CUTOFF_MS + 1)).toBe(false);
  });

  it("the site pass may start later than the old 60s magic number", () => {
    /* The point of the budget module: a slow-but-recoverable discovery no
       longer silently forfeits the second identity identifier. */
    expect(canStartSitePass(65_000)).toBe(true);
  });

  it("siteFetchAttempts grants the second attempt only while the budget allows", () => {
    expect(siteFetchAttempts(0)).toBe(2);
    expect(siteFetchAttempts(SITE_FETCH_SECOND_ATTEMPT_CUTOFF_MS - 1)).toBe(2);
    expect(siteFetchAttempts(SITE_FETCH_SECOND_ATTEMPT_CUTOFF_MS)).toBe(1);
  });

  it("canRetrySiteExtract flips exactly at its cutoff", () => {
    expect(canRetrySiteExtract(SITE_EXTRACT_RETRY_CUTOFF_MS - 1)).toBe(true);
    expect(canRetrySiteExtract(SITE_EXTRACT_RETRY_CUTOFF_MS)).toBe(false);
  });

  it("canRetryDiscovery flips exactly at its cutoff", () => {
    expect(canRetryDiscovery(DISCOVERY_RETRY_CUTOFF_MS - 1)).toBe(true);
    expect(canRetryDiscovery(DISCOVERY_RETRY_CUTOFF_MS)).toBe(false);
  });
});
