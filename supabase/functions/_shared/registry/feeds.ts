/*
  Pre-parsed feed checks (methodology.md checks 3.2, 3.3, 2.2):
  GovRAMP program participants, TX-RAMP certified cloud products, and
  Sourcewell cooperative contract holders.

  A GitHub Actions cron parses the published lists (HTML or XLSX) into plain
  JSON rows; the edge function only ever receives the parsed rows, so these
  checks take the feed as an argument and do no fetching. A null feed means
  the cron has not populated it yet, and a stale feed (older than
  FEED_MAX_AGE_DAYS) is treated the same way: coverage_limited, never
  adverse, with the age stated honestly.

  Contradiction rules:
  - GovRAMP claimed + absent = registry contradiction (like FedRAMP).
  - TX-RAMP claimed + absent = softer wording with a publishing-lag caveat
    (the DIR list can lag; methodology caps this at HIGH, not CRITICAL).
  - Sourcewell claimed + absent = registry contradiction (the cooperative's
    own list is authoritative).

  Pure module: no Deno APIs, no module state.
*/
import type { RegistryCheck } from "../schemas.ts";
import { dedupeNames, matchCompanyName, nowIso } from "./sam.ts";
import type { RegistryCtx } from "./sam.ts";

export interface RampFeedRow {
  provider: string;
  product?: string;
  status: string;
}

export interface SourcewellFeedRow {
  supplier: string;
  contract?: string;
}

/* Daily cron plus visible workflow failures means a week of consecutive
   failures before reports degrade; the upstream lists move on a roughly
   weekly cadence, so a week-old copy is the honesty boundary. */
export const FEED_MAX_AGE_DAYS = 7;

export function isFeedStale(fetchedAtIso: string, nowIso: string): boolean {
  const fetched = Date.parse(fetchedAtIso);
  const now = Date.parse(nowIso);
  if (Number.isNaN(fetched) || Number.isNaN(now)) return true;
  return now - fetched > FEED_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

/* What loadFeeds hands each check: parsed rows, a stale marker carrying the
   last refresh time, or null when the feed was never loaded. */
export type FeedInput<Row> = Row[] | { stale: true; fetched_at: string } | null;

function isStaleMarker<Row>(
  feed: FeedInput<Row>,
): feed is { stale: true; fetched_at: string } {
  return feed !== null && !Array.isArray(feed);
}

const GOVRAMP_URL = "https://govramp.org/program-participants/";
const TXRAMP_URL =
  "https://dir.texas.gov/resource-library-item/tx-ramp-certified-cloud-products";
const SOURCEWELL_URL = "https://www.sourcewell-mn.gov/contract-search";

interface RampMatch extends RampFeedRow {
  confidence: "exact" | "name_similarity";
}

function matchRampRows(
  feed: RampFeedRow[],
  names: string[],
): { matches: RampMatch[]; rejected: string[] } {
  const matches: RampMatch[] = [];
  const rejected: string[] = [];
  for (const row of feed) {
    const match = matchCompanyName(row.provider, names);
    if (match.kind === "vehicle_rejected") {
      rejected.push(row.provider);
      continue;
    }
    if (match.kind === "match") {
      matches.push({ ...row, confidence: match.confidence });
    }
  }
  matches.sort((a, b) =>
    a.confidence === b.confidence ? 0 : a.confidence === "exact" ? -1 : 1,
  );
  return { matches, rejected };
}

function feedNotLoaded(
  check_id: string,
  source: string,
  evidence_url: string,
  ctx: RegistryCtx,
): RegistryCheck {
  return {
    check_id,
    source,
    status: "coverage_limited",
    summary: `The ${source} registry feed has not been loaded yet, so this check did not run. You can search the registry yourself at the link.`,
    evidence_url,
    confidence: null,
    retrieved_at: nowIso(ctx),
    data: { reason: "feed_not_loaded" },
  };
}

function feedStale(
  check_id: string,
  source: string,
  evidence_url: string,
  fetched_at: string,
  ctx: RegistryCtx,
): RegistryCheck {
  const day = fetched_at.slice(0, 10);
  return {
    check_id,
    source,
    status: "coverage_limited",
    summary: `Our copy of the ${source} list was last refreshed on ${day}, which is more than ${FEED_MAX_AGE_DAYS} days old, so this check did not run. You can search the registry yourself at the link.`,
    evidence_url,
    confidence: null,
    retrieved_at: nowIso(ctx),
    data: { reason: "feed_stale", fetched_at },
  };
}

/* ---------------------------------------------------------------- GovRAMP */

export async function checkGovRamp(
  { companyNames, claimed }: { companyNames: string[]; claimed: boolean },
  feed: FeedInput<RampFeedRow>,
  ctx: RegistryCtx,
): Promise<RegistryCheck> {
  const check_id = "govramp";
  const source = "GovRAMP";
  if (feed === null) {
    return feedNotLoaded(check_id, source, GOVRAMP_URL, ctx);
  }
  if (isStaleMarker(feed)) {
    return feedStale(check_id, source, GOVRAMP_URL, feed.fetched_at, ctx);
  }
  const names = dedupeNames(companyNames);
  const { matches, rejected } = matchRampRows(feed, names);
  if (matches.length > 0) {
    const best = matches[0];
    const productPart = best.product ? ` for ${best.product}` : "";
    return {
      check_id,
      source,
      status: "hit",
      summary: `The GovRAMP participant list includes ${best.provider}${productPart} with status ${best.status}. Note that GovRAMP has several levels; the status shown here is the one that counts, and membership alone is not a security verification.`,
      evidence_url: GOVRAMP_URL,
      confidence: best.confidence,
      retrieved_at: nowIso(ctx),
      data: {
        matches,
        claimed,
        rejected_investment_vehicles: rejected,
      },
    };
  }
  if (claimed) {
    return {
      check_id,
      source,
      status: "definitive_miss",
      summary:
        "The pitch describes GovRAMP status; the GovRAMP participant list checked today does not include this company. Ask the vendor which GovRAMP status it holds and under what legal name.",
      evidence_url: GOVRAMP_URL,
      confidence: null,
      retrieved_at: nowIso(ctx),
      data: {
        claimed_but_absent: true,
        rows_scanned: feed.length,
        rejected_investment_vehicles: rejected,
      },
    };
  }
  return {
    check_id,
    source,
    status: "definitive_miss",
    summary:
      "This company does not appear on the GovRAMP participant list. The pitch did not claim GovRAMP status, and many vendors have not engaged with GovRAMP yet, so this is neutral.",
    evidence_url: GOVRAMP_URL,
    confidence: null,
    retrieved_at: nowIso(ctx),
    data: {
      claimed_but_absent: false,
      rows_scanned: feed.length,
      rejected_investment_vehicles: rejected,
    },
  };
}

/* ---------------------------------------------------------------- TX-RAMP */

export async function checkTxRamp(
  {
    companyNames,
    claimed,
    sellingIntoTexas,
  }: { companyNames: string[]; claimed: boolean; sellingIntoTexas: boolean },
  feed: FeedInput<RampFeedRow>,
  ctx: RegistryCtx,
): Promise<RegistryCheck> {
  const check_id = "txramp";
  const source = "TX-RAMP";
  /* TX-RAMP is a Texas program (methodology D3.3: it applies when the vendor
     sells cloud services to Texas state agencies). Run it when the buyer is
     in Texas or the pitch claims TX-RAMP; otherwise it does not apply. */
  if (!claimed && !sellingIntoTexas) {
    return {
      check_id,
      source,
      status: "not_applicable",
      summary:
        "TX-RAMP applies to vendors selling cloud services to Texas state agencies. This evaluation did not indicate a Texas buyer, and the pitch does not claim TX-RAMP, so this check did not apply.",
      evidence_url: TXRAMP_URL,
      confidence: null,
      retrieved_at: nowIso(ctx),
      data: null,
    };
  }
  if (feed === null) {
    return feedNotLoaded(check_id, source, TXRAMP_URL, ctx);
  }
  if (isStaleMarker(feed)) {
    return feedStale(check_id, source, TXRAMP_URL, feed.fetched_at, ctx);
  }
  const names = dedupeNames(companyNames);
  const { matches, rejected } = matchRampRows(feed, names);
  if (matches.length > 0) {
    const best = matches[0];
    const productPart = best.product ? ` for ${best.product}` : "";
    const provisionalNote = /provisional/i.test(best.status)
      ? " Note that provisional status is not the same as certified."
      : "";
    return {
      check_id,
      source,
      status: "hit",
      summary: `The TX-RAMP list includes ${best.provider}${productPart} with status ${best.status}.${provisionalNote}`,
      evidence_url: TXRAMP_URL,
      confidence: best.confidence,
      retrieved_at: nowIso(ctx),
      data: {
        matches,
        claimed,
        rejected_investment_vehicles: rejected,
      },
    };
  }
  if (claimed) {
    return {
      check_id,
      source,
      status: "definitive_miss",
      summary:
        "The pitch describes TX-RAMP certification, and we did not find this company on the current TX-RAMP list. That list can run a few weeks behind, so ask the vendor for its TX-RAMP certification letter or a confirmation from Texas DIR.",
      evidence_url: TXRAMP_URL,
      confidence: null,
      retrieved_at: nowIso(ctx),
      data: {
        claimed_but_absent: true,
        lag_caveat: true,
        rows_scanned: feed.length,
      },
    };
  }
  return {
    check_id,
    source,
    status: "definitive_miss",
    summary:
      "This company does not appear on the current TX-RAMP list. The pitch did not claim TX-RAMP certification, so this is neutral.",
    evidence_url: TXRAMP_URL,
    confidence: null,
    retrieved_at: nowIso(ctx),
    data: {
      claimed_but_absent: false,
      lag_caveat: true,
      rows_scanned: feed.length,
    },
  };
}

/* ------------------------------------------------------------- Sourcewell */

export async function checkSourcewell(
  { companyNames, claimed }: { companyNames: string[]; claimed: boolean },
  feed: FeedInput<SourcewellFeedRow>,
  ctx: RegistryCtx,
): Promise<RegistryCheck> {
  const check_id = "sourcewell";
  const source = "Sourcewell";
  if (feed === null) {
    return feedNotLoaded(check_id, source, SOURCEWELL_URL, ctx);
  }
  if (isStaleMarker(feed)) {
    return feedStale(check_id, source, SOURCEWELL_URL, feed.fetched_at, ctx);
  }
  const names = dedupeNames(companyNames);
  const matches: (SourcewellFeedRow & {
    confidence: "exact" | "name_similarity";
  })[] = [];
  const rejected: string[] = [];
  for (const row of feed) {
    const match = matchCompanyName(row.supplier, names);
    if (match.kind === "vehicle_rejected") {
      rejected.push(row.supplier);
      continue;
    }
    if (match.kind === "match") {
      matches.push({ ...row, confidence: match.confidence });
    }
  }
  if (matches.length > 0) {
    const best =
      matches.find((m) => m.confidence === "exact") ?? matches[0];
    const contractPart = best.contract ? ` (contract ${best.contract})` : "";
    return {
      check_id,
      source,
      status: "hit",
      summary: `Sourcewell lists ${best.supplier} as a cooperative contract holder${contractPart}. A cooperative contract means the company passed a competitive solicitation, which is a positive sign.`,
      evidence_url: SOURCEWELL_URL,
      confidence: best.confidence,
      retrieved_at: nowIso(ctx),
      data: {
        matches,
        claimed,
        rejected_investment_vehicles: rejected,
      },
    };
  }
  if (claimed) {
    return {
      check_id,
      source,
      status: "definitive_miss",
      summary:
        "The pitch describes a Sourcewell cooperative contract; the Sourcewell contract list checked today does not include this company. Ask the vendor for its Sourcewell contract number, and check whether the contract is held by a reseller instead.",
      evidence_url: SOURCEWELL_URL,
      confidence: null,
      retrieved_at: nowIso(ctx),
      data: { claimed_but_absent: true, rows_scanned: feed.length },
    };
  }
  return {
    check_id,
    source,
    status: "definitive_miss",
    summary:
      "This company does not appear on the Sourcewell contract list. The pitch did not claim a Sourcewell contract, so this is neutral.",
    evidence_url: SOURCEWELL_URL,
    confidence: null,
    retrieved_at: nowIso(ctx),
    data: { claimed_but_absent: false, rows_scanned: feed.length },
  };
}
