/*
  USAspending.gov check (methodology.md check 2.1): has the federal
  government actually paid this vendor? A hit is a strong green flag
  (T1 payment records). Absence is neutral: many legitimate state/local
  vendors have no federal awards.

  Two-step, no auth required:
  1. POST /api/v2/autocomplete/recipient/ to find the recipient by name.
  2. If found, POST /api/v2/search/spending_by_award/ for recent contract
     awards (last five years).

  Pure module: no Deno APIs, no module state.
*/
import type { RegistryCheck } from "../schemas.ts";
import {
  asArray,
  asRecord,
  dedupeNames,
  errorCheck,
  firstString,
  matchCompanyName,
  nowIso,
} from "./sam.ts";
import type { RegistryCtx } from "./sam.ts";

const RECIPIENT_URL =
  "https://api.usaspending.gov/api/v2/autocomplete/recipient/";
const AWARDS_URL = "https://api.usaspending.gov/api/v2/search/spending_by_award/";
const HUMAN_SEARCH = "https://www.usaspending.gov/search";

async function postJson(
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

function formatUsd(amount: number): string {
  const rounded = Math.round(amount);
  const withCommas = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `$${withCommas}`;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function checkFederalAwards(
  { companyNames }: { companyNames: string[] },
  ctx: RegistryCtx,
): Promise<RegistryCheck> {
  const check_id = "usaspending_awards";
  const source = "USAspending.gov";
  try {
    const names = dedupeNames(companyNames);
    if (names.length === 0) {
      return {
        check_id,
        source,
        status: "not_applicable",
        summary: "No company name was available to search on USAspending.gov.",
        evidence_url: HUMAN_SEARCH,
        confidence: null,
        retrieved_at: nowIso(ctx),
        data: null,
      };
    }

    /* Step 1: recipient lookup. */
    let matched: {
      name: string;
      id: string | null;
      confidence: "exact" | "name_similarity";
    } | null = null;
    const rejectedVehicles: string[] = [];
    for (const name of names) {
      const payload = await postJson(
        RECIPIENT_URL,
        { search_text: name, limit: 20 },
        ctx,
      );
      const root = asRecord(payload) ?? {};
      for (const entry of asArray(root["results"])) {
        const rec = asRecord(entry) ?? {};
        const recipientName = firstString(rec, [
          "recipient_name",
          "name",
          "legal_business_name",
        ]);
        if (!recipientName) continue;
        const match = matchCompanyName(recipientName, names);
        if (match.kind === "vehicle_rejected") {
          rejectedVehicles.push(recipientName);
          continue;
        }
        if (match.kind !== "match") continue;
        const candidate = {
          name: recipientName,
          id: firstString(rec, ["recipient_id", "id", "uei"]),
          confidence: match.confidence,
        };
        if (!matched || (matched.confidence !== "exact" && match.confidence === "exact")) {
          matched = candidate;
        }
      }
      if (matched?.confidence === "exact") break;
    }

    if (!matched) {
      return {
        check_id,
        source,
        status: "definitive_miss",
        summary:
          "We searched federal spending records on USAspending.gov and did not find this company as a recipient. Many state and local vendors have no federal awards, so this is neutral and not a red flag.",
        evidence_url: HUMAN_SEARCH,
        confidence: null,
        retrieved_at: nowIso(ctx),
        data: {
          recipient_found: false,
          award_count: 0,
          total_amount: 0,
          latest_award_year: null,
          rejected_investment_vehicles: rejectedVehicles,
        },
      };
    }

    /* Step 2: recent contract awards for the matched recipient. */
    const now = ctx.now?.() ?? new Date();
    const start = new Date(now.getTime());
    start.setFullYear(start.getFullYear() - 5);
    const awardsPayload = await postJson(
      AWARDS_URL,
      {
        filters: {
          recipient_search_text: [matched.name],
          time_period: [{ start_date: isoDate(start), end_date: isoDate(now) }],
          award_type_codes: ["A", "B", "C", "D"],
        },
        fields: [
          "Award ID",
          "Recipient Name",
          "Award Amount",
          "Start Date",
          "Awarding Agency",
        ],
        limit: 50,
        page: 1,
      },
      ctx,
    );
    const awardsRoot = asRecord(awardsPayload) ?? {};
    let awardCount = 0;
    let totalAmount = 0;
    let latestYear: number | null = null;
    for (const entry of asArray(awardsRoot["results"])) {
      const rec = asRecord(entry) ?? {};
      awardCount += 1;
      const amount = rec["Award Amount"];
      if (typeof amount === "number" && Number.isFinite(amount)) {
        totalAmount += amount;
      }
      const startDate = firstString(rec, ["Start Date"]);
      if (startDate) {
        const year = Number(startDate.slice(0, 4));
        if (Number.isFinite(year) && (latestYear === null || year > latestYear)) {
          latestYear = year;
        }
      }
    }

    const evidence_url = matched.id
      ? `https://www.usaspending.gov/recipient/${matched.id}/latest`
      : HUMAN_SEARCH;
    const data = {
      recipient_found: true,
      recipient_name: matched.name,
      recipient_id: matched.id,
      award_count: awardCount,
      total_amount: totalAmount,
      latest_award_year: latestYear,
      award_types: "contracts (A-D)",
      rejected_investment_vehicles: rejectedVehicles,
    };

    if (awardCount > 0) {
      const yearPart = latestYear ? `, most recently starting in ${latestYear}` : "";
      return {
        check_id,
        source,
        status: "hit",
        summary: `USAspending.gov shows ${awardCount} federal contract award${awardCount === 1 ? "" : "s"} to ${matched.name} in the last five years, totaling about ${formatUsd(totalAmount)}${yearPart}. Federal payment records are strong evidence that a company does real government work.`,
        evidence_url,
        confidence: matched.confidence,
        retrieved_at: nowIso(ctx),
        data,
      };
    }
    return {
      check_id,
      source,
      status: "hit",
      summary: `USAspending.gov lists ${matched.name} as a federal award recipient, but we did not find contract awards in the last five years. Ask the vendor when it last worked with a federal agency.`,
      evidence_url,
      confidence: matched.confidence,
      retrieved_at: nowIso(ctx),
      data,
    };
  } catch {
    return errorCheck(check_id, source, HUMAN_SEARCH, ctx);
  }
}
