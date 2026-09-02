/*
  The report-overview model: every sentence, count, and bar segment on the
  at-a-glance card, derived in pure code from the report JSON. Templates
  live here, not in JSX, for the same reason load-bearing self-descriptions
  are code-templated everywhere else: the card describes what the report
  offers, so its copy is deterministic, unit-tested, and linted.

  Shape (Joe's design direction, 2026-08-31): not a flat grid of big
  numbers. Three narrative groups — what we found, what we could check,
  what to do next — with the two part-to-whole facts (claim results,
  check coverage) rendered as segmented bars so the numbers relate to one
  another graphically, and the action counts as icon tiles.

  A tile or bar renders only when its section renders (the section
  components early-return null on empty data, and this model applies the
  same conditions so the two can never drift). Green flags and adversarial
  findings are the two sections where zero is itself information, so they
  get muted zero-state tiles; the adversarial zero-state is skipped on
  name-only runs, where no material was submitted for those screens to
  read.
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

/* Group headings, exported so the lint tests cover them. */
export const OVERVIEW_GROUP_LABELS = {
  found: "What we found",
  coverage: "What we could check",
  next: "What to do next",
} as const;

export type ClaimResult =
  | "VERIFIED"
  | "OFFICIAL_RECORD_FOUND"
  | "CONTRADICTED"
  | "COULD_NOT_VERIFY"
  | "COVERAGE_LIMITED";

export interface BarSegment {
  key: string;
  label: string;
  count: number;
}

export interface OverviewTile {
  key: "green-flags" | "adv-findings" | "leads" | "questions" | "manual-checks" | "next-steps";
  targetId: string;
  count: number;
  label: string;
  detail: string | null;
  state: "link" | "muted";
  /* Exactly one tile per report is primary (the questions tile): the one
     action the reader should take. */
  primary?: boolean;
}

export interface OverviewModel {
  bluf: string;
  partialNotice: string | null;
  /* Set when the name-run website step failed (the site_discovery honesty
     row): the reader should know the website checks are missing and how
     to get them. */
  siteNotice: string | null;
  /* Set when a bare-name run found exact-name registry records it could
     not tie to the vendor (the name_collision honesty row, 1.7). */
  collisionNotice: string | null;
  found: {
    claims: {
      targetId: string;
      count: number;
      title: string;
      segments: BarSegment[];
    } | null;
    tiles: OverviewTile[];
  };
  coverage: {
    targetId: string;
    title: string;
    segments: BarSegment[];
    notApplicable: number;
    sourcesLine: string;
    sourcesTargetId: string;
  } | null;
  next: {
    tiles: OverviewTile[];
  };
}

const RESULT_LABELS: Record<ClaimResult, string> = {
  VERIFIED: "verified",
  OFFICIAL_RECORD_FOUND: "official record found",
  CONTRADICTED: "contradicted",
  COULD_NOT_VERIFY: "could not verify",
  COVERAGE_LIMITED: "coverage limited",
};

/* Render order for the claim segments: decisive results first. */
const RESULT_ORDER: ClaimResult[] = [
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
  blufParts.push("Everything below jumps to its part of the report.");
  const bluf = blufParts.join(" ");

  const partialNotice = report.meta.research_partial
    ? "Some sources could not be reached during this run. Gaps are marked in the ledger and in the honesty panel."
    : null;

  /* Mirrors the site_discovery disclosure check (site-degradation.ts): on
     a name run whose website step failed, the missing coverage should be
     visible at the top, not only in the honesty panel. Worded for every
     failure branch: the checks that READ the site's pages are missing in
     all of them, while the domain-record checks may still have run (the
     unreadable and late-found cases), so the notice never claims more
     coverage is missing than actually is. */
  const siteNotice = report.honesty_panel.some(
    (h) => h.check_id === "site_discovery" && h.status === "could_not_check",
  )
    ? "We could not find or read this vendor's website during this run, so the checks that read its pages are missing. The honesty panel has the details. To include those checks, run a new check with the vendor's web address pasted in."
    : null;

  /* Mirrors the name_collision honesty row (name-collision.ts): records-
     only wording, because "refused" means untied, not "another company"
     (dual entities exist). Kept byte-identical to NAME_COLLISION_NOTICE
     in the shared module by test. */
  const collisionNotice = report.honesty_panel.some(
    (h) => h.check_id === "name_collision" && h.status === "flag",
  )
    ? "Other registry records under this vendor's name could not be tied to it. They earn no credit and drive no warning. Confirm the legal name with the vendor. Adding the web address to a new check makes the match much stronger."
    : null;

  /* ------------------------------------------------------- what we found */

  const claimSegments: BarSegment[] = RESULT_ORDER.map((result) => ({
    key: result,
    label: RESULT_LABELS[result],
    count: report.ledger.filter((r) => r.result === result).length,
  })).filter((s) => s.count > 0);

  const claims =
    ledgerCount > 0
      ? {
          targetId: REPORT_SECTION_IDS.ledger,
          count: ledgerCount,
          title: `${ledgerCount} ${ledgerCount === 1 ? "claim" : "claims"} tested, every result dated and linked`,
          segments: claimSegments,
        }
      : null;

  const foundTiles: OverviewTile[] = [];

  if (report.green_flags.length > 0) {
    foundTiles.push({
      key: "green-flags",
      targetId: REPORT_SECTION_IDS.greenFlags,
      count: report.green_flags.length,
      label: report.green_flags.length === 1 ? "thing checked out" : "things checked out",
      detail: null,
      state: "link",
    });
  } else {
    foundTiles.push({
      key: "green-flags",
      targetId: REPORT_SECTION_IDS.greenFlags,
      count: 0,
      label: "green flags",
      detail: "None surfaced by these checks.",
      state: "muted",
    });
  }

  if (report.adv_findings.length > 0) {
    foundTiles.push({
      key: "adv-findings",
      targetId: REPORT_SECTION_IDS.advFindings,
      count: report.adv_findings.length,
      label:
        report.adv_findings.length === 1
          ? "note about the material"
          : "notes about the material",
      detail: null,
      state: "link",
    });
  } else if (report.meta.input_kind !== "name") {
    foundTiles.push({
      key: "adv-findings",
      targetId: REPORT_SECTION_IDS.advFindings,
      count: 0,
      label: "adversarial content",
      detail: "None found in the submitted material.",
      state: "muted",
    });
  }

  const leadCount = report.leads?.length ?? 0;
  if (leadCount > 0) {
    foundTiles.push({
      key: "leads",
      targetId: REPORT_SECTION_IDS.leads,
      count: leadCount,
      label: leadCount === 1 ? "lead from research" : "leads from research",
      detail: "Surfaced but not confirmed.",
      state: "link",
    });
  }

  /* --------------------------------------------------- what we could check */

  /* The collision notice is a notice, not a check that ran: it never
     counts toward the coverage bar. */
  const honesty = report.honesty_panel.filter((h) => h.check_id !== "name_collision");
  const ran = honesty.filter((h) => h.status === "pass" || h.status === "flag").length;
  const couldNotRun = honesty.filter((h) => h.status === "could_not_check").length;
  const notApplicable = honesty.filter((h) => h.status === "not_applicable").length;

  const coverageSegments: BarSegment[] = [
    { key: "ran", label: "ran", count: ran },
    { key: "could_not_run", label: "could not run", count: couldNotRun },
  ].filter((s) => s.count > 0);

  const coverage =
    honesty.length > 0
      ? {
          targetId: REPORT_SECTION_IDS.honesty,
          title: `${ran + couldNotRun} ${ran + couldNotRun === 1 ? "check" : "checks"} attempted, every one shown`,
          segments: coverageSegments,
          notApplicable,
          sourcesLine: `${sourceCount} public ${sourceCount === 1 ? "source" : "sources"}, each dated and linked`,
          sourcesTargetId: REPORT_SECTION_IDS.sources,
        }
      : null;

  /* ------------------------------------------------------ what to do next */

  const nextTiles: OverviewTile[] = [];

  if (questionCount > 0) {
    nextTiles.push({
      key: "questions",
      targetId: REPORT_SECTION_IDS.questions,
      count: questionCount,
      label: "questions to send the vendor",
      detail: "Copy them as one email before you agree to a demo.",
      state: "link",
      primary: true,
    });
  }

  if (report.manual_checks.length > 0) {
    nextTiles.push({
      key: "manual-checks",
      targetId: REPORT_SECTION_IDS.manualChecks,
      count: report.manual_checks.length,
      label:
        report.manual_checks.length === 1
          ? "check only you can do"
          : "checks only you can do",
      detail: "About a minute each.",
      state: "link",
    });
  }

  const nextCount = report.next_steps.length + report.sector.state_items.length;
  if (nextCount > 0) {
    nextTiles.push({
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

  return {
    bluf,
    partialNotice,
    siteNotice,
    collisionNotice,
    found: { claims, tiles: foundTiles },
    coverage,
    next: { tiles: nextTiles },
  };
}
