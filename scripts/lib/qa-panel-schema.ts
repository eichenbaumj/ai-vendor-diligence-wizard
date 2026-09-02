/*
  QA panel file schema. A panel file is versioned JSON:

    { "schema_version": 1, "panel_version": "2026-09-01", "entries": [...] }

  Panel files committed to this PUBLIC repo (tests/qa/panel/) may describe
  only fictional vendors: the validator enforces that visibility "public"
  pairs only with the synthetic categories. Panels about real companies
  live outside the repo and reach the runner via --panel-dir / QA_PANEL_DIR.

  Expectations are BANDS plus never-clauses, not equalities: the cook-time
  study showed research-dependent signals (individual VERIFIED rows, tier
  at the band edge) legitimately vary run to run. Hard assertions are
  reserved for invariants that must never fail on any run.
*/
import { z } from "zod";

export const LevelName = z.enum(["L1", "L2", "L3", "DEEP"]);
export type LevelName = z.infer<typeof LevelName>;

/* The four research power levels, matching scripts/eval-harness.ts. */
export const LEVEL_BODIES: Record<LevelName, Record<string, unknown>> = {
  L1: { power: { searches: 12, fetches: 6 } },
  L2: { power: { searches: 20, fetches: 8 } },
  L3: { power: { searches: 32, fetches: 12 } },
  DEEP: { deep: true },
};

/* Real-vendor maturity buckets (established / growth / startup) carve the
   private panels by company stage: established = 10+ years operating with a
   deep registry and procurement footprint; growth = institutionally funded,
   roughly 4-10 years old, real deployments, partial registry footprint;
   startup = under ~4 years, where a thin public footprint is the norm and
   fairness floors matter most. real-flagged is a different axis entirely
   (whether research reaches a public enforcement or dissolution record). */
export const PanelCategory = z.enum([
  "established",
  "growth",
  "startup",
  "synthetic-control",
  "adversarial",
  "real-flagged",
  "unverifiable",
]);
export type PanelCategory = z.infer<typeof PanelCategory>;

/* Categories a PUBLIC panel entry may use: fictional vendors only. */
export const PUBLIC_CATEGORIES: ReadonlySet<PanelCategory> = new Set([
  "synthetic-control",
  "adversarial",
  "unverifiable",
] as const);

const TierNum = z.number().int().min(0).max(4);

export const LedgerResultName = z.enum([
  "VERIFIED",
  "OFFICIAL_RECORD_FOUND",
  "COULD_NOT_VERIFY",
  "CONTRADICTED",
  "COVERAGE_LIMITED",
]);

export const LedgerExpectation = z
  .object({
    /* Match a ledger row by its stable id (e.g. "excl", "domain-age",
       "fedramp_marketplace") or by methodology_ref (e.g. "d1-4"). */
    match: z
      .object({
        id: z.string().max(60).optional(),
        methodology_ref: z.string().max(20).optional(),
      })
      .refine((m) => Boolean(m.id) || Boolean(m.methodology_ref), {
        message: "match needs an id or a methodology_ref",
      }),
    /* "optional" emits no presence assertion: the row may or may not
       appear, and only the result/severity constraints apply when it does
       (the wrong-namesake locks: a candidate row is fine, a VERIFIED one
       never is). */
    presence: z.enum(["required", "forbidden", "optional"]),
    result_in: z.array(LedgerResultName).min(1).optional(),
    /* No matched row may carry any of these results; vacuously true when
       the row is absent. Deterministic ground-truth invariants (never a
       VERIFIED row under this id) may be hard. */
    forbidden_result_in: z.array(LedgerResultName).min(1).optional(),
    severity_in: z
      .array(z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]).nullable())
      .min(1)
      .optional(),
    /* Every matched row's attribution must be one of these (v1.5 tying
       signals). Vacuously true when the row is absent; a missing field on
       the row counts as "candidate" (unadjudicated never mints). The
       zipsec lock: identity must never rest on an attributed Oregon
       namesake, i.e. attribution_in: ["candidate"], hard. */
    attribution_in: z
      .array(z.enum(["attributed", "candidate"]))
      .min(1)
      .optional(),
    /* No matched row's note may contain any of these strings
       (case-insensitive). Vacuously true when the row is absent. The
       never-attributes lock: "the identity row never names CONDUIT, LLC"
       is a deterministic ground-truth invariant and may be hard. The
       strings live in the private panel, never in the public repo. */
    note_never_contains: z.array(z.string().min(3).max(120)).min(1).optional(),
    /* Research-dependent VERIFIED statuses must always be soft. */
    hardness: z.enum(["hard", "soft"]),
  })
  .strict();
export type LedgerExpectation = z.infer<typeof LedgerExpectation>;

export const AdvCode = z.enum(["ADV-01", "ADV-02", "ADV-03", "ADV-04"]);

export const Expectation = z
  .object({
    /* Expected terminal status. Hard. */
    status: z.enum(["complete", "insufficient"]),
    /* Soft band. Equal min and max makes a tight band (synthetic controls). */
    tier: z
      .object({ min: TierNum.optional(), max: TierNum.optional() })
      .strict()
      .default({}),
    /* Hard never-clauses: tier must never be <= at_or_below, never >= at_or_above. */
    never: z
      .object({
        at_or_below: TierNum.optional(),
        at_or_above: TierNum.optional(),
      })
      .strict()
      .default({}),
    checks_met_min: z.number().int().min(0).max(7).optional(), // soft
    verified_rows_min: z.number().int().min(0).optional(), // soft
    ledger: z.array(LedgerExpectation).max(20).default([]),
    adv: z
      .object({
        required_codes: z.array(AdvCode).default([]), // hard
        forbidden_codes: z.array(AdvCode).default([]), // hard
      })
      .strict()
      .default({}),
    questions: z
      .object({
        required_ids: z.array(z.string().max(60)).default([]), // soft
        forbidden_ids: z.array(z.string().max(60)).default([]), // soft
      })
      .strict()
      .default({}),
    honesty: z
      .array(
        z
          .object({
            check_id: z.string().max(60),
            status_in: z
              .array(
                z.enum(["pass", "flag", "could_not_check", "not_applicable"]),
              )
              .min(1),
            hardness: z.enum(["hard", "soft"]),
          })
          .strict(),
      )
      .default([]),
    /* The S4 classifier chooses pack ids; assert membership softly only. */
    sector_pack_ids_any_of: z.array(z.string().max(40)).min(1).optional(),
    /* Applied to DEEP cells. Hard: usage.deep must be true, searches >= min,
       and no deep_handoff_failed marker. On standard cells usage.deep must
       be absent. */
    deep_integrity: z
      .object({ min_searches: z.number().int().min(1).default(25) })
      .strict()
      .optional(),
    /* Hard: lintObject over every narrative field finds no banned language. */
    lint_clean: z.boolean().default(true),
    /* Entry id of the clean twin for monotonicity assertions (hard):
       tier(this) <= tier(twin); this entry carries >= 1 ADV finding; and
       when the twin lands tier >= 3 this entry shows the tier-2 ceiling. */
    monotonic_pair: z.string().max(60).optional(),
  })
  .strict();
export type Expectation = z.infer<typeof Expectation>;

export const PanelInput = z
  .object({
    input_kind: z.enum(["name", "paste", "url", "pdf"]),
    /* Exactly one of content (inline) or fixture (path). Public panel
       fixture paths are repo-relative; private ones panel-dir-relative. */
    content: z.string().min(1).optional(),
    fixture: z.string().min(1).optional(),
    levels: z.array(LevelName).min(1).default(["L1"]),
    state: z.string().length(2).nullable().default(null),
    /* Name runs only: the web address typed beside the name (1.7). */
    website: z.string().min(3).optional(),
  })
  .strict()
  .refine((i) => (i.content ? 1 : 0) + (i.fixture ? 1 : 0) === 1, {
    message: "exactly one of content or fixture",
  });
export type PanelInput = z.infer<typeof PanelInput>;

export const PanelEntry = z
  .object({
    id: z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]*$/)
      .max(60),
    display_name: z.string().min(1).max(120),
    category: PanelCategory,
    visibility: z.enum(["public", "private"]),
    inputs: z.array(PanelInput).min(1).max(6),
    expected: Expectation,
    /* Why these expectations are correct: the canonical-result research. */
    rationale: z.string().min(20).max(2000),
    evidence_links: z.array(z.string().url()).max(12).default([]),
    added: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    calibrated_against: z
      .object({
        methodology_version: z.string().min(1),
        pack_release: z.string().optional(),
        runs: z.number().int().min(0),
        last_calibrated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .strict(),
    expectations_status: z.enum(["calibrated", "calibrating", "stale"]),
    notes: z.string().max(2000).optional(),
  })
  .strict();
export type PanelEntry = z.infer<typeof PanelEntry>;

export const PanelFile = z
  .object({
    schema_version: z.literal(1),
    panel_version: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    entries: z.array(PanelEntry).min(1),
  })
  .strict()
  .superRefine((file, ctx) => {
    const seen = new Set<string>();
    for (const entry of file.entries) {
      if (seen.has(entry.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate entry id: ${entry.id}`,
        });
      }
      seen.add(entry.id);
    }
  });
export type PanelFile = z.infer<typeof PanelFile>;

/*
  Structural rules beyond the shape, shared by the validator CLI and the
  runner's load step. Returns human-readable problems; empty = clean.
*/
export function panelProblems(
  file: PanelFile,
  opts: { isPublicFile: boolean },
): string[] {
  const problems: string[] = [];
  const ids = new Set(file.entries.map((e) => e.id));
  for (const entry of file.entries) {
    if (opts.isPublicFile) {
      if (entry.visibility !== "public") {
        problems.push(
          `${entry.id}: public panel files may only hold visibility "public" entries`,
        );
      }
      if (!PUBLIC_CATEGORIES.has(entry.category)) {
        problems.push(
          `${entry.id}: category "${entry.category}" describes a real vendor and cannot ship in the public repo`,
        );
      }
    }
    if (entry.visibility === "public" && !PUBLIC_CATEGORIES.has(entry.category)) {
      problems.push(
        `${entry.id}: visibility "public" requires a synthetic category`,
      );
    }
    if (
      entry.expected.monotonic_pair &&
      !ids.has(entry.expected.monotonic_pair)
    ) {
      problems.push(
        `${entry.id}: monotonic_pair "${entry.expected.monotonic_pair}" is not an entry in this panel file`,
      );
    }
    for (const le of entry.expected.ledger) {
      /* DEMANDING a VERIFIED row is research-dependent and must stay soft
         (the cook-time study). FORBIDDING one is the opposite shape: "this
         row must never verify" is a deterministic ground-truth invariant
         (the wrong-namesake regression locks), so it may be hard. */
      const demandsVerified =
        le.presence === "required" &&
        le.result_in?.includes("VERIFIED") &&
        le.hardness === "hard";
      if (demandsVerified) {
        problems.push(
          `${entry.id}: a hard ledger expectation REQUIRING a VERIFIED row is not allowed (research-dependent; make it soft)`,
        );
      }
    }
    if (
      entry.expectations_status === "calibrated" &&
      entry.calibrated_against.runs < 3
    ) {
      problems.push(
        `${entry.id}: "calibrated" requires at least 3 recorded calibration runs`,
      );
    }
  }
  return problems;
}
