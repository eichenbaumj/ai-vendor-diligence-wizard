import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { checkWebHistory } from "@shared/registry/wayback.ts";
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

describe("checkWebHistory (Wayback CDX)", () => {
  it("reports first capture, recency, and a capture-count estimate on a hit", async () => {
    const result = await checkWebHistory(
      { domain: "civicsignal.ai" },
      {
        ...ctxBase,
        fetchFn: fetchStub(() => new Response(fixture("wayback-collapsed.json"), { status: 200 })),
      },
    );
    expect(RegistryCheck.parse(result)).toBeTruthy();
    expect(result.status).toBe("hit");
    expect(result.confidence).toBe("exact");
    expect(result.retrieved_at).toBe(FIXED_NOW.toISOString());
    expect(result.summary).toContain("March 2021");
    expect(result.summary).toContain("August 2026");
    expect(result.data?.first_capture).toBe("2021-03-15");
    expect(result.data?.last_capture).toBe("2026-08-12");
    expect(result.data?.capture_count_estimate).toBe(4);
    expectClean(result);
  });

  it("treats no captures as a definitive miss framed as informational, never adverse", async () => {
    const result = await checkWebHistory(
      { domain: "brand-new.example" },
      {
        ...ctxBase,
        fetchFn: fetchStub(() => new Response(fixture("wayback-empty.json"), { status: 200 })),
      },
    );
    expect(RegistryCheck.parse(result)).toBeTruthy();
    expect(result.status).toBe("definitive_miss");
    expect(result.summary.toLowerCase()).toContain("not a negative finding");
    expect(result.data?.capture_count_estimate).toBe(0);
    expectClean(result);
  });

  it("handles an entirely empty CDX body as a definitive miss", async () => {
    const result = await checkWebHistory(
      { domain: "brand-new.example" },
      { ...ctxBase, fetchFn: fetchStub(() => new Response("", { status: 200 })) },
    );
    expect(result.status).toBe("definitive_miss");
  });

  it("returns coverage_limited on an upstream failure status", async () => {
    const result = await checkWebHistory(
      { domain: "civicsignal.ai" },
      { ...ctxBase, fetchFn: fetchStub(() => new Response("", { status: 503 })) },
    );
    expect(result.status).toBe("coverage_limited");
    expectClean(result);
  });

  it("returns status error when the network fails, and never throws", async () => {
    const result = await checkWebHistory(
      { domain: "civicsignal.ai" },
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
