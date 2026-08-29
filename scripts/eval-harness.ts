/*
  Cook-time evaluation harness: drives the live evaluate function at
  multiple research power levels over a fixed vendor panel and emits a
  markdown comparison table. The differential between levels (and between
  standard and deep mode) is the signal: which verifications only appear
  with more searching, and what each increment costs.

  Local Node script; requires supabase/.env.local to hold
  EVAL_BYPASS_TOKEN (set as a function secret only during eval windows)
  and SUPABASE_ACCESS_TOKEN (to read usage jsonb for metrics).

  Usage:
    set -a && source supabase/.env.local && set +a
    npx tsx scripts/eval-harness.ts --out /tmp/harness.md [--levels L1,DEEP]

  Every run is deliberate spend: the bypass skips Turnstile, the gate, the
  per-IP cap, and the result caches. Delete panel rows afterwards (they
  are publicly fetchable by UUID):
    scripts/eval-harness.ts prints the cleanup SQL at the end.
*/
import { writeFileSync } from "node:fs";
import {
  createEvalClient,
  estimateCost,
  fixture,
} from "./lib/eval-client.ts";

const EVAL_TOKEN = process.env.EVAL_BYPASS_TOKEN ?? "";
const MGMT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
if (!EVAL_TOKEN || !MGMT_TOKEN) {
  console.error("source supabase/.env.local first (EVAL_BYPASS_TOKEN, SUPABASE_ACCESS_TOKEN)");
  process.exit(1);
}

const client = createEvalClient({ evalToken: EVAL_TOKEN, mgmtToken: MGMT_TOKEN });

const OPENGOV_PITCH = `Subject: Modern budgeting and permitting software for your agency

Hi,

I'm reaching out from OpenGov (opengov.com), the leader in modern cloud software for cities, counties, and state agencies. More than 1,600 governments use OpenGov for budgeting and planning, permitting and licensing, procurement, and asset management.

OpenGov was founded by CEO Zac Bookman together with co-founder Nate Levine and chairman Joe Lonsdale, and has spent more than a decade building software exclusively for the public sector. Our budgeting suite helps finance teams collaborate on operating and capital budgets, and our permitting and licensing platform moves applications online end to end.

Would you be open to a 20-minute conversation next week about your budget process?

Best regards,
Business Development, OpenGov`;

const POLIMORPHIC_PITCH = `Subject: AI-powered resident services for your city

Hi,

I'm reaching out from Polimorphic (polimorphic.com), the complete AI platform for local government service delivery.

From intake to resolution, our platform helps you manage the complicated demands of government services with one connected platform. Our AI Chatbot and Search answers resident questions instantly, anytime, anywhere, in more than 75 languages. With our Voice Agent, callers get reliable answers, start services, or reach the right staff using your most essential support channel. Workflows help residents apply, submit, and get status updates anytime for any type of permit or license.

More than 50 municipalities are already on the platform, including Littleton, CO, where the city is cutting calls by 50%; Suisun City, CA, which reclaimed 40 hours a month; and Newport, RI, which runs a 24/7 voice line. Other customers include Orange County, FL, Sarasota County, FL, Clackamas County, OR, and Passaic County, NJ.

Polimorphic was named to the 2026 AI 50 List by the Center for Public Sector AI for the second year in a row. We are a GovTech 100 company and a GovAI Coalition member. We recently raised an $18.6M Series A led by General Catalyst. Each client gets a dedicated Customer Success Manager in their state or region.

Would you be open to a 20-minute demo next week?

Best regards,
Business Development, Polimorphic`;

interface PanelItem {
  label: string;
  input_kind: "paste" | "name";
  content: string;
}
const PANEL: PanelItem[] = [
  { label: "govra-name", input_kind: "name", content: "TrueTax by Govra" },
  { label: "polco-name", input_kind: "name", content: "Polco" },
  { label: "opengov-paste", input_kind: "paste", content: OPENGOV_PITCH },
  { label: "polimorphic-paste", input_kind: "paste", content: POLIMORPHIC_PITCH },
  { label: "control-fictional", input_kind: "paste", content: fixture("clean-established.txt") },
];

interface Level {
  name: string;
  body: Record<string, unknown>;
}
const ALL_LEVELS: Level[] = [
  { name: "L1-standard", body: { power: { searches: 12, fetches: 6 } } },
  { name: "L2-extended", body: { power: { searches: 20, fetches: 8 } } },
  { name: "L3-boosted", body: { power: { searches: 32, fetches: 12 } } },
  { name: "DEEP", body: { deep: true } },
];

const levelArg = process.argv.find((a) => a.startsWith("--levels"));
const levelNames = levelArg
  ? (levelArg.split("=")[1] ?? process.argv[process.argv.indexOf(levelArg) + 1]).split(",")
  : ALL_LEVELS.map((l) => l.name);
const LEVELS = ALL_LEVELS.filter((l) => levelNames.some((n) => l.name.startsWith(n)));

const outArg = process.argv.indexOf("--out");
const OUT = outArg >= 0 ? process.argv[outArg + 1] : "harness-results.md";

interface RunMetrics {
  id: string;
  status: string;
  tier: string | null;
  checks_met: string | null;
  verified_rows: number;
  d5_verified: number;
  green_flags: number;
  leads: number;
  partial: string | null;
  searches: number;
  cost_estimate: string;
  elapsed_s: number;
  stages_ms: Record<string, number>;
}

async function waitAndMeasure(id: string, startedAt: number): Promise<RunMetrics> {
  await client.waitForTerminal(id);
  /* Bespoke to this harness: the comparison table's metrics in one query. */
  const rows = await client.sql(`
    select status,
           report->'verdict'->>'tier' as tier,
           (report->'verdict'->'checks_met'->>'met') || '/' || (report->'verdict'->'checks_met'->>'total') as checks_met,
           (select count(*) from jsonb_array_elements(report->'ledger') r where r->>'result' = 'VERIFIED') as verified_rows,
           (select count(*) from jsonb_array_elements(report->'ledger') r where r->>'methodology_ref' = 'd5-1' and r->>'result' = 'VERIFIED') as d5_verified,
           jsonb_array_length(coalesce(report->'green_flags','[]'::jsonb)) as green_flags,
           jsonb_array_length(coalesce(report->'leads','[]'::jsonb)) as leads,
           report->'meta'->>'research_partial' as partial,
           coalesce((usage->'total'->>'web_search_requests')::int, 0) as searches,
           usage->'total' as total_usage,
           usage->'stages_ms' as stages_ms
      from evaluations where id = '${id}'`);
  const r = rows[0] ?? {};
  const total = (r.total_usage ?? {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    web_search_requests: 0,
  }) as Parameters<typeof estimateCost>[0];
  return {
    id,
    status: String(r.status ?? "unknown"),
    tier: (r.tier as string) ?? null,
    checks_met: (r.checks_met as string) ?? null,
    verified_rows: Number(r.verified_rows ?? 0),
    d5_verified: Number(r.d5_verified ?? 0),
    green_flags: Number(r.green_flags ?? 0),
    leads: Number(r.leads ?? 0),
    partial: (r.partial as string) ?? null,
    searches: Number(r.searches ?? 0),
    cost_estimate: estimateCost(total),
    elapsed_s: Math.round((Date.now() - startedAt) / 1000),
    stages_ms: (r.stages_ms ?? {}) as Record<string, number>,
  };
}

async function main() {
  const results: { panel: string; level: string; m: RunMetrics }[] = [];
  const CONCURRENCY = 3;
  for (const level of LEVELS) {
    console.log(`\n=== Level ${level.name} ===`);
    for (let i = 0; i < PANEL.length; i += CONCURRENCY) {
      const chunk = PANEL.slice(i, i + CONCURRENCY);
      const settled = await Promise.allSettled(
        chunk.map(async (item) => {
          const t0 = Date.now();
          const id = await client.submit(
            { input_kind: item.input_kind, content: item.content },
            level.body,
          );
          console.log(`  ${item.label}: ${id}`);
          const m = await waitAndMeasure(id, t0);
          return { panel: item.label, level: level.name, m };
        }),
      );
      for (const s of settled) {
        if (s.status === "fulfilled") results.push(s.value);
        else console.error("  run failed:", s.reason);
      }
    }
  }

  const lines: string[] = [
    "# Cook-time evaluation results",
    "",
    `Generated ${new Date().toISOString()}. Cost figures are ESTIMATES from token counts at Sonnet-5 rates; search fees are exact.`,
    "",
    "| Panel | Level | Status | Tier | Checks met | Verified rows | D5 verified | Greens | Leads | Partial | Searches | Est. cost | Wall (s) |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
  ];
  for (const r of results) {
    lines.push(
      `| ${r.panel} | ${r.level} | ${r.m.status} | ${r.m.tier ?? "-"} | ${r.m.checks_met ?? "-"} | ${r.m.verified_rows} | ${r.m.d5_verified} | ${r.m.green_flags} | ${r.m.leads} | ${r.m.partial ?? "-"} | ${r.m.searches} | ${r.m.cost_estimate} | ${r.m.elapsed_s} |`,
    );
  }
  lines.push("", "## Run ids (for cleanup)", "");
  for (const r of results) lines.push(`- ${r.panel} ${r.level}: ${r.m.id}`);
  lines.push(
    "",
    "Cleanup SQL (panel rows are publicly fetchable by UUID):",
    "```sql",
    `delete from evaluations where id in (${results.map((r) => `'${r.m.id}'`).join(", ")});`,
    "```",
  );
  writeFileSync(OUT, lines.join("\n"));
  console.log(`\nwrote ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
