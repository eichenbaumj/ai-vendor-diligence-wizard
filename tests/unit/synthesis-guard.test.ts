/*
  The synthesis guard (methodology 1.7): model prose may name only the
  vendor and the legal names the run credited. Pinned on the two live
  shapes: the Ironclad identity sentence that named a Texas construction
  firm (R2-F9) and the green flag that named a noise match (2026-09-01).
*/
import { describe, expect, it } from "vitest";
import {
  buildSynthesisGuard,
  guardClean,
  guardProse,
  introducedNameSpans,
  legalNameSpans,
  nameViolations,
  sentencesOf,
} from "@shared/synthesis-guard.ts";
import type { PitchExtract, RegistryCheck } from "@shared/schemas.ts";

const AT = "2026-09-01T00:00:00.000Z";

function extractWith(over: Partial<PitchExtract> = {}): PitchExtract {
  return {
    vendor_name_candidates: ["Ironclad"],
    domains: ["ironcladapp.com"],
    addresses: [],
    sender_email: null,
    people: [{ name: "Jason Boehmig", title: "CEO" }],
    named_customers: ["City of Example"],
    claims: [],
    use_case_description: "",
    urgency_language: [],
    state_mentioned: null,
    injection_screen: { injection_suspected: false, addressed_to_ai: false, suspicious_spans: [] },
    ...over,
  };
}

function check(over: Partial<RegistryCheck> & { check_id: string }): RegistryCheck {
  return {
    source: "test",
    status: "hit",
    summary: "",
    evidence_url: null,
    confidence: "exact",
    retrieved_at: AT,
    data: null,
    ...over,
  };
}

const ironcladChecks = [
  check({
    check_id: "sos_tx",
    source: "Texas Comptroller Active Franchise Taxpayers (data.texas.gov)",
    attribution: "attributed",
    data: {
      matches: [
        { name: "IRONCLAD CONSTRUCTION GROUP LLC", confidence: "name_similarity", status: "ACTIVE" },
        { name: "IRONCLAD, INC.", confidence: "exact", status: "ACTIVE" },
      ],
      rejected_product_only: [],
    },
  }),
  check({
    check_id: "sos_ct",
    source: "Connecticut Secretary of the State (data.ct.gov)",
    attribution: "candidate",
    data: { matches: [{ name: "IRONCLAD LLC", confidence: "exact", status: "Active" }] },
  }),
  check({
    check_id: "edgar_fts",
    source: "SEC EDGAR full-text search",
    attribution: "attributed",
    data: { filing_entities: [{ name: "Ironclad, Inc.", cik: "1", inc_state: "DE", confidence: "exact" }] },
  }),
  check({
    check_id: "usaspending",
    source: "USAspending.gov",
    confidence: "exact",
    data: { recipient_name: "IRONCLAD COMPANY", award_count: 0 },
  }),
];

const guard = buildSynthesisGuard({
  checks: ironcladChecks,
  extract: extractWith(),
  vendorName: "Ironclad",
  greenFlagFacts: [{ fact: "Ironclad appears in the FedRAMP Marketplace with status \"FedRAMP Ready\", listed under the similar name Ironclad Inc; confirm it is the same company" }],
  ranStates: ["TEXAS", "CONNECTICUT", "NEW YORK"],
});

describe("buildSynthesisGuard", () => {
  it("allows the vendor's names, people, customers, and the credited legal names", () => {
    expect(guard.allowedNames.has("IRONCLAD")).toBe(true);
    expect(guard.allowedNames.has("IRONCLAD INC")).toBe(true);
    expect(guard.allowedNames.has("JASON BOEHMIG")).toBe(true);
    expect(guard.allowedNames.has("CITY OF EXAMPLE")).toBe(true);
  });
  it("denies every retrieved name the run did not credit, loosely", () => {
    expect(guard.deniedNames).toContain("ironcladconstructiongroupllc");
    expect(guard.deniedNames).toContain("ironcladllc");
    expect(guard.deniedNames).toContain("ironcladcompany");
    expect(guard.deniedNames).not.toContain("ironcladinc");
  });
  it("never denies a name a code-authored green flag already names", () => {
    /* The feed listing "Ironclad Inc" is credited by the fact string; its
       unstripped form equals the attributed EDGAR name here, and a feed
       name inside a fact is added to the allowed set by span. */
    const g = buildSynthesisGuard({
      checks: [
        check({
          check_id: "fedramp_marketplace",
          source: "FedRAMP Marketplace",
          confidence: "name_similarity",
          attribution: "candidate",
          data: { matches: [{ provider: "Tyler Technologies Data & Insights", product: "Socrata", status: "Authorized" }] },
        }),
      ],
      extract: extractWith({ vendor_name_candidates: ["Tyler Technologies"], people: [], named_customers: [] }),
      vendorName: "Tyler Technologies",
      greenFlagFacts: [{ fact: 'Tyler Technologies appears in the FedRAMP Marketplace with status "Authorized", listed under the similar name Tyler Technologies Data & Insights, Inc.; confirm it is the same company' }],
      ranStates: [],
    });
    expect(g.deniedNames).not.toContain("tylertechnologiesdatainsights");
  });
});

describe("legalNameSpans and introducedNameSpans", () => {
  it("finds suffix-anchored windows, longest first, stopping at the first lowercase token", () => {
    const spans = legalNameSpans("Texas records list IRONCLAD CONSTRUCTION GROUP LLC (checked today).");
    expect(spans).toHaveLength(1);
    expect(spans[0]).toEqual(["IRONCLAD CONSTRUCTION GROUP LLC", "CONSTRUCTION GROUP LLC", "GROUP LLC"]);
  });
  it("reads Title-case suffixes and uppercase suffixes alike", () => {
    expect(legalNameSpans("The vendor is Ironclad, Inc. of Delaware.")[0][0]).toBe("Ironclad Inc");
    expect(legalNameSpans("records show ACME GOV CORP")[0][0]).toBe("ACME GOV CORP");
  });
  it("ignores two-letter state codes in addresses and lowercase prose nouns", () => {
    expect(legalNameSpans("Its office is at 1 Main St, Denver, CO 80202.")).toHaveLength(0);
    expect(legalNameSpans("The company is registered and the corporation filed.")).toHaveLength(0);
  });
  it("captures names the prose introduces as legal names", () => {
    const spans = introducedNameSpans("The registry shows an entity under the name Conduit Holdings LLC today.");
    expect(spans[0][0]).toBe("Conduit Holdings LLC");
  });
});

describe("nameViolations and guardProse", () => {
  it("drops the R2-F9 sentence and keeps the clean one", () => {
    const text =
      "Texas Comptroller Active Franchise Taxpayers (data.texas.gov) shows a registered legal entity under the name IRONCLAD CONSTRUCTION GROUP LLC (checked September 1, 2026). SEC EDGAR also lists a Form D for Ironclad, Inc.";
    const out = guardProse(text, guard);
    expect(out).toBe("SEC EDGAR also lists a Form D for Ironclad, Inc.");
  });
  it("returns null when nothing survives", () => {
    expect(guardProse("The identity rests on IRONCLAD LLC of Connecticut.", guard)).toBeNull();
  });
  it("passes the vendor's own names, its people, and source labels", () => {
    const clean =
      "Ironclad, Inc. is registered in Delaware per SEC EDGAR. Jason Boehmig is named as CEO. We checked SEC EDGAR and the Texas Comptroller.";
    expect(guardClean(clean, guard)).toBe(true);
  });
  it("catches a denied name however it is cased or punctuated", () => {
    expect(nameViolations("A recipient named Ironclad Company appears in federal records.", guard).map((v) => v.kind)).toContain("denied_name");
    expect(nameViolations("the ironclad-construction-group LLC record", guard).length).toBeGreaterThan(0);
  });
  it("catches an uncredited name introduced as a legal name even without a suffix", () => {
    const v = nameViolations("The registry lists the company under the name Coastal Conduit Ditching today.", guard);
    expect(v.map((x) => x.kind)).toContain("unallowed_introduced_name");
  });
  it("summary screen: a search claim must name a state whose lane ran", () => {
    expect(nameViolations("We searched Florida and Texas registries.", guard, { summary: true }).map((v) => v.span)).toEqual(["FLORIDA"]);
    expect(nameViolations("The company is incorporated in Delaware.", guard, { summary: true })).toHaveLength(0);
    expect(guardProse("We searched Florida and found nothing. Texas records list Ironclad, Inc.", guard, { summary: true })).toBe(
      "Texas records list Ironclad, Inc.",
    );
  });
  it("splits sentences on terminal punctuation and keeps quotes attached", () => {
    expect(sentencesOf('First one. Second "quoted." Third?')).toEqual(["First one.", 'Second "quoted."', "Third?"]);
  });
});
