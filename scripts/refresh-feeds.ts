/*
  Feed refresh (GitHub Actions cron, daily). Heavy parsing runs here in Node,
  never in an edge function; the pipeline reads pre-parsed rows from the
  registry_cache table.

  v0 implements the FedRAMP marketplace feed (plain JSON). The GovRAMP,
  TX-RAMP, and Sourcewell lists ship as XLSX downloads and land in v1; until
  a feed is loaded, the corresponding checks report "could not check" (never
  adverse) and the honesty panel says so.

  Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (GitHub Actions secrets).
*/
import { createClient } from "@supabase/supabase-js";

const FEDRAMP_URL =
  "https://raw.githubusercontent.com/FedRAMP/marketplace-fedramp-gov-data/main/data.json";

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
    process.exit(1);
  }
  const supabase = createClient(url, key);

  /* FedRAMP marketplace. */
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

  /* TODO v1: GovRAMP program participants (XLSX export at govramp.org),
     TX-RAMP certified products (dir.texas.gov XLSX), Sourcewell contract
     search export. Parse with a spreadsheet library HERE and upsert rows
     shaped as the feeds.ts contract expects:
     govramp/txramp: { provider, product?, status }[]
     sourcewell:     { supplier, contract? }[] */
}

main();
