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

describe("containment metadata on similarity matches (v1.6)", () => {
  it("records the containment direction and the matched query", async () => {
    /* "CloudCourt" is contained in the listed "CloudCourt Inc" — after
       suffix normalization they may match exactly; use a two-token query
       contained in a longer listed name to force a similarity match. */
    const feedWithSubsidiary = {
      meta: { generated: "2026-08-28T06:00:00Z", source: "test" },
      data: {
        Providers: [
          {
            name: "Tyler Technologies Data & Insights",
            designation: "Authorized",
            cso: "Open Data Platform",
            impact_level: "Moderate",
          },
        ],
        Products: [],
      },
    };
    const check = await checkFedramp(
      { companyNames: ["Tyler Technologies"], claimedFedramp: false },
      ctxWith(makeFetch(feedWithSubsidiary)),
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("hit");
    expect(check.confidence).toBe("name_similarity");
    const m = (check.data as { matches: Record<string, unknown>[] }).matches[0];
    expect(m).toMatchObject({
      containment: "query_in_record",
      matched_query: "Tyler Technologies",
    });
  });

  it("records no containment fields on an exact match", async () => {
    const check = await checkFedramp(
      { companyNames: ["CloudCourt, Inc."], claimedFedramp: false },
      ctxWith(makeFetch(feed)),
    );
    expect(check.status).toBe("hit");
    expect(check.confidence).toBe("exact");
    const m = (check.data as { matches: Record<string, unknown>[] }).matches[0];
    expect(m.containment).toBeUndefined();
  });
});

describe("cached-feed fallback", () => {
  it("uses a fresh cached copy when the live fetch fails", async () => {
    const check = await checkFedramp(
      {
        companyNames: ["GovAssist AI"],
        claimedFedramp: false,
        cachedFeed: async () => ({
          payload: feed,
          fetched_at: "2026-08-27T09:17:00.000Z",
        }),
      },
      ctxWith(failingFetch),
    );
    expect(check.status).not.toBe("error");
    expect(check.summary).toContain("saved copy");
    expect(check.summary).toContain("2026-08-27");
  });

  it("falls through to the error check when the cache is stale", async () => {
    const check = await checkFedramp(
      {
        companyNames: ["GovAssist AI"],
        claimedFedramp: false,
        cachedFeed: async () => ({
          payload: feed,
          fetched_at: "2026-08-01T09:17:00.000Z",
        }),
      },
      ctxWith(failingFetch),
    );
    expect(check.status).toBe("error");
  });
});
