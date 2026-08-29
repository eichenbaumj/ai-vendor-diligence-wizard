/*
  qa-harness.ts — panel-driven QA runner for the live evaluate function.

  Loads QA panel files (repo tests/qa/panel/*.panel.json plus, when set,
  $QA_PANEL_DIR/panel/*.panel.json and any --panel-dir), expands entries
  x inputs x levels into cells, drives each cell through the live
  pipeline via scripts/lib/eval-client.ts, then runs the pure assertion
  and drift engines over the stored reports.

  Every live cell is deliberate spend (the bypass skips Turnstile, the
  gate, the per-IP cap, and the result caches), and rows are publicly
  fetchable by UUID until deleted — cleanup is ON by default and the
  cleanup SQL is always printed in report.md.

  Usage:
    npx tsx scripts/qa-harness.ts --dry-run                  # manifest + estimate, no tokens needed
    set -a && source supabase/.env.local && set +a
    npx tsx scripts/qa-harness.ts --budget-max 20 [--yes]
  Flags: --category a,b  --vendor id1,id2  --levels L1,DEEP  --deep-only
         --dry-run  --yes  --strict  --budget-max <dollars>  --out <dir>
         --panel-dir <dir> (repeatable)  --baseline <path>
         --promote-baseline  --no-cleanup

  Exit codes: 0 green (soft failures and drift allowed unless --strict);
  1 any hard assertion failure, or soft failure / drift under --strict;
  2 preflight failure or any infra cell (pipeline_error / watchdog /
  harness_timeout / failed submit) — hard failures take precedence over
  infra since they are the more actionable signal.
*/
import { execSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import type { Report } from "../supabase/functions/_shared/schemas.ts";
import {
  createEvalClient,
  estimateCost,
  fixture,
  pdfFixtureBase64,
  type EvalClient,
  type TerminalResult,
} from "./lib/eval-client.ts";
import {
  LEVEL_BODIES,
  LevelName,
  PanelFile,
  panelProblems,
  type PanelEntry,
  type PanelInput,
} from "./lib/qa-panel-schema.ts";
import {
  WATCHDOG_ERROR,
  type AssertionResult,
  type LedgerMapEntry,
  type QaCell,
  type QaMetrics,
  type QaRunFile,
  type TerminalSource,
  type UsageTotals,
} from "./lib/qa-types.ts";
import {
  evaluateExpectations,
  evaluateMonotonicPairs,
} from "./lib/qa-assertions.ts";
import { computeDrift, renderDriftMarkdown } from "./lib/qa-drift.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_PANEL_DIR = join(ROOT, "tests", "qa", "panel");

/* Preflight estimate rates; live costs come from usage totals afterwards. */
const STANDARD_CELL_USD = 0.55;
const DEEP_CELL_USD = 1.8;
const CONCURRENCY = 3;
const CELL_DEADLINE_MS = 13 * 60_000;
const MAX_RETRIES = 3;

/* -------------------------------------------------------------- CLI args */

interface Args {
  category: string[] | null;
  vendor: string[] | null;
  levels: Set<LevelName> | null;
  dryRun: boolean;
  yes: boolean;
  strict: boolean;
  noCleanup: boolean;
  promoteBaseline: boolean;
  budgetMax: number | null;
  out: string | null;
  baseline: string | null;
  panelDirs: string[];
}

function fail(msg: string): never {
  console.error(`qa-harness: ${msg}`);
  process.exit(2);
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    category: null,
    vendor: null,
    levels: null,
    dryRun: false,
    yes: false,
    strict: false,
    noCleanup: false,
    promoteBaseline: false,
    budgetMax: null,
    out: null,
    baseline: null,
    panelDirs: [],
  };
  const take = (i: number, flag: string, inline: string | undefined): [string, number] => {
    if (inline !== undefined) return [inline, i];
    const v = argv[i + 1];
    if (v === undefined || v.startsWith("--")) fail(`${flag} needs a value`);
    return [v, i + 1];
  };
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i];
    const eq = raw.indexOf("=");
    const flag = eq >= 0 ? raw.slice(0, eq) : raw;
    const inline = eq >= 0 ? raw.slice(eq + 1) : undefined;
    let v: string;
    switch (flag) {
      case "--category":
        [v, i] = take(i, flag, inline);
        args.category = v.split(",").map((s) => s.trim()).filter(Boolean);
        break;
      case "--vendor":
        [v, i] = take(i, flag, inline);
        args.vendor = v.split(",").map((s) => s.trim()).filter(Boolean);
        break;
      case "--levels": {
        [v, i] = take(i, flag, inline);
        const names = v.split(",").map((s) => s.trim()).filter(Boolean);
        const set = new Set<LevelName>();
        for (const n of names) {
          const parsed = LevelName.safeParse(n);
          if (!parsed.success) fail(`unknown level "${n}" (valid: ${LevelName.options.join(", ")})`);
          set.add(parsed.data);
        }
        args.levels = set;
        break;
      }
      case "--deep-only":
        args.levels = new Set<LevelName>(["DEEP"]);
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      case "--yes":
        args.yes = true;
        break;
      case "--strict":
        args.strict = true;
        break;
      case "--no-cleanup":
        args.noCleanup = true;
        break;
      case "--promote-baseline":
        args.promoteBaseline = true;
        break;
      case "--budget-max": {
        [v, i] = take(i, flag, inline);
        const n = Number(v);
        if (!Number.isFinite(n) || n <= 0) fail(`--budget-max needs a positive dollar amount`);
        args.budgetMax = n;
        break;
      }
      case "--out":
        [v, i] = take(i, flag, inline);
        args.out = v;
        break;
      case "--baseline":
        [v, i] = take(i, flag, inline);
        args.baseline = v;
        break;
      case "--panel-dir":
        [v, i] = take(i, flag, inline);
        args.panelDirs.push(v);
        break;
      default:
        fail(`unknown flag: ${raw}`);
    }
  }
  return args;
}

/* ---------------------------------------------------------- panel loading */

interface LoadedPanel {
  display: string;
  isPublicFile: boolean;
  file: PanelFile;
  /* Public fixture paths resolve repo-relative; private ones against the
     panel dir (the parent of panel/), matching validate-qa-panel.ts. */
  fixtureBase: string;
}

interface EntryCtx {
  entry: PanelEntry;
  fixtureBase: string;
  autoIncluded: boolean;
}

function display(path: string): string {
  const rel = relative(ROOT, path);
  return rel.startsWith("..") || isAbsolute(rel) ? path : rel;
}

function insideRepo(path: string): boolean {
  const rel = relative(ROOT, path);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

function listPanelFiles(dir: string): string[] {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".panel.json"))
    .sort()
    .map((f) => join(dir, f));
}

/* Same validation chain as scripts/validate-qa-panel.ts (whose logic is a
   CLI, not an export): JSON -> PanelFile shape -> panelProblems -> fixture
   existence. Any problem aborts the run before spend. */
function loadPanels(extraDirs: string[]): LoadedPanel[] {
  const targets: { path: string; isPublicFile: boolean }[] = listPanelFiles(
    PUBLIC_PANEL_DIR,
  ).map((path) => ({ path, isPublicFile: true }));
  const dirs = [...extraDirs];
  if (process.env.QA_PANEL_DIR) dirs.unshift(process.env.QA_PANEL_DIR);
  const seen = new Set(targets.map((t) => t.path));
  for (const dir of dirs) {
    for (const path of listPanelFiles(join(resolve(dir), "panel"))) {
      if (seen.has(path)) continue;
      seen.add(path);
      targets.push({ path, isPublicFile: insideRepo(path) });
    }
  }
  if (targets.length === 0) fail(`no *.panel.json files found in ${PUBLIC_PANEL_DIR}`);

  const errors: string[] = [];
  const panels: LoadedPanel[] = [];
  for (const target of targets) {
    const name = display(target.path);
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(target.path, "utf8"));
    } catch (err) {
      errors.push(`${name}: ${(err as Error).message}`);
      continue;
    }
    const parsed = PanelFile.safeParse(data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(`${name}: ${issue.path.join(".") || "(root)"}: ${issue.message}`);
      }
      continue;
    }
    for (const problem of panelProblems(parsed.data, { isPublicFile: target.isPublicFile })) {
      errors.push(`${name}: ${problem}`);
    }
    const fixtureBase = target.isPublicFile ? ROOT : dirname(dirname(target.path));
    for (const entry of parsed.data.entries) {
      for (const input of entry.inputs) {
        if (input.fixture && !existsSync(resolve(fixtureBase, input.fixture))) {
          errors.push(`${name}: ${entry.id}: fixture not found: ${input.fixture}`);
        }
      }
    }
    panels.push({ display: name, isPublicFile: target.isPublicFile, file: parsed.data, fixtureBase });
  }
  if (errors.length > 0) {
    console.error(`qa-harness: ${errors.length} panel problem(s):`);
    for (const e of errors) console.error(`  FAIL  ${e}`);
    process.exit(2);
  }
  return panels;
}

/* --------------------------------------------------------- cell planning */

interface PlannedCell {
  ctx: EntryCtx;
  input: PanelInput;
  level: LevelName;
  rateUsd: number;
}

function cellLabel(pc: PlannedCell): string {
  return `${pc.ctx.entry.id} ${pc.input.input_kind} ${pc.level}`;
}

function selectEntries(panels: LoadedPanel[], args: Args): Map<string, EntryCtx> {
  const all = new Map<string, EntryCtx>();
  for (const panel of panels) {
    for (const entry of panel.file.entries) {
      /* monotonic_pair resolves per-file; a cross-file id collision would
         silently mix panels, so it is a preflight error. */
      if (all.has(entry.id)) fail(`entry id "${entry.id}" appears in more than one panel file`);
      all.set(entry.id, { entry, fixtureBase: panel.fixtureBase, autoIncluded: false });
    }
  }

  const selected = new Map<string, EntryCtx>();
  for (const [id, ctx] of all) {
    if (args.category && !args.category.includes(ctx.entry.category)) continue;
    if (args.vendor && !args.vendor.includes(id)) continue;
    selected.set(id, ctx);
  }

  /* Monotonicity needs the clean twin in the run even when a filter only
     names the injected entry; twins bypass category/vendor filters. */
  let grew = true;
  while (grew) {
    grew = false;
    for (const ctx of [...selected.values()]) {
      const twin = ctx.entry.expected.monotonic_pair;
      if (twin && !selected.has(twin)) {
        const twinCtx = all.get(twin);
        if (twinCtx) {
          selected.set(twin, { ...twinCtx, autoIncluded: true });
          grew = true;
        }
      }
    }
  }
  return selected;
}

function planCells(entries: Map<string, EntryCtx>, args: Args): PlannedCell[] {
  const planned: PlannedCell[] = [];
  for (const ctx of entries.values()) {
    for (const input of ctx.entry.inputs) {
      for (const level of input.levels) {
        if (args.levels && !args.levels.has(level)) continue;
        planned.push({
          ctx,
          input,
          level,
          rateUsd: level === "DEEP" ? DEEP_CELL_USD : STANDARD_CELL_USD,
        });
      }
    }
  }
  return planned;
}

function usd(n: number): string {
  return `$${n.toFixed(2)}`;
}

function printManifest(planned: PlannedCell[]): number {
  const total = planned.reduce((s, pc) => s + pc.rateUsd, 0);
  const entryCount = new Set(planned.map((pc) => pc.ctx.entry.id)).size;
  console.log(`QA manifest: ${planned.length} cell(s) across ${entryCount} entr${entryCount === 1 ? "y" : "ies"}`);
  for (const pc of planned) {
    const tags: string[] = [pc.ctx.entry.category];
    if (pc.ctx.autoIncluded) tags.push("auto-included twin");
    console.log(
      `  ${pc.ctx.entry.id.padEnd(36)} ${pc.input.input_kind.padEnd(5)} ${pc.level.padEnd(4)} ${usd(pc.rateUsd).padStart(6)}  (${tags.join(", ")})`,
    );
  }
  console.log(
    `Estimated cost: ${usd(total)} (${usd(STANDARD_CELL_USD)}/standard cell, ${usd(DEEP_CELL_USD)}/DEEP cell)`,
  );
  return total;
}

/* ------------------------------------------------------------- execution */

function classify(t: TerminalResult): TerminalSource {
  if (t.status === "complete") return "complete";
  if (t.status === "insufficient") return "insufficient";
  if (t.status === "error") {
    return t.error === WATCHDOG_ERROR ? "watchdog" : "pipeline_error";
  }
  return "harness_timeout";
}

function isAssertable(source: TerminalSource): boolean {
  return source === "complete" || source === "insufficient";
}

function usageTotals(raw: unknown): UsageTotals {
  const r = (raw ?? {}) as Partial<UsageTotals>;
  return {
    input_tokens: r.input_tokens ?? 0,
    output_tokens: r.output_tokens ?? 0,
    cache_creation_input_tokens: r.cache_creation_input_tokens ?? 0,
    cache_read_input_tokens: r.cache_read_input_tokens ?? 0,
    web_search_requests: r.web_search_requests ?? 0,
  };
}

function costNumber(total: UsageTotals): number {
  return Number(estimateCost(total).slice(1));
}

interface UsageBlob {
  total?: unknown;
  stages_ms?: Record<string, number>;
  deep?: unknown;
  deep_handoff_failed?: unknown;
}

function buildMetrics(report: Report | null, usage: UsageBlob | null): QaMetrics {
  const total = usageTotals(usage?.total);
  const ledger = report?.ledger ?? [];
  return {
    tier: report ? report.verdict.tier : null,
    checks_met: report ? report.verdict.checks_met : null,
    verified_rows: ledger.filter((r) => r.result === "VERIFIED").length,
    green_flags: report?.green_flags.length ?? 0,
    leads: report?.leads?.length ?? 0,
    research_partial: report ? report.meta.research_partial : null,
    searches: total.web_search_requests,
    est_cost_usd: costNumber(total),
    deep: usage?.deep === true,
    deep_handoff_failed: usage?.deep_handoff_failed === true,
    adv_codes: [...new Set((report?.adv_findings ?? []).map((f) => f.code))],
    pack_ids: report?.sector.pack_ids ?? [],
    question_ids: (report?.questions ?? []).map((q) => q.id),
    stages_ms: usage?.stages_ms ?? {},
  };
}

function buildLedgerMap(report: Report | null): Record<string, LedgerMapEntry> {
  const map: Record<string, LedgerMapEntry> = {};
  for (const row of report?.ledger ?? []) {
    map[row.id] = {
      result: row.result,
      evidence_tier: row.evidence_tier,
      severity: row.severity,
      methodology_ref: row.methodology_ref,
    };
  }
  return map;
}

function submitContent(pc: PlannedCell): { content: string; filename?: string } {
  if (pc.input.content) return { content: pc.input.content };
  const path = pc.input.fixture as string;
  if (pc.input.input_kind === "pdf") {
    /* PDF contract: raw bytes as plain base64, no data-URI prefix. */
    return { content: pdfFixtureBase64(path, pc.ctx.fixtureBase), filename: basename(path) };
  }
  return { content: fixture(path, pc.ctx.fixtureBase) };
}

interface RunOutcome {
  cell: QaCell;
  costUsd: number;
}

async function runCell(client: EvalClient, pc: PlannedCell, ids: string[]): Promise<RunOutcome> {
  const t0 = Date.now();
  const { content, filename } = submitContent(pc);
  const id = await client.submit(
    { input_kind: pc.input.input_kind, content, state: pc.input.state, filename },
    LEVEL_BODIES[pc.level],
  );
  ids.push(id);
  console.log(`  ${cellLabel(pc)}: ${id}`);
  const terminal = await client.waitForTerminal(id, { deadlineMs: CELL_DEADLINE_MS });
  const source = classify(terminal);

  const rows = await client.sql(
    `select status, error, report, usage from evaluations where id = '${id}'`,
  );
  const row = rows[0] ?? {};
  const report = (row.report ?? null) as Report | null;
  const usage = (row.usage ?? null) as UsageBlob | null;
  const metrics = buildMetrics(report, usage);
  return {
    cell: {
      entry_id: pc.ctx.entry.id,
      input_kind: pc.input.input_kind,
      level: pc.level,
      evaluation_id: id,
      terminal_source: source,
      error: row.error == null ? null : String(row.error),
      wall_s: Math.round((Date.now() - t0) / 1000),
      metrics,
      ledger_map: buildLedgerMap(report),
      assertions: [],
      report_snapshot: report,
      retried: false,
    },
    costUsd: metrics.est_cost_usd,
  };
}

/* "Pass = either run passes per assertion": a failing original assertion
   is replaced by the retry's passing counterpart; codes the retry fails
   that the original passed do not count; both-fail stands as the original. */
function mergeAssertions(
  original: AssertionResult[],
  retry: AssertionResult[],
): AssertionResult[] {
  const retryByCode = new Map(retry.map((a) => [a.code, a]));
  return original.map((a) => {
    if (a.pass) return a;
    const r = retryByCode.get(a.code);
    if (!r || !r.pass) return a;
    const note = "passed on retry";
    return { ...r, detail: r.detail ? `${r.detail}; ${note}` : note };
  });
}

/* --------------------------------------------------------------- reporting */

function failureLine(cell: QaCell, a: AssertionResult): string {
  const where = `${cell.entry_id} ${cell.input_kind} ${cell.level}`;
  const detail = a.detail ? ` (${a.detail})` : "";
  return `- ${where} — ${a.code}: expected ${a.expected}, actual ${a.actual}${detail}`;
}

function metricsTable(cells: QaCell[]): string[] {
  const lines = [
    "| Entry | Input | Level | Source | Tier | Checks met | Verified rows | Greens | Leads | Partial | Searches | Est. cost | Wall (s) | Retried |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
  ];
  for (const c of cells) {
    const m = c.metrics;
    const checks = m.checks_met ? `${m.checks_met.met}/${m.checks_met.total}` : "-";
    lines.push(
      `| ${c.entry_id} | ${c.input_kind} | ${c.level} | ${c.terminal_source} | ${m.tier ?? "-"} | ${checks} | ${m.verified_rows} | ${m.green_flags} | ${m.leads} | ${m.research_partial ?? "-"} | ${m.searches} | ${usd(m.est_cost_usd)} | ${c.wall_s} | ${c.retried ? "yes" : ""} |`,
    );
  }
  return lines;
}

/* ------------------------------------------------------------------ main */

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const panels = loadPanels(args.panelDirs);
  const entries = selectEntries(panels, args);
  const planned = planCells(entries, args);
  if (planned.length === 0) fail("no cells match the given filters");

  const estimateUsd = printManifest(planned);
  if (args.dryRun) return;

  /* ---- preflight (live runs only) ---- */
  const evalToken = process.env.EVAL_BYPASS_TOKEN ?? "";
  const mgmtToken = process.env.SUPABASE_ACCESS_TOKEN ?? "";
  if (!evalToken || !mgmtToken) {
    fail("live runs need EVAL_BYPASS_TOKEN and SUPABASE_ACCESS_TOKEN (source supabase/.env.local)");
  }
  if (args.budgetMax !== null && estimateUsd > args.budgetMax) {
    fail(`estimated cost ${usd(estimateUsd)} exceeds --budget-max ${usd(args.budgetMax)}`);
  }
  const panelDirEnv = process.env.QA_PANEL_DIR;
  if (args.promoteBaseline && !panelDirEnv) {
    fail("--promote-baseline needs QA_PANEL_DIR (baselines live under $QA_PANEL_DIR/baselines/)");
  }
  if (!args.yes && process.stdin.isTTY) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(
      `Submit ${planned.length} live cell(s), estimated ${usd(estimateUsd)}? [y/N] `,
    );
    rl.close();
    if (!/^y(es)?$/i.test(answer.trim())) fail("aborted at confirmation");
  }

  const now = new Date();
  const p2 = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())}-${p2(now.getHours())}${p2(now.getMinutes())}`;
  const outDir = args.out
    ? resolve(args.out)
    : panelDirEnv
      ? join(resolve(panelDirEnv), "runs", stamp)
      : resolve("qa-runs", stamp);

  const baselinePath = args.baseline
    ? resolve(args.baseline)
    : panelDirEnv
      ? join(resolve(panelDirEnv), "baselines", "latest.json")
      : null;
  if (args.baseline && (!baselinePath || !existsSync(baselinePath))) {
    fail(`baseline not found: ${args.baseline}`);
  }

  const client = createEvalClient({ evalToken, mgmtToken });
  const allIds: string[] = [];
  const cleanupSql = () =>
    allIds.length > 0
      ? `delete from evaluations where id in (${allIds.map((i) => `'${i}'`).join(", ")});`
      : "-- no evaluation rows were created";

  /* Best-effort cleanup on interrupt; rows are publicly fetchable by UUID. */
  process.on("SIGINT", () => {
    console.error("\nqa-harness: interrupted");
    if (!args.noCleanup && allIds.length > 0) {
      console.error(`qa-harness: cleaning up ${allIds.length} row(s)...`);
      client
        .sql(cleanupSql())
        .catch(() => console.error(`qa-harness: cleanup failed; run manually:\n${cleanupSql()}`))
        .finally(() => process.exit(2));
    } else {
      if (allIds.length > 0) console.error(`cleanup skipped; SQL:\n${cleanupSql()}`);
      process.exit(2);
    }
  });

  /* ---- execute cells, concurrency 3 ---- */
  const cells: QaCell[] = [];
  const submitFailures: { label: string; reason: string }[] = [];
  let spentUsd = 0;
  console.log(`\nSubmitting ${planned.length} cell(s)...`);
  for (let i = 0; i < planned.length; i += CONCURRENCY) {
    const chunk = planned.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(chunk.map((pc) => runCell(client, pc, allIds)));
    settled.forEach((s, j) => {
      if (s.status === "fulfilled") {
        cells.push(s.value.cell);
        spentUsd += s.value.costUsd;
      } else {
        const label = cellLabel(chunk[j]);
        submitFailures.push({ label, reason: String(s.reason) });
        console.error(`  ${label} failed: ${s.reason}`);
      }
    });
  }

  /* ---- per-cell assertions; watchdog / timeout / pipeline_error cells are
     infra and get none ---- */
  const entryOf = (id: string): PanelEntry => (entries.get(id) as EntryCtx).entry;
  for (const cell of cells) {
    if (isAssertable(cell.terminal_source)) {
      cell.assertions = evaluateExpectations(entryOf(cell.entry_id), cell);
    }
  }

  /* ---- soft-failure retry: one same-level resubmit per cell, max 3 per
     invocation, only when every failure is soft; budget still applies. ---- */
  let retriesUsed = 0;
  for (let idx = 0; idx < cells.length; idx++) {
    const cell = cells[idx];
    if (!isAssertable(cell.terminal_source)) continue;
    const failures = cell.assertions.filter((a) => !a.pass);
    if (failures.length === 0 || failures.some((a) => a.hardness === "hard")) continue;
    if (retriesUsed >= MAX_RETRIES) break;
    const pc = planned.find((p) => cellLabel(p) === `${cell.entry_id} ${cell.input_kind} ${cell.level}`);
    if (!pc) continue;
    if (args.budgetMax !== null && estimateUsd + (retriesUsed + 1) * pc.rateUsd > args.budgetMax) {
      console.log(`  retry of ${cellLabel(pc)} skipped: would exceed --budget-max`);
      continue;
    }
    retriesUsed++;
    console.log(`  retrying ${cellLabel(pc)} (soft failures only)...`);
    try {
      const retry = await runCell(client, pc, allIds);
      spentUsd += retry.costUsd;
      if (isAssertable(retry.cell.terminal_source)) {
        retry.cell.assertions = evaluateExpectations(entryOf(cell.entry_id), retry.cell);
        cell.assertions = mergeAssertions(cell.assertions, retry.cell.assertions);
      }
    } catch (err) {
      console.error(`  retry of ${cellLabel(pc)} failed: ${err}`);
    }
    cell.retried = true;
  }

  /* ---- monotonic pairs over final assertable cells; an infra twin means
     no same-level counterpart, which the engine skips ---- */
  const assertable = cells.filter((c) => isAssertable(c.terminal_source));
  for (const cell of assertable) {
    const entry = entryOf(cell.entry_id);
    if (!entry.expected.monotonic_pair) continue;
    const twins = assertable.filter((c) => c.entry_id === entry.expected.monotonic_pair);
    cell.assertions.push(
      ...evaluateMonotonicPairs([cell, ...twins], new Map([[cell.entry_id, entry]])),
    );
  }

  /* ---- assemble the run file ---- */
  let gitHead = "unknown";
  try {
    gitHead = execSync("git rev-parse HEAD", { cwd: ROOT }).toString().trim();
  } catch {
    /* not a git checkout */
  }
  const firstComplete = cells.find((c) => c.terminal_source === "complete" && c.report_snapshot);
  const panelVersions: Record<string, string> = {};
  for (const panel of panels) panelVersions[panel.display] = panel.file.panel_version;

  const hardFailures: { cell: QaCell; a: AssertionResult }[] = [];
  const softFailures: { cell: QaCell; a: AssertionResult }[] = [];
  for (const cell of cells) {
    for (const a of cell.assertions) {
      if (a.pass) continue;
      (a.hardness === "hard" ? hardFailures : softFailures).push({ cell, a });
    }
  }

  const runFile: QaRunFile = {
    schema_version: 1,
    ran_at: now.toISOString(),
    git_head: gitHead,
    methodology_version_live: firstComplete?.report_snapshot?.meta.methodology_version ?? null,
    panel_versions: panelVersions,
    cells,
    summary: {
      hard_failures: hardFailures.length,
      soft_failures: softFailures.length,
      drift_items: 0,
      est_cost_usd: Number(spentUsd.toFixed(2)),
    },
  };

  /* ---- drift vs baseline ---- */
  let baseline: QaRunFile | null = null;
  if (baselinePath && existsSync(baselinePath)) {
    const parsed = JSON.parse(readFileSync(baselinePath, "utf8")) as QaRunFile;
    if (parsed.schema_version === 1 && Array.isArray(parsed.cells)) baseline = parsed;
    else console.error(`qa-harness: baseline ${baselinePath} is not a v1 run file; skipping drift`);
  }
  const driftItems = baseline ? computeDrift(runFile, baseline) : [];
  runFile.summary.drift_items = driftItems.length;

  /* ---- report.md ---- */
  const infraCells = cells.filter((c) => !isAssertable(c.terminal_source));
  const md: string[] = [
    `# QA run ${stamp}`,
    "",
    `Ran at ${runFile.ran_at} | git ${gitHead.slice(0, 12)} | methodology_version_live ${runFile.methodology_version_live ?? "unknown"} | measured cost ${usd(runFile.summary.est_cost_usd)} (estimate)`,
    "",
    "Panels:",
    ...panels.map((p) => `- ${p.display} (${p.file.panel_version}, ${p.isPublicFile ? "public" : "private"})`),
    "",
    "## Manifest",
    "",
    "| Entry | Category | Input | Level | Auto-included |",
    "|---|---|---|---|---|",
    ...planned.map(
      (pc) =>
        `| ${pc.ctx.entry.id} | ${pc.ctx.entry.category} | ${pc.input.input_kind} | ${pc.level} | ${pc.ctx.autoIncluded ? "yes" : ""} |`,
    ),
    "",
    "## Metrics",
    "",
    `Cost figures are ESTIMATES from token counts at Sonnet-5 rates; search fees are exact.`,
    "",
    ...metricsTable(cells),
    "",
    `## Hard failures (${hardFailures.length})`,
    "",
    ...(hardFailures.length > 0 ? hardFailures.map((f) => failureLine(f.cell, f.a)) : ["None."]),
    "",
    `## Soft failures (${softFailures.length})`,
    "",
    ...(softFailures.length > 0 ? softFailures.map((f) => failureLine(f.cell, f.a)) : ["None."]),
    "",
    `## Infra (${infraCells.length + submitFailures.length})`,
    "",
    ...(infraCells.length + submitFailures.length > 0
      ? [
          ...infraCells.map(
            (c) =>
              `- ${c.entry_id} ${c.input_kind} ${c.level}: ${c.terminal_source}${c.error ? ` — ${c.error}` : ""}`,
          ),
          ...submitFailures.map((f) => `- ${f.label}: submit failed — ${f.reason}`),
        ]
      : ["None."]),
    "",
    "## Drift",
    "",
  ];
  if (baseline) {
    if (runFile.methodology_version_live !== baseline.methodology_version_live) {
      md.push(
        `> **METHODOLOGY VERSION CHANGED**: live ${runFile.methodology_version_live ?? "null"} vs baseline ${baseline.methodology_version_live ?? "null"}. Expectation bands may need recalibration before drift below is trusted.`,
        "",
      );
    }
    md.push(renderDriftMarkdown(driftItems));
  } else {
    md.push("No baseline available; drift not computed.");
  }
  md.push(
    "",
    "## Run ids (for cleanup)",
    "",
    ...allIds.map((id) => `- ${id}`),
    "",
    args.noCleanup
      ? "Cleanup was SKIPPED (--no-cleanup). Rows are publicly fetchable by UUID; delete them:"
      : "Cleanup ran at the end of this invocation. SQL for reference:",
    "```sql",
    cleanupSql(),
    "```",
    "",
  );

  mkdirSync(outDir, { recursive: true });
  const resultsPath = join(outDir, "results.json");
  const reportPath = join(outDir, "report.md");
  writeFileSync(resultsPath, JSON.stringify(runFile, null, 2));
  writeFileSync(reportPath, md.join("\n"));
  console.log(`\nwrote ${resultsPath}`);
  console.log(`wrote ${reportPath}`);

  /* ---- baseline promotion: only a fully-hard-green run may become the
     comparison point for future drift ---- */
  if (args.promoteBaseline) {
    if (hardFailures.length > 0) {
      console.error(`qa-harness: NOT promoting baseline: ${hardFailures.length} hard failure(s)`);
    } else {
      if (infraCells.length + submitFailures.length > 0) {
        console.error(
          "qa-harness: warning: promoting a baseline with infra gaps; missing cells will show as drift later",
        );
      }
      const baseDir = join(resolve(panelDirEnv as string), "baselines");
      mkdirSync(baseDir, { recursive: true });
      const dated = join(baseDir, `${stamp.slice(0, 10)}.json`);
      copyFileSync(resultsPath, dated);
      copyFileSync(resultsPath, join(baseDir, "latest.json"));
      console.log(`promoted baseline: ${dated} and ${join(baseDir, "latest.json")}`);
    }
  }

  /* ---- cleanup (default ON) ---- */
  if (!args.noCleanup && allIds.length > 0) {
    await client.sql(cleanupSql());
    console.log(`cleaned up ${allIds.length} evaluation row(s)`);
  } else if (allIds.length > 0) {
    console.log(`cleanup skipped (--no-cleanup); SQL:\n${cleanupSql()}`);
  }

  /* ---- verdict ---- */
  const infraCount = infraCells.length + submitFailures.length;
  console.log(
    `\nSummary: ${hardFailures.length} hard, ${softFailures.length} soft, ${infraCount} infra, ${driftItems.length} drift item(s), measured ${usd(runFile.summary.est_cost_usd)}`,
  );
  if (hardFailures.length > 0) process.exit(1);
  if (args.strict && (softFailures.length > 0 || driftItems.length > 0)) process.exit(1);
  if (infraCount > 0) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
