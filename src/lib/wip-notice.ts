/*
  Every word of the work-in-progress notice lives here and nowhere else. The
  notice is a standing claim the site makes about itself (in field testing,
  still being built, every report a work in progress), so its copy is
  code-templated, linted, and unit-tested like report copy
  (report-overview-model.ts and how-it-works-model.ts follow the same rule).
  Surfaces that read from this module: the corner ribbon in the header
  (WipRibbon, md and up) and the band under the header below md (WipBand),
  the pill in the verdict row (VerdictHero), the clause opening the report's
  date band (DisclaimerHeader), the footer stamp (SiteFooter), the About
  status block, and the gate title and intro (PasswordGate). The
  "(field test)" page title reads the same build variable in vite.config.ts,
  because index.html is static.

  The whole notice is controlled by WIP_NOTICE in config.ts. At general
  release build with VITE_WIP=0, confirm no surface says field test or work
  in progress, then delete this file, WipNotice.tsx, the ribbon styles in
  brand.css, and the reads in the surfaces above.
*/
import { WIP_NOTICE } from "@/lib/config";
import { METHODOLOGY_VERSION } from "@shared/version.ts";

export const WIP_NOTICE_ENABLED: boolean = WIP_NOTICE;

/* The corner ribbon, md and up. The text is the sticker; the title is the
   hover text. Source case, CSS uppercases it. */
export const WIP_RIBBON = {
  text: "Work in progress",
  title: "This tool is in field testing. Click for what that means.",
  to: "/about",
} as const;

/* The band under the header below md, where a corner ribbon would cover the
   header's one button or push the brand name into the nav. */
export const WIP_BAND = {
  tag: "Field test",
  text: "This tool is a work in progress, so pages and reports will change.",
  link: { label: "What this means", to: "/about" },
} as const;

/* Opens the report's date band. Prints with the report. */
export const WIP_REPORT = {
  lead: "Field test.",
  text: "This tool is still being built and tested. Treat this report as a work in progress.",
} as const;

/* Outline pill beside the tier badge, in the row screenshots are taken of. */
export const WIP_HERO_PILL = "Field test · work in progress";

export function wipFooterLine(version: string): string {
  return `Field test. Methodology v${version}.`;
}

export const WIP_GATE = {
  title: "Private field test",
  intro:
    "This tool is in field testing and every report is a work in progress. Enter the preview password to continue.",
} as const;

/* The About page's first body block while the notice is on; the ribbon and
   the band both link to /about. The feedback route is deliberately "the
   person who shared this link": the tool is gated and shared by hand, and
   the public repo publishes no general feedback address. */
export const WIP_ABOUT = {
  id: "status",
  heading: "Where this is today",
  paragraphs: [
    "The AI Vendor Diligence Wizard is in field testing with a small group of public servants and partners. We are still building it, so pages, checks, and report layouts will change.",
    "Treat every report as a work in progress, and re-run a check before you rely on it.",
  ],
  feedback: {
    lead: "If something looks wrong or confusing, tell the person who shared this link with you.",
    vendorsBefore: "Vendors named in a report should use the",
    vendorsLink: "corrections page",
    vendorsAfter: ".",
  },
} as const;

/* Every rendered string, in one list, for the copy-discipline tests. */
export function allWipCopy(): string[] {
  const f = WIP_ABOUT.feedback;
  return [
    WIP_RIBBON.text,
    WIP_RIBBON.title,
    WIP_BAND.tag,
    WIP_BAND.text,
    WIP_BAND.link.label,
    WIP_REPORT.lead,
    WIP_REPORT.text,
    WIP_HERO_PILL,
    wipFooterLine(METHODOLOGY_VERSION),
    WIP_GATE.title,
    WIP_GATE.intro,
    WIP_ABOUT.heading,
    ...WIP_ABOUT.paragraphs,
    f.lead,
    `${f.vendorsBefore} ${f.vendorsLink}${f.vendorsAfter}`,
  ];
}
