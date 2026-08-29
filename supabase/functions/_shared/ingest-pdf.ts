/*
  PDF ingestion for pdf-submitted pitches. Uses unpdf (the serverless pdf.js
  build) through the same dual-resolution pattern as zod: the bare import
  resolves via supabase/functions/import_map.json under Deno and via
  package.json under vitest/Vite.

  Extraction reads the text layer only. Hidden-text detection is the honest
  v1 subset of the research design: text smaller than ~4 points and text
  positioned at negative coordinates are flagged as ADV-01; color-matched
  text, opacity tricks, and comparison against the rendered page require
  operator-list parsing or rendering plus OCR and remain planned (the
  security docs say exactly this). Hidden runs are deliberately KEPT in the
  extracted text: hidden text is evidence, and the downstream forensics
  (instruction patterns, invisible Unicode) must see it, exactly as they see
  pasted text.
*/
import { extractTextItems } from "unpdf";
import type { AdvFinding } from "./schemas.ts";

export const PDF_MAX_PAGES = 25;
export const PDF_TEXT_MAX_CHARS = 40_000;
const TINY_FONT_PT = 4;
const MIN_HIDDEN_CHARS = 40;

export class PdfIngestError extends Error {
  constructor(
    /* Sentence-shaped, user-facing via the api-errors passthrough. */
    message: string,
  ) {
    super(message);
    this.name = "PdfIngestError";
  }
}

export interface PdfTextItem {
  str: string;
  fontSize: number;
  x: number;
  y: number;
}

export interface PdfExtract {
  text: string;
  pages: number;
  items: PdfTextItem[];
}

export function isPdfBytes(bytes: Uint8Array): boolean {
  return (
    bytes.length > 5 &&
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 && // F
    bytes[4] === 0x2d // -
  );
}

export async function extractPdf(bytes: Uint8Array): Promise<PdfExtract> {
  let totalPages: number;
  let pages: PdfTextItem[][];
  try {
    /* pdf.js detaches the buffer it is given; hand it a copy. */
    const result = await extractTextItems(new Uint8Array(bytes));
    totalPages = result.totalPages;
    pages = result.items as unknown as PdfTextItem[][];
  } catch {
    throw new PdfIngestError("that file does not look like a readable PDF");
  }
  if (totalPages > PDF_MAX_PAGES) {
    throw new PdfIngestError(
      `this PDF is longer than ${PDF_MAX_PAGES} pages, paste the pitch text instead`,
    );
  }
  const items: PdfTextItem[] = [];
  const parts: string[] = [];
  let chars = 0;
  for (const page of pages) {
    for (const item of page) {
      const str = typeof item.str === "string" ? item.str : "";
      if (str.trim().length === 0) continue;
      items.push({
        str,
        fontSize: Number(item.fontSize ?? 0),
        x: Number(item.x ?? 0),
        y: Number(item.y ?? 0),
      });
      if (chars < PDF_TEXT_MAX_CHARS) {
        parts.push(str);
        chars += str.length + 1;
      }
    }
    parts.push("\n");
  }
  const text = parts.join("\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, PDF_TEXT_MAX_CHARS);
  return { text, pages: totalPages, items };
}

export interface PdfHiddenResult {
  finding: AdvFinding | null;
  spans: string[];
}

/* Pure analysis over extracted items; unit-tested with synthetic items. */
export function analyzePdfItems(items: PdfTextItem[]): PdfHiddenResult {
  const tiny: string[] = [];
  const offPage: string[] = [];
  for (const item of items) {
    const str = item.str.replace(/\s+/g, " ").trim();
    if (!str) continue;
    if (item.fontSize > 0 && item.fontSize < TINY_FONT_PT) tiny.push(str);
    else if (item.x < 0 || item.y < 0) offPage.push(str);
  }
  const spans: string[] = [];
  if (tiny.join(" ").length >= MIN_HIDDEN_CHARS) spans.push(...tiny);
  if (offPage.join(" ").length >= MIN_HIDDEN_CHARS) spans.push(...offPage);
  if (spans.length === 0) return { finding: null, spans };
  const quoted = spans[0].slice(0, 180);
  return {
    finding: {
      code: "ADV-01",
      detail:
        `The submitted PDF contains text a human reader would not see (smaller than ${TINY_FONT_PT} points, or placed outside the page). The first hidden passage reads: "${quoted}". Hidden text is a known channel for content aimed at automated systems, and its presence is surfaced as a finding.`.slice(
          0,
          500,
        ),
    },
    spans,
  };
}
