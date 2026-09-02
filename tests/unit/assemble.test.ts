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
import { lintObject } from "@shared/lint.ts";

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
    addresses: [],
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

describe("identity miss row: EDGAR joins the evidence list only when it ran", () => {
  const check = (check_id: string, source: string, status: string) => ({
    check_id,
    source,
    status: status as "definitive_miss",
    summary: `${source} summary for tests.`,
    evidence_url: `https://example.gov/${check_id}`,
    confidence: null,
    retrieved_at: AT,
    data: null,
  });

  const missInput = (checks: ReturnType<typeof check>[]): AssembleInput => {
    const base = input([], []);
    base.identity = { identity_resolved: false, identifiers_found: [] };
    base.checks = checks;
    return base;
  };

  const identityRow = (out: ReturnType<typeof assemble>) =>
    out.ledger.find((r) => r.id === "identity");

  it("a definitive EDGAR miss appears among the row's sources, inside the cap", () => {
    const out = assemble(
      missInput([
        check("sos_ny", "New York Department of State", "definitive_miss"),
        check("sos_tx", "Texas Comptroller", "definitive_miss"),
        check("edgar_fts", "SEC EDGAR full-text search", "definitive_miss"),
      ]),
    );
    const row = identityRow(out);
    expect(row?.result).toBe("COULD_NOT_VERIFY");
    expect(row?.sources.some((s) => /edgar/i.test(s.title ?? ""))).toBe(true);
    expect(row?.sources.length).toBeLessThanOrEqual(8);
  });

  it("an unreachable EDGAR stays out of the sources", () => {
    const out = assemble(
      missInput([
        check("sos_ny", "New York Department of State", "definitive_miss"),
        check("edgar_fts", "SEC EDGAR full-text search", "coverage_limited"),
      ]),
    );
    const row = identityRow(out);
    expect(row?.sources.some((s) => /edgar/i.test(s.title ?? ""))).toBe(false);
  });

  it("the EDGAR honesty item explains its national coverage", () => {
    const out = assemble(
      missInput([check("edgar_fts", "SEC EDGAR full-text search", "definitive_miss")]),
    );
    const item = out.honesty.find((h) => h.check_id === "edgar_fts");
    expect(item?.reason).toContain("national");
  });
});

describe("registry ledger rows (methodology 1.3): every registry check leaves a row", () => {
  const registryCheck = (
    check_id: string,
    source: string,
    status: string,
    data: Record<string, unknown> | null,
  ) => ({
    check_id,
    source,
    status: status as "hit" | "definitive_miss",
    summary: `${source} result summary for tests.`,
    evidence_url: `https://example.gov/${check_id}`,
    confidence: null,
    retrieved_at: AT,
    data,
  });

  const withComplianceClaim = (quote: string): AssembleInput => {
    const base = input([], []);
    base.extract.claims = [{ id: "clm-c0", type: "compliance", quote, subject: null }];
    return base;
  };

  const row = (out: ReturnType<typeof assemble>, id: string) =>
    out.ledger.find((r) => r.id === id);

  it("FedRAMP parity: a hit is a VERIFIED T1 row, a contradiction is a CRITICAL CONTRADICTED row with the trigger", () => {
    const hit = input([], []);
    hit.checks = [registryCheck("fedramp_marketplace", "FedRAMP Marketplace", "hit", { matches: [] })];
    const hitRow = row(assemble(hit), "fedramp_marketplace");
    expect(hitRow?.result).toBe("VERIFIED");
    expect(hitRow?.evidence_tier).toBe("T1");
    expect(hitRow?.severity).toBeNull();

    const miss = withComplianceClaim("We are FedRAMP Authorized at the Moderate level.");
    miss.checks = [registryCheck("fedramp_marketplace", "FedRAMP Marketplace", "definitive_miss", { claimed_but_absent: true })];
    const out = assemble(miss);
    const missRow = row(out, "fedramp_marketplace");
    expect(missRow?.result).toBe("CONTRADICTED");
    expect(missRow?.severity).toBe("CRITICAL");
    expect(missRow?.claim_quote).toContain("FedRAMP");
    expect(out.tierInputs.t1_triggers.some((t) => t.check_id === "fedramp_marketplace")).toBe(true);
  });

  it("GovRAMP contradiction: CONTRADICTED CRITICAL row at d3-2 with the claim quote, plus trigger and finding", () => {
    const base = withComplianceClaim("We are StateRAMP Authorized at the Moderate impact level.");
    base.checks = [registryCheck("govramp", "GovRAMP", "definitive_miss", { claimed_but_absent: true, rows_scanned: 400 })];
    const out = assemble(base);
    const r = row(out, "govramp");
    expect(r?.result).toBe("CONTRADICTED");
    expect(r?.severity).toBe("CRITICAL");
    expect(r?.evidence_tier).toBe("T1");
    expect(r?.methodology_ref).toBe("d3-2");
    expect(r?.claim_quote).toContain("StateRAMP");
    expect(r?.sources[0]?.url).toContain("govramp");
    expect(out.tierInputs.t1_triggers.some((t) => t.check_id === "govramp")).toBe(true);
    expect(out.tierInputs.findings.some((f) => f.id === "govramp")).toBe(true);
  });

  it("GovRAMP hit: VERIFIED T1 row alongside the green flag", () => {
    const base = input([], []);
    base.checks = [registryCheck("govramp", "GovRAMP", "hit", { matches: [], claimed: false })];
    const out = assemble(base);
    const r = row(out, "govramp");
    expect(r?.result).toBe("VERIFIED");
    expect(r?.severity).toBeNull();
    expect(out.tierInputs.green_dimensions).toContain("D3");
    expect(out.greenFlagFacts.some((g) => g.fact.includes("GovRAMP"))).toBe(true);
  });

  it("GovRAMP claimed but uncheckable: COULD_NOT_VERIFY T4 MEDIUM row, no trigger", () => {
    const base = withComplianceClaim("Our platform is GovRAMP certified.");
    base.checks = [registryCheck("govramp", "GovRAMP", "coverage_limited", { reason: "feed_not_loaded" })];
    const out = assemble(base);
    const r = row(out, "govramp");
    expect(r?.result).toBe("COULD_NOT_VERIFY");
    expect(r?.evidence_tier).toBe("T4");
    expect(r?.severity).toBe("MEDIUM");
    expect(out.tierInputs.t1_triggers.some((t) => t.check_id === "govramp")).toBe(false);
  });

  it("TX-RAMP contradiction: CONTRADICTED row stays HIGH, carries the lag caveat, still no trigger", () => {
    const base = withComplianceClaim("TX-RAMP Level 2 certified for Texas agencies.");
    base.checks = [registryCheck("txramp", "TX-RAMP", "definitive_miss", { claimed_but_absent: true, lag_caveat: true })];
    const out = assemble(base);
    const r = row(out, "txramp");
    expect(r?.result).toBe("CONTRADICTED");
    expect(r?.severity).toBe("HIGH");
    expect(r?.methodology_ref).toBe("d3-3");
    expect(r?.what_checked).toContain("lag");
    expect(r?.claim_quote).toContain("TX-RAMP");
    expect(out.tierInputs.t1_triggers.some((t) => t.check_id === "txramp")).toBe(false);
  });

  it("TX-RAMP hit: VERIFIED T1 row; not_applicable leaves no row", () => {
    const hit = input([], []);
    hit.checks = [registryCheck("txramp", "TX-RAMP", "hit", { matches: [], claimed: true })];
    expect(row(assemble(hit), "txramp")?.result).toBe("VERIFIED");

    const na = input([], []);
    na.checks = [registryCheck("txramp", "TX-RAMP", "not_applicable", null)];
    expect(row(assemble(na), "txramp")).toBeUndefined();
  });

  it("Sourcewell hit: VERIFIED row on D2 at d2-2, matching the green dimension", () => {
    const base = input([], []);
    base.checks = [registryCheck("sourcewell", "Sourcewell", "hit", { matches: [] })];
    const out = assemble(base);
    const r = row(out, "sourcewell");
    expect(r?.result).toBe("VERIFIED");
    expect(r?.dimension).toBe("D2");
    expect(r?.methodology_ref).toBe("d2-2");
    expect(out.tierInputs.green_dimensions).toContain("D2");
  });

  it("a GovRAMP contradiction row flips the GovRAMP honesty item to flag", () => {
    const base = withComplianceClaim("We are StateRAMP Authorized.");
    base.checks = [registryCheck("govramp", "GovRAMP", "definitive_miss", { claimed_but_absent: true })];
    const out = assemble(base);
    const item = out.honesty.find((h) => h.label === "GovRAMP");
    expect(item?.status).toBe("flag");
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

  it("caps at 8: dispute headlines first, then class ascending, then URL", () => {
    const cites = Array.from({ length: 12 }, (_, i) =>
      cite(`https://site-${i}.example.com/acme-ai-page`, ((i % 3) + 1) as 1 | 2 | 3, `Acme AI page ${i}`),
    );
    /* Two dispute headlines at the back of the input, one class 3, one class 2. */
    cites.push(cite("https://zz-news.example.org/acme-ai-sued", 3, "Acme AI sued by county over failed rollout"));
    cites.push(cite("https://yy-press.example.org/acme-ai-settlement", 2, "Acme AI reaches settlement with city"));
    const out = assemble(input([], cites));
    expect(out.leads).toHaveLength(8);
    expect(out.leads[0].url).toBe("https://yy-press.example.org/acme-ai-settlement");
    expect(out.leads[0].flag).toBe("adverse_headline");
    expect(out.leads[1].url).toBe("https://zz-news.example.org/acme-ai-sued");
    expect(out.leads[1].flag).toBe("adverse_headline");
    const rest = out.leads.slice(2);
    expect(rest.every((l) => l.flag === undefined)).toBe(true);
    const classes = rest.map((l) => l.source_class);
    expect([...classes].sort((a, b) => a - b)).toEqual(classes);
    /* Within a class, URL order by code point. */
    for (let i = 1; i < rest.length; i++) {
      if (rest[i].source_class === rest[i - 1].source_class) {
        expect(rest[i - 1].url < rest[i].url).toBe(true);
      }
    }
  });

  it("the vendor's own pages never take a lead slot (pitch-stated and discovered domains)", () => {
    const cites = [
      cite("https://acmeai.example.com/customers", 3, "Acme AI customers", "Acme AI serves cities."),
      cite("https://www.acmeai.example.com/about", 3, "About Acme AI", "Acme AI was founded."),
      cite("https://trust.acmeai.example.com/", 3, "Acme AI trust center", "Acme AI security."),
      cite("https://acme-ai.example.net/blog", 3, "Acme AI blog", "Acme AI writes."),
      cite("https://www.carahsoft.com/acme", 3, "Acme AI | Carahsoft", "Acme AI products."),
    ];
    const base = input([], cites);
    /* extract.domains alone: acmeai.example.com and its subdomains excluded. */
    const out1 = assemble(base);
    expect(out1.leads.map((l) => l.url)).toEqual([
      "https://acme-ai.example.net/blog",
      "https://www.carahsoft.com/acme",
    ]);
    /* The tail passes the tie corpus union, which adds a discovered domain. */
    const out2 = assemble({ ...base, vendor_domains: ["acmeai.example.com", "acme-ai.example.net"] });
    expect(out2.leads.map((l) => l.url)).toEqual(["https://www.carahsoft.com/acme"]);
  });

  it("Mark43 shape: retrieved dispute press outranks the vendor's pages and Forbes", () => {
    const cites = [
      cite("https://acmeai.example.com/", 3, "Acme AI", "Acme AI home."),
      cite("https://acmeai.example.com/products", 3, "Products | Acme AI", "Acme AI products."),
      cite("https://acmeai.example.com/company", 3, "Company | Acme AI", "About Acme AI."),
      cite("https://acmeai.example.com/news", 3, "News | Acme AI", "Acme AI news."),
      cite("https://www.forbes.com/profile/acme-ai", 2, "Acme AI founder on the 30 under 30 list", "Acme AI raised."),
      cite("https://www.itnews.example.au/news/police-to-defend-acme-ai-lawsuit", 3, "Police to defend Acme AI lawsuit", "Acme AI sued the force."),
      cite("https://www.themandarin.example.au/acme-ai-contract-terminated", 3, "Acme AI contract terminated after junked upgrade", "The Acme AI contract ended."),
      cite("https://sanantonio.legistar.example.gov/acme-ai-item", 1, "Council item: Acme AI", "Acme AI agreement."),
    ];
    const out = assemble(input([], cites));
    expect(out.leads.map((l) => l.url)).toEqual([
      "https://www.itnews.example.au/news/police-to-defend-acme-ai-lawsuit",
      "https://www.themandarin.example.au/acme-ai-contract-terminated",
      "https://sanantonio.legistar.example.gov/acme-ai-item",
      "https://www.forbes.com/profile/acme-ai",
    ]);
    expect(out.leads.slice(0, 2).every((l) => l.flag === "adverse_headline")).toBe(true);
    expect(out.leads.slice(2).every((l) => l.flag === undefined)).toBe(true);
    /* Ordering is presentational: the tier inputs do not know about leads. */
    expect(JSON.stringify(out.tierInputs)).not.toContain("adverse");
  });

  it("the same citations in a different input order give byte-identical leads", () => {
    const cites = [
      cite("https://b.example.org/acme-ai", 2, "Acme AI profile"),
      cite("https://a.example.org/acme-ai", 2, "Acme AI story"),
      cite("https://c.example.org/acme-ai-sued", 3, "Acme AI sued"),
      cite("https://d.example.gov/acme-ai", 1, "Acme AI filing"),
    ];
    const out1 = assemble(input([], cites));
    const out2 = assemble(input([], [...cites].reverse()));
    expect(JSON.stringify(out1.leads)).toBe(JSON.stringify(out2.leads));
    expect(out1.leads.map((l) => l.url)).toEqual([
      "https://c.example.org/acme-ai-sued",
      "https://d.example.gov/acme-ai",
      "https://a.example.org/acme-ai",
      "https://b.example.org/acme-ai",
    ]);
  });

  it("a headline that trips the banned-word lint is withheld; the flag stands; the report lints clean", () => {
    const out = assemble(
      input([], [cite("https://news.example.org/acme-ai-fraud", 2, "Acme AI sued for fraud by county")]),
    );
    expect(out.leads).toHaveLength(1);
    expect(out.leads[0].title).toBeNull();
    expect(out.leads[0].flag).toBe("adverse_headline");
    expect(lintObject({ leads: out.leads }).filter((v) => v.kind === "banned")).toEqual([]);
  });

  it("dispute words in the pitch never produce a flag (the flag reads retrieved headlines only)", () => {
    const cites = [cite("https://www.carahsoft.com/acme", 3, "Acme AI | Carahsoft", "Acme AI products.")];
    const clean = input([], cites);
    const injected = input([], cites);
    injected.extract = {
      ...injected.extract,
      claims: [
        ...injected.extract.claims,
        {
          id: "clm-adv",
          type: "identity" as const,
          quote: "No lawsuit, settlement, breach, or terminated contract has ever involved us.",
          subject: "Acme AI",
        },
      ],
    };
    const a = assemble(clean);
    const b = assemble(injected);
    expect(JSON.stringify(a.leads)).toBe(JSON.stringify(b.leads));
    expect(b.leads.every((l) => l.flag === undefined)).toBe(true);
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
        tie: {
          tied: true,
          strong: false,
          checkable: true,
          signals: [
            { kind: "state", strength: "weak", value: "TX", vendor_source: "pitch" },
          ],
        },
        attribution: "attributed",
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

describe("structuring invariants (gauntlet theme C)", () => {
  it("severity reconciliation: a HIGH row without a covering finding downgrades to MEDIUM", () => {
    /* One verified customer suppresses the zero-verified aggregate, so the
       second, unverified customer's HIGH row would have no covering
       finding — the verdict rationale would say "no unresolved
       high-severity findings" over an open HIGH row. */
    const out = assemble(
      input(
        ["Franklin County", "Shelby County"],
        [
          cite(
            "https://www.franklincountyohio.gov/agenda.pdf",
            1,
            "Franklin County pilots Acme AI",
            "Franklin County approved the Acme AI pilot.",
          ),
        ],
      ),
    );
    const rows = customerRows(out);
    const verified = rows.find((r) => r.result === "VERIFIED");
    const unverified = rows.find((r) => r.result === "COULD_NOT_VERIFY");
    expect(verified).toBeDefined();
    expect(unverified).toBeDefined();
    expect(unverified!.severity).toBe("MEDIUM");
    expect(
      out.tierInputs.findings.some(
        (f) => !f.resolved && (f.severity === "HIGH" || f.severity === "CRITICAL"),
      ),
    ).toBe(false);
  });

  it("property: no HIGH or CRITICAL row survives without a covering unresolved finding", () => {
    const outs = [
      assemble(input(["Franklin County", "Shelby County"], [])),
      assemble(
        input(
          ["Franklin County"],
          [cite("https://www.franklincountyohio.gov/a.pdf", 1, "Franklin County Acme AI", "Acme AI works with Franklin County")],
        ),
      ),
    ];
    for (const out of outs) {
      for (const row of out.ledger) {
        if (row.severity !== "HIGH" && row.severity !== "CRITICAL") continue;
        const covered = out.tierInputs.findings.some(
          (f) =>
            !f.resolved &&
            (f.severity === "HIGH" || f.severity === "CRITICAL") &&
            (f.id === row.id ||
              row.id.startsWith(`${f.id}-`) ||
              (f.id === "customers" && row.id.startsWith("cust-"))),
        );
        expect(covered, `row ${row.id} has no covering finding`).toBe(true);
      }
    }
  });

  it("source accounting: every class 1-2 citation is attached, a lead, or listed unassessed", () => {
    const citations = [
      /* attaches to the verified customer row */
      cite(
        "https://www.franklincountyohio.gov/agenda.pdf",
        1,
        "Franklin County pilots Acme AI",
        "Franklin County approved the Acme AI pilot.",
      ),
      /* becomes a lead (mentions the vendor, attached nowhere) */
      cite("https://www.ohio.gov/acme-ai-review", 1, "Acme AI review", "Acme AI mentioned."),
      /* mentions no subject: previously silently dropped, now unassessed */
      cite("https://www.ohio.gov/unrelated-budget", 1, "County budget 2026", "The budget passed."),
      /* class 3 never joins the accounting */
      cite("https://vendor-blog.example.com/post", 3, "Blog", "Post."),
    ];
    const out = assemble(input(["Franklin County"], citations));
    const attached = new Set(out.ledger.flatMap((r) => r.sources.map((s) => s.url)));
    const leadUrls = new Set(out.leads.map((l) => l.url));
    const unassessedUrls = new Set(out.unassessedSources.map((s) => s.url));
    for (const c of citations) {
      if (c.domain_class > 2) continue;
      const buckets = [attached.has(c.url), leadUrls.has(c.url), unassessedUrls.has(c.url)];
      expect(buckets.filter(Boolean).length, c.url).toBe(1);
    }
    expect(unassessedUrls.has("https://www.ohio.gov/unrelated-budget")).toBe(true);
  });
});

describe("claim plausibility (D6.1 rider): tier-neutral by construction", () => {
  it("perf rows carry the implication; severities and tier inputs are byte-identical with and without the structured fields", () => {
    const base = input([], []);
    base.extract.claims = [
      {
        id: "clm-p1",
        type: "performance",
        quote: "$17M in annual savings",
        subject: null,
        amount: 17_000_000,
        unit: "dollars",
        period: "annual",
        basis_quote: "about 500 agents",
      },
      {
        id: "clm-p2",
        type: "performance",
        quote: "faster reviews for staff",
        subject: null,
      },
    ];
    const withFields = assemble(base);
    const perfRow = withFields.ledger.find((r) => r.id === "perf-clm-p1");
    expect(perfRow?.implication).toContain("about $34,000 per agent per year");
    const bare = input([], []);
    bare.extract.claims = base.extract.claims.map((c) => ({
      id: c.id,
      type: c.type,
      quote: c.quote,
      subject: c.subject,
    }));
    const withoutFields = assemble(bare);
    /* Tier neutrality: identical findings, triggers, green dimensions, and
       row severities either way. */
    expect(withFields.tierInputs.findings).toEqual(withoutFields.tierInputs.findings);
    expect(withFields.tierInputs.t1_triggers).toEqual(withoutFields.tierInputs.t1_triggers);
    expect(withFields.tierInputs.green_dimensions).toEqual(
      withoutFields.tierInputs.green_dimensions,
    );
    expect(withFields.ledger.map((r) => [r.id, r.severity, r.result])).toEqual(
      withoutFields.ledger.map((r) => [r.id, r.severity, r.result]),
    );
    /* A numberless claim carries no implication. */
    expect(
      withFields.ledger.find((r) => r.id === "perf-clm-p2")?.implication,
    ).toBeUndefined();
  });
});

describe("honesty-panel reasons respect the schema cap", () => {
  it("the crtsh unavailable copy fits, and every reason stays under 300 chars", () => {
    const base = input([], []);
    base.checks = [
      {
        check_id: "crtsh_subdomains",
        source: "Certificate transparency logs (crt.sh)",
        status: "error",
        summary:
          "We could not reach Certificate transparency logs (crt.sh), so this check did not run. That is a connection problem on our side, not information about the vendor.",
        evidence_url: "https://crt.sh/?q=%25.acmeai.example.com",
        confidence: null,
        retrieved_at: AT,
        data: null,
      },
    ];
    const out = assemble(base);
    const crtsh = out.honesty.find((h) => h.check_id === "crtsh_subdomains");
    expect(crtsh?.status).toBe("could_not_check");
    expect(crtsh?.reason).toContain("never relies on it alone");
    for (const h of out.honesty) {
      expect((h.reason ?? "").length, h.check_id).toBeLessThanOrEqual(300);
    }
  });
});
