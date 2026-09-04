/*
  Render checks for the work-in-progress notice surfaces with the flag on,
  which is the vitest default because VITE_WIP is unset. Server-side render
  only; no browser (the pattern of leads-list-render.test.tsx).
*/
import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { METHODOLOGY_VERSION } from "@shared/version.ts";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { WipBand, WipRibbon } from "@/components/brand/WipNotice";
import { DisclaimerHeader } from "@/components/report/DisclaimerHeader";
import { VerdictHero } from "@/components/report/VerdictHero";
import About from "@/pages/About";
import { SAMPLE_REPORTS } from "@/lib/sample-reports";
import {
  WIP_ABOUT,
  WIP_BAND,
  WIP_HERO_PILL,
  WIP_NOTICE_ENABLED,
  WIP_REPORT,
  WIP_RIBBON,
  wipFooterLine,
} from "@/lib/wip-notice";

const report = Object.values(SAMPLE_REPORTS)[0];
const render = (el: ReactElement) =>
  renderToStaticMarkup(<StaticRouter location="/">{el}</StaticRouter>);

describe("work-in-progress notice, flag on", () => {
  it("is on by default in a build with VITE_WIP unset", () => {
    expect(WIP_NOTICE_ENABLED).toBe(true);
  });

  it("the header carries the corner ribbon once, as a link to About, shown from md up", () => {
    const html = render(<SiteHeader />);
    expect(html.split('class="wip-ribbon ').length - 1).toBe(1);
    expect(html).toContain("wip-ribbon hidden md:block");
    expect(html.split(WIP_RIBBON.text).length - 1).toBe(1);
    expect(html).toContain(`title="${WIP_RIBBON.title}"`);
    expect(html).toContain(`href="${WIP_RIBBON.to}"`);
    /* The nav keeps room for the ribbon below 1264px. */
    expect(html).toContain("md:max-[1296px]:mr-[4.75rem]");
  });

  it("the ribbon and the band render nothing when disabled by prop", () => {
    expect(render(<WipRibbon enabled={false} />)).toBe("");
    expect(render(<WipBand enabled={false} />)).toBe("");
  });

  it("the band shows the tag, the sentence, and the About link, below md only, and hides in print", () => {
    const html = render(<WipBand />);
    expect(html).toContain(`>${WIP_BAND.tag}<`);
    expect(html).toContain(WIP_BAND.text);
    expect(html).toContain(`href="${WIP_BAND.link.to}"`);
    expect(html).toContain(WIP_BAND.link.label);
    expect(html).toContain("md:hidden");
    expect(html).toContain("no-print");
  });

  it("the report's date band opens with the field-test clause, before the triage sentence, still prints, and clears the ribbon", () => {
    const html = render(<DisclaimerHeader report={report} />);
    expect(html).toContain(WIP_REPORT.lead);
    expect(html).toContain(WIP_REPORT.text);
    expect(html.indexOf(WIP_REPORT.text)).toBeLessThan(html.indexOf("point-in-time"));
    expect(html).not.toContain("no-print");
    expect(html).toContain("md:max-[1263px]:pr-14");
  });

  it("the verdict row carries the pill once, beside the tier badge", () => {
    const html = render(<VerdictHero report={report} disputed={false} />);
    expect(html.split(WIP_HERO_PILL).length - 1).toBe(1);
  });

  it("the footer stamps the current methodology version", () => {
    expect(render(<SiteFooter />)).toContain(wipFooterLine(METHODOLOGY_VERSION));
  });

  it("the About page opens its body with the status block and points vendors to corrections", () => {
    const html = render(<About />);
    expect(html).toContain(WIP_ABOUT.heading);
    expect(html.indexOf(WIP_ABOUT.heading)).toBeLessThan(html.indexOf("Why we built it"));
    for (const p of WIP_ABOUT.paragraphs) expect(html).toContain(p);
    expect(html).toContain(WIP_ABOUT.feedback.lead);
    expect(html).toContain('href="/disputes"');
  });
});
