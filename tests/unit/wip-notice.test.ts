/*
  Copy discipline for the work-in-progress notice. Every word the site says
  about its own field-test status lives in src/lib/wip-notice.ts, so it is
  held to the measure the explainer copy meets (how-it-works-model.test.ts,
  section 8): zero language-lint findings, no jargon or em dashes, grade 10
  or lower, no sentence over 30 words. "Pilot" joins the jargon list because
  the chat uses "pilot release" for something else, and "beta" is checked on
  its own: the vocabulary is "field test" and "work in progress".
*/
import { describe, expect, it } from "vitest";
import { lintObject } from "@shared/lint.ts";
import { METHODOLOGY_VERSION } from "@shared/version.ts";
import { fleschKincaid } from "../../scripts/lib/readability.ts";
import {
  WIP_ABOUT,
  WIP_BAND,
  WIP_GATE,
  WIP_HERO_PILL,
  WIP_REPORT,
  WIP_RIBBON,
  allWipCopy,
  wipFooterLine,
} from "@/lib/wip-notice";

const JARGON =
  /—|\bz-scores?\b|\bAPI\b|\bRDAP\b|\bCDX\b|\bLLMs?\b|\bleverag(e|es|ed|ing)\b|\brobust\b|\bseamless(ly)?\b|\bholistic\b|\bdelv(e|es|ed|ing)\b|\bnot just\b|\bcomprehensive\b|\bunbiased\b|\bguarantee(s|d)?\b|\btyped, logged\b|\bskeletons?\b|\bsurfaces?\b|\bsurfaced\b|\bcensus\b|\bSourcewell\b|\bHaiku\b|\bSonnet\b|\bClaude\b|\bload-bearing\b|\b[Pp]ilot\b/;

describe("work-in-progress notice copy", () => {
  const copy = allWipCopy();

  it("lists every surface's words", () => {
    const f = WIP_ABOUT.feedback;
    for (const s of [
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

  it("never says beta", () => {
    expect(copy.filter((s) => /\bbeta\b/i.test(s))).toEqual([]);
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

  it("says field test or work in progress on every surface a reader meets", () => {
    for (const s of [
      WIP_RIBBON.text,
      WIP_RIBBON.title,
      `${WIP_BAND.tag} ${WIP_BAND.text}`,
      `${WIP_REPORT.lead} ${WIP_REPORT.text}`,
      WIP_HERO_PILL,
      wipFooterLine("1.0"),
      WIP_GATE.title,
      WIP_GATE.intro,
      WIP_ABOUT.paragraphs[0],
    ]) {
      expect(s).toMatch(/field test|work in progress/i);
    }
  });

  it("names the work-in-progress rule where reports are read", () => {
    for (const s of [WIP_RIBBON.text, WIP_BAND.text, WIP_REPORT.text, WIP_HERO_PILL, WIP_ABOUT.paragraphs[1]]) {
      expect(s).toMatch(/work in progress/i);
    }
  });

  it("keeps the About block short: three short paragraphs at most", () => {
    const words = (s: string) => s.trim().split(/\s+/).length;
    expect(WIP_ABOUT.paragraphs.length).toBeLessThanOrEqual(2);
    for (const p of WIP_ABOUT.paragraphs) expect(words(p)).toBeLessThanOrEqual(40);
    expect(words(WIP_ABOUT.feedback.lead)).toBeLessThanOrEqual(25);
  });

  it("stamps the footer with the version it is given, and both chrome shapes link to the About page", () => {
    expect(wipFooterLine(METHODOLOGY_VERSION)).toContain(`v${METHODOLOGY_VERSION}`);
    expect(WIP_RIBBON.to).toBe("/about");
    expect(WIP_BAND.link.to).toBe("/about");
  });
});
