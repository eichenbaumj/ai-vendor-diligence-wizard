import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { checkEdgarCompany, checkEdgarFts } from "@shared/registry/edgar.ts";
import { RegistryCheck } from "@shared/schemas.ts";
import { lintText } from "@shared/lint.ts";

const FIXED_NOW = new Date("2026-08-28T12:00:00.000Z");
const UA = "17A joe@group17a.com";
const ctxBase = { now: () => FIXED_NOW, apiKeys: { edgar_user_agent: UA } };

function fixture(name: string): string {
  return readFileSync(
    new URL(`../../fixtures/registry-responses/${name}`, import.meta.url),
    "utf8",
  );
}

function fetchStub(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input), init)) as typeof fetch;
}

function expectClean(check: { summary: string }) {
  expect(lintText(check.summary)).toEqual([]);
}

describe("checkEdgarFts (SEC EDGAR full-text search)", () => {
  it("finds a Form D, extracts the incorporation state, and matches exactly", async () => {
    let sawUserAgent: string | null = null;
    const result = await checkEdgarFts(
      { companyNames: ["CivicSignal"] },
      {
        ...ctxBase,
        fetchFn: fetchStub((_url, init) => {
          const headers = (init?.headers ?? {}) as Record<string, string>;
          sawUserAgent = headers["user-agent"] ?? null;
          return new Response(fixture("edgar-fts-hit.json"), { status: 200 });
        }),
      },
    );
    expect(RegistryCheck.parse(result)).toBeTruthy();
    expect(result.status).toBe("hit");
    expect(result.confidence).toBe("exact");
    expect(result.retrieved_at).toBe(FIXED_NOW.toISOString());
    expect(sawUserAgent).toBe(UA);
    expect(result.summary).toContain("Form D");
    expect(result.summary).toContain("Delaware");
    expect(result.data?.inc_states).toEqual(["DE"]);
    expect(result.data?.matched_names).toEqual(["CivicSignal Inc  (CIK 0001999999)"]);
    expectClean(result);
  });

  it("treats an empty result as a definitive miss framed as informational", async () => {
    const result = await checkEdgarFts(
      { companyNames: ["CivicSignal"] },
      {
        ...ctxBase,
        fetchFn: fetchStub(() => new Response(fixture("edgar-fts-empty.json"), { status: 200 })),
      },
    );
    expect(RegistryCheck.parse(result)).toBeTruthy();
    expect(result.status).toBe("definitive_miss");
    expect(result.summary.toLowerCase()).toContain("informational");
    expectClean(result);
  });

  it("rejects an investment-vehicle filer name (SPV false positive)", async () => {
    const result = await checkEdgarFts(
      { companyNames: ["CivicSignal"] },
      {
        ...ctxBase,
        fetchFn: fetchStub(() => new Response(fixture("edgar-fts-spv.json"), { status: 200 })),
      },
    );
    /* The only filer is "CivicSignal Series Fund I LLC": rejected, so the
       check reports a miss rather than a false hit. */
    expect(result.status).toBe("definitive_miss");
  });

  it("returns coverage_limited without fetching when no User-Agent is configured", async () => {
    let calls = 0;
    const result = await checkEdgarFts(
      { companyNames: ["CivicSignal"] },
      {
        now: () => FIXED_NOW,
        fetchFn: fetchStub(() => {
          calls += 1;
          return new Response("", { status: 200 });
        }),
      },
    );
    expect(result.status).toBe("coverage_limited");
    expect(calls).toBe(0);
    expectClean(result);
  });

  it("returns not_applicable when no company name is available", async () => {
    const result = await checkEdgarFts({ companyNames: ["  "] }, ctxBase);
    expect(result.status).toBe("not_applicable");
  });

  it("returns status error when the network fails, and never throws", async () => {
    const result = await checkEdgarFts(
      { companyNames: ["CivicSignal"] },
      {
        ...ctxBase,
        fetchFn: fetchStub(() => {
          throw new TypeError("fetch failed");
        }),
      },
    );
    expect(RegistryCheck.parse(result)).toBeTruthy();
    expect(result.status).toBe("error");
    expectClean(result);
  });
});

describe("checkEdgarCompany (SEC EDGAR company database)", () => {
  it("finds the company record with its state of incorporation", async () => {
    const result = await checkEdgarCompany(
      { companyNames: ["CivicSignal Inc"] },
      {
        ...ctxBase,
        fetchFn: fetchStub(() => new Response(fixture("edgar-company.atom.xml"), { status: 200 })),
      },
    );
    expect(RegistryCheck.parse(result)).toBeTruthy();
    expect(result.status).toBe("hit");
    expect(result.confidence).toBe("exact");
    expect(result.summary).toContain("Delaware");
    expect(result.data?.cik).toBe("1999999");
    expect(result.data?.state_of_incorporation).toBe("DE");
    expectClean(result);
  });

  it("treats an empty result as a definitive miss", async () => {
    const result = await checkEdgarCompany(
      { companyNames: ["CivicSignal Inc"] },
      {
        ...ctxBase,
        fetchFn: fetchStub(
          () => new Response(fixture("edgar-company-empty.atom.xml"), { status: 200 }),
        ),
      },
    );
    expect(result.status).toBe("definitive_miss");
    expectClean(result);
  });

  it("rejects an investment-vehicle company name (SPV false positive)", async () => {
    const result = await checkEdgarCompany(
      { companyNames: ["CivicSignal Inc"] },
      {
        ...ctxBase,
        fetchFn: fetchStub(
          () => new Response(fixture("edgar-company-spv.atom.xml"), { status: 200 }),
        ),
      },
    );
    expect(result.status).toBe("definitive_miss");
  });

  it("returns coverage_limited without fetching when no User-Agent is configured", async () => {
    let calls = 0;
    const result = await checkEdgarCompany(
      { companyNames: ["CivicSignal Inc"] },
      {
        now: () => FIXED_NOW,
        fetchFn: fetchStub(() => {
          calls += 1;
          return new Response("", { status: 200 });
        }),
      },
    );
    expect(result.status).toBe("coverage_limited");
    expect(calls).toBe(0);
  });

  it("returns status error when the network fails, and never throws", async () => {
    const result = await checkEdgarCompany(
      { companyNames: ["CivicSignal Inc"] },
      {
        ...ctxBase,
        fetchFn: fetchStub(() => {
          throw new TypeError("fetch failed");
        }),
      },
    );
    expect(RegistryCheck.parse(result)).toBeTruthy();
    expect(result.status).toBe("error");
    expectClean(result);
  });
});
