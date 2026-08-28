import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { checkSubdomains } from "@shared/registry/crtsh.ts";
import { RegistryCheck } from "@shared/schemas.ts";
import { lintText } from "@shared/lint.ts";

const FIXED_NOW = new Date("2026-08-28T12:00:00.000Z");
const ctxBase = { now: () => FIXED_NOW };

function fixture(name: string): string {
  return readFileSync(
    new URL(`../../fixtures/registry-responses/${name}`, import.meta.url),
    "utf8",
  );
}

function fetchStub(
  handler: (url: string) => Response | Promise<Response>,
): typeof fetch {
  return (async (input: RequestInfo | URL) => handler(String(input))) as typeof fetch;
}

function expectClean(check: { summary: string }) {
  expect(lintText(check.summary)).toEqual([]);
}

describe("checkSubdomains (crt.sh)", () => {
  it("counts distinct subdomains and finds product infrastructure", async () => {
    const result = await checkSubdomains(
      { domain: "civicsignal.ai" },
      {
        ...ctxBase,
        fetchFn: fetchStub(() => new Response(fixture("crtsh-example.json"), { status: 200 })),
      },
    );
    expect(RegistryCheck.parse(result)).toBeTruthy();
    expect(result.status).toBe("hit");
    expect(result.confidence).toBe("exact");
    expect(result.retrieved_at).toBe(FIXED_NOW.toISOString());
    /* www, app, api, docs, mail — wildcard *.api collapses into api. */
    expect(result.data?.distinct_subdomains).toBe(5);
    expect(result.data?.product_subdomains).toEqual([
      "api.civicsignal.ai",
      "app.civicsignal.ai",
      "docs.civicsignal.ai",
    ]);
    expect(result.summary).toContain("app.civicsignal.ai");
    expectClean(result);
  });

  it("treats an empty result set as a definitive miss", async () => {
    const result = await checkSubdomains(
      { domain: "no-certs.example" },
      {
        ...ctxBase,
        fetchFn: fetchStub(() => new Response(fixture("crtsh-empty.json"), { status: 200 })),
      },
    );
    expect(RegistryCheck.parse(result)).toBeTruthy();
    expect(result.status).toBe("definitive_miss");
    expect(result.data?.distinct_subdomains).toBe(0);
    expectClean(result);
  });

  it("returns coverage_limited on a non-200 (crt.sh is flaky, never adverse)", async () => {
    const result = await checkSubdomains(
      { domain: "civicsignal.ai" },
      { ...ctxBase, fetchFn: fetchStub(() => new Response("overloaded", { status: 503 })) },
    );
    expect(result.status).toBe("coverage_limited");
    expectClean(result);
  });

  it("returns coverage_limited when crt.sh returns non-JSON output", async () => {
    const result = await checkSubdomains(
      { domain: "civicsignal.ai" },
      {
        ...ctxBase,
        fetchFn: fetchStub(() => new Response("<html>busy</html>", { status: 200 })),
      },
    );
    expect(result.status).toBe("coverage_limited");
  });

  it("returns coverage_limited on timeout or network failure, and never throws", async () => {
    const abortErr = new DOMException("The operation was aborted.", "AbortError");
    const result = await checkSubdomains(
      { domain: "civicsignal.ai" },
      {
        ...ctxBase,
        fetchFn: fetchStub(() => {
          throw abortErr;
        }),
      },
    );
    expect(RegistryCheck.parse(result)).toBeTruthy();
    expect(result.status).toBe("coverage_limited");
    expectClean(result);
  });
});
