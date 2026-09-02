/*
  composeReport and applyReview (methodology 1.7): the pure seams that
  turn the decided skeleton and the model narrative into the Report.
  Pinned: green flags are byte-equal to the code template; a narrative
  naming an uncredited company loses that sentence and never the tier;
  the review can never remove an adverse, contradicted, official-record,
  or identity row, and its replacement text passes the same screens.
*/
import { describe, expect, it } from "vitest";
import { assemble, type AssembleInput } from "@shared/assemble.ts";
import { computeTier } from "@shared/tier.ts";
import { lintObject } from "@shared/lint.ts";
import { buildSynthesisGuard } from "@shared/synthesis-guard.ts";
import {
  applyReview,
  composeReport,
  defaultSummary,
  renderGreenFlag,
  reviewInputOf,
  reviewTimeoutMs,
  type Narrative,
} from "@shared/pipeline-tail.ts";
import type { PitchExtract, RegistryCheck, Report } from "@shared/schemas.ts";

const AT = "2026-09-01T00:00:00.000Z";

function extractWith(over: Partial<PitchExtract> = {}): PitchExtract {
  return {
    vendor_name_candidates: ["Ironclad"],
    domains: ["ironcladapp.com"],
    addresses: [],
    sender_email: null,
    people: [],
    named_customers: [],
    claims: [],
    use_case_description: "Contract management for local government.",
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
    evidence_url: "https://example.gov/record",
    confidence: "exact",
    retrieved_at: AT,
    data: null,
    ...over,
  };
}

const checks: RegistryCheck[] = [
  check({
    check_id: "sos_tx",
    source: "Texas Comptroller Active Franchise Taxpayers (data.texas.gov)",
    evidence_url: "https://data.texas.gov/x",
    attribution: "attributed",
    data: {
      matches: [
        { name: "IRONCLAD CONSTRUCTION GROUP LLC", confidence: "name_similarity", containment: "query_in_record", status: "ACTIVE" },
        { name: "IRONCLAD, INC.", confidence: "exact", status: "ACTIVE", date: "2016-01-01" },
      ],
    },
  }),
  check({
    check_id: "edgar_fts",
    source: "SEC EDGAR full-text search",
    evidence_url: "https://efts.sec.gov/x",
    attribution: "attributed",
    data: { filing_entities: [{ name: "Ironclad, Inc.", cik: "1", inc_state: "DE", confidence: "exact" }] },
  }),
];

function build(narrative: Narrative | null, over: Partial<AssembleInput> = {}) {
  const input: AssembleInput = {
    extract: extractWith(),
    checks,
    identity: {
      identity_resolved: true,
      identifiers_found: ["Texas Comptroller Active Franchise Taxpayers (data.texas.gov): registration record", "SEC EDGAR filing"],
    },
    citations: [],
    adv_findings: [],
    sector: { pack_ids: [], elevated: false, overlay_reason: null, state_items: [] },
    packs: {},
    resolvable: true,
    research_partial: false,
    generated_at: AT,
    ...over,
  };
  const skeleton = assemble(input);
  const decision = computeTier(skeleton.tierInputs);
  const guard = buildSynthesisGuard({
    checks: input.checks,
    extract: input.extract,
    vendorName: "Ironclad",
    greenFlagFacts: skeleton.greenFlagFacts,
    ranStates: ["TEXAS"],
  });
  const report = composeReport({
    skeleton,
    decision,
    narrative,
    guard,
    checks: input.checks,
    citations: input.citations,
    adv: [],
    sector: input.sector,
    vendorName: "Ironclad",
    vendorKey: "ironcladapp.com",
    inputKind: "name",
    generatedAt: AT,
    researchPartial: false,
  });
  return { skeleton, decision, guard, report };
}

const cleanNarrative: Narrative = {
  verdict_summary: "Ironclad, Inc. is registered in Texas and files with the SEC. What remains is product diligence.",
  row_notes: [],
  next_steps: ["Send the question pack before the demo.", "Complete the manual checks below."],
};

const namesakeNarrative: Narrative = {
  verdict_summary:
    "Ironclad, Inc. is registered in Texas and files with the SEC. The Texas record shows IRONCLAD CONSTRUCTION GROUP LLC as the operating entity. What remains is product diligence.",
  row_notes: [{ id: "identity", note: "Texas lists IRONCLAD CONSTRUCTION GROUP LLC as the vendor." }],
  next_steps: ["Ask IRONCLAD CONSTRUCTION GROUP LLC for its W-9.", "Complete the manual checks below."],
};

describe("composeReport", () => {
  it("renders green flags byte-equal to the code template, whatever the narrative held", () => {
    const { skeleton, report } = build(cleanNarrative);
    expect(report.green_flags).toEqual(skeleton.greenFlagFacts.map(renderGreenFlag));
    expect(report.green_flags.length).toBeGreaterThan(0);
    expect(report.green_flags[0]).toMatch(/\(.*, checked 2026-09-01\)\.$/);
    /* A stray green_flags field on the narrative is ignored by type and by
       construction: the composed flags never read the narrative. */
    const stray = build({ ...cleanNarrative, green_flags: ["Ironclad is FedRAMP authorized"] } as unknown as Narrative);
    expect(stray.report.green_flags).toEqual(report.green_flags);
  });

  it("drops the sentences that name an uncredited company and keeps the rest; the identity note stays the code template", () => {
    const { report } = build(namesakeNarrative);
    expect(report.verdict.summary).toBe(
      "Ironclad, Inc. is registered in Texas and files with the SEC. What remains is product diligence.",
    );
    const identity = report.ledger.find((r) => r.id === "identity")!;
    expect(identity.note).toContain("lists IRONCLAD, INC.");
    expect(identity.note).not.toContain("CONSTRUCTION");
    expect(report.next_steps).toEqual(["Complete the manual checks below."]);
    expect(JSON.stringify(report)).not.toContain("CONSTRUCTION GROUP");
  });

  it("falls back to the tier template when nothing in the summary survives", () => {
    const { report, decision } = build({
      verdict_summary: "IRONCLAD CONSTRUCTION GROUP LLC is the vendor.",
      row_notes: [],
      next_steps: [],
    });
    expect(report.verdict.summary).toBe(defaultSummary(decision.tier));
    expect(report.next_steps.length).toBeGreaterThan(0);
  });

  it("twin: the injected sentence changes no tier input, row id, severity, result, or question", () => {
    const clean = build(cleanNarrative);
    const injected = build(namesakeNarrative);
    expect(injected.report.verdict.tier).toBe(clean.report.verdict.tier);
    expect(injected.report.verdict.rationale).toEqual(clean.report.verdict.rationale);
    expect(injected.report.ledger.map((r) => [r.id, r.severity, r.result])).toEqual(
      clean.report.ledger.map((r) => [r.id, r.severity, r.result]),
    );
    expect(injected.report.questions.map((q) => q.id)).toEqual(clean.report.questions.map((q) => q.id));
    expect(injected.report.green_flags).toEqual(clean.report.green_flags);
  });

  it("adds the collision row only when asked, after the tier, and never to the tier inputs", () => {
    const { report } = build(cleanNarrative);
    expect(report.honesty_panel.some((h) => h.check_id === "name_collision")).toBe(false);
    const withRow = (() => {
      const skeletonInput: AssembleInput = {
        extract: extractWith(),
        checks,
        identity: { identity_resolved: true, identifiers_found: ["a", "b"] },
        citations: [],
        adv_findings: [],
        sector: { pack_ids: [], elevated: false, overlay_reason: null, state_items: [] },
        packs: {},
        resolvable: true,
        research_partial: false,
        generated_at: AT,
      };
      const skeleton = assemble(skeletonInput);
      const decision = computeTier(skeleton.tierInputs);
      const guard = buildSynthesisGuard({ checks, extract: skeletonInput.extract, vendorName: "Ironclad", greenFlagFacts: skeleton.greenFlagFacts, ranStates: [] });
      return composeReport({
        skeleton, decision, narrative: cleanNarrative, guard, checks, citations: [], adv: [],
        sector: skeletonInput.sector, vendorName: "Ironclad", vendorKey: "ironclad", inputKind: "name",
        generatedAt: AT, researchPartial: false, namesakeRecords: 3, nameCollision: true,
      });
    })();
    const row = withRow.honesty_panel.find((h) => h.check_id === "name_collision");
    expect(row?.status).toBe("flag");
    expect(row?.reason).toContain("At least 3 registry records");
    expect(withRow.meta.namesake_records).toBe(3);
    expect(withRow.verdict.tier).toBe(report.verdict.tier);
    expect(withRow.verdict.rationale).toEqual(report.verdict.rationale);
  });

  it("stamps the assessed domain and its source into meta, and parses without them", async () => {
    const { report } = build(cleanNarrative);
    expect(report.meta.assessed_domain).toBeNull();
    expect(report.meta.domain_source).toBeNull();
    const { Report } = await import("@shared/schemas.ts");
    const { meta, ...rest } = report;
    const { assessed_domain: _a, domain_source: _b, ...oldMeta } = meta;
    expect(Report.safeParse({ ...rest, meta: oldMeta }).success).toBe(true);
    expect(Report.safeParse({ ...rest, meta: { ...oldMeta, assessed_domain: "acmegov.com", domain_source: "submitted" } }).success).toBe(true);
  });

  it("is lint-clean and schema-valid", async () => {
    const { report } = build(namesakeNarrative);
    expect(lintObject(report).filter((v) => v.kind === "banned")).toEqual([]);
    const { Report } = await import("@shared/schemas.ts");
    expect(Report.safeParse(report).success).toBe(true);
  });
});

describe("the review's allowance and input (methodology 1.7)", () => {
  it("gives the review up to 60s when the clock allows and never less than 20s", () => {
    expect(reviewTimeoutMs({})).toBe(60_000);
    expect(reviewTimeoutMs({ s1_extract: 20_000, s2_registry: 60_000, s3_research: 200_000, s5_structure: 15_000 })).toBe(60_000);
    /* 340s spent: 400 - 12 - 340 = 48s. */
    expect(reviewTimeoutMs({ a: 340_000 })).toBe(48_000);
    /* Out of time: the floor. */
    expect(reviewTimeoutMs({ a: 390_000 })).toBe(20_000);
    expect(reviewTimeoutMs({ a: Number.NaN })).toBe(60_000);
  });

  it("hands the review the surfaces it may act on and drops the research lists", () => {
    const { report } = build(cleanNarrative);
    const input = reviewInputOf(report) as Record<string, unknown>;
    expect(Object.keys(input).sort()).toEqual(
      ["adv_findings", "green_flags", "honesty_panel", "input_kind", "ledger", "next_steps", "vendor_display_name", "verdict"].sort(),
    );
    expect("sources" in input).toBe(false);
    expect("leads" in input).toBe(false);
    expect("questions" in input).toBe(false);
    const rows = input.ledger as { id: string; source_titles: string[] }[];
    expect(rows.map((r) => r.id)).toEqual(report.ledger.map((r) => r.id));
    expect(JSON.stringify(input).length).toBeLessThan(JSON.stringify(report).length);
  });
});

describe("applyReview", () => {
  function reportWithRows(): { report: Report; guard: ReturnType<typeof buildSynthesisGuard> } {
    const { report, guard } = build(cleanNarrative);
    report.ledger.push(
      {
        id: "dissolved-example",
        dimension: "D1",
        claim_quote: null,
        what_checked: "x",
        result: "OFFICIAL_RECORD_FOUND",
        evidence_tier: "T1",
        severity: "CRITICAL",
        sources: [],
        note: "An official record shows a dissolution.",
        methodology_ref: "d1-1",
      },
      {
        id: "cust-example",
        dimension: "D2",
        claim_quote: "City of Example uses it",
        what_checked: "x",
        result: "COULD_NOT_VERIFY",
        evidence_tier: "T4",
        severity: "MEDIUM",
        sources: [],
        note: "We could not verify this customer.",
        methodology_ref: "d2-4",
      },
      {
        id: "fedramp_marketplace",
        dimension: "D3",
        claim_quote: "FedRAMP authorized",
        what_checked: "x",
        result: "CONTRADICTED",
        evidence_tier: "T1",
        severity: "HIGH",
        sources: [],
        note: "The feed does not list it.",
        methodology_ref: "d3-1",
      },
    );
    return { report, guard };
  }

  it("never removes adverse, contradicted, official-record, or identity rows; removes a medium could-not-verify row", () => {
    const { report, guard } = reportWithRows();
    applyReview(
      report,
      {
        approved: false,
        issues: [
          { kind: "misread_evidence", target_row_id: "dissolved-example", explanation: "x", replacement_note: null },
          { kind: "misread_evidence", target_row_id: "fedramp_marketplace", explanation: "x", replacement_note: null },
          { kind: "misread_evidence", target_row_id: "identity", explanation: "x", replacement_note: null },
          { kind: "misread_evidence", target_row_id: "cust-example", explanation: "secret model text", replacement_note: null },
        ],
        verdict_summary_rewrite: null,
      },
      guard,
    );
    const ids = report.ledger.map((r) => r.id);
    expect(ids).toContain("dissolved-example");
    expect(ids).toContain("fedramp_marketplace");
    expect(ids).toContain("identity");
    expect(ids).not.toContain("cust-example");
    expect(report.review?.reviewed).toBe(true);
    expect(JSON.stringify(report.review)).not.toContain("secret model text");
  });

  it("accepts replacement text only when it is lint-clean and names no uncredited company", () => {
    const { report, guard } = reportWithRows();
    applyReview(
      report,
      {
        approved: false,
        issues: [
          { kind: "overclaim", target_row_id: "cust-example", explanation: "x", replacement_note: "We searched public sources on September 1, 2026 and did not find this customer. Not finding a record is not proof the claim is false." },
          { kind: "overclaim", target_row_id: "fedramp_marketplace", explanation: "x", replacement_note: "The listing belongs to IRONCLAD CONSTRUCTION GROUP LLC." },
        ],
        verdict_summary_rewrite: "IRONCLAD CONSTRUCTION GROUP LLC checked out.",
      },
      guard,
    );
    expect(report.ledger.find((r) => r.id === "cust-example")!.note).toContain("did not find this customer");
    expect(report.ledger.find((r) => r.id === "fedramp_marketplace")!.note).toBe("The feed does not list it.");
    expect(report.verdict.summary).not.toContain("CONSTRUCTION");
  });
});
