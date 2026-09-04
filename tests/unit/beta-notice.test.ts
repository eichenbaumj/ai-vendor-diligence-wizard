/*
  Copy discipline for the beta notice. Every word the site says about its own
  beta status lives in src/lib/beta-notice.ts, so it is held to the measure
  the explainer copy meets (how-it-works-model.test.ts, section 8): zero
  language-lint findings, no jargon or em dashes, grade 10 or lower, no
  sentence over 30 words. "Pilot" joins the jargon list here because the
  chat uses "pilot release" for something else.
*/
import { describe, expect, it } from "vitest";
import { lintObject } from "@shared/lint.ts";
import { METHODOLOGY_VERSION } from "@shared/version.ts";
import { fleschKincaid } from "../../scripts/lib/readability.ts";
import {
  BETA_ABOUT,
  BETA_BANNER,
  BETA_GATE,
  BETA_HERO_PILL,
  BETA_REPORT,
  BETA_TAG,
  allBetaCopy,
  betaFooterLine,
} from "@/lib/beta-notice";

const JARGON =
  /—|\bz-scores?\b|\bAPI\b|\bRDAP\b|\bCDX\b|\bLLMs?\b|\bleverag(e|es|ed|ing)\b|\brobust\b|\bseamless(ly)?\b|\bholistic\b|\bdelv(e|es|ed|ing)\b|\bnot just\b|\bcomprehensive\b|\bunbiased\b|\bguarantee(s|d)?\b|\btyped, logged\b|\bskeletons?\b|\bsurfaces?\b|\bsurfaced\b|\bcensus\b|\bSourcewell\b|\bHaiku\b|\bSonnet\b|\bClaude\b|\bload-bearing\b|\b[Pp]ilot\b/;

describe("beta notice copy", () => {
  const copy = allBetaCopy();

  it("lists every surface's words", () => {
    const f = BETA_ABOUT.feedback;
    for (const s of [
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
    ]) {
      expect(copy).toContain(s);
    }
    for (const s of copy) expect(typeof s).toBe("string");
  });

  it("carries zero language-lint findings", () => {
    expect(lintObject(copy)).toEqual([]);
  });

  it("carries no jargon, no em dashes, no model names, and never says pilot", () => {
    expect(copy.filter((s) => JARGON.test(s))).toEqual([]);
  });

  it("reads at grade 10 or lower (house target 9), with no runaway sentences", () => {
    const joined = copy.map((s) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`)).join(" ");
    const grade = fleschKincaid(joined);
    expect(grade, `Flesch-Kincaid ${grade.toFixed(1)} (house target 9, cap 10)`).toBeLessThanOrEqual(10);
    const long = joined
      .split(/[.!?]+\s/)
      .map((s) => s.trim())
      .filter((s) => s.split(/\s+/).length > 30);
    expect(long).toEqual([]);
  });

  it("says beta on every surface a reader meets", () => {
    for (const s of [
      BETA_BANNER.full,
      BETA_BANNER.short,
      BETA_REPORT.lead,
      BETA_HERO_PILL,
      betaFooterLine("1.0"),
      BETA_GATE.title,
      BETA_GATE.intro,
      BETA_ABOUT.paragraphs[0],
    ]) {
      expect(s).toMatch(/\bbeta\b/i);
    }
  });

  it("names the work-in-progress rule where reports are read", () => {
    for (const s of [BETA_BANNER.full, BETA_BANNER.short, BETA_REPORT.text, BETA_HERO_PILL, BETA_ABOUT.paragraphs[1]]) {
      expect(s).toMatch(/work in progress/);
    }
  });

  it("stamps the footer with the version it is given, and the banner links to the About page", () => {
    expect(betaFooterLine(METHODOLOGY_VERSION)).toContain(`v${METHODOLOGY_VERSION}`);
    expect(BETA_BANNER.link.to).toBe("/about");
  });

  it("keeps the tag a word in source case (CSS uppercases it for the eye, not the screen reader)", () => {
    expect(BETA_TAG).toBe("Beta");
  });
});
