import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { checkEmailHygiene, registrableDomain } from "@shared/registry/dns.ts";
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

function json(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "application/dns-json" },
  });
}

/* Routes DoH queries by name/type query params. */
function dohFetch(overrides?: { mx?: string }): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("type=MX")) return json(fixture(overrides?.mx ?? "dns-mx-hit.json"));
    if (url.includes("_dmarc.")) return json(fixture("dns-txt-dmarc.json"));
    return json(fixture("dns-txt-spf.json"));
  }) as typeof fetch;
}

function expectClean(check: { summary: string }) {
  expect(lintText(check.summary)).toEqual([]);
}

describe("registrableDomain heuristic", () => {
  it("strips subdomains and keeps two-part public suffixes", () => {
    expect(registrableDomain("mail.civicsignal.ai")).toBe("civicsignal.ai");
    expect(registrableDomain("civicsignal.ai")).toBe("civicsignal.ai");
    expect(registrableDomain("www.example.co.uk")).toBe("example.co.uk");
  });
});

describe("checkEmailHygiene (DNS over HTTPS)", () => {
  it("reports a hit with SPF and DMARC when MX exists", async () => {
    const result = await checkEmailHygiene(
      { domain: "civicsignal.ai", senderDomain: "civicsignal.ai" },
      { ...ctxBase, fetchFn: dohFetch() },
    );
    expect(RegistryCheck.parse(result)).toBeTruthy();
    expect(result.status).toBe("hit");
    expect(result.confidence).toBe("exact");
    expect(result.retrieved_at).toBe(FIXED_NOW.toISOString());
    expect(result.data?.has_mx).toBe(true);
    expect(result.data?.has_spf).toBe(true);
    expect(result.data?.has_dmarc).toBe(true);
    expect(result.data?.sender_domain_differs).toBe(false);
    expectClean(result);
  });

  it("notes when the pitch came from a different domain than the site", async () => {
    const result = await checkEmailHygiene(
      { domain: "civicsignal.ai", senderDomain: "mail.gmail.com" },
      { ...ctxBase, fetchFn: dohFetch() },
    );
    expect(result.status).toBe("hit");
    expect(result.data?.sender_domain_differs).toBe(true);
    expect(result.summary).toContain("gmail.com");
    expectClean(result);
  });

  it("treats a subdomain sender of the same registrable domain as matching", async () => {
    const result = await checkEmailHygiene(
      { domain: "civicsignal.ai", senderDomain: "mail.civicsignal.ai" },
      { ...ctxBase, fetchFn: dohFetch() },
    );
    expect(result.data?.sender_domain_differs).toBe(false);
  });

  it("reports a definitive miss when no MX records exist", async () => {
    const result = await checkEmailHygiene(
      { domain: "no-mail.example", senderDomain: null },
      { ...ctxBase, fetchFn: dohFetch({ mx: "dns-mx-none.json" }) },
    );
    expect(RegistryCheck.parse(result)).toBeTruthy();
    expect(result.status).toBe("definitive_miss");
    expect(result.confidence).toBeNull();
    expect(result.data?.has_mx).toBe(false);
    expectClean(result);
  });

  it("returns status error when the network fails, and never throws", async () => {
    const result = await checkEmailHygiene(
      { domain: "civicsignal.ai", senderDomain: null },
      {
        ...ctxBase,
        fetchFn: (async () => {
          throw new TypeError("fetch failed");
        }) as unknown as typeof fetch,
      },
    );
    expect(RegistryCheck.parse(result)).toBeTruthy();
    expect(result.status).toBe("error");
    expectClean(result);
  });
});
