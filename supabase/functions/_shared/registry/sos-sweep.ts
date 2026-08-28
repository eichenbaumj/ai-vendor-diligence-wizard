/*
  Six-state Secretary of State open-data sweep + identity resolution
  (methodology.md check 1.1, rebuilt per the 50-state feasibility map in
  docs/research/gap-the-tier-1-identity-gate-rests-on-50-sta.md).

  The verified free deterministic lanes (as of Aug 28, 2026):
  - New York      data.ny.gov        n9v6-gdp6  (Active Corporations)
  - Colorado      data.colorado.gov  4ykn-tg5h  (Business Entities)
  - Connecticut   data.ct.gov        n7gp-d28j  (Business Registry Master)
  - Texas         data.texas.gov     9cir-efmm  (Active Franchise Taxpayers,
                    via the Comptroller; the TX SoS itself is pay-per-search)
  - Oregon        data.oregon.gov    tckn-sxa6  (Active Businesses)
  - Florida       bulk SFTP mirror only (no plain-HTTPS query lane), so it is
                    always reported as coverage_limited with the official
                    Sunbiz search deep link for a two-minute manual check.

  The Polimorphic rule: companies register state by state, and govtech
  vendors often register in CUSTOMER states before their HQ state. A miss in
  some states plus a hit in any state resolves identity; a miss is never
  adverse on its own. Benign lapse statuses ("Noncompliant", "annual report
  past due") are styled informational, never as alarm findings.

  Socrata mechanics per the gap report: $q full-text first, then a
  $where=upper(col) like fallback to catch punctuation variants; a free app
  token (ctx.apiKeys.socrata) is sent as X-App-Token when present.

  Pure module: no Deno APIs, no module state.
*/
import type { RegistryCheck } from "../schemas.ts";
import {
  asRecord,
  dedupeNames,
  errorCheck,
  firstString,
  matchCompanyName,
  normalizeCompanyName,
  nowIso,
} from "./sam.ts";
import type { RegistryCtx } from "./sam.ts";

interface SocrataLane {
  kind: "socrata";
  checkId: string;
  stateName: string;
  source: string;
  datasetUrl: string;
  nameCol: string;
  humanSearchUrl: string;
}

interface OfflineLane {
  kind: "offline";
  checkId: string;
  stateName: string;
  source: string;
  humanSearchUrl: string;
  reason: string;
  summary: string;
}

type Lane = SocrataLane | OfflineLane;

const LANES: Lane[] = [
  {
    kind: "socrata",
    checkId: "sos_ny",
    stateName: "New York",
    source: "New York Department of State (data.ny.gov)",
    datasetUrl: "https://data.ny.gov/resource/n9v6-gdp6.json",
    nameCol: "current_entity_name",
    humanSearchUrl: "https://apps.dos.ny.gov/publicInquiry/",
  },
  {
    kind: "socrata",
    checkId: "sos_co",
    stateName: "Colorado",
    source: "Colorado Secretary of State (data.colorado.gov)",
    datasetUrl: "https://data.colorado.gov/resource/4ykn-tg5h.json",
    nameCol: "entityname",
    humanSearchUrl: "https://www.coloradosos.gov/biz/BusinessEntityCriteriaExt.do",
  },
  {
    kind: "socrata",
    checkId: "sos_ct",
    stateName: "Connecticut",
    source: "Connecticut Secretary of the State (data.ct.gov)",
    datasetUrl: "https://data.ct.gov/resource/n7gp-d28j.json",
    nameCol: "name",
    humanSearchUrl: "https://service.ct.gov/business/s/onlinebusinesssearch",
  },
  {
    kind: "socrata",
    checkId: "sos_tx",
    stateName: "Texas",
    source: "Texas Comptroller Active Franchise Taxpayers (data.texas.gov)",
    datasetUrl: "https://data.texas.gov/resource/9cir-efmm.json",
    nameCol: "taxpayer_name",
    humanSearchUrl:
      "https://comptroller.texas.gov/taxes/franchise/account-status/search",
  },
  {
    kind: "socrata",
    checkId: "sos_or",
    stateName: "Oregon",
    source: "Oregon Secretary of State (data.oregon.gov)",
    datasetUrl: "https://data.oregon.gov/resource/tckn-sxa6.json",
    nameCol: "business_name",
    humanSearchUrl: "https://sos.oregon.gov/business/Pages/find.aspx",
  },
  {
    kind: "offline",
    checkId: "sos_fl",
    stateName: "Florida",
    source: "Florida Division of Corporations (Sunbiz)",
    humanSearchUrl: "https://search.sunbiz.org/Inquiry/CorporationSearch/ByName",
    reason: "bulk_sftp_only",
    summary:
      "Florida publishes its business registry as bulk files, not a live query service, and our copy of that file was not available for this run. This says nothing about the vendor. You can search Florida's official Sunbiz site directly at the link; it takes about two minutes.",
  },
];

/* Row fields vary by dataset; read the lane's own column first, then the
   other known name/status/date/id columns. */
const NAME_COLS = [
  "current_entity_name",
  "entityname",
  "name",
  "business_name",
  "taxpayer_name",
  "entity_name",
  "legal_name",
];
const STATUS_COLS = [
  "entitystatus",
  "status",
  "current_entity_status",
  "business_status",
  "registration_status",
  "franchise_tax_status",
  "right_to_transact_business",
];
const DATE_COLS = [
  "initial_dos_filing_date",
  "entityformdate",
  "date_registration",
  "registration_date",
  "business_registration_date",
  "sos_charter_date",
  "registry_date",
  "date_of_incorporation",
];
const ID_COLS = [
  "dos_id",
  "entityid",
  "business_id",
  "businessid",
  "taxpayer_number",
  "registry_number",
  "id",
];

/* Statuses that usually mean a late annual report, common at young firms.
   These are informational, never alarm findings. */
const LAPSE_STATUS = /non-?compliant|past due|delinquent|not in good standing/i;

function socrataQueryUrls(lane: SocrataLane, name: string): string[] {
  const qUrl = `${lane.datasetUrl}?$q=${encodeURIComponent(name)}&$limit=50`;
  const normalized = normalizeCompanyName(name).replace(/'/g, "''");
  const whereExpr = `upper(${lane.nameCol}) like '%${normalized}%'`;
  const whereUrl = `${lane.datasetUrl}?$where=${encodeURIComponent(whereExpr)}&$limit=50`;
  return [qUrl, whereUrl];
}

async function fetchRows(
  url: string,
  ctx: RegistryCtx,
): Promise<Record<string, unknown>[]> {
  const fetchFn = ctx.fetchFn ?? globalThis.fetch;
  const headers: Record<string, string> = {};
  const token = ctx.apiKeys?.socrata;
  if (token) headers["X-App-Token"] = token;
  const res = await fetchFn(url, { headers, signal: ctx.signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const payload = await res.json();
  if (!Array.isArray(payload)) return [];
  return payload
    .map((row) => asRecord(row))
    .filter((row): row is Record<string, unknown> => row !== null);
}

function trimDate(raw: string | null): string | null {
  if (!raw) return null;
  const m = raw.match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : raw;
}

interface LaneMatch {
  name: string;
  status: string | null;
  date: string | null;
  record_id: string | null;
  confidence: "exact" | "name_similarity";
}

async function runSocrataLane(
  lane: SocrataLane,
  names: string[],
  ctx: RegistryCtx,
): Promise<RegistryCheck> {
  try {
    const matches: LaneMatch[] = [];
    const rejectedVehicles: string[] = [];
    const queriesRun: string[] = [];
    for (const name of names) {
      for (const url of socrataQueryUrls(lane, name)) {
        queriesRun.push(url);
        const rows = await fetchRows(url, ctx);
        for (const row of rows) {
          const rowName = firstString(row, [lane.nameCol, ...NAME_COLS]);
          if (!rowName) continue;
          const match = matchCompanyName(rowName, names);
          if (match.kind === "vehicle_rejected") {
            if (!rejectedVehicles.includes(rowName)) {
              rejectedVehicles.push(rowName);
            }
            continue;
          }
          if (match.kind !== "match") continue;
          if (matches.some((m) => m.name === rowName)) continue;
          matches.push({
            name: rowName,
            status: firstString(row, STATUS_COLS),
            date: trimDate(firstString(row, DATE_COLS)),
            record_id: firstString(row, ID_COLS),
            confidence: match.confidence,
          });
        }
        /* The $where fallback only runs when $q found nothing. */
        if (matches.length > 0) break;
      }
      if (matches.some((m) => m.confidence === "exact")) break;
    }

    if (matches.length > 0) {
      const best =
        matches.find((m) => m.confidence === "exact") ?? matches[0];
      let summary = `${lane.stateName} business records list ${best.name}`;
      if (best.date) summary += `, registered ${best.date}`;
      if (best.status) summary += `, status listed as "${best.status}"`;
      summary += ".";
      if (best.status && LAPSE_STATUS.test(best.status)) {
        summary +=
          " A status note like this often reflects a late annual report filing, which is common at young companies. Treat it as informational.";
      }
      return {
        check_id: lane.checkId,
        source: lane.source,
        status: "hit",
        summary,
        evidence_url: lane.humanSearchUrl,
        confidence: best.confidence,
        retrieved_at: nowIso(ctx),
        data: {
          matches,
          rejected_investment_vehicles: rejectedVehicles,
          queries_run: queriesRun,
        },
      };
    }
    return {
      check_id: lane.checkId,
      source: lane.source,
      status: "definitive_miss",
      summary: `We searched ${lane.stateName}'s public business registry data and did not find this company. Companies only register in the states where they do business, so a miss in one state is normal and not a red flag.`,
      evidence_url: lane.humanSearchUrl,
      confidence: null,
      retrieved_at: nowIso(ctx),
      data: {
        rejected_investment_vehicles: rejectedVehicles,
        queries_run: queriesRun,
      },
    };
  } catch {
    return errorCheck(lane.checkId, lane.source, lane.humanSearchUrl, ctx);
  }
}

function runOfflineLane(lane: OfflineLane, ctx: RegistryCtx): RegistryCheck {
  return {
    check_id: lane.checkId,
    source: lane.source,
    status: "coverage_limited",
    summary: lane.summary,
    evidence_url: lane.humanSearchUrl,
    confidence: null,
    retrieved_at: nowIso(ctx),
    data: { reason: lane.reason },
  };
}

/* Fan out to all six lanes in parallel. Always returns one check per state,
   in the LANES order; no lane failure can sink the others. */
export async function checkSosSweep(
  { companyNames }: { companyNames: string[] },
  ctx: RegistryCtx,
): Promise<RegistryCheck[]> {
  const names = dedupeNames(companyNames);
  return await Promise.all(
    LANES.map((lane) => {
      if (lane.kind === "offline") {
        return Promise.resolve(runOfflineLane(lane, ctx));
      }
      if (names.length === 0) {
        return Promise.resolve<RegistryCheck>({
          check_id: lane.checkId,
          source: lane.source,
          status: "not_applicable",
          summary: `No company name was available to search in ${lane.stateName}'s business registry.`,
          evidence_url: lane.humanSearchUrl,
          confidence: null,
          retrieved_at: nowIso(ctx),
          data: null,
        });
      }
      return runSocrataLane(lane, names, ctx);
    }),
  );
}

/* --------------------------------------------------- identity resolution */

/* Identifier classes that can support identity resolution. Exclusion lists
   are deliberately NOT identity evidence. */
type IdentifierClass = "sos" | "rdap" | "edgar" | "sam" | "lei";

function classifyIdentifier(check: RegistryCheck): IdentifierClass | null {
  if (check.status !== "hit") return null;
  const id = check.check_id;
  if (id.startsWith("sos_")) return "sos";
  if (id === "sam_exclusions") return null;
  if (/rdap|whois|domain_registration/.test(id)) return "rdap";
  if (/edgar|sec_/.test(id)) return "edgar";
  if (/^sam(_entity)?$/.test(id)) return "sam";
  if (/gleif|lei/.test(id)) return "lei";
  return null;
}

const IDENTIFIER_LABELS: Record<Exclude<IdentifierClass, "sos">, string> = {
  rdap: "Domain registration record (RDAP)",
  edgar: "SEC EDGAR filing",
  sam: "SAM.gov entity registration",
  lei: "GLEIF legal entity identifier",
};

/*
  Identity resolves when at least two independent identifiers converge:
  - any SoS hit + a domain RDAP registration,
  - an EDGAR filing + an SoS hit,
  - a SAM entity registration + anything else,
  - registrations in two different states.
  Misses never subtract (the Polimorphic rule: a Delaware C-corp registers
  as a foreign entity wherever it operates, so a miss in its HQ state means
  nothing when another state, or EDGAR, has the record).
*/
export function resolveIdentity(checks: RegistryCheck[]): {
  identity_resolved: boolean;
  identifiers_found: string[];
} {
  const identifiers: string[] = [];
  const nonSosSeen = new Set<string>();
  for (const check of checks) {
    const cls = classifyIdentifier(check);
    if (!cls) continue;
    if (cls === "sos") {
      /* Each state registry is an independent government record. */
      const label = `${check.source}: registration record`;
      if (!identifiers.includes(label)) identifiers.push(label);
    } else if (!nonSosSeen.has(cls)) {
      nonSosSeen.add(cls);
      identifiers.push(IDENTIFIER_LABELS[cls]);
    }
  }
  return {
    identity_resolved: identifiers.length >= 2,
    identifiers_found: identifiers,
  };
}
