/*
  D1 identity corroboration via SEC EDGAR.

  Primary lane (checkEdgarFts): EDGAR full-text search, filtered to Form D
  filings. A Form D under the vendor's name is federal corroboration that the
  entity exists (and usually names its state of incorporation). Absence is
  informational: most small companies never file one.

  Fallback lane (checkEdgarCompany): the browse-edgar company database
  (atom output), a plain existence check across all filing types.

  Both lanes REQUIRE a User-Agent from ctx.apiKeys.edgar_user_agent per SEC
  fair-access policy; when it is missing they return coverage_limited.

  Matches are name-normalized (suffixes stripped) and reject
  investment-vehicle names (SERIES/SPV/FUND/HOLDINGS) that the query name
  does not contain.

  Pure module: no Deno APIs, no module-level state. Never throws.
*/
import type { RegistryCheck } from "../schemas.ts";

/* schemas.ts exports MatchConfidence only as a zod const; mirror the type. */
type MatchConfidence = "exact" | "name_similarity";

export interface RegistryCtx {
  fetchFn?: typeof fetch;
  signal?: AbortSignal;
  apiKeys?: Record<string, string>;
  now?: () => Date;
}

const FTS_CHECK_ID = "edgar_fts";
const FTS_SOURCE = "SEC EDGAR full-text search";
const COMPANY_CHECK_ID = "edgar_company";
const COMPANY_SOURCE = "SEC EDGAR company database";

const MAX_NAMES = 3;

const NAME_SUFFIXES = new Set([
  "inc", "incorporated", "llc", "corp", "corporation", "co", "company",
  "ltd", "limited", "pbc",
]);

const VEHICLE_PATTERN = /\b(series|spv|fund|holdings)\b/i;

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas",
  CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware",
  DC: "the District of Columbia", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine",
  MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska",
  NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico",
  NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island",
  SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas",
  UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", PR: "Puerto Rico",
};

function resolveFetch(ctx: RegistryCtx): typeof fetch {
  return ctx.fetchFn ?? ((input, init) => globalThis.fetch(input, init));
}

function nowIso(ctx: RegistryCtx): string {
  return (ctx.now?.() ?? new Date()).toISOString();
}

function normalizeCompanyName(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = cleaned.split(" ").filter((p) => p.length > 0);
  while (parts.length > 1 && NAME_SUFFIXES.has(parts[parts.length - 1])) parts.pop();
  return parts.join(" ");
}

function isVehicleMismatch(candidateName: string, queryName: string): boolean {
  return VEHICLE_PATTERN.test(candidateName) && !VEHICLE_PATTERN.test(queryName);
}

/* Match a record name against a query name; returns confidence or null. */
function matchName(recordName: string, queryName: string): MatchConfidence | null {
  if (isVehicleMismatch(recordName, queryName)) return null;
  const record = normalizeCompanyName(recordName);
  const query = normalizeCompanyName(queryName);
  if (record.length === 0 || query.length === 0) return null;
  if (record === query) return "exact";
  if (record.startsWith(`${query} `) || record.includes(` ${query} `) || record.endsWith(` ${query}`)) {
    return "name_similarity";
  }
  return null;
}

function stateLabel(code: string): string {
  const name = STATE_NAMES[code.trim().toUpperCase()];
  return name ?? code.trim();
}

function usableNames(companyNames: string[]): string[] {
  return companyNames.map((n) => n.trim()).filter((n) => n.length > 0).slice(0, MAX_NAMES);
}

/* ------------------------------------------------------ full-text search */

export async function checkEdgarFts(
  args: { companyNames: string[] },
  ctx: RegistryCtx = {},
): Promise<RegistryCheck> {
  const retrieved_at = nowIso(ctx);
  const names = usableNames(args.companyNames);
  const humanUrl = (name: string) =>
    `https://www.sec.gov/edgar/search/#/q=${encodeURIComponent(`"${name}"`)}&forms=D`;

  if (names.length === 0) {
    return {
      check_id: FTS_CHECK_ID,
      source: FTS_SOURCE,
      status: "not_applicable",
      summary: "No company name was available to search SEC filings.",
      evidence_url: null,
      confidence: null,
      retrieved_at,
      data: null,
    };
  }

  const userAgent = ctx.apiKeys?.edgar_user_agent;
  if (!userAgent) {
    return {
      check_id: FTS_CHECK_ID,
      source: FTS_SOURCE,
      status: "coverage_limited",
      summary: "The SEC filings search is not set up on this server, so this check did not run. This does not count against the vendor.",
      evidence_url: humanUrl(names[0]),
      confidence: null,
      retrieved_at,
      data: null,
    };
  }

  const fetchFn = resolveFetch(ctx);

  try {
    let anySearched = false;

    for (const name of names) {
      const apiUrl =
        `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(`"${name}"`)}&forms=D`;
      const res = await fetchFn(apiUrl, {
        signal: ctx.signal,
        headers: { "user-agent": userAgent, accept: "application/json" },
      });
      if (!res.ok) continue;
      anySearched = true;

      const body = (await res.json()) as Record<string, unknown>;
      const hitsWrap =
        typeof body["hits"] === "object" && body["hits"] !== null
          ? (body["hits"] as Record<string, unknown>)
          : {};
      const totalWrap =
        typeof hitsWrap["total"] === "object" && hitsWrap["total"] !== null
          ? (hitsWrap["total"] as Record<string, unknown>)
          : {};
      const totalHits = typeof totalWrap["value"] === "number" ? (totalWrap["value"] as number) : 0;
      const hits = Array.isArray(hitsWrap["hits"])
        ? (hitsWrap["hits"] as Array<Record<string, unknown>>)
        : [];

      const forms = new Set<string>();
      const incStates = new Set<string>();
      const matchedNames = new Set<string>();
      let bestConfidence: MatchConfidence | null = null;

      for (const hit of hits) {
        const src =
          typeof hit["_source"] === "object" && hit["_source"] !== null
            ? (hit["_source"] as Record<string, unknown>)
            : {};
        const displayNames = Array.isArray(src["display_names"])
          ? (src["display_names"] as unknown[]).filter((d): d is string => typeof d === "string")
          : [];
        const matched = displayNames
          .map((d) => ({ display: d, confidence: matchName(d, name) }))
          .filter((m): m is { display: string; confidence: MatchConfidence } => m.confidence !== null);
        if (matched.length === 0) continue;

        for (const m of matched) {
          matchedNames.add(m.display);
          if (m.confidence === "exact") bestConfidence = "exact";
          else if (bestConfidence === null) bestConfidence = "name_similarity";
        }
        for (const key of ["file_type", "root_forms", "forms"]) {
          const value = src[key];
          if (typeof value === "string") forms.add(value);
          else if (Array.isArray(value)) {
            for (const v of value) if (typeof v === "string") forms.add(v);
          }
        }
        const incRaw = src["inc_states"];
        if (Array.isArray(incRaw)) {
          for (const s of incRaw) if (typeof s === "string" && s.trim()) incStates.add(s.trim());
        } else if (typeof incRaw === "string" && incRaw.trim()) {
          incStates.add(incRaw.trim());
        }
      }

      if (matchedNames.size > 0) {
        const incState = [...incStates][0];
        const incPhrase = incState ? `, incorporated in ${stateLabel(incState)}` : "";
        return {
          check_id: FTS_CHECK_ID,
          source: FTS_SOURCE,
          status: "hit",
          summary: `SEC filings include a Form D under a matching company name${incPhrase}. A Form D is a federal filing that shows a company exists and has raised investment money; the identity check weighs whether it is this vendor.`,
          evidence_url: humanUrl(name),
          confidence: bestConfidence,
          retrieved_at,
          data: {
            query: name,
            total_hits: totalHits,
            forms: [...forms],
            inc_states: [...incStates],
            matched_names: [...matchedNames],
          },
        };
      }
    }

    if (!anySearched) {
      return {
        check_id: FTS_CHECK_ID,
        source: FTS_SOURCE,
        status: "coverage_limited",
        summary: "The SEC filings search could not be reached, so this check did not run. This does not count against the vendor.",
        evidence_url: humanUrl(names[0]),
        confidence: null,
        retrieved_at,
        data: null,
      };
    }

    return {
      check_id: FTS_CHECK_ID,
      source: FTS_SOURCE,
      status: "definitive_miss",
      summary: "We searched SEC filings nationwide and found no Form D under this company's name. This search covers venture-funded companies in every state, but many small companies never file one, so this is informational only.",
      evidence_url: humanUrl(names[0]),
      confidence: null,
      retrieved_at,
      data: { queries: names },
    };
  } catch {
    return {
      check_id: FTS_CHECK_ID,
      source: FTS_SOURCE,
      status: "error",
      summary: "We could not reach the SEC filings search, so this check did not run.",
      evidence_url: humanUrl(names[0]),
      confidence: null,
      retrieved_at,
      data: null,
    };
  }
}

/* ------------------------------------------------- company-database lane */

export async function checkEdgarCompany(
  args: { companyNames: string[] },
  ctx: RegistryCtx = {},
): Promise<RegistryCheck> {
  const retrieved_at = nowIso(ctx);
  const names = usableNames(args.companyNames);
  const humanUrl = (name: string) =>
    `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(name)}&type=&dateb=&owner=include&count=40`;

  if (names.length === 0) {
    return {
      check_id: COMPANY_CHECK_ID,
      source: COMPANY_SOURCE,
      status: "not_applicable",
      summary: "No company name was available to search SEC company records.",
      evidence_url: null,
      confidence: null,
      retrieved_at,
      data: null,
    };
  }

  const userAgent = ctx.apiKeys?.edgar_user_agent;
  if (!userAgent) {
    return {
      check_id: COMPANY_CHECK_ID,
      source: COMPANY_SOURCE,
      status: "coverage_limited",
      summary: "The SEC company records search is not set up on this server, so this check did not run. This does not count against the vendor.",
      evidence_url: humanUrl(names[0]),
      confidence: null,
      retrieved_at,
      data: null,
    };
  }

  const fetchFn = resolveFetch(ctx);

  try {
    let anySearched = false;

    for (const name of names) {
      const apiUrl =
        `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(name)}&type=&dateb=&owner=include&count=10&output=atom`;
      const res = await fetchFn(apiUrl, {
        signal: ctx.signal,
        headers: { "user-agent": userAgent, accept: "application/atom+xml, application/xml, text/xml" },
      });
      if (!res.ok) continue;
      anySearched = true;

      const xml = await res.text();

      /* Defensive tag scraping: a single match returns one <company-info>
         block; multiple matches return <entry> elements whose titles carry
         the company names. No XML parser needed for these two shapes. */
      const foundNames: string[] = [];
      for (const m of xml.matchAll(/<conformed-name>([^<]*)<\/conformed-name>/gi)) {
        foundNames.push(decodeEntities(m[1].trim()));
      }
      if (foundNames.length === 0) {
        for (const m of xml.matchAll(/<title>([^<]*)<\/title>/gi)) {
          const title = decodeEntities(m[1].trim());
          /* Skip the feed's own title line. */
          if (/\bmatching\b|\bEDGAR\b/i.test(title) && !/\(\d{7,10}\)/.test(title)) continue;
          if (title.length > 0) foundNames.push(title.replace(/\s*\(\d{7,10}\)\s*$/, ""));
        }
      }

      const stateMatch = xml.match(/<state-of-incorporation>([^<]*)<\/state-of-incorporation>/i);
      const cikMatch = xml.match(/<cik>0*(\d+)<\/cik>/i) ?? xml.match(/CIK=0*(\d+)/i);

      let bestConfidence: MatchConfidence | null = null;
      const matchedNames: string[] = [];
      for (const found of foundNames) {
        const confidence = matchName(found, name);
        if (confidence === null) continue;
        matchedNames.push(found);
        if (confidence === "exact") bestConfidence = "exact";
        else if (bestConfidence === null) bestConfidence = "name_similarity";
      }

      if (matchedNames.length > 0) {
        const statePhrase =
          stateMatch && stateMatch[1].trim()
            ? `, registered in ${stateLabel(stateMatch[1])}`
            : "";
        return {
          check_id: COMPANY_CHECK_ID,
          source: COMPANY_SOURCE,
          status: "hit",
          summary: `SEC company records list "${matchedNames[0]}"${statePhrase}. That is a federal record showing a company by this name exists.`,
          evidence_url: humanUrl(name),
          confidence: bestConfidence,
          retrieved_at,
          data: {
            query: name,
            matched_names: matchedNames,
            all_names_returned: foundNames,
            cik: cikMatch ? cikMatch[1] : null,
            state_of_incorporation: stateMatch ? stateMatch[1].trim() : null,
          },
        };
      }
    }

    if (!anySearched) {
      return {
        check_id: COMPANY_CHECK_ID,
        source: COMPANY_SOURCE,
        status: "coverage_limited",
        summary: "The SEC company records search could not be reached, so this check did not run. This does not count against the vendor.",
        evidence_url: humanUrl(names[0]),
        confidence: null,
        retrieved_at,
        data: null,
      };
    }

    return {
      check_id: COMPANY_CHECK_ID,
      source: COMPANY_SOURCE,
      status: "definitive_miss",
      summary: "We searched SEC company records and found no company under this name. Most small companies never appear in SEC records, so this is informational only.",
      evidence_url: humanUrl(names[0]),
      confidence: null,
      retrieved_at,
      data: { queries: names },
    };
  } catch (err) {
    /* Diagnostic breadcrumb: distinguishes an 8s timeout from SEC blocking
       datacenter egress IPs (both real possibilities on this host). */
    console.warn(
      `edgar_company failed: ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`,
    );
    return {
      check_id: COMPANY_CHECK_ID,
      source: COMPANY_SOURCE,
      status: "error",
      summary: "We could not reach the SEC company records search, so this check did not run.",
      evidence_url: humanUrl(names[0]),
      confidence: null,
      retrieved_at,
      data: null,
    };
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}
