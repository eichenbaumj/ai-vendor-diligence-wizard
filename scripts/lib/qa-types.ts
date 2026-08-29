/*
  Shared result shapes for the QA harness. The assertion and drift engines
  are pure functions over these types plus the stored report/usage JSON,
  so they unit-test offline with zero spend.
*/
import type { Report } from "../../supabase/functions/_shared/schemas.ts";
import type { LevelName } from "./qa-panel-schema.ts";

/* The watchdog cron's exact error message (migrations/0003_deep_mode.sql).
   Matching it separates a platform sweep from a genuine pipeline failure. */
export const WATCHDOG_ERROR =
  "The check ran out of time partway through. Please run it again.";

export type TerminalSource =
  | "complete"
  | "insufficient"
  | "pipeline_error"
  | "watchdog"
  | "harness_timeout";

export interface UsageTotals {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  web_search_requests: number;
}

export interface LedgerMapEntry {
  result: string;
  evidence_tier: string | null;
  severity: string | null;
  methodology_ref: string;
}

export interface QaMetrics {
  tier: number | null;
  checks_met: { met: number; total: number } | null;
  verified_rows: number;
  green_flags: number;
  leads: number;
  research_partial: boolean | null;
  searches: number;
  est_cost_usd: number;
  deep: boolean;
  deep_handoff_failed: boolean;
  adv_codes: string[];
  pack_ids: string[];
  question_ids: string[];
  stages_ms: Record<string, number>;
}

export interface AssertionResult {
  /* e.g. "tier.never", "ledger.excl.presence", "deep.integrity",
     "lint.banned", "monotonic.tier", "status" */
  code: string;
  hardness: "hard" | "soft";
  pass: boolean;
  expected: string;
  actual: string;
  detail?: string;
}

export interface QaCell {
  entry_id: string;
  input_kind: string;
  level: LevelName;
  evaluation_id: string;
  terminal_source: TerminalSource;
  error: string | null;
  wall_s: number;
  metrics: QaMetrics;
  /* Keyed by ledger row id; methodology_ref rides in the entry. */
  ledger_map: Record<string, LedgerMapEntry>;
  assertions: AssertionResult[];
  /* Full report snapshot for offline re-analysis and drift diffing. */
  report_snapshot: Report | null;
  retried: boolean;
}

export interface QaRunFile {
  schema_version: 1;
  ran_at: string;
  git_head: string;
  methodology_version_live: string | null;
  panel_versions: Record<string, string>;
  cells: QaCell[];
  summary: {
    hard_failures: number;
    soft_failures: number;
    drift_items: number;
    est_cost_usd: number;
  };
}

export interface DriftItem {
  entry_id: string;
  level: LevelName;
  kind:
    | "tier"
    | "ledger_result"
    | "adv_codes"
    | "question_ids"
    | "pack_ids"
    | "searches"
    | "cost"
    | "methodology_version"
    | "cell_missing";
  before: string;
  after: string;
  detail?: string;
}
