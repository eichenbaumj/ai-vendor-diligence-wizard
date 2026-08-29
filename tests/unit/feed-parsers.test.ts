/*
  Tests for the nightly feed parsers. Fixtures under tests/fixtures/feeds/ are
  trimmed from the real sources (retrieved 2026-08-28): the GovRAMP HTML is
  actual page markup, and the XLSX files are hand-made with openpyxl to mirror
  the real workbook structures (TX-RAMP's "3rd party" vendor column and padded
  engagement names; Sourcewell's merged-title preamble with the header on
  row 4). Production minimum-row guards are exercised with explicit minima.
*/
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  FeedParseError,
  decodeHtmlEntities,
  extractTxRampXlsxUrl,
  findHeaderRow,
  parseGovRampHtml,
  parseSourcewellXlsx,
  parseTxRampXlsx,
} from "../../scripts/lib/feed-parsers.ts";

function fixture(name: string): Buffer {
  return readFileSync(
    fileURLToPath(new URL(`../fixtures/feeds/${name}`, import.meta.url)),
  );
}

describe("parseGovRampHtml", () => {
  const html = fixture("govramp-participants.html").toString("utf-8");

  it("parses rows with provider, product, and verbatim status", () => {
    const rows = parseGovRampHtml(html, 5);
    expect(rows.length).toBeGreaterThanOrEqual(8);
    for (const r of rows) {
      expect(r.provider.length).toBeGreaterThan(0);
      expect(r.status.length).toBeGreaterThan(0);
    }
    const statuses = new Set(rows.map((r) => r.status));
    expect(statuses.has("Authorized, Federal JAB")).toBe(true);
    expect([...statuses].some((s) => /^Progressing|In Process|Pending|Not Progressing$/.test(s))).toBe(true);
  });

  it("decodes entity-encoded organization names", () => {
    const rows = parseGovRampHtml(html, 5);
    expect(rows.some((r) => r.provider.includes("CGI Technologies & Solutions"))).toBe(true);
    expect(rows.some((r) => r.provider.includes("&amp;"))).toBe(false);
  });

  it("excludes the 3PAO assessor table (rows without a status cell)", () => {
    const rows = parseGovRampHtml(html, 5);
    /* The fixture's 3PAO rows include known assessors; none may appear. */
    expect(rows.some((r) => /A-LIGN|Coalfire|Linford/.test(r.provider))).toBe(false);
  });

  it("throws loudly when data-column attributes are renamed", () => {
    const renamed = fixture("govramp-renamed-columns.html").toString("utf-8");
    expect(() => parseGovRampHtml(renamed, 5)).toThrow(FeedParseError);
  });

  it("throws below the minimum row count", () => {
    const few = fixture("govramp-too-few-rows.html").toString("utf-8");
    expect(() => parseGovRampHtml(few, 5)).toThrow(/minimum/);
  });
});

describe("extractTxRampXlsxUrl", () => {
  it("finds and absolutizes the current spreadsheet link", () => {
    const landing = fixture("txramp-landing.html").toString("utf-8");
    const url = extractTxRampXlsxUrl(landing, "https://dir.texas.gov");
    expect(url).toMatch(/^https:\/\/dir\.texas\.gov\/sites\/default\/files\/.*\.xlsx$/);
    expect(url).toContain("%20");
  });

  it("throws loudly when the landing page has no spreadsheet link", () => {
    const landing = fixture("txramp-landing-no-link.html").toString("utf-8");
    expect(() => extractTxRampXlsxUrl(landing, "https://dir.texas.gov")).toThrow(
      FeedParseError,
    );
  });
});

describe("parseTxRampXlsx", () => {
  it("maps 3rd party to provider, trims padded engagement names, keeps statuses verbatim", async () => {
    const rows = await parseTxRampXlsx(fixture("txramp-certified.xlsx"), 3);
    const exx = rows.find((r) => r.provider === "Overnite Software Inc.");
    expect(exx).toBeDefined();
    expect(exx?.product).toBe("ExxTend Learning");
    expect(exx?.status).toBe("Provisional");
    expect(new Set(rows.map((r) => r.status))).toEqual(
      new Set(["Provisional", "Level 2", "Level 1"]),
    );
  });

  it("skips rows missing a provider or a status", async () => {
    const rows = await parseTxRampXlsx(fixture("txramp-certified.xlsx"), 3);
    expect(rows.some((r) => r.provider === "")).toBe(false);
    expect(rows.some((r) => r.status === "")).toBe(false);
    expect(rows.some((r) => r.provider === "SomeVendor LLC")).toBe(false);
  });

  it("throws loudly when the header row vanishes", async () => {
    await expect(parseTxRampXlsx(fixture("txramp-renamed-columns.xlsx"), 1)).rejects.toThrow(
      FeedParseError,
    );
  });
});

describe("parseSourcewellXlsx", () => {
  it("locates the header behind the title preamble and maps supplier + contract", async () => {
    const rows = await parseSourcewellXlsx(fixture("sourcewell-contract-list.xlsx"), 2);
    expect(rows.length).toBe(3);
    expect(rows[1]).toEqual({ supplier: "GovAssist AI Inc", contract: "010101-GAI" });
  });

  it("throws when only headers remain (0 data rows never overwrite a good feed)", async () => {
    await expect(
      parseSourcewellXlsx(fixture("sourcewell-headers-only.xlsx"), 1),
    ).rejects.toThrow(/minimum/);
  });
});

describe("shared helpers", () => {
  it("findHeaderRow normalizes internal whitespace (the double-spaced TX-RAMP header)", () => {
    const rows = [["TX-RAMP Certification  ID", "3rd   party"]];
    const { columns } = findHeaderRow(rows, { provider: ["3rd party"] });
    expect(columns.provider).toBe(1);
  });

  it("decodeHtmlEntities handles named and numeric forms", () => {
    expect(decodeHtmlEntities("A&amp;B &#8217;s &#x2019;")).toBe("A&B ’s ’");
  });
});
