/*
  D1.5 — Web operating history via the Internet Archive Wayback Machine.

  One CDX call, collapsed to one row per captured month
  (collapse=timestamp:6), returns the first capture, the most recent
  captured month, and a conservative capture-count estimate (distinct
  months with at least one capture) in a single small response.

  No web history is INFO, never adverse: young sites are normal for new
  companies, and the summary says so.

  Pure module: no Deno APIs, no module-level state. Never throws.
*/
import type { RegistryCheck } from "../schemas.ts";

export interface RegistryCtx {
  fetchFn?: typeof fetch;
  signal?: AbortSignal;
  apiKeys?: Record<string, string>;
  now?: () => Date;
}

const CHECK_ID = "wayback_history";
const SOURCE = "Internet Archive Wayback Machine";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function resolveFetch(ctx: RegistryCtx): typeof fetch {
  return ctx.fetchFn ?? ((input, init) => globalThis.fetch(input, init));
}

function nowIso(ctx: RegistryCtx): string {
  return (ctx.now?.() ?? new Date()).toISOString();
}

function cleanDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/\.$/, "");
}

/* CDX timestamps are yyyymmddhhmmss. */
function parseCdxTimestamp(ts: string): { iso: string; label: string } | null {
  const m = ts.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) return null;
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return { iso: `${year}-${mm}-${dd}`, label: `${MONTHS[month - 1]} ${year}` };
}

export async function checkWebHistory(
  args: { domain: string },
  ctx: RegistryCtx = {},
): Promise<RegistryCheck> {
  const retrieved_at = nowIso(ctx);
  const domain = cleanDomain(args.domain);
  const humanUrl = `https://web.archive.org/web/*/${domain}`;

  try {
    const url =
      `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}` +
      `&output=json&fl=timestamp&collapse=timestamp:6`;
    const res = await resolveFetch(ctx)(url, {
      signal: ctx.signal,
      headers: { accept: "application/json" },
    });

    if (!res.ok) {
      return {
        check_id: CHECK_ID,
        source: SOURCE,
        status: "coverage_limited",
        summary: `The Internet Archive was unavailable, so we could not check this site's web history.`,
        evidence_url: humanUrl,
        confidence: null,
        retrieved_at,
        data: { http_status: res.status },
      };
    }

    const text = (await res.text()).trim();
    let rows: string[][] = [];
    if (text.length > 0) {
      const parsed: unknown = JSON.parse(text);
      if (Array.isArray(parsed)) {
        rows = parsed.filter(
          (r): r is string[] => Array.isArray(r) && typeof r[0] === "string",
        );
      }
    }
    /* Drop the header row (["timestamp"]) if present. */
    if (rows.length > 0 && rows[0][0] === "timestamp") rows = rows.slice(1);

    const timestamps = rows
      .map((r) => parseCdxTimestamp(r[0]))
      .filter((t): t is { iso: string; label: string } => t !== null);

    if (timestamps.length === 0) {
      return {
        check_id: CHECK_ID,
        source: SOURCE,
        status: "definitive_miss",
        summary: `The Internet Archive has no captures of this site. Little or no web history is normal for a new company, so this is informational only, not a negative finding.`,
        evidence_url: humanUrl,
        confidence: null,
        retrieved_at,
        data: { first_capture: null, last_capture: null, capture_count_estimate: 0 },
      };
    }

    const first = timestamps[0];
    const last = timestamps[timestamps.length - 1];
    const monthsCaptured = timestamps.length;

    const recency =
      monthsCaptured > 1
        ? ` It has captures from ${monthsCaptured} different months, most recently ${last.label}.`
        : "";

    return {
      check_id: CHECK_ID,
      source: SOURCE,
      status: "hit",
      summary: `The Internet Archive first captured this site in ${first.label}.${recency}`,
      evidence_url: humanUrl,
      confidence: "exact",
      retrieved_at,
      data: {
        first_capture: first.iso,
        last_capture: last.iso,
        capture_count_estimate: monthsCaptured,
        capture_count_basis: "distinct months with at least one capture",
      },
    };
  } catch {
    return {
      check_id: CHECK_ID,
      source: SOURCE,
      status: "error",
      summary: `We could not reach the Internet Archive, so we could not check this site's web history.`,
      evidence_url: humanUrl,
      confidence: null,
      retrieved_at,
      data: null,
    };
  }
}
