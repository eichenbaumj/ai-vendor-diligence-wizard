/*
  SAM.gov registry checks (methodology.md checks 1.2 and 1.3).

  - checkSamEntity: federal contractor registration (Entity Management API).
    Absence is NORMAL for state/local-only vendors and is never adverse.
  - checkSamExclusions: debarment/exclusion list. Legal rule: only exact
    normalized-name matches count. Name-similarity matches are SUPPRESSED
    (nothing shown in prose) because a fuzzy debarment hint about the wrong
    company is worse than no output at all.

  This module also hosts the shared name-matching helpers used by the other
  registry modules in this directory (kept here, not in a new util file, to
  respect the build plan's file-ownership boundaries).

  Pure module: no Deno APIs, no module state. Works in Deno, Node, and edge.
*/
import type { RegistryCheck } from "../schemas.ts";

/* ------------------------------------------------------------ shared types */

export interface RegistryCtx {
  fetchFn?: typeof fetch; // injectable for tests; default globalThis.fetch
  signal?: AbortSignal; // orchestrator enforces the per-endpoint timeout
  apiKeys?: Record<string, string>;
  now?: () => Date; // injectable clock for tests
}

export type Confidence = RegistryCheck["confidence"];

/* --------------------------------------------- shared name-match helpers */

const CORPORATE_SUFFIXES = new Set([
  "INC",
  "INCORPORATED",
  "LLC",
  "LC",
  "LLP",
  "LP",
  "CORP",
  "CORPORATION",
  "CO",
  "COMPANY",
  "LTD",
  "LIMITED",
  "PBC",
  "PC",
  "PLLC",
]);

/* Words that mark investment vehicles, not operating companies. A candidate
   containing one of these when the query does not is a false positive (the
   Texas Comptroller file lists Anthropic investment SPVs named
   "... SERIES ANTHROPIC PBC ..." alongside the real ANTHROPIC, PBC). */
const VEHICLE_TOKENS = new Set(["SERIES", "SPV", "FUND", "HOLDINGS"]);

function tokensOf(raw: string): string[] {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/* Case-fold, strip punctuation, drop trailing corporate suffixes. */
export function normalizeCompanyName(raw: string): string {
  const tokens = tokensOf(raw);
  while (
    tokens.length > 1 &&
    CORPORATE_SUFFIXES.has(tokens[tokens.length - 1])
  ) {
    tokens.pop();
  }
  return tokens.join(" ");
}

/* True when the name ends in a corporate suffix (INC, LLC, ...). The
   full-legal-name tying signal requires the record's suffix to be part of
   what the buyer typed, so a bare brand can never earn it. */
export function hasCorporateSuffix(raw: string): boolean {
  const tokens = tokensOf(raw);
  return tokens.length >= 2 && CORPORATE_SUFFIXES.has(tokens[tokens.length - 1]);
}

/* Spellings of one corporate suffix, folded to one token so that a lane's
   "CONDUCTORAI CORPORATION" and SEC's "ConductorAI Corp" are one name in
   the live exact-name census, not two competitors (methodology 1.8; the
   conductorai URL probe of 2026-09-02 landed at tier 0 on exactly that
   split). Only spelling variants of the SAME suffix fold: INC and LLC stay
   different companies. */
const SUFFIX_ALIASES: Record<string, string> = {
  INCORPORATED: "INC",
  CORPORATION: "CORP",
  COMPANY: "CO",
  LIMITED: "LTD",
};

/* Unstripped normalized form: case-fold and strip punctuation but KEEP
   corporate suffixes, so "Citymart US Inc." equals "CITYMART US INC."
   while brand-only "Citymart" does not. Suffix spellings fold to one
   token (SUFFIX_ALIASES), so "ACME CORPORATION" equals "Acme Corp." */
export function normalizeUnstripped(raw: string): string {
  return tokensOf(raw)
    .map((t) => SUFFIX_ALIASES[t] ?? t)
    .join(" ");
}

/* People: punctuation-stripped, case-folded, whitespace-collapsed. */
export function normalizePersonName(raw: string): string {
  return tokensOf(raw).join(" ");
}

/* True when the candidate carries an investment-vehicle marker the query
   does not (SERIES / SPV / FUND / HOLDINGS). */
export function isInvestmentVehicleMismatch(
  candidate: string,
  query: string,
): boolean {
  const cand = new Set(tokensOf(candidate));
  const q = new Set(tokensOf(query));
  for (const t of VEHICLE_TOKENS) {
    if (cand.has(t) && !q.has(t)) return true;
  }
  return false;
}

export type CompanyMatch =
  | {
      kind: "match";
      confidence: "exact" | "name_similarity";
      query: string;
      /* Which side contained the other on a name_similarity match.
         "query_in_record" = the record name carries the query plus more
         ("ZENCITY TECHNOLOGIES US, INC." for query "Zencity") — the
         direction attribution may promote with a tying signal.
         "record_in_query" = the record name sits inside the query — the
         namesake direction, never promoted. Absent on exact matches. */
      containment?: "query_in_record" | "record_in_query";
    }
  | { kind: "vehicle_rejected"; query: string }
  | { kind: "none" };

/* Match one candidate record name against the pitch's disclosed names.
   exact = identical after normalization; name_similarity = one normalized
   token set contains the other. Investment-vehicle mismatches are rejected
   outright, before any confidence is assigned.

   Ultra-short names are exact-only: a containment match is only as strong
   as the shared tokens, and a name like "17A" is contained in unrelated
   records everywhere ("17A WASHINGTON STREET, LLC" earned Joe's own firm
   someone else's federal awards on 2026-08-29). The contained side must
   have at least two tokens or a single token of four or more characters
   to count as name_similarity. */
function containedSideStrongEnough(contained: string): boolean {
  const tokens = contained.split(" ").filter(Boolean);
  if (tokens.length >= 2) return true;
  return (tokens[0]?.length ?? 0) >= 4;
}

export function matchCompanyName(
  candidate: string,
  queries: string[],
): CompanyMatch {
  let similarity: CompanyMatch | null = null;
  let rejected: CompanyMatch | null = null;
  for (const query of queries) {
    const qNorm = normalizeCompanyName(query);
    const cNorm = normalizeCompanyName(candidate);
    if (!qNorm || !cNorm) continue;
    if (isInvestmentVehicleMismatch(candidate, query)) {
      rejected = { kind: "vehicle_rejected", query };
      continue;
    }
    if (qNorm === cNorm) {
      return { kind: "match", confidence: "exact", query };
    }
    const qTokens = qNorm.split(" ");
    const cTokens = new Set(cNorm.split(" "));
    const qSet = new Set(qTokens);
    const cList = cNorm.split(" ");
    const qContainsC = cList.every((t) => qSet.has(t));
    const cContainsQ = qTokens.every((t) => cTokens.has(t));
    const contained = qContainsC ? cNorm : cContainsQ ? qNorm : null;
    if (contained !== null && containedSideStrongEnough(contained) && !similarity) {
      similarity = {
        kind: "match",
        confidence: "name_similarity",
        query,
        containment: cContainsQ ? "query_in_record" : "record_in_query",
      };
    }
  }
  return similarity ?? rejected ?? { kind: "none" };
}

/* ---------------------------------------------- product-only match guard */

/* Split-derived product names ("TrueTax" from "TrueTax by Govra") widen the
   records a query surfaces, but a record whose entire name lives inside the
   product tokens is a different company that happens to share the product's
   brand ("TRUETAX INC", an unrelated tax-prep firm). Such records must never
   be accepted — acceptance has to anchor on at least one company token.
   productOnlyTokens = tokens of the product names that appear in NO anchor
   (company) name. */
export function productOnlyTokens(
  productNames: string[],
  anchorNames: string[],
): string[] {
  const anchor = new Set(anchorNames.flatMap((n) => tokensOf(n)));
  const out = new Set<string>();
  for (const p of productNames) {
    for (const t of tokensOf(p)) {
      if (t && !anchor.has(t)) out.add(t);
    }
  }
  return [...out];
}

export function isProductOnlyName(
  rowName: string,
  productTokens: string[] | undefined,
): boolean {
  if (!productTokens || productTokens.length === 0) return false;
  const set = new Set(productTokens);
  const toks = normalizeCompanyName(rowName).split(" ").filter(Boolean);
  return toks.length > 0 && toks.every((t) => set.has(t));
}

/* Unique normalized query names, preserving the first raw spelling. */
export function dedupeNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    const key = normalizeCompanyName(n);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out;
}

/* ----------------------------------------------------- shared I/O helpers */

export function nowIso(ctx: RegistryCtx): string {
  return (ctx.now?.() ?? new Date()).toISOString();
}

export async function getJson(
  url: string,
  ctx: RegistryCtx,
  init?: RequestInit,
): Promise<unknown> {
  const fetchFn = ctx.fetchFn ?? globalThis.fetch;
  const res = await fetchFn(url, { ...init, signal: ctx.signal });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return await res.json();
}

/* Standard "the source could not be reached" result. Downstream treats
   status "error" as coverage_limited; it is never adverse. */
export function errorCheck(
  check_id: string,
  source: string,
  evidence_url: string | null,
  ctx: RegistryCtx,
): RegistryCheck {
  return {
    check_id,
    source,
    status: "error",
    summary: `We could not reach ${source}, so this check did not run. That is a connection problem on our side, not information about the vendor.`,
    evidence_url,
    confidence: null,
    retrieved_at: nowIso(ctx),
    data: null,
  };
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function firstString(
  row: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/* ------------------------------------------------------- SAM entity check */

/* GSA docs write the version as "v[1-4]" shorthand; the literal segment is a
   real version number. v3 is the widely documented stable version. */
const SAM_ENTITY_URL = "https://api.sam.gov/entity-information/v3/entities";
const SAM_EXCLUSIONS_URL = "https://api.sam.gov/entity-information/v4/exclusions";
const SAM_SEARCH_HUMAN = "https://sam.gov/search/";
const SAM_EXCLUSIONS_HUMAN = "https://sam.gov/search/?index=ex";

interface SamEntityHit {
  legalBusinessName: string;
  uei: string | null;
  cageCode: string | null;
  registrationStatus: string | null;
  confidence: "exact" | "name_similarity";
  /* Physical address from coreData — tying-signal facts (identity-ties.ts).
     Capture-only: never rendered, never adverse. */
  street: string | null;
  city: string | null;
  state: string | null;
}

export async function checkSamEntity(
  { companyNames, productTokens }: { companyNames: string[]; productTokens?: string[] },
  ctx: RegistryCtx,
): Promise<RegistryCheck> {
  const check_id = "sam_entity";
  const source = "SAM.gov Entity Management";
  const key = ctx.apiKeys?.sam;
  if (!key) {
    return {
      check_id,
      source,
      status: "coverage_limited",
      summary:
        "SAM.gov key not configured, so we could not check the federal contractor registration database automatically. You can search SAM.gov yourself at the link.",
      evidence_url: SAM_SEARCH_HUMAN,
      confidence: null,
      retrieved_at: nowIso(ctx),
      data: { reason: "no_api_key" },
    };
  }
  try {
    const names = dedupeNames(companyNames);
    if (names.length === 0) {
      return {
        check_id,
        source,
        status: "not_applicable",
        summary: "No company name was available to search in SAM.gov.",
        evidence_url: SAM_SEARCH_HUMAN,
        confidence: null,
        retrieved_at: nowIso(ctx),
        data: null,
      };
    }
    let best: SamEntityHit | null = null;
    const rejectedVehicles: string[] = [];
    const rawPages: unknown[] = [];
    for (const name of names) {
      const url = `${SAM_ENTITY_URL}?legalBusinessName=${encodeURIComponent(name)}&api_key=${encodeURIComponent(key)}`;
      const payload = await getJson(url, ctx);
      rawPages.push(payload);
      const root = asRecord(payload) ?? {};
      for (const entry of asArray(root["entityData"])) {
        const rec = asRecord(entry) ?? {};
        const reg = asRecord(rec["entityRegistration"]) ?? rec;
        const legal = firstString(reg, ["legalBusinessName", "name"]);
        if (!legal) continue;
        if (isProductOnlyName(legal, productTokens)) continue;
        const match = matchCompanyName(legal, names);
        if (match.kind === "vehicle_rejected") {
          rejectedVehicles.push(legal);
          continue;
        }
        if (match.kind !== "match") continue;
        const physical =
          asRecord(asRecord(rec["coreData"])?.["physicalAddress"]) ?? {};
        const hit: SamEntityHit = {
          legalBusinessName: legal,
          uei: firstString(reg, ["ueiSAM", "uei"]),
          cageCode: firstString(reg, ["cageCode"]),
          registrationStatus: firstString(reg, ["registrationStatus", "status"]),
          confidence: match.confidence,
          street: firstString(physical, ["addressLine1"]),
          city: firstString(physical, ["city"]),
          state: firstString(physical, ["stateOrProvinceCode"]),
        };
        if (!best || (best.confidence !== "exact" && match.confidence === "exact")) {
          best = hit;
        }
      }
      if (best?.confidence === "exact") break;
    }
    if (best) {
      const statusPart = best.registrationStatus
        ? `, registration status ${best.registrationStatus}`
        : "";
      const ueiPart = best.uei ? ` (UEI ${best.uei})` : "";
      return {
        check_id,
        source,
        status: "hit",
        summary: `SAM.gov shows a federal contractor registration for ${best.legalBusinessName}${ueiPart}${statusPart}. That is a positive sign of an established, verified legal entity.`,
        evidence_url: best.uei
          ? `https://sam.gov/entity/${best.uei}`
          : SAM_SEARCH_HUMAN,
        confidence: best.confidence,
        retrieved_at: nowIso(ctx),
        data: {
          uei: best.uei,
          cage_code: best.cageCode,
          registration_status: best.registrationStatus,
          legal_business_name: best.legalBusinessName,
          physical_address: {
            street: best.street,
            city: best.city,
            state: best.state,
          },
          rejected_investment_vehicles: rejectedVehicles,
        },
      };
    }
    return {
      check_id,
      source,
      status: "definitive_miss",
      summary:
        "We did not find a federal contractor registration in SAM.gov under the names in the pitch. Vendors that sell only to state and local governments often have no SAM.gov record, so this is common and not a red flag.",
      evidence_url: SAM_SEARCH_HUMAN,
      confidence: null,
      retrieved_at: nowIso(ctx),
      data: { rejected_investment_vehicles: rejectedVehicles },
    };
  } catch {
    return errorCheck(check_id, source, SAM_SEARCH_HUMAN, ctx);
  }
}

/* --------------------------------------------------- SAM exclusions check */

function exclusionRecordName(rec: Record<string, unknown>): string | null {
  const direct = firstString(rec, ["exclusionName", "name", "legalBusinessName"]);
  if (direct) return direct;
  const ident = asRecord(rec["exclusionIdentification"]) ?? rec;
  const identDirect = firstString(ident, ["exclusionName", "name"]);
  if (identDirect) return identDirect;
  const parts = [
    firstString(rec, ["firstName"]) ?? firstString(ident, ["firstName"]),
    firstString(rec, ["middleName"]) ?? firstString(ident, ["middleName"]),
    firstString(rec, ["lastName"]) ?? firstString(ident, ["lastName"]),
  ].filter((p): p is string => Boolean(p));
  return parts.length > 0 ? parts.join(" ") : null;
}

/* Exact match only: identical after normalization, or identical token sets
   (covers "SMITH, JOHN" vs "John Smith"). Anything looser is suppressed. */
function isExactExclusionMatch(candidate: string, query: string): boolean {
  const c = normalizeCompanyName(candidate);
  const q = normalizeCompanyName(query);
  if (!c || !q) return false;
  if (c === q) return true;
  const cSorted = c.split(" ").sort().join(" ");
  const qSorted = q.split(" ").sort().join(" ");
  return cSorted === qSorted;
}

export async function checkSamExclusions(
  {
    companyNames,
    people,
  }: { companyNames: string[]; people: { name: string }[] },
  ctx: RegistryCtx,
): Promise<RegistryCheck> {
  const check_id = "sam_exclusions";
  const source = "SAM.gov Exclusions";
  const key = ctx.apiKeys?.sam;
  if (!key) {
    return {
      check_id,
      source,
      status: "coverage_limited",
      summary:
        "SAM.gov key not configured, so we could not check the federal exclusions and debarment list automatically. You can search it yourself at the link.",
      evidence_url: SAM_EXCLUSIONS_HUMAN,
      confidence: null,
      retrieved_at: nowIso(ctx),
      data: { reason: "no_api_key" },
    };
  }
  try {
    const queries = [
      ...dedupeNames(companyNames),
      ...people.map((p) => p.name).filter((n) => n.trim()),
    ];
    if (queries.length === 0) {
      return {
        check_id,
        source,
        status: "not_applicable",
        summary: "No names were available to search on the exclusions list.",
        evidence_url: SAM_EXCLUSIONS_HUMAN,
        confidence: null,
        retrieved_at: nowIso(ctx),
        data: null,
      };
    }
    const exactMatches: { name: string; query: string; record: unknown }[] = [];
    const suppressedFuzzy: string[] = [];
    for (const query of queries) {
      const url = `${SAM_EXCLUSIONS_URL}?exclusionName=${encodeURIComponent(query)}&api_key=${encodeURIComponent(key)}`;
      const payload = await getJson(url, ctx);
      const root = asRecord(payload) ?? {};
      const records = [
        ...asArray(root["excludedEntity"]),
        ...asArray(root["results"]),
        ...asArray(root["entityData"]),
      ];
      for (const entry of records) {
        const rec = asRecord(entry) ?? {};
        const name = exclusionRecordName(rec);
        if (!name) continue;
        if (isInvestmentVehicleMismatch(name, query)) continue;
        if (isExactExclusionMatch(name, query)) {
          exactMatches.push({ name, query, record: rec });
        } else {
          suppressedFuzzy.push(name);
        }
      }
    }
    if (exactMatches.length > 0) {
      const first = exactMatches[0];
      return {
        check_id,
        source,
        status: "hit",
        summary: `The federal exclusions and debarment list contains an exact name match for ${first.name}. Open the record at the link, confirm it refers to this vendor, and consult your procurement counsel before going further.`,
        evidence_url: SAM_EXCLUSIONS_HUMAN,
        confidence: "exact",
        retrieved_at: nowIso(ctx),
        data: {
          exact_matches: exactMatches.map((m) => ({
            name: m.name,
            query: m.query,
          })),
          records: exactMatches.map((m) => m.record),
        },
      };
    }
    return {
      check_id,
      source,
      status: "definitive_miss",
      summary:
        "We searched the federal exclusions and debarment list and found no exact name match for this company or the people named in the pitch.",
      evidence_url: SAM_EXCLUSIONS_HUMAN,
      confidence: null,
      retrieved_at: nowIso(ctx),
      data:
        suppressedFuzzy.length > 0
          ? {
              suppressed_fuzzy_matches: suppressedFuzzy,
              suppression_reason:
                "Only exact identity matches may be reported for exclusions; similar-name records are withheld by policy.",
            }
          : null,
    };
  } catch {
    return errorCheck(check_id, source, SAM_EXCLUSIONS_HUMAN, ctx);
  }
}
