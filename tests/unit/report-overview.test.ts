/*
  Tests for the report-overview model: every sentence, count, and bar
  segment on the at-a-glance card is code-templated, so this file is the
  lint and drift lock for that copy. Runs against all four sample fixtures
  plus a synthetic minimal report (empty sections, research_partial), the
  case the section components handle by early-returning null.
*/
import { describe, expect, it } from "vitest";
import { Report } from "@shared/schemas.ts";
import { lintObject } from "@shared/lint.ts";
import { SAMPLE_REPORTS } from "@/lib/sample-reports";
import {
  OVERVIEW_GROUP_LABELS,
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

function allTiles(m: ReturnType<typeof buildOverviewModel>) {
  return [...m.found.tiles, ...m.next.tiles];
}

describe("buildOverviewModel: counts, segments, and rendering conditions", () => {
  it.each(fixtures)("%s: bar segments sum to their populations", (_key, report) => {
    const m = buildOverviewModel(report);
    if (report.ledger.length > 0) {
      expect(m.found.claims).not.toBeNull();
      const claimSum = m.found.claims!.segments.reduce((s, b) => s + b.count, 0);
      expect(claimSum).toBe(report.ledger.length);
      expect(m.found.claims!.title).toContain(String(report.ledger.length));
    } else {
      expect(m.found.claims).toBeNull();
    }
    if (report.honesty_panel.length > 0) {
      const cov = m.coverage!;
      const covSum = cov.segments.reduce((s, b) => s + b.count, 0) + cov.notApplicable;
      expect(covSum).toBe(report.honesty_panel.length);
      expect(cov.sourcesLine).toContain(String(report.sources.length));
    }
  });

  it.each(fixtures)("%s: tile counts equal the source array lengths", (_key, report) => {
    const m = buildOverviewModel(report);
    const tile = (key: string) => allTiles(m).find((t) => t.key === key);
    if (report.green_flags.length > 0) {
      expect(tile("green-flags")?.count).toBe(report.green_flags.length);
      expect(tile("green-flags")?.state).toBe("link");
    } else {
      expect(tile("green-flags")?.state).toBe("muted");
    }
    if (report.questions.length > 0) {
      expect(tile("questions")?.count).toBe(report.questions.length);
      expect(tile("questions")?.primary).toBe(true);
    }
    if (report.manual_checks.length > 0) {
      expect(tile("manual-checks")?.count).toBe(report.manual_checks.length);
    }
  });

  it("exactly one tile is primary, and it is the questions tile", () => {
    for (const [, report] of fixtures) {
      const primaries = allTiles(buildOverviewModel(report)).filter((t) => t.primary);
      if (report.questions.length > 0) {
        expect(primaries).toHaveLength(1);
        expect(primaries[0].key).toBe("questions");
      } else {
        expect(primaries).toHaveLength(0);
      }
    }
  });

  it.each(fixtures)("%s: the BLUF carries the load-bearing numbers", (_key, report) => {
    const m = buildOverviewModel(report);
    expect(m.bluf).toContain(String(report.ledger.length));
    expect(m.bluf).toContain(String(report.sources.length));
    if (report.questions.length > 0) {
      expect(m.bluf).toContain(String(report.questions.length));
      expect(m.bluf).toContain("send back by email");
    }
  });

  it.each(fixtures)("%s: every link targets a section that renders", (_key, report) => {
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
    for (const tile of allTiles(m).filter((t) => t.state === "link")) {
      expect(renderable.has(tile.targetId), `${tile.key} links to a hidden section`).toBe(true);
    }
    if (m.found.claims) expect(renderable.has(m.found.claims.targetId)).toBe(true);
    if (m.coverage) {
      expect(renderable.has(m.coverage.targetId)).toBe(true);
      expect(renderable.has(m.coverage.sourcesTargetId)).toBe(true);
    }
  });
});

describe("buildOverviewModel: the minimal report", () => {
  const m = buildOverviewModel(minimal);

  it("hides plumbing for empty sections and keeps the zero-state tiles", () => {
    expect(m.found.claims).toBeNull();
    expect(m.coverage).toBeNull();
    expect(m.next.tiles).toHaveLength(0);
    const keys = m.found.tiles.map((t) => t.key);
    expect(keys).toContain("green-flags");
    expect(keys).toContain("adv-findings");
    expect(keys).not.toContain("leads");
    for (const t of m.found.tiles) expect(t.state).toBe("muted");
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
    const keys = buildOverviewModel(nameRun).found.tiles.map((t) => t.key);
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
        groups: Object.values(OVERVIEW_GROUP_LABELS),
        tiles: allTiles(m).map((t) => `${t.label} ${t.detail ?? ""}`),
        claims: m.found.claims
          ? `${m.found.claims.title} ${m.found.claims.segments.map((s) => s.label).join(" ")}`
          : "",
        coverage: m.coverage
          ? `${m.coverage.title} ${m.coverage.sourcesLine} ${m.coverage.segments.map((s) => s.label).join(" ")}`
          : "",
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
