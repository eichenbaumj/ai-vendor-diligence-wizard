/*
  URL ingestion for url-submitted pitches. Pure web APIs only (URL, fetch,
  AbortSignal) so the module runs identically under Deno and vitest with an
  injectable fetch.

  Safety posture:
  - https only; every IP-literal host is rejected (a legitimate vendor page
    has a hostname, and refusing all literals removes the private-range,
    link-local, and metadata-address taxonomy in one rule); localhost,
    single-label names, .local/.internal/.localhost, and explicit ports are
    rejected too.
  - Redirects are followed manually, at most 3 hops, and EVERY hop is
    re-validated against the same rules ("follow" mode would let a public
    URL bounce through a private host invisibly).
  - The query string and fragment are stripped before fetching: tracking
    parameters and any per-recipient canary token in a pitched link must not
    confirm to the vendor that an automated evaluation ran.
  - text/html only, 2 MB cap (streamed with an abort), 8s budget.
  - DNS rebinding is out of scope for this version: we validate the
    hostname, not the resolved socket. Acceptable because the fetched text
    is quarantined as attacker-authored pitch content, no credentials ride
    the request, and no internal service of ours is reachable by hostname.
*/

export const URL_MAX_CHARS = 2048;
const MAX_REDIRECT_HOPS = 3;
const MAX_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8_000;

export class UrlIngestError extends Error {
  constructor(
    /* Sentence-shaped, user-facing via the api-errors passthrough. */
    message: string,
  ) {
    super(message);
    this.name = "UrlIngestError";
  }
}

const BLOCKED_HOST_SUFFIXES = [".local", ".internal", ".localhost"];

function isIpLiteral(host: string): boolean {
  if (/^\[.*\]$/.test(host)) return true; // bracketed IPv6
  if (/^[0-9a-f:]+$/i.test(host) && host.includes(":")) return true; // bare IPv6
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true; // dotted IPv4
  if (/^0x[0-9a-f]+$/i.test(host) || /^\d+$/.test(host)) return true; // exotic numerics
  return false;
}

export function hostBlocked(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (!host) return true;
  if (host === "localhost") return true;
  if (isIpLiteral(host)) return true;
  if (!host.includes(".")) return true; // single-label (intranet) names
  if (BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s))) return true;
  return false;
}

/* Normalize a user-submitted URL: https only, strip query + fragment,
   lowercase host, reject blocked hosts and explicit ports. Throws
   UrlIngestError with user-facing copy. */
export function normalizeSubmittedUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > URL_MAX_CHARS) {
    throw new UrlIngestError("submit a full https web address");
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new UrlIngestError("submit a full https web address");
  }
  if (url.protocol !== "https:") {
    throw new UrlIngestError("submit a full https web address");
  }
  if (url.port !== "") {
    throw new UrlIngestError("that address is not one we can fetch");
  }
  if (hostBlocked(url.hostname)) {
    throw new UrlIngestError("that address is not one we can fetch");
  }
  url.search = "";
  url.hash = "";
  return url.toString();
}

export interface FetchedPage {
  html: string;
  final_url: string;
  fetched_bytes: number;
}

export async function fetchSubmittedUrl(
  normalizedUrl: string,
  fetchFn: typeof fetch = globalThis.fetch,
  /* Optional shared deadline (multi-page site fetches): aborting it aborts
     this call too, on top of the per-call 8s timer. */
  externalSignal?: AbortSignal,
): Promise<FetchedPage> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", onExternalAbort, { once: true });
  }
  try {
    let current = normalizedUrl;
    for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
      const res = await fetchFn(current, {
        redirect: "manual",
        signal: controller.signal,
        /* Browser-shaped headers: several CDN bot filters return an instant
           403 to a UA-less datacenter fetch (the TX-RAMP feed taught this
           lesson first, and the first live Govra site fetch repeated it). */
        headers: {
          accept: "text/html,application/xhtml+xml",
          "accept-language": "en-US,en;q=0.9",
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        },
      });
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location || hop === MAX_REDIRECT_HOPS) {
          throw new UrlIngestError("that page could not be fetched");
        }
        /* Re-validate every hop with the same rules as the submitted URL. */
        current = normalizeSubmittedUrl(new URL(location, current).toString());
        continue;
      }
      if (!res.ok) {
        throw new UrlIngestError("that page could not be fetched");
      }
      const type = (res.headers.get("content-type") ?? "").toLowerCase();
      if (!type.includes("text/html") && !type.includes("application/xhtml+xml")) {
        throw new UrlIngestError("that address did not return a readable web page");
      }
      if (!res.body) {
        throw new UrlIngestError("that page could not be fetched");
      }
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_BYTES) {
          controller.abort();
          throw new UrlIngestError("that page could not be fetched");
        }
        chunks.push(value);
      }
      const merged = new Uint8Array(total);
      let at = 0;
      for (const c of chunks) {
        merged.set(c, at);
        at += c.byteLength;
      }
      return {
        html: new TextDecoder("utf-8", { fatal: false }).decode(merged),
        final_url: current,
        fetched_bytes: total,
      };
    }
    throw new UrlIngestError("that page could not be fetched");
  } catch (err) {
    if (err instanceof UrlIngestError) throw err;
    throw new UrlIngestError("that page could not be fetched");
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", onExternalAbort);
  }
}

/* ------------------------------------------------------------ html -> text */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "-",
  mdash: "-",
  rsquo: "'",
  lsquo: "'",
  ldquo: '"',
  rdquo: '"',
};

const BLOCK_TAGS =
  /<\/?(?:p|div|section|article|header|footer|main|aside|nav|h[1-6]|li|ul|ol|table|tr|td|th|blockquote|br|hr|figure|figcaption)\b[^>]*>/gi;

/* Plain-text extraction adequate for pitch analysis. Fidelity of the strip
   does not affect hidden-text detection: detectHiddenHtml runs on the RAW
   html before this. */
export function htmlToText(html: string, maxChars = 40_000): string {
  let s = html;
  s = s.replace(/<!--[\s\S]*?-->/g, " ");
  s = s.replace(/<(script|style|noscript|template|head|svg)\b[\s\S]*?<\/\1>/gi, " ");
  s = s.replace(BLOCK_TAGS, "\n");
  s = s.replace(/<[^>]+>/g, " ");
  s = s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
  s = s
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return s.slice(0, maxChars);
}
