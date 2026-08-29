/*
  Typed API layer over the three edge functions, mock-aware. In mock mode
  every call routes to the in-browser driver in mock.ts.
*/
import { FUNCTIONS_BASE, IS_MOCK, SUPABASE_ANON_KEY } from "@/lib/config";
import { mapApiError, type ApiSurface } from "@/lib/api-errors";
import type {
  EvaluateRequest,
  EvaluateResponse,
  GetEvaluationResponse,
  InputKind,
} from "@/lib/types";
import {
  getMockEvaluation,
  isMockEvaluationId,
  startMockEvaluation,
} from "@/lib/mock";
import { supabase } from "@/lib/supabase";
import type { SampleId } from "@/lib/sample-pitches";

/* ------------------------------------------------------------ client token */

const TOKEN_KEY = "vdw_client_token";
let inMemoryToken: string | null = null;

export function getClientToken(): string {
  if (inMemoryToken) return inMemoryToken;
  try {
    const existing = localStorage.getItem(TOKEN_KEY);
    if (existing) {
      inMemoryToken = existing;
      return existing;
    }
    const minted = crypto.randomUUID();
    localStorage.setItem(TOKEN_KEY, minted);
    inMemoryToken = minted;
    return minted;
  } catch {
    /* localStorage unavailable (private mode, blocked storage) */
    inMemoryToken = crypto.randomUUID();
    return inMemoryToken;
  }
}

/* ------------------------------------------------------------------ errors */

export class ApiError extends Error {
  status: number;
  retryHint: string | null;

  constructor(status: number, message: string, retryHint: string | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.retryHint = retryHint;
  }
}

async function throwMapped(res: Response, surface: ApiSurface): Promise<never> {
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    retry_hint?: string;
    detail?: string;
  };
  const friendly = mapApiError({
    status: res.status,
    code: data.error ?? null,
    retryHint: data.retry_hint ?? data.detail ?? null,
    surface,
  });
  throw new ApiError(res.status, friendly.headline, friendly.hint);
}

function baseHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...(SUPABASE_ANON_KEY
      ? {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        }
      : {}),
  };
}

/* ---------------------------------------------------------------- evaluate */

export async function evaluate(params: {
  input_kind: InputKind;
  content: string;
  filename?: string;
  state: string | null;
  turnstile_token: string | null;
  sampleId?: SampleId;
}): Promise<EvaluateResponse> {
  /* Sample pitches are fictional demos of the report format: they ALWAYS
     replay the pinned fixture, never the live engine (which would spend real
     research on a vendor that does not exist). Mock mode routes everything
     through the fixtures. */
  if (IS_MOCK || params.sampleId) {
    const evaluation_id = startMockEvaluation({
      sampleId: params.sampleId,
      content: params.content,
    });
    return { evaluation_id, cached: false };
  }

  const body: EvaluateRequest = {
    input_kind: params.input_kind,
    content: params.content,
    ...(params.filename ? { filename: params.filename } : {}),
    state: params.state,
    turnstile_token: params.turnstile_token,
    client_token: getClientToken(),
  };

  /* Pre-launch gate: ride the shared preview session's token when present
     (the evaluate function requires it while GATE_ENABLED is set). */
  const gateToken = supabase
    ? (await supabase.auth.getSession()).data.session?.access_token ?? null
    : null;
  const res = await fetch(`${FUNCTIONS_BASE}/evaluate`, {
    method: "POST",
    headers: {
      ...baseHeaders(),
      ...(gateToken ? { "x-gate-token": gateToken } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) await throwMapped(res, "evaluate");
  return (await res.json()) as EvaluateResponse;
}

/* ---------------------------------------------------------- get-evaluation */

export async function getEvaluation(id: string): Promise<GetEvaluationResponse> {
  if (IS_MOCK || isMockEvaluationId(id)) {
    const snapshot = getMockEvaluation(id);
    if (!snapshot) {
      throw new ApiError(404, "We could not find that check. It may have expired.");
    }
    return snapshot;
  }

  const res = await fetch(
    `${FUNCTIONS_BASE}/get-evaluation?id=${encodeURIComponent(id)}`,
    { headers: baseHeaders() },
  );
  if (res.status === 404) {
    throw new ApiError(404, "We could not find that check. It may have expired.");
  }
  if (!res.ok) await throwMapped(res, "get-evaluation");
  return (await res.json()) as GetEvaluationResponse;
}

/* -------------------------------------------------------------------- chat */

export interface ChatStreamResult {
  sessionId: string | null;
  turnsRemaining: number | null;
}

export class ChatUnavailableError extends Error {
  constructor() {
    super("Follow-up chat arrives with the pilot release.");
    this.name = "ChatUnavailableError";
  }
}

/*
  Streams a chat reply. Calls onDelta with each text chunk as it arrives and
  resolves with session metadata from the response headers. Throws
  ChatUnavailableError in mock mode or when the function is absent.
*/
export async function streamChat(
  params: {
    evaluation_id: string;
    session_id: string | null;
    message: string;
  },
  onDelta: (text: string) => void,
): Promise<ChatStreamResult> {
  if (IS_MOCK || isMockEvaluationId(params.evaluation_id)) {
    throw new ChatUnavailableError();
  }

  let res: Response;
  try {
    res = await fetch(`${FUNCTIONS_BASE}/chat`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({
        evaluation_id: params.evaluation_id,
        client_token: getClientToken(),
        session_id: params.session_id,
        message: params.message,
      }),
    });
  } catch {
    throw new ChatUnavailableError();
  }

  if (res.status === 404 || res.status === 503) {
    throw new ChatUnavailableError();
  }
  if (!res.ok) await throwMapped(res, "chat");
  if (!res.body) {
    throw new ApiError(res.status, "The answer did not come through.", "Please ask again in a moment.");
  }

  const sessionId = res.headers.get("x-session-id");
  const turnsHeader = res.headers.get("x-turns-remaining");
  const turnsRemaining = turnsHeader === null ? null : Number(turnsHeader);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    /* SSE framing: events separated by blank lines, data lines prefixed. */
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data) as { text?: string; delta?: string };
          onDelta(parsed.text ?? parsed.delta ?? "");
        } catch {
          onDelta(data);
        }
      }
    }
  }

  return {
    sessionId,
    turnsRemaining: Number.isNaN(turnsRemaining) ? null : turnsRemaining,
  };
}

/* ------------------------------------------------------------------ dispute */

export interface DisputeParams {
  vendor_key: string;
  evaluation_id?: string | null;
  contact_email: string;
  disputed_item: string;
  vendor_statement: string;
  evidence_url?: string | null;
  turnstile_token: string | null;
}

export async function submitDispute(params: DisputeParams): Promise<{ message: string }> {
  /* The preview build has no backend; behave like the live success path so
     the form is demonstrable. */
  if (IS_MOCK) {
    return {
      message:
        "Received. We review disputes within 5 business days. While a dispute is open, affected reports show a disputed notice.",
    };
  }

  const res = await fetch(`${FUNCTIONS_BASE}/dispute`, {
    method: "POST",
    headers: baseHeaders(),
    body: JSON.stringify(params),
  });

  if (!res.ok) await throwMapped(res, "dispute");
  const data = (await res.json()) as { message?: string };
  return {
    message:
      data.message ??
      "Received. We review disputes within 5 business days.",
  };
}
