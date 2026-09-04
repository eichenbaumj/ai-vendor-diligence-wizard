/*
  Render checks for the beta notice surfaces with the flag on, which is the
  vitest default because VITE_BETA is unset. Server-side render only; no
  browser (the pattern of leads-list-render.test.tsx).
*/
import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { METHODOLOGY_VERSION } from "@shared/version.ts";
import { BetaBanner } from "@/components/brand/BetaBanner";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { DisclaimerHeader } from "@/components/report/DisclaimerHeader";
import { VerdictHero } from "@/components/report/VerdictHero";
import About from "@/pages/About";
import { SAMPLE_REPORTS } from "@/lib/sample-reports";
import {
  BETA_ABOUT,
  BETA_BANNER,
  BETA_HERO_PILL,
  BETA_NOTICE_ENABLED,
  BETA_REPORT,
  BETA_TAG,
  betaFooterLine,
} from "@/lib/beta-notice";

const report = Object.values(SAMPLE_REPORTS)[0];
const render = (el: ReactElement) =>
  renderToStaticMarkup(<StaticRouter location="/">{el}</StaticRouter>);

describe("beta notice, flag on", () => {
  it("is on by default in a build with VITE_BETA unset", () => {
    expect(BETA_NOTICE_ENABLED).toBe(true);
  });

  it("the banner shows the tag, both copy forms, the About link, and hides in print", () => {
    const html = render(<BetaBanner />);
    expect(html).toContain(`>${BETA_TAG}<`);
    expect(html).toContain(BETA_BANNER.full);
    expect(html).toContain(BETA_BANNER.short);
    expect(html).toContain(`href="${BETA_BANNER.link.to}"`);
    expect(html).toContain(BETA_BANNER.link.label);
    expect(html).toContain("no-print");
  });

  it("the banner renders nothing when disabled by prop", () => {
    expect(render(<BetaBanner enabled={false} />)).toBe("");
  });

  it("the report's date band opens with the beta clause, before the triage sentence, and still prints", () => {
    const html = render(<DisclaimerHeader report={report} />);
    expect(html).toContain(BETA_REPORT.lead);
    expect(html).toContain(BETA_REPORT.text);
    expect(html.indexOf(BETA_REPORT.text)).toBeLessThan(html.indexOf("point-in-time"));
    expect(html).not.toContain("no-print");
  });

  it("the verdict row carries the beta pill once, beside the tier badge", () => {
    const html = render(<VerdictHero report={report} disputed={false} />);
    expect(html.split(BETA_HERO_PILL).length - 1).toBe(1);
  });

  it("the footer stamps the current methodology version", () => {
    expect(render(<SiteFooter />)).toContain(betaFooterLine(METHODOLOGY_VERSION));
  });

  it("the About page opens its body with the status block and points vendors to corrections", () => {
    const html = render(<About />);
    expect(html).toContain(BETA_ABOUT.heading);
    expect(html.indexOf(BETA_ABOUT.heading)).toBeLessThan(html.indexOf("Why we built it"));
    for (const p of BETA_ABOUT.paragraphs) expect(html).toContain(p);
    expect(html).toContain(BETA_ABOUT.feedback.lead);
    expect(html).toContain('href="/disputes"');
  });
});
