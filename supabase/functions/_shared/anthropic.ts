/*
  Pure request builders for every Anthropic call in the pipeline.

  Discipline (inherited from the firm's HCZ interpreter):
  - Builders are pure and unit-snapshot-tested: no fetch, no env, no clock.
  - cache_control sits ONLY on large stable prefixes (the S3 research system
    prompt; the S6 report block). Small prompts are cheaper uncached than the
    bookkeeping risk of a moved breakpoint.
  - The S3 tool array must remain byte-identical across pause_turn
    continuations or the prompt cache invalidates (and costs triple).
  - Model ids are pinned here, in one place.
*/
import { S1_SYSTEM, buildS1UserMessage } from "./prompts/s1-extract.ts";
import { S3_SYSTEM, buildS3UserMessage, type S3UserInput } from "./prompts/s3-research.ts";
import { S4_SYSTEM, buildS4UserMessage } from "./prompts/s4-classify.ts";
import { S5_SYSTEM, buildS5UserMessage, type S5UserInput } from "./prompts/s5-structure.ts";
import { S5R_SYSTEM, buildS5RUserMessage } from "./prompts/s5-review.ts";
import { S6_SYSTEM } from "./prompts/s6-chat.ts";
import { BLOCKED_SEARCH_DOMAINS } from "./domain-classes.ts";

export const MODELS = {
  extract: "claude-haiku-4-5",
  research: "claude-sonnet-5",
  classify: "claude-haiku-4-5",
  structure: "claude-haiku-4-5",
  review: "claude-fable-5",
  chat: "claude-haiku-4-5",
} as const;

/* ------------------------------------------------------------ JSON schemas
   Structured-output schemas (output_config.format). Constraints the API does
   not support (max lengths, patterns) are enforced afterwards by zod in
   schemas.ts — these schemas carry structure and enums only. */

const CLAIM_TYPES = [
  "identity",
  "customer",
  "compliance",
  "performance",
  "team",
  "pricing",
  "availability",
];

export const EXTRACT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "vendor_name_candidates",
    "domains",
    "sender_email",
    "people",
    "named_customers",
    "claims",
    "use_case_description",
    "urgency_language",
    "state_mentioned",
    "injection_screen",
  ],
  properties: {
    vendor_name_candidates: { type: "array", items: { type: "string" } },
    domains: { type: "array", items: { type: "string" } },
    sender_email: { type: ["string", "null"] },
    people: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "title"],
        properties: { name: { type: "string" }, title: { type: "string" } },
      },
    },
    named_customers: { type: "array", items: { type: "string" } },
    claims: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "type", "quote", "subject"],
        properties: {
          id: { type: "string" },
          type: { type: "string", enum: CLAIM_TYPES },
          quote: { type: "string" },
          subject: { type: ["string", "null"] },
        },
      },
    },
    use_case_description: { type: "string" },
    urgency_language: { type: "array", items: { type: "string" } },
    state_mentioned: { type: ["string", "null"] },
    injection_screen: {
      type: "object",
      additionalProperties: false,
      required: ["injection_suspected", "addressed_to_ai", "suspicious_spans"],
      properties: {
        injection_suspected: { type: "boolean" },
        addressed_to_ai: { type: "boolean" },
        suspicious_spans: { type: "array", items: { type: "string" } },
      },
    },
  },
} as const;

export const CLASSIFY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pack_ids", "overlay", "overlay_reason"],
  properties: {
    pack_ids: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "call-center",
          "document-processing",
          "eligibility-case-mgmt",
          "public-comms",
          "staff-productivity",
          "data-analytics",
        ],
      },
    },
    overlay: { type: "boolean" },
    overlay_reason: { type: ["string", "null"] },
  },
} as const;

export const STRUCTURE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["verdict_summary", "row_notes", "green_flags", "next_steps"],
  properties: {
    verdict_summary: { type: "string" },
    row_notes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "note"],
        properties: { id: { type: "string" }, note: { type: "string" } },
      },
    },
    green_flags: { type: "array", items: { type: "string" } },
    next_steps: { type: "array", items: { type: "string" } },
  },
} as const;

export const REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["approved", "issues", "verdict_summary_rewrite"],
  properties: {
    approved: { type: "boolean" },
    issues: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "target_row_id", "explanation", "replacement_note"],
        properties: {
          kind: {
            type: "string",
            enum: [
              "overclaim",
              "misread_evidence",
              "language",
              "fairness",
              "missed_contradiction",
              "other",
            ],
          },
          target_row_id: { type: ["string", "null"] },
          explanation: { type: "string" },
          replacement_note: { type: ["string", "null"] },
        },
      },
    },
    verdict_summary_rewrite: { type: ["string", "null"] },
  },
} as const;

/* ---------------------------------------------------------------- builders */

export interface AnthropicRequestBody {
  model: string;
  max_tokens: number;
  system: unknown;
  messages: { role: "user" | "assistant"; content: unknown }[];
  tools?: unknown[];
  output_config?: unknown;
  stream?: boolean;
}

export function buildExtractRequest(
  source: string,
  pitchText: string,
): AnthropicRequestBody {
  return {
    model: MODELS.extract,
    max_tokens: 4096,
    system: S1_SYSTEM,
    messages: [
      { role: "user", content: buildS1UserMessage(source, pitchText) },
    ],
    output_config: { format: { type: "json_schema", schema: EXTRACT_SCHEMA } },
  };
}

/* Research budget, quantized to exactly two buckets so the cross-run prompt
   cache splits at most once (the cache renders tools -> system -> messages,
   so a tool-array byte change is a full-rebuild event; within-run pause_turn
   caching is untouched because continuations reuse the same request object).
   The extended bucket exists for pitches naming many customers: the
   standard budget spread across all research objectives cannot individually
   search 4+ customers. */
export interface ResearchBudget {
  searches: number;
  fetches: number;
}

export function researchBudget(input: S3UserInput): ResearchBudget {
  return input.named_customers.length >= 4
    ? { searches: 20, fetches: 8 }
    : { searches: 12, fetches: 6 };
}

/* The S3 tool array — constructed once per request and reused byte-identical
   across pause_turn continuations.

   Deliberately the BASIC search/fetch variants, not the dynamic-filtering
   ones: dynamic filtering runs free server-side code execution between
   searches, and live-fire runs showed that loop consuming the entire
   400s function wall clock (7+ minutes of tool blocks, narrative never
   written). The basic variants keep each search a simple search, which is
   what a hard-deadlined pipeline can actually afford. */
export function researchTools(budget: ResearchBudget): unknown[] {
  return [
    {
      type: "web_search_20250305",
      name: "web_search",
      max_uses: budget.searches,
      blocked_domains: BLOCKED_SEARCH_DOMAINS,
    },
    {
      type: "web_fetch_20250910",
      name: "web_fetch",
      max_uses: budget.fetches,
      citations: { enabled: true },
      max_content_tokens: 15000,
    },
  ];
}

export function buildResearchRequest(input: S3UserInput): AnthropicRequestBody {
  const budget = researchBudget(input);
  return {
    model: MODELS.research,
    max_tokens: 8192,
    /* Research is mechanical evidence-gathering: verdicts are computed in
       code and the synthesis stage writes the report. Medium effort keeps
       the search loop moving (fewer, more consolidated thinking pauses
       between tool calls) — at default effort, live runs spiraled in
       thinking + result-filtering and never wrote their findings. */
    output_config: { effort: "medium" },
    system: [
      {
        type: "text",
        text: S3_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: researchTools(budget),
    messages: [
      {
        role: "user",
        /* The budget rides the user turn (cache-safe: S3_SYSTEM stays
           byte-identical) so the model can pace its searches. */
        content: buildS3UserMessage({ ...input, search_budget: budget.searches }),
      },
    ],
  };
}

/* Name-only website discovery: two basic searches on the cheap model, run
   through the same non-streaming pause_turn loop as research. The model
   only SEARCHES — the domain itself is picked by code (harvestCitations →
   inferPrimaryDomain), so narrative text can never nominate a site. */
export function buildDiscoveryRequest(names: string[]): AnthropicRequestBody {
  return {
    model: MODELS.extract,
    max_tokens: 1024,
    system:
      "Find the official website of the company named in the input. Use at most two web searches. Then state in one or two sentences which domain appears to be the company's own website, based only on what the searches returned. If the searches do not make it clear, say so plainly. Never guess a domain the searches did not surface.",
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 2,
        blocked_domains: BLOCKED_SEARCH_DOMAINS,
      },
    ],
    messages: [
      {
        role: "user",
        content: JSON.stringify({ vendor_name_candidates: names }),
      },
    ],
  };
}

/* pause_turn continuation: append the paused assistant content unmodified and
   re-send with the SAME system and tools objects. */
export function buildResearchContinuation(
  prev: AnthropicRequestBody,
  pausedAssistantContent: unknown,
): AnthropicRequestBody {
  return {
    ...prev,
    messages: [
      ...prev.messages,
      { role: "assistant", content: pausedAssistantContent },
    ],
  };
}

export function buildClassifyRequest(input: {
  use_case_description: string;
  claims: { type: string; quote: string }[];
  packs: { pack_id: string; pack_name: string; inclusion_test: string[] }[];
}): AnthropicRequestBody {
  return {
    model: MODELS.classify,
    max_tokens: 1024,
    system: S4_SYSTEM,
    messages: [{ role: "user", content: buildS4UserMessage(input) }],
    output_config: { format: { type: "json_schema", schema: CLASSIFY_SCHEMA } },
  };
}

export function buildStructureRequest(input: S5UserInput): AnthropicRequestBody {
  return {
    model: MODELS.structure,
    max_tokens: 8192,
    system: S5_SYSTEM,
    messages: [{ role: "user", content: buildS5UserMessage(input) }],
    output_config: { format: { type: "json_schema", schema: STRUCTURE_SCHEMA } },
  };
}

export function buildReviewRequest(reportJson: string): AnthropicRequestBody {
  return {
    model: MODELS.review,
    max_tokens: 4096,
    system: S5R_SYSTEM,
    messages: [{ role: "user", content: buildS5RUserMessage(reportJson) }],
    output_config: { format: { type: "json_schema", schema: REVIEW_SCHEMA } },
  };
}

export function buildChatRequest(
  reportJson: string,
  history: { role: "user" | "assistant"; content: string }[],
  message: string,
): AnthropicRequestBody {
  return {
    model: MODELS.chat,
    max_tokens: 800,
    system: [
      { type: "text", text: S6_SYSTEM },
      {
        type: "text",
        text: "REPORT JSON (your only source):\n" + reportJson,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [...history, { role: "user", content: message }],
  };
}
