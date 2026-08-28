/*
  Typed API layer over the three edge functions, mock-aware. In mock mode
  every call routes to the in-browser driver in mock.ts.
*/
import { FUNCTIONS_BASE, IS_MOCK, SUPABASE_ANON_KEY } from "@/lib/config";
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
  state: string | null;
  turnstile_token: string | null;
  sampleId?: SampleId;
}): Promise<EvaluateResponse> {
  if (IS_MOCK) {
    const evaluation_id = startMockEvaluation({
      sampleId: params.sampleId,
      content: params.content,
    });
    return { evaluation_id, cached: false };
  }

  const body: EvaluateRequest = {
    input_kind: params.input_kind,
    content: params.content,
    state: params.state,
    turnstile_token: params.turnstile_token,
    client_token: getClientToken(),
  };

  const res = await fetch(`${FUNCTIONS_BASE}/evaluate`, {
    method: "POST",
    headers: baseHeaders(),
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      retry_hint?: string;
    };
    throw new ApiError(
      429,
      data.error ?? "Too many checks right now.",
      data.retry_hint ?? "Please wait a minute and try again.",
    );
  }
  if (res.status === 503) {
    throw new ApiError(
      503,
      "The service is at capacity right now.",
      "Please try again in a few minutes.",
    );
  }
  if (!res.ok) {
    throw new ApiError(res.status, `The check could not start (error ${res.status}).`);
  }
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
  if (!res.ok) {
    throw new ApiError(res.status, `Could not load the check (error ${res.status}).`);
  }
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
  if (res.status === 429) {
    throw new ApiError(429, "You have used all the questions for this report.");
  }
  if (!res.ok || !res.body) {
    throw new ApiError(res.status, `Chat is not responding (error ${res.status}).`);
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
