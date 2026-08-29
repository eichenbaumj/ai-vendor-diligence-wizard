/*
  Sector pack type contract. packs/*.yaml files are validated against this
  shape (scripts/validate-packs.ts) and compiled into packs.gen.ts
  (scripts/build-packs.ts). See packs/pack-spec.md for authoring rules.
*/

/*
  Per-question selection metadata. Question SELECTION stays pure code
  (_shared/questions.ts): these fields are the typed, enum-constrained
  signals that code keys on — pack authors control tailoring from the YAML,
  and scripts/validate-packs.ts gates every field against the closed
  vocabularies (ClaimType in schemas.ts, FINDING_IDS in finding-ids.ts).
*/
export interface QuestionSelect {
  /* Member of the pack's default slate (3-6 per pack). */
  base?: boolean;
  /* Fires when the pitch carries >= 1 claim of a listed type. */
  claim_types?: (
    | "identity"
    | "customer"
    | "compliance"
    | "performance"
    | "team"
    | "pricing"
    | "availability"
  )[];
  /* Fires on an unresolved finding: exact id from FINDING_IDS, or the
     prefix form "perf-*". */
  finding_ids?: string[];
  /* Fires when the report runs under elevated scrutiny (D7.2). */
  elevated?: boolean;
  /* eligibility-case-mgmt only: merged into OTHER packs' reports when the
     eligibility overlay fires (the four D7.2 core questions). */
  overlay_core?: boolean;
  /* When present, the question is eligible only at these verdict tiers. */
  tiers?: (0 | 1 | 2 | 3 | 4)[];
  /* Ordering within a priority band; higher first. Default 0. */
  weight?: number;
}

export interface PackQuestion {
  id: string; // stable, e.g. "call-center-q01"
  question: string; // copy-paste-ready, sendable verbatim
  good_answer: string; // what a credible answer looks like
  red_flag: string; // what a disqualifying answer looks like
  source_url: string | null;
  select?: QuestionSelect; // absent = legacy pack; first 5 act as the base slate
}

export interface PackVendor {
  name: string;
  tier: "platform" | "integrator" | "specialist" | "startup-verified";
  one_liner: string;
  gov_evidence_url: string | null;
}

export interface PackFailureMode {
  title: string;
  description: string;
  named_incident: string; // no hypotheticals — every mode cites a real incident
  source_url: string;
}

export interface PackTrigger {
  claim_pattern: string; // plain-language description of the claim class
  threshold: string; // numeric or categorical threshold that flips skepticism
  why: string;
  source_url: string | null;
}

export interface PackDeployment {
  agency: string;
  vendor_stack: string;
  what: string;
  metric: string;
  metric_source_type:
    | "oversight"
    | "independent-press"
    | "government-page"
    | "vendor-reported";
  source_url: string;
}

export interface PackRegistry {
  name: string;
  url: string;
  what_it_proves: string;
}

export interface ElevatedRule {
  condition: string;
  action: string;
}

export interface SectorPack {
  pack_id: string;
  pack_name: string;
  definition: string; // markdown, <=120 words, includes what it is NOT
  inclusion_test: string[]; // 3-6 yes/no questions answerable from the pitch
  /* 5-15 lowercase domain terms. Code-side classifier fallback: when the S4
     model call fails or returns nothing, lexicon hits against the use-case
     description and claim quotes select packs — and an eligibility-lexicon
     hit can only ADD scrutiny (set elevated), never remove it. */
  signal_lexicon?: string[];
  scrutiny_tier: "standard" | "elevated";
  incumbent_landscape: string; // markdown, <=300 words
  established_vendors: PackVendor[];
  failure_modes: PackFailureMode[];
  skepticism_triggers: PackTrigger[];
  diligence_questions: PackQuestion[]; // 10-15
  elevated_scrutiny_rules: ElevatedRule[];
  reference_deployments: PackDeployment[];
  registries_to_check: PackRegistry[];
  legal_context: string; // markdown, date-stamped items
  realistic_pricing: string; // markdown
  last_updated: string; // ISO date
  refresh_cadence: "quarterly" | "monthly";
  known_gaps: string; // markdown — honest list of what the pack could not verify
}
