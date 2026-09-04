/*
  The release flip: with BETA_NOTICE off, no surface says beta. This is the
  state a VITE_BETA=0 build ships, produced here by mocking the config
  module. Server-side render only; no browser.
*/
import { describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";

vi.mock("@/lib/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/config")>()),
  BETA_NOTICE: false,
}));

import { BetaBanner } from "@/components/brand/BetaBanner";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { DisclaimerHeader } from "@/components/report/DisclaimerHeader";
import { VerdictHero } from "@/components/report/VerdictHero";
import About from "@/pages/About";
import { SAMPLE_REPORTS } from "@/lib/sample-reports";
import { BETA_ABOUT, BETA_HERO_PILL, BETA_NOTICE_ENABLED, BETA_REPORT } from "@/lib/beta-notice";

const report = Object.values(SAMPLE_REPORTS)[0];
const render = (el: ReactElement) =>
  renderToStaticMarkup(<StaticRouter location="/">{el}</StaticRouter>);

describe("beta notice, flag off", () => {
  it("the flag reads off", () => {
    expect(BETA_NOTICE_ENABLED).toBe(false);
  });

  it("no surface says beta", () => {
    expect(render(<BetaBanner />)).toBe("");
    expect(render(<DisclaimerHeader report={report} />)).not.toMatch(/\bbeta\b/i);
    expect(render(<DisclaimerHeader report={report} />)).not.toContain(BETA_REPORT.text);
    expect(render(<VerdictHero report={report} disputed={false} />)).not.toContain(BETA_HERO_PILL);
    expect(render(<SiteFooter />)).not.toMatch(/\bbeta\b/i);
    const about = render(<About />);
    expect(about).not.toContain(BETA_ABOUT.heading);
    expect(about).not.toMatch(/\bbeta\b/i);
  });
});
