/*
  Typed stage boundaries for the evaluation pipeline.

  These schemas are the security architecture: every LLM stage consumes and
  emits only these shapes. Raw (attacker-authored) pitch text is seen ONLY by
  forensics.ts (deterministic code) and the quarantined S1 extractor. Verdict
  tiers, check selection, and question selection are computed in plain
  TypeScript over these validated objects — no vendor-authored text can change
  control flow.

  Pure module: no Deno APIs, no I/O. Imported by edge functions, the frontend,
  and tests alike.
*/
import { z } from "zod";

/* ---------------------------------------------------------------- S1 parse */

export const ClaimType = z.enum([
  "identity", // who the company says it is (age, size, location)
  "customer", // named or implied government customers
  "compliance", // certifications / authorizations claimed
  "performance", // accuracy, savings, containment, ROI numbers
  "team", // claims about founders / staff
  "pricing", // price points or pricing-model claims
  "availability", // "live today" vs "coming soon"
]);
export type ClaimType = z.infer<typeof ClaimType>;

export const Claim = z.object({
  id: z.string().max(24),
  type: ClaimType,
  quote: z.string().max(400), // verbatim from the pitch
  subject: z.string().max(160).nullable(), // e.g. the named customer or cert
  /* Structured fields for quantitative claims, filled by the extractor only
     when verbatim numbers exist. HINTS ONLY: the plausibility arithmetic
     (plausibility.ts) re-parses every number from the verbatim quote and
     basis_quote in code, so a misremembered model number can never reach a
     rendered sentence. basis_quote is the shortest verbatim span carrying a
     denominator the pitch itself offers ("about 500 agents") and is
     verbatim-guarded by the caller like quotes. All optional-nullable:
     extracts stored before the fields existed omit them. */
  amount: z.number().nullable().optional(),
  unit: z.enum(["dollars", "percent", "hours", "count"]).nullable().optional(),
  period: z
    .enum(["annual", "monthly", "per_case", "total", "unspecified"])
    .nullable()
    .optional(),
  basis_quote: z.string().max(400).nullable().optional(),
});
export type Claim = z.infer<typeof Claim>;

export const InjectionScreen = z.object({
  injection_suspected: z.boolean(),
  addressed_to_ai: z.boolean(), // text that speaks to an AI evaluator
  suspicious_spans: z.array(z.string().max(300)).max(5),
});

export const PitchExtract = z.object({
  vendor_name_candidates: z.array(z.string().max(120)).max(5),
  domains: z.array(z.string().max(253)).max(5),
  /* Postal/street addresses the text presents as the vendor's own (HQ,
     offices). Tying-signal input only: an address can corroborate that a
     registry record belongs to this vendor. Verbatim-guarded by the caller
     like customers and claims. Default keeps extracts and checkpoints
     stored before the field existed parsing. */
  addresses: z.array(z.string().max(160)).max(6).default([]),
  sender_email: z.string().max(254).nullable(),
  people: z
    .array(z.object({ name: z.string().max(120), title: z.string().max(160) }))
    .max(10),
  named_customers: z.array(z.string().max(160)).max(15),
  claims: z.array(Claim).max(30),
  use_case_description: z.string().max(600),
  urgency_language: z.array(z.string().max(200)).max(5),
  state_mentioned: z.string().max(2).nullable(), // two-letter code if any
  injection_screen: InjectionScreen,
});
export type PitchExtract = z.infer<typeof PitchExtract>;

/* ------------------------------------------------------------- S2 registry */

export const CheckStatus = z.enum([
  "hit", // record found
  "definitive_miss", // a real search ran and returned empty
  "coverage_limited", // source unreachable / paid / blocks automation — NEVER adverse
  "error", // transient failure — treated as coverage_limited in output
  "not_applicable",
]);
export type CheckStatus = z.infer<typeof CheckStatus>;

export const MatchConfidence = z.enum(["exact", "name_similarity"]);
export type MatchConfidence = z.infer<typeof MatchConfidence>;

/* ------------------------------------------------------------ tying signals */

/* A registry record under a matching name is a CANDIDATE until a second
   detail ties it to this vendor (methodology D1.1 attribution rule).
   Signals are computed record-side in identity-ties.ts: a fact captured
   from the official record compared against vendor-side facts already
   inside the typed stage boundaries. Strength policy (2026-08-31):
   officer / address / domain / feed_product / full_legal_name are strong;
   a bare state match is weak. Adverse findings arm only on strong ties;
   favorable identity accepts any tie. */
export const TieKind = z.enum([
  "officer", // record's officer/agent named in pitch, site, or class 1-2 coverage
  "address", // record's street or city+state on the vendor's own materials
  "state", // record's registration/formation state matches a claimed state
  "domain", // record names the vendor's registrable domain
  "feed_product", // compliance feed's own metadata names the vendor's product/domain
  "full_legal_name", // buyer submitted the record's full legal name, suffix included
]);
export type TieKind = z.infer<typeof TieKind>;

export const TieSignal = z.object({
  kind: TieKind,
  strength: z.enum(["strong", "weak"]),
  value: z.string().max(120), // the matched fact, for the record note
  vendor_source: z.enum(["pitch", "site", "coverage", "submitted_name"]),
});
export type TieSignal = z.infer<typeof TieSignal>;

export const TieEvidence = z.object({
  tied: z.boolean(),
  strong: z.boolean(),
  /* False when NO vendor-side fact was available to compare (thin pitch,
     unreachable site, no coverage): the record stays a candidate and the
     fairness guard keeps that from ever being adverse. */
  checkable: z.boolean(),
  signals: z.array(TieSignal).max(8),
  /* Methodology 1.7 age veto: the record was formed more than five years
     before the earliest year the run knows for the vendor (a stated
     founding year, or the registration year of the vendor's own domain).
     A weak tie cannot credit such a record; a strong tie still can.
     Optional so checks stored before the field existed still parse. */
  age_contradicted: z.boolean().optional(),
});
export type TieEvidence = z.infer<typeof TieEvidence>;

export const RegistryCheck = z.object({
  check_id: z.string().max(40), // e.g. "sam_entity", "edgar_fts", "sos_ny"
  source: z.string().max(120), // human-readable source name
  status: CheckStatus,
  summary: z.string().max(500), // plain-language result
  evidence_url: z.string().max(600).nullable(),
  confidence: MatchConfidence.nullable(),
  retrieved_at: z.string(), // ISO timestamp
  data: z.record(z.unknown()).nullable(), // raw structured payload (logged, not rendered)
  /* Attribution adjudication result for a hit (identity-ties.ts), written
     by the S2c step in the tail. Optional: checks stored before the field
     existed, and non-hit checks, omit it. */
  tie: TieEvidence.optional(),
  /* The adjudication verdict: "attributed" hits may mint identity and earn
     credit; "candidate" hits render as labeled candidate rows and never
     count for or against the vendor. Adverse findings additionally require
     a STRONG tie (read from `tie`). Absent on non-hit checks and on checks
     stored before the field existed — consumers treat absent as candidate,
     so an unadjudicated hit can never mint. */
  attribution: z.enum(["attributed", "candidate"]).optional(),
});
export type RegistryCheck = z.infer<typeof RegistryCheck>;

export const RegistryLedger = z.object({
  vendor_key: z.string().max(260),
  checks: z.array(RegistryCheck),
  /* Identity resolution: did deterministic checks converge on a real entity
     with at least two independent identifiers (registration + domain,
     EDGAR + registration, SAM + registration, ...)? */
  identity_resolved: z.boolean(),
  identifiers_found: z.array(z.string().max(200)),
});
export type RegistryLedger = z.infer<typeof RegistryLedger>;

/* -------------------------------------------------------------- S3 research */

/* Methodology 1.8: a publication date parsed by code from the page address
   or the search tool's page age ("YYYY-MM-DD" or "YYYY-MM"), null when
   neither carried one. Optional: older stored reports lack it. */
const PublishedAt = z.string().max(10).nullable().optional();


export const Citation = z.object({
  url: z.string().max(600),
  title: z.string().max(300).nullable(),
  cited_text: z.string().max(400).nullable(),
  retrieved_at: z.string(),
  /* Domain authority class assigned by application code (domain-classes.ts):
     1 = official/registry, 2 = independent press/archive,
     3 = vendor-controlled or unknown, 4 = PR wire / content farm.
     Only classes 1-2 can VERIFY a claim. */
  domain_class: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
  ]),
  /* Methodology 1.8 (citation-date.ts). Optional: checkpoints predating
     1.8 omit it. */
  published_at: PublishedAt,
});
export type Citation = z.infer<typeof Citation>;

export const ResearchOutput = z.object({
  narrative: z.string(),
  citations: z.array(Citation),
  partial: z.boolean(), // hit the time budget before finishing
});
export type ResearchOutput = z.infer<typeof ResearchOutput>;

/* ---------------------------------------------------- ADV findings (code-set) */

export const AdvCode = z.enum([
  "ADV-01", // hidden text present in the submitted artifact
  "ADV-02", // text addressed to AI evaluation systems
  "ADV-03", // invisible Unicode (tags, zero-width, bidi controls)
  "ADV-04", // planted-corroboration network (detected in adv-corroboration.ts)
]);
export type AdvCode = z.infer<typeof AdvCode>;

export const AdvFinding = z.object({
  code: AdvCode,
  detail: z.string().max(500),
  /* True for findings reported for transparency that never cap the
     verdict (hidden text on a URL submission that is neither
     instruction-like nor claim-bearing — ordinary web engineering).
     Absent means capping, so every stored report keeps its meaning. */
  informational: z.boolean().optional(),
});
export type AdvFinding = z.infer<typeof AdvFinding>;

/* ------------------------------------------------------------- S4 sector fit */

export const PackId = z.enum([
  "call-center",
  "document-processing",
  "eligibility-case-mgmt",
  "public-comms",
  "staff-productivity",
  "data-analytics",
  "public-safety-policing",
  "tax-revenue",
  "permitting-licensing",
]);
export type PackId = z.infer<typeof PackId>;

export const DecisionImpact = z.enum([
  "informational", // reference material, drafting help, analytics dashboards
  "advisory", // recommendations a person reviews before acting
  "determinative", // produces or heavily steers decisions about residents
]);
export type DecisionImpact = z.infer<typeof DecisionImpact>;

export const SectorContext = z.object({
  pack_ids: z.array(PackId).max(3),
  elevated: z.boolean(), // eligibility overlay or elevated-scrutiny rule fired
  overlay_reason: z.string().max(300).nullable(),
  state_items: z.array(z.string().max(400)).max(6), // "your state will require…"
  /* S4's read on how directly the product touches decisions about
     residents. Optional: older stored reports predate it, and code treats
     the `elevated` boolean as the floor either way. */
  decision_impact: DecisionImpact.optional(),
});
export type SectorContext = z.infer<typeof SectorContext>;

/* ------------------------------------------------------------- S5 synthesis */

export const Severity = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]);
export type Severity = z.infer<typeof Severity>;

export const EvidenceTier = z.enum(["T1", "T2", "T3", "T4"]);
export type EvidenceTier = z.infer<typeof EvidenceTier>;

export const LedgerResult = z.enum([
  "VERIFIED",
  "COULD_NOT_VERIFY",
  "OFFICIAL_RECORD_FOUND",
  "CONTRADICTED",
  "COVERAGE_LIMITED",
]);
export type LedgerResult = z.infer<typeof LedgerResult>;

export const Dimension = z.enum(["D1", "D2", "D3", "D4", "D5", "D6", "D7"]);
export type Dimension = z.infer<typeof Dimension>;

export const SourceRef = z.object({
  url: z.string().max(600),
  title: z.string().max(300).nullable(),
  retrieved_at: z.string(),
  published_at: PublishedAt,
});
export type SourceRef = z.infer<typeof SourceRef>;

export const LedgerRow = z.object({
  /* Stable semantic ids ("fedramp_marketplace", "cust-<slug>") sized for
     slugged subjects; QA expectations and drift reports key on them. */
  id: z.string().max(40),
  dimension: Dimension,
  claim_quote: z.string().max(400).nullable(), // the pitch language being tested
  what_checked: z.string().max(300),
  result: LedgerResult,
  evidence_tier: EvidenceTier,
  severity: Severity.nullable(), // only for adverse results
  /* 8 = the six SOS lanes plus up to two EDGAR checks on the identity
     miss row; every other row stays well under. */
  sources: z.array(SourceRef).max(8),
  note: z.string().max(700), // legal-safe sentence(s); linted
  methodology_ref: z.string().max(40), // anchor into /methodology, e.g. "d1-1-4"
  /* How the underlying record was matched to this vendor, when the row rests
     on a name-matched registry record. "name_similarity" rows carry the
     label into the UI so a favorable row never silently borrows a namesake's
     record (methodology: match confidence is displayed). Optional: rows not
     built from name matching, and reports stored before the field existed,
     omit it. */
  match_confidence: MatchConfidence.optional(),
  /* Attribution outcome for rows resting on a name-matched registry record:
     "attributed" = the record carries a tying signal connecting it to this
     vendor; "candidate" = a matching or similar name we could NOT tie —
     shown for review, earns no credit, drives no warning. Optional: rows
     not built from registry records, and older stored reports, omit it.
     After the tying-signal build, exact-but-untied is also a candidate, so
     match_confidence alone no longer encodes candidacy. */
  attribution: z.enum(["attributed", "candidate"]).optional(),
  /* "What this number implies": code-templated arithmetic unpacking a
     performance claim against the pitch's own stated basis (methodology
     D6.1 rider). Never model-phrased, never feeds the tier, never above
     the existing D6 severities. Optional: non-claim rows and older stored
     reports omit it. */
  implication: z.string().max(400).optional(),
});
export type LedgerRow = z.infer<typeof LedgerRow>;

export const VerdictTier = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);
export type VerdictTier = z.infer<typeof VerdictTier>;

export const TIER_LABELS: Record<number, string> = {
  0: "Not enough to evaluate",
  1: "Could not verify basic legitimacy",
  2: "Significant gaps to resolve before engaging",
  3: "Emerging vendor, proceed with structured caution",
  4: "Established vendor, ready for an informed conversation",
};

export const QuestionSource = z.enum(["gap", "pack", "claim", "core"]);

export const ReportQuestion = z.object({
  id: z.string().max(60), // pack question ids come from packs.gen.ts
  text: z.string().max(900),
  why: z.string().max(400),
  source: QuestionSource,
  /* Pack-authored "what a disqualifying answer looks like". Shown on
     screen only — deliberately excluded from the copy-as-email output. */
  red_flag: z.string().max(300).optional(),
});
export type ReportQuestion = z.infer<typeof ReportQuestion>;

export const HonestyStatus = z.enum([
  "pass",
  "flag",
  "could_not_check",
  "not_applicable",
]);

export const HonestyItem = z.object({
  check_id: z.string().max(40),
  label: z.string().max(160),
  status: HonestyStatus,
  reason: z.string().max(300).nullable(), // required when could_not_check
  /* Panel grouping (see honesty-groups.ts). Optional: reports stored before
     the field existed fall back to a status-derived default client-side. */
  group: z
    .enum(["flag", "checked", "needs_you", "unavailable", "not_applicable"])
    .optional(),
});
export type HonestyItem = z.infer<typeof HonestyItem>;

export const ManualCheck = z.object({
  id: z.string().max(40),
  label: z.string().max(160),
  instructions: z.string().max(600),
  link: z.string().max(600).nullable(),
  what_bad_looks_like: z.string().max(400),
});
export type ManualCheck = z.infer<typeof ManualCheck>;

/* A research finding that backs no ledger row: surfaced for the reader to
   follow up, never counted as evidence. Class 4 (PR wires) never appears. */
export const LeadRef = z.object({
  url: z.string().max(600),
  title: z.string().max(300).nullable(),
  retrieved_at: z.string(),
  source_class: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  note: z.string().max(200),
  published_at: PublishedAt,
  /* Set by code when the retrieved headline contains a word from the fixed
     dispute list (adverse-lexicon.ts). A keyword, never prose: the reader-
     facing label is a fixed sentence in the frontend, so no model text and
     no headline word reaches the report through this field. Orders the
     list; never a finding, never tier-bearing. Optional: older reports
     lack it. */
  flag: z.literal("adverse_headline").optional(),
});
export type LeadRef = z.infer<typeof LeadRef>;

export const Report = z.object({
  verdict: z.object({
    tier: VerdictTier,
    label: z.string().max(120),
    summary: z.string().max(600), // one plain-language paragraph
    checks_met: z.object({ met: z.number(), total: z.number() }),
    rationale: z.array(z.string().max(400)).max(8), // deterministic trigger log
  }),
  ledger: z.array(LedgerRow),
  green_flags: z.array(z.string().max(400)).max(15),
  adv_findings: z.array(AdvFinding).max(6),
  honesty_panel: z.array(HonestyItem),
  questions: z.array(ReportQuestion).max(16),
  manual_checks: z.array(ManualCheck).max(8),
  /* Optional: reports stored before this field exists lack it. */
  leads: z.array(LeadRef).max(8).optional(),
  /* Class 1-2 sources research retrieved that produced no row, no card, and
     no lead slot (structuring invariant: every class 1-2 citation is
     attached, a lead, or listed here — never silently dropped). Optional:
     older stored reports lack it. */
  unassessed_sources: z.array(SourceRef).max(12).optional(),
  next_steps: z.array(z.string().max(500)).max(8),
  sector: SectorContext,
  sources: z.array(SourceRef),
  review: z
    .object({
      reviewed: z.boolean(),
      model: z.string().max(60),
      adjustments: z.array(z.string().max(400)).max(10),
    })
    .nullable(),
  meta: z.object({
    generated_at: z.string(),
    expires_at: z.string(),
    methodology_version: z.string().max(20),
    pack_release: z.string().max(20),
    vendor_key: z.string().max(260),
    vendor_display_name: z.string().max(160),
    research_partial: z.boolean(),
    input_kind: z.enum(["paste", "pdf", "url", "name"]),
    /* Which web address the site checks ran against and where it came
       from (methodology 1.7): the buyer submitted it (url tab, or typed
       beside a name), the pitch stated it, or a name search found it.
       Optional: reports stored before the fields existed omit them. */
    assessed_domain: z.string().max(253).nullable().optional(),
    domain_source: z.enum(["submitted", "pitch", "discovered"]).nullable().optional(),
    /* Refused exact-name registry records this run found (a floor; see
       identity-ties.ts namesakeCensus). Stored on every run so the sweeps
       can measure whether the collision notice belongs on other input
       kinds too. */
    namesake_records: z.number().int().nonnegative().optional(),
  }),
});
export type Report = z.infer<typeof Report>;

/* ------------------------------------------------- pipeline event (progress) */

export const EvalStage = z.enum([
  "parse",
  "registry",
  "research",
  "packs",
  "synthesis",
  "review",
]);
export type EvalStage = z.infer<typeof EvalStage>;

export const EvalEvent = z.object({
  stage: EvalStage,
  kind: z.enum([
    "stage_start",
    "micro_finding",
    "check_result",
    "note",
    "done",
    "error",
  ]),
  label: z.string().max(300),
  check_id: z.string().max(40).nullable(),
  status: z.string().max(30).nullable(),
  evidence_url: z.string().max(600).nullable(),
});
export type EvalEvent = z.infer<typeof EvalEvent>;
