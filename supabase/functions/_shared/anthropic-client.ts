/*
  Thin Anthropic Messages client: raw fetch, no SDK (dependency-free in the
  edge runtime, per the firm's HCZ pattern). Handles timeouts, refusal
  stop_reason, error-body preservation, usage telemetry, and the pause_turn
  loop for the research stage.
*/
import type { AnthropicRequestBody } from "./anthropic.ts";
import { buildResearchContinuation } from "./anthropic.ts";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

export interface Usage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  web_search_requests: number;
}

export interface AnthropicResult {
  ok: boolean;
  status: number;
  stop_reason?: string;
  content?: ContentBlock[];
  usage: Usage;
  error?: string; // truncated upstream detail, safe to log
}

export interface ContentBlock {
  type: string;
  text?: string;
  citations?: {
    type?: string;
    url?: string;
    title?: string;
    cited_text?: string;
  }[];
  [k: string]: unknown;
}

export interface CallOpts {
  apiKey: string;
  timeoutMs: number;
  fetchFn?: typeof fetch;
}

export const ZERO_USAGE: Usage = {
  input_tokens: 0,
  output_tokens: 0,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
  web_search_requests: 0,
};

function parseUsage(raw: unknown): Usage {
  const u = (raw ?? {}) as Record<string, unknown>;
  const server = (u.server_tool_use ?? {}) as Record<string, unknown>;
  return {
    input_tokens: Number(u.input_tokens ?? 0),
    output_tokens: Number(u.output_tokens ?? 0),
    cache_creation_input_tokens: Number(u.cache_creation_input_tokens ?? 0),
    cache_read_input_tokens: Number(u.cache_read_input_tokens ?? 0),
    web_search_requests: Number(server.web_search_requests ?? 0),
  };
}

export function addUsage(a: Usage, b: Usage): Usage {
  return {
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
    cache_creation_input_tokens:
      a.cache_creation_input_tokens + b.cache_creation_input_tokens,
    cache_read_input_tokens:
      a.cache_read_input_tokens + b.cache_read_input_tokens,
    web_search_requests: a.web_search_requests + b.web_search_requests,
  };
}

export async function callAnthropic(
  body: AnthropicRequestBody,
  opts: CallOpts,
): Promise<AnthropicResult> {
  const f = opts.fetchFn ?? globalThis.fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    const res = await f(API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "x-api-key": opts.apiKey,
        "anthropic-version": API_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      /* Keep the upstream error body: Anthropic error bodies name the request
         field at fault (our params, never user text) and losing them makes
         incidents undiagnosable from the logs. */
      const detail = (await res.text().catch(() => "")).slice(0, 800);
      console.error(`anthropic upstream ${res.status}: ${detail}`);
      return { ok: false, status: res.status, usage: ZERO_USAGE, error: detail };
    }
    const msg = (await res.json()) as {
      stop_reason?: string;
      content?: ContentBlock[];
      usage?: unknown;
    };
    const usage = parseUsage(msg.usage);
    console.log(
      `anthropic usage model=${body.model} in=${usage.input_tokens} out=${usage.output_tokens} cache_write=${usage.cache_creation_input_tokens} cache_read=${usage.cache_read_input_tokens} searches=${usage.web_search_requests}`,
    );
    if (msg.stop_reason === "refusal") {
      return { ok: false, status: 200, usage, error: "refusal", stop_reason: "refusal" };
    }
    return {
      ok: true,
      status: 200,
      stop_reason: msg.stop_reason,
      content: msg.content ?? [],
      usage,
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`anthropic call failed after ${opts.timeoutMs}ms: ${detail}`);
    return { ok: false, status: 0, usage: ZERO_USAGE, error: detail };
  } finally {
    clearTimeout(timer);
  }
}

/* Extract the first structured-output object (json_schema responses return it
   as the message text). */
export function parseStructured<T>(result: AnthropicResult): T | null {
  const text = (result.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("");
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    console.error(`unparseable structured output: ${text.slice(0, 300)}`);
    return null;
  }
}

/*
  Streaming variant for long agentic turns (the research pass): a 15-25
  search server-side loop can run minutes in one turn, and a non-streaming
  request gives no signal until it completes. Streaming replaces the hard
  total timeout with an idle timeout (abort only when no bytes arrive), and
  the content blocks are reconstructed faithfully from SSE events — including
  encrypted search-result blocks — so pause_turn continuations still work.
*/
export async function streamAnthropic(
  body: AnthropicRequestBody,
  opts: CallOpts & { idleTimeoutMs?: number; deadlineMs?: number },
): Promise<AnthropicResult> {
  const f = opts.fetchFn ?? globalThis.fetch;
  const idleMs = opts.idleTimeoutMs ?? 60_000;
  const started = Date.now();
  const controller = new AbortController();
  let idleTimer = setTimeout(() => controller.abort(), idleMs);
  const bump = () => {
    clearTimeout(idleTimer);
    const remaining =
      opts.deadlineMs != null ? opts.deadlineMs - (Date.now() - started) : Infinity;
    if (remaining <= 0) {
      controller.abort();
      return;
    }
    idleTimer = setTimeout(() => controller.abort(), Math.min(idleMs, remaining));
  };

  const content: ContentBlock[] = [];
  const partialJson: Record<number, string> = {};
  let stopReason: string | undefined;
  let usage: Usage = { ...ZERO_USAGE };

  try {
    const res = await f(API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "x-api-key": opts.apiKey,
        "anthropic-version": API_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({ ...body, stream: true }),
    });
    if (!res.ok || !res.body) {
      const detail = (await res.text().catch(() => "")).slice(0, 800);
      console.error(`anthropic stream upstream ${res.status}: ${detail}`);
      return { ok: false, status: res.status, usage, error: detail };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bump();
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        let ev: Record<string, unknown>;
        try {
          ev = JSON.parse(payload);
        } catch {
          continue;
        }
        const type = ev.type as string;
        if (type === "message_start") {
          const msg = ev.message as { usage?: unknown } | undefined;
          if (msg?.usage) usage = addUsage(usage, parseUsage(msg.usage));
        } else if (type === "content_block_start") {
          const index = ev.index as number;
          content[index] = { ...(ev.content_block as ContentBlock) };
          if (content[index].type === "text" && content[index].text == null) {
            content[index].text = "";
          }
        } else if (type === "content_block_delta") {
          const index = ev.index as number;
          const block = content[index];
          const delta = ev.delta as Record<string, unknown>;
          if (!block || !delta) continue;
          if (delta.type === "text_delta") {
            block.text = (block.text ?? "") + String(delta.text ?? "");
          } else if (delta.type === "input_json_delta") {
            partialJson[index] =
              (partialJson[index] ?? "") + String(delta.partial_json ?? "");
          } else if (delta.type === "citations_delta") {
            const citation = delta.citation as NonNullable<
              ContentBlock["citations"]
            >[number];
            block.citations = [...(block.citations ?? []), citation];
          }
        } else if (type === "content_block_stop") {
          const index = ev.index as number;
          if (partialJson[index] !== undefined && content[index]) {
            try {
              content[index].input = JSON.parse(partialJson[index] || "{}");
            } catch {
              /* leave raw */
            }
            delete partialJson[index];
          }
        } else if (type === "message_delta") {
          const delta = ev.delta as { stop_reason?: string } | undefined;
          if (delta?.stop_reason) stopReason = delta.stop_reason;
          if (ev.usage) usage = addUsage(usage, parseUsage(ev.usage));
        }
      }
    }

    console.log(
      `anthropic stream usage model=${body.model} in=${usage.input_tokens} out=${usage.output_tokens} cache_write=${usage.cache_creation_input_tokens} cache_read=${usage.cache_read_input_tokens} searches=${usage.web_search_requests} elapsed=${Date.now() - started}ms`,
    );
    if (stopReason === "refusal") {
      return { ok: false, status: 200, usage, error: "refusal", stop_reason: stopReason };
    }
    return {
      ok: true,
      status: 200,
      stop_reason: stopReason,
      content: content.filter(Boolean),
      usage,
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(
      `anthropic stream aborted after ${Date.now() - started}ms with ${content.filter(Boolean).length} blocks collected: ${detail}`,
    );
    /* A deadline abort mid-turn still carries real streamed findings; hand
       them back so the pipeline degrades to a partial report instead of an
       empty one. */
    return {
      ok: false,
      status: 0,
      usage,
      error: detail,
      content: content.filter(Boolean),
    };
  } finally {
    clearTimeout(idleTimer);
  }
}

export interface ResearchRunResult {
  narrative: string;
  citations: { url: string; title: string | null; cited_text: string | null }[];
  partial: boolean;
  usage: Usage;
  continuations: number;
}

/* Run the S3 research request as NON-STREAMING pause_turn cycles.

   Why not one streamed turn: with server tools, a streamed turn never
   pauses — the server keeps searching, filtering, and thinking for as long
   as it likes, and the model writes its findings only at the end. Live-fire
   runs showed 7+ minutes of tool blocks with zero narrative text, which no
   edge-function wall clock survives. Non-streaming requests pause the
   server-side sampling loop every ~10 iterations (stop_reason pause_turn)
   and return the blocks generated so far, so the work arrives in bounded,
   salvageable chunks: whatever cycles complete are kept even if a later
   cycle times out.

   Continuations re-send the paused assistant content unmodified with a
   byte-identical tool array (also the prompt-cache-friendly shape). Content
   is accumulated across cycles so citations and narrative written in any
   cycle survive. */
export async function runResearchLoop(
  initial: AnthropicRequestBody,
  /* No timeoutMs: the per-cycle request timeout always derives from the
     remaining deadline (set below), so a passed value would be dead —
     and historically was passed and silently ignored. */
  opts: Omit<CallOpts, "timeoutMs"> & {
    deadlineMs: number;
    maxContinuations?: number;
  },
): Promise<ResearchRunResult> {
  const start = Date.now();
  const maxCont = opts.maxContinuations ?? 12;
  let req = initial;
  let usage = ZERO_USAGE;
  let continuations = 0;
  const allContent: ContentBlock[] = [];

  for (;;) {
    const remaining = opts.deadlineMs - (Date.now() - start);
    if (remaining < 15_000) {
      return { ...collect(allContent), partial: true, usage, continuations };
    }
    /* A cycle is ~10 server iterations; give it generous room but never the
       whole deadline, so one slow cycle cannot erase earlier cycles' work. */
    const res = await callAnthropic(req, {
      ...opts,
      timeoutMs: Math.min(180_000, remaining - 5_000),
    });
    usage = addUsage(usage, res.usage);
    if (!res.ok) {
      /* Research failure is survivable: return what earlier cycles produced
         and degrade to a partial report, never an empty one. */
      return { ...collect(allContent), partial: true, usage, continuations };
    }
    const cycleContent = res.content ?? [];
    allContent.push(...cycleContent);
    if (res.stop_reason === "pause_turn" && continuations < maxCont) {
      continuations += 1;
      req = buildResearchContinuation(req, cycleContent);
      continue;
    }
    return {
      ...collect(allContent),
      partial: res.stop_reason === "pause_turn",
      usage,
      continuations,
    };
  }
}

function collect(content: ContentBlock[]): {
  narrative: string;
  citations: { url: string; title: string | null; cited_text: string | null }[];
} {
  const narrativeParts: string[] = [];
  const citations: {
    url: string;
    title: string | null;
    cited_text: string | null;
  }[] = [];
  const seen = new Set<string>();
  for (const block of content) {
    if (block.type === "text" && typeof block.text === "string") {
      narrativeParts.push(block.text);
      for (const c of block.citations ?? []) {
        if (c.url && !seen.has(c.url)) {
          seen.add(c.url);
          citations.push({
            url: c.url,
            title: c.title ?? null,
            cited_text: c.cited_text ?? null,
          });
        }
      }
    }
  }
  return { narrative: narrativeParts.join(""), citations };
}
