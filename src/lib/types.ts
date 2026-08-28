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
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}
