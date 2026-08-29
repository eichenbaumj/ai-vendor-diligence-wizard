/*
  FedRAMP Marketplace check (methodology.md check 3.1).

  Contradiction, not absence, is the signal:
  - Pitch claims FedRAMP + company absent from the authoritative feed =
    registry contradiction (a deterministic Tier-1 trigger input).
  - No claim + absent = neutral; most state/local vendors are not FedRAMP
    authorized and never need to be.

  Source: the FedRAMP marketplace data feed published by FedRAMP on GitHub
  (raw.githubusercontent.com/FedRAMP/marketplace-fedramp-gov-data). The file
  is large and its shape has changed over time, so parsing is defensive: we
  walk the known container keys and read several possible field names.

  Pure module: no Deno APIs, no module state.
*/
import type { RegistryCheck } from "../schemas.ts";
import {
  asArray,
  asRecord,
  dedupeNames,
  errorCheck,
  firstString,
  getJson,
  matchCompanyName,
  nowIso,
} from "./sam.ts";
import type { RegistryCtx } from "./sam.ts";
import { isFeedStale } from "./feeds.ts";

const FEED_URL =
  "https://raw.githubusercontent.com/FedRAMP/marketplace-fedramp-gov-data/main/data.json";
const HUMAN_MARKETPLACE = "https://marketplace.fedramp.gov/";

interface FeedEntry {
  provider: string;
  product: string | null;
  status: string | null;
}

/* Pull provider/product/status rows out of whatever shape the feed uses. */
function collectFeedEntries(payload: unknown): FeedEntry[] {
  const out: FeedEntry[] = [];
  const roots: unknown[] = [payload];
  const rootRec = asRecord(payload);
  if (rootRec) {
    roots.push(rootRec["data"], rootRec["Data"]);
  }
  for (const root of roots) {
    const rec = asRecord(root);
    if (!rec) {
      for (const item of asArray(root)) pushEntry(out, item);
      continue;
    }
    for (const [key, value] of Object.entries(rec)) {
      if (!/product|provider|offering|listing/i.test(key)) continue;
      for (const item of asArray(value)) pushEntry(out, item);
    }
  }
  return out;
}

function pushEntry(out: FeedEntry[], item: unknown): void {
  const rec = asRecord(item);
  if (!rec) return;
  const provider = firstString(rec, [
    "provider",
    "Provider",
    "csp",
    "CSP",
    "cloud_service_provider",
    "csp_name",
    "company",
    "name",
    "Name",
  ]);
  if (!provider) return;
  out.push({
    provider,
    product: firstString(rec, [
      "cso",
      "CSO",
      "product",
      "Product",
      "cso_name",
      "product_name",
      "service_name",
      "Name_of_Offering",
    ]),
    status: firstString(rec, [
      "designation",
      "Designation",
      "status",
      "Status",
      "authorization_status",
      "fedramp_status",
    ]),
  });
}

export async function checkFedramp(
  {
    companyNames,
    claimedFedramp,
    cachedFeed,
  }: {
    companyNames: string[];
    claimedFedramp: boolean;
    /* Lazily fetched registry_cache row (the daily cron stores the raw feed).
       Used only when the live fetch fails: datacenter egress fetches of the
       feed host can be blocked or flaky, and a fresh cached copy beats an
       error check for a tier-1-capable lane. */
    cachedFeed?: () => Promise<{ payload: unknown; fetched_at: string } | null>;
  },
  ctx: RegistryCtx,
): Promise<RegistryCheck> {
  const check_id = "fedramp_marketplace";
  const source = "FedRAMP Marketplace";
  const names = dedupeNames(companyNames);
  const report = (payload: unknown): RegistryCheck => {
    const entries = collectFeedEntries(payload);
    const matches: (FeedEntry & { confidence: "exact" | "name_similarity" })[] =
      [];
    for (const entry of entries) {
      const match = matchCompanyName(entry.provider, names);
      if (match.kind === "match") {
        matches.push({ ...entry, confidence: match.confidence });
      }
    }
    if (matches.length > 0) {
      const best =
        matches.find((m) => m.confidence === "exact") ?? matches[0];
      const productPart = best.product ? ` for ${best.product}` : "";
      const statusPart = best.status ? ` with status ${best.status}` : "";
      return {
        check_id,
        source,
        status: "hit",
        summary: `The FedRAMP Marketplace feed lists ${best.provider}${productPart}${statusPart}. Confirm at the link that the listed product is the one being pitched to you.`,
        evidence_url: HUMAN_MARKETPLACE,
        confidence: best.confidence,
        retrieved_at: nowIso(ctx),
        data: {
          matches: matches.map((m) => ({
            provider: m.provider,
            product: m.product,
            status: m.status,
            confidence: m.confidence,
          })),
          claimed_fedramp: claimedFedramp,
        },
      };
    }
    if (claimedFedramp) {
      return {
        check_id,
        source,
        status: "definitive_miss",
        summary:
          "The pitch describes FedRAMP authorization; the FedRAMP Marketplace feed checked today does not list this company. Ask the vendor for its FedRAMP package ID.",
        evidence_url: HUMAN_MARKETPLACE,
        confidence: null,
        retrieved_at: nowIso(ctx),
        data: { claimed_but_absent: true, entries_scanned: entries.length },
      };
    }
    return {
      check_id,
      source,
      status: "definitive_miss",
      summary:
        "This company does not appear in the FedRAMP Marketplace feed. The pitch did not claim FedRAMP status, and most state and local vendors are not FedRAMP authorized, so this is neutral.",
      evidence_url: HUMAN_MARKETPLACE,
      confidence: null,
      retrieved_at: nowIso(ctx),
      data: { claimed_but_absent: false, entries_scanned: entries.length },
    };
  };

  if (names.length === 0) {
    return {
      check_id,
      source,
      status: "not_applicable",
      summary:
        "No company name was available to check against the FedRAMP Marketplace.",
      evidence_url: HUMAN_MARKETPLACE,
      confidence: null,
      retrieved_at: nowIso(ctx),
      data: null,
    };
  }
  try {
    const payload = await getJson(FEED_URL, ctx);
    return report(payload);
  } catch {
    if (cachedFeed) {
      try {
        const row = await cachedFeed();
        if (row && !isFeedStale(row.fetched_at, nowIso(ctx))) {
          const fromCache = report(row.payload);
          return {
            ...fromCache,
            summary: `${fromCache.summary} This result used our saved copy of the feed, refreshed ${row.fetched_at.slice(0, 10)}.`,
          };
        }
      } catch {
        /* fall through to the error check */
      }
    }
    return errorCheck(check_id, source, HUMAN_MARKETPLACE, ctx);
  }
}
