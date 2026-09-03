/*
  Render checks for the report surfaces methodology 1.8 changed: the leads
  list's adverse-headline pill and the one date phrase shared by leads and
  the source list. Server-side render only; no browser.
*/
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ADVERSE_HEADLINE_LABEL, LeadsList } from "@/components/report/LeadsList";
import { SourcesList } from "@/components/report/SourcesList";
import { formatPublished, sourceDatePhrase } from "@/lib/source-date";
import { lintText } from "@shared/lint.ts";

const AT = "2026-09-02T12:00:00.000Z";

describe("source date phrase", () => {
  it("formats full dates and month-only dates, and falls back to the retrieval date", () => {
    expect(formatPublished("2024-03-15")).toBe("Mar 15, 2024");
    expect(formatPublished("2024-03")).toBe("Mar 2024");
    expect(formatPublished("garbage")).toBeNull();
    expect(sourceDatePhrase({ retrieved_at: AT, published_at: "2024-03-15" })).toBe("published Mar 15, 2024");
    expect(sourceDatePhrase({ retrieved_at: AT, published_at: null })).toMatch(/^retrieved Sep 2, 2026$/);
    expect(sourceDatePhrase({ retrieved_at: AT })).toMatch(/^retrieved /);
  });
});

describe("LeadsList", () => {
  it("shows the fixed adverse pill only on flagged leads, and a date line on every lead", () => {
    const html = renderToStaticMarkup(
      <LeadsList
        leads={[
          { url: "https://news.example.org/2022/09/14/sued", title: "Vendor sued over terminated contract", retrieved_at: AT, source_class: 3, note: "Read during research: mentions Acme.", published_at: "2022-09-14", flag: "adverse_headline" },
          { url: "https://www.govtech.com/acme", title: "Acme raises a round", retrieved_at: AT, source_class: 2, note: "Read during research: mentions Acme.", published_at: null },
        ]}
      />,
    );
    expect(html.split(ADVERSE_HEADLINE_LABEL).length - 1).toBe(1);
    expect(html).toContain("published Sep 14, 2022");
    expect(html).toContain("retrieved Sep 2, 2026");
    expect(html).toContain("listed first");
    expect(lintText(ADVERSE_HEADLINE_LABEL)).toEqual([]);
  });
  it("renders nothing for an empty list", () => {
    expect(renderToStaticMarkup(<LeadsList leads={[]} />)).toBe("");
  });
});

describe("SourcesList", () => {
  it("prints the publication date when present and the retrieval date otherwise", () => {
    const html = renderToStaticMarkup(
      <SourcesList
        sources={[
          { url: "https://a.example.org/2024/01/02/x", title: "A", retrieved_at: AT, published_at: "2024-01-02" },
          { url: "https://b.example.org/y", title: "B", retrieved_at: AT, published_at: null },
        ]}
        unassessed={[{ url: "https://c.example.gov/z", title: "C", retrieved_at: AT, published_at: "2025-06" }]}
      />,
    );
    expect(html).toContain("(published Jan 2, 2024)");
    expect(html).toContain("(retrieved Sep 2, 2026)");
    expect(html).toContain("(published Jun 2025)");
  });
});
