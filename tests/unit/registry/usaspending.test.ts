import { describe, expect, it } from "vitest";
import { RegistryCheck } from "../../../supabase/functions/_shared/schemas.ts";
import { lintText } from "../../../supabase/functions/_shared/lint.ts";
import { checkFederalAwards } from "../../../supabase/functions/_shared/registry/usaspending.ts";
import type { RegistryCtx } from "../../../supabase/functions/_shared/registry/sam.ts";
import recipientHit from "../../fixtures/registry-responses/usaspending-recipient-hit.json";
import recipientEmpty from "../../fixtures/registry-responses/usaspending-recipient-empty.json";
import recipientSpv from "../../fixtures/registry-responses/usaspending-recipient-spv.json";
import awards from "../../fixtures/registry-responses/usaspending-awards.json";
import awardsEmpty from "../../fixtures/registry-responses/usaspending-awards-empty.json";
import recipientListing from "../../fixtures/registry-responses/usaspending-recipient-listing.json";
import recipientDetail from "../../fixtures/registry-responses/usaspending-recipient-detail.json";

interface Route {
  match: string;
  body: unknown;
  status?: number;
}

interface Recorded {
  url: string;
  body: string | null;
}

function makeFetch(routes: Route[], requests: Recorded[] = []): typeof fetch {
  return (async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = String(input);
    requests.push({
      url,
      body: typeof init?.body === "string" ? init.body : null,
    });
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

function ctxWith(fetchFn: typeof fetch): RegistryCtx {
  return { fetchFn, now: () => new Date("2026-08-28T12:00:00Z") };
}

describe("checkFederalAwards", () => {
  it("reports awards as a strong green flag on a recipient hit", async () => {
    const requests: Recorded[] = [];
    const check = await checkFederalAwards(
      { companyNames: ["GovAssist AI Inc"] },
      ctxWith(
        makeFetch(
          [
            { match: "autocomplete/recipient", body: recipientHit },
            { match: "spending_by_award", body: awards },
          ],
          requests,
        ),
      ),
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("hit");
    expect(check.confidence).toBe("exact");
    expect(check.evidence_url).toBe(
      "https://www.usaspending.gov/recipient/abc123-def456-R/latest",
    );
    expect(check.data).toMatchObject({
      recipient_found: true,
      award_count: 2,
      total_amount: 1600000.5,
      latest_award_year: 2024,
    });
    expect(check.summary).toMatch(/federal contract award/i);
    /* Five-year window computed from the injected clock. */
    const awardsRequest = requests.find((r) =>
      r.url.includes("spending_by_award"),
    );
    expect(awardsRequest?.body).toContain('"start_date":"2021-08-28"');
    expect(awardsRequest?.body).toContain('"end_date":"2026-08-28"');
  });

  it("still reports a hit when the recipient exists but has no recent awards", async () => {
    const check = await checkFederalAwards(
      { companyNames: ["GovAssist AI Inc"] },
      ctxWith(
        makeFetch([
          { match: "autocomplete/recipient", body: recipientHit },
          { match: "spending_by_award", body: awardsEmpty },
        ]),
      ),
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("hit");
    expect(check.data).toMatchObject({ recipient_found: true, award_count: 0 });
    expect(check.summary).toMatch(/last worked/i);
  });

  it("frames a definitive miss as neutral", async () => {
    const check = await checkFederalAwards(
      { companyNames: ["GovAssist AI"] },
      ctxWith(makeFetch([{ match: "autocomplete/recipient", body: recipientEmpty }])),
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("definitive_miss");
    expect(check.confidence).toBeNull();
    expect(check.data).toMatchObject({ recipient_found: false });
    expect(check.summary).toMatch(/not a red flag/i);
  });

  it("rejects SPV-style recipient names", async () => {
    const check = await checkFederalAwards(
      { companyNames: ["GovAssist AI"] },
      ctxWith(makeFetch([{ match: "autocomplete/recipient", body: recipientSpv }])),
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("definitive_miss");
    expect(check.data?.rejected_investment_vehicles).toContain(
      "GOVASSIST AI FUND LLC",
    );
  });

  it("1.8: reads the recipient's id, UEI, level, and state from the listing and profile; awards stay keyed by name", async () => {
    const requests: Recorded[] = [];
    const check = await checkFederalAwards(
      { companyNames: ["GovAssist AI Inc"] },
      ctxWith(
        makeFetch(
          [
            { match: "autocomplete/recipient", body: recipientHit },
            { match: "/api/v2/recipient/9f9f9f9f-1111-2222-3333-444444444444-P/", body: recipientDetail },
            { match: "/api/v2/recipient/", body: recipientListing },
            { match: "spending_by_award", body: awards },
          ],
          requests,
        ),
      ),
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("hit");
    expect(check.data).toMatchObject({
      recipient_found: true,
      recipient_id: "9f9f9f9f-1111-2222-3333-444444444444-P",
      recipient_uei: "GOVASSIST0001",
      recipient_level: "P",
      recipient_state: "TX",
      award_count: 2,
    });
    /* The parent-level record wins over the child with the same name; the
       similar-named LLC never matches. */
    expect(check.evidence_url).toBe(
      "https://www.usaspending.gov/recipient/9f9f9f9f-1111-2222-3333-444444444444-P/latest",
    );
    const listingRequest = requests.find((r) => r.url === "https://api.usaspending.gov/api/v2/recipient/");
    expect(listingRequest?.body).toContain('"keyword":"GOVASSIST AI INC"');
    const awardsRequest = requests.find((r) => r.url.includes("spending_by_award"));
    expect(awardsRequest?.body).toContain('"recipient_search_text":["GOVASSIST AI INC"]');
    expect(awardsRequest?.body).not.toContain("GOVASSIST0001");
  });

  it("1.8: a listing or profile failure keeps the hit with null recipient facts", async () => {
    const check = await checkFederalAwards(
      { companyNames: ["GovAssist AI Inc"] },
      ctxWith(
        makeFetch([
          { match: "autocomplete/recipient", body: recipientHit },
          { match: "/api/v2/recipient/", body: { detail: "Service unavailable" }, status: 503 },
          { match: "spending_by_award", body: awards },
        ]),
      ),
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("hit");
    expect(check.data).toMatchObject({
      recipient_found: true,
      recipient_uei: null,
      recipient_level: null,
      recipient_state: null,
      award_count: 2,
    });
    /* The autocomplete's own id still drives the profile link. */
    expect(check.evidence_url).toBe("https://www.usaspending.gov/recipient/abc123-def456-R/latest");
  });

  it("returns status error on network failure", async () => {
    const check = await checkFederalAwards(
      { companyNames: ["GovAssist AI"] },
      ctxWith(failingFetch),
    );
    RegistryCheck.parse(check);
    expect(check.status).toBe("error");
    expect(check.summary).toMatch(/could not reach/i);
  });

  it("summaries pass the legal-language lint", async () => {
    const checks = await Promise.all([
      checkFederalAwards(
        { companyNames: ["GovAssist AI Inc"] },
        ctxWith(
          makeFetch([
            { match: "autocomplete/recipient", body: recipientHit },
            { match: "spending_by_award", body: awards },
          ]),
        ),
      ),
      checkFederalAwards(
        { companyNames: ["GovAssist AI"] },
        ctxWith(makeFetch([{ match: "autocomplete/recipient", body: recipientEmpty }])),
      ),
      checkFederalAwards({ companyNames: ["GovAssist AI"] }, ctxWith(failingFetch)),
    ]);
    for (const check of checks) {
      expect(lintText(check.summary)).toEqual([]);
    }
  });
});
