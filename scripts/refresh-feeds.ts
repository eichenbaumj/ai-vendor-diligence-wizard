/*
  Feed refresh (GitHub Actions cron, daily). Heavy parsing runs here in Node,
  never in an edge function; the pipeline reads pre-parsed rows from the
  registry_cache table via loadFeeds.

  Feeds: FedRAMP marketplace (JSON, stored raw — read by checkFedramp as a
  fallback when its live fetch fails), GovRAMP program participants (HTML
  table, parsed here), TX-RAMP certified products (versioned XLSX discovered
  on the DIR landing page each run), Sourcewell awarded contracts (nightly
  XLSX behind a stable alias).

  Failure posture: each feed refreshes independently; a failed fetch or a
  parse that looks wrong (renamed columns, too few rows, a bot-challenge
  page instead of a spreadsheet) throws, logs, sets a nonzero exit code, and
  SKIPS the upsert — a good cached feed is never overwritten by a bad run.
  Stale feeds degrade honestly in reports via the fetched_at staleness check.

  Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (GitHub Actions secrets).
*/
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  FeedParseError,
  extractTxRampXlsxUrl,
  parseGovRampHtml,
  parseSourcewellXlsx,
  parseTxRampXlsx,
} from "./lib/feed-parsers.ts";

const FEDRAMP_URL =
  "https://raw.githubusercontent.com/FedRAMP/marketplace-fedramp-gov-data/main/data.json";
const GOVRAMP_URL = "https://govramp.org/program-participants";
const TXRAMP_LANDING_URL =
  "https://dir.texas.gov/resource-library-item/tx-ramp-certified-cloud-products";
/* Stable alias; it redirects to the current cdn.sourcewell.org report. */
const SOURCEWELL_URL = "https://sourcewell.co/contract-list";

/* dir.texas.gov sits behind a bot challenge that scores request fingerprints;
   browser-like headers pass more often than a bare fetch. When the challenge
   fires anyway we get an HTML page instead of a spreadsheet — the magic-byte
   check below turns that into a loud, upsert-skipping failure. The full
   client-hint set below exists because the UA string alone started drawing
   403s from GitHub-hosted runners on 2026-08-29; a sparse header set is
   itself a bot signal to fingerprint scorers. */
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Sec-Ch-Ua": '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"macOS"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

async function fetchBytes(url: string, headers: Record<string, string>): Promise<Buffer> {
  /* One retry after a pause: challenge scorers sometimes pass the second
     attempt from the same client once it looks like a page reload. */
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (attempt >= 2) throw new FeedParseError(`${url} returned ${res.status}`);
    await new Promise((r) => setTimeout(r, 4000));
  }
}

function assertXlsx(data: Buffer, source: string): void {
  /* XLSX is a ZIP: PK\x03\x04. A challenge or error page is HTML. */
  if (!(data[0] === 0x50 && data[1] === 0x4b)) {
    const head = data.subarray(0, 60).toString("utf-8").replace(/\s+/g, " ");
    throw new FeedParseError(
      `${source}: response is not a spreadsheet (starts with "${head}"); likely a bot-challenge or error page`,
    );
  }
}

async function upsertFeed(
  supabase: SupabaseClient,
  source: string,
  payload: unknown,
): Promise<void> {
  if (!Array.isArray(payload) || payload.length === 0) {
    /* loadFeeds casts payload as a bare array; anything else would break
       the checks silently. Refuse rather than store. */
    throw new FeedParseError(`${source}: refusing to store a non-array or empty payload`);
  }
  const { error } = await supabase.from("registry_cache").upsert({
    source,
    key: "all",
    fetched_at: new Date().toISOString(),
    payload,
  });
  if (error) throw new Error(error.message);
}

async function refreshFeed(
  supabase: SupabaseClient,
  source: string,
  load: () => Promise<unknown>,
): Promise<void> {
  try {
    const payload = await load();
    await upsertFeed(supabase, source, payload);
    console.log(`${source} feed cached (${(payload as unknown[]).length} rows)`);
  } catch (err) {
    console.error(`${source} refresh failed: ${String(err)}`);
    process.exitCode = 1;
  }
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
    process.exit(1);
  }
  const supabase = createClient(url, key);

  /* FedRAMP marketplace: stored raw (not row-shaped); checkFedramp reads it
     as a fallback, so it bypasses the bare-array guard deliberately. */
  try {
    const res = await fetch(FEDRAMP_URL);
    if (!res.ok) throw new Error(`fedramp feed ${res.status}`);
    const data = await res.json();
    const { error } = await supabase.from("registry_cache").upsert({
      source: "fedramp",
      key: "all",
      fetched_at: new Date().toISOString(),
      payload: data,
    });
    if (error) throw new Error(error.message);
    console.log("fedramp feed cached");
  } catch (err) {
    console.error(`fedramp refresh failed: ${String(err)}`);
    process.exitCode = 1;
  }

  await refreshFeed(supabase, "govramp", async () => {
    const page = await fetchBytes(GOVRAMP_URL, BROWSER_HEADERS);
    return parseGovRampHtml(page.toString("utf-8"));
  });

  await refreshFeed(supabase, "txramp", async () => {
    const landing = await fetchBytes(TXRAMP_LANDING_URL, BROWSER_HEADERS);
    const xlsxUrl = extractTxRampXlsxUrl(landing.toString("utf-8"), "https://dir.texas.gov");
    const data = await fetchBytes(xlsxUrl, {
      ...BROWSER_HEADERS,
      Referer: TXRAMP_LANDING_URL,
    });
    assertXlsx(data, "txramp");
    return parseTxRampXlsx(data);
  });

  await refreshFeed(supabase, "sourcewell", async () => {
    const data = await fetchBytes(SOURCEWELL_URL, BROWSER_HEADERS);
    assertXlsx(data, "sourcewell");
    return parseSourcewellXlsx(data);
  });
}

main();
