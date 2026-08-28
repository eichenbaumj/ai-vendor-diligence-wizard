/*
  build-packs.ts — compile packs/*.yaml into the two generated artifacts:

    1. supabase/functions/_shared/packs.gen.ts
       Typed module consumed by the edge functions (and, via the @shared
       alias, by the frontend). Exports PACK_RELEASE (the newest
       last_updated across packs) and PACKS (a stable-sorted record keyed
       by pack_id).

    2. src/generated/packs.json
       { pack_release, packs: [...] } for the public methodology page's
       pack browser.

  Run with: npx tsx scripts/build-packs.ts
  Deep validation lives in scripts/validate-packs.ts; this script only
  checks basic shape so a malformed file fails loudly at build time.
*/

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "js-yaml";
import type { SectorPack } from "../supabase/functions/_shared/packs-types.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PACKS_DIR = join(ROOT, "packs");
const GEN_TS = join(ROOT, "supabase", "functions", "_shared", "packs.gen.ts");
const GEN_JSON_DIR = join(ROOT, "src", "generated");
const GEN_JSON = join(GEN_JSON_DIR, "packs.json");

const REQUIRED_KEYS: (keyof SectorPack)[] = [
  "pack_id",
  "pack_name",
  "definition",
  "inclusion_test",
  "scrutiny_tier",
  "incumbent_landscape",
  "established_vendors",
  "failure_modes",
  "skepticism_triggers",
  "diligence_questions",
  "elevated_scrutiny_rules",
  "reference_deployments",
  "registries_to_check",
  "legal_context",
  "realistic_pricing",
  "last_updated",
  "refresh_cadence",
  "known_gaps",
];

function fail(message: string): never {
  console.error(`build-packs: ${message}`);
  process.exit(1);
}

/* Recursively sort object keys so the generated output is byte-stable
   regardless of YAML authoring order. Arrays keep their order. */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    return Object.fromEntries(entries.map(([k, v]) => [k, sortKeys(v)]));
  }
  return value;
}

const files = readdirSync(PACKS_DIR)
  .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
  .sort();
if (files.length === 0) fail(`no pack YAML files found in ${PACKS_DIR}`);

const packs: SectorPack[] = [];
for (const file of files) {
  const raw = readFileSync(join(PACKS_DIR, file), "utf8");
  let data: unknown;
  try {
    data = load(raw);
  } catch (err) {
    fail(`${file}: YAML parse error: ${(err as Error).message}`);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    fail(`${file}: expected a top-level YAML mapping`);
  }
  const record = data as Record<string, unknown>;
  for (const key of REQUIRED_KEYS) {
    if (!(key in record)) fail(`${file}: missing required field "${key}"`);
  }
  const pack = record as unknown as SectorPack;
  const expected = file.replace(/\.ya?ml$/, "");
  if (pack.pack_id !== expected) {
    fail(`${file}: pack_id "${pack.pack_id}" must match the filename`);
  }
  packs.push(pack);
}

packs.sort((a, b) => a.pack_id.localeCompare(b.pack_id));

const release = packs
  .map((p) => p.last_updated)
  .sort()
  .at(-1);
if (!release || !/^\d{4}-\d{2}-\d{2}$/.test(release)) {
  fail(`could not derive a YYYY-MM-DD release date from last_updated fields`);
}

const packsRecord = Object.fromEntries(
  packs.map((p) => [p.pack_id, sortKeys(p)]),
);

const tsSource = `/*
  GENERATED FILE — do not edit.
  Source of truth: packs/*.yaml, compiled by scripts/build-packs.ts.
  Regenerate with: npx tsx scripts/build-packs.ts
*/
import type { SectorPack } from "./packs-types.ts";

export const PACK_RELEASE = ${JSON.stringify(release)};

export const PACKS: Record<string, SectorPack> = ${JSON.stringify(
  packsRecord,
  null,
  2,
)};
`;

writeFileSync(GEN_TS, tsSource, "utf8");

mkdirSync(GEN_JSON_DIR, { recursive: true });
const jsonSource = `${JSON.stringify(
  { pack_release: release, packs: packs.map(sortKeys) },
  null,
  2,
)}\n`;
writeFileSync(GEN_JSON, jsonSource, "utf8");

console.log(
  `build-packs: wrote ${packs.length} packs (release ${release}) to\n` +
    `  ${GEN_TS}\n  ${GEN_JSON}`,
);
