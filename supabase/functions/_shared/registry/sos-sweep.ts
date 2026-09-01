/*
  Six-state Secretary of State open-data sweep + identity resolution
  (methodology.md check 1.1, rebuilt per the 50-state feasibility map in
  docs/research/gap-the-tier-1-identity-gate-rests-on-50-sta.md).

  The verified free deterministic lanes (as of Aug 28, 2026):
  - New York      apps.dos.ny.gov public-inquiry API (ALL statuses, incl.
                    dissolved entities, with the dissolution reason and date
                    from the per-entity detail record; verified live
                    2026-08-31). Falls back to data.ny.gov n9v6-gdp6, which
                    covers ACTIVE corporations only — the active-only
                    dataset made dissolutions structurally invisible until
                    the Citymart miss (2026-08-29).
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
  isProductOnlyName,
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
/* Tying-signal columns (identity-ties.ts): facts the datasets already
   return that connect a record to a company — captured, never rendered.
   Column names verified against the live datasets' fixtures: Colorado
   carries principal address + entity type + jurisdiction (the dataset's
   own misspelled "jurisdictonofformation"), Connecticut carries billing
   city/state + state_of_formation + a Domestic/Foreign citizenship flag,
   Texas carries taxpayer city/state. */
const STREET_COLS = ["principaladdress1", "address_1", "address1", "street_address"];
const CITY_COLS = ["principalcity", "billing_city", "taxpayer_city"];
const ADDR_STATE_COLS = ["principalstate", "billing_state", "taxpayer_state"];
const ENTITY_TYPE_COLS = ["entitytype", "business_type", "entity_type"];
const JURISDICTION_COLS = [
  "jurisdictonofformation",
  "jurisdiction_of_formation",
  "state_of_formation",
  "jurisdiction",
];
const DOMESTIC_FLAG_COLS = ["citizenship"];
const AGENT_COLS = ["agentname", "agent_name", "registered_agent", "registeredagentname"];

/* Statuses that usually mean a late annual report, common at young firms.
   These are informational, never alarm findings. */
const LAPSE_STATUS = /non-?compliant|past due|delinquent|not in good standing/i;

/* Affirmative end-of-registration designations. Only these can arm the
   dissolution finding downstream (the affirmative-designation rule: vague
   language like a bare "Inactive" never fires an adverse path). Mergers and
   foreign-state withdrawals are deliberately EXCLUDED: an acquired company
   merging out of a registry, or a company ending its authority in one
   foreign state, is routine corporate housekeeping, not an end of the
   business. */
const AFFIRMATIVE_INACTIVE =
  /voluntar\w*\s+dissol\w*|dissolution|dissolved|revoked|revocation|forfeit\w*|surrender\w*|terminat\w*/i;

export interface DissolvedDesignation {
  legal_name: string;
  status: string;
  reason: string | null;
  effective_date: string | null;
  record_id: string | null;
  /* True when the record is the entity's HOME-state registration (a domestic
     dissolution ends the company); false for foreign registrations; null
     when the lane cannot tell. Downstream severity keys on this. */
  domestic: boolean | null;
}

/* Detect an affirmative end-of-registration designation on an EXACT-match
   record. Similarity matches never arm adverse findings (methodology match-
   confidence rule), so callers only invoke this for exact matches. */
export function detectDissolvedDesignation(args: {
  legalName: string;
  status: string | null;
  reason?: string | null;
  effectiveDate?: string | null;
  recordId?: string | null;
  domestic?: boolean | null;
}): DissolvedDesignation | null {
  const corpus = `${args.status ?? ""} ${args.reason ?? ""}`;
  if (!AFFIRMATIVE_INACTIVE.test(corpus)) return null;
  if (LAPSE_STATUS.test(corpus) && !AFFIRMATIVE_INACTIVE.test(args.reason ?? "")) {
    /* A lapse status alongside no affirmative reason stays informational. */
    if (!AFFIRMATIVE_INACTIVE.test(args.status ?? "")) return null;
  }
  return {
    legal_name: args.legalName,
    status: args.status ?? "",
    reason: args.reason ?? null,
    effective_date: args.effectiveDate ?? null,
    record_id: args.recordId ?? null,
    domestic: args.domestic ?? null,
  };
}

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
  /* Which side contained the other on a similarity match (sam.ts
     CompanyMatch.containment); attribution promotes only query_in_record. */
  containment?: "query_in_record" | "record_in_query";
  /* Record-side tying-signal facts, when the dataset returns them.
     Capture-only in this module; identity-ties.ts consumes them. */
  street?: string | null;
  city?: string | null;
  addr_state?: string | null;
  entity_type?: string | null;
  jurisdiction?: string | null;
  domestic_flag?: string | null; // e.g. Connecticut's "Domestic"/"Foreign"
  agent?: string | null;
  officers?: string[];
}

async function runSocrataLane(
  lane: SocrataLane,
  names: string[],
  productTokens: string[] | undefined,
  ctx: RegistryCtx,
): Promise<RegistryCheck> {
  try {
    const matches: LaneMatch[] = [];
    const rejectedVehicles: string[] = [];
    const rejectedProductOnly: string[] = [];
    const queriesRun: string[] = [];
    for (const name of names) {
      for (const url of socrataQueryUrls(lane, name)) {
        queriesRun.push(url);
        const rows = await fetchRows(url, ctx);
        for (const row of rows) {
          const rowName = firstString(row, [lane.nameCol, ...NAME_COLS]);
          if (!rowName) continue;
          /* A record named entirely from product-brand tokens is a different
             company sharing the brand ("TRUETAX INC") — never accepted. */
          if (isProductOnlyName(rowName, productTokens)) {
            if (!rejectedProductOnly.includes(rowName)) {
              rejectedProductOnly.push(rowName);
            }
            continue;
          }
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
            ...(match.containment ? { containment: match.containment } : {}),
            street: firstString(row, STREET_COLS),
            city: firstString(row, CITY_COLS),
            addr_state: firstString(row, ADDR_STATE_COLS),
            entity_type: firstString(row, ENTITY_TYPE_COLS),
            jurisdiction: firstString(row, JURISDICTION_COLS),
            domestic_flag: firstString(row, DOMESTIC_FLAG_COLS),
            agent: firstString(row, AGENT_COLS),
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
      /* Candidate framing: at check time the identity decision has not run
         yet, so a hit must never read as "this vendor is registered here".
         Short common names collide (a "17A" search matches 17A WASHINGTON
         STREET, LLC), and announcing the raw name as the vendor's record
         erodes trust mid-generation. */
      let summary = `${lane.stateName} business records include an entry under a ${
        best.confidence === "exact" ? "matching" : "similar"
      } name: ${best.name}`;
      if (best.date) summary += `, registered ${best.date}`;
      if (best.status) summary += `, status listed as "${best.status}"`;
      summary +=
        ". The identity check weighs whether this record belongs to this vendor.";
      if (best.status && LAPSE_STATUS.test(best.status)) {
        summary +=
          " A status note like this often reflects a late annual report filing, which is common at young companies. Treat it as informational.";
      }
      /* Exact matches carrying an affirmative end-of-registration status
         arm the dissolution surface downstream. */
      const dissolved =
        best.confidence === "exact"
          ? detectDissolvedDesignation({
              legalName: best.name,
              status: best.status,
              recordId: best.record_id,
            })
          : null;
      return {
        check_id: lane.checkId,
        source: lane.source,
        status: "hit",
        summary: summary.slice(0, 490),
        evidence_url: lane.humanSearchUrl,
        confidence: best.confidence,
        retrieved_at: nowIso(ctx),
        data: {
          matches,
          rejected_investment_vehicles: rejectedVehicles,
          rejected_product_only: rejectedProductOnly,
          queries_run: queriesRun,
          ...(dissolved ? { dissolved } : {}),
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
        rejected_product_only: rejectedProductOnly,
        queries_run: queriesRun,
      },
    };
  } catch {
    return errorCheck(lane.checkId, lane.source, lane.humanSearchUrl, ctx);
  }
}

/* ------------------------------------------------- New York DOS lane */

/* The DOS public-inquiry API behind apps.dos.ny.gov covers ALL entity
   statuses (the open-data active-corps dataset structurally hides
   dissolved entities), and its per-entity detail record carries the status
   reason and effective date. Undocumented but public: it is the JSON
   backend of the state's own search page, verified live 2026-08-31 with
   the Citymart dissolution record. Any failure falls back to the Socrata
   active-corps lane, so the failure posture never gets worse than the old
   behavior. */
const NY_DOS_SEARCH_URL =
  "https://apps.dos.ny.gov/PublicInquiryWeb/api/PublicInquiry/GetComplexSearchMatchingEntities";
const NY_DOS_DETAIL_URL =
  "https://apps.dos.ny.gov/PublicInquiryWeb/api/PublicInquiry/GetEntityRecordByID";
const NY_DOS_SOURCE = "New York Department of State (public inquiry service)";

async function postNyDos(
  url: string,
  body: unknown,
  ctx: RegistryCtx,
): Promise<unknown> {
  const fetchFn = ctx.fetchFn ?? globalThis.fetch;
  const res = await fetchFn(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: ctx.signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

async function runNyDosLane(
  lane: SocrataLane,
  names: string[],
  productTokens: string[] | undefined,
  ctx: RegistryCtx,
): Promise<RegistryCheck> {
  try {
    const matches: LaneMatch[] = [];
    const rejectedVehicles: string[] = [];
    const rejectedProductOnly: string[] = [];
    const queriesRun: string[] = [];
    for (const name of names) {
      queriesRun.push(`${NY_DOS_SEARCH_URL}?searchValue=${encodeURIComponent(name)}`);
      const payload = await postNyDos(
        NY_DOS_SEARCH_URL,
        {
          searchValue: name,
          searchByTypeIndicator: "EntityName",
          searchExpressionIndicator: "BeginsWith",
          entityStatusIndicator: "AllStatuses",
          entityTypeIndicator: [
            "Corporation",
            "LimitedLiabilityCompany",
            "LimitedPartnership",
            "LimitedLiabilityPartnership",
          ],
          listPaginationInfo: { listStartRecord: 1, listEndRecord: 50 },
        },
        ctx,
      );
      const root = asRecord(payload) ?? {};
      for (const entry of Array.isArray(root["entitySearchResultList"])
        ? (root["entitySearchResultList"] as unknown[])
        : []) {
        const rec = asRecord(entry) ?? {};
        const rowName = firstString(rec, ["entityName"]);
        if (!rowName) continue;
        if (isProductOnlyName(rowName, productTokens)) {
          if (!rejectedProductOnly.includes(rowName)) rejectedProductOnly.push(rowName);
          continue;
        }
        const match = matchCompanyName(rowName, names);
        if (match.kind === "vehicle_rejected") {
          if (!rejectedVehicles.includes(rowName)) rejectedVehicles.push(rowName);
          continue;
        }
        if (match.kind !== "match") continue;
        if (matches.some((m) => m.name === rowName)) continue;
        matches.push({
          name: rowName,
          status: firstString(rec, ["entityStatus"]),
          date: trimDate(firstString(rec, ["initialFilingDate"])),
          record_id: firstString(rec, ["dosID"]),
          confidence: match.confidence,
          ...(match.containment ? { containment: match.containment } : {}),
          entity_type: firstString(rec, ["entityType"]),
          jurisdiction: firstString(rec, ["jurisdiction"]),
        });
      }
      if (matches.some((m) => m.confidence === "exact")) break;
    }

    if (matches.length === 0) {
      /* The DOS search is begins-with; the Socrata full-text lane can still
         catch mid-name matches among active corporations. */
      const socrata = await runSocrataLane(lane, names, productTokens, ctx);
      if (socrata.status === "hit") return socrata;
      return {
        check_id: lane.checkId,
        source: NY_DOS_SOURCE,
        status: "definitive_miss",
        summary:
          "We searched New York's Department of State corporation records, including inactive and dissolved entities, and did not find this company. Companies only register in the states where they do business, so a miss in one state is normal and not a red flag.",
        evidence_url: lane.humanSearchUrl,
        confidence: null,
        retrieved_at: nowIso(ctx),
        data: {
          rejected_investment_vehicles: rejectedVehicles,
          rejected_product_only: rejectedProductOnly,
          queries_run: queriesRun,
          all_statuses_searched: true,
        },
      };
    }

    const best = matches.find((m) => m.confidence === "exact") ?? matches[0];
    /* The detail record carries the status reason ("Voluntarily Dissolved")
       and the effective date; it is additive, so its failure never sinks
       the search hit. */
    let reason: string | null = null;
    let inactiveDate: string | null = null;
    let entityType: string | null = null;
    if (best.record_id) {
      try {
        const payload = await postNyDos(
          NY_DOS_DETAIL_URL,
          { SearchID: best.record_id, EntityName: best.name, AssumedNameFlag: "false" },
          ctx,
        );
        const root = asRecord(payload) ?? {};
        const info = asRecord(root["entityGeneralInfo"]) ?? {};
        reason = firstString(info, ["reasonForStatus"]);
        inactiveDate = trimDate(firstString(info, ["inactiveDate"]));
        entityType = firstString(info, ["entityType"]);
        const detailStatus = firstString(info, ["entityStatus"]);
        if (detailStatus) best.status = detailStatus;
        /* Tying-signal facts from the detail record (field names verified
           live 2026-08-31 on the Citymart record): the CEO and registered
           agent names, the service-of-process address, and the formation
           jurisdiction. Capture-only; identity-ties.ts consumes them. */
        best.jurisdiction = firstString(info, ["jurisdiction"]);
        const ceoName = firstString(asRecord(root["ceo"]) ?? {}, ["name"]);
        if (ceoName) best.officers = [ceoName];
        best.agent = firstString(asRecord(root["registeredAgent"]) ?? {}, ["name"]);
        const sop =
          asRecord(asRecord(root["sopAddress"])?.["address"]) ?? {};
        /* Both address lines join: the digit-bearing street line is often
           line 2 behind a "C/O ..." line 1. */
        const sopStreet = [
          firstString(sop, ["streetAddress1", "streetAddress"]),
          firstString(sop, ["addressLine2", "streetAddress2"]),
        ]
          .filter((part): part is string => Boolean(part))
          .join(" ");
        best.street = sopStreet || null;
        best.city = firstString(sop, ["city"]);
        best.addr_state = firstString(sop, ["state"]);
      } catch {
        /* keep the search-level fields */
      }
    }

    const dissolved =
      best.confidence === "exact"
        ? detectDissolvedDesignation({
            legalName: best.name,
            status: best.status,
            reason,
            effectiveDate: inactiveDate,
            recordId: best.record_id,
            domestic: entityType ? /domestic/i.test(entityType) : null,
          })
        : null;

    let summary = `New York business records include an entry under a ${
      best.confidence === "exact" ? "matching" : "similar"
    } name: ${best.name}`;
    if (best.date) summary += `, registered ${best.date}`;
    if (best.status) summary += `, status listed as "${best.status}"`;
    if (reason) summary += ` (${reason}${inactiveDate ? `, effective ${inactiveDate}` : ""})`;
    summary += ". The identity check weighs whether this record belongs to this vendor.";
    if (best.status && LAPSE_STATUS.test(best.status)) {
      summary +=
        " A status note like this often reflects a late annual report filing, which is common at young companies. Treat it as informational.";
    }

    return {
      check_id: lane.checkId,
      source: NY_DOS_SOURCE,
      status: "hit",
      summary: summary.slice(0, 490),
      evidence_url: lane.humanSearchUrl,
      confidence: best.confidence,
      retrieved_at: nowIso(ctx),
      data: {
        matches,
        rejected_investment_vehicles: rejectedVehicles,
        rejected_product_only: rejectedProductOnly,
        queries_run: queriesRun,
        ...(reason ? { reason_for_status: reason } : {}),
        ...(inactiveDate ? { inactive_date: inactiveDate } : {}),
        ...(dissolved ? { dissolved } : {}),
      },
    };
  } catch {
    /* DOS API unavailable: the active-corps open-data lane still answers
       for active entities. */
    return runSocrataLane(lane, names, productTokens, ctx);
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
  { companyNames, productTokens }: { companyNames: string[]; productTokens?: string[] },
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
      if (lane.checkId === "sos_ny") {
        return runNyDosLane(lane, names, productTokens, ctx);
      }
      return runSocrataLane(lane, names, productTokens, ctx);
    }),
  );
}

/* --------------------------------------------------- identity resolution */

/* Identifier classes that can support identity resolution. Exclusion lists
   are deliberately NOT identity evidence. */
type IdentifierClass = "sos" | "rdap" | "edgar" | "sam" | "lei";

function classifyIdentifier(
  check: RegistryCheck,
): IdentifierClass | "rdap_discovered" | null {
  if (check.status !== "hit") return null;
  /* Only exact-confidence matches can mint identity. A name-similarity hit
     is a candidate record, not this vendor: collision matches were minting
     the two-identifier floor live ("17A" earned identity from 17A
     WASHINGTON STREET, LLC on 2026-08-29), which manufactures verdict
     eligibility, not just decoration. */
  if (check.confidence === "name_similarity") return null;
  const id = check.check_id;
  if (id.startsWith("sos_")) return "sos";
  if (id === "sam_exclusions") return null;
  if (/rdap|whois|domain_registration/.test(id)) {
    /* A domain the pipeline DISCOVERED (rather than one the pitch stated)
       may count only as the second identifier, and only when the fetched
       site's own extracted name matched the submitted vendor name (the
       confirmed_name_match code check). Unconfirmed discovered domains
       never count. See resolveIdentity below. */
    const d = (check.data ?? {}) as {
      discovered_domain?: boolean;
      confirmed_name_match?: boolean;
    };
    if (d.discovered_domain) {
      return d.confirmed_name_match ? "rdap_discovered" : null;
    }
    return "rdap";
  }
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
  let discoveredRdap = false;
  for (const check of checks) {
    const cls = classifyIdentifier(check);
    if (!cls) continue;
    if (cls === "rdap_discovered") {
      discoveredRdap = true;
      continue;
    }
    if (cls === "sos") {
      /* Each state registry is an independent government record. */
      const label = `${check.source}: registration record`;
      if (!identifiers.includes(label)) identifiers.push(label);
    } else if (!nonSosSeen.has(cls)) {
      nonSosSeen.add(cls);
      identifiers.push(IDENTIFIER_LABELS[cls]);
    }
  }
  /* A confirmed discovered-domain record is only ever the SECOND
     identifier: at least one true registry record must anchor the entity,
     so a purely-web presence can never resolve identity on its own. */
  if (discoveredRdap && identifiers.length >= 1 && !nonSosSeen.has("rdap")) {
    identifiers.push(
      "Domain registration record (RDAP), for a website matched to the vendor's name",
    );
  }

  /* Availability fallback (the Govra tier cliff, 2026-08-30): when the RDAP
     lookup itself was UNAVAILABLE (never when it definitively found the
     domain unregistered) and exactly one registry identifier exists, live
     web infrastructure can stand in as the second identifier: certificate
     transparency history or working mail records are independent, code-read
     evidence the vendor's domain operates. Same second-identifier-only rule
     as discovered domains, and an unconfirmed discovered domain never
     qualifies. A vendor's verdict must not drop tiers because a third-party
     lookup had a bad minute; coverage-limited never counts as not-found,
     including for identity. */
  if (identifiers.length === 1) {
    const confirmedProvenance = (c: RegistryCheck): boolean => {
      const d = (c.data ?? {}) as {
        discovered_domain?: boolean;
        confirmed_name_match?: boolean;
      };
      return !d.discovered_domain || d.confirmed_name_match === true;
    };
    const rdapCheck = checks.find((c) => c.check_id === "rdap_domain_age");
    const rdapUnavailable =
      rdapCheck !== undefined &&
      (rdapCheck.status === "error" || rdapCheck.status === "coverage_limited") &&
      confirmedProvenance(rdapCheck);
    if (rdapUnavailable) {
      const crtsh = checks.find(
        (c) =>
          c.check_id === "crtsh_subdomains" &&
          c.status === "hit" &&
          confirmedProvenance(c),
      );
      const dns = checks.find(
        (c) =>
          c.check_id === "dns_email_hygiene" &&
          c.status === "hit" &&
          ((c.data ?? {}) as { has_mx?: boolean }).has_mx === true &&
          confirmedProvenance(c),
      );
      const infra = crtsh ?? dns;
      if (infra) {
        identifiers.push(
          crtsh
            ? "Certificate transparency records for the vendor's domain, used because the domain registration lookup was unavailable this run"
            : "Working mail records (DNS) for the vendor's domain, used because the domain registration lookup was unavailable this run",
        );
      }
    }
  }

  return {
    identity_resolved: identifiers.length >= 2,
    identifiers_found: identifiers,
  };
}
