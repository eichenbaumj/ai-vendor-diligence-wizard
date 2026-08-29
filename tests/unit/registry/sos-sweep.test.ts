/*
  The Polimorphic fixture is the load-bearing test in this file: a real,
  funded Delaware C-corp that is INVISIBLE in its HQ state (NY) but
  registered in two customer states (CO "Noncompliant", CT "annual report
  past due") with a Form D on EDGAR. The sweep must resolve identity, must
  not emit a false adverse from any state, and must style the benign
  compliance-lapse statuses as informational.
*/
import { describe, expect, it } from "vitest";
import { RegistryCheck } from "../../../supabase/functions/_shared/schemas.ts";
import { lintText } from "../../../supabase/functions/_shared/lint.ts";
import {
  checkSosSweep,
  resolveIdentity,
} from "../../../supabase/functions/_shared/registry/sos-sweep.ts";
import coPolimorphic from "../../fixtures/registry-responses/sos-co-polimorphic.json";
import ctPolimorphic from "../../fixtures/registry-responses/sos-ct-polimorphic.json";
import nyEmpty from "../../fixtures/registry-responses/sos-ny-empty.json";
import sosEmpty from "../../fixtures/registry-responses/sos-empty.json";
import txAnthropic from "../../fixtures/registry-responses/sos-tx-anthropic.json";
import txSpvOnly from "../../fixtures/registry-responses/sos-tx-spv-only.json";

interface Route {
  match: string;
  body: unknown;
  fail?: boolean;
}

interface Recorded {
  url: string;
  headers: Record<string, string>;
}

function makeFetch(routes: Route[], requests: Recorded[] = []): typeof fetch {
  return (async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = String(input);
    requests.push({
      url,
      headers: (init?.headers as Record<string, string>) ?? {},
    });
    const route = routes.find((r) => url.includes(r.match));
    if (!route) throw new Error(`no canned response for ${url}`);
    if (route.fail) throw new Error("network down");
    return new Response(JSON.stringify(route.body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

const NOW = () => new Date("2026-08-28T12:00:00Z");

/* Dataset ids from the gap report, used to route canned responses. */
const NY = "n9v6-gdp6";
const CO = "4ykn-tg5h";
const CT = "n7gp-d28j";
const TX = "9cir-efmm";
const OR = "tckn-sxa6";

function byId(checks: RegistryCheck[]): Record<string, RegistryCheck> {
  const out: Record<string, RegistryCheck> = {};
  for (const c of checks) out[c.check_id] = c;
  return out;
}

const fabricatedEdgarHit: RegistryCheck = {
  check_id: "edgar_form_d",
  source: "SEC EDGAR full-text search",
  status: "hit",
  summary: "SEC EDGAR shows two Form D filings for Polimorphic, Inc.",
  evidence_url: "https://efts.sec.gov/LATEST/search-index?q=%22Polimorphic%22&forms=D",
  confidence: "exact",
  retrieved_at: "2026-08-28T12:00:00.000Z",
  data: { inc_states: ["DE"], cik: "0001880550" },
};

describe("checkSosSweep: the Polimorphic case", () => {
  async function runPolimorphicSweep(): Promise<RegistryCheck[]> {
    return await checkSosSweep(
      { companyNames: ["Polimorphic", "Polimorphic, Inc."] },
      {
        fetchFn: makeFetch([
          { match: NY, body: nyEmpty },
          { match: CO, body: coPolimorphic },
          { match: CT, body: ctPolimorphic },
          { match: TX, body: sosEmpty },
          { match: OR, body: sosEmpty },
        ]),
        now: NOW,
      },
    );
  }

  it("returns one schema-valid check per state", async () => {
    const checks = await runPolimorphicSweep();
    expect(checks).toHaveLength(6);
    for (const check of checks) RegistryCheck.parse(check);
    expect(checks.map((c) => c.check_id).sort()).toEqual([
      "sos_co",
      "sos_ct",
      "sos_fl",
      "sos_ny",
      "sos_or",
      "sos_tx",
    ]);
  });

  it("finds the customer-state registrations and misses the HQ state without alarm", async () => {
    const checks = byId(await runPolimorphicSweep());
    expect(checks.sos_co.status).toBe("hit");
    expect(checks.sos_co.confidence).toBe("exact");
    expect(checks.sos_ct.status).toBe("hit");
    expect(checks.sos_ny.status).toBe("definitive_miss");
    expect(checks.sos_ny.summary).toMatch(/normal/i);
    expect(checks.sos_ny.summary).toMatch(/not a red flag/i);
    /* Florida has no live query lane: always coverage_limited with the
       official search link. */
    expect(checks.sos_fl.status).toBe("coverage_limited");
    expect(checks.sos_fl.evidence_url).toContain("sunbiz.org");
  });

  it("never emits an adverse status from any state", async () => {
    const checks = await runPolimorphicSweep();
    for (const check of checks) {
      expect(["hit", "definitive_miss", "coverage_limited"]).toContain(
        check.status,
      );
    }
  });

  it("styles the Noncompliant status as informational, not alarming", async () => {
    const checks = byId(await runPolimorphicSweep());
    expect(checks.sos_co.summary).toMatch(/Noncompliant/);
    expect(checks.sos_co.summary).toMatch(/late annual report/i);
    expect(checks.sos_co.summary).toMatch(/informational/i);
    expect(checks.sos_ct.summary).toMatch(/past due/i);
    expect(checks.sos_ct.summary).toMatch(/informational/i);
  });

  it("resolves identity from customer-state hits plus an EDGAR Form D", async () => {
    const checks = await runPolimorphicSweep();
    const resolution = resolveIdentity([...checks, fabricatedEdgarHit]);
    expect(resolution.identity_resolved).toBe(true);
    expect(resolution.identifiers_found.length).toBeGreaterThanOrEqual(3);
  });

  it("resolves identity from two state registrations even without EDGAR", async () => {
    const checks = await runPolimorphicSweep();
    const resolution = resolveIdentity(checks);
    expect(resolution.identity_resolved).toBe(true);
  });

  it("all summaries pass the legal-language lint", async () => {
    const checks = await runPolimorphicSweep();
    for (const check of checks) {
      expect(lintText(check.summary)).toEqual([]);
    }
  });
});

describe("checkSosSweep: SPV rejection (the Texas Anthropic case)", () => {
  it("matches the real entity and rejects the investment SPVs", async () => {
    const checks = byId(
      await checkSosSweep(
        { companyNames: ["Anthropic"] },
        {
          fetchFn: makeFetch([
            { match: NY, body: sosEmpty },
            { match: CO, body: sosEmpty },
            { match: CT, body: sosEmpty },
            { match: TX, body: txAnthropic },
            { match: OR, body: sosEmpty },
          ]),
          now: NOW,
        },
      ),
    );
    expect(checks.sos_tx.status).toBe("hit");
    expect(checks.sos_tx.confidence).toBe("exact");
    expect(checks.sos_tx.summary).toMatch(/ANTHROPIC, PBC/);
    expect(checks.sos_tx.summary).not.toMatch(/AUGMENT COLLECTIVE/);
    expect(checks.sos_tx.data?.rejected_investment_vehicles).toContain(
      "AUGMENT COLLECTIVE, LLC SERIES ANTHROPIC PBC N",
    );
  });

  it("reports a definitive miss when only SPVs match the name", async () => {
    const checks = byId(
      await checkSosSweep(
        { companyNames: ["Anthropic"] },
        {
          fetchFn: makeFetch([
            { match: NY, body: sosEmpty },
            { match: CO, body: sosEmpty },
            { match: CT, body: sosEmpty },
            { match: TX, body: txSpvOnly },
            { match: OR, body: sosEmpty },
          ]),
          now: NOW,
        },
      ),
    );
    expect(checks.sos_tx.status).toBe("definitive_miss");
    const rejected = checks.sos_tx.data?.rejected_investment_vehicles;
    expect(Array.isArray(rejected)).toBe(true);
    expect((rejected as string[]).length).toBeGreaterThan(0);
  });
});

describe("checkSosSweep: mechanics", () => {
  it("falls back to the $where query when $q returns nothing", async () => {
    const requests: Recorded[] = [];
    const whereRow = [{ current_entity_name: "GOVASSIST AI, INC.", dos_id: "999" }];
    const checks = byId(
      await checkSosSweep(
        { companyNames: ["GovAssist AI"] },
        {
          fetchFn: (async (
            input: RequestInfo | URL,
            init?: RequestInit,
          ): Promise<Response> => {
            const url = String(input);
            requests.push({
              url,
              headers: (init?.headers as Record<string, string>) ?? {},
            });
            const body =
              url.includes(NY) && url.includes("$where=") ? whereRow : [];
            return new Response(JSON.stringify(body), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          }) as typeof fetch,
          now: NOW,
        },
      ),
    );
    expect(checks.sos_ny.status).toBe("hit");
    expect(
      requests.filter((r) => r.url.includes(NY)).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("sends the Socrata app token as X-App-Token when configured", async () => {
    const requests: Recorded[] = [];
    await checkSosSweep(
      { companyNames: ["GovAssist AI"] },
      {
        fetchFn: makeFetch(
          [
            { match: NY, body: sosEmpty },
            { match: CO, body: sosEmpty },
            { match: CT, body: sosEmpty },
            { match: TX, body: sosEmpty },
            { match: OR, body: sosEmpty },
          ],
          requests,
        ),
        apiKeys: { socrata: "test-token" },
        now: NOW,
      },
    );
    expect(requests.length).toBeGreaterThan(0);
    for (const r of requests) {
      expect(r.headers["X-App-Token"]).toBe("test-token");
    }
  });

  it("a network failure in one state becomes status error and never sinks the others", async () => {
    const checks = byId(
      await checkSosSweep(
        { companyNames: ["Polimorphic"] },
        {
          fetchFn: makeFetch([
            { match: NY, body: nyEmpty },
            { match: CO, body: [], fail: true },
            { match: CT, body: ctPolimorphic },
            { match: TX, body: sosEmpty },
            { match: OR, body: sosEmpty },
          ]),
          now: NOW,
        },
      ),
    );
    expect(checks.sos_co.status).toBe("error");
    expect(checks.sos_co.summary).toMatch(/could not reach/i);
    expect(checks.sos_ct.status).toBe("hit");
    expect(checks.sos_ny.status).toBe("definitive_miss");
  });
});

describe("resolveIdentity", () => {
  const sosHit: RegistryCheck = {
    check_id: "sos_co",
    source: "Colorado Secretary of State (data.colorado.gov)",
    status: "hit",
    summary: "Colorado business records list Polimorphic, Inc.",
    evidence_url: "https://www.coloradosos.gov/biz/BusinessEntityCriteriaExt.do",
    confidence: "exact",
    retrieved_at: "2026-08-28T12:00:00.000Z",
    data: null,
  };
  const rdapHit: RegistryCheck = {
    check_id: "rdap_domain",
    source: "Domain registration (RDAP)",
    status: "hit",
    summary: "The domain polimorphic.com was registered in 2021.",
    evidence_url: "https://client.rdap.org/?type=domain&object=polimorphic.com",
    confidence: "exact",
    retrieved_at: "2026-08-28T12:00:00.000Z",
    data: null,
  };
  const samEntityHit: RegistryCheck = {
    check_id: "sam_entity",
    source: "SAM.gov Entity Management",
    status: "hit",
    summary: "SAM.gov shows a federal contractor registration.",
    evidence_url: "https://sam.gov/entity/ABC123DEF456",
    confidence: "exact",
    retrieved_at: "2026-08-28T12:00:00.000Z",
    data: null,
  };
  const exclusionsHit: RegistryCheck = {
    ...samEntityHit,
    check_id: "sam_exclusions",
    source: "SAM.gov Exclusions",
  };

  it("one identifier alone does not resolve identity", () => {
    expect(resolveIdentity([sosHit]).identity_resolved).toBe(false);
    expect(resolveIdentity([rdapHit]).identity_resolved).toBe(false);
  });

  it("an SoS hit plus a domain registration resolves", () => {
    const r = resolveIdentity([sosHit, rdapHit]);
    expect(r.identity_resolved).toBe(true);
    expect(r.identifiers_found).toHaveLength(2);
  });

  it("an EDGAR filing plus an SoS hit resolves", () => {
    expect(
      resolveIdentity([sosHit, fabricatedEdgarHit]).identity_resolved,
    ).toBe(true);
  });

  it("a SAM entity registration plus anything resolves", () => {
    expect(resolveIdentity([samEntityHit, rdapHit]).identity_resolved).toBe(
      true,
    );
  });

  it("exclusion-list matches are never identity evidence", () => {
    expect(resolveIdentity([sosHit, exclusionsHit]).identity_resolved).toBe(
      false,
    );
  });

  it("misses and coverage limits contribute nothing, adverse or otherwise", () => {
    const miss: RegistryCheck = {
      ...sosHit,
      check_id: "sos_ny",
      status: "definitive_miss",
      confidence: null,
    };
    const limited: RegistryCheck = {
      ...sosHit,
      check_id: "sos_fl",
      status: "coverage_limited",
      confidence: null,
    };
    const r = resolveIdentity([miss, limited, sosHit]);
    expect(r.identity_resolved).toBe(false);
    expect(r.identifiers_found).toHaveLength(1);
  });
});

/* The Govra fixture carries both the real company (GOVRA, INC.) and the
   trap: an unrelated company named exactly after the product (TRUETAX INC).
   The split candidates must find the first and the product-token guard must
   reject the second. */
const { splitNameCandidates } = await import("@shared/text-match.ts");
const { productOnlyTokens } = await import(
  "../../../supabase/functions/_shared/registry/sam.ts"
);
const govraFixture = (await import("../../fixtures/registry-responses/sos-tx-govra.json"))
  .default;

describe("checkSosSweep: compound-name splitting (the Govra case)", () => {

  async function runGovraSweep() {
    const split = splitNameCandidates(["TrueTax by Govra"]);
    return await checkSosSweep(
      {
        companyNames: split.identityNames,
        productTokens: productOnlyTokens(split.productNames, split.anchorNames),
      },
      {
        fetchFn: makeFetch([
          { match: NY, body: sosEmpty },
          { match: CO, body: sosEmpty },
          { match: CT, body: sosEmpty },
          { match: TX, body: govraFixture },
          { match: OR, body: sosEmpty },
        ]),
        now: NOW,
      },
    );
  }

  it("finds GOVRA, INC. via the split company candidate", async () => {
    const checks = byId(await runGovraSweep());
    expect(checks.sos_tx.status).toBe("hit");
    expect(checks.sos_tx.summary).toContain("GOVRA, INC.");
    const data = checks.sos_tx.data as { matches: { name: string }[] };
    expect(data.matches.some((m) => m.name === "GOVRA, INC.")).toBe(true);
  });

  it("never accepts the unrelated product-namesake TRUETAX INC", async () => {
    const checks = byId(await runGovraSweep());
    const data = checks.sos_tx.data as {
      matches: { name: string }[];
      rejected_product_only: string[];
    };
    expect(data.matches.some((m) => m.name === "TRUETAX INC")).toBe(false);
    expect(data.rejected_product_only).toContain("TRUETAX INC");
  });
});

describe("resolveIdentity: discovered-domain provenance", () => {
  const sosHit: RegistryCheck = {
    check_id: "sos_tx",
    source: "Texas Comptroller Active Franchise Taxpayers (data.texas.gov)",
    status: "hit",
    summary: "Texas business records list GOVRA, INC.",
    evidence_url: "https://comptroller.texas.gov/taxes/franchise/account-status/search",
    confidence: "exact",
    retrieved_at: "2026-08-28T12:00:00.000Z",
    data: { matches: [{ name: "GOVRA, INC." }] },
  };
  const rdapOf = (data: Record<string, unknown> | null): RegistryCheck => ({
    check_id: "rdap_domain_age",
    source: "Domain registration records (RDAP)",
    status: "hit",
    summary: "The domain was registered in 2024.",
    evidence_url: "https://rdap.org/domain/govra.com",
    confidence: "exact",
    retrieved_at: "2026-08-28T12:00:00.000Z",
    data,
  });

  it("a confirmed discovered domain counts only as the SECOND identifier", () => {
    const r = resolveIdentity([
      sosHit,
      rdapOf({ discovered_domain: true, confirmed_name_match: true }),
    ]);
    expect(r.identity_resolved).toBe(true);
    expect(r.identifiers_found).toHaveLength(2);
    expect(r.identifiers_found[1]).toContain("matched to the vendor's name");
  });

  it("a confirmed discovered domain ALONE never resolves identity", () => {
    const r = resolveIdentity([
      rdapOf({ discovered_domain: true, confirmed_name_match: true }),
    ]);
    expect(r.identity_resolved).toBe(false);
    expect(r.identifiers_found).toHaveLength(0);
  });

  it("an unconfirmed discovered domain never counts at all", () => {
    const r = resolveIdentity([
      sosHit,
      rdapOf({ discovered_domain: true, confirmed_name_match: false }),
    ]);
    expect(r.identity_resolved).toBe(false);
    expect(r.identifiers_found).toHaveLength(1);
  });

  it("a pitch-stated domain keeps its full identifier standing (unchanged)", () => {
    const r = resolveIdentity([sosHit, rdapOf({ contradiction: false })]);
    expect(r.identity_resolved).toBe(true);
  });
});
