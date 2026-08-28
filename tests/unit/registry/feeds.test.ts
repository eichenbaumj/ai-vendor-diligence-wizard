import { describe, expect, it } from "vitest";
import { RegistryCheck } from "../../../supabase/functions/_shared/schemas.ts";
import { lintText } from "../../../supabase/functions/_shared/lint.ts";
import {
  checkGovRamp,
  checkSourcewell,
  checkTxRamp,
} from "../../../supabase/functions/_shared/registry/feeds.ts";
import type {
  RampFeedRow,
  SourcewellFeedRow,
} from "../../../supabase/functions/_shared/registry/feeds.ts";
import type { RegistryCtx } from "../../../supabase/functions/_shared/registry/sam.ts";

const ctx: RegistryCtx = { now: () => new Date("2026-08-28T12:00:00Z") };

const rampFeed: RampFeedRow[] = [
  { provider: "GovAssist AI Inc", product: "GovAssist Platform", status: "Ready" },
  { provider: "CloudCourt Inc", product: "CloudCourt Gov", status: "Authorized" },
  { provider: "Civic Series Fund LLC", status: "Member" },
];

const sourcewellFeed: SourcewellFeedRow[] = [
  { supplier: "GovAssist AI Inc", contract: "010101-GAI" },
  { supplier: "CloudCourt Inc", contract: "020202-CCI" },
];

describe("checkGovRamp", () => {
  it("reports a listed participant with its status level", async () => {
    const check = await checkGovRamp(
      { companyNames: ["GovAssist AI"], claimed: true },
      rampFeed,
      ctx,
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("hit");
    expect(check.confidence).toBe("exact");
    expect(check.summary).toMatch(/status Ready/);
  });

  it("treats claimed-but-absent as a registry contradiction", async () => {
    const check = await checkGovRamp(
      { companyNames: ["Phantom Vendor"], claimed: true },
      rampFeed,
      ctx,
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("definitive_miss");
    expect(check.data).toMatchObject({ claimed_but_absent: true });
    expect(check.summary).toMatch(/does not include/i);
  });

  it("treats unclaimed absence as neutral", async () => {
    const check = await checkGovRamp(
      { companyNames: ["Phantom Vendor"], claimed: false },
      rampFeed,
      ctx,
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("definitive_miss");
    expect(check.summary).toMatch(/neutral/i);
  });

  it("returns coverage_limited when the feed is not loaded", async () => {
    const check = await checkGovRamp(
      { companyNames: ["GovAssist AI"], claimed: true },
      null,
      ctx,
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("coverage_limited");
    expect(check.summary).toMatch(/not been loaded/i);
  });

  it("rejects investment-vehicle rows", async () => {
    const check = await checkGovRamp(
      { companyNames: ["Civic"], claimed: false },
      rampFeed,
      ctx,
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("definitive_miss");
    expect(check.data?.rows_scanned).toBe(rampFeed.length);
  });
});

describe("checkTxRamp", () => {
  it("keeps the publishing-lag caveat on claimed-but-absent", async () => {
    const check = await checkTxRamp(
      { companyNames: ["Phantom Vendor"], claimed: true },
      rampFeed,
      ctx,
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("definitive_miss");
    expect(check.data).toMatchObject({
      claimed_but_absent: true,
      lag_caveat: true,
    });
    expect(check.summary).toMatch(/behind/i);
    expect(check.summary).toMatch(/certification letter/i);
  });

  it("reports a listed product and cautions when the status is provisional", async () => {
    const txFeed: RampFeedRow[] = [
      { provider: "CloudCourt Inc", product: "CloudCourt Gov", status: "Provisional" },
    ];
    const check = await checkTxRamp(
      { companyNames: ["CloudCourt"], claimed: true },
      txFeed,
      ctx,
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("hit");
    expect(check.summary).toMatch(/provisional status is not the same as certified/i);
  });

  it("does not add the provisional caution to a certified listing", async () => {
    const check = await checkTxRamp(
      { companyNames: ["CloudCourt"], claimed: true },
      rampFeed,
      ctx,
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("hit");
    expect(check.summary).not.toMatch(/provisional/i);
  });

  it("returns coverage_limited when the feed is not loaded", async () => {
    const check = await checkTxRamp(
      { companyNames: ["CloudCourt"], claimed: false },
      null,
      ctx,
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("coverage_limited");
  });
});

describe("checkSourcewell", () => {
  it("reports a contract holder with its contract number", async () => {
    const check = await checkSourcewell(
      { companyNames: ["GovAssist AI, Inc."], claimed: true },
      sourcewellFeed,
      ctx,
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("hit");
    expect(check.confidence).toBe("exact");
    expect(check.summary).toMatch(/010101-GAI/);
  });

  it("treats claimed-but-absent as a contradiction and suggests the reseller path", async () => {
    const check = await checkSourcewell(
      { companyNames: ["Phantom Vendor"], claimed: true },
      sourcewellFeed,
      ctx,
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("definitive_miss");
    expect(check.data).toMatchObject({ claimed_but_absent: true });
    expect(check.summary).toMatch(/contract number/i);
    expect(check.summary).toMatch(/reseller/i);
  });

  it("returns coverage_limited when the feed is not loaded", async () => {
    const check = await checkSourcewell(
      { companyNames: ["Phantom Vendor"], claimed: false },
      null,
      ctx,
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("coverage_limited");
  });
});

describe("copy safety", () => {
  it("every summary passes the legal-language lint", async () => {
    const checks = await Promise.all([
      checkGovRamp({ companyNames: ["GovAssist AI"], claimed: true }, rampFeed, ctx),
      checkGovRamp({ companyNames: ["Phantom Vendor"], claimed: true }, rampFeed, ctx),
      checkGovRamp({ companyNames: ["Phantom Vendor"], claimed: false }, rampFeed, ctx),
      checkGovRamp({ companyNames: ["GovAssist AI"], claimed: true }, null, ctx),
      checkTxRamp({ companyNames: ["Phantom Vendor"], claimed: true }, rampFeed, ctx),
      checkTxRamp({ companyNames: ["CloudCourt"], claimed: true }, rampFeed, ctx),
      checkSourcewell(
        { companyNames: ["GovAssist AI, Inc."], claimed: true },
        sourcewellFeed,
        ctx,
      ),
      checkSourcewell(
        { companyNames: ["Phantom Vendor"], claimed: true },
        sourcewellFeed,
        ctx,
      ),
    ]);
    for (const check of checks) {
      expect(lintText(check.summary)).toEqual([]);
    }
  });
});
