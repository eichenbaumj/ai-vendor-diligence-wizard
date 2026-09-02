/*
  Frontend type surface. Shared pipeline types are re-exported from the
  authoritative contract in supabase/functions/_shared/schemas.ts; UI-local
  shapes live here.
*/

export type {
  Report,
  EvalEvent,
  EvalStage,
  LedgerRow,
  LedgerResult,
  EvidenceTier,
  HonestyItem,
  ReportQuestion,
  ManualCheck,
  AdvFinding,
  SourceRef,
  LeadRef,
  SectorContext,
  VerdictTier,
  Severity,
  Dimension,
} from "@shared/schemas.ts";

export { TIER_LABELS } from "@shared/schemas.ts";

import type { EvalEvent, Report } from "@shared/schemas.ts";

/* Server-side evaluation status, as returned by get-evaluation. */
export type EvaluationStatus =
  | "queued"
  | "parsing"
  | "registry"
  | "research"
  | "synthesis"
  | "complete"
  | "insufficient"
  | "error";

/* An event row as stored/replayed by the backend (id + envelope). */
export interface StoredEvent {
  id: number;
  stage: string;
  kind: string;
  payload: EvalEvent;
}

/* Response of GET /get-evaluation. */
export interface GetEvaluationResponse {
  status: EvaluationStatus;
  events: StoredEvent[];
  report: Report | null;
  disputed: boolean;
  /* Human-readable reason recorded for insufficient outcomes. The same
     column stores raw exception text for status "error"; only render it
     for "insufficient". */
  error?: string | null;
  /* Preview builds only: the user pasted their own pitch but the live engine
     is not connected, so a sample report is shown instead. */
  mock_custom?: boolean;
}

/* Response of POST /evaluate. */
export interface EvaluateResponse {
  evaluation_id: string;
  cached: boolean;
  /* Monthly checks left for a verified government email, read from the
     x-gov-remaining response header. Null for anonymous callers. */
  gov_remaining?: number | null;
}

export type InputKind = "paste" | "name" | "pdf" | "url";

export interface EvaluateRequest {
  input_kind: InputKind;
  content: string;
  /* pdf submissions only: original filename, display metadata. */
  filename?: string;
  state: string | null;
  turnstile_token: string | null;
  client_token: string;
  /* Deep mode: an extended multi-lane research pass (pre-launch option). */
  deep?: boolean;
  /* Name-only checks: the vendor's web address, if the user knows it. The
     typed name still drives every registry search; the address pins the
     site checks (methodology 1.7). */
  website?: string;
}

/* What useEvaluation hands to the page. */
export interface EvaluationState {
  status: EvaluationStatus;
  events: StoredEvent[];
  report: Report | null;
  disputed: boolean;
  error: string | null;
  mockCustom: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}
