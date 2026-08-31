/*
  The report-overview model: every sentence and count on the at-a-glance
  card, derived in pure code from the report JSON. Templates live here, not
  in JSX, for the same reason load-bearing self-descriptions are
  code-templated everywhere else: the card describes what the report offers,
  so its copy is deterministic, unit-tested, and linted.

  A tile renders as a link only when its section renders (the section
  components early-return null on empty data, and this model applies the
  same conditions so the two can never drift). Green flags and adversarial
  findings are the two sections where zero is itself information, so they
  get muted zero-state tiles instead of disappearing; the adversarial
  zero-state is skipped on name-only runs, where no material was submitted
  for those screens to read.
*/
import type { Report } from "@/lib/types";

/* Section anchor ids, distinct from the aria heading ids ("ledger-h").
   The section components and the overview tiles both import these. */
export const REPORT_SECTION_IDS = {
  greenFlags: "green-flags",
  advFindings: "adv-findings",
  ledger: "ledger",
  honesty: "honesty",
  questions: "questions",
  manualChecks: "manual-checks",
  leads: "leads",
  nextSteps: "next-steps",
  sources: "sources",
} as const;

export interface ResultChipCount {
  result: "VERIFIED" | "OFFICIAL_RECORD_FOUND" | "COULD_NOT_VERIFY" | "CONTRADICTED" | "COVERAGE_LIMITED";
  label: string;
  count: number;
}

export interface OverviewTile {
  key: string;
  targetId: string;
  count: number;
  label: string;
  detail: string | null;
  state: "link" | "muted";
}

export interface OverviewModel {
  bluf: string;
  partialNotice: string | null;
  claims: {
    targetId: string;
    count: number;
    breakdown: ResultChipCount[];
    sourcesLine: string;
  } | null;
  questions: {
    targetId: string;
    count: number;
    lead: string;
    detail: string;
  } | null;
  tiles: OverviewTile[];
}

const RESULT_LABELS: Record<ResultChipCount["result"], string> = {
  VERIFIED: "verified",
  OFFICIAL_RECORD_FOUND: "official record found",
  CONTRADICTED: "contradicted",
  COULD_NOT_VERIFY: "could not verify",
  COVERAGE_LIMITED: "coverage limited",
};

/* Render order for the breakdown chips: decisive results first. */
const RESULT_ORDER: ResultChipCount["result"][] = [
  "VERIFIED",
  "OFFICIAL_RECORD_FOUND",
  "CONTRADICTED",
  "COULD_NOT_VERIFY",
  "COVERAGE_LIMITED",
];

export function buildOverviewModel(report: Report): OverviewModel {
  const ledgerCount = report.ledger.length;
  const sourceCount = report.sources.length;
  const questionCount = report.questions.length;

  const blufParts: string[] = [];
  if (ledgerCount > 0) {
    blufParts.push(
      `We tested ${ledgerCount} ${ledgerCount === 1 ? "claim" : "claims"} against ${sourceCount} public ${sourceCount === 1 ? "source" : "sources"}.`,
    );
  } else {
    blufParts.push(
      `This report is built from ${sourceCount} public ${sourceCount === 1 ? "source" : "sources"}.`,
    );
  }
  if (questionCount > 0) {
    blufParts.push(
      `${questionCount} ${questionCount === 1 ? "question is" : "questions are"} ready to send back by email.`,
    );
  }
  blufParts.push("The boxes below jump to each part of the report.");
  const bluf = blufParts.join(" ");

  const partialNotice = report.meta.research_partial
    ? "Some sources could not be reached during this run. Gaps are marked in the ledger and in the honesty panel."
    : null;

  const breakdown: ResultChipCount[] = RESULT_ORDER.map((result) => ({
    result,
    label: RESULT_LABELS[result],
    count: report.ledger.filter((r) => r.result === result).length,
  })).filter((b) => b.count > 0);

  const claims =
    ledgerCount > 0
      ? {
          targetId: REPORT_SECTION_IDS.ledger,
          count: ledgerCount,
          breakdown,
          sourcesLine: `from ${sourceCount} public ${sourceCount === 1 ? "source" : "sources"}, every result dated and linked`,
        }
      : null;

  const questions =
    questionCount > 0
      ? {
          targetId: REPORT_SECTION_IDS.questions,
          count: questionCount,
          lead: "questions to send the vendor",
          detail: "Copy them as one email before you agree to a demo.",
        }
      : null;

  const tiles: OverviewTile[] = [];

  if (report.green_flags.length > 0) {
    tiles.push({
      key: "green-flags",
      targetId: REPORT_SECTION_IDS.greenFlags,
      count: report.green_flags.length,
      label: "things checked out",
      detail: null,
      state: "link",
    });
  } else {
    tiles.push({
      key: "green-flags",
      targetId: REPORT_SECTION_IDS.greenFlags,
      count: 0,
      label: "green flags",
      detail: "None surfaced by these checks.",
      state: "muted",
    });
  }

  if (report.adv_findings.length > 0) {
    tiles.push({
      key: "adv-findings",
      targetId: REPORT_SECTION_IDS.advFindings,
      count: report.adv_findings.length,
      label: report.adv_findings.length === 1 ? "note about the material" : "notes about the material",
      detail: null,
      state: "link",
    });
  } else if (report.meta.input_kind !== "name") {
    tiles.push({
      key: "adv-findings",
      targetId: REPORT_SECTION_IDS.advFindings,
      count: 0,
      label: "adversarial content",
      detail: "None found in the submitted material.",
      state: "muted",
    });
  }

  const honestyAttempted = report.honesty_panel.filter(
    (h) => h.status === "pass" || h.status === "flag",
  ).length;
  const honestyUnavailable = report.honesty_panel.filter(
    (h) => h.status === "could_not_check",
  ).length;
  if (report.honesty_panel.length > 0) {
    tiles.push({
      key: "honesty",
      targetId: REPORT_SECTION_IDS.honesty,
      count: report.honesty_panel.length,
      label: "checks attempted, all shown",
      detail:
        honestyUnavailable > 0
          ? `${honestyAttempted} ran, ${honestyUnavailable} could not run`
          : `${honestyAttempted} ran`,
      state: "link",
    });
  }

  if (report.manual_checks.length > 0) {
    tiles.push({
      key: "manual-checks",
      targetId: REPORT_SECTION_IDS.manualChecks,
      count: report.manual_checks.length,
      label: report.manual_checks.length === 1 ? "check only you can do" : "checks only you can do",
      detail: "About a minute each.",
      state: "link",
    });
  }

  const leadCount = report.leads?.length ?? 0;
  if (leadCount > 0) {
    tiles.push({
      key: "leads",
      targetId: REPORT_SECTION_IDS.leads,
      count: leadCount,
      label: leadCount === 1 ? "lead from research" : "leads from research",
      detail: "Surfaced but not confirmed.",
      state: "link",
    });
  }

  const nextCount = report.next_steps.length + report.sector.state_items.length;
  if (nextCount > 0) {
    tiles.push({
      key: "next-steps",
      targetId: REPORT_SECTION_IDS.nextSteps,
      count: nextCount,
      label: nextCount === 1 ? "next step" : "next steps",
      detail:
        report.sector.state_items.length > 0
          ? "Includes what your state already requires."
          : null,
      state: "link",
    });
  }

  if (report.sources.length > 0) {
    tiles.push({
      key: "sources",
      targetId: REPORT_SECTION_IDS.sources,
      count: report.sources.length,
      label: report.sources.length === 1 ? "source, dated" : "sources, dated",
      detail: null,
      state: "link",
    });
  }

  return { bluf, partialNotice, claims, questions, tiles };
}
