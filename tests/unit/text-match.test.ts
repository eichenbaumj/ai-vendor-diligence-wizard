/*
  Tests for the shared text-matching helpers, focused on the named-customer
  hygiene filter: counts and descriptions are scale claims, not customer
  names, and must produce no ledger row and no finding.
*/
import { describe, expect, it } from "vitest";
import { isNamedOrganization, splitNameCandidates } from "@shared/text-match.ts";
import { assemble } from "@shared/assemble.ts";
import type { PitchExtract } from "@shared/schemas.ts";

describe("isNamedOrganization", () => {
  it("accepts real organization names", () => {
    for (const name of [
      "Orange County, FL",
      "City of Austin",
      "Littleton, CO",
      "Texas Department of Information Resources",
      "Suisun City",
      "NYC Parks",
    ]) {
      expect(isNamedOrganization(name), name).toBe(true);
    }
  });

  it("rejects counts and numeric descriptions", () => {
    for (const s of [
      "1,600 governments",
      "more than 50 municipalities",
      "over 200 agencies",
      "3 of the 5 largest cities",
    ]) {
      expect(isNamedOrganization(s), s).toBe(false);
    }
  });

  it("rejects bare generic nouns and lowercase descriptions", () => {
    for (const s of [
      "Governments",
      "Local governments",
      "municipalities",
      "state agencies across the country",
      "Cities",
    ]) {
      expect(isNamedOrganization(s), s).toBe(false);
    }
  });

  it("rejects empty and single-character strings", () => {
    expect(isNamedOrganization("")).toBe(false);
    expect(isNamedOrganization(" A ")).toBe(false);
  });
});

describe("assembly drops count-phrase customers", () => {
  function extractWith(customers: string[]): PitchExtract {
    return {
      vendor_name_candidates: ["Acme AI"],
      domains: ["acmeai.example.com"],
      sender_email: null,
      people: [],
      named_customers: customers,
      claims: [],
      use_case_description: "Resident chatbot.",
      urgency_language: [],
      state_mentioned: null,
      injection_screen: {
        injection_suspected: false,
        addressed_to_ai: false,
        suspicious_spans: [],
      },
    };
  }

  const base = (customers: string[]) => ({
    extract: extractWith(customers),
    checks: [],
    identity: { identity_resolved: true, identifiers_found: ["a", "b"] },
    citations: [],
    adv_findings: [],
    sector: {
      pack_ids: [] as never[],
      elevated: false,
      overlay_reason: null,
      state_items: [],
    },
    packs: {},
    resolvable: true,
    research_partial: false,
    generated_at: "2026-08-28T00:00:00.000Z",
  });

  it("a count-only customer list produces no rows and no aggregate finding", () => {
    const out = assemble(base(["1,600 governments"]));
    expect(out.ledger.filter((r) => r.methodology_ref === "d2-4")).toHaveLength(0);
    expect(out.tierInputs.findings.find((f) => f.id === "customers")).toBeUndefined();
  });

  it("counts drop while real names keep their rows, and the finding counts only names", () => {
    const out = assemble(base(["more than 50 municipalities", "Littleton, CO"]));
    const rows = out.ledger.filter((r) => r.methodology_ref === "d2-4");
    expect(rows).toHaveLength(1);
    expect(rows[0].what_checked).toContain("Littleton");
    const finding = out.tierInputs.findings.find((f) => f.id === "customers");
    expect(finding?.detail).toContain("None of the 1 named");
  });
});

describe("splitNameCandidates", () => {
  it("splits 'X by Y' into company and product", () => {
    const s = splitNameCandidates(["TrueTax by Govra"]);
    expect(s.identityNames[0]).toBe("TrueTax by Govra");
    expect(s.identityNames).toContain("Govra");
    expect(s.productNames).toEqual(["TrueTax"]);
    expect(s.anchorNames).toEqual(["Govra"]);
  });

  it("splits a parenthetical alternate name", () => {
    const s = splitNameCandidates(["TrueTax (Govra)"]);
    expect(s.identityNames).toContain("Govra");
    expect(s.productNames).toEqual(["TrueTax"]);
  });

  it("verbatim always stays first", () => {
    const s = splitNameCandidates(["CivicScan by Meridian Analytics", "Meridian"]);
    expect(s.identityNames[0]).toBe("CivicScan by Meridian Analytics");
  });

  it("does not split stopword parentheticals or non-proper sides", () => {
    for (const name of [
      "Acme (formerly Beta Corp)",
      "Acme (a Delaware corporation)",
      "Widget (the original)",
    ]) {
      const s = splitNameCandidates([name]);
      expect(s.productNames, name).toEqual([]);
      expect(s.identityNames, name).toEqual([name]);
    }
  });

  it("does not split when a side carries digits or no capital", () => {
    expect(splitNameCandidates(["Form 990 by numbers"]).productNames).toEqual([]);
    expect(splitNameCandidates(["taxbot by acme"]).productNames).toEqual([]);
  });

  it("plain names pass through untouched and stay anchors", () => {
    const s = splitNameCandidates(["Polimorphic", "Polimorphic, Inc."]);
    expect(s.identityNames).toEqual(["Polimorphic", "Polimorphic, Inc."]);
    expect(s.productNames).toEqual([]);
    expect(s.anchorNames).toEqual(["Polimorphic", "Polimorphic, Inc."]);
  });

  it("caps identity at 6 and dedupes appended parts by normalization", () => {
    const s = splitNameCandidates([
      "A One by Zeta",
      "B Two by Zeta Inc",
      "C Three by Yotta",
      "D Four by Xi",
      "E Five by Wu",
    ]);
    expect(s.identityNames.length).toBeLessThanOrEqual(6);
    expect(
      s.identityNames.filter((n) => n === "Zeta" || n === "Zeta Inc").length,
    ).toBeLessThanOrEqual(1);
  });
});
