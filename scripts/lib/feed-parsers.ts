/*
  Feed parsers for the nightly registry refresh (GitHub Actions, Node 20).

  Heavy parsing lives here, never in an edge function; the pipeline reads the
  pre-parsed rows these produce from registry_cache. Row shapes are imported
  from the pure feeds module so the contract stays single-sourced. Emit RAW
  provider/supplier strings as published (trimmed only): normalization happens
  symmetrically at match time, and the raw string is what renders in reports.

  Every parser fails LOUDLY (FeedParseError) on upstream redesigns: renamed
  columns, missing tables, or suspiciously few rows. A failed parse must never
  overwrite a good cached feed, so callers catch per feed and skip the upsert.

  Source mechanics (verified live 2026-08-28):
  - GovRAMP publishes an HTML page (no stable spreadsheet URL); every cell
    carries data-column / data-value attributes. Three tables: APL, PPL, and a
    3PAO assessor table whose rows have no status cell and must be excluded.
  - TX-RAMP is a versioned XLSX linked from a DIR landing page; the link must
    be discovered each run. The vendor company is the "3rd party" column;
    "Engagement Name" is the product and arrives with padded whitespace.
    The file host sits behind a bot challenge that sometimes blocks plain
    fetches; callers validate magic bytes and fail loudly on challenge pages.
  - Sourcewell publishes a nightly XLSX behind the stable alias
    https://sourcewell.co/contract-list (sheet has a title preamble; the
    header row must be located by scanning).
*/
import readXlsx from "read-excel-file/node";
import type {
  RampFeedRow,
  SourcewellFeedRow,
} from "../../supabase/functions/_shared/registry/feeds.ts";

export class FeedParseError extends Error {}

/* Production minimum row counts (observed live 2026-08-28: govramp ~370,
   txramp ~2,656, sourcewell ~1,061). Below these, something upstream broke
   and the parse must not replace a good cached feed. Tests pass smaller
   minima explicitly. */
export const MIN_ROWS = {
  govramp: 100,
  txramp: 500,
  sourcewell: 100,
} as const;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  rsquo: "’",
  lsquo: "‘",
};

export function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

/* ------------------------------------------------------------- GovRAMP */

function attr(tag: string, name: string): string | null {
  /* Order-insensitive single-attribute pull from one tag's text. */
  const m = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`));
  return m ? m[1] : null;
}

export function parseGovRampHtml(
  html: string,
  minRows: number = MIN_ROWS.govramp,
): RampFeedRow[] {
  const rows: RampFeedRow[] = [];
  for (const tr of html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? []) {
    const cells = new Map<string, string>();
    for (const td of tr.match(/<td[^>]*>/g) ?? []) {
      const column = attr(td, "data-column");
      const value = attr(td, "data-value");
      if (column && value !== null && !cells.has(column)) {
        cells.set(column, decodeHtmlEntities(value).trim());
      }
    }
    const provider = cells.get("organization_name");
    const status = cells.get("status");
    /* Rows without BOTH an organization and a status are structural noise or
       the 3PAO assessor table (which has no status column) — excluded. */
    if (!provider || !status) continue;
    const product = cells.get("service_offering");
    rows.push(product ? { provider, product, status } : { provider, status });
  }
  if (rows.length < minRows) {
    throw new FeedParseError(
      `govramp: parsed ${rows.length} rows (minimum ${minRows}); page layout likely changed`,
    );
  }
  return rows;
}

/* ------------------------------------------------------------- TX-RAMP */

export function extractTxRampXlsxUrl(landingHtml: string, baseUrl: string): string {
  const m = landingHtml.match(
    /href="([^"]*\/sites\/default\/files\/[^"]*tx-?ramp[^"]*\.xlsx[^"]*)"/i,
  );
  if (!m) {
    throw new FeedParseError(
      "txramp: no certified-products .xlsx link found on the DIR landing page",
    );
  }
  return new URL(decodeHtmlEntities(m[1]), baseUrl).toString();
}

interface HeaderMatch {
  index: number;
  columns: Record<string, number>;
}

const normHeader = (v: unknown): string =>
  String(v ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export function findHeaderRow(
  rows: readonly unknown[][],
  required: Record<string, string[]>,
): HeaderMatch {
  const scanDepth = Math.min(rows.length, 10);
  for (let i = 0; i < scanDepth; i++) {
    const headers = rows[i].map(normHeader);
    const columns: Record<string, number> = {};
    let allFound = true;
    for (const [field, aliases] of Object.entries(required)) {
      const at = headers.findIndex((h) => aliases.includes(h));
      if (at === -1) {
        allFound = false;
        break;
      }
      columns[field] = at;
    }
    if (allFound) return { index: i, columns };
  }
  throw new FeedParseError(
    `header row not found in the first ${scanDepth} rows; columns changed upstream (expected ${Object.values(
      required,
    )
      .map((a) => a[0])
      .join(", ")})`,
  );
}

const cell = (row: unknown[], at: number): string => String(row[at] ?? "").trim();

/* read-excel-file v9's node build returns [{ sheet, data }] regardless of
   options; both source workbooks are single-sheet, so take the first. */
async function firstSheetRows(data: Buffer): Promise<unknown[][]> {
  const result = (await readXlsx(data)) as unknown;
  const sheets = result as { sheet: string; data: unknown[][] }[];
  if (!Array.isArray(sheets) || sheets.length === 0 || !Array.isArray(sheets[0]?.data)) {
    throw new FeedParseError("workbook could not be read as a sheet list");
  }
  return sheets[0].data;
}

export async function parseTxRampXlsx(
  data: Buffer,
  minRows: number = MIN_ROWS.txramp,
): Promise<RampFeedRow[]> {
  const sheet = await firstSheetRows(data);
  const { index, columns } = findHeaderRow(sheet, {
    provider: ["3rd party", "vendor", "vendor name", "provider", "company"],
    product: ["engagement name", "product"],
    status: ["certification status", "status"],
  });
  const rows: RampFeedRow[] = [];
  for (const row of sheet.slice(index + 1)) {
    const provider = cell(row, columns.provider);
    const status = cell(row, columns.status);
    if (!provider || !status) continue;
    const product = cell(row, columns.product);
    rows.push(product ? { provider, product, status } : { provider, status });
  }
  if (rows.length < minRows) {
    throw new FeedParseError(
      `txramp: parsed ${rows.length} rows (minimum ${minRows}); workbook likely changed`,
    );
  }
  return rows;
}

/* ----------------------------------------------------------- Sourcewell */

export async function parseSourcewellXlsx(
  data: Buffer,
  minRows: number = MIN_ROWS.sourcewell,
): Promise<SourcewellFeedRow[]> {
  const sheet = await firstSheetRows(data);
  const { index, columns } = findHeaderRow(sheet, {
    supplier: ["supplier", "supplier name", "vendor"],
    contract: ["contract number", "contract #", "contract"],
  });
  const rows: SourcewellFeedRow[] = [];
  for (const row of sheet.slice(index + 1)) {
    const supplier = cell(row, columns.supplier);
    if (!supplier) continue;
    const contract = cell(row, columns.contract);
    rows.push(contract ? { supplier, contract } : { supplier });
  }
  if (rows.length < minRows) {
    throw new FeedParseError(
      `sourcewell: parsed ${rows.length} rows (minimum ${minRows}); workbook likely changed`,
    );
  }
  return rows;
}
