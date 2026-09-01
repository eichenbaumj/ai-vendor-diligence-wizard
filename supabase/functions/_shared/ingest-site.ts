/*
  Bounded, SSRF-guarded fetch of a vendor's public website — the evidence
  source most pitches leave implicit and most users never mine.

  Discipline:
  - Everything fetched here is ATTACKER-AUTHORED. The text goes only to
    forensics and the quarantined S1 extractor, like pitch text.
  - Hidden text is stripped BEFORE extraction (stripHiddenHtml) and emits
    no ADV finding here: display:none navigation is near-universal on real
    marketing sites, so the ADV ceiling stays scoped to user-submitted
    artifacts, while hidden payloads still never reach the model.
  - Page picks come from the homepage's own links intersected with a fixed
    high-value path list; up to three canonical paths are probed directly
    only when the homepage exposes fewer than two usable links (JS-only
    navigation). No deep pitched links are ever followed: query strings are
    stripped and the crawl stays on nav-level pages, which keeps
    per-recipient canary tokens out of the fetch log we generate.
  - One aggregate deadline bounds the whole pass; a failing page never
    sinks the others; everything is same-registrable-domain pinned.
*/
import {
  UrlIngestError,
  fetchSubmittedUrl,
  htmlHeadSummary,
  htmlToText,
  normalizeSubmittedUrl,
} from "./ingest-url.ts";
import { stripHiddenHtml } from "./forensics.ts";
import { registrableDomain } from "./domain-inference.ts";

export const SITE_MAX_PAGES = 5;
export const SITE_PAGE_TEXT_CAP = 10_000;
export const SITE_TOTAL_TEXT_CAP = 40_000;
export const SITE_DEADLINE_MS = 22_000;

/* High-value paths, matched against the homepage's own links. */
const CANDIDATE_SEGMENTS = [
  "about",
  "team",
  "company",
  "customers",
  "case-studies",
  "casestudies",
  "partners",
  "security",
  "trust",
  "compliance",
  "pricing",
  "careers",
  "press",
  "news",
  "leadership",
];

/* Probed directly only when the homepage exposes almost no usable links. */
const FALLBACK_PROBE_PATHS = ["/about", "/customers", "/security"];

export interface SitePage {
  url: string;
  final_url: string;
  text: string;
  hidden_spans: number;
}

export interface VendorSite {
  domain: string;
  pages: SitePage[];
  combinedText: string;
  fetched_bytes: number;
  hidden_span_total: number;
}

function firstPathSegment(pathname: string): string {
  return pathname.toLowerCase().split("/").filter(Boolean)[0] ?? "";
}

/* Candidate subpage URLs from the RAW homepage HTML (htmlToText destroys
   anchors): same registrable domain, nav-level, matching a high-value
   segment. Returns normalized URLs, deduped, order = first appearance. */
export function discoverSitePaths(
  homepageHtml: string,
  homepageUrl: string,
  cap = SITE_MAX_PAGES - 1,
): string[] {
  const seedRegistrable = registrableDomain(new URL(homepageUrl).hostname);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of homepageHtml.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)) {
    if (out.length >= cap) break;
    let resolved: string;
    try {
      resolved = normalizeSubmittedUrl(new URL(m[1], homepageUrl).toString());
    } catch {
      continue;
    }
    const u = new URL(resolved);
    if (registrableDomain(u.hostname) !== seedRegistrable) continue;
    const seg = firstPathSegment(u.pathname);
    if (!CANDIDATE_SEGMENTS.includes(seg)) continue;
    /* Nav-level only: at most two path segments deep. */
    if (u.pathname.split("/").filter(Boolean).length > 2) continue;
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    out.push(resolved);
  }
  return out;
}

/* Pause between full passes: a fast total failure is usually the site's
   edge scoring the client (rate or anomaly), and an immediate identical
   retry shares its fate; a short pause gives momentary scoring a chance
   to clear. Bounded by the s1b budget math in s1b-budget.ts. */
export const SITE_RETRY_PAUSE_MS = 3_000;

export async function fetchVendorSite(
  domain: string,
  opts: {
    fetchFn?: typeof fetch;
    deadlineMs?: number;
    attempts?: 1 | 2;
    /* Diagnostic sink: called with a short reason when a pass fails.
       Callers persist these (function console logs are unreachable
       post-hoc). */
    noteFailure?: (msg: string) => void;
    sleepFn?: (ms: number) => Promise<void>;
  } = {},
): Promise<VendorSite | null> {
  /* One full-pass retry (attempts: 2): the observed failure class is a
     transient network fault or a slow seed page eating the shared
     deadline, so the second pass gets a FRESH deadline. Per-page retries
     under one shared deadline would starve each other instead. A pass
     that returned pages never re-runs — partial coverage is a result. */
  const attempts = opts.attempts ?? 1;
  const sleepFn =
    opts.sleepFn ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  for (let attempt = 1; ; attempt++) {
    const site = await fetchVendorSitePass(domain, opts);
    if (site !== null || attempt >= attempts) return site;
    console.log(`site fetch pass ${attempt} empty for ${domain}; retrying once`);
    await sleepFn(SITE_RETRY_PAUSE_MS);
  }
}

async function fetchVendorSitePass(
  domain: string,
  opts: {
    fetchFn?: typeof fetch;
    deadlineMs?: number;
    noteFailure?: (msg: string) => void;
  } = {},
): Promise<VendorSite | null> {
  const fetchFn = opts.fetchFn ?? globalThis.fetch;
  const deadline = AbortSignal.timeout(opts.deadlineMs ?? SITE_DEADLINE_MS);

  /* Seed fetch; try the www variant when the apex itself fails. */
  let seedUrl: string;
  try {
    seedUrl = normalizeSubmittedUrl(`https://${domain}/`);
  } catch {
    return null;
  }
  let seed;
  try {
    seed = await fetchSubmittedUrl(seedUrl, fetchFn, deadline);
  } catch (apexErr) {
    try {
      seedUrl = normalizeSubmittedUrl(`https://www.${domain}/`);
      seed = await fetchSubmittedUrl(seedUrl, fetchFn, deadline);
    } catch (wwwErr) {
      const detail = `apex=${String((apexErr as Error).message)} www=${String((wwwErr as Error).message)}`;
      console.log(`site fetch failed for ${domain}: ${detail}`);
      opts.noteFailure?.(detail.slice(0, 200));
      return null;
    }
  }

  let subUrls = discoverSitePaths(seed.html, seed.final_url);
  if (subUrls.length < 2) {
    const base = new URL(seed.final_url);
    for (const p of FALLBACK_PROBE_PATHS) {
      if (subUrls.length >= SITE_MAX_PAGES - 1) break;
      try {
        const probe = normalizeSubmittedUrl(new URL(p, base).toString());
        if (!subUrls.includes(probe)) subUrls.push(probe);
      } catch {
        /* skip */
      }
    }
  }

  const pages: SitePage[] = [];
  let bytes = seed.fetched_bytes;
  let hiddenTotal = 0;
  const seenFinal = new Set<string>();

  const addPage = (url: string, finalUrl: string, rawHtml: string) => {
    if (seenFinal.has(finalUrl)) return;
    seenFinal.add(finalUrl);
    const stripped = stripHiddenHtml(rawHtml);
    hiddenTotal += stripped.spanCount;
    /* Client-rendered sites ship an empty body but a descriptive head:
       title + meta descriptions join the corpus so a JS shell still tells
       us whose site this is (the live Govra homepage is exactly this). */
    const head = htmlHeadSummary(rawHtml);
    const body = htmlToText(stripped.html, SITE_PAGE_TEXT_CAP);
    const text = [head, body].filter(Boolean).join("\n").slice(0, SITE_PAGE_TEXT_CAP);
    if (text.length < 40) return;
    pages.push({
      url,
      final_url: finalUrl,
      text,
      hidden_spans: stripped.spanCount,
    });
  };

  addPage(seedUrl, seed.final_url, seed.html);

  const results = await Promise.allSettled(
    subUrls.slice(0, SITE_MAX_PAGES - 1).map(async (u) => {
      const page = await fetchSubmittedUrl(u, fetchFn, deadline);
      /* Same-site pinning on the FINAL url too (a subpage may redirect
         off-domain; the redirect hops were host-validated but not pinned). */
      const seedRegistrable = registrableDomain(new URL(seed.final_url).hostname);
      if (registrableDomain(new URL(page.final_url).hostname) !== seedRegistrable) {
        throw new UrlIngestError("that page could not be fetched");
      }
      return { url: u, page };
    }),
  );
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    bytes += r.value.page.fetched_bytes;
    addPage(r.value.url, r.value.page.final_url, r.value.page.html);
  }

  if (pages.length === 0) {
    opts.noteFailure?.("all fetched pages under the 40-char text floor");
    return null;
  }

  const combined = pages
    .map((p) => `=== PAGE: ${p.final_url} ===\n${p.text}`)
    .join("\n\n")
    .slice(0, SITE_TOTAL_TEXT_CAP);

  return {
    domain,
    pages,
    combinedText: combined,
    fetched_bytes: bytes,
    hidden_span_total: hiddenTotal,
  };
}
