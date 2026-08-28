import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { checkGithubOrg } from "@shared/registry/github.ts";
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
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input), init)) as typeof fetch;
}

function expectClean(check: { summary: string }) {
  expect(lintText(check.summary)).toEqual([]);
}

describe("checkGithubOrg", () => {
  it("finds the org, repo activity, and exact confidence on a name match", async () => {
    const result = await checkGithubOrg(
      { candidates: ["CivicSignal Inc"], domain: "civicsignal.ai" },
      {
        ...ctxBase,
        fetchFn: fetchStub((url) => {
          if (url.includes("/repos")) return new Response(fixture("github-repos.json"), { status: 200 });
          if (url.includes("/orgs/civicsignal")) return new Response(fixture("github-org.json"), { status: 200 });
          return new Response("", { status: 404 });
        }),
      },
    );
    expect(RegistryCheck.parse(result)).toBeTruthy();
    expect(result.status).toBe("hit");
    expect(result.confidence).toBe("exact");
    expect(result.retrieved_at).toBe(FIXED_NOW.toISOString());
    expect(result.evidence_url).toBe("https://github.com/civicsignal");
    expect(result.data?.public_repos).toBe(12);
    expect(result.data?.last_push).toBe("2026-08-01T12:00:00Z");
    expectClean(result);
  });

  it("sends the token from ctx.apiKeys.github as an Authorization header", async () => {
    let sawAuth: string | null = null;
    await checkGithubOrg(
      { candidates: ["CivicSignal Inc"], domain: "civicsignal.ai" },
      {
        ...ctxBase,
        apiKeys: { github: "ghp_test123" },
        fetchFn: fetchStub((url, init) => {
          const headers = (init?.headers ?? {}) as Record<string, string>;
          sawAuth = headers["authorization"] ?? null;
          if (url.includes("/repos")) return new Response(fixture("github-repos.json"), { status: 200 });
          return new Response(fixture("github-org.json"), { status: 200 });
        }),
      },
    );
    expect(sawAuth).toBe("Bearer ghp_test123");
  });

  it("treats no org found as a definitive miss with neutral framing", async () => {
    const result = await checkGithubOrg(
      { candidates: ["CivicSignal Inc"], domain: "civicsignal.ai" },
      { ...ctxBase, fetchFn: fetchStub(() => new Response("", { status: 404 })) },
    );
    expect(RegistryCheck.parse(result)).toBeTruthy();
    expect(result.status).toBe("definitive_miss");
    expect(result.summary.toLowerCase()).toContain("neutral");
    expectClean(result);
  });

  it("rejects an investment-vehicle org name (SPV false positive)", async () => {
    const result = await checkGithubOrg(
      { candidates: ["CivicSignal Inc"], domain: "civicsignal.ai" },
      {
        ...ctxBase,
        fetchFn: fetchStub((url) => {
          if (url.includes("/orgs/civicsignal")) {
            return new Response(fixture("github-org-spv.json"), { status: 200 });
          }
          return new Response("", { status: 404 });
        }),
      },
    );
    /* The slug resolved, but the org is "CivicSignal Series Fund Holdings":
       rejected, so the check reports a miss rather than a false hit. */
    expect(result.status).toBe("definitive_miss");
  });

  it("returns coverage_limited when rate-limited before any search completed", async () => {
    const result = await checkGithubOrg(
      { candidates: ["CivicSignal Inc"], domain: "civicsignal.ai" },
      { ...ctxBase, fetchFn: fetchStub(() => new Response("rate limited", { status: 403 })) },
    );
    expect(result.status).toBe("coverage_limited");
    expectClean(result);
  });

  it("returns status error when the network fails, and never throws", async () => {
    const result = await checkGithubOrg(
      { candidates: ["CivicSignal Inc"], domain: "civicsignal.ai" },
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
