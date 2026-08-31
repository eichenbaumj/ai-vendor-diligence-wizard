/*
  validate-qa-panel.ts — CI gate for QA panel files. Exits 1 on any violation.

  Targets:
  - Default: every tests/qa/panel/*.panel.json (PUBLIC — fictional vendors
    only, enforced by panelProblems), plus, when QA_PANEL_DIR is set, every
    $QA_PANEL_DIR/panel/*.panel.json (private).
  - Explicit file args override the default set. An arg inside the repo is
    treated as public; anywhere else, private.

  Enforced (errors):
  - JSON parses and matches the PanelFile zod shape (precise paths printed).
  - panelProblems(): public-repo category rules, monotonic_pair resolution,
    no hard VERIFIED ledger expectations, "calibrated" needs >= 3 runs.
  - Every fixture path exists on disk. Public fixture paths resolve
    repo-relative; private ones resolve against the panel file's parent
    dir's parent (i.e. $QA_PANEL_DIR for $QA_PANEL_DIR/panel/x.panel.json).

  Run with: npx tsx scripts/validate-qa-panel.ts [panel files...]
*/

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PanelFile, panelProblems } from "./lib/qa-panel-schema.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_PANEL_DIR = join(ROOT, "tests", "qa", "panel");

interface Target {
  path: string;
  isPublicFile: boolean;
}

/* Display paths repo-relative when possible; absolute otherwise. */
function display(path: string): string {
  const rel = relative(ROOT, path);
  return rel.startsWith("..") || isAbsolute(rel) ? path : rel;
}

function insideRepo(path: string): boolean {
  const rel = relative(ROOT, path);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

/* "Public" means the file would ship in the public repo: inside the repo
   tree AND not gitignored (the private QA tree lives inside the repo
   directory, gitignored, since 2026-08-31). Falls back to the stricter
   inside-repo verdict when git cannot answer. */
function wouldShipInRepo(path: string): boolean {
  if (!insideRepo(path)) return false;
  try {
    execFileSync("git", ["check-ignore", "-q", "--", path], {
      cwd: ROOT,
      stdio: "ignore",
    });
    return false;
  } catch {
    return true;
  }
}

function listPanelFiles(dir: string): string[] {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".panel.json"))
    .sort()
    .map((f) => join(dir, f));
}

function collectTargets(args: string[]): Target[] {
  if (args.length > 0) {
    return args.map((a) => {
      const path = resolve(a);
      return { path, isPublicFile: wouldShipInRepo(path) };
    });
  }
  const targets: Target[] = listPanelFiles(PUBLIC_PANEL_DIR).map((path) => ({
    path,
    isPublicFile: true,
  }));
  const panelDir = process.env.QA_PANEL_DIR;
  if (panelDir) {
    for (const path of listPanelFiles(join(resolve(panelDir), "panel"))) {
      targets.push({ path, isPublicFile: false });
    }
  }
  return targets;
}

/* ---------------------------------------------------------------- checks */

const errors: string[] = [];

/* Returns the entry count on success, null when the file had errors. */
function checkFile(target: Target): number | null {
  const name = display(target.path);
  let raw: string;
  try {
    raw = readFileSync(target.path, "utf8");
  } catch (err) {
    errors.push(`${name}: unreadable: ${(err as Error).message}`);
    return null;
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    errors.push(`${name}: JSON parse error: ${(err as Error).message}`);
    return null;
  }

  const parsed = PanelFile.safeParse(data);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`${name}: ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    return null;
  }

  const before = errors.length;
  for (const problem of panelProblems(parsed.data, {
    isPublicFile: target.isPublicFile,
  })) {
    errors.push(`${name}: ${problem}`);
  }

  /* Public fixture paths are repo-relative; private panels ship fixtures
     alongside $QA_PANEL_DIR/panel/, addressed from the dir above it. */
  const fixtureBase = target.isPublicFile
    ? ROOT
    : dirname(dirname(target.path));
  for (const entry of parsed.data.entries) {
    for (const input of entry.inputs) {
      if (!input.fixture) continue;
      const fixturePath = resolve(fixtureBase, input.fixture);
      if (!existsSync(fixturePath)) {
        errors.push(
          `${name}: ${entry.id}: fixture not found: ${input.fixture} ` +
            `(resolved to ${fixturePath})`,
        );
      }
    }
  }

  return errors.length === before ? parsed.data.entries.length : null;
}

/* ------------------------------------------------------------------ main */

const targets = collectTargets(process.argv.slice(2));

if (targets.length === 0) {
  console.error(
    `validate-qa-panel: no *.panel.json files found in ${PUBLIC_PANEL_DIR}` +
      (process.env.QA_PANEL_DIR ? ` or $QA_PANEL_DIR/panel` : ""),
  );
  process.exit(1);
}

const ok: string[] = [];
for (const target of targets) {
  const entryCount = checkFile(target);
  if (entryCount !== null) {
    ok.push(
      `validate-qa-panel: ${display(target.path)} OK ` +
        `(${entryCount} entries, ${target.isPublicFile ? "public" : "private"})`,
    );
  }
}

if (errors.length > 0) {
  console.error(`validate-qa-panel: ${errors.length} error(s):`);
  for (const e of errors) console.error(`  FAIL  ${e}`);
  process.exit(1);
}

for (const line of ok) console.log(line);
