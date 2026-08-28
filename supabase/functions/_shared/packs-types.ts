/*
  Sector pack type contract. packs/*.yaml files are validated against this
  shape (scripts/validate-packs.ts) and compiled into packs.gen.ts
  (scripts/build-packs.ts). See packs/pack-spec.md for authoring rules.
*/

export interface PackQuestion {
  id: string; // stable, e.g. "call-center-q01"
  question: string; // copy-paste-ready, sendable verbatim
  good_answer: string; // what a credible answer looks like
  red_flag: string; // what a disqualifying answer looks like
  source_url: string | null;
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
