/*
  Shared client for driving the live evaluate function from local Node
  scripts (eval-harness, QA runner). Token handling lives with the caller:
  the factory takes the tokens, callers decide where they come from.

  Every submit through this client is deliberate spend: the eval bypass
  header skips Turnstile, the gate, the per-IP cap, and the result caches.
  Rows created this way are publicly fetchable by UUID until deleted.
*/
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { UsageTotals } from "./qa-types.ts";

export const PROJECT = "eejzmwdjflltzthotean";
export const FUNCTIONS = `https://${PROJECT}.supabase.co/functions/v1`;
export const PUBLISHABLE = "sb_publishable_L5kB5mL8UXrvfYfz4Io3Yw_RW5-Ofbb";

/* Committed pitch fixtures; callers with private panels pass their own dir. */
export const DEFAULT_FIXTURES_DIR = fileURLToPath(
  new URL("../../tests/fixtures/pitches/", import.meta.url),
);

export function fixture(name: string, dir: string = DEFAULT_FIXTURES_DIR): string {
  return readFileSync(join(dir, name), "utf8");
}

/*
  PDF submission encoding contract (evaluate/index.ts + _shared/ingest-pdf.ts):
  - input_kind "pdf" carries the raw PDF bytes in `content` as plain base64
    (standard alphabet with padding; the server strips whitespace, then
    atob-decodes). NO data-URI prefix: "data:application/pdf;base64," would
    fail the decode and be rejected.
  - Gates: base64 length 100..8,400,000 chars (~6 MB decoded); decoded bytes
    must start with "%PDF-"; text layer must yield >= 40 chars across <= 25
    pages, else a 400 with a user-facing message.
  - An optional sibling `filename` field (truncated server-side to 160 chars)
    is stored in source metadata; the PDF binary itself is never stored.
*/
export function pdfFixtureBase64(name: string, dir: string = DEFAULT_FIXTURES_DIR): string {
  return readFileSync(join(dir, name)).toString("base64");
}

/* Sonnet-5 pricing ($/MTok): in 2, out 10, cache write 2.5e-6? Keep it to
   the dominant terms: tokens at blended rates + $10/1k searches. Estimate
   only — flagged as such in the output. */
export function estimateCost(u: UsageTotals): string {
  const dollars =
    (u.input_tokens / 1e6) * 2 +
    (u.cache_creation_input_tokens / 1e6) * 2.5 +
    (u.cache_read_input_tokens / 1e6) * 0.2 +
    (u.output_tokens / 1e6) * 10 +
    (u.web_search_requests / 1000) * 10;
  return `$${dollars.toFixed(2)}`;
}

export interface SubmitInput {
  input_kind: "paste" | "name" | "url" | "pdf";
  /* For "pdf": base64 per the contract above (see pdfFixtureBase64). */
  content: string;
  state?: string | null;
  filename?: string;
}

export interface TerminalResult {
  status: string;
  error: string | null;
}

export interface EvalClient {
  submit(input: SubmitInput, levelBody: Record<string, unknown>): Promise<string>;
  sql(query: string): Promise<Record<string, unknown>[]>;
  waitForTerminal(
    id: string,
    opts?: { deadlineMs?: number; pollIntervalMs?: number },
  ): Promise<TerminalResult>;
  estimateCost: typeof estimateCost;
}

export function createEvalClient(tokens: {
  evalToken: string;
  mgmtToken: string;
}): EvalClient {
  const { evalToken, mgmtToken } = tokens;

  async function submit(
    input: SubmitInput,
    levelBody: Record<string, unknown>,
  ): Promise<string> {
    const res = await fetch(`${FUNCTIONS}/evaluate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: PUBLISHABLE,
        authorization: `Bearer ${PUBLISHABLE}`,
        "x-eval-token": evalToken,
      },
      body: JSON.stringify({
        input_kind: input.input_kind,
        content: input.content,
        filename: input.filename,
        state: input.state ?? null,
        turnstile_token: null,
        client_token: randomUUID(),
        ...levelBody,
      }),
    });
    const data = (await res.json()) as { evaluation_id?: string; error?: string };
    if (!res.ok || !data.evaluation_id) {
      throw new Error(`submit failed (${res.status}): ${data.error}`);
    }
    return data.evaluation_id;
  }

  async function sql(query: string): Promise<Record<string, unknown>[]> {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT}/database/query`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${mgmtToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ query }),
      },
    );
    return (await res.json()) as Record<string, unknown>[];
  }

  /* Polls until the row reaches a terminal status or the deadline passes;
     the deadline is checked before each poll-interval sleep, so a run that
     is already terminal still costs one interval to observe. */
  async function waitForTerminal(
    id: string,
    opts?: { deadlineMs?: number; pollIntervalMs?: number },
  ): Promise<TerminalResult> {
    const deadline = Date.now() + (opts?.deadlineMs ?? 14 * 60_000);
    const interval = opts?.pollIntervalMs ?? 15_000;
    let last: TerminalResult = { status: "missing", error: null };
    for (;;) {
      if (Date.now() > deadline) break;
      await new Promise((r) => setTimeout(r, interval));
      const rows = await sql(
        `select status, error from evaluations where id = '${id}'`,
      );
      last = {
        status: String(rows[0]?.status ?? "missing"),
        error: rows[0]?.error == null ? null : String(rows[0].error),
      };
      if (["complete", "insufficient", "error"].includes(last.status)) break;
    }
    return last;
  }

  return { submit, sql, waitForTerminal, estimateCost };
}
