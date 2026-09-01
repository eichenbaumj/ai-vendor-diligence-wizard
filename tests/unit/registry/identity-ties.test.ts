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
  adjudicateChecks,
  attributionFor,
  buildTieCorpus,
  computeTies,
  hasStrongTieFacts,
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
}): VendorTieCorpus {
  const extract = extractWith(args.extract ?? {});
  return buildTieCorpus({
    extract,
    pitchPersonCount: args.pitchPersonCount ?? extract.people.length,
    pitchAddressCount: args.pitchAddressCount ?? extract.addresses.length,
    primaryDomain: args.primaryDomain ?? null,
    productNames: args.productNames ?? [],
    citations: args.citations ?? [],
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

  it("isDegenerateBrandName judges the suffix-stripped brand", () => {
    expect(isDegenerateBrandName("17A")).toBe(true);
    expect(isDegenerateBrandName("ZIP, LLC")).toBe(true);
    expect(isDegenerateBrandName("POLCO INC.")).toBe(false); // POLCO = 5 chars
    expect(isDegenerateBrandName("ZENCITY TECHNOLOGIES US, INC.")).toBe(false);
  });

  it("degenerate names require a STRONG tie (the 17A / Zip class)", () => {
    const rec: RecordTieFacts = { legal_name: "17A", match_confidence: "exact" };
    expect(attributionFor(rec, tied(false))).toBe("candidate"); // state tie only
    expect(attributionFor(rec, tied(true))).toBe("attributed");
    expect(attributionFor(rec, untied)).toBe("candidate");
  });

  it("distinctive exact + any tie attributes", () => {
    const rec: RecordTieFacts = {
      legal_name: "POLIMORPHIC, INC.",
      addr_state: "NY",
      city: "New York",
      match_confidence: "exact",
    };
    expect(attributionFor(rec, tied(false))).toBe("attributed");
  });

  it("distinctive exact, untied, with checkable facts stays candidate (the Polco class)", () => {
    const rec: RecordTieFacts = {
      legal_name: "POLCO INC.",
      street: "1 MAIN ST",
      city: "ALBANY",
      addr_state: "NY",
      officers: ["SOMEONE ELSE"],
      match_confidence: "exact",
    };
    expect(hasStrongTieFacts(rec)).toBe(true);
    expect(attributionFor(rec, untied)).toBe("candidate");
  });

  it("distinctive exact, untied, with NO checkable facts attributes (the EDGAR class)", () => {
    const rec: RecordTieFacts = {
      legal_name: "POLIMORPHIC, INC.",
      jurisdiction: "DE",
      match_confidence: "exact",
    };
    expect(hasStrongTieFacts(rec)).toBe(false);
    expect(attributionFor(rec, untied)).toBe("attributed");
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
