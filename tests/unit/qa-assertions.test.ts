/*
  Unit tests for the pure assertion engine. Cells are built from the
  fictional sample reports (src/lib/sample-reports.ts) so fixtures track the
  real Report shape; entries go through PanelEntry.parse so zod defaults
  apply exactly as they do for panel files on disk. Only the three original
  sample ids are enumerated, so new sample reports cannot break this suite.
*/
import { describe, expect, it } from "vitest";
import { SAMPLE_REPORTS } from "@/lib/sample-reports.ts";
import type { Report } from "@shared/schemas.ts";
import {
  evaluateExpectations,
  evaluateMonotonicPairs,
} from "../../scripts/lib/qa-assertions.ts";
import { PanelEntry } from "../../scripts/lib/qa-panel-schema.ts";
import type {
  AssertionResult,
  QaCell,
  QaMetrics,
} from "../../scripts/lib/qa-types.ts";

const meridian = SAMPLE_REPORTS.meridian; // tier 4, complete, no ADV
const swiftgov = SAMPLE_REPORTS.swiftgov; // tier 1
const claradocs = SAMPLE_REPORTS.claradocs; // tier 3

function metricsFrom(report: Report): QaMetrics {
  return {
    tier: report.verdict.tier,
    checks_met: report.verdict.checks_met,
    verified_rows: report.ledger.filter((r) => r.result === "VERIFIED").length,
    green_flags: report.green_flags.length,
    leads: report.leads?.length ?? 0,
    research_partial: report.meta.research_partial,
    searches: 18,
    est_cost_usd: 0.42,
    deep: false,
    deep_handoff_failed: false,
    adv_codes: report.adv_findings.map((f) => f.code),
    pack_ids: report.sector.pack_ids,
    question_ids: report.questions.map((q) => q.id),
    stages_ms: {},
  };
}

function cellFrom(
  report: Report,
  overrides: Partial<QaCell> = {},
  metricOverrides: Partial<QaMetrics> = {},
): QaCell {
  return {
    entry_id: "test-entry",
    input_kind: "paste",
    level: "L1",
    evaluation_id: "eval-1",
    terminal_source: "complete",
    error: null,
    wall_s: 120,
    metrics: { ...metricsFrom(report), ...metricOverrides },
    ledger_map: Object.fromEntries(
      report.ledger.map((r) => [
        r.id,
        {
          result: r.result,
          evidence_tier: r.evidence_tier,
          severity: r.severity,
          methodology_ref: r.methodology_ref,
        },
      ]),
    ),
    assertions: [],
    report_snapshot: report,
    retried: false,
    ...overrides,
  };
}

function makeEntry(
  expected: Record<string, unknown>,
  overrides: Record<string, unknown> = {},
): PanelEntry {
  return PanelEntry.parse({
    id: "test-entry",
    display_name: "Test Entry",
    category: "synthetic-control",
    visibility: "public",
    inputs: [{ input_kind: "paste", content: "pitch text", levels: ["L1"] }],
    expected: { status: "complete", ...expected },
    rationale: "Calibrated against three archived runs of the fixture report.",
    added: "2026-08-29",
    calibrated_against: {
      methodology_version: "1.0",
      runs: 3,
      last_calibrated: "2026-08-29",
    },
    expectations_status: "calibrated",
    ...overrides,
  });
}

function get(results: AssertionResult[], code: string): AssertionResult {
  const found = results.filter((r) => r.code === code);
  expect(found, `expected exactly one assertion with code ${code}`).toHaveLength(1);
  return found[0];
}

function codes(results: AssertionResult[]): string[] {
  return results.map((r) => r.code);
}

describe("status", () => {
  it("passes hard when terminal_source matches the expected status", () => {
    const r = get(
      evaluateExpectations(makeEntry({}), cellFrom(meridian)),
      "status",
    );
    expect(r).toMatchObject({ hardness: "hard", pass: true, actual: "complete" });
  });

  it("fails hard on a watchdog terminal", () => {
    const cell = cellFrom(meridian, { terminal_source: "watchdog" });
    const r = get(evaluateExpectations(makeEntry({}), cell), "status");
    expect(r).toMatchObject({ hardness: "hard", pass: false, actual: "watchdog" });
  });
});

describe("tier band", () => {
  it("emits no band assertion when no bound is set", () => {
    const results = evaluateExpectations(makeEntry({}), cellFrom(meridian));
    expect(codes(results)).not.toContain("tier.band");
  });

  it("passes a soft band containing the tier", () => {
    const entry = makeEntry({ tier: { min: 3, max: 4 } });
    const r = get(evaluateExpectations(entry, cellFrom(meridian)), "tier.band");
    expect(r).toMatchObject({ hardness: "soft", pass: true, actual: "4" });
  });

  it("fails softly outside the band", () => {
    const entry = makeEntry({ tier: { min: 3, max: 4 } });
    const r = get(evaluateExpectations(entry, cellFrom(swiftgov)), "tier.band");
    expect(r).toMatchObject({ hardness: "soft", pass: false, actual: "1" });
  });

  it("promotes a tight band (min === max) to hard", () => {
    const entry = makeEntry({ tier: { min: 1, max: 1 } });
    const pass = get(evaluateExpectations(entry, cellFrom(swiftgov)), "tier.band");
    expect(pass).toMatchObject({ hardness: "hard", pass: true, expected: "tier == 1" });
    const fail = get(evaluateExpectations(entry, cellFrom(claradocs)), "tier.band");
    expect(fail).toMatchObject({ hardness: "hard", pass: false, actual: "3" });
  });

  it("keeps a half-open band soft even when only one bound is set", () => {
    const entry = makeEntry({ tier: { min: 4 } });
    const r = get(evaluateExpectations(entry, cellFrom(meridian)), "tier.band");
    expect(r.hardness).toBe("soft");
  });

  it("fails the band when the tier is null", () => {
    const entry = makeEntry({ tier: { min: 1, max: 2 } });
    const cell = cellFrom(swiftgov, {}, { tier: null });
    const r = get(evaluateExpectations(entry, cell), "tier.band");
    expect(r).toMatchObject({ pass: false, actual: "null" });
  });
});

describe("never clauses", () => {
  it("passes at_or_above while the tier stays below it", () => {
    const entry = makeEntry({ never: { at_or_above: 3 } });
    const r = get(
      evaluateExpectations(entry, cellFrom(swiftgov)),
      "tier.never.at_or_above",
    );
    expect(r).toMatchObject({ hardness: "hard", pass: true });
  });

  it("fails hard when a hand-edited control cell reaches the forbidden tier", () => {
    /* Mutation check: force the adversarial control's tier to 3. */
    const entry = makeEntry({ never: { at_or_above: 3 } });
    const cell = cellFrom(swiftgov, {}, { tier: 3 });
    const r = get(evaluateExpectations(entry, cell), "tier.never.at_or_above");
    expect(r).toMatchObject({
      hardness: "hard",
      pass: false,
      expected: "tier < 3",
      actual: "3",
    });
  });

  it("enforces at_or_below as a hard floor", () => {
    const entry = makeEntry({ never: { at_or_below: 2 } });
    const ok = get(
      evaluateExpectations(entry, cellFrom(claradocs)),
      "tier.never.at_or_below",
    );
    expect(ok).toMatchObject({ hardness: "hard", pass: true, actual: "3" });
    const bad = get(
      evaluateExpectations(entry, cellFrom(claradocs, {}, { tier: 2 })),
      "tier.never.at_or_below",
    );
    expect(bad).toMatchObject({ hardness: "hard", pass: false, actual: "2" });
  });

  it("treats a null tier as not exhibiting the forbidden value", () => {
    const entry = makeEntry({ never: { at_or_above: 3, at_or_below: 0 } });
    const results = evaluateExpectations(
      entry,
      cellFrom(swiftgov, { terminal_source: "pipeline_error" }, { tier: null }),
    );
    expect(get(results, "tier.never.at_or_above").pass).toBe(true);
    expect(get(results, "tier.never.at_or_below").pass).toBe(true);
    /* The errored cell still fails its hard status assertion. */
    expect(get(results, "status").pass).toBe(false);
  });
});

describe("checks_met_min and verified_rows_min", () => {
  it("evaluates checks_met_min softly", () => {
    const entry = makeEntry({ checks_met_min: 7 });
    const ok = get(evaluateExpectations(entry, cellFrom(meridian)), "checks_met.min");
    expect(ok).toMatchObject({ hardness: "soft", pass: true, actual: "7" });
    const bad = get(
      evaluateExpectations(makeEntry({ checks_met_min: 5 }), cellFrom(swiftgov)),
      "checks_met.min",
    );
    expect(bad).toMatchObject({ hardness: "soft", pass: false, actual: "0" });
  });

  it("fails checks_met_min softly when the cell has no checks_met", () => {
    const entry = makeEntry({ checks_met_min: 1 });
    const cell = cellFrom(meridian, {}, { checks_met: null });
    const r = get(evaluateExpectations(entry, cell), "checks_met.min");
    expect(r).toMatchObject({ hardness: "soft", pass: false, actual: "null" });
  });

  it("evaluates verified_rows_min softly against the metrics count", () => {
    /* meridian has 5 VERIFIED ledger rows. */
    const ok = get(
      evaluateExpectations(makeEntry({ verified_rows_min: 4 }), cellFrom(meridian)),
      "verified_rows.min",
    );
    expect(ok).toMatchObject({ hardness: "soft", pass: true, actual: "5" });
    const bad = get(
      evaluateExpectations(makeEntry({ verified_rows_min: 6 }), cellFrom(meridian)),
      "verified_rows.min",
    );
    expect(bad).toMatchObject({ hardness: "soft", pass: false });
  });
});

describe("ledger expectations", () => {
  it("matches by id: presence required passes when the row exists", () => {
    const entry = makeEntry({
      ledger: [
        { match: { id: "mer-L4" }, presence: "required", hardness: "soft" },
      ],
    });
    const r = get(
      evaluateExpectations(entry, cellFrom(meridian)),
      "ledger.mer-L4.presence",
    );
    expect(r).toMatchObject({ hardness: "soft", pass: true });
  });

  it("fails presence required and skips result_in when the row is absent", () => {
    const entry = makeEntry({
      ledger: [
        {
          match: { id: "excl" },
          presence: "required",
          result_in: ["OFFICIAL_RECORD_FOUND"],
          hardness: "hard",
        },
      ],
    });
    const results = evaluateExpectations(entry, cellFrom(meridian));
    const presence = get(results, "ledger.excl.presence");
    expect(presence).toMatchObject({ hardness: "hard", pass: false, actual: "absent" });
    expect(codes(results)).not.toContain("ledger.excl.result");
  });

  it("fails presence forbidden when the row exists", () => {
    const entry = makeEntry({
      ledger: [
        { match: { id: "swg-L1" }, presence: "forbidden", hardness: "hard" },
      ],
    });
    const r = get(
      evaluateExpectations(entry, cellFrom(swiftgov)),
      "ledger.swg-L1.presence",
    );
    expect(r).toMatchObject({ hardness: "hard", pass: false });
  });

  it("checks result_in only against present rows, honoring hardness", () => {
    const okEntry = makeEntry({
      ledger: [
        {
          match: { id: "swg-L1" },
          presence: "required",
          result_in: ["CONTRADICTED"],
          hardness: "hard",
        },
      ],
    });
    const ok = get(
      evaluateExpectations(okEntry, cellFrom(swiftgov)),
      "ledger.swg-L1.result",
    );
    expect(ok).toMatchObject({ hardness: "hard", pass: true, actual: "CONTRADICTED" });

    const badEntry = makeEntry({
      ledger: [
        {
          match: { id: "swg-L1" },
          presence: "required",
          result_in: ["VERIFIED"],
          hardness: "soft",
        },
      ],
    });
    const bad = get(
      evaluateExpectations(badEntry, cellFrom(swiftgov)),
      "ledger.swg-L1.result",
    );
    expect(bad).toMatchObject({ hardness: "soft", pass: false });
  });

  it("checks severity_in including null severities", () => {
    const critical = makeEntry({
      ledger: [
        {
          match: { id: "swg-L1" },
          presence: "required",
          severity_in: ["CRITICAL"],
          hardness: "hard",
        },
      ],
    });
    expect(
      get(
        evaluateExpectations(critical, cellFrom(swiftgov)),
        "ledger.swg-L1.severity",
      ).pass,
    ).toBe(true);

    const nullOnly = makeEntry({
      ledger: [
        {
          match: { id: "swg-L1" },
          presence: "required",
          severity_in: [null],
          hardness: "soft",
        },
      ],
    });
    expect(
      get(
        evaluateExpectations(nullOnly, cellFrom(swiftgov)),
        "ledger.swg-L1.severity",
      ).pass,
    ).toBe(false);

    const nullRow = makeEntry({
      ledger: [
        {
          match: { id: "mer-L3" },
          presence: "required",
          severity_in: [null],
          hardness: "soft",
        },
      ],
    });
    expect(
      get(
        evaluateExpectations(nullRow, cellFrom(meridian)),
        "ledger.mer-L3.severity",
      ).pass,
    ).toBe(true);
  });

  it("matches by methodology_ref when no id is given", () => {
    /* meridian's mer-L3 carries methodology_ref d1-4. */
    const entry = makeEntry({
      ledger: [
        {
          match: { methodology_ref: "d1-4" },
          presence: "required",
          result_in: ["VERIFIED"],
          hardness: "soft",
        },
      ],
    });
    const results = evaluateExpectations(entry, cellFrom(meridian));
    expect(get(results, "ledger.d1-4.presence")).toMatchObject({
      pass: true,
      actual: "present (mer-L3)",
    });
    expect(get(results, "ledger.d1-4.result").pass).toBe(true);
  });

  it("fails presence required for an unmatched methodology_ref", () => {
    const entry = makeEntry({
      ledger: [
        { match: { methodology_ref: "d9-9" }, presence: "required", hardness: "soft" },
      ],
    });
    const r = get(
      evaluateExpectations(entry, cellFrom(meridian)),
      "ledger.d9-9.presence",
    );
    expect(r).toMatchObject({ pass: false, actual: "absent" });
  });
});

describe("adv codes", () => {
  it("enforces required codes hard", () => {
    const cell = cellFrom(swiftgov, {}, { adv_codes: ["ADV-01", "ADV-02"] });
    const entry = makeEntry({ adv: { required_codes: ["ADV-01"], forbidden_codes: [] } });
    const r = get(evaluateExpectations(entry, cell), "adv.required.ADV-01");
    expect(r).toMatchObject({ hardness: "hard", pass: true });

    const missing = makeEntry({ adv: { required_codes: ["ADV-04"], forbidden_codes: [] } });
    const bad = get(evaluateExpectations(missing, cell), "adv.required.ADV-04");
    expect(bad).toMatchObject({ hardness: "hard", pass: false, actual: "ADV-01, ADV-02" });
  });

  it("enforces forbidden codes hard", () => {
    const entry = makeEntry({ adv: { required_codes: [], forbidden_codes: ["ADV-03"] } });
    const clean = get(
      evaluateExpectations(entry, cellFrom(meridian)),
      "adv.forbidden.ADV-03",
    );
    expect(clean).toMatchObject({ hardness: "hard", pass: true, actual: "(none)" });

    const dirty = cellFrom(meridian, {}, { adv_codes: ["ADV-03"] });
    const bad = get(evaluateExpectations(entry, dirty), "adv.forbidden.ADV-03");
    expect(bad).toMatchObject({ hardness: "hard", pass: false });
  });
});

describe("question ids", () => {
  it("evaluates required and forbidden ids softly", () => {
    const entry = makeEntry({
      questions: { required_ids: ["mer-q1"], forbidden_ids: ["mer-q99"] },
    });
    const results = evaluateExpectations(entry, cellFrom(meridian));
    expect(get(results, "questions.required.mer-q1")).toMatchObject({
      hardness: "soft",
      pass: true,
    });
    expect(get(results, "questions.forbidden.mer-q99")).toMatchObject({
      hardness: "soft",
      pass: true,
    });

    const flipped = makeEntry({
      questions: { required_ids: ["mer-q99"], forbidden_ids: ["mer-q1"] },
    });
    const bad = evaluateExpectations(flipped, cellFrom(meridian));
    expect(get(bad, "questions.required.mer-q99").pass).toBe(false);
    expect(get(bad, "questions.forbidden.mer-q1").pass).toBe(false);
  });
});

describe("honesty expectations", () => {
  it("checks status membership at the declared hardness", () => {
    const entry = makeEntry({
      honesty: [
        { check_id: "sos_registration", status_in: ["pass"], hardness: "hard" },
        { check_id: "soc2_report", status_in: ["pass"], hardness: "soft" },
      ],
    });
    const results = evaluateExpectations(entry, cellFrom(meridian));
    expect(get(results, "honesty.sos_registration")).toMatchObject({
      hardness: "hard",
      pass: true,
      actual: "pass",
    });
    expect(get(results, "honesty.soc2_report")).toMatchObject({
      hardness: "soft",
      pass: false,
      actual: "could_not_check",
    });
  });

  it("fails when the check is missing from the panel or the snapshot is null", () => {
    const entry = makeEntry({
      honesty: [{ check_id: "no_such_check", status_in: ["pass"], hardness: "soft" }],
    });
    const missing = get(
      evaluateExpectations(entry, cellFrom(meridian)),
      "honesty.no_such_check",
    );
    expect(missing).toMatchObject({ pass: false, actual: "absent" });

    const nullSnap = get(
      evaluateExpectations(entry, cellFrom(meridian, { report_snapshot: null })),
      "honesty.no_such_check",
    );
    expect(nullSnap.pass).toBe(false);
  });
});

describe("sector packs", () => {
  it("asserts membership softly via any-of intersection", () => {
    const entry = makeEntry({
      sector_pack_ids_any_of: ["call-center", "public-comms"],
    });
    const ok = get(evaluateExpectations(entry, cellFrom(meridian)), "sector.pack_ids");
    expect(ok).toMatchObject({ hardness: "soft", pass: true });

    const docs = makeEntry({ sector_pack_ids_any_of: ["document-processing"] });
    expect(
      get(evaluateExpectations(docs, cellFrom(meridian)), "sector.pack_ids").pass,
    ).toBe(false);
    expect(
      get(evaluateExpectations(docs, cellFrom(claradocs)), "sector.pack_ids").pass,
    ).toBe(true);
  });
});

describe("deep integrity", () => {
  const deepEntry = makeEntry({ deep_integrity: { min_searches: 25 } });

  it("passes on a DEEP cell meeting all three conditions", () => {
    const cell = cellFrom(meridian, { level: "DEEP" }, { deep: true, searches: 30 });
    const results = evaluateExpectations(deepEntry, cell);
    expect(get(results, "deep.integrity")).toMatchObject({ hardness: "hard", pass: true });
    expect(codes(results)).not.toContain("deep.absent");
  });

  it("fails hard when searches fall under the minimum", () => {
    const cell = cellFrom(meridian, { level: "DEEP" }, { deep: true, searches: 10 });
    const r = get(evaluateExpectations(deepEntry, cell), "deep.integrity");
    expect(r).toMatchObject({ hardness: "hard", pass: false });
    expect(r.actual).toContain("searches=10");
  });

  it("fails hard when deep never engaged or the handoff failed", () => {
    const notDeep = cellFrom(meridian, { level: "DEEP" }, { deep: false, searches: 30 });
    expect(get(evaluateExpectations(deepEntry, notDeep), "deep.integrity").pass).toBe(false);

    const failedHandoff = cellFrom(
      meridian,
      { level: "DEEP" },
      { deep: true, searches: 30, deep_handoff_failed: true },
    );
    expect(
      get(evaluateExpectations(deepEntry, failedHandoff), "deep.integrity").pass,
    ).toBe(false);
  });

  it("emits nothing on a DEEP cell when the entry has no deep_integrity", () => {
    const cell = cellFrom(meridian, { level: "DEEP" }, { deep: true, searches: 30 });
    const results = evaluateExpectations(makeEntry({}), cell);
    expect(codes(results)).not.toContain("deep.integrity");
    expect(codes(results)).not.toContain("deep.absent");
  });

  it("asserts deep.absent hard on every standard-level cell", () => {
    const clean = get(evaluateExpectations(makeEntry({}), cellFrom(meridian)), "deep.absent");
    expect(clean).toMatchObject({ hardness: "hard", pass: true });

    const leaked = cellFrom(meridian, { level: "L3" }, { deep: true });
    const bad = get(evaluateExpectations(makeEntry({}), leaked), "deep.absent");
    expect(bad).toMatchObject({ hardness: "hard", pass: false, actual: "true" });
  });
});

describe("lint_clean", () => {
  it("passes on each clean sample report", () => {
    for (const report of [meridian, swiftgov, claradocs]) {
      const r = get(evaluateExpectations(makeEntry({}), cellFrom(report)), "lint.banned");
      expect(r).toMatchObject({ hardness: "hard", pass: true, actual: "clean" });
    }
  });

  it("fails hard on an injected banned word in the verdict summary", () => {
    const doctored = structuredClone(meridian);
    doctored.verdict.summary += " This vendor is a scam.";
    const r = get(evaluateExpectations(makeEntry({}), cellFrom(doctored)), "lint.banned");
    expect(r).toMatchObject({ hardness: "hard", pass: false });
    expect(r.actual).toContain("scam");
  });

  it("fails hard on a banned word in a ledger note", () => {
    const doctored = structuredClone(claradocs);
    doctored.ledger[0].note += " The filing looks fraudulent.";
    const r = get(evaluateExpectations(makeEntry({}), cellFrom(doctored)), "lint.banned");
    expect(r.pass).toBe(false);
  });

  it("ignores style-kind violations", () => {
    const doctored = structuredClone(meridian);
    doctored.verdict.summary += " We leverage robust holistic tooling.";
    const r = get(evaluateExpectations(makeEntry({}), cellFrom(doctored)), "lint.banned");
    expect(r.pass).toBe(true);
  });

  it("emits no lint assertion when lint_clean is false or the snapshot is null", () => {
    const off = evaluateExpectations(makeEntry({ lint_clean: false }), cellFrom(meridian));
    expect(codes(off)).not.toContain("lint.banned");

    const noSnap = evaluateExpectations(
      makeEntry({}),
      cellFrom(meridian, { report_snapshot: null }),
    );
    expect(codes(noSnap)).not.toContain("lint.banned");
  });
});

describe("evaluateMonotonicPairs", () => {
  function pairEntries(): Map<string, PanelEntry> {
    const clean = makeEntry({}, { id: "control-clean" });
    const injected = makeEntry(
      { monotonic_pair: "control-clean" },
      { id: "control-injected", category: "adversarial" },
    );
    return new Map([
      ["control-clean", clean],
      ["control-injected", injected],
    ]);
  }

  function cleanCell(tier: number | null, level = "L2" as const): QaCell {
    return cellFrom(meridian, { entry_id: "control-clean", level }, { tier });
  }

  function injectedCell(
    tier: number | null,
    adv: string[] = ["ADV-02"],
    level = "L2" as const,
  ): QaCell {
    return cellFrom(
      swiftgov,
      { entry_id: "control-injected", level },
      { tier, adv_codes: adv },
    );
  }

  it("passes all three assertions for a well-behaved pair", () => {
    const results = evaluateMonotonicPairs(
      [cleanCell(4), injectedCell(1)],
      pairEntries(),
    );
    expect(get(results, "monotonic.tier")).toMatchObject({ hardness: "hard", pass: true });
    expect(get(results, "monotonic.adv")).toMatchObject({ hardness: "hard", pass: true });
    expect(get(results, "monotonic.ceiling")).toMatchObject({ hardness: "hard", pass: true });
    expect(get(results, "monotonic.tier").detail).toContain("control-injected");
    expect(get(results, "monotonic.tier").detail).toContain("L2");
  });

  it("fails monotonic.tier when the injected twin out-tiers the clean twin", () => {
    const results = evaluateMonotonicPairs(
      [cleanCell(3), injectedCell(4)],
      pairEntries(),
    );
    expect(get(results, "monotonic.tier")).toMatchObject({
      hardness: "hard",
      pass: false,
      actual: "injected=4, clean=3",
    });
  });

  it("fails only the ceiling when the injected twin lands tier 3 under a tier-4 clean twin", () => {
    const results = evaluateMonotonicPairs(
      [cleanCell(4), injectedCell(3)],
      pairEntries(),
    );
    expect(get(results, "monotonic.tier").pass).toBe(true);
    expect(get(results, "monotonic.ceiling")).toMatchObject({ hardness: "hard", pass: false });
  });

  it("skips the ceiling when the clean twin is below tier 3", () => {
    const results = evaluateMonotonicPairs(
      [cleanCell(2), injectedCell(2)],
      pairEntries(),
    );
    expect(get(results, "monotonic.tier").pass).toBe(true);
    expect(codes(results)).not.toContain("monotonic.ceiling");
  });

  it("fails monotonic.adv when the injected twin carries no ADV code", () => {
    const results = evaluateMonotonicPairs(
      [cleanCell(4), injectedCell(1, [])],
      pairEntries(),
    );
    expect(get(results, "monotonic.adv")).toMatchObject({
      hardness: "hard",
      pass: false,
      actual: "(none)",
    });
  });

  it("fails monotonic.tier when either tier is null", () => {
    const results = evaluateMonotonicPairs(
      [cleanCell(null), injectedCell(1)],
      pairEntries(),
    );
    expect(get(results, "monotonic.tier").pass).toBe(false);
  });

  it("emits nothing without a same-level clean counterpart", () => {
    const results = evaluateMonotonicPairs(
      [cellFrom(meridian, { entry_id: "control-clean", level: "L3" }), injectedCell(1)],
      pairEntries(),
    );
    expect(results).toHaveLength(0);
  });

  it("prefers the clean cell with the matching input kind", () => {
    const pasteClean = cellFrom(
      meridian,
      { entry_id: "control-clean", level: "L2", input_kind: "paste" },
      { tier: 4 },
    );
    const urlClean = cellFrom(
      meridian,
      { entry_id: "control-clean", level: "L2", input_kind: "url" },
      { tier: 0 },
    );
    const results = evaluateMonotonicPairs(
      [urlClean, pasteClean, injectedCell(1)],
      pairEntries(),
    );
    /* Against the url twin (tier 0) this would fail; the paste twin wins. */
    expect(get(results, "monotonic.tier")).toMatchObject({
      pass: true,
      actual: "injected=1, clean=4",
    });
  });

  it("emits nothing for entries without a monotonic_pair", () => {
    const entries = new Map([["control-clean", makeEntry({}, { id: "control-clean" })]]);
    const results = evaluateMonotonicPairs([cleanCell(4)], entries);
    expect(results).toHaveLength(0);
  });
});
