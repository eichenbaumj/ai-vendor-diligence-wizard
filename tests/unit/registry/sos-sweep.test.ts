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
  detectDissolvedDesignation,
  resolveIdentity,
} from "../../../supabase/functions/_shared/registry/sos-sweep.ts";
import {
  adjudicateChecks,
  buildTieCorpus,
} from "../../../supabase/functions/_shared/identity-ties.ts";
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
  /* Adjudication verdict, stamped as the pipeline's S2c step would. */
  attribution: "attributed",
};

/* Adjudicate a sweep's checks the way the pipeline's S2c step does, with a
   pitch corpus claiming a New York headquarters — the Polimorphic records
   carry NY principal/billing addresses, so the weak state tie attributes
   them. */
function adjudicateAsPipeline(checks: RegistryCheck[]): RegistryCheck[] {
  adjudicateChecks(
    checks,
    buildTieCorpus({
      extract: {
        vendor_name_candidates: ["Polimorphic", "Polimorphic, Inc."],
        domains: [],
        addresses: [],
        sender_email: null,
        people: [],
        named_customers: [],
        claims: [],
        use_case_description: "",
        urgency_language: [],
        state_mentioned: "NY",
        injection_screen: {
          injection_suspected: false,
          addressed_to_ai: false,
          suspicious_spans: [],
        },
      },
      pitchPersonCount: 0,
      pitchAddressCount: 0,
      primaryDomain: null,
      productNames: [],
      citations: [],
    }),
  );
  return checks;
}

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

  it("captures record-side tying-signal facts from the dataset columns", async () => {
    const checks = byId(await runPolimorphicSweep());
    const co = (checks.sos_co.data as { matches: Array<Record<string, unknown>> })
      .matches[0];
    expect(co.street).toBe("122 W 26th St Rm 1104");
    expect(co.city).toBe("New York");
    expect(co.addr_state).toBe("NY");
    expect(co.entity_type).toBe("Foreign Corporation");
    expect(co.jurisdiction).toBe("DE");
    const ct = (checks.sos_ct.data as { matches: Array<Record<string, unknown>> })
      .matches[0];
    expect(ct.city).toBe("New York");
    expect(ct.addr_state).toBe("NY");
    expect(ct.jurisdiction).toBe("DE");
    expect(ct.domestic_flag).toBe("Foreign");
  });

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
    const checks = adjudicateAsPipeline(await runPolimorphicSweep());
    const resolution = resolveIdentity([...checks, fabricatedEdgarHit]);
    expect(resolution.identity_resolved).toBe(true);
    expect(resolution.identifiers_found.length).toBeGreaterThanOrEqual(3);
  });

  it("resolves identity from two state registrations even without EDGAR", async () => {
    const checks = adjudicateAsPipeline(await runPolimorphicSweep());
    const resolution = resolveIdentity(checks);
    expect(resolution.identity_resolved).toBe(true);
  });

  it("unadjudicated hits never mint identity", async () => {
    const checks = await runPolimorphicSweep();
    expect(resolveIdentity(checks).identity_resolved).toBe(false);
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
    /* The token is a Socrata credential: only the data.* dataset requests
       carry it; the NY DOS public-inquiry requests do not. */
    const socrataRequests = requests.filter((r) => /data\./.test(r.url));
    expect(socrataRequests.length).toBeGreaterThan(0);
    for (const r of socrataRequests) {
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

describe("detectDissolvedDesignation: designation classes (the CivicPlus rule)", () => {
  it("dissolution-class words classify as dissolution", () => {
    for (const status of [
      "Voluntarily Dissolved",
      "Dissolution by Proclamation",
      "Revoked",
      "Forfeited existence",
    ]) {
      const d = detectDissolvedDesignation({ legalName: "ACME INC.", status });
      expect(d?.designation_class).toBe("dissolution");
    }
  });

  it("withdrawal-class words classify as withdrawal", () => {
    for (const status of [
      "Inactive: Terminated",
      "Surrender of Authority",
      "Withdrawn",
    ]) {
      const d = detectDissolvedDesignation({ legalName: "ACME INC.", status });
      expect(d?.designation_class).toBe("withdrawal");
    }
  });

  it("when both classes appear, dissolution governs", () => {
    const d = detectDissolvedDesignation({
      legalName: "ACME INC.",
      status: "Dissolved",
      reason: "Termination of existence",
    });
    expect(d?.designation_class).toBe("dissolution");
  });

  it("a bare Inactive or a lapse still arms nothing", () => {
    expect(
      detectDissolvedDesignation({ legalName: "ACME INC.", status: "Inactive" }),
    ).toBeNull();
    expect(
      detectDissolvedDesignation({
        legalName: "ACME INC.",
        status: "Noncompliant",
      }),
    ).toBeNull();
  });

  it("a Socrata lane derives domestic=false from the citizenship flag (terminated foreign registration)", async () => {
    const ctTerminated = [
      {
        business_id: "7777777",
        name: "CIVICSIGNAL INC",
        status: "Terminated",
        business_type: "Stock Corporation",
        citizenship: "Foreign",
        state_of_formation: "DE",
        date_registration: "2015-01-05T00:00:00.000",
        billing_city: "Manchester",
        billing_state: "NH",
      },
    ];
    const checks = byId(
      await checkSosSweep(
        { companyNames: ["CivicSignal Inc"] },
        {
          fetchFn: makeFetch([
            { match: NY, body: sosEmpty },
            { match: CO, body: sosEmpty },
            { match: CT, body: ctTerminated },
            { match: TX, body: sosEmpty },
            { match: OR, body: sosEmpty },
          ]),
          now: NOW,
        },
      ),
    );
    const data = checks.sos_ct.data as {
      dissolved?: { domestic: boolean | null; designation_class?: string };
    };
    expect(data.dissolved).toBeDefined();
    expect(data.dissolved!.designation_class).toBe("withdrawal");
    expect(data.dissolved!.domestic).toBe(false);
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
    attribution: "attributed",
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
    attribution: "attributed",
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
    attribution: "attributed",
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

/* ------------------------------------------------- NY DOS lane (v1.4) */

const NY_DOS_SEARCH = "GetComplexSearchMatchingEntities";
const NY_DOS_DETAIL = "GetEntityRecordByID";

const citymartSearch = {
  requestStatus: "Success",
  resultIndicator: "EntityMatchFound",
  entitySearchResultList: [
    {
      entityName: "CITYMART US INC.",
      dosID: "4628074",
      initialFilingDate: "2014-08-27T00:00:00",
      entityType: "DOMESTIC BUSINESS CORPORATION",
      entityStatus: "Inactive",
      jurisdiction: "New York, United States",
      nameType: "ACTUAL",
    },
  ],
  totalMatchingCount: 1,
};

const citymartDetail = {
  requestStatus: "Success",
  entityGeneralInfo: {
    entityName: "CITYMART US INC.",
    dosID: "4628074",
    entityType: "DOMESTIC BUSINESS CORPORATION",
    entityStatus: "Inactive",
    reasonForStatus: "Voluntarily Dissolved",
    dateOfInitialDosFiling: "2014-08-27T00:00:00",
    inactiveDate: "2022-12-30T00:00:00",
    jurisdiction: "New York, United States",
  },
  /* Field names verified live 2026-08-31 on this record. */
  sopAddress: {
    address: {
      streetAddress1: "C/O EABO, 37TH FL.",
      addressLine2: "405 LEXINGTON AVENUE",
      city: "NEW YORK",
      state: "NY",
      zipCode: "10174",
    },
  },
  ceo: { name: "SASCHA HASELMAYER" },
  registeredAgent: { name: "" },
};

describe("checkSosSweep: NY DOS lane surfaces dissolved entities (the Citymart case)", () => {
  const routes = [
    { match: NY_DOS_SEARCH, body: citymartSearch },
    { match: NY_DOS_DETAIL, body: citymartDetail },
    { match: CO, body: sosEmpty },
    { match: CT, body: sosEmpty },
    { match: TX, body: sosEmpty },
    { match: OR, body: sosEmpty },
  ];

  it("finds the dissolution with reason, date, and the dissolved designation", async () => {
    const checks = byId(
      await checkSosSweep(
        { companyNames: ["Citymart US Inc."] },
        { fetchFn: makeFetch(routes), now: NOW },
      ),
    );
    const ny = checks.sos_ny;
    expect(ny.status).toBe("hit");
    expect(ny.confidence).toBe("exact");
    expect(ny.summary).toContain("CITYMART US INC.");
    expect(ny.summary).toContain("Voluntarily Dissolved");
    expect(ny.summary).toContain("2022-12-30");
    const data = ny.data as {
      dissolved?: { legal_name: string; reason: string | null; domestic: boolean | null };
    };
    expect(data.dissolved).toBeDefined();
    expect(data.dissolved!.reason).toBe("Voluntarily Dissolved");
    expect(data.dissolved!.domestic).toBe(true);
    expect(lintText(ny.summary).filter((v) => v.kind === "banned")).toEqual([]);
  });

  it("captures the detail record's officer, address, and jurisdiction as tie facts", async () => {
    const checks = byId(
      await checkSosSweep(
        { companyNames: ["Citymart US Inc."] },
        { fetchFn: makeFetch(routes), now: NOW },
      ),
    );
    const data = checks.sos_ny.data as {
      matches: Array<Record<string, unknown>>;
    };
    const best = data.matches[0];
    expect(best.officers).toEqual(["SASCHA HASELMAYER"]);
    expect(best.agent).toBeNull(); // empty name in the record stays null
    expect(best.street).toBe("C/O EABO, 37TH FL. 405 LEXINGTON AVENUE");
    expect(best.city).toBe("NEW YORK");
    expect(best.addr_state).toBe("NY");
    expect(best.jurisdiction).toBe("New York, United States");
  });

  it("a similarity match never carries the dissolved designation", async () => {
    const checks = byId(
      await checkSosSweep(
        { companyNames: ["Citymart Solutions Group"] },
        { fetchFn: makeFetch(routes), now: NOW },
      ),
    );
    const ny = checks.sos_ny;
    const data = (ny.data ?? {}) as { dissolved?: unknown };
    expect(data.dissolved).toBeUndefined();
  });

  it("DOS API failure falls back to the active-corps open-data lane", async () => {
    const checks = byId(
      await checkSosSweep(
        { companyNames: ["GovAssist AI"] },
        {
          fetchFn: makeFetch([
            { match: NY_DOS_SEARCH, body: {}, fail: true },
            { match: NY, body: sosEmpty },
            { match: CO, body: sosEmpty },
            { match: CT, body: sosEmpty },
            { match: TX, body: sosEmpty },
            { match: OR, body: sosEmpty },
          ]),
          now: NOW,
        },
      ),
    );
    expect(checks.sos_ny.status).toBe("definitive_miss");
    expect(checks.sos_ny.source).toContain("data.ny.gov");
  });

  it("a DOS miss reports all-statuses coverage", async () => {
    const checks = byId(
      await checkSosSweep(
        { companyNames: ["GovAssist AI"] },
        {
          fetchFn: makeFetch([
            {
              match: NY_DOS_SEARCH,
              body: { requestStatus: "Success", entitySearchResultList: [] },
            },
            { match: NY, body: sosEmpty },
            { match: CO, body: sosEmpty },
            { match: CT, body: sosEmpty },
            { match: TX, body: sosEmpty },
            { match: OR, body: sosEmpty },
          ]),
          now: NOW,
        },
      ),
    );
    expect(checks.sos_ny.status).toBe("definitive_miss");
    expect(checks.sos_ny.summary).toContain("including inactive and dissolved entities");
  });
});

/* --------------------------------- identity: match confidence + fallback */

describe("resolveIdentity: name-similarity hits never mint identity (the 17A case)", () => {
  const similarSos: RegistryCheck = {
    check_id: "sos_ny",
    source: "New York Department of State (public inquiry service)",
    status: "hit",
    summary: "New York business records include an entry under a similar name.",
    evidence_url: "https://apps.dos.ny.gov/publicInquiry/",
    confidence: "name_similarity",
    retrieved_at: "2026-08-28T12:00:00.000Z",
    data: null,
  };
  const exactRdap: RegistryCheck = {
    check_id: "rdap_domain_age",
    source: "Domain registration records (RDAP)",
    status: "hit",
    summary: "The domain group17a.com was registered in 2015.",
    evidence_url: "https://lookup.icann.org/en/lookup?name=group17a.com",
    confidence: "exact",
    retrieved_at: "2026-08-28T12:00:00.000Z",
    data: null,
  };

  it("a similarity SoS hit plus RDAP does not resolve", () => {
    const out = resolveIdentity([similarSos, exactRdap]);
    expect(out.identity_resolved).toBe(false);
  });

  it("the similarity hit contributes no identifier at all", () => {
    const out = resolveIdentity([similarSos]);
    expect(out.identifiers_found).toHaveLength(0);
  });
});

describe("resolveIdentity: RDAP availability fallback (the Govra tier cliff)", () => {
  const exactSos: RegistryCheck = {
    check_id: "sos_tx",
    source: "Texas Comptroller Active Franchise Taxpayers (data.texas.gov)",
    status: "hit",
    summary: "Texas business records include an entry under a matching name.",
    evidence_url: "https://comptroller.texas.gov/",
    confidence: "exact",
    retrieved_at: "2026-08-28T12:00:00.000Z",
    data: null,
    attribution: "attributed",
  };
  const rdapDown: RegistryCheck = {
    check_id: "rdap_domain_age",
    source: "Domain registration records (RDAP)",
    status: "error",
    summary: "We could not reach the domain registration records service.",
    evidence_url: null,
    confidence: null,
    retrieved_at: "2026-08-28T12:00:00.000Z",
    data: null,
  };
  const crtshHit: RegistryCheck = {
    check_id: "crtsh_subdomains",
    source: "Certificate transparency logs (crt.sh)",
    status: "hit",
    summary: "Certificates exist for app.govra.com and api.govra.com.",
    evidence_url: "https://crt.sh/?q=%.govra.com",
    confidence: "exact",
    retrieved_at: "2026-08-28T12:00:00.000Z",
    data: { distinct_subdomains: 4 },
  };
  const dnsMx: RegistryCheck = {
    check_id: "dns_email_hygiene",
    source: "Email security records (DNS)",
    status: "hit",
    summary: "The domain govra.com is set up to receive email.",
    evidence_url: null,
    confidence: "exact",
    retrieved_at: "2026-08-28T12:00:00.000Z",
    data: { has_mx: true },
  };

  it("registry hit + RDAP outage + certificate history resolves", () => {
    const out = resolveIdentity([exactSos, rdapDown, crtshHit]);
    expect(out.identity_resolved).toBe(true);
    expect(out.identifiers_found.join(" ")).toContain("Certificate transparency");
  });

  it("registry hit + RDAP outage + working mail resolves", () => {
    const out = resolveIdentity([exactSos, rdapDown, dnsMx]);
    expect(out.identity_resolved).toBe(true);
    expect(out.identifiers_found.join(" ")).toContain("mail records");
  });

  it("an RDAP definitive miss (unregistered domain) never triggers the fallback", () => {
    const rdapMiss: RegistryCheck = { ...rdapDown, status: "definitive_miss" };
    const out = resolveIdentity([exactSos, rdapMiss, crtshHit]);
    expect(out.identity_resolved).toBe(false);
  });

  it("web infrastructure alone never resolves identity", () => {
    const out = resolveIdentity([rdapDown, crtshHit, dnsMx]);
    expect(out.identity_resolved).toBe(false);
  });

  it("an unconfirmed discovered domain's infrastructure never qualifies", () => {
    const discovered = {
      ...crtshHit,
      data: { distinct_subdomains: 4, discovered_domain: true, confirmed_name_match: false },
    };
    const rdapDownDiscovered = {
      ...rdapDown,
      data: { discovered_domain: true, confirmed_name_match: false },
    };
    const out = resolveIdentity([exactSos, rdapDownDiscovered, discovered]);
    expect(out.identity_resolved).toBe(false);
  });
});

describe("resolveIdentity: fallback preference and the MX-retry predicate", () => {
  it("prefers working mail records over certificate history when both exist", async () => {
    const { needsMxRetry } = await import(
      "../../../supabase/functions/_shared/pipeline-tail.ts"
    );
    const exactSos: RegistryCheck = {
      check_id: "sos_tx",
      source: "Texas Comptroller Active Franchise Taxpayers (data.texas.gov)",
      status: "hit",
      summary: "Texas business records include an entry under a matching name.",
      evidence_url: "https://comptroller.texas.gov/",
      confidence: "exact",
      retrieved_at: "2026-08-28T12:00:00.000Z",
      data: null,
      attribution: "attributed",
    };
    const rdapDown: RegistryCheck = {
      check_id: "rdap_domain_age",
      source: "Domain registration records (RDAP)",
      status: "error",
      summary: "We could not reach the domain registration records service.",
      evidence_url: null,
      confidence: null,
      retrieved_at: "2026-08-28T12:00:00.000Z",
      data: null,
    };
    const crtshHit: RegistryCheck = {
      check_id: "crtsh_subdomains",
      source: "Certificate transparency logs (crt.sh)",
      status: "hit",
      summary: "Certificates exist.",
      evidence_url: "https://crt.sh/?q=%.govra.com",
      confidence: "exact",
      retrieved_at: "2026-08-28T12:00:00.000Z",
      data: { distinct_subdomains: 4 },
    };
    const dnsMx: RegistryCheck = {
      check_id: "dns_email_hygiene",
      source: "Email security records (DNS)",
      status: "hit",
      summary: "The domain is set up to receive email.",
      evidence_url: null,
      confidence: "exact",
      retrieved_at: "2026-08-28T12:00:00.000Z",
      data: { has_mx: true },
    };
    const out = resolveIdentity([exactSos, rdapDown, crtshHit, dnsMx]);
    expect(out.identity_resolved).toBe(true);
    expect(out.identifiers_found.join(" ")).toContain("mail records");

    /* The retry predicate: RDAP down + no dns check -> retry; RDAP down +
       errored dns -> retry; dns already hit -> no retry; RDAP definitive
       miss -> never. */
    expect(needsMxRetry([exactSos, rdapDown])).toBe(true);
    expect(
      needsMxRetry([exactSos, rdapDown, { ...dnsMx, status: "error" }]),
    ).toBe(true);
    expect(needsMxRetry([exactSos, rdapDown, dnsMx])).toBe(false);
    expect(
      needsMxRetry([exactSos, { ...rdapDown, status: "definitive_miss" }]),
    ).toBe(false);
  });
});
