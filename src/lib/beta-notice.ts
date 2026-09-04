/*
  Every word of the beta notice lives here and nowhere else. The notice is a
  standing claim the site makes about itself (in beta, still being worked
  on, every report a work in progress), so its copy is code-templated,
  linted, and unit-tested like report copy (report-overview-model.ts and
  how-it-works-model.ts follow the same rule). Surfaces that read from this
  module: the phase banner under the header (BetaBanner), the pill in the
  verdict row (VerdictHero), the clause in the report's date band
  (DisclaimerHeader), the footer stamp (SiteFooter), the About status block,
  and the gate intro (PasswordGate). The "(beta)" page title reads the same
  build variable in vite.config.ts, because index.html is static.

  The whole notice is controlled by BETA_NOTICE in config.ts. At general
  release build with VITE_BETA=0, confirm no surface says beta, then delete
  this file, BetaBanner.tsx, and the reads in the surfaces above.
*/
import { BETA_NOTICE } from "@/lib/config";
import { METHODOLOGY_VERSION } from "@shared/version.ts";

export const BETA_NOTICE_ENABLED: boolean = BETA_NOTICE;

/* Source case "Beta": CSS uppercases the tag, so a screen reader says the
   word rather than spelling it. */
export const BETA_TAG = "Beta";

/* The phase banner. `full` from the sm breakpoint up; `short` below it,
   where the row is about 335px wide and the long form runs to four lines. */
export const BETA_BANNER = {
  full: "This tool is in beta testing and we are still working on it. Pages and reports will change. Treat every report as a work in progress.",
  short:
    "In beta testing. Pages and reports will change. Treat every report as a work in progress.",
  link: { label: "What beta means", to: "/about" },
} as const;

/* Opens the report's date band. Prints with the report. */
export const BETA_REPORT = {
  lead: "Beta.",
  text: "This report comes from a tool that is still in testing. Treat it as a work in progress.",
} as const;

/* Outline pill beside the tier badge, in the row screenshots are taken of. */
export const BETA_HERO_PILL = "Beta · work in progress";

export function betaFooterLine(version: string): string {
  return `Beta. Methodology v${version}.`;
}

export const BETA_GATE = {
  title: "Private beta",
  intro:
    "This tool is in beta testing and every report is a work in progress. Enter the preview password to continue.",
} as const;

/* The About page's first body block while the notice is on; the banner
   links to /about. The feedback route is deliberately "the person who
   shared this link": the tool is gated and shared by hand, and the public
   repo publishes no general feedback address. */
export const BETA_ABOUT = {
  id: "status",
  heading: "Where this is today",
  paragraphs: [
    "The AI Vendor Diligence Wizard is in beta testing. A small group of public servants and partners is using it and telling us what works and what does not. We are still working on it, so pages, checks, and report layouts will change.",
    "Treat every report as a work in progress. Each report names the methodology version that made it, and the methodology page lists every check that version runs. A check may fail to reach its source, a sentence may need better wording, or a layout may look different next week. Re-run a check before you rely on it.",
  ],
  feedback: {
    lead: "If something looks wrong or confusing, tell the person who shared this link with you.",
    vendorsBefore: "Vendors named in a report should use the",
    vendorsLink: "corrections page",
    vendorsAfter: ".",
  },
} as const;

/* Every rendered string, in one list, for the copy-discipline tests. */
export function allBetaCopy(): string[] {
  const f = BETA_ABOUT.feedback;
  return [
    BETA_TAG,
    BETA_BANNER.full,
    BETA_BANNER.short,
    BETA_BANNER.link.label,
    BETA_REPORT.lead,
    BETA_REPORT.text,
    BETA_HERO_PILL,
    betaFooterLine(METHODOLOGY_VERSION),
    BETA_GATE.title,
    BETA_GATE.intro,
    BETA_ABOUT.heading,
    ...BETA_ABOUT.paragraphs,
    f.lead,
    `${f.vendorsBefore} ${f.vendorsLink}${f.vendorsAfter}`,
  ];
}
