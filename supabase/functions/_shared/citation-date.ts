/*
  Publication dates for citations (methodology 1.8).

  A citation carried only the date the tool retrieved it, so a report could
  not tell a 2019 story from last week's (gauntlet R2-F57). Two best-effort
  sources, both parsed by code:
  1. The page address, when it carries a date path ("/2024/03/15/",
     "/2024/03/", "/2024-03-15"). Primary, because a reader can see it in
     the link.
  2. The search tool's page age for the result, when the API returns one:
     an absolute date ("April 30, 2025", "2025-04-30") or a relative phrase
     ("3 days ago", "2 weeks ago", "1 month ago") resolved against the
     retrieval time. I am uncertain how often the API sends it, so it is a
     fallback and never required.
  Nothing else: no page fetch, no model. When neither yields a date the
  report shows the retrieval date, as before. Values are "YYYY-MM-DD" or
  "YYYY-MM"; the frontend formats them. Pure TS, no I/O.
*/

const EARLIEST_YEAR = 1995;

function validDate(y: number, m: number, d: number | null, now: Date): boolean {
  if (y < EARLIEST_YEAR || y > now.getUTCFullYear() + 1) return false;
  if (m < 1 || m > 12) return false;
  if (d !== null) {
    if (d < 1 || d > 31) return false;
    const probe = new Date(Date.UTC(y, m - 1, d));
    if (probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return false;
    if (probe.getTime() > now.getTime() + 2 * 86_400_000) return false;
  }
  return true;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** A date the page address carries in its path. Query strings never count. */
export function publishedDateFromUrl(url: string, now: Date = new Date()): string | null {
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return null;
  }
  /* /YYYY/MM/DD/ or /YYYY/MM/ (day optional), segment-bounded. */
  const slash = path.match(/\/((?:19|20)\d{2})\/(\d{1,2})(?:\/(\d{1,2}))?(?=\/|$)/);
  if (slash) {
    const y = Number(slash[1]);
    const m = Number(slash[2]);
    const d = slash[3] !== undefined ? Number(slash[3]) : null;
    if (validDate(y, m, d, now)) return d === null ? `${y}-${pad(m)}` : `${y}-${pad(m)}-${pad(d)}`;
  }
  /* /YYYY-MM-DD inside a segment, e.g. /news/2024-03-15-title. */
  const dashed = path.match(/(?:^|[\/_-])((?:19|20)\d{2})-(\d{2})-(\d{2})(?=$|[\/_.-])/);
  if (dashed) {
    const y = Number(dashed[1]);
    const m = Number(dashed[2]);
    const d = Number(dashed[3]);
    if (validDate(y, m, d, now)) return `${y}-${pad(m)}-${pad(d)}`;
  }
  return null;
}

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7,
  august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9,
  oct: 10, nov: 11, dec: 12,
};

const RELATIVE_UNIT_MS: Record<string, number> = {
  second: 1_000,
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 7 * 86_400_000,
};

function isoDay(t: number): string {
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** A date from the search tool's page age, resolved against retrieval time. */
export function publishedDateFromPageAge(
  pageAge: string | null | undefined,
  retrievedAt: string,
): string | null {
  if (!pageAge) return null;
  const raw = pageAge.trim();
  if (!raw) return null;
  const retrieved = new Date(retrievedAt);
  if (Number.isNaN(retrieved.getTime())) return null;
  const now = retrieved;
  /* ISO-like: 2025-04-30 or 2025-04-30T... */
  const iso = raw.match(/^((?:19|20)\d{2})-(\d{2})-(\d{2})/);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    return validDate(y, m, d, now) ? `${y}-${pad(m)}-${pad(d)}` : null;
  }
  /* "April 30, 2025" or "30 April 2025". */
  const mdy = raw.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+((?:19|20)\d{2})$/);
  const dmy = raw.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+((?:19|20)\d{2})$/);
  const named = mdy ? { mon: mdy[1], d: mdy[2], y: mdy[3] } : dmy ? { mon: dmy[2], d: dmy[1], y: dmy[3] } : null;
  if (named) {
    const m = MONTHS[named.mon.toLowerCase()];
    if (!m) return null;
    const y = Number(named.y);
    const d = Number(named.d);
    return validDate(y, m, d, now) ? `${y}-${pad(m)}-${pad(d)}` : null;
  }
  /* "3 days ago", "2 weeks ago", "1 month ago", "a year ago". */
  const rel = raw.match(/^(\d+|an?)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/i);
  if (rel) {
    const n = /^an?$/i.test(rel[1]) ? 1 : Number(rel[1]);
    const unit = rel[2].toLowerCase();
    if (!Number.isFinite(n) || n < 0 || n > 1000) return null;
    if (unit === "month" || unit === "year") {
      const d = new Date(retrieved.getTime());
      if (unit === "month") d.setUTCMonth(d.getUTCMonth() - n);
      else d.setUTCFullYear(d.getUTCFullYear() - n);
      /* Month and year phrases are coarse: report the month only. */
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
    }
    return isoDay(retrieved.getTime() - n * RELATIVE_UNIT_MS[unit]);
  }
  return null;
}

/** The citation's publication date: the address first, then the page age. */
export function publishedDateFor(
  url: string,
  pageAge: string | null | undefined,
  retrievedAt: string,
): string | null {
  const now = new Date(retrievedAt);
  const fromUrl = publishedDateFromUrl(url, Number.isNaN(now.getTime()) ? new Date() : now);
  return fromUrl ?? publishedDateFromPageAge(pageAge, retrievedAt);
}
