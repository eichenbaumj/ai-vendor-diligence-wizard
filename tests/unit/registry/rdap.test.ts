import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { checkDomainAge } from "@shared/registry/rdap.ts";
import { RegistryCheck } from "@shared/schemas.ts";
import { lintText } from "@shared/lint.ts";

const FIXED_NOW = new Date("2026-08-28T12:00:00.000Z");
const ctxBase = { now: () => FIXED_NOW };

/* Fake timers must never leak past a failing test. */
afterEach(() => {
  vi.useRealTimers();
});

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

describe("checkDomainAge (RDAP)", () => {
  it("reports the registration date on a hit with no claimed year", async () => {
    const result = await checkDomainAge(
      { domain: "civicsignal.ai", claimedFoundingYear: null },
      {
        ...ctxBase,
        fetchFn: fetchStub(() => new Response(fixture("rdap-example.json"), { status: 200 })),
      },
    );
    expect(RegistryCheck.parse(result)).toBeTruthy();
    expect(result.status).toBe("hit");
    expect(result.confidence).toBe("exact");
    expect(result.summary).toContain("June 2025");
    expect(result.retrieved_at).toBe(FIXED_NOW.toISOString());
    expect(result.data?.registered_year).toBe(2025);
    expect(result.data?.contradiction).toBe(false);
    expectClean(result);
  });

  it("flags a contradiction when the domain is much younger than the claimed founding year", async () => {
    const result = await checkDomainAge(
      { domain: "civicsignal.ai", claimedFoundingYear: 2018 },
      {
        ...ctxBase,
        fetchFn: fetchStub(() => new Response(fixture("rdap-example.json"), { status: 200 })),
      },
    );
    expect(result.status).toBe("hit");
    expect(result.data?.contradiction).toBe(true);
    expect(result.data?.registered_year).toBe(2025);
    expect(result.data?.claimed_year).toBe(2018);
    expect(result.summary).toContain("2018");
    expectClean(result);
  });

  it("does not flag a contradiction when the years are consistent", async () => {
    const result = await checkDomainAge(
      { domain: "civicsignal.ai", claimedFoundingYear: 2025 },
      {
        ...ctxBase,
        fetchFn: fetchStub(() => new Response(fixture("rdap-example.json"), { status: 200 })),
      },
    );
    expect(result.status).toBe("hit");
    expect(result.data?.contradiction).toBe(false);
    expectClean(result);
  });

  it("treats RDAP 404 as a definitive miss (domain not registered)", async () => {
    const result = await checkDomainAge(
      { domain: "does-not-exist.example", claimedFoundingYear: null },
      { ...ctxBase, fetchFn: fetchStub(() => new Response("", { status: 404 })) },
    );
    expect(RegistryCheck.parse(result)).toBeTruthy();
    expect(result.status).toBe("definitive_miss");
    expect(result.confidence).toBeNull();
    expectClean(result);
  });

  it("returns coverage_limited on a non-404 upstream failure", async () => {
    /* Both attempts 502: fake timers skip the real inter-attempt pause. */
    vi.useFakeTimers();
    const p = checkDomainAge(
      { domain: "civicsignal.ai", claimedFoundingYear: null },
      { ...ctxBase, fetchFn: fetchStub(() => new Response("", { status: 502 })) },
    );
    await vi.runAllTimersAsync();
    const result = await p;
    vi.useRealTimers();
    expect(result.status).toBe("coverage_limited");
    expectClean(result);
  });

  it("returns status error when the network fails, and never throws", async () => {
    vi.useFakeTimers();
    const p = checkDomainAge(
      { domain: "civicsignal.ai", claimedFoundingYear: 2018 },
      {
        ...ctxBase,
        fetchFn: fetchStub(() => {
          throw new TypeError("fetch failed");
        }),
      },
    );
    await vi.runAllTimersAsync();
    const result = await p;
    vi.useRealTimers();
    expect(RegistryCheck.parse(result)).toBeTruthy();
    expect(result.status).toBe("error");
    expect(result.summary.toLowerCase()).toContain("could not");
    expectClean(result);
  });
});

describe("retry semantics (v1.6): one signal-bounded retry on unavailability", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries once after a failed first attempt and uses the second answer", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const p = checkDomainAge(
      { domain: "civicsignal.ai", claimedFoundingYear: null },
      {
        ...ctxBase,
        fetchFn: fetchStub(() => {
          calls += 1;
          if (calls === 1) return new Response("", { status: 502 });
          return new Response(fixture("rdap-example.json"), { status: 200 });
        }),
      },
    );
    await vi.runAllTimersAsync();
    const result = await p;
    expect(calls).toBe(2);
    expect(result.status).toBe("hit");
    expect(result.data?.registered_year).toBe(2025);
  });

  it("makes exactly one request when the first attempt succeeds", async () => {
    let calls = 0;
    const result = await checkDomainAge(
      { domain: "civicsignal.ai", claimedFoundingYear: null },
      {
        ...ctxBase,
        fetchFn: fetchStub(() => {
          calls += 1;
          return new Response(fixture("rdap-example.json"), { status: 200 });
        }),
      },
    );
    expect(calls).toBe(1);
    expect(result.status).toBe("hit");
  });

  it("never retries a 404: the registry answered", async () => {
    let calls = 0;
    const result = await checkDomainAge(
      { domain: "does-not-exist.example", claimedFoundingYear: null },
      {
        ...ctxBase,
        fetchFn: fetchStub(() => {
          calls += 1;
          return new Response('{"title":"Domain not found"}', { status: 404 });
        }),
      },
    );
    expect(calls).toBe(1);
    expect(result.status).toBe("definitive_miss");
  });

  it("skips the retry when the endpoint signal has already aborted", async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    let calls = 0;
    const result = await checkDomainAge(
      { domain: "civicsignal.ai", claimedFoundingYear: null },
      {
        ...ctxBase,
        signal: ctrl.signal,
        fetchFn: fetchStub(() => {
          calls += 1;
          throw new DOMException("aborted", "AbortError");
        }),
      },
    );
    expect(calls).toBe(1);
    expect(result.status).toBe("error");
    expectClean(result);
  });
});

describe("404 discrimination: no-service vs unregistered (the polco.us class)", () => {
  const FIXED_NOW = new Date("2026-09-01T12:00:00.000Z");
  const stub = (status: number, body: string): typeof fetch =>
    (async () => new Response(body, { status })) as typeof fetch;

  it("a TLD with no RDAP service is coverage_limited, never a definitive miss", async () => {
    const check = await checkDomainAge(
      { domain: "polco.us", claimedFoundingYear: null },
      {
        fetchFn: stub(
          404,
          '{"rdapConformance":["rdap_level_0"],"lang":"en","errorCode":404,"title":"No RDAP service is available for this resource"}',
        ),
        now: () => FIXED_NOW,
      },
    );
    expect(check.status).toBe("coverage_limited");
    expect(check.summary).toContain("do not offer a public registration lookup");
    expect(check.data).toMatchObject({ reason: "tld_without_rdap" });
  });

  it("a registry 404 stays a definitive miss", async () => {
    const check = await checkDomainAge(
      { domain: "unregistered-example.com", claimedFoundingYear: null },
      {
        fetchFn: stub(404, '{"errorCode":404,"title":"Domain not found"}'),
        now: () => FIXED_NOW,
      },
    );
    expect(check.status).toBe("definitive_miss");
  });
});
