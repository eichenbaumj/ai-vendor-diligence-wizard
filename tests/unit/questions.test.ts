/*
  Tests for the question engine (selectQuestions in _shared/questions.ts).

  Every pack here is SYNTHETIC — built inline, never read from packs.gen.ts —
  so pack-annotation work cannot move these assertions. Pack ids reuse the
  real PackId enum values ("call-center", "document-processing", ...) because
  SectorContext.pack_ids is enum-typed, but the pack CONTENT is invented.

  Findings are synthetic typed pipeline signals: the engine reads only
  f.id / f.dimension / f.severity / f.resolved, so tests may label a finding
  with whatever dimension exercises the rule under test.
*/
import { describe, expect, it } from "vitest";
import {
  selectQuestions,
  type QuestionSelectionInput,
} from "@shared/questions.ts";
import type { Finding } from "@shared/tier.ts";
import type {
  PackQuestion,
  QuestionSelect,
  SectorPack,
} from "@shared/packs-types.ts";
import type { PitchExtract, SectorContext, VerdictTier } from "@shared/schemas.ts";

/* ------------------------------------------------------------- factories */

const CORE_IDS = [
  "core-data-training",
  "core-export",
  "core-references",
  "core-breach",
  "core-pricing",
];

function pq(
  id: string,
  select?: QuestionSelect,
  extra?: Partial<Omit<PackQuestion, "id" | "select">>,
): PackQuestion {
  return {
    id,
    question: `Question text for ${id}?`,
    good_answer: `A named artifact answering ${id}.`,
    red_flag: `No artifact exists for ${id}.`,
    source_url: null,
    ...(select ? { select } : {}),
    ...extra,
  };
}

function makePack(
  pack_id: string,
  questions: PackQuestion[],
  overrides?: Partial<SectorPack>,
): SectorPack {
  return {
    pack_id,
    pack_name: `${pack_id} Synthetic`,
    definition: "Synthetic pack for engine tests.",
    inclusion_test: ["Is this a test?"],
    scrutiny_tier: "standard",
    incumbent_landscape: "",
    established_vendors: [],
    failure_modes: [],
    skepticism_triggers: [],
    diligence_questions: questions,
    elevated_scrutiny_rules: [],
    reference_deployments: [],
    registries_to_check: [],
    legal_context: "",
    realistic_pricing: "",
    last_updated: "2026-08-01",
    refresh_cadence: "quarterly",
    known_gaps: "",
    ...overrides,
  };
}

function makeExtract(overrides?: Partial<PitchExtract>): PitchExtract {
  return {
    vendor_name_candidates: ["Acme AI"],
    domains: ["acmeai.example.com"],
    addresses: [],
    sender_email: null,
    people: [],
    named_customers: [],
    claims: [],
    use_case_description: "Resident service assistant for local government.",
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

function makeSector(overrides?: Partial<SectorContext>): SectorContext {
  return {
    pack_ids: [],
    elevated: false,
    overlay_reason: null,
    state_items: [],
    ...overrides,
  };
}

function finding(
  id: string,
  dimension: string,
  severity: Finding["severity"] = "HIGH",
  resolved = false,
): Finding {
  return { id, dimension, severity, resolved, detail: `Detail for ${id}.` };
}

function makeInput(
  overrides?: Partial<QuestionSelectionInput>,
): QuestionSelectionInput {
  return {
    findings: [],
    extract: makeExtract(),
    sector: makeSector(),
    packs: {},
    tier: 3 as VerdictTier,
    t4_dimensions: [],
    namedCustomers: [],
    ...overrides,
  };
}

function ids(qs: ReturnType<typeof selectQuestions>): string[] {
  return qs.map((q) => q.id);
}

/* --------------------------------------------------------- legacy packs */

describe("legacy packs (no select metadata anywhere)", () => {
  it("ships the first five questions as the base slate at tier 3", () => {
    const pack = makePack(
      "call-center",
      Array.from({ length: 7 }, (_, i) => pq(`cc-q0${i + 1}`)),
    );
    const out = selectQuestions(
      makeInput({
        sector: makeSector({ pack_ids: ["call-center"] }),
        packs: { "call-center": pack },
      }),
    );
    const got = ids(out);
    for (const id of ["cc-q01", "cc-q02", "cc-q03", "cc-q04", "cc-q05"]) {
      expect(got).toContain(id);
    }
    expect(got).not.toContain("cc-q06");
    expect(got).not.toContain("cc-q07");
    const first = out.find((q) => q.id === "cc-q01");
    expect(first?.why).toContain("A standard question for");
    /* Pack names render as authored (title case), not lowercased. */
    expect(first?.why).toContain("call-center Synthetic vendors");
    expect(first?.source).toBe("pack");
  });

  it("base:true annotations replace the file-order fallback", () => {
    const pack = makePack("call-center", [
      pq("cc-q01"),
      pq("cc-q02"),
      pq("cc-q03"),
      pq("cc-q04"),
      pq("cc-q05"),
      pq("cc-q06", { base: true }),
    ]);
    const out = selectQuestions(
      makeInput({
        sector: makeSector({ pack_ids: ["call-center"] }),
        packs: { "call-center": pack },
      }),
    );
    const got = ids(out);
    expect(got).toContain("cc-q06");
    for (const id of ["cc-q01", "cc-q02", "cc-q03", "cc-q04", "cc-q05"]) {
      expect(got).not.toContain(id);
    }
  });
});

/* ------------------------------------------------------------- triggers */

describe("pack question triggers", () => {
  const triggerPack = makePack("call-center", [
    pq("cc-perf", { claim_types: ["performance"] }),
    pq("cc-find", { finding_ids: ["perf-*"] }),
    pq("cc-excl", { finding_ids: ["excl"] }),
    pq("cc-elev", { elevated: true }),
  ]);

  const withPack = (over?: Partial<QuestionSelectionInput>) =>
    makeInput({
      sector: makeSector({ pack_ids: ["call-center"] }),
      packs: { "call-center": triggerPack },
      ...over,
    });

  it("a performance claim fires the claim_types question with the claim why", () => {
    const out = selectQuestions(
      withPack({
        extract: makeExtract({
          claims: [
            {
              id: "c1",
              type: "performance",
              quote: "Cuts processing time by 40 percent.",
              subject: null,
            },
          ],
        }),
      }),
    );
    const q = out.find((x) => x.id === "cc-perf");
    expect(q).toBeDefined();
    expect(q?.why).toContain("makes a performance claim");
  });

  it("no claim of the listed type means the question does not fire", () => {
    const out = selectQuestions(
      withPack({
        extract: makeExtract({
          claims: [
            { id: "c1", type: "pricing", quote: "Costs $10 a seat.", subject: null },
          ],
        }),
      }),
    );
    expect(ids(out)).not.toContain("cc-perf");
  });

  it("finding_ids with a perf-* prefix matches an unresolved perf-<id> finding", () => {
    const out = selectQuestions(
      withPack({ findings: [finding("perf-c9", "D6", "HIGH")] }),
    );
    const q = out.find((x) => x.id === "cc-find");
    expect(q).toBeDefined();
    expect(q?.why).toContain("follows up a gap flagged in the report above");
  });

  it("an exact finding_ids selector matches its finding", () => {
    const out = selectQuestions(
      withPack({ findings: [finding("excl", "D1", "CRITICAL")] }),
    );
    expect(ids(out)).toContain("cc-excl");
  });

  it("a resolved finding fires nothing: no pack trigger, no gap question", () => {
    const out = selectQuestions(
      withPack({
        findings: [
          finding("perf-c9", "D6", "HIGH", true),
          finding("excl", "D1", "CRITICAL", true),
        ],
      }),
    );
    const got = ids(out);
    expect(got).not.toContain("cc-find");
    expect(got).not.toContain("cc-excl");
    expect(got).not.toContain("gap-excl");
    expect(got).not.toContain("perf-c9");
  });

  it("the elevated trigger fires only when sector.elevated", () => {
    const flat = selectQuestions(withPack());
    expect(ids(flat)).not.toContain("cc-elev");
    const elevated = selectQuestions(
      withPack({
        sector: makeSector({ pack_ids: ["call-center"], elevated: true }),
      }),
    );
    const q = elevated.find((x) => x.id === "cc-elev");
    expect(q).toBeDefined();
    expect(q?.why).toContain("Added under elevated scrutiny");
  });

  it("triggered questions order by weight descending, then file order", () => {
    const pack = makePack("call-center", [
      pq("cc-w0", { claim_types: ["performance"] }),
      pq("cc-w5", { claim_types: ["performance"], weight: 5 }),
      pq("cc-w1", { claim_types: ["performance"], weight: 1 }),
    ]);
    const out = selectQuestions(
      makeInput({
        sector: makeSector({ pack_ids: ["call-center"] }),
        packs: { "call-center": pack },
        extract: makeExtract({
          claims: [
            { id: "c1", type: "performance", quote: "Handles 90 percent of calls.", subject: null },
          ],
        }),
      }),
    );
    const got = ids(out);
    expect(got.indexOf("cc-w5")).toBeLessThan(got.indexOf("cc-w1"));
    expect(got.indexOf("cc-w1")).toBeLessThan(got.indexOf("cc-w0"));
  });
});

/* ------------------------------------------------------- overlay merge */

describe("eligibility overlay merge (G2)", () => {
  const overlayQuestions = [
    pq("elig-ov1", { overlay_core: true }),
    pq("elig-ov2", { overlay_core: true }),
    pq("elig-ov3", { overlay_core: true }),
    pq("elig-ov4", { overlay_core: true }),
    pq("elig-other", { base: true }),
  ];
  const eligibility = makePack("eligibility-case-mgmt", overlayQuestions, {
    scrutiny_tier: "elevated",
  });
  const primary = makePack("call-center", [pq("cc-base", { base: true })]);
  const packs = { "call-center": primary, "eligibility-case-mgmt": eligibility };

  it("elevated + non-eligibility pack_ids merges all four overlay-core questions", () => {
    const out = selectQuestions(
      makeInput({
        sector: makeSector({ pack_ids: ["call-center"], elevated: true }),
        packs,
      }),
    );
    for (const id of ["elig-ov1", "elig-ov2", "elig-ov3", "elig-ov4"]) {
      const q = out.find((x) => x.id === id);
      expect(q, id).toBeDefined();
      expect(q?.why).toContain("decisions about individual residents");
    }
    /* The overlay merges overlay_core only, not the pack's base slate. */
    expect(ids(out)).not.toContain("elig-other");
  });

  it("decision_impact 'advisory' halves the dose to the first two", () => {
    const out = selectQuestions(
      makeInput({
        sector: makeSector({
          pack_ids: ["call-center"],
          elevated: true,
          decision_impact: "advisory",
        }),
        packs,
      }),
    );
    const got = ids(out);
    expect(got).toContain("elig-ov1");
    expect(got).toContain("elig-ov2");
    expect(got).not.toContain("elig-ov3");
    expect(got).not.toContain("elig-ov4");
  });

  it("decision_impact 'determinative' keeps the full dose", () => {
    const out = selectQuestions(
      makeInput({
        sector: makeSector({
          pack_ids: ["call-center"],
          elevated: true,
          decision_impact: "determinative",
        }),
        packs,
      }),
    );
    for (const id of ["elig-ov1", "elig-ov2", "elig-ov3", "elig-ov4"]) {
      expect(ids(out)).toContain(id);
    }
  });

  it("no overlay without elevated scrutiny", () => {
    const out = selectQuestions(
      makeInput({
        sector: makeSector({ pack_ids: ["call-center"], elevated: false }),
        packs,
      }),
    );
    expect(ids(out).filter((id) => id.startsWith("elig-ov"))).toHaveLength(0);
  });

  it("pack_ids including eligibility suppresses the overlay path with no duplicates", () => {
    const out = selectQuestions(
      makeInput({
        sector: makeSector({
          pack_ids: ["eligibility-case-mgmt", "call-center"],
          elevated: true,
        }),
        packs,
      }),
    );
    const got = ids(out);
    /* Every id appears at most once. */
    expect(new Set(got).size).toBe(got.length);
    /* The overlay why never appears when the pack is matched directly. */
    expect(out.some((q) => q.why.includes("decisions about individual residents"))).toBe(false);
    /* The matched eligibility pack still contributes its base slate. */
    expect(got).toContain("elig-other");
  });
});

/* --------------------------------------------------------- tier gating */

describe("tier conditioning", () => {
  it("a tiers:[4] question ships at tier 4 but not tier 3", () => {
    const pack = makePack("call-center", [
      pq("cc-contract", { base: true, tiers: [4] }),
      pq("cc-any", { base: true }),
    ]);
    const base = {
      sector: makeSector({ pack_ids: ["call-center"] as SectorContext["pack_ids"] }),
      packs: { "call-center": pack },
    };
    const atThree = selectQuestions(makeInput({ ...base, tier: 3 }));
    expect(ids(atThree)).not.toContain("cc-contract");
    expect(ids(atThree)).toContain("cc-any");
    const atFour = selectQuestions(makeInput({ ...base, tier: 4 }));
    expect(ids(atFour)).toContain("cc-contract");
  });

  for (const tier of [0, 1] as const) {
    it(`tier ${tier}: no pack questions, no governance; gap + T4 + core only`, () => {
      const pack = makePack("call-center", [
        pq("cc-base", { base: true }),
        pq("cc-elev", { elevated: true }),
      ]);
      const out = selectQuestions(
        makeInput({
          tier,
          findings: [finding("email", "D1", "MEDIUM")],
          t4_dimensions: ["D3"],
          sector: makeSector({ pack_ids: ["call-center"], elevated: true }),
          packs: { "call-center": pack },
        }),
      );
      const got = ids(out);
      expect(out.some((q) => q.source === "pack")).toBe(false);
      expect(got).not.toContain("gap-governance");
      expect(got).toContain("gap-email");
      expect(got).toContain("t4-d3");
      for (const id of CORE_IDS) expect(got).toContain(id);
    });
  }

  it("gap-governance is present at tier 2 and absent at tier 1", () => {
    expect(ids(selectQuestions(makeInput({ tier: 2 })))).toContain("gap-governance");
    expect(ids(selectQuestions(makeInput({ tier: 1 })))).not.toContain("gap-governance");
  });
});

/* --------------------------------------------- G1 ordering and caps */

describe("gap question ordering and caps (G1)", () => {
  it("orders by severity: CRITICAL, then HIGH, then MEDIUM; LOW and INFO never ship", () => {
    const out = selectQuestions(
      makeInput({
        findings: [
          finding("cert-vocab", "D3", "MEDIUM"),
          finding("domain-age", "D2", "HIGH"),
          finding("excl", "D1", "CRITICAL"),
          finding("email", "D4", "LOW"),
          finding("leadership", "D5", "INFO"),
        ],
      }),
    );
    const got = ids(out);
    expect(got.indexOf("gap-excl")).toBeLessThan(got.indexOf("gap-domain-age"));
    expect(got.indexOf("gap-domain-age")).toBeLessThan(got.indexOf("gap-cert-vocab"));
    expect(got).not.toContain("gap-email");
    expect(got).not.toContain("gap-leadership");
  });

  it("the per-dimension cap preserves D6 perf questions against a registry stack", () => {
    /* Five HIGH registry findings stacked in D1 and D3: the per-dimension
       cap (2) admits only three of them, leaving room inside the gap cap
       (5) for BOTH D6 performance questions — the slice-before-match bug
       this rule fixed. Dimensions are synthetic signals. */
    const out = selectQuestions(
      makeInput({
        findings: [
          finding("excl", "D1", "HIGH"),
          finding("domain-age", "D1", "HIGH"),
          finding("email", "D1", "HIGH"),
          finding("cert-vocab", "D1", "HIGH"),
          finding("sourcewell", "D3", "HIGH"),
          finding("perf-a", "D6", "HIGH"),
          finding("perf-b", "D6", "HIGH"),
        ],
        extract: makeExtract({
          claims: [
            { id: "a", type: "performance", quote: "Resolves 80 percent of tickets.", subject: null },
            { id: "b", type: "performance", quote: "Saves 300 staff hours a month.", subject: null },
          ],
        }),
      }),
    );
    const got = ids(out);
    expect(got).toContain("perf-a");
    expect(got).toContain("perf-b");
    expect(got).toContain("gap-excl");
    expect(got).toContain("gap-domain-age");
    expect(got).toContain("gap-sourcewell");
    /* Third and fourth D1 findings fall to the per-dimension cap. */
    expect(got).not.toContain("gap-email");
    expect(got).not.toContain("gap-cert-vocab");
  });
});

/* ------------------------------------------------------- gap templates */

describe("gap templates: every finding id has one and it fires", () => {
  const cases: { id: string; questionId: string; extras?: Partial<QuestionSelectionInput> }[] = [
    { id: "excl", questionId: "gap-excl" },
    { id: "sourcewell", questionId: "gap-sourcewell" },
    { id: "leadership", questionId: "gap-leadership" },
    { id: "cert-vocab", questionId: "gap-cert-vocab" },
    { id: "email", questionId: "gap-email" },
    { id: "model-transparency", questionId: "gap-model-transparency" },
    { id: "automation", questionId: "gap-automation" },
    { id: "domain-age", questionId: "gap-domain-age" },
    { id: "txramp", questionId: "gap-txramp" },
    { id: "fedramp_marketplace", questionId: "gap-fedramp_marketplace" },
    { id: "govramp", questionId: "gap-govramp" },
    {
      id: "customers",
      questionId: "gap-customers",
      extras: { namedCustomers: ["Franklin County", "Marion County"] },
    },
    {
      id: "perf-c1",
      questionId: "perf-c1",
      extras: {
        extract: makeExtract({
          claims: [
            { id: "c1", type: "performance", quote: "Cuts call volume in half.", subject: null },
          ],
        }),
      },
    },
  ];

  for (const c of cases) {
    it(`${c.id} -> ${c.questionId}`, () => {
      const out = selectQuestions(
        makeInput({ findings: [finding(c.id, "D1", "MEDIUM")], ...c.extras }),
      );
      const q = out.find((x) => x.id === c.questionId);
      expect(q).toBeDefined();
      expect(q?.why.length).toBeGreaterThan(0);
      expect(q?.red_flag).toBeUndefined();
    });
  }

  it("gap-customers names the customers and asks for contract verification", () => {
    const out = selectQuestions(
      makeInput({
        findings: [finding("customers", "D2", "HIGH")],
        namedCustomers: ["Franklin County", "Marion County", "Union County", "Extra City"],
      }),
    );
    const q = out.find((x) => x.id === "gap-customers");
    expect(q?.text).toContain("Franklin County, Marion County, Union County");
    expect(q?.text).not.toContain("Extra City");
  });

  it("the perf template quotes the claim verbatim", () => {
    const out = selectQuestions(
      makeInput({
        findings: [finding("perf-c1", "D6", "HIGH")],
        extract: makeExtract({
          claims: [
            { id: "c1", type: "performance", quote: "Cuts call volume in half.", subject: null },
          ],
        }),
      }),
    );
    expect(out.find((x) => x.id === "perf-c1")?.text).toContain(
      "Cuts call volume in half.",
    );
  });

  it("a perf finding with no matching extract claim produces no question", () => {
    const out = selectQuestions(
      makeInput({ findings: [finding("perf-ghost", "D6", "HIGH")] }),
    );
    expect(ids(out)).not.toContain("perf-ghost");
  });
});

/* ------------------------------------------------------- budget and core */

describe("budget: core reserved, total capped", () => {
  it("three stuffed packs cannot crowd out the five core questions", () => {
    const stuffed = (prefix: string, packId: string) =>
      makePack(
        packId,
        Array.from({ length: 8 }, (_, i) => pq(`${prefix}-q${i}`, { base: true })),
      );
    const out = selectQuestions(
      makeInput({
        sector: makeSector({
          pack_ids: ["call-center", "document-processing", "data-analytics"],
        }),
        packs: {
          "call-center": stuffed("cc", "call-center"),
          "document-processing": stuffed("dp", "document-processing"),
          "data-analytics": stuffed("da", "data-analytics"),
        },
        extract: makeExtract({
          claims: [
            { id: "c1", type: "performance", quote: "Answers 70 percent of questions.", subject: null },
          ],
        }),
      }),
    );
    expect(out.length).toBeLessThanOrEqual(15);
    const got = ids(out);
    for (const id of CORE_IDS) expect(got).toContain(id);
    /* Primary pack caps at 6, secondaries at 3, non-core budget at 10. */
    expect(got.filter((id) => id.startsWith("cc-")).length).toBeLessThanOrEqual(6);
    expect(got.filter((id) => id.startsWith("dp-")).length).toBeLessThanOrEqual(3);
    expect(got.filter((id) => id.startsWith("da-")).length).toBeLessThanOrEqual(3);
    /* Non-core budget: everything except the five reserved core questions. */
    expect(out.filter((q) => !CORE_IDS.includes(q.id)).length).toBeLessThanOrEqual(10);
  });
});

/* ------------------------------------------------------------- T4 sweep */

describe("T4 sweep (G6)", () => {
  it("adds one consolidated document request per unverified dimension", () => {
    const out = selectQuestions(makeInput({ t4_dimensions: ["D4", "D3"] }));
    const got = ids(out);
    expect(got).toContain("t4-d3");
    expect(got).toContain("t4-d4");
  });

  it("caps at three, in sorted dimension order", () => {
    const out = selectQuestions(
      makeInput({ t4_dimensions: ["D6", "D4", "D2", "D1"] }),
    );
    const got = ids(out);
    expect(got).toContain("t4-d1");
    expect(got).toContain("t4-d2");
    expect(got).toContain("t4-d4");
    expect(got).not.toContain("t4-d6");
  });

  it("skips a dimension already covered by a G1 gap question", () => {
    const out = selectQuestions(
      makeInput({
        findings: [finding("email", "D1", "MEDIUM")],
        t4_dimensions: ["D1", "D2"],
      }),
    );
    const got = ids(out);
    expect(got).toContain("gap-email");
    expect(got).not.toContain("t4-d1");
    expect(got).toContain("t4-d2");
  });

  it("ignores dimensions without a template", () => {
    const out = selectQuestions(makeInput({ t4_dimensions: ["D7"] }));
    expect(ids(out).some((id) => id.startsWith("t4-"))).toBe(false);
  });
});

/* ------------------------------------------------- red_flag and prose */

describe("red_flag propagation and prose guards", () => {
  it("red_flag carries through from pack questions and is absent on templates", () => {
    const pack = makePack("call-center", [
      pq("cc-rf", { base: true }, { red_flag: "The vendor refuses to name a reference." }),
      pq("cc-norf", { base: true }, { red_flag: "" }),
    ]);
    const out = selectQuestions(
      makeInput({
        findings: [finding("email", "D1", "MEDIUM")],
        sector: makeSector({ pack_ids: ["call-center"] }),
        packs: { "call-center": pack },
      }),
    );
    expect(out.find((q) => q.id === "cc-rf")?.red_flag).toBe(
      "The vendor refuses to name a reference.",
    );
    expect(out.find((q) => q.id === "cc-norf")?.red_flag).toBeUndefined();
    expect(out.find((q) => q.id === "gap-email")?.red_flag).toBeUndefined();
    for (const id of CORE_IDS) {
      expect(out.find((q) => q.id === id)?.red_flag).toBeUndefined();
    }
  });

  it("caps why at 400 characters, trimmed to a complete sentence", () => {
    const longGood = `${"The answer names a deployment. ".repeat(20)}`.trim(); // ~620 chars
    const pack = makePack("call-center", [
      pq("cc-long", { base: true }, { good_answer: longGood }),
    ]);
    const out = selectQuestions(
      makeInput({
        sector: makeSector({ pack_ids: ["call-center"] }),
        packs: { "call-center": pack },
      }),
    );
    const why = out.find((q) => q.id === "cc-long")?.why ?? "";
    expect(why.length).toBeLessThanOrEqual(400);
    expect(/[.!?]["')\]]?$/.test(why)).toBe(true);
  });

  it("every emitted question satisfies the report schema caps", () => {
    const out = selectQuestions(
      makeInput({
        findings: [finding("excl", "D1", "CRITICAL")],
        t4_dimensions: ["D3"],
      }),
    );
    for (const q of out) {
      expect(q.text.length).toBeLessThanOrEqual(900);
      expect(q.why.length).toBeLessThanOrEqual(400);
      if (q.red_flag) expect(q.red_flag.length).toBeLessThanOrEqual(300);
    }
  });
});

/* ------------------------------------------------------------- dedup */

describe("dedup by id across groups", () => {
  it("the same question id in two packs ships once", () => {
    const a = makePack("call-center", [pq("shared-q", { base: true })]);
    const b = makePack("document-processing", [pq("shared-q", { base: true })]);
    const out = selectQuestions(
      makeInput({
        sector: makeSector({ pack_ids: ["call-center", "document-processing"] }),
        packs: { "call-center": a, "document-processing": b },
      }),
    );
    expect(ids(out).filter((id) => id === "shared-q")).toHaveLength(1);
  });

  it("no scenario emits duplicate ids", () => {
    const out = selectQuestions(
      makeInput({
        findings: [
          finding("excl", "D1", "CRITICAL"),
          finding("customers", "D2", "HIGH"),
        ],
        namedCustomers: ["Franklin County"],
        t4_dimensions: ["D1", "D2", "D3", "D4"],
        sector: makeSector({ pack_ids: ["call-center"], elevated: true }),
        packs: {
          "call-center": makePack("call-center", [
            pq("cc-b1", { base: true }),
            pq("cc-t1", { finding_ids: ["excl"] }),
          ]),
          "eligibility-case-mgmt": makePack("eligibility-case-mgmt", [
            pq("elig-ov1", { overlay_core: true }),
            pq("elig-ov2", { overlay_core: true }),
          ]),
        },
      }),
    );
    const got = ids(out);
    expect(new Set(got).size).toBe(got.length);
  });
});
