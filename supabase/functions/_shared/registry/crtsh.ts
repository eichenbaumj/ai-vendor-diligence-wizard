/*
  D1.6 — Product infrastructure via certificate transparency logs (crt.sh).

  Certificates are issued for real hostnames, so the set of subdomains that
  appear in CT logs is a low-cost view of whether anything exists beyond the
  marketing site (app., api., docs., status., trust.).

  crt.sh is slow and flaky: this check honors ctx.signal and reports
  coverage_limited (never adverse) on timeout, non-200, or unparseable
  output.

  Pure module: no Deno APIs, no module-level state. Never throws.
*/
import type { RegistryCheck } from "../schemas.ts";

export interface RegistryCtx {
  fetchFn?: typeof fetch;
  signal?: AbortSignal;
  apiKeys?: Record<string, string>;
  now?: () => Date;
}

const CHECK_ID = "crtsh_subdomains";
const SOURCE = "Certificate transparency logs (crt.sh)";

/* First labels that indicate product infrastructure beyond the marketing
   site. */
const PRODUCT_LABELS = new Set(["app", "api", "docs", "status", "trust"]);

const MAX_SAMPLE = 20;

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

export async function checkSubdomains(
  args: { domain: string },
  ctx: RegistryCtx = {},
): Promise<RegistryCheck> {
  const retrieved_at = nowIso(ctx);
  const domain = cleanDomain(args.domain);
  const humanUrl = `https://crt.sh/?q=${encodeURIComponent(`%.${domain}`)}`;

  const coverageLimited = (why: string): RegistryCheck => ({
    check_id: CHECK_ID,
    source: SOURCE,
    status: "coverage_limited",
    summary: `The certificate log service (crt.sh) ${why}, so we could not check for product systems this time. This does not count against the vendor.`,
    evidence_url: humanUrl,
    confidence: null,
    retrieved_at,
    data: null,
  });

  try {
    const res = await resolveFetch(ctx)(
      `https://crt.sh/?q=${encodeURIComponent(`%.${domain}`)}&output=json`,
      { signal: ctx.signal, headers: { accept: "application/json" } },
    );

    if (!res.ok) return coverageLimited("was unavailable");

    let entries: Array<Record<string, unknown>>;
    try {
      const parsed: unknown = await res.json();
      if (!Array.isArray(parsed)) return coverageLimited("returned an unexpected response");
      entries = parsed.filter(
        (e): e is Record<string, unknown> => typeof e === "object" && e !== null,
      );
    } catch {
      return coverageLimited("returned an unexpected response");
    }

    /* Collect distinct hostnames under the domain from name_value (may hold
       several newline-separated names) and common_name. */
    const names = new Set<string>();
    for (const entry of entries) {
      const raw: string[] = [];
      if (typeof entry["name_value"] === "string") {
        raw.push(...(entry["name_value"] as string).split("\n"));
      }
      if (typeof entry["common_name"] === "string") {
        raw.push(entry["common_name"] as string);
      }
      for (const candidate of raw) {
        const name = candidate.trim().toLowerCase().replace(/^\*\./, "").replace(/\.$/, "");
        if (!/^[a-z0-9._-]+$/.test(name)) continue;
        if (name === domain || name.endsWith(`.${domain}`)) names.add(name);
      }
    }

    if (names.size === 0) {
      return {
        check_id: CHECK_ID,
        source: SOURCE,
        status: "definitive_miss",
        summary: `We found no certificates for ${domain} in public certificate logs. This is informational only; logs can lag for very new sites.`,
        evidence_url: humanUrl,
        confidence: null,
        retrieved_at,
        data: { distinct_subdomains: 0, product_subdomains: [], sample: [] },
      };
    }

    const subdomains = [...names].filter((n) => n !== domain).sort();
    const productSubdomains = subdomains.filter((n) => {
      const firstLabel = n.split(".")[0];
      return PRODUCT_LABELS.has(firstLabel);
    });

    const data = {
      distinct_subdomains: subdomains.length,
      product_subdomains: productSubdomains,
      sample: subdomains.slice(0, MAX_SAMPLE),
    };

    let summary: string;
    if (productSubdomains.length > 0) {
      const examples = productSubdomains.slice(0, 3).join(", ");
      summary = `Certificate records list ${subdomains.length} subdomain${subdomains.length === 1 ? "" : "s"} for ${domain}, including ${examples}. That suggests the company runs product systems beyond its main website.`;
    } else if (subdomains.length > 0) {
      summary = `Certificate records list ${subdomains.length} subdomain${subdomains.length === 1 ? "" : "s"} for ${domain}, but none of the usual product ones (app, api, docs, status, trust). We could not verify product systems beyond the main website from this source.`;
    } else {
      summary = `Certificate records cover only the main website for ${domain}. We could not verify product systems beyond the main website from this source.`;
    }

    return {
      check_id: CHECK_ID,
      source: SOURCE,
      status: "hit",
      summary,
      evidence_url: humanUrl,
      confidence: "exact",
      retrieved_at,
      data,
    };
  } catch {
    /* crt.sh contract: timeouts and network failures are coverage_limited,
       never adverse. */
    return coverageLimited("timed out or could not be reached");
  }
}
