/*
  Tests for the customer-trace verification rule in report assembly.

  The rule under test: a customer-trace row VERIFIES only when a class 1-2
  citation ties the customer and the vendor together in retrieved content
  (title / cited_text). The customer tie may instead come from the page
  living on the customer's own site, but the vendor tie must always come
  from retrieved content. URL strings alone never verify — a class 1-2 URL
  that merely names the customer in its address becomes an unconfirmed lead
  (COULD_NOT_VERIFY at MEDIUM with the link attached and a manual card).
*/
import { describe, expect, it } from "vitest";
import { assemble, type AssembleInput } from "@shared/assemble.ts";
import type { Citation, PitchExtract } from "@shared/schemas.ts";

const AT = "2026-08-28T00:00:00.000Z";

function cite(
  url: string,
  domain_class: 1 | 2 | 3 | 4,
  title: string | null = null,
  cited_text: string | null = null,
): Citation {
  return { url, title, cited_text, retrieved_at: AT, domain_class };
}

function extractWith(customers: string[]): PitchExtract {
  return {
    vendor_name_candidates: ["Acme AI"],
    domains: ["acmeai.example.com"],
    sender_email: null,
    people: [],
    named_customers: customers,
    claims: customers.map((c, i) => ({
      id: `clm-${i}`,
      type: "customer" as const,
      quote: `${c} uses our platform.`,
      subject: c,
    })),
    use_case_description: "Resident service chatbot for local government.",
    urgency_language: [],
    state_mentioned: null,
    injection_screen: {
      injection_suspected: false,
      addressed_to_ai: false,
      suspicious_spans: [],
    },
  };
}

function input(customers: string[], citations: Citation[]): AssembleInput {
  return {
    extract: extractWith(customers),
    checks: [],
    identity: { identity_resolved: true, identifiers_found: ["co_sos", "edgar_fts"] },
    citations,
    adv_findings: [],
    sector: { pack_ids: [], elevated: false, overlay_reason: null, state_items: [] },
    packs: {},
    resolvable: true,
    research_partial: false,
    generated_at: AT,
  };
}

function customerRows(result: ReturnType<typeof assemble>) {
  return result.ledger.filter((r) => r.methodology_ref === "d2-4");
}

describe("customer-trace verification: grounded rule", () => {
  it("harvested URL-only .gov citation naming the customer becomes a lead, not VERIFIED", () => {
    const out = assemble(
      input(
        ["Franklin County"],
        [cite("https://www.franklincountyohio.gov/agenda/2026-03-acme-ai-pilot.pdf", 1)],
      ),
    );
    const [row] = customerRows(out);
    expect(row.result).toBe("COULD_NOT_VERIFY");
    expect(row.severity).toBe("MEDIUM");
    expect(row.sources).toHaveLength(1);
    expect(row.sources[0].url).toContain("franklincountyohio.gov");
    const leadCard = out.manualChecks.find((m) => m.id === "manual-customer-1");
    expect(leadCard).toBeDefined();
    expect(leadCard?.link).toContain("franklincountyohio.gov");
    expect(out.tierInputs.green_dimensions).not.toContain("D2");
    expect(out.tierInputs.startup_bar_met).toBe(false);
  });

  it("a .gov URL without the customer's tokens stays COULD_NOT_VERIFY at HIGH with no lead", () => {
    const out = assemble(
      input(["Franklin County"], [cite("https://www.usa.gov/some/unrelated/page", 1)]),
    );
    const [row] = customerRows(out);
    expect(row.result).toBe("COULD_NOT_VERIFY");
    expect(row.severity).toBe("HIGH");
    expect(row.sources).toHaveLength(0);
    expect(out.manualChecks.some((m) => m.id.startsWith("manual-customer"))).toBe(false);
  });

  it("class-2 press citation whose title names vendor and customer VERIFIES at T3", () => {
    const out = assemble(
      input(
        ["Franklin County"],
        [
          cite(
            "https://www.govtech.com/story",
            2,
            "Acme AI wins Franklin County contract",
          ),
        ],
      ),
    );
    const [row] = customerRows(out);
    expect(row.result).toBe("VERIFIED");
    expect(row.evidence_tier).toBe("T3");
    expect(out.tierInputs.green_dimensions).toContain("D2");
    expect(out.tierInputs.startup_bar_met).toBe(true);
  });

  it("customer-host citation with cited_text naming the vendor VERIFIES at T1", () => {
    const out = assemble(
      input(
        ["Franklin County"],
        [
          cite(
            "https://franklincountyohio.gov/board/minutes",
            1,
            "Board minutes, March 2026",
            "the board approved a service agreement with Acme AI",
          ),
        ],
      ),
    );
    const [row] = customerRows(out);
    expect(row.result).toBe("VERIFIED");
    expect(row.evidence_tier).toBe("T1");
  });

  it("own-host regression: customer-site page that never names the vendor does NOT verify", () => {
    const out = assemble(
      input(
        ["Franklin County"],
        [
          cite(
            "https://franklincountyohio.gov/parks/schedule",
            1,
            "Parks and recreation schedule",
            "summer hours for county parks",
          ),
        ],
      ),
    );
    const [row] = customerRows(out);
    expect(row.result).toBe("COULD_NOT_VERIFY");
  });

  it("class-3 vendor-controlled citation naming both parties never verifies", () => {
    const out = assemble(
      input(
        ["Franklin County"],
        [
          cite(
            "https://acmeai.example.com/case-studies",
            3,
            "Acme AI and Franklin County case study",
            "Acme AI serves Franklin County",
          ),
        ],
      ),
    );
    const [row] = customerRows(out);
    expect(row.result).toBe("COULD_NOT_VERIFY");
  });

  it("zero verified customers still fires the aggregate D2 finding, noting leads when present", () => {
    const out = assemble(
      input(
        ["Franklin County"],
        [cite("https://www.franklincountyohio.gov/agenda/acme-ai.pdf", 1)],
      ),
    );
    const finding = out.tierInputs.findings.find((f) => f.id === "customers");
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("HIGH");
    expect(finding?.detail).toContain("manual checks");
  });

  it("lead cards cap at two and manual checks stay within the schema cap of eight", () => {
    const customers = ["Franklin County", "Marion County", "Union County"];
    const out = assemble(
      input(customers, [
        cite("https://franklincountyohio.gov/a/acme.pdf", 1),
        cite("https://marioncounty.gov/b/acme.pdf", 1),
        cite("https://unioncounty.gov/c/acme.pdf", 1),
      ]),
    );
    const leads = out.manualChecks.filter((m) => m.id.startsWith("manual-customer"));
    expect(leads).toHaveLength(2);
    expect(out.manualChecks.length).toBeLessThanOrEqual(8);
  });
});

describe("TX-RAMP report assembly (methodology D3.3)", () => {
  const txrampCheck = (status: string, data: Record<string, unknown> | null) => ({
    check_id: "txramp",
    source: "TX-RAMP",
    status: status as "hit" | "definitive_miss",
    summary: "TX-RAMP result summary for tests.",
    evidence_url:
      "https://dir.texas.gov/resource-library-item/tx-ramp-certified-cloud-products",
    confidence: null,
    retrieved_at: AT,
    data,
  });

  it("a listing greens D3 with a green-flag fact", () => {
    const base = input([], []);
    base.checks = [txrampCheck("hit", { matches: [], claimed: true })];
    const out = assemble(base);
    expect(out.tierInputs.green_dimensions).toContain("D3");
    expect(out.greenFlagFacts.some((g) => g.fact.includes("TX-RAMP"))).toBe(true);
  });

  it("claimed-but-absent is a HIGH finding, never a tier-1 trigger, with a gap question", () => {
    const base = input([], []);
    base.checks = [txrampCheck("definitive_miss", { claimed_but_absent: true, lag_caveat: true, rows_scanned: 5 })];
    const out = assemble(base);
    const finding = out.tierInputs.findings.find((f) => f.id === "txramp");
    expect(finding?.severity).toBe("HIGH");
    expect(out.tierInputs.t1_triggers.some((t) => t.check_id === "txramp")).toBe(false);
    expect(out.questions.some((q) => q.id === "gap-txramp")).toBe(true);
  });
});

describe("domain-inference honesty caveat (name-only submissions)", () => {
  it("labels the inferred-domain check with its caveat in the honesty panel", () => {
    const base = input([], []);
    base.checks = [
      {
        check_id: "domain_inference",
        source: "Domain inference from research citations",
        status: "hit",
        summary: "Research citations point to acmeai.com as the vendor's website.",
        evidence_url: "https://acmeai.com",
        confidence: "name_similarity",
        retrieved_at: AT,
        data: { inferred: true, domain: "acmeai.com" },
      },
    ];
    const out = assemble(base);
    const item = out.honesty.find((h) => h.check_id === "domain_inference");
    expect(item?.status).toBe("pass");
    expect(item?.reason).toContain("matched to the vendor's name");
    expect(item?.reason).toContain("only alongside a government registry record");
  });

  it("identity inputs pass through untouched by the inference check", () => {
    const base = input([], []);
    base.identity = { identity_resolved: false, identifiers_found: [] };
    base.checks = [
      {
        check_id: "domain_inference",
        source: "Domain inference from research citations",
        status: "hit",
        summary: "Research citations point to acmeai.com as the vendor's website.",
        evidence_url: "https://acmeai.com",
        confidence: "name_similarity",
        retrieved_at: AT,
        data: { inferred: true, domain: "acmeai.com" },
      },
    ];
    const out = assemble(base);
    expect(out.tierInputs.identity_resolved).toBe(false);
  });
});

describe("unverified leads", () => {
  it("a class-3 retrieved page mentioning the vendor becomes a labeled lead", () => {
    const out = assemble(
      input(
        [],
        [
          cite(
            "https://www.carahsoft.com/acme",
            3,
            "Acme AI | Carahsoft",
            "Acme AI products available through Carahsoft.",
          ),
        ],
      ),
    );
    expect(out.leads).toHaveLength(1);
    expect(out.leads[0].source_class).toBe(3);
    expect(out.leads[0].note).toContain("Read during research");
    expect(out.leads[0].note).toContain("verify independently");
  });

  it("class-4 wires never appear; row-attached URLs are excluded", () => {
    const out = assemble(
      input(
        ["Franklin County"],
        [
          cite("https://www.prnewswire.com/acme-release", 4, "Acme AI announces"),
          /* This one becomes the customer row's lead source, so it must NOT
             duplicate into the leads list. */
          cite("https://www.franklincountyohio.gov/agenda/acme-ai.pdf", 1),
        ],
      ),
    );
    expect(out.leads.filter((l) => l.url.includes("prnewswire"))).toHaveLength(0);
    expect(out.leads.filter((l) => l.url.includes("franklincountyohio"))).toHaveLength(0);
  });

  it("an unopened official page mentioning a customer is a not-opened lead", () => {
    const out = assemble(
      input(
        ["Suisun City"],
        [
          cite("https://www.suisuncity.com/council/agenda-2026", 3),
        ],
      ),
    );
    const lead = out.leads.find((l) => l.url.includes("suisuncity"));
    expect(lead).toBeDefined();
    expect(lead?.note).toContain("not opened");
    expect(lead?.note).toContain("Suisun City");
  });

  it("caps at 8, ordered class-ascending", () => {
    const cites = Array.from({ length: 12 }, (_, i) =>
      cite(`https://site-${i}.example.com/acme-ai-page`, ((i % 3) + 1) as 1 | 2 | 3, `Acme AI page ${i}`),
    );
    const out = assemble(input([], cites));
    expect(out.leads.length).toBeLessThanOrEqual(8);
    const classes = out.leads.map((l) => l.source_class);
    expect([...classes].sort((a, b) => a - b)).toEqual(classes);
  });
});

describe("honesty-panel grouping", () => {
  it("groups by status with card-awareness", () => {
    const base = input([], []);
    base.checks = [
      {
        check_id: "sos_ny",
        source: "New York Department of State (data.ny.gov)",
        status: "definitive_miss",
        summary: "We searched New York's registry and did not find this company.",
        evidence_url: "https://apps.dos.ny.gov/publicInquiry/",
        confidence: null,
        retrieved_at: AT,
        data: null,
      },
      {
        check_id: "edgar_fts",
        source: "SEC EDGAR full-text search",
        status: "error",
        summary: "We could not reach SEC EDGAR, so this check did not run.",
        evidence_url: null,
        confidence: null,
        retrieved_at: AT,
        data: null,
      },
    ];
    const out = assemble(base);
    const byId = Object.fromEntries(out.honesty.map((h) => [h.check_id, h]));
    expect(byId.sos_ny.group).toBe("checked");
    expect(byId.edgar_fts.group).toBe("unavailable");
    expect(byId.planned_linkedin.group).toBe("needs_you");
    expect(byId.planned_soc2.group).toBe("unavailable");
  });

  it("a coverage-limited state WITH a manual card lands in needs_you", () => {
    const base = input([], []);
    base.identity = { identity_resolved: false, identifiers_found: [] };
    base.checks = [
      {
        check_id: "sos_fl",
        source: "Florida Division of Corporations (Sunbiz)",
        status: "coverage_limited",
        summary: "Florida publishes bulk files only; search Sunbiz at the link.",
        evidence_url: "https://search.sunbiz.org/Inquiry/CorporationSearch/ByName",
        confidence: null,
        retrieved_at: AT,
        data: null,
      },
    ];
    const out = assemble(base);
    const fl = out.honesty.find((h) => h.check_id === "sos_fl");
    expect(fl?.group).toBe("needs_you");
    expect(out.manualChecks.some((m) => m.id === "manual-sos")).toBe(true);
  });
});

describe("partial-identity D1 row", () => {
  it("a lone registry hit reframes the row instead of reading as nothing-found", () => {
    const base = input([], []);
    base.identity = { identity_resolved: false, identifiers_found: [] };
    base.checks = [
      {
        check_id: "sos_tx",
        source: "Texas Comptroller Active Franchise Taxpayers (data.texas.gov)",
        status: "hit",
        summary: "Texas business records list GOVRA, INC., registered 2026-06-29.",
        evidence_url: "https://comptroller.texas.gov/taxes/franchise/account-status/search",
        confidence: "exact",
        retrieved_at: AT,
        data: { matches: [{ name: "GOVRA, INC." }] },
      },
      {
        check_id: "sos_ny",
        source: "New York Department of State (data.ny.gov)",
        status: "definitive_miss",
        summary: "We searched New York's registry and did not find this company.",
        evidence_url: "https://apps.dos.ny.gov/publicInquiry/",
        confidence: null,
        retrieved_at: AT,
        data: null,
      },
    ];
    const out = assemble(base);
    const row = out.ledger.find((r) => r.methodology_ref === "d1-1");
    expect(row?.what_checked).toContain("second independent identifier");
    expect(row?.what_checked).toContain("Texas");
    expect(row?.sources[0].title).toContain("Texas");
  });
});
