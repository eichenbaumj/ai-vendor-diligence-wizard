/*
  Tests for the provenance-guarded extract merge. The rules under test are
  the injection and fairness boundaries: site text can add things to CHECK,
  never things that mint identity or create absence-based findings.
*/
import { describe, expect, it } from "vitest";
import { isDegenerateExtract, mergeExtracts } from "@shared/extract-merge.ts";
import { assemble } from "@shared/assemble.ts";
import type { PitchExtract } from "@shared/schemas.ts";

function extractOf(partial: Partial<PitchExtract>): PitchExtract {
  return {
    vendor_name_candidates: ["Acme AI"],
    domains: ["acmeai.example.com"],
    sender_email: null,
    people: [],
    named_customers: [],
    claims: [],
    use_case_description: "Resident chatbot.",
    urgency_language: [],
    state_mentioned: null,
    injection_screen: {
      injection_suspected: false,
      addressed_to_ai: false,
      suspicious_spans: [],
    },
    ...partial,
  };
}

describe("mergeExtracts provenance rules", () => {
  it("names, domains, sender, state, urgency, and injection_screen stay pitch-only", () => {
    const merged = mergeExtracts(
      extractOf({}),
      extractOf({
        vendor_name_candidates: ["Deloitte", "Acme AI"],
        domains: ["deloitte.com"],
        sender_email: "x@deloitte.com",
        state_mentioned: "TX",
        urgency_language: ["limited-time offer"],
        injection_screen: {
          injection_suspected: true,
          addressed_to_ai: true,
          suspicious_spans: ["note to ai"],
        },
      }),
    );
    expect(merged.extract.vendor_name_candidates).toEqual(["Acme AI"]);
    expect(merged.extract.domains).toEqual(["acmeai.example.com"]);
    expect(merged.extract.sender_email).toBeNull();
    expect(merged.extract.state_mentioned).toBeNull();
    expect(merged.extract.urgency_language).toEqual([]);
    expect(merged.extract.injection_screen.injection_suspected).toBe(false);
  });

  it("site people and customers append after pitch entries, deduped, with counts", () => {
    const merged = mergeExtracts(
      extractOf({
        people: [{ name: "Jane Rivera", title: "CEO" }],
        named_customers: ["Littleton, CO"],
      }),
      extractOf({
        people: [
          { name: "Jane Rivera", title: "Chief Executive" },
          { name: "Omar Haddad", title: "CTO" },
        ],
        named_customers: ["Littleton, CO", "Suisun City", "1,600 governments"],
      }),
    );
    expect(merged.extract.people.map((p) => p.name)).toEqual([
      "Jane Rivera",
      "Omar Haddad",
    ]);
    expect(merged.extract.named_customers).toEqual(["Littleton, CO", "Suisun City"]);
    expect(merged.pitch_person_count).toBe(1);
    expect(merged.pitch_customer_count).toBe(1);
  });

  it("site performance claims never merge; compliance and team claims do, id-namespaced", () => {
    const merged = mergeExtracts(
      extractOf({}),
      extractOf({
        claims: [
          { id: "c1", type: "performance", quote: "99% accuracy guaranteed.", subject: null },
          { id: "c2", type: "compliance", quote: "FedRAMP Authorized.", subject: null },
          { id: "c3", type: "team", quote: "Founded by Jane Rivera.", subject: "Jane Rivera" },
        ],
      }),
    );
    expect(merged.extract.claims.map((c) => c.id)).toEqual(["site-c2", "site-c3"]);
    expect(merged.site_claim_quotes).toEqual([
      "FedRAMP Authorized.",
      "Founded by Jane Rivera.",
    ]);
  });

  it("site customers cap at 6", () => {
    const merged = mergeExtracts(
      extractOf({}),
      extractOf({
        named_customers: [
          "Alpha County",
          "Beta County",
          "Gamma County",
          "Delta County",
          "Epsilon County",
          "Zeta County",
          "Eta County",
        ],
      }),
    );
    expect(merged.extract.named_customers).toHaveLength(6);
  });
});

describe("pitch-origin aggregates in assembly", () => {
  const base = (extract: PitchExtract, counts: { p?: number; c?: number }) => ({
    extract,
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
    pitch_person_count: counts.p,
    pitch_customer_count: counts.c,
    generated_at: "2026-08-28T00:00:00.000Z",
  });

  it("site-derived people never trigger the leadership aggregate", () => {
    /* Zero pitch people, three site people, none corroborated: rows exist,
       no finding. */
    const out = assemble(
      base(
        extractOf({
          people: [
            { name: "Jane Rivera", title: "CEO" },
            { name: "Omar Haddad", title: "CTO" },
            { name: "Priya Nathan", title: "COO" },
          ],
        }),
        { p: 0 },
      ),
    );
    expect(out.ledger.filter((r) => r.methodology_ref === "d5-1")).toHaveLength(3);
    expect(out.tierInputs.findings.find((f) => f.id === "leadership")).toBeUndefined();
  });

  it("site-derived customers never trigger the customers aggregate", () => {
    const out = assemble(
      base(
        extractOf({ named_customers: ["Alpha County", "Beta County"] }),
        { c: 0 },
      ),
    );
    expect(out.ledger.filter((r) => r.methodology_ref === "d2-4")).toHaveLength(2);
    expect(out.tierInputs.findings.find((f) => f.id === "customers")).toBeUndefined();
  });

  it("pitch-origin thresholds still fire when the pitch named them", () => {
    const out = assemble(
      base(
        extractOf({
          people: [
            { name: "Jane Rivera", title: "CEO" },
            { name: "Omar Haddad", title: "CTO" },
            { name: "Priya Nathan", title: "COO" },
          ],
          named_customers: ["Alpha County"],
        }),
        { p: 3, c: 1 },
      ),
    );
    expect(out.tierInputs.findings.find((f) => f.id === "leadership")?.severity).toBe("HIGH");
    expect(out.tierInputs.findings.find((f) => f.id === "customers")?.severity).toBe("HIGH");
  });
});

describe("isDegenerateExtract: the thin-extract retry trigger", () => {
  const empty = {
    vendor_name_candidates: ["Acme AI"],
    domains: [],
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
  };

  it("a long pitch that produced nothing is degenerate", () => {
    expect(isDegenerateExtract(empty, 5000)).toBe(true);
  });

  it("a short input that produced nothing is not (nothing to extract)", () => {
    expect(isDegenerateExtract(empty, 120)).toBe(false);
  });

  it("any claim, person, or customer makes it non-degenerate", () => {
    expect(
      isDegenerateExtract(
        {
          ...empty,
          claims: [{ id: "c1", type: "identity", quote: "founded in 2020", subject: null }],
        },
        5000,
      ),
    ).toBe(false);
    expect(
      isDegenerateExtract({ ...empty, people: [{ name: "A B", title: "CEO" }] }, 5000),
    ).toBe(false);
    expect(
      isDegenerateExtract({ ...empty, named_customers: ["Franklin County"] }, 5000),
    ).toBe(false);
  });
});
