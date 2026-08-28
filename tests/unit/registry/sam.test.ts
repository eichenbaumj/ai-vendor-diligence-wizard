import { describe, expect, it } from "vitest";
import { RegistryCheck } from "../../../supabase/functions/_shared/schemas.ts";
import { lintText } from "../../../supabase/functions/_shared/lint.ts";
import {
  checkSamEntity,
  checkSamExclusions,
  matchCompanyName,
  normalizeCompanyName,
} from "../../../supabase/functions/_shared/registry/sam.ts";
import type { RegistryCtx } from "../../../supabase/functions/_shared/registry/sam.ts";
import entityHit from "../../fixtures/registry-responses/sam-entity-hit.json";
import entityEmpty from "../../fixtures/registry-responses/sam-entity-empty.json";
import entitySpv from "../../fixtures/registry-responses/sam-entity-spv.json";
import exclusionsExact from "../../fixtures/registry-responses/sam-exclusions-exact.json";
import exclusionsEmpty from "../../fixtures/registry-responses/sam-exclusions-empty.json";
import exclusionsFuzzy from "../../fixtures/registry-responses/sam-exclusions-fuzzy.json";

interface Route {
  match: string;
  body: unknown;
  status?: number;
}

function makeFetch(routes: Route[], calls: string[] = []): typeof fetch {
  return (async (input: RequestInfo | URL): Promise<Response> => {
    const url = String(input);
    calls.push(url);
    const route = routes.find((r) => url.includes(r.match));
    if (!route) throw new Error(`no canned response for ${url}`);
    return new Response(JSON.stringify(route.body), {
      status: route.status ?? 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

const failingFetch = (async () => {
  throw new Error("network down");
}) as unknown as typeof fetch;

const NOW = () => new Date("2026-08-28T12:00:00Z");

function ctxWith(fetchFn: typeof fetch): RegistryCtx {
  return { fetchFn, apiKeys: { sam: "test-key" }, now: NOW };
}

describe("name normalization", () => {
  it("strips punctuation, case, and corporate suffixes", () => {
    expect(normalizeCompanyName("GovAssist AI, Inc.")).toBe("GOVASSIST AI");
    expect(normalizeCompanyName("Anthropic, PBC")).toBe("ANTHROPIC");
    expect(normalizeCompanyName("Acme Holdings, LLC")).toBe("ACME HOLDINGS");
  });

  it("rejects investment-vehicle names the query does not contain", () => {
    const match = matchCompanyName(
      "AUGMENT COLLECTIVE, LLC SERIES ANTHROPIC PBC N",
      ["Anthropic"],
    );
    expect(match.kind).toBe("vehicle_rejected");
  });

  it("matches exact and similarity confidence correctly", () => {
    expect(
      matchCompanyName("GOVASSIST AI INC", ["GovAssist AI"]),
    ).toMatchObject({ kind: "match", confidence: "exact" });
    expect(
      matchCompanyName("GOVASSIST AI SOLUTIONS", ["GovAssist AI"]),
    ).toMatchObject({ kind: "match", confidence: "name_similarity" });
  });
});

describe("checkSamEntity", () => {
  it("returns a hit with UEI on an exact match", async () => {
    const check = await checkSamEntity(
      { companyNames: ["GovAssist AI, Inc."] },
      ctxWith(makeFetch([{ match: "entity-information/v1-4", body: entityHit }])),
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("hit");
    expect(check.confidence).toBe("exact");
    expect(check.evidence_url).toBe("https://sam.gov/entity/ABC123DEF456");
    expect(check.data).toMatchObject({ uei: "ABC123DEF456" });
    expect(check.retrieved_at).toBe("2026-08-28T12:00:00.000Z");
  });

  it("frames a definitive miss as normal for state/local vendors", async () => {
    const check = await checkSamEntity(
      { companyNames: ["GovAssist AI"] },
      ctxWith(makeFetch([{ match: "entity-information/v1-4", body: entityEmpty }])),
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("definitive_miss");
    expect(check.confidence).toBeNull();
    expect(check.summary).toMatch(/common/i);
    expect(check.summary).toMatch(/not a red flag/i);
  });

  it("returns coverage_limited without a key and never calls the network", async () => {
    const calls: string[] = [];
    const check = await checkSamEntity(
      { companyNames: ["GovAssist AI"] },
      { fetchFn: makeFetch([], calls), now: NOW },
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("coverage_limited");
    expect(check.summary).toMatch(/key not configured/i);
    expect(calls).toHaveLength(0);
  });

  it("returns status error on network failure", async () => {
    const check = await checkSamEntity(
      { companyNames: ["GovAssist AI"] },
      ctxWith(failingFetch),
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("error");
    expect(check.summary).toMatch(/could not reach/i);
  });

  it("rejects SPV-style records instead of matching them", async () => {
    const check = await checkSamEntity(
      { companyNames: ["GovAssist AI"] },
      ctxWith(makeFetch([{ match: "entity-information/v1-4", body: entitySpv }])),
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("definitive_miss");
    expect(check.data?.rejected_investment_vehicles).toContain(
      "GOVASSIST AI SERIES FUND LLC",
    );
  });
});

describe("checkSamExclusions", () => {
  it("reports only exact-identity matches as hits", async () => {
    const check = await checkSamExclusions(
      { companyNames: ["GovAssist AI Inc"], people: [] },
      ctxWith(makeFetch([{ match: "exclusions", body: exclusionsExact }])),
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("hit");
    expect(check.confidence).toBe("exact");
    expect(check.summary).toMatch(/procurement counsel/i);
  });

  it("returns a clean definitive miss when nothing matches", async () => {
    const check = await checkSamExclusions(
      {
        companyNames: ["GovAssist AI"],
        people: [{ name: "Jane Q. Founder" }],
      },
      ctxWith(makeFetch([{ match: "exclusions", body: exclusionsEmpty }])),
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("definitive_miss");
    expect(check.confidence).toBeNull();
  });

  it("suppresses name-similarity matches entirely from the prose", async () => {
    const check = await checkSamExclusions(
      { companyNames: ["GovAssist AI Inc"], people: [] },
      ctxWith(makeFetch([{ match: "exclusions", body: exclusionsFuzzy }])),
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("definitive_miss");
    expect(check.summary).not.toMatch(/SOLUTIONS/i);
    expect(check.data?.suppressed_fuzzy_matches).toContain(
      "GOVASSIST AI SOLUTIONS LLC",
    );
  });

  it("returns coverage_limited without a key", async () => {
    const check = await checkSamExclusions(
      { companyNames: ["GovAssist AI"], people: [] },
      { fetchFn: failingFetch, now: NOW },
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("coverage_limited");
  });

  it("returns status error on network failure", async () => {
    const check = await checkSamExclusions(
      { companyNames: ["GovAssist AI"], people: [] },
      ctxWith(failingFetch),
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("error");
  });
});

describe("copy safety", () => {
  it("every summary passes the legal-language lint", async () => {
    const checks = await Promise.all([
      checkSamEntity(
        { companyNames: ["GovAssist AI, Inc."] },
        ctxWith(makeFetch([{ match: "entity-information/v1-4", body: entityHit }])),
      ),
      checkSamEntity(
        { companyNames: ["GovAssist AI"] },
        ctxWith(makeFetch([{ match: "entity-information/v1-4", body: entityEmpty }])),
      ),
      checkSamEntity({ companyNames: ["GovAssist AI"] }, ctxWith(failingFetch)),
      checkSamEntity({ companyNames: ["GovAssist AI"] }, { now: NOW, fetchFn: failingFetch }),
      checkSamExclusions(
        { companyNames: ["GovAssist AI Inc"], people: [] },
        ctxWith(makeFetch([{ match: "exclusions", body: exclusionsExact }])),
      ),
      checkSamExclusions(
        { companyNames: ["GovAssist AI Inc"], people: [] },
        ctxWith(makeFetch([{ match: "exclusions", body: exclusionsFuzzy }])),
      ),
    ]);
    for (const check of checks) {
      expect(lintText(check.summary)).toEqual([]);
    }
  });
});
