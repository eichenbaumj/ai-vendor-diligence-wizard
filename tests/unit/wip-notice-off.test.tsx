/*
  The release flip: with WIP_NOTICE off, no surface says field test or work
  in progress. This is the state a VITE_WIP=0 build ships, produced here by
  mocking the config module. Server-side render only; no browser.
*/
import { describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";

vi.mock("@/lib/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/config")>()),
  WIP_NOTICE: false,
}));

import { SiteHeader } from "@/components/brand/SiteHeader";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { WipBand } from "@/components/brand/WipNotice";
import { DisclaimerHeader } from "@/components/report/DisclaimerHeader";
import { VerdictHero } from "@/components/report/VerdictHero";
import About from "@/pages/About";
import { SAMPLE_REPORTS } from "@/lib/sample-reports";
import { WIP_ABOUT, WIP_HERO_PILL, WIP_NOTICE_ENABLED, WIP_REPORT } from "@/lib/wip-notice";

const report = Object.values(SAMPLE_REPORTS)[0];
const render = (el: ReactElement) =>
  renderToStaticMarkup(<StaticRouter location="/">{el}</StaticRouter>);
const STATUS_WORDS = /field test|work in progress/i;

describe("work-in-progress notice, flag off", () => {
  it("the flag reads off", () => {
    expect(WIP_NOTICE_ENABLED).toBe(false);
  });

  it("no surface says field test or work in progress", () => {
    const header = render(<SiteHeader />);
    expect(header).not.toContain("wip-ribbon");
    expect(header).not.toMatch(STATUS_WORDS);
    expect(header).not.toContain("mr-[4.75rem]");
    /* The wide-screen links return to their measured lg join point. */
    expect(header).toContain("hidden lg:block");
    expect(header).not.toContain("min-[1100px]");
    expect(render(<WipBand />)).toBe("");
    const band = render(<DisclaimerHeader report={report} />);
    expect(band).not.toContain(WIP_REPORT.text);
    expect(band).not.toMatch(STATUS_WORDS);
    expect(band).not.toContain("pr-14");
    expect(render(<VerdictHero report={report} disputed={false} />)).not.toContain(WIP_HERO_PILL);
    expect(render(<SiteFooter />)).not.toMatch(STATUS_WORDS);
    const about = render(<About />);
    expect(about).not.toContain(WIP_ABOUT.heading);
    expect(about).not.toMatch(STATUS_WORDS);
  });
});
