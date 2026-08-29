/*
  Tests for the QA drift engine. Fixtures are hand-built QaRunFile pairs:
  each drift kind must fire exactly under its specified condition and stay
  silent at or below the threshold (searches 30%, cost 50%, set equality
  regardless of order, ledger flips keyed by row id).
*/
import { describe, expect, it } from "vitest";
import {
  RUN_SCOPE_ENTRY_ID,
  computeDrift,
  renderDriftMarkdown,
} from "../../scripts/lib/qa-drift.ts";
import type {
  DriftItem,
  QaCell,
  QaMetrics,
  QaRunFile,
} from "../../scripts/lib/qa-types.ts";

function makeMetrics(over: Partial<QaMetrics> = {}): QaMetrics {
  return {
    tier: 3,
    checks_met: { met: 5, total: 7 },
    verified_rows: 4,
    green_flags: 2,
    leads: 1,
    research_partial: false,
    searches: 20,
    est_cost_usd: 1.0,
    deep: false,
    deep_handoff_failed: false,
    adv_codes: [],
    pack_ids: ["core"],
    question_ids: ["q-a", "q-b"],
    stages_ms: {},
    ...over,
  };
}

function makeCell(over: Partial<QaCell> = {}): QaCell {
  return {
    entry_id: "acme",
    input_kind: "name",
    level: "L1",
    evaluation_id: "eval-1",
    terminal_source: "complete",
    error: null,
    wall_s: 120,
    metrics: makeMetrics(),
    ledger_map: {
      excl: {
        result: "VERIFIED",
        evidence_tier: "A",
        severity: null,
        methodology_ref: "d1-4",
      },
    },
    assertions: [],
    report_snapshot: null,
    retried: false,
    ...over,
  };
}

function makeRun(cells: QaCell[], over: Partial<QaRunFile> = {}): QaRunFile {
  return {
    schema_version: 1,
    ran_at: "2026-08-29T00:00:00Z",
    git_head: "abc1234",
    methodology_version_live: "1.4.0",
    panel_versions: { public: "2026-09-01" },
    cells,
    summary: {
      hard_failures: 0,
      soft_failures: 0,
      drift_items: 0,
      est_cost_usd: 0,
    },
    ...over,
  };
}

function ofKind(items: DriftItem[], kind: DriftItem["kind"]): DriftItem[] {
  return items.filter((i) => i.kind === kind);
}

describe("computeDrift", () => {
  it("returns no items when runs are identical", () => {
    const baseline = makeRun([makeCell()]);
    const current = makeRun([makeCell()]);
    expect(computeDrift(current, baseline)).toEqual([]);
  });

  it("flags a tier change, including a change to null", () => {
    const baseline = makeRun([makeCell({ metrics: makeMetrics({ tier: 3 }) })]);
    const current = makeRun([makeCell({ metrics: makeMetrics({ tier: 2 }) })]);
    const items = computeDrift(current, baseline);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      entry_id: "acme",
      level: "L1",
      kind: "tier",
      before: "3",
      after: "2",
    });

    const toNull = computeDrift(
      makeRun([makeCell({ metrics: makeMetrics({ tier: null }) })]),
      baseline,
    );
    expect(ofKind(toNull, "tier")).toHaveLength(1);
    expect(ofKind(toNull, "tier")[0].after).toBe("null");
  });

  it("flags ledger result flips in both directions, keyed by row id", () => {
    const baseline = makeRun([
      makeCell({
        ledger_map: {
          excl: {
            result: "VERIFIED",
            evidence_tier: "A",
            severity: null,
            methodology_ref: "d1-4",
          },
          "domain-age": {
            result: "COULD_NOT_VERIFY",
            evidence_tier: null,
            severity: "MEDIUM",
            methodology_ref: "d2-1",
          },
        },
      }),
    ]);
    const current = makeRun([
      makeCell({
        ledger_map: {
          excl: {
            result: "COULD_NOT_VERIFY",
            evidence_tier: null,
            severity: null,
            methodology_ref: "d1-4",
          },
          "domain-age": {
            result: "VERIFIED",
            evidence_tier: "B",
            severity: null,
            methodology_ref: "d2-1",
          },
        },
      }),
    ]);
    const flips = ofKind(computeDrift(current, baseline), "ledger_result");
    expect(flips).toHaveLength(2);
    const byRow = new Map(flips.map((i) => [/row (\S+)/.exec(i.detail ?? "")?.[1], i]));
    expect(byRow.get("domain-age")).toMatchObject({
      before: "COULD_NOT_VERIFY",
      after: "VERIFIED",
    });
    expect(byRow.get("excl")).toMatchObject({
      before: "VERIFIED",
      after: "COULD_NOT_VERIFY",
    });
  });

  it("ignores ledger rows present on only one side and non-result changes", () => {
    const baseline = makeRun([
      makeCell({
        ledger_map: {
          excl: {
            result: "VERIFIED",
            evidence_tier: "A",
            severity: null,
            methodology_ref: "d1-4",
          },
          "baseline-only": {
            result: "CONTRADICTED",
            evidence_tier: "A",
            severity: "CRITICAL",
            methodology_ref: "d3-2",
          },
        },
      }),
    ]);
    const current = makeRun([
      makeCell({
        ledger_map: {
          /* Same result, different evidence tier and severity: not drift. */
          excl: {
            result: "VERIFIED",
            evidence_tier: "B",
            severity: "LOW",
            methodology_ref: "d1-4",
          },
          "current-only": {
            result: "VERIFIED",
            evidence_tier: "A",
            severity: null,
            methodology_ref: "d4-1",
          },
        },
      }),
    ]);
    expect(ofKind(computeDrift(current, baseline), "ledger_result")).toEqual([]);
  });

  it("flags adv code set changes but not reordering", () => {
    const baseline = makeRun([
      makeCell({ metrics: makeMetrics({ adv_codes: ["ADV-01", "ADV-02"] }) }),
    ]);
    const reordered = makeRun([
      makeCell({ metrics: makeMetrics({ adv_codes: ["ADV-02", "ADV-01"] }) }),
    ]);
    expect(computeDrift(reordered, baseline)).toEqual([]);

    const changed = makeRun([
      makeCell({ metrics: makeMetrics({ adv_codes: ["ADV-01", "ADV-03"] }) }),
    ]);
    const items = ofKind(computeDrift(changed, baseline), "adv_codes");
    expect(items).toHaveLength(1);
    expect(items[0].before).toBe("ADV-01, ADV-02");
    expect(items[0].after).toBe("ADV-01, ADV-03");
    expect(items[0].detail).toContain("added: ADV-03");
    expect(items[0].detail).toContain("removed: ADV-02");
  });

  it("emits one question_ids item per direction with the ids in detail", () => {
    const baseline = makeRun([
      makeCell({ metrics: makeMetrics({ question_ids: ["q-a", "q-b"] }) }),
    ]);
    const current = makeRun([
      makeCell({
        metrics: makeMetrics({ question_ids: ["q-b", "q-c", "q-d"] }),
      }),
    ]);
    const items = ofKind(computeDrift(current, baseline), "question_ids");
    expect(items).toHaveLength(2);
    const added = items.find((i) => i.detail?.includes("added:"));
    const removed = items.find((i) => i.detail?.includes("removed:"));
    expect(added?.detail).toContain("added: q-c, q-d");
    expect(removed?.detail).toContain("removed: q-a");

    const addOnly = makeRun([
      makeCell({
        metrics: makeMetrics({ question_ids: ["q-a", "q-b", "q-c"] }),
      }),
    ]);
    expect(ofKind(computeDrift(addOnly, baseline), "question_ids")).toHaveLength(1);

    const reordered = makeRun([
      makeCell({ metrics: makeMetrics({ question_ids: ["q-b", "q-a"] }) }),
    ]);
    expect(computeDrift(reordered, baseline)).toEqual([]);
  });

  it("flags pack id set changes as a single item", () => {
    const baseline = makeRun([
      makeCell({ metrics: makeMetrics({ pack_ids: ["core", "hr"] }) }),
    ]);
    const current = makeRun([
      makeCell({ metrics: makeMetrics({ pack_ids: ["core", "safety"] }) }),
    ]);
    const items = ofKind(computeDrift(current, baseline), "pack_ids");
    expect(items).toHaveLength(1);
    expect(items[0].detail).toContain("added: safety");
    expect(items[0].detail).toContain("removed: hr");

    const same = makeRun([
      makeCell({ metrics: makeMetrics({ pack_ids: ["hr", "core"] }) }),
    ]);
    expect(computeDrift(same, baseline)).toEqual([]);
  });

  it("fires searches drift only strictly above 30% of baseline", () => {
    const baseline = makeRun([
      makeCell({ metrics: makeMetrics({ searches: 20 }) }),
    ]);
    const atBoundary = makeRun([
      makeCell({ metrics: makeMetrics({ searches: 26 }) }),
    ]);
    expect(computeDrift(atBoundary, baseline)).toEqual([]);

    const over = makeRun([makeCell({ metrics: makeMetrics({ searches: 27 }) })]);
    const items = ofKind(computeDrift(over, baseline), "searches");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ before: "20", after: "27" });
    expect(items[0].detail).toContain("+35%");

    const downBoundary = makeRun([
      makeCell({ metrics: makeMetrics({ searches: 14 }) }),
    ]);
    expect(computeDrift(downBoundary, baseline)).toEqual([]);

    const downOver = makeRun([
      makeCell({ metrics: makeMetrics({ searches: 13 }) }),
    ]);
    expect(ofKind(computeDrift(downOver, baseline), "searches")).toHaveLength(1);
  });

  it("with a zero-search baseline, any change in searches fires", () => {
    const baseline = makeRun([
      makeCell({ metrics: makeMetrics({ searches: 0, est_cost_usd: 0 }) }),
    ]);
    const same = makeRun([
      makeCell({ metrics: makeMetrics({ searches: 0, est_cost_usd: 0 }) }),
    ]);
    expect(computeDrift(same, baseline)).toEqual([]);

    const changed = makeRun([
      makeCell({ metrics: makeMetrics({ searches: 5, est_cost_usd: 0 }) }),
    ]);
    expect(ofKind(computeDrift(changed, baseline), "searches")).toHaveLength(1);
  });

  it("fires cost drift only strictly above 50% of baseline", () => {
    const baseline = makeRun([
      makeCell({ metrics: makeMetrics({ est_cost_usd: 1.0 }) }),
    ]);
    const atBoundary = makeRun([
      makeCell({ metrics: makeMetrics({ est_cost_usd: 1.5 }) }),
    ]);
    expect(computeDrift(atBoundary, baseline)).toEqual([]);

    const over = makeRun([
      makeCell({ metrics: makeMetrics({ est_cost_usd: 1.51 }) }),
    ]);
    const items = ofKind(computeDrift(over, baseline), "cost");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ before: "$1.00", after: "$1.51" });

    const downBoundary = makeRun([
      makeCell({ metrics: makeMetrics({ est_cost_usd: 0.5 }) }),
    ]);
    expect(computeDrift(downBoundary, baseline)).toEqual([]);

    const downOver = makeRun([
      makeCell({ metrics: makeMetrics({ est_cost_usd: 0.49 }) }),
    ]);
    expect(ofKind(computeDrift(downOver, baseline), "cost")).toHaveLength(1);
  });

  it("emits one run-scoped item on methodology_version_live mismatch", () => {
    const baseline = makeRun([makeCell()], {
      methodology_version_live: "1.4.0",
    });
    const current = makeRun([makeCell()], {
      methodology_version_live: "1.5.0",
    });
    const items = computeDrift(current, baseline);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      entry_id: RUN_SCOPE_ENTRY_ID,
      kind: "methodology_version",
      before: "1.4.0",
      after: "1.5.0",
    });

    const fromNull = computeDrift(
      current,
      makeRun([makeCell()], { methodology_version_live: null }),
    );
    expect(ofKind(fromNull, "methodology_version")[0].before).toBe("null");

    const bothNull = computeDrift(
      makeRun([makeCell()], { methodology_version_live: null }),
      makeRun([makeCell()], { methodology_version_live: null }),
    );
    expect(bothNull).toEqual([]);
  });

  it("flags missing cells in both directions", () => {
    const a = makeCell();
    const b = makeCell({ entry_id: "bravo", level: "L2" });
    const c = makeCell({ entry_id: "charlie", level: "DEEP" });
    const items = computeDrift(makeRun([a, c]), makeRun([a, b]));
    const missing = ofKind(items, "cell_missing");
    expect(missing).toHaveLength(2);
    expect(missing.find((i) => i.entry_id === "bravo")).toMatchObject({
      level: "L2",
      before: "present",
      after: "missing",
    });
    expect(missing.find((i) => i.entry_id === "charlie")).toMatchObject({
      level: "DEEP",
      before: "missing",
      after: "present",
    });
  });

  it("matches on input_kind: same entry and level, different kind, is two missing cells", () => {
    const baseline = makeRun([makeCell({ input_kind: "name" })]);
    const current = makeRun([makeCell({ input_kind: "url" })]);
    const items = computeDrift(current, baseline);
    expect(ofKind(items, "cell_missing")).toHaveLength(2);
    expect(items.some((i) => i.detail?.includes("input=name"))).toBe(true);
    expect(items.some((i) => i.detail?.includes("input=url"))).toBe(true);
  });

  it("stays silent when every delta sits at or below its threshold", () => {
    const baseline = makeRun([
      makeCell({ metrics: makeMetrics({ searches: 20, est_cost_usd: 1.0 }) }),
    ]);
    const current = makeRun([
      makeCell({ metrics: makeMetrics({ searches: 25, est_cost_usd: 1.4 }) }),
    ]);
    expect(computeDrift(current, baseline)).toEqual([]);
  });
});

describe("renderDriftMarkdown", () => {
  it("renders a quiet line for zero items", () => {
    expect(renderDriftMarkdown([])).toBe("No drift against baseline.\n");
  });

  it("groups items per entry with one bullet each", () => {
    const items: DriftItem[] = [
      {
        entry_id: "acme",
        level: "L1",
        kind: "tier",
        before: "3",
        after: "2",
        detail: "input=name",
      },
      {
        entry_id: "acme",
        level: "L2",
        kind: "ledger_result",
        before: "VERIFIED",
        after: "COULD_NOT_VERIFY",
        detail: "input=name; row excl (d1-4)",
      },
      {
        entry_id: "bravo",
        level: "DEEP",
        kind: "cell_missing",
        before: "present",
        after: "missing",
      },
    ];
    const md = renderDriftMarkdown(items);
    expect(md.match(/\*\*acme\*\*/g)).toHaveLength(1);
    expect(md.match(/\*\*bravo\*\*/g)).toHaveLength(1);
    expect(md).toContain("- L1 tier: 3 -> 2 (input=name)");
    expect(md).toContain(
      "- L2 ledger_result: VERIFIED -> COULD_NOT_VERIFY (input=name; row excl (d1-4))",
    );
    expect(md).toContain("- DEEP cell_missing: present -> missing");
    expect(md.indexOf("**acme**")).toBeLessThan(md.indexOf("**bravo**"));
  });
});
