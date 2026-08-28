/*
  Deterministic verdict-tier computation. The legal and security load-bearing
  wall: no LLM output can reach this module — it consumes only typed,
  code-produced inputs, and its decisions are logged as a rationale trail.

  Methodology rules implemented here (docs/methodology.md §3):
  - Tier 1 (the harshest verdict) requires >= 2 deterministic T1 trigger
    events, each anchored to a logged registry check. An LLM judgment can
    never assign Tier 1.
  - "Coverage-limited" never counts as "not found" (the Polimorphic rule):
    a registry we could not definitively search cannot produce a trigger.
  - ADV findings (adversarial-input detections) impose a tier CEILING —
    detection can lower, never raise, a verdict.
  - Absence of any single credential is never adverse on its own
    (small-vendor fairness rules, methodology §7).
  - Tier 0 (NR) beats a bad grade: insufficient input routes to
    "not enough to evaluate", never silently to Tier 1.
*/
import type { AdvFinding, VerdictTier } from "./schemas.ts";
import { TIER_LABELS } from "./schemas.ts";

/* A T1 trigger is a deterministic adverse event from a registry check where a
   DEFINITIVE search actually ran. Constructed only by pipeline code. */
export interface T1Trigger {
  trigger:
    | "no_registration_definitive" // definitive SoS/EDGAR sweep, vendor claims US entity, nothing found
    | "sam_exclusion_match" // exact-identity exclusion/debarment match
    | "compliance_registry_contradiction" // e.g. "FedRAMP Authorized" absent from the FedRAMP feed
    | "cooperative_contract_contradiction" // claimed co-op contract absent from the co-op's own list
    | "domain_age_contradiction_no_customers"; // domain age contradicts explicit claims AND zero verifiable customers
  check_id: string;
  detail: string;
  evidence_url: string | null;
}

export interface Finding {
  id: string;
  dimension: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  resolved: boolean; // true when later evidence resolved it
  detail: string;
}

export interface TierInputs {
  /* Could the pipeline even research this? False when the pitch contains no
     resolvable company name or domain (routes to Tier 0). */
  resolvable: boolean;
  /* Did deterministic checks converge on a real entity with >= 2 independent
     identifiers? */
  identity_resolved: boolean;
  t1_triggers: T1Trigger[];
  findings: Finding[];
  /* Dimensions (D1..D5) carrying at least one T1-verified green flag. */
  green_dimensions: string[];
  /* Startup calibration bar (methodology §7.2): at least one of SOC 2 Type I /
     named-auditor engagement / GovRAMP Snapshot / signed BAA-DPA history /
     one verifiable government customer or pilot. */
  startup_bar_met: boolean;
  adv_findings: AdvFinding[];
}

export interface TierDecision {
  tier: VerdictTier;
  label: string;
  rationale: string[];
  ceiling_applied: boolean;
  checks_met: { met: number; total: number };
}

/* ADV ceiling: any confirmed adversarial-input finding caps the verdict at
   Tier 2 — a pitch that tries to manipulate the evaluator cannot present as a
   vetted vendor, and the attempt itself is surfaced as a finding. */
const ADV_CEILING: VerdictTier = 2;

export function computeTier(inputs: TierInputs): TierDecision {
  const rationale: string[] = [];
  const unresolvedHigh = inputs.findings.filter(
    (f) => !f.resolved && (f.severity === "HIGH" || f.severity === "CRITICAL"),
  );

  const total = 7;
  let met = 0;
  if (inputs.identity_resolved) met += 2;
  met += Math.min(inputs.green_dimensions.length, 4);
  if (unresolvedHigh.length === 0) met += 1;
  met = Math.min(met, total);

  let tier: VerdictTier;

  if (!inputs.resolvable) {
    tier = 0;
    rationale.push(
      "The submission did not contain enough to research: no company name or website we could resolve to a candidate entity. This is not a negative finding.",
    );
  } else if (inputs.t1_triggers.length >= 2) {
    tier = 1;
    for (const t of inputs.t1_triggers) {
      rationale.push(
        `Deterministic trigger [${t.trigger}] from check ${t.check_id}: ${t.detail}`,
      );
    }
  } else if (!inputs.identity_resolved) {
    /* Entity did not resolve, but we don't have two deterministic triggers:
       insufficient evidence, not adverse — Tier 0 language with the document
       request list. */
    tier = 0;
    rationale.push(
      "Public-source searches did not converge on a registered legal entity for this vendor, and no definitive registry search contradicted the pitch. We could not complete an evaluation; ask the vendor for its legal entity name, state of registration, and website, then re-run.",
    );
  } else if (unresolvedHigh.length > 0) {
    tier = 2;
    for (const f of unresolvedHigh) {
      rationale.push(
        `Unresolved ${f.severity} finding in ${f.dimension}: ${f.detail}`,
      );
    }
  } else if (inputs.green_dimensions.length >= 3) {
    tier = 4;
    rationale.push(
      `Convergent verified evidence across ${inputs.green_dimensions.length} dimensions (${inputs.green_dimensions.join(", ")}) with no unresolved high-severity findings.`,
    );
  } else {
    tier = 3;
    rationale.push(
      inputs.startup_bar_met
        ? "Identity verified; no high-severity findings; the vendor meets the startup calibration bar. Early-stage is not a defect — the question pack below is calibrated to what a company this size should be able to produce."
        : "Identity verified with no high-severity findings, but public evidence of government delivery is thin. The question pack asks for the artifacts a vendor at this stage should be able to produce.",
    );
  }

  /* ADV ceiling — applied last, can only lower. */
  let ceiling_applied = false;
  if (inputs.adv_findings.length > 0 && tier > ADV_CEILING) {
    tier = ADV_CEILING;
    ceiling_applied = true;
    rationale.push(
      `Verdict capped: the submitted material contained ${inputs.adv_findings
        .map((a) => a.code)
        .join(", ")} (see adversarial-content findings). A pitch that attempts to influence automated evaluation cannot present as verified.`,
    );
  }

  return {
    tier,
    label: TIER_LABELS[tier],
    rationale,
    ceiling_applied,
    checks_met: { met, total },
  };
}
