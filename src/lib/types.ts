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
}

export type InputKind = "paste" | "name";

export interface EvaluateRequest {
  input_kind: InputKind;
  content: string;
  state: string | null;
  turnstile_token: string | null;
  client_token: string;
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
