/*
  Tying signals (identity-ties.ts): the attribution rule the five live
  defect entries hang on. The named cases here mirror the QA panel:
  - Zencity: containment match + a checkable tie must attribute the record.
  - Zipsec: an Oregon namesake with no tie stays a candidate.
  - Polco: a New York namesake dissolution with no strong tie must not arm.
  - Citymart: the true dissolution ties via the record's own CEO name in
    class 1-2 coverage, and via the full legal name when the buyer typed it.
  - Seventeen-a: sub-4-char brands never earn full_legal_name from a bare
    brand, and state alone stays weak.
  Plus the security invariant: ties are monotone-add — vendor text can only
  ADD signals, never remove one (an attacker denying a tie changes nothing).
*/
import { describe, expect, it } from "vitest";
import type {
  Citation,
  PitchExtract,
  RegistryCheck,
} from "../../../supabase/functions/_shared/schemas.ts";
import {
  AGE_VETO_YEARS,
  adjudicateChecks,
  attributionFor,
  attributionTrace,
  buildTieCorpus,
  computeTies,
  discoverBridgeNames,
  domainRegistrationYear,
  domainRootCoversName,
  domainRootOf,
  exactLiveKeys,
  isDegenerateBrandName,
  stateCodeOf,
  streetFragment,
  tieFactsForCheck,
  type RecordTieFacts,
  type VendorTieCorpus,
} from "../../../supabase/functions/_shared/identity-ties.ts";

function extractWith(overrides: Partial<PitchExtract>): PitchExtract {
  return {
    vendor_name_candidates: ["Acme AI"],
    domains: [],
    addresses: [],
    sender_email: null,
    people: [],
    named_customers: [],
    claims: [],
    use_case_description: "",
    urgency_language: [],
    state_mentioned: null,
    injection_screen: {
      injection_suspected: false,
      addressed_to_ai: false,
      suspicious_spans: [],
    },
    ...overrides,
  };
}

function cite(overrides: Partial<Citation>): Citation {
  return {
    url: "https://example.gov/page",
    title: null,
    cited_text: null,
    retrieved_at: "2026-08-31T12:00:00.000Z",
    domain_class: 2,
    ...overrides,
  };
}

function corpusWith(args: {
  extract?: Partial<PitchExtract>;
  pitchPersonCount?: number;
  pitchAddressCount?: number;
  primaryDomain?: string | null;
  productNames?: string[];
  citations?: Citation[];
  submittedDomain?: string | null;
  foundingYear?: number | null;
  domainYear?: number | null;
}): VendorTieCorpus {
  const extract = extractWith(args.extract ?? {});
  return buildTieCorpus({
    extract,
    pitchPersonCount: args.pitchPersonCount ?? extract.people.length,
    pitchAddressCount: args.pitchAddressCount ?? extract.addresses.length,
    primaryDomain: args.primaryDomain ?? null,
    productNames: args.productNames ?? [],
    citations: args.citations ?? [],
    submittedDomain: args.submittedDomain ?? null,
    foundingYear: args.foundingYear ?? null,
    domainYear: args.domainYear ?? null,
  });
}

const EMPTY_CORPUS = corpusWith({
  extract: { vendor_name_candidates: [] },
});

describe("state and street helpers", () => {
  it("stateCodeOf accepts codes, names, and jurisdiction strings", () => {
    expect(stateCodeOf("NY")).toBe("NY");
    expect(stateCodeOf("New York")).toBe("NY");
    expect(stateCodeOf("New York, United States")).toBe("NY");
    expect(stateCodeOf("Delaware")).toBe("DE");
    expect(stateCodeOf("DE")).toBe("DE");
    expect(stateCodeOf("ZZ")).toBeNull();
    expect(stateCodeOf(null)).toBeNull();
    expect(stateCodeOf("United States")).toBeNull();
  });

  it("streetFragment finds the digit-bearing line and skips digitless text", () => {
    expect(streetFragment("C/O EABO, 37TH FL. 405 LEXINGTON AVENUE")).toBe(
      "405 LEXINGTON AVENUE",
    );
    expect(streetFragment("122 W 26th St Rm 1104")).toBe("122 W 26TH ST");
    expect(streetFragment("Suite floor lobby")).toBeNull();
  });
});

describe("computeTies: strong ties", () => {
  it("officer tie from pitch people (strong)", () => {
    const corpus = corpusWith({
      extract: { people: [{ name: "Sascha Haselmayer", title: "CEO" }] },
    });
    const tie = computeTies(
      { legal_name: "CITYMART US INC.", officers: ["SASCHA HASELMAYER"] },
      corpus,
    );
    expect(tie.tied).toBe(true);
    expect(tie.strong).toBe(true);
    expect(tie.signals[0]).toMatchObject({
      kind: "officer",
      strength: "strong",
      vendor_source: "pitch",
    });
  });

  it("officer tie from class 1-2 coverage (the Citymart shape)", () => {
    const corpus = corpusWith({
      citations: [
        cite({
          title: "Citymart founder Sascha Haselmayer on procurement innovation",
          domain_class: 2,
        }),
      ],
    });
    const tie = computeTies(
      { legal_name: "CITYMART US INC.", officers: ["SASCHA HASELMAYER"] },
      corpus,
    );
    expect(tie.strong).toBe(true);
    expect(tie.signals[0]).toMatchObject({
      kind: "officer",
      vendor_source: "coverage",
    });
  });

  it("a class 3 citation never supplies an officer tie", () => {
    const corpus = corpusWith({
      citations: [
        cite({
          title: "Citymart founder Sascha Haselmayer on procurement innovation",
          domain_class: 3,
        }),
      ],
    });
    const tie = computeTies(
      { legal_name: "CITYMART US INC.", officers: ["SASCHA HASELMAYER"] },
      corpus,
    );
    expect(tie.tied).toBe(false);
  });

  it("a single-token officer name never ties from coverage", () => {
    const corpus = corpusWith({
      citations: [cite({ title: "Madison city hall procurement", domain_class: 2 })],
    });
    const tie = computeTies(
      { legal_name: "ACME INC.", officers: ["Madison"] },
      corpus,
    );
    expect(tie.tied).toBe(false);
  });

  it("street-fragment address tie from an extracted vendor address (strong)", () => {
    const corpus = corpusWith({
      extract: { addresses: ["405 Lexington Avenue, New York, NY 10174"] },
    });
    const tie = computeTies(
      {
        legal_name: "CITYMART US INC.",
        street: "C/O EABO, 37TH FL. 405 LEXINGTON AVENUE",
      },
      corpus,
    );
    expect(tie.strong).toBe(true);
    expect(tie.signals[0]).toMatchObject({ kind: "address", strength: "strong" });
  });

  it("city+state address tie comes only from structured addresses, never free text", () => {
    const structured = computeTies(
      { legal_name: "ACME INC.", city: "Austin", addr_state: "TX" },
      corpusWith({ extract: { addresses: ["500 Congress Ave, Austin, TX 78701"] } }),
    );
    expect(structured.strong).toBe(true);
    const freeText = computeTies(
      { legal_name: "ACME INC.", city: "Austin", addr_state: "TX" },
      corpusWith({
        citations: [cite({ cited_text: "the Austin TX vendor", domain_class: 2 })],
      }),
    );
    expect(freeText.tied).toBe(false);
  });

  it("domain tie from a pitch-stated domain (strong)", () => {
    const tie = computeTies(
      { legal_name: "ZIP SECURITY INC.", domain: "www.zipsec.com" },
      corpusWith({ extract: { domains: ["zipsec.com"] } }),
    );
    expect(tie.strong).toBe(true);
    expect(tie.signals[0]).toMatchObject({ kind: "domain", value: "zipsec.com" });
  });

  it("feed product metadata tie (strong)", () => {
    const tie = computeTies(
      { legal_name: "GOVRA, INC.", product: "TrueTax" },
      corpusWith({ productNames: ["TrueTax"] }),
    );
    expect(tie.strong).toBe(true);
    expect(tie.signals[0]).toMatchObject({ kind: "feed_product" });
  });

  it("full legal name tie: the buyer typed the record's complete legal name", () => {
    const tie = computeTies(
      { legal_name: "CITYMART US INC." },
      corpusWith({ extract: { vendor_name_candidates: ["Citymart US Inc."] } }),
    );
    expect(tie.strong).toBe(true);
    expect(tie.signals[0]).toMatchObject({
      kind: "full_legal_name",
      vendor_source: "submitted_name",
    });
  });

  it("full legal name never fires from a bare brand or a suffixless record", () => {
    const brandOnly = computeTies(
      { legal_name: "POLCO INC." },
      corpusWith({ extract: { vendor_name_candidates: ["Polco"] } }),
    );
    expect(brandOnly.signals.some((s) => s.kind === "full_legal_name")).toBe(false);
    const noSuffix = computeTies(
      { legal_name: "POLCO" },
      corpusWith({ extract: { vendor_name_candidates: ["Polco"] } }),
    );
    expect(noSuffix.signals.some((s) => s.kind === "full_legal_name")).toBe(false);
  });
});

describe("computeTies: weak state tie and the defect-entry shapes", () => {
  it("state match is weak, never strong (the adverse gate reads strength)", () => {
    const tie = computeTies(
      { legal_name: "ACME INC.", registration_state: "TX" },
      corpusWith({ extract: { state_mentioned: "TX" } }),
    );
    expect(tie.tied).toBe(true);
    expect(tie.strong).toBe(false);
    expect(tie.signals[0]).toMatchObject({ kind: "state", strength: "weak" });
  });

  it("jurisdiction (formation state) also earns the weak state tie", () => {
    const tie = computeTies(
      { legal_name: "POLIMORPHIC, INC.", jurisdiction: "DE" },
      corpusWith({ extract: { addresses: ["100 Main St, Wilmington, DE 19801"] } }),
    );
    expect(tie.tied).toBe(true);
    expect(tie.strong).toBe(false);
  });

  it("the Zipsec shape: an out-of-state namesake with no shared fact stays untied", () => {
    const tie = computeTies(
      {
        legal_name: "ZIP, LLC",
        registration_state: "OR",
        city: "Portland",
        addr_state: "OR",
      },
      corpusWith({
        extract: {
          vendor_name_candidates: ["Zip Security"],
          domains: ["zipsec.com"],
          state_mentioned: "NY",
          people: [{ name: "Josh Zweig", title: "CEO" }],
        },
      }),
    );
    expect(tie.tied).toBe(false);
    expect(tie.checkable).toBe(true);
  });

  it("the Polco shape: a namesake in a DIFFERENT state stays untied", () => {
    const tie = computeTies(
      { legal_name: "POLCO INC.", registration_state: "NY" },
      corpusWith({
        extract: { vendor_name_candidates: ["Polco"], state_mentioned: "WI" },
      }),
    );
    expect(tie.tied).toBe(false);
  });

  it("the Zencity shape: containment record ties through a claimed state", () => {
    const tie = computeTies(
      { legal_name: "ZENCITY TECHNOLOGIES US, INC.", registration_state: "NY" },
      corpusWith({
        extract: { vendor_name_candidates: ["Zencity"], state_mentioned: "NY" },
      }),
    );
    expect(tie.tied).toBe(true);
    expect(tie.strong).toBe(false); // favorable-only under the strength policy
  });
});

describe("computeTies: fairness guard and monotone-add invariant", () => {
  it("an empty corpus is not checkable and ties nothing", () => {
    const tie = computeTies(
      { legal_name: "ACME INC.", registration_state: "NY" },
      EMPTY_CORPUS,
    );
    expect(tie.checkable).toBe(false);
    expect(tie.tied).toBe(false);
    expect(tie.signals).toEqual([]);
  });

  it("adding vendor-side facts never removes a signal (monotone-add)", () => {
    const record: RecordTieFacts = {
      legal_name: "CITYMART US INC.",
      officers: ["SASCHA HASELMAYER"],
      registration_state: "NY",
    };
    const base = corpusWith({
      extract: { people: [{ name: "Sascha Haselmayer", title: "CEO" }] },
    });
    const larger = corpusWith({
      extract: {
        /* A hostile pitch piling on denials and extra facts: the state
           claim ADDS a weak signal; nothing it says can remove the officer
           tie, because no function reads a denial. */
        people: [{ name: "Sascha Haselmayer", title: "CEO" }],
        state_mentioned: "NY",
        addresses: ["We are NOT at 405 Lexington Avenue, New York, NY"],
      },
    });
    const baseTie = computeTies(record, base);
    const largerTie = computeTies(record, larger);
    for (const s of baseTie.signals) {
      expect(
        largerTie.signals.some((x) => x.kind === s.kind && x.value === s.value),
      ).toBe(true);
    }
    expect(largerTie.tied).toBe(true);
    expect(largerTie.strong).toBe(true);
  });

  it("signals dedupe and cap at eight", () => {
    const corpus = corpusWith({
      extract: { people: [{ name: "Jane Roe", title: "CEO" }] },
    });
    const tie = computeTies(
      { legal_name: "ACME INC.", officers: ["Jane Roe", "JANE ROE", "jane roe"] },
      corpus,
    );
    expect(tie.signals).toHaveLength(1);
  });
});

describe("attributionFor: the verdict table", () => {
  const tied = (strong: boolean) => ({
    tied: true,
    strong,
    checkable: true,
    signals: [],
  });
  const untied = { tied: false, strong: false, checkable: true, signals: [] };

  it("isDegenerateBrandName judges the FULLY suffix-stripped brand", () => {
    expect(isDegenerateBrandName("17A")).toBe(true);
    expect(isDegenerateBrandName("ZIP, LLC")).toBe(true);
    /* Stacked suffixes strip the way the matcher strips: "Zip Co Ltd"
       exact-matches the query "Zip", so it must be judged as "ZIP". */
    expect(isDegenerateBrandName("Zip Co Ltd")).toBe(true);
    expect(isDegenerateBrandName("POLCO INC.")).toBe(false); // POLCO = 5 chars
    expect(isDegenerateBrandName("ZENCITY TECHNOLOGIES US, INC.")).toBe(false);
  });

  it("degenerate names require a STRONG tie (the 17A / Zip class)", () => {
    const rec: RecordTieFacts = { legal_name: "17A", match_confidence: "exact" };
    expect(attributionFor(rec, tied(false))).toBe("candidate"); // state tie only
    expect(attributionFor(rec, tied(true))).toBe("attributed");
    expect(attributionFor(rec, untied)).toBe("candidate");
  });

  it("distinctive exact LIVE records attribute, tied or untied, when nothing competes (the direct-call default)", () => {
    /* Real early-stage registrations carry facts nothing public relates
       to them anymore (Polco's true Texas record lists the founder's old
       apartment); an exact distinctive name on a live record stands WHEN
       no other live exact-name record competes and no veto applies. The
       symmetric rules (methodology 1.7) live in the guard: the census
       verdict, the age veto, and the submitted-root check. Direct calls
       without a guard keep the pre-1.7 verdict. The dissolved variant
       below keeps its strong-tie requirement. */
    const tiedRec: RecordTieFacts = {
      legal_name: "POLIMORPHIC, INC.",
      addr_state: "NY",
      city: "New York",
      match_confidence: "exact",
    };
    expect(attributionFor(tiedRec, tied(false))).toBe("attributed");
    const untiedRec: RecordTieFacts = {
      legal_name: "POLCO, INC.",
      street: "11815 VANCE JACKSON RD APT 701",
      city: "SAN ANTONIO",
      addr_state: "TX",
      match_confidence: "exact",
    };
    expect(attributionFor(untiedRec, untied)).toBe("attributed");
  });

  it("containment promotes only record-contains-query, and only with a tie", () => {
    const promotable: RecordTieFacts = {
      legal_name: "ZENCITY TECHNOLOGIES US, INC.",
      match_confidence: "name_similarity",
      containment: "query_in_record",
    };
    expect(attributionFor(promotable, tied(false))).toBe("attributed");
    expect(attributionFor(promotable, untied)).toBe("candidate");
    /* Namesake direction: a weak tie never promotes (the Zipsec class —
       "ZIP, LLC" inside "Zip Security"); a strong tie does, because a
       shared officer or address means the record is genuinely connected. */
    const namesake: RecordTieFacts = {
      legal_name: "POLCO INC.",
      match_confidence: "name_similarity",
      containment: "record_in_query",
    };
    expect(attributionFor(namesake, tied(false))).toBe("candidate");
    expect(attributionFor(namesake, tied(true))).toBe("attributed");
    const degenerateNamesake: RecordTieFacts = {
      legal_name: "ZIP, LLC",
      match_confidence: "name_similarity",
      containment: "record_in_query",
    };
    expect(attributionFor(degenerateNamesake, tied(false))).toBe("candidate");
  });

  it("a dissolved record requires a STRONG tie even when exact and distinctive", () => {
    const rec: RecordTieFacts = {
      legal_name: "CITYMART US INC.",
      match_confidence: "exact",
      dissolved: true,
    };
    expect(attributionFor(rec, tied(false))).toBe("candidate");
    expect(attributionFor(rec, tied(true))).toBe("attributed");
    /* And a dissolved record with no checkable facts never rides the
       EDGAR-class fallback. */
    expect(attributionFor(rec, untied)).toBe("candidate");
  });
});

describe("attributionFor: the symmetric guard (methodology 1.7)", () => {
  const weak = { tied: true, strong: false, checkable: true, signals: [] };
  const strong = { tied: true, strong: true, checkable: true, signals: [] };
  const untied = { tied: false, strong: false, checkable: true, signals: [] };
  const exact: RecordTieFacts = { legal_name: "ACME GOV, INC.", match_confidence: "exact" };

  it("an untied exact record attributes only when it is the anchor of the census", () => {
    expect(attributionFor(exact, untied, { anchor: true })).toBe("attributed");
    expect(attributionFor(exact, untied, { anchor: false })).toBe("candidate");
    expect(attributionFor(exact, untied, { anchor: null })).toBe("attributed");
  });

  it("any tie beats a lost census; a strong tie beats every veto", () => {
    expect(attributionFor(exact, weak, { anchor: false })).toBe("attributed");
    expect(attributionFor(exact, strong, { anchor: false, rootCovered: false })).toBe("attributed");
    expect(attributionFor(exact, { ...strong, age_contradicted: true }, { anchor: false })).toBe("attributed");
  });

  it("the age veto demotes a weak-tied or untied exact record (the 1996 namesake class)", () => {
    expect(attributionFor(exact, { ...weak, age_contradicted: true }, { anchor: true })).toBe("candidate");
    expect(attributionFor(exact, { ...untied, age_contradicted: true }, { anchor: true })).toBe("candidate");
  });

  it("the submitted-root check demotes an uncovered exact record unless it came through the bridge", () => {
    expect(attributionFor(exact, weak, { rootCovered: false })).toBe("candidate");
    expect(attributionFor(exact, untied, { rootCovered: false, anchor: true })).toBe("candidate");
    expect(attributionFor(exact, untied, { rootCovered: false, bridged: true, anchor: true })).toBe("attributed");
    expect(attributionFor(exact, weak, { rootCovered: true })).toBe("attributed");
    expect(attributionFor(exact, untied, { rootCovered: null, anchor: true })).toBe("attributed");
  });

  it("containment promotions take the same vetoes; the namesake direction is unchanged", () => {
    const promotable: RecordTieFacts = {
      legal_name: "ACME GOV TECHNOLOGIES US, INC.",
      match_confidence: "name_similarity",
      containment: "query_in_record",
    };
    expect(attributionFor(promotable, weak, { rootCovered: false })).toBe("candidate");
    expect(attributionFor(promotable, { ...weak, age_contradicted: true })).toBe("candidate");
    expect(attributionFor(promotable, weak, { rootCovered: true })).toBe("attributed");
    expect(attributionFor(promotable, strong, { rootCovered: false })).toBe("attributed");
    const namesake: RecordTieFacts = {
      legal_name: "ACME INC.",
      match_confidence: "name_similarity",
      containment: "record_in_query",
    };
    expect(attributionFor(namesake, weak, { rootCovered: true, anchor: true })).toBe("candidate");
    expect(attributionFor(namesake, strong)).toBe("attributed");
  });

  it("compliance feeds keep the plain exact verdict (feedCredited owns their credit)", () => {
    expect(attributionFor(exact, untied, { symmetric: false, anchor: false, rootCovered: false })).toBe("attributed");
  });

  it("dissolved and degenerate gates still come first", () => {
    const dissolved: RecordTieFacts = { ...exact, dissolved: true };
    expect(attributionFor(dissolved, weak, { anchor: true })).toBe("candidate");
    const short: RecordTieFacts = { legal_name: "ZIP, LLC", match_confidence: "exact" };
    expect(attributionFor(short, weak, { anchor: true, rootCovered: true })).toBe("candidate");
  });
});

describe("domainRootCoversName and domainRootOf", () => {
  it("derives the root label from a host", () => {
    expect(domainRootOf("www.ConductorAI.com")).toBe("conductorai");
    expect(domainRootOf("promise-pay.com")).toBe("promisepay");
    expect(domainRootOf("polco.us")).toBe("polco");
    expect(domainRootOf("app.vendor.co.uk")).toBe("vendor");
  });

  it("checks the record's distinctive tokens against the root, never the reverse", () => {
    const table: [string, string, boolean][] = [
      ["conductorai", "CONDUIT, LLC", false],
      ["conductorai", "COASTAL CONDUIT & DITCHING, INC.", false],
      ["conductorai", "CONDUCTORAI INC", true],
      ["polco", "POLCO, INC.", true],
      ["tylertech", "TYLER TECHNOLOGIES, INC.", true],
      ["zencity", "ZENCITY TECHNOLOGIES US, INC.", true],
      ["withforerunner", "FORERUNNER CORPORATION", true],
      ["group17a", "GROUP CONDUIT LLC", false],
      ["promisepay", "PROMISE NETWORK, INC.", true],
      ["ironcladapp", "IRONCLAD, INC.", true],
      ["ironcladapp", "IRONCLAD CONSTRUCTION GROUP LLC", true],
      ["zipsec", "ZIP, LLC", true],
      ["acmegov", "THE GROUP HOLDINGS LLC", false],
      ["", "ACME INC", false],
    ];
    for (const [root, name, expected] of table) {
      expect(domainRootCoversName(root, name), `${root} vs ${name}`).toBe(expected);
    }
  });
});

describe("domainRegistrationYear reads the RDAP lane under the identity provenance rule", () => {
  const rdap = (data: Record<string, unknown>, status: "hit" | "error" = "hit"): RegistryCheck => ({
    check_id: "rdap_domain_age",
    source: "Domain registration records (RDAP)",
    status,
    summary: "",
    evidence_url: null,
    confidence: "exact",
    retrieved_at: "2026-09-01T00:00:00.000Z",
    data,
  });
  it("returns the year for a pitch-stated or submitted domain", () => {
    expect(domainRegistrationYear([rdap({ registered_year: 2019 })])).toBe(2019);
  });
  it("returns the year for a discovered domain only when the site confirmed the name", () => {
    expect(domainRegistrationYear([rdap({ registered_year: 2017, discovered_domain: true, confirmed_name_match: true })])).toBe(2017);
    expect(domainRegistrationYear([rdap({ registered_year: 2017, discovered_domain: true })])).toBeNull();
  });
  it("returns null on misses, errors, and unknown dates", () => {
    expect(domainRegistrationYear([rdap({ registered_year: null })])).toBeNull();
    expect(domainRegistrationYear([rdap({}, "error")])).toBeNull();
    expect(domainRegistrationYear([])).toBeNull();
  });
});

describe("the live exact-name census and the four round-2 shapes (adjudicateChecks end to end)", () => {
  const AT = "2026-09-01T00:00:00.000Z";
  const sos = (
    id: string,
    source: string,
    matches: Record<string, unknown>[],
    extra: Record<string, unknown> = {},
  ): RegistryCheck => ({
    check_id: id,
    source,
    status: "hit",
    summary: "",
    evidence_url: null,
    confidence: matches.some((m) => m.confidence === "exact") ? "exact" : "name_similarity",
    retrieved_at: AT,
    data: { matches, ...extra },
  });
  const edgar = (entities: Record<string, unknown>[]): RegistryCheck => ({
    check_id: "edgar_fts",
    source: "SEC EDGAR full-text search",
    status: "hit",
    summary: "",
    evidence_url: null,
    confidence: "exact",
    retrieved_at: AT,
    data: { filing_entities: entities },
  });
  const byId = (checks: RegistryCheck[]) =>
    Object.fromEntries(checks.map((c) => [c.check_id, c])) as Record<string, RegistryCheck>;

  it("counts every live exact match across lanes, keyed by unstripped name, and skips dissolved ones", () => {
    const keys = exactLiveKeys([
      sos("sos_tx", "Texas", [{ name: "IRONCLAD, INC.", confidence: "exact", status: "ACTIVE" }]),
      sos("sos_ct", "Connecticut", [{ name: "IRONCLAD LLC", confidence: "exact", status: "Active" }]),
      sos("sos_co", "Colorado", [{ name: "ironclad LLC", confidence: "exact", status: "Voluntarily Dissolved" }]),
      sos("sos_ny", "New York", [{ name: "IRONCLAD 123 INC.", confidence: "name_similarity", status: "Active" }]),
      edgar([{ name: "Ironclad, Inc.", cik: "1", inc_state: "DE", confidence: "exact" }]),
    ]);
    expect([...keys.keys()].sort()).toEqual(["IRONCLAD INC", "IRONCLAD LLC"]);
    expect([...keys.get("IRONCLAD INC")!].sort()).toEqual(["edgar", "sos_tx"]);
    expect([...keys.get("IRONCLAD LLC")!]).toEqual(["sos_ct"]);
  });

  it("Polco shape: one live exact record and two dissolved namesakes still attributes (nothing competes)", () => {
    const checks = [
      sos("sos_tx", "Texas Comptroller", [
        { name: "POLCO, INC.", confidence: "exact", status: "ACTIVE", date: "2018-03-01", street: "11815 VANCE JACKSON RD", city: "SAN ANTONIO", addr_state: "TX" },
      ]),
      sos("sos_ny", "New York", [{ name: "POLCO INC.", confidence: "exact", status: "Inactive" }], {
        dissolved: { legal_name: "POLCO INC.", status: "Inactive" },
      }),
      sos("sos_co", "Colorado", [{ name: "POLCO, INC.", confidence: "name_similarity", status: "Dissolved" }], {
        dissolved: { legal_name: "POLCO, INC.", status: "Dissolved" },
      }),
    ];
    adjudicateChecks(checks, corpusWith({ extract: { vendor_name_candidates: ["Polco"] }, domainYear: 2017 }));
    const c = byId(checks);
    expect(c.sos_tx.attribution).toBe("attributed");
    expect(c.sos_ny.attribution).toBe("candidate");
    expect(c.sos_co.attribution).toBe("candidate");
  });

  it("Ironclad shape: two competing live exact names; the one backed by SEC and Texas wins, the Connecticut LLC is a candidate", () => {
    const checks = [
      sos("sos_ct", "Connecticut", [{ name: "IRONCLAD LLC", confidence: "exact", status: "Active", date: "2018-05-10", city: "MIDDLEFIELD", addr_state: "CT" }]),
      sos("sos_tx", "Texas Comptroller", [
        { name: "IRONCLAD CONSTRUCTION GROUP LLC", confidence: "name_similarity", containment: "query_in_record", status: "ACTIVE" },
        { name: "IRONCLAD, INC.", confidence: "exact", status: "ACTIVE", date: "2016-01-01", city: "SAN FRANCISCO", addr_state: "CA" },
      ]),
      edgar([{ name: "Ironclad, Inc.", cik: "0001755112", inc_state: "DE", confidence: "exact" }]),
    ];
    adjudicateChecks(checks, corpusWith({ extract: { vendor_name_candidates: ["Ironclad"] }, submittedDomain: "ironcladapp.com", domainYear: 2014 }));
    const c = byId(checks);
    expect(c.sos_tx.attribution).toBe("attributed");
    expect(c.edgar_fts.attribution).toBe("attributed");
    expect(c.sos_ct.attribution).toBe("candidate");
    /* The root covers both LLC and INC ("ironclad" is in "ironcladapp"), so
       the census, not the root, is what tells them apart. */
    expect(domainRootCoversName("ironcladapp", "IRONCLAD LLC")).toBe(true);
  });

  it("Forerunner shape: exact live namesakes decades older than the vendor's domain are vetoed by age", () => {
    const checks = [
      sos("sos_co", "Colorado", [
        { name: "FORERUNNER CORPORATION", confidence: "exact", status: "Good Standing", date: "1996-06-06", city: "SAN FRANCISCO", addr_state: "CA", jurisdiction: "CO" },
        { name: "FORERUNNER INDUSTRIES, INC.", confidence: "name_similarity", containment: "query_in_record", status: "Good Standing", date: "2025-12-18" },
      ]),
      sos("sos_tx", "Texas Comptroller", [{ name: "FORERUNNER CORPORATION", confidence: "exact", status: "ACTIVE", date: "2001-10-12", city: "LOS ANGELES", addr_state: "CA" }]),
    ];
    adjudicateChecks(checks, corpusWith({ extract: { vendor_name_candidates: ["Forerunner"] }, domainYear: 2019 }));
    const c = byId(checks);
    expect(c.sos_co.tie!.age_contradicted).toBe(true);
    expect(c.sos_co.attribution).toBe("candidate");
    expect(c.sos_tx.attribution).toBe("candidate");
    /* Without a vendor year (site never found), the same records are the
       run's sole exact name and still attribute: the documented residual. */
    const again = [
      sos("sos_co", "Colorado", [{ name: "FORERUNNER CORPORATION", confidence: "exact", status: "Good Standing", date: "1996-06-06" }]),
    ];
    adjudicateChecks(again, corpusWith({ extract: { vendor_name_candidates: ["Forerunner"] } }));
    expect(again[0].attribution).toBe("attributed");
  });

  it("ConductorAI shape: a record the root cannot cover never competes, so the real SEC record attributes", () => {
    const checks = [
      sos("sos_tx", "Texas Comptroller", [{ name: "CONDUIT, LLC", confidence: "exact", status: "ACTIVE", date: "2020-12-23" }]),
      sos("sos_ny", "New York", [{ name: "CONDUIT CORP.", confidence: "exact", status: "Inactive", date: "1983-01-01" }], {
        dissolved: { legal_name: "CONDUIT CORP.", status: "Inactive" },
      }),
      edgar([{ name: "ConductorAI Corp", cik: "9", inc_state: "DE", confidence: "exact" }]),
    ];
    const corpus = corpusWith({ extract: { vendor_name_candidates: ["Conduit"] }, submittedDomain: "www.conductorai.com", domainYear: 2023 });
    expect([...exactLiveKeys(checks, corpus).keys()]).toEqual(["CONDUCTORAI CORP"]);
    adjudicateChecks(checks, corpus);
    const c = byId(checks);
    expect(c.edgar_fts.attribution).toBe("attributed");
    expect(c.sos_tx.attribution).toBe("candidate");
    expect(c.sos_ny.attribution).toBe("candidate");
  });

  it("Polco shape with a live same-brand LLC in another state: neither record is credited on a bare name (the documented fairness cost)", () => {
    const checks = [
      sos("sos_ny", "New York", [
        { name: "POLCO INC.", confidence: "exact", status: "Inactive", date: "2004-07-21" },
        { name: "POLCO LLC", confidence: "exact", status: "Active", date: "2016-11-22" },
      ], { dissolved: { legal_name: "POLCO INC.", status: "Inactive" } }),
      sos("sos_tx", "Texas Comptroller", [{ name: "POLCO, INC.", confidence: "exact", status: null, date: "2018-08-02" }]),
    ];
    adjudicateChecks(checks, corpusWith({ extract: { vendor_name_candidates: ["Polco"] } }));
    const c = byId(checks);
    expect(c.sos_tx.attribution).toBe("candidate");
    expect(c.sos_ny.attribution).toBe("candidate");
    /* A site address in Texas would tie it; a strong tie always would. */
    const tied = [
      sos("sos_ny", "New York", [{ name: "POLCO LLC", confidence: "exact", status: "Active" }]),
      sos("sos_tx", "Texas Comptroller", [{ name: "POLCO, INC.", confidence: "exact", status: null, addr_state: "TX" }]),
    ];
    adjudicateChecks(tied, corpusWith({ extract: { vendor_name_candidates: ["Polco"], state_mentioned: "TX" } }));
    expect(byId(tied).sos_tx.attribution).toBe("attributed");
    expect(byId(tied).sos_ny.attribution).toBe("candidate");
  });

  it("Conduit shape: a URL run whose root does not cover the exact record leaves it a candidate; the same run from conduit.com attributes", () => {
    const make = () => [
      sos("sos_tx", "Texas Comptroller", [
        { name: "COASTAL CONDUIT & DITCHING, INC.", confidence: "name_similarity", containment: "query_in_record", status: "ACTIVE", city: "HOUSTON", addr_state: "TX" },
        { name: "CONDUIT, LLC", confidence: "exact", status: "ACTIVE", date: "2020-03-01", city: "AUSTIN", addr_state: "TX" },
      ]),
      sos("sos_ny", "New York", [{ name: "CONDUIT INC.", confidence: "exact", status: "Inactive" }], {
        dissolved: { legal_name: "CONDUIT INC.", status: "Inactive" },
      }),
    ];
    const url = make();
    adjudicateChecks(url, corpusWith({ extract: { vendor_name_candidates: ["Conduit"], state_mentioned: "TX" }, submittedDomain: "www.conductorai.com", domainYear: 2023 }));
    expect(byId(url).sos_tx.attribution).toBe("candidate");
    expect(byId(url).sos_tx.tie!.tied).toBe(true); // the TX state tie exists and is not enough
    const own = make();
    adjudicateChecks(own, corpusWith({ extract: { vendor_name_candidates: ["Conduit"], state_mentioned: "TX" }, submittedDomain: "conduit.com", domainYear: 2023 }));
    expect(byId(own).sos_tx.attribution).toBe("attributed");
    /* The bare-name residual, documented in the methodology's known limits:
       no root, no vendor year, sole live exact name -> attributed. */
    const bare = make();
    adjudicateChecks(bare, corpusWith({ extract: { vendor_name_candidates: ["Conduit"] } }));
    expect(byId(bare).sos_tx.attribution).toBe("attributed");
  });

  it("a planted state in the pitch cannot mint an exact record the submitted root does not cover (favorable twin)", () => {
    const check = () =>
      sos("sos_tx", "Texas Comptroller", [{ name: "CONDUIT, LLC", confidence: "exact", status: "ACTIVE", date: "2020-03-01", addr_state: "TX" }]);
    const clean = [check()];
    adjudicateChecks(clean, corpusWith({ extract: { vendor_name_candidates: ["Conduit"] }, submittedDomain: "conductorai.com" }));
    const planted = [check()];
    adjudicateChecks(planted, corpusWith({ extract: { vendor_name_candidates: ["Conduit"], state_mentioned: "TX" }, submittedDomain: "conductorai.com" }));
    expect(clean[0].attribution).toBe("candidate");
    expect(planted[0].attribution).toBe("candidate");
  });

  it("coverage state names count only when the citation also mentions the vendor (methodology 1.7)", () => {
    const stateOnly = corpusWith({
      extract: { vendor_name_candidates: ["Accela"] },
      citations: [cite({ title: "A Texas county buys new permitting software", cited_text: "The county in Texas signed the deal.", domain_class: 2 })],
    });
    expect(stateOnly.states.some((s) => s.code === "TX")).toBe(false);
    const withVendor = corpusWith({
      extract: { vendor_name_candidates: ["Accela"] },
      citations: [cite({ title: "Accela signs a Texas county", cited_text: "Accela's permitting software heads to Texas.", domain_class: 2 })],
    });
    expect(withVendor.states.some((s) => s.code === "TX" && s.source === "coverage")).toBe(true);
  });

  it("a name run with a supplied website seeds the root the same way a url run does", () => {
    const c = corpusWith({
      extract: { vendor_name_candidates: ["Polco"], domains: ["polco.us"] },
      primaryDomain: "polco.us",
      submittedDomain: "polco.us",
    });
    expect(c.submittedDomainRoot).toBe("polco");
    expect(c.domains).toContain("polco.us");
  });

  it("the corpus records the submitted root and the earliest vendor year", () => {
    const c = corpusWith({ submittedDomain: "www.Promise-Pay.com", foundingYear: 2018, domainYear: 2019 });
    expect(c.submittedDomainRoot).toBe("promisepay");
    expect(c.vendorYear).toBe(2018);
    const none = corpusWith({});
    expect(none.submittedDomainRoot).toBeNull();
    expect(none.vendorYear).toBeNull();
    expect(AGE_VETO_YEARS).toBe(5);
  });

  it("tieFactsForCheck parses the lane date into a formation year", () => {
    const facts = tieFactsForCheck(
      sos("sos_co", "Colorado", [{ name: "ACME INC", confidence: "exact", date: "1996-06-06" }]),
    );
    expect(facts!.formation_year).toBe(1996);
    const noDate = tieFactsForCheck(sos("sos_co", "Colorado", [{ name: "ACME INC", confidence: "exact" }]));
    expect(noDate!.formation_year).toBeNull();
  });

  it("attributionTrace carries the verdict and tie shape without record payloads", () => {
    const checks = [
      sos("sos_tx", "Texas Comptroller", [{ name: "POLCO, INC.", confidence: "exact", status: "ACTIVE", date: "2018-03-01", street: "11815 VANCE JACKSON RD" }]),
    ];
    adjudicateChecks(checks, corpusWith({ extract: { vendor_name_candidates: ["Polco"] } }));
    const trace = attributionTrace(checks);
    expect(trace).toHaveLength(1);
    expect(trace[0]).toMatchObject({ check_id: "sos_tx", attribution: "attributed", legal_name: "POLCO, INC.", formation_year: 2018 });
    expect(JSON.stringify(trace)).not.toContain("VANCE JACKSON");
  });
});

describe("tieFactsForCheck and adjudicateChecks", () => {
  const baseCheck = {
    source: "test",
    summary: "",
    evidence_url: null,
    retrieved_at: "2026-08-31T12:00:00.000Z",
  };

  it("extracts facts from an SOS lane's best match, preferring exact", () => {
    const check: RegistryCheck = {
      ...baseCheck,
      check_id: "sos_ny",
      status: "hit",
      confidence: "exact",
      data: {
        matches: [
          { name: "OTHER LLC", confidence: "name_similarity" },
          {
            name: "CITYMART US INC.",
            confidence: "exact",
            officers: ["SASCHA HASELMAYER"],
            street: "405 LEXINGTON AVENUE",
            city: "NEW YORK",
            addr_state: "NY",
            jurisdiction: "New York, United States",
          },
        ],
      },
    };
    const facts = tieFactsForCheck(check);
    expect(facts).toMatchObject({
      legal_name: "CITYMART US INC.",
      registration_state: "NY",
      officers: ["SASCHA HASELMAYER"],
      city: "NEW YORK",
    });
  });

  it("extracts facts from a SAM entity hit", () => {
    const check: RegistryCheck = {
      ...baseCheck,
      check_id: "sam_entity",
      status: "hit",
      confidence: "exact",
      data: {
        legal_business_name: "GOVASSIST AI INC",
        physical_address: { street: null, city: "AUSTIN", state: "TX" },
      },
    };
    expect(tieFactsForCheck(check)).toMatchObject({
      legal_name: "GOVASSIST AI INC",
      city: "AUSTIN",
      addr_state: "TX",
    });
  });

  it("returns null for misses and for families without record facts", () => {
    const miss: RegistryCheck = {
      ...baseCheck,
      check_id: "sos_ny",
      status: "definitive_miss",
      confidence: null,
      data: null,
    };
    expect(tieFactsForCheck(miss)).toBeNull();
    const rdap: RegistryCheck = {
      ...baseCheck,
      check_id: "rdap_domain_age",
      status: "hit",
      confidence: "exact",
      data: {},
    };
    expect(tieFactsForCheck(rdap)).toBeNull();
  });

  it("adjudicateChecks writes tie evidence and the verdict onto adjudicable hits only", () => {
    const checks: RegistryCheck[] = [
      {
        ...baseCheck,
        check_id: "sos_tx",
        status: "hit",
        confidence: "exact",
        data: { matches: [{ name: "ACME INC.", confidence: "exact" }] },
      },
      {
        ...baseCheck,
        check_id: "sos_co",
        status: "definitive_miss",
        confidence: null,
        data: null,
      },
    ];
    adjudicateChecks(
      checks,
      corpusWith({ extract: { state_mentioned: "TX" } }),
    );
    expect(checks[0].tie).toBeDefined();
    expect(checks[0].tie!.tied).toBe(true);
    expect(checks[0].attribution).toBe("attributed");
    expect(checks[1].tie).toBeUndefined();
    expect(checks[1].attribution).toBeUndefined();
  });

  it("adjudication is monotone across corpora: research citations can only promote", () => {
    const makeCheck = (): RegistryCheck => ({
      ...baseCheck,
      check_id: "sos_ny",
      status: "hit",
      confidence: "exact",
      data: {
        matches: [
          {
            name: "CITYMART US INC.",
            confidence: "exact",
            officers: ["SASCHA HASELMAYER"],
          },
        ],
        dissolved: { legal_name: "CITYMART US INC.", status: "Inactive" },
      },
    });
    /* Head pass: no citations yet — the dissolved record stays candidate. */
    const headCheck = makeCheck();
    adjudicateChecks([headCheck], corpusWith({}));
    expect(headCheck.attribution).toBe("candidate");
    /* Tail pass: coverage names the CEO — the record attributes. */
    const tailCheck = makeCheck();
    adjudicateChecks(
      [tailCheck],
      corpusWith({
        citations: [
          cite({
            title: "Citymart founder Sascha Haselmayer on procurement",
            domain_class: 2,
          }),
        ],
      }),
    );
    expect(tailCheck.attribution).toBe("attributed");
    expect(tailCheck.tie!.strong).toBe(true);
  });
});

describe("discoverBridgeNames: the research-to-registry name bridge", () => {
  const bridgeArgs = {
    anchorNames: ["SteadyIQ"],
    productNames: [],
    knownNames: ["SteadyIQ"],
  };

  it("finds a legal name on a registry-grade host (the SteadyIQ shape)", () => {
    const names = discoverBridgeNames(
      [
        cite({
          url: "https://data.texas.gov/resource/9cir-efmm.json?taxpayer=0804105092",
          title: "Active Franchise Taxpayers",
          cited_text: "Steady Platform, Inc. holds Texas file 0804105092.",
          domain_class: 1,
        }),
      ],
      bridgeArgs,
    );
    expect(names).toHaveLength(1);
    expect(names[0].name).toBe("Steady Platform, Inc.");
    expect(names[0].source_host).toBe("data.texas.gov");
  });

  it("a class-1 host OFF the registry-grade allowlist never feeds the bridge", () => {
    const names = discoverBridgeNames(
      [
        cite({
          url: "https://www.courtlistener.com/docket/12345/",
          cited_text: "Steady Platform, Inc. v. Somebody",
          domain_class: 1,
        }),
      ],
      bridgeArgs,
    );
    expect(names).toHaveLength(0);
  });

  it("class 2 and class 3 pages never feed the bridge, whatever they assert", () => {
    for (const [url, cls] of [
      ["https://www.govtech.com/steady-profile", 2],
      ["https://steadyiq.com/about", 3],
    ] as const) {
      const names = discoverBridgeNames(
        [
          cite({
            url,
            cited_text: "Our legal name is Steady Platform, Inc.",
            domain_class: cls,
          }),
        ],
        bridgeArgs,
      );
      expect(names).toHaveLength(0);
    }
  });

  it("a registry page mentioning an unrelated company fails the anchor gate", () => {
    const names = discoverBridgeNames(
      [
        cite({
          url: "https://data.texas.gov/resource/9cir-efmm.json",
          cited_text: "Deloitte Consulting LLP appears in the same dataset.",
          domain_class: 1,
        }),
      ],
      bridgeArgs,
    );
    expect(names).toHaveLength(0);
  });

  it("already-known names and product-only names are skipped, and output caps at two", () => {
    const names = discoverBridgeNames(
      [
        cite({
          url: "https://opencorporates.com/companies/us_de/12345",
          cited_text:
            "SteadyIQ Inc. and Steady Platform, Inc. and Steady Payments LLC and Steady Labs Corp are registered.",
          domain_class: 1,
        }),
      ],
      {
        anchorNames: ["SteadyIQ"],
        productNames: [],
        knownNames: ["SteadyIQ Inc."],
      },
    );
    expect(names.length).toBeLessThanOrEqual(2);
    expect(names.map((n) => n.name)).not.toContain("SteadyIQ Inc.");
    expect(names[0].name).toBe("Steady Platform, Inc.");
  });
});

describe("coverage-sourced state ties (weak, favorable-only)", () => {
  it("a full state name in class 1-2 coverage supplies a weak tie", () => {
    const corpus = corpusWith({
      extract: { vendor_name_candidates: ["Polco"] },
      citations: [
        cite({
          title: "Madison, Wisconsin civic-engagement firm Polco raises round",
          domain_class: 2,
        }),
      ],
    });
    const tie = computeTies(
      { legal_name: "POLCO INC", registration_state: "TX", addr_state: "WI" },
      corpus,
    );
    expect(tie.tied).toBe(true);
    expect(tie.strong).toBe(false);
    expect(tie.signals[0]).toMatchObject({
      kind: "state",
      strength: "weak",
      vendor_source: "coverage",
    });
  });

  it("bare two-letter codes in coverage never count, and class 3 never counts", () => {
    const bareCode = corpusWith({
      citations: [cite({ cited_text: "Ship OR store your data", domain_class: 2 })],
    });
    expect(bareCode.states).toEqual([]);
    const class3 = corpusWith({
      citations: [cite({ cited_text: "our Wisconsin office", domain_class: 3 })],
    });
    expect(class3.states).toEqual([]);
  });
});

describe("siteStatesFromText: deterministic footer-state harvest", () => {
  it("finds City, ST ZIP shapes and nothing looser", async () => {
    const { siteStatesFromText } = await import(
      "../../../supabase/functions/_shared/identity-ties.ts"
    );
    expect(
      siteStatesFromText("Contact us: 175 Varick St, New York, NY 10014 USA"),
    ).toEqual(["NY"]);
    expect(siteStatesFromText("Ship OR store your data. Sign IN today.")).toEqual([]);
    expect(siteStatesFromText("Austin, TX 78701 and Madison, WI 53703")).toEqual([
      "TX",
      "WI",
    ]);
  });
});
