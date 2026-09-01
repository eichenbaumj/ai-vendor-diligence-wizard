/*
  Tests for the two deterministic vocabulary findings in assemble.ts:

  - model-transparency (methodology D4.1): a pitch selling capability
    (performance or availability claims) with no model disclosure anywhere
    in the claim quotes or use-case description gets a MEDIUM finding and
    the gap-model-transparency question.
  - automation (methodology D4.3): an unqualified full-automation phrase in
    a claim quote gets a MEDIUM finding and the gap-automation staffing
    question.

  Both are MEDIUM and must never move the tier.
*/
import { describe, expect, it } from "vitest";
import { assemble, type AssembleInput } from "@shared/assemble.ts";
import { computeTier } from "@shared/tier.ts";
import type { Claim, PitchExtract } from "@shared/schemas.ts";

const AT = "2026-08-28T00:00:00.000Z";

function claim(id: string, type: Claim["type"], quote: string): Claim {
  return { id, type, quote, subject: null };
}

function makeInput(
  claims: Claim[],
  useCase = "Automated intake triage for county service requests.",
): AssembleInput {
  return {
    extract: {
      vendor_name_candidates: ["Acme AI"],
      domains: ["acmeai.example.com"],
      addresses: [],
      sender_email: null,
      people: [],
      named_customers: [],
      claims,
      use_case_description: useCase,
      urgency_language: [],
      state_mentioned: null,
      injection_screen: {
        injection_suspected: false,
        addressed_to_ai: false,
        suspicious_spans: [],
      },
    } satisfies PitchExtract,
    checks: [],
    identity: { identity_resolved: true, identifiers_found: ["co_sos", "edgar_fts"] },
    citations: [],
    adv_findings: [],
    sector: { pack_ids: [], elevated: false, overlay_reason: null, state_items: [] },
    packs: {},
    resolvable: true,
    research_partial: false,
    generated_at: AT,
  };
}

const findingIds = (out: ReturnType<typeof assemble>) =>
  out.tierInputs.findings.map((f) => f.id);

describe("model-transparency finding (D4.1)", () => {
  it("fires MEDIUM on a performance claim with no model vocabulary anywhere", () => {
    const out = assemble(
      makeInput([claim("c1", "performance", "Cuts processing time by 40 percent.")]),
    );
    const f = out.tierInputs.findings.find((x) => x.id === "model-transparency");
    expect(f).toBeDefined();
    expect(f?.severity).toBe("MEDIUM");
    expect(f?.dimension).toBe("D4");
    expect(out.questions.some((q) => q.id === "gap-model-transparency")).toBe(true);
  });

  it("fires on an availability claim too", () => {
    const out = assemble(
      makeInput([claim("c1", "availability", "Live today in twelve counties.")]),
    );
    expect(findingIds(out)).toContain("model-transparency");
  });

  it("does not fire when a claim discloses commercial foundation models", () => {
    const out = assemble(
      makeInput([
        claim("c1", "performance", "Cuts processing time by 40 percent."),
        claim("c2", "identity", "Built on commercial foundation models."),
      ]),
    );
    expect(findingIds(out)).not.toContain("model-transparency");
    expect(out.questions.some((q) => q.id === "gap-model-transparency")).toBe(false);
  });

  it("does not fire when the use_case_description discloses the models", () => {
    const out = assemble(
      makeInput(
        [claim("c1", "performance", "Cuts processing time by 40 percent.")],
        "Intake triage built on commercial foundation models.",
      ),
    );
    expect(findingIds(out)).not.toContain("model-transparency");
  });

  it("does not fire without a capability claim, even with no model vocabulary", () => {
    const out = assemble(
      makeInput([claim("c1", "identity", "Founded in 2019 in Ohio.")]),
    );
    expect(findingIds(out)).not.toContain("model-transparency");
  });
});

describe("automation finding (D4.3)", () => {
  it("fires MEDIUM on a full-automation phrase in a claim quote", () => {
    const out = assemble(
      makeInput([
        claim("c1", "availability", "The intake workflow is fully automated from day one."),
      ]),
    );
    const f = out.tierInputs.findings.find((x) => x.id === "automation");
    expect(f).toBeDefined();
    expect(f?.severity).toBe("MEDIUM");
    expect(f?.dimension).toBe("D4");
    expect(out.questions.some((q) => q.id === "gap-automation")).toBe(true);
  });

  it("fires on 'no human intervention' phrasing", () => {
    const out = assemble(
      makeInput([
        claim("c1", "performance", "Requests are resolved with no human intervention."),
      ]),
    );
    expect(findingIds(out)).toContain("automation");
  });

  it("does not fire on qualified automation language", () => {
    const out = assemble(
      makeInput([
        claim("c1", "performance", "Automates routine steps with staff review of every decision."),
      ]),
    );
    expect(findingIds(out)).not.toContain("automation");
  });
});

describe("both findings are tier-neutral", () => {
  it("computeTier is identical with and without them when no other HIGH findings exist", () => {
    const out = assemble(
      makeInput([
        claim("c1", "performance", "Cuts processing time by 40 percent."),
        claim("c2", "availability", "The workflow is fully automated end to end."),
      ]),
    );
    const ids = findingIds(out);
    expect(ids).toContain("model-transparency");
    expect(ids).toContain("automation");

    const withFindings = computeTier(out.tierInputs);
    const withoutFindings = computeTier({
      ...out.tierInputs,
      findings: out.tierInputs.findings.filter(
        (f) => f.id !== "model-transparency" && f.id !== "automation",
      ),
    });
    expect(withFindings).toEqual(withoutFindings);
    expect(withFindings.tier).toBe(3);
  });
});
