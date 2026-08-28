/*
  validate-packs.ts — CI gate for packs/*.yaml. Exits 1 on any violation.

  Enforced (errors):
  - Full schema shape per supabase/functions/_shared/packs-types.ts (zod).
  - pack_id matches the filename.
  - 10–15 diligence questions, ids sequential as "<pack_id>-q01"...
  - Every failure_mode and reference_deployment carries a real URL, and a
    non-empty named_incident (no hypotheticals).
  - last_updated no older than 2x the refresh cadence (quarterly = 180
    days, monthly = 60 days).
  - No purchase-recommendation language anywhere in user-facing strings.
  - lintObject "banned"-kind violations (legal-safe language), with one
    documented carve-out: the bare noun "fraud" (fraud detection, false
    fraud determinations, fraud flags) is program-integrity vocabulary the
    packs must be able to use, so it downgrades to a warning; "fraudulent"
    or "fraudster" aimed at anyone still fails.
  - Word limits: definition <= 120 words, incumbent_landscape <= 300 words.
  - eligibility-case-mgmt must be scrutiny_tier: elevated.
  - A metric described as vendor-reported must carry
    metric_source_type: "vendor-reported".

  Warned (non-fatal): lintObject "style"-kind violations (em dashes,
  AI-tell vocabulary), because pack content may legitimately quote vendor
  claims and research-document language; and skepticism triggers with a
  null source_url (the type allows null, the research spec prefers a URL).

  Run with: npx tsx scripts/validate-packs.ts
*/

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "js-yaml";
import { z } from "zod";
import { lintObject } from "../supabase/functions/_shared/lint.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PACKS_DIR = join(ROOT, "packs");

/* ------------------------------------------------------------ zod schema */

const url = z.string().url();
const urlOrNull = url.nullable();
const nonEmpty = z.string().trim().min(1);

const PackQuestion = z.object({
  id: nonEmpty,
  question: nonEmpty,
  good_answer: nonEmpty,
  red_flag: nonEmpty,
  source_url: urlOrNull,
});

const PackVendor = z.object({
  name: nonEmpty,
  tier: z.enum(["platform", "integrator", "specialist", "startup-verified"]),
  one_liner: nonEmpty,
  gov_evidence_url: urlOrNull,
});

const PackFailureMode = z.object({
  title: nonEmpty,
  description: nonEmpty,
  named_incident: nonEmpty,
  source_url: url,
});

const PackTrigger = z.object({
  claim_pattern: nonEmpty,
  threshold: nonEmpty,
  why: nonEmpty,
  source_url: urlOrNull,
});

const PackDeployment = z.object({
  agency: nonEmpty,
  vendor_stack: nonEmpty,
  what: nonEmpty,
  metric: nonEmpty,
  metric_source_type: z.enum([
    "oversight",
    "independent-press",
    "government-page",
    "vendor-reported",
  ]),
  source_url: url,
});

const PackRegistry = z.object({
  name: nonEmpty,
  url,
  what_it_proves: nonEmpty,
});

const ElevatedRule = z.object({
  condition: nonEmpty,
  action: nonEmpty,
});

const SectorPackSchema = z
  .object({
    pack_id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    pack_name: nonEmpty,
    definition: nonEmpty,
    inclusion_test: z.array(nonEmpty).min(3).max(6),
    scrutiny_tier: z.enum(["standard", "elevated"]),
    incumbent_landscape: nonEmpty,
    established_vendors: z.array(PackVendor).min(1),
    failure_modes: z.array(PackFailureMode).min(1),
    skepticism_triggers: z.array(PackTrigger).min(1),
    diligence_questions: z.array(PackQuestion).min(10).max(15),
    elevated_scrutiny_rules: z.array(ElevatedRule).min(1),
    reference_deployments: z.array(PackDeployment).min(1),
    registries_to_check: z.array(PackRegistry).min(1),
    legal_context: nonEmpty,
    realistic_pricing: nonEmpty,
    last_updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    refresh_cadence: z.enum(["quarterly", "monthly"]),
    known_gaps: nonEmpty,
  })
  .strict();

type SectorPack = z.infer<typeof SectorPackSchema>;

/* ----------------------------------------------------------- lint helpers */

const RECOMMENDATION_RE =
  /\b(best choice|leading (choice|vendor)|we recommend (buying|purchasing|selecting)|top pick)\b/i;

/* "fraudulent"/"fraudster" fail even under the bare-noun carve-out. */
const DEFAMATORY_FRAUD_RE = /\bfraud(ulent|ster|sters)\b/i;

const URLISH_KEY_RE = /(^|_)url$/;

/* Deep-copy an object tree with URL-valued keys removed, so lint rules run
   only on prose (source_url slugs legitimately contain words like "fraud"). */
function stripUrlFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripUrlFields);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k]) => !URLISH_KEY_RE.test(k))
        .map(([k, v]) => [k, stripUrlFields(v)]),
    );
  }
  return value;
}

function walkStrings(
  value: unknown,
  path: string,
  visit: (text: string, path: string) => void,
): void {
  if (typeof value === "string") {
    visit(value, path);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => walkStrings(v, `${path}[${i}]`, visit));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === "id") continue;
      walkStrings(v, `${path}.${k}`, visit);
    }
  }
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/* ---------------------------------------------------------------- checks */

const errors: string[] = [];
const warnings: string[] = [];

const STALENESS_DAYS: Record<SectorPack["refresh_cadence"], number> = {
  quarterly: 180,
  monthly: 60,
};

function checkPack(file: string, pack: SectorPack): void {
  const where = (detail: string) => `${file}: ${detail}`;

  /* Filename lock. */
  if (`${pack.pack_id}.yaml` !== file) {
    errors.push(where(`pack_id "${pack.pack_id}" must match the filename`));
  }

  /* Question ids: "<pack_id>-q01" ... sequential, zero-padded. */
  pack.diligence_questions.forEach((q, i) => {
    const expected = `${pack.pack_id}-q${String(i + 1).padStart(2, "0")}`;
    if (q.id !== expected) {
      errors.push(
        where(`diligence_questions[${i}].id is "${q.id}", expected "${expected}"`),
      );
    }
  });

  /* Staleness: last_updated no older than 2x refresh cadence. */
  const limit = STALENESS_DAYS[pack.refresh_cadence];
  const updated = Date.parse(`${pack.last_updated}T00:00:00Z`);
  const ageDays = Math.floor((Date.now() - updated) / 86_400_000);
  if (Number.isNaN(updated)) {
    errors.push(where(`last_updated "${pack.last_updated}" is not a date`));
  } else if (ageDays > limit) {
    errors.push(
      where(
        `stale: last_updated ${pack.last_updated} is ${ageDays} days old, which ` +
          `exceeds 2x the ${pack.refresh_cadence} cadence (${limit} days). ` +
          `Review the pack, update last_updated, or record an explicit waiver.`,
      ),
    );
  } else if (ageDays < 0) {
    errors.push(where(`last_updated ${pack.last_updated} is in the future`));
  }

  /* The elevated pack stays elevated. */
  if (pack.pack_id === "eligibility-case-mgmt" && pack.scrutiny_tier !== "elevated") {
    errors.push(where(`eligibility-case-mgmt must have scrutiny_tier: elevated`));
  }

  /* Word limits from the pack spec. */
  const defWords = wordCount(pack.definition);
  if (defWords > 120) {
    errors.push(where(`definition is ${defWords} words (limit 120)`));
  }
  const landWords = wordCount(pack.incumbent_landscape);
  if (landWords > 300) {
    errors.push(where(`incumbent_landscape is ${landWords} words (limit 300)`));
  }

  /* Vendor-reported flagging consistency. */
  pack.reference_deployments.forEach((d, i) => {
    const text = `${d.metric} ${d.what}`;
    if (/vendor[- ]reported/i.test(text) && d.metric_source_type !== "vendor-reported") {
      errors.push(
        where(
          `reference_deployments[${i}] describes a vendor-reported metric but has ` +
            `metric_source_type "${d.metric_source_type}"`,
        ),
      );
    }
  });

  /* Triggers without a URL are allowed by the type but noted. */
  pack.skepticism_triggers.forEach((t, i) => {
    if (t.source_url === null) {
      warnings.push(
        where(`skepticism_triggers[${i}] ("${t.claim_pattern.slice(0, 40)}...") has no source_url`),
      );
    }
  });

  /* Prose-only copy of the pack for language checks. */
  const prose = stripUrlFields(pack);

  /* Recommendation-language lint (hard fail). */
  walkStrings(prose, file, (text, path) => {
    const m = text.match(RECOMMENDATION_RE);
    if (m) {
      errors.push(`${path}: recommendation language "${m[0]}" is not allowed`);
    }
    if (DEFAMATORY_FRAUD_RE.test(text)) {
      errors.push(
        `${path}: "fraudulent"/"fraudster" is banned vocabulary (the bare noun ` +
          `"fraud" as a program-integrity term is the only allowed form)`,
      );
    }
  });

  /* Legal-safe language lint. Banned-kind fails, except the bare-noun
     "fraud" carve-out (defamatory variants are caught above). Style-kind
     warns only. */
  for (const v of lintObject(prose, file)) {
    const line = `${v.path}: [${v.kind}] ${v.label} — "${v.excerpt}"`;
    if (v.kind === "banned") {
      if (v.label === "fraud") {
        warnings.push(`${line} (bare-noun program-integrity use, allowed)`);
      } else {
        errors.push(line);
      }
    } else {
      warnings.push(line);
    }
  }
}

/* ------------------------------------------------------------------ main */

const files = readdirSync(PACKS_DIR)
  .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
  .sort();

if (files.length === 0) {
  console.error(`validate-packs: no pack YAML files found in ${PACKS_DIR}`);
  process.exit(1);
}

for (const file of files) {
  let data: unknown;
  try {
    data = load(readFileSync(join(PACKS_DIR, file), "utf8"));
  } catch (err) {
    errors.push(`${file}: YAML parse error: ${(err as Error).message}`);
    continue;
  }
  const parsed = SectorPackSchema.safeParse(data);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`${file}: ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    continue;
  }
  checkPack(file, parsed.data);
}

if (warnings.length > 0) {
  console.warn(`validate-packs: ${warnings.length} warning(s):`);
  for (const w of warnings) console.warn(`  WARN  ${w}`);
}

if (errors.length > 0) {
  console.error(`validate-packs: ${errors.length} error(s):`);
  for (const e of errors) console.error(`  FAIL  ${e}`);
  process.exit(1);
}

console.log(`validate-packs: ${files.length} packs OK (${warnings.length} warnings)`);
