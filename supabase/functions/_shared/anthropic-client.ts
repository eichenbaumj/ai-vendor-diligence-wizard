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

const ZERO_USAGE: Usage = {
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

export interface ResearchRunResult {
  narrative: string;
  citations: { url: string; title: string | null; cited_text: string | null }[];
  partial: boolean;
  usage: Usage;
  continuations: number;
}

/* Run the S3 research request with the pause_turn loop: re-send paused
   assistant content unmodified (byte-identical tools) up to maxContinuations
   times, respecting an overall deadline. */
export async function runResearchLoop(
  initial: AnthropicRequestBody,
  opts: CallOpts & { deadlineMs: number; maxContinuations?: number },
): Promise<ResearchRunResult> {
  const start = Date.now();
  const maxCont = opts.maxContinuations ?? 4;
  let req = initial;
  let usage = ZERO_USAGE;
  let continuations = 0;
  let content: ContentBlock[] = [];

  for (;;) {
    const remaining = opts.deadlineMs - (Date.now() - start);
    if (remaining < 10_000) {
      return { ...collect(content), partial: true, usage, continuations };
    }
    const res = await callAnthropic(req, {
      ...opts,
      timeoutMs: Math.min(opts.timeoutMs, remaining),
    });
    usage = addUsage(usage, res.usage);
    if (!res.ok) {
      /* Research failure is survivable: the report degrades to registry-only
         with research_partial = true. */
      return { ...collect(content), partial: true, usage, continuations };
    }
    content = res.content ?? [];
    if (res.stop_reason === "pause_turn" && continuations < maxCont) {
      continuations += 1;
      req = buildResearchContinuation(req, content);
      continue;
    }
    return {
      ...collect(content),
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
