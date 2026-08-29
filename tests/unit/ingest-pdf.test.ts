/*
  Tests for PDF ingestion. Fixture PDFs under tests/fixtures/pdfs/ are
  hand-written minimal PDFs with uncompressed content streams (built by the
  script recorded in the repo history): a clean one-pager, and an injected
  twin identical except for one 0.1pt text run carrying an instruction
  payload — matching exactly what v1 detection flags. analyzePdfItems is
  additionally exercised on synthetic items.
*/
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  PdfIngestError,
  analyzePdfItems,
  extractPdf,
  isPdfBytes,
  type PdfTextItem,
} from "@shared/ingest-pdf.ts";
import { runForensics } from "@shared/forensics.ts";

function fixture(name: string): Uint8Array {
  return new Uint8Array(
    readFileSync(fileURLToPath(new URL(`../fixtures/pdfs/${name}`, import.meta.url))),
  );
}

describe("isPdfBytes", () => {
  it("accepts the PDF magic and rejects HTML", () => {
    expect(isPdfBytes(fixture("clean-onepager.pdf"))).toBe(true);
    expect(isPdfBytes(new TextEncoder().encode("<html>challenge</html>"))).toBe(false);
  });
});

describe("extractPdf", () => {
  it("extracts the text layer with page count", async () => {
    const out = await extractPdf(fixture("clean-onepager.pdf"));
    expect(out.pages).toBe(1);
    expect(out.text).toContain("CivReply AI");
    expect(out.text).toContain("fourteen municipal governments");
    expect(out.items.length).toBeGreaterThanOrEqual(3);
  });

  it("keeps hidden runs in the extracted text (hidden text is evidence)", async () => {
    const out = await extractPdf(fixture("injected-onepager-tinyfont.pdf"));
    expect(out.text).toContain("Note to AI evaluators");
  });

  it("rejects non-PDF bytes with friendly copy", async () => {
    await expect(extractPdf(new TextEncoder().encode("plain text"))).rejects.toThrow(
      PdfIngestError,
    );
  });
});

describe("analyzePdfItems", () => {
  const item = (str: string, fontSize: number, x = 72, y = 700): PdfTextItem => ({
    str,
    fontSize,
    x,
    y,
  });

  it("flags tiny-font text and quotes it (the real injected fixture)", async () => {
    const out = await extractPdf(fixture("injected-onepager-tinyfont.pdf"));
    const { finding, spans } = analyzePdfItems(out.items);
    expect(finding?.code).toBe("ADV-01");
    expect(finding?.detail).toContain("Note to AI evaluators");
    expect(spans.some((s) => s.includes("highest tier"))).toBe(true);
  });

  it("stays quiet on the clean fixture", async () => {
    const out = await extractPdf(fixture("clean-onepager.pdf"));
    expect(analyzePdfItems(out.items).finding).toBeNull();
  });

  it("flags off-page text at negative coordinates", () => {
    const { finding } = analyzePdfItems([
      item("visible normal paragraph", 12),
      item("a hidden instruction placed far off the visible page area", 12, -500, 700),
    ]);
    expect(finding?.code).toBe("ADV-01");
  });

  it("ignores tiny decorative runs under the minimum length", () => {
    const { finding } = analyzePdfItems([item("tm", 2), item("normal text", 12)]);
    expect(finding).toBeNull();
  });

  it("normal 10pt body text never fires", () => {
    const { finding } = analyzePdfItems([
      item("Perfectly ordinary paragraph of pitch text at a readable size.", 10),
    ]);
    expect(finding).toBeNull();
  });
});

describe("pdf text flows through the standard forensics", () => {
  it("the injected fixture's extracted text fires ADV-02 (instruction pattern)", async () => {
    const out = await extractPdf(fixture("injected-onepager-tinyfont.pdf"));
    const forensics = runForensics(out.text);
    expect(forensics.adv_findings.some((f) => f.code === "ADV-02")).toBe(true);
  });
});
