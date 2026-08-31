/*
  Tests for the report-overview model: every sentence and count on the
  at-a-glance card is code-templated here, so this file is the lint and
  drift lock for that copy. Runs against all four sample fixtures plus a
  synthetic minimal report (empty sections, research_partial), the case the
  section components handle by early-returning null.
*/
import { describe, expect, it } from "vitest";
import { Report } from "@shared/schemas.ts";
import { lintObject } from "@shared/lint.ts";
import { SAMPLE_REPORTS } from "@/lib/sample-reports";
import {
  REPORT_SECTION_IDS,
  buildOverviewModel,
} from "@/components/report/report-overview-model";

const fixtures = Object.entries(SAMPLE_REPORTS);

/* A schema-valid report with everything optional empty. */
const minimal: Report = Report.parse({
  verdict: {
    tier: 0,
    label: "Not enough to evaluate",
    summary: "We could not complete an evaluation. This is not a negative finding.",
    checks_met: { met: 0, total: 7 },
    rationale: [],
  },
  ledger: [],
  green_flags: [],
  adv_findings: [],
  honesty_panel: [],
  questions: [],
  manual_checks: [],
  next_steps: [],
  sector: { pack_ids: [], elevated: false, overlay_reason: null, state_items: [] },
  sources: [
    { url: "https://example.gov/a", title: "Example", retrieved_at: "2026-08-30T00:00:00.000Z" },
  ],
  review: null,
  meta: {
    generated_at: "2026-08-30T00:00:00.000Z",
    expires_at: "2026-11-28T00:00:00.000Z",
    methodology_version: "1.4",
    pack_release: "1",
    vendor_key: "minimal-vendor",
    vendor_display_name: "Minimal Vendor",
    research_partial: true,
    input_kind: "paste",
  },
});

describe("buildOverviewModel: counts and rendering conditions", () => {
  it.each(fixtures)("%s: counts equal the source array lengths", (_key, report) => {
    const m = buildOverviewModel(report);
    expect(m.claims?.count).toBe(report.ledger.length);
    expect(m.questions?.count).toBe(report.questions.length);
    const tile = (key: string) => m.tiles.find((t) => t.key === key);
    if (report.green_flags.length > 0) {
      expect(tile("green-flags")?.count).toBe(report.green_flags.length);
      expect(tile("green-flags")?.state).toBe("link");
    } else {
      expect(tile("green-flags")?.state).toBe("muted");
    }
    expect(tile("honesty")?.count).toBe(report.honesty_panel.length);
    expect(tile("sources")?.count).toBe(report.sources.length);
    const breakdownTotal = (m.claims?.breakdown ?? []).reduce((s, b) => s + b.count, 0);
    expect(breakdownTotal).toBe(report.ledger.length);
  });

  it.each(fixtures)("%s: the BLUF carries the three load-bearing numbers", (_key, report) => {
    const m = buildOverviewModel(report);
    expect(m.bluf).toContain(String(report.ledger.length));
    expect(m.bluf).toContain(String(report.sources.length));
    if (report.questions.length > 0) {
      expect(m.bluf).toContain(String(report.questions.length));
      expect(m.bluf).toContain("send back by email");
    }
  });

  it.each(fixtures)("%s: every link tile targets a section that renders", (_key, report) => {
    const m = buildOverviewModel(report);
    const renderable = new Set<string>();
    if (report.green_flags.length > 0) renderable.add(REPORT_SECTION_IDS.greenFlags);
    if (report.adv_findings.length > 0) renderable.add(REPORT_SECTION_IDS.advFindings);
    if (report.ledger.length > 0) renderable.add(REPORT_SECTION_IDS.ledger);
    if (report.honesty_panel.length > 0) renderable.add(REPORT_SECTION_IDS.honesty);
    if (report.questions.length > 0) renderable.add(REPORT_SECTION_IDS.questions);
    if (report.manual_checks.length > 0) renderable.add(REPORT_SECTION_IDS.manualChecks);
    if ((report.leads?.length ?? 0) > 0) renderable.add(REPORT_SECTION_IDS.leads);
    if (report.next_steps.length + report.sector.state_items.length > 0) {
      renderable.add(REPORT_SECTION_IDS.nextSteps);
    }
    if (report.sources.length > 0) renderable.add(REPORT_SECTION_IDS.sources);
    for (const tile of m.tiles.filter((t) => t.state === "link")) {
      expect(renderable.has(tile.targetId), `${tile.key} links to a hidden section`).toBe(true);
    }
  });
});

describe("buildOverviewModel: the minimal report", () => {
  const m = buildOverviewModel(minimal);

  it("hides plumbing tiles for empty sections and keeps the zero-state ones", () => {
    const keys = m.tiles.map((t) => t.key);
    expect(keys).not.toContain("manual-checks");
    expect(keys).not.toContain("leads");
    expect(keys).not.toContain("next-steps");
    expect(keys).not.toContain("honesty");
    const green = m.tiles.find((t) => t.key === "green-flags");
    expect(green?.state).toBe("muted");
    /* paste input: the adversarial zero-state is information. */
    const adv = m.tiles.find((t) => t.key === "adv-findings");
    expect(adv?.state).toBe("muted");
    expect(m.claims).toBeNull();
    expect(m.questions).toBeNull();
  });

  it("shows the research-partial notice exactly when the report says so", () => {
    expect(m.partialNotice).toContain("could not be reached");
    const complete = Report.parse({
      ...minimal,
      meta: { ...minimal.meta, research_partial: false },
    });
    expect(buildOverviewModel(complete).partialNotice).toBeNull();
  });

  it("skips the adversarial zero-state on name-only runs (no material was submitted)", () => {
    const nameRun = Report.parse({
      ...minimal,
      meta: { ...minimal.meta, input_kind: "name" },
    });
    const keys = buildOverviewModel(nameRun).tiles.map((t) => t.key);
    expect(keys).not.toContain("adv-findings");
  });
});

describe("buildOverviewModel: copy discipline", () => {
  it.each([...fixtures, ["minimal", minimal] as const])(
    "%s: zero banned-language findings and zero em dashes in every template",
    (_key, report) => {
      const m = buildOverviewModel(report);
      const corpus = {
        bluf: m.bluf,
        partial: m.partialNotice ?? "",
        tiles: m.tiles.map((t) => `${t.label} ${t.detail ?? ""}`),
        claims: m.claims ? `${m.claims.sourcesLine} ${m.claims.breakdown.map((b) => b.label).join(" ")}` : "",
        questions: m.questions ? `${m.questions.lead} ${m.questions.detail}` : "",
      };
      expect(lintObject(corpus).filter((v) => v.kind === "banned")).toEqual([]);
      expect(JSON.stringify(corpus)).not.toContain("—");
      expect(JSON.stringify(corpus)).not.toMatch(/score/i);
    },
  );

  it("section ids are unique and distinct from the heading ids", () => {
    const ids = Object.values(REPORT_SECTION_IDS);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id.endsWith("-h")).toBe(false);
  });
});
