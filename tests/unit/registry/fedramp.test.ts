import { describe, expect, it } from "vitest";
import { RegistryCheck } from "../../../supabase/functions/_shared/schemas.ts";
import { lintText } from "../../../supabase/functions/_shared/lint.ts";
import { checkFedramp } from "../../../supabase/functions/_shared/registry/fedramp.ts";
import type { RegistryCtx } from "../../../supabase/functions/_shared/registry/sam.ts";
import feed from "../../fixtures/registry-responses/fedramp-data.json";

function makeFetch(body: unknown): typeof fetch {
  return (async (): Promise<Response> =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;
}

const failingFetch = (async () => {
  throw new Error("network down");
}) as unknown as typeof fetch;

function ctxWith(fetchFn: typeof fetch): RegistryCtx {
  return { fetchFn, now: () => new Date("2026-08-28T12:00:00Z") };
}

describe("checkFedramp", () => {
  it("finds a listed provider with exact confidence", async () => {
    const check = await checkFedramp(
      { companyNames: ["CloudCourt, Inc."], claimedFedramp: true },
      ctxWith(makeFetch(feed)),
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("hit");
    expect(check.confidence).toBe("exact");
    expect(check.summary).toMatch(/CloudCourt/);
    expect(check.summary).toMatch(/Authorized/);
  });

  it("also finds providers listed under product containers", async () => {
    const check = await checkFedramp(
      { companyNames: ["Acme Federal Cloud"], claimedFedramp: false },
      ctxWith(makeFetch(feed)),
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("hit");
    expect(check.summary).toMatch(/Acme Federal Cloud/);
  });

  it("treats claimed-but-absent as a registry contradiction", async () => {
    const check = await checkFedramp(
      { companyNames: ["Phantom Federal AI"], claimedFedramp: true },
      ctxWith(makeFetch(feed)),
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("definitive_miss");
    expect(check.data).toMatchObject({ claimed_but_absent: true });
    expect(check.summary).toMatch(/FedRAMP package ID/i);
    /* Absence framing, never an accusation. */
    expect(check.summary).toMatch(/does not list/i);
  });

  it("treats unclaimed absence as neutral", async () => {
    const check = await checkFedramp(
      { companyNames: ["Phantom Federal AI"], claimedFedramp: false },
      ctxWith(makeFetch(feed)),
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("definitive_miss");
    expect(check.data).toMatchObject({ claimed_but_absent: false });
    expect(check.summary).toMatch(/neutral/i);
  });

  it("returns status error when the feed is unreachable", async () => {
    const check = await checkFedramp(
      { companyNames: ["CloudCourt"], claimedFedramp: true },
      ctxWith(failingFetch),
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("error");
    expect(check.summary).toMatch(/could not reach/i);
  });

  it("summaries pass the legal-language lint", async () => {
    const checks = await Promise.all([
      checkFedramp(
        { companyNames: ["CloudCourt"], claimedFedramp: true },
        ctxWith(makeFetch(feed)),
      ),
      checkFedramp(
        { companyNames: ["Phantom Federal AI"], claimedFedramp: true },
        ctxWith(makeFetch(feed)),
      ),
      checkFedramp(
        { companyNames: ["Phantom Federal AI"], claimedFedramp: false },
        ctxWith(makeFetch(feed)),
      ),
      checkFedramp(
        { companyNames: ["CloudCourt"], claimedFedramp: true },
        ctxWith(failingFetch),
      ),
    ]);
    for (const check of checks) {
      expect(lintText(check.summary)).toEqual([]);
    }
  });
});
