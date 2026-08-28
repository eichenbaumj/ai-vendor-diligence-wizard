/*
  POST /chat — follow-up Q&A grounded in one completed report.

  Hard budgets, enforced server-side BEFORE any model call:
  - 10 turns per session, max_tokens 800 per turn
  - 2,000-character question cap
  - session token ceiling as a backstop (60k in / 8k out)
  The model gets NO tools; the report JSON (cached prefix) is its only world.
  Responds as a small SSE stream for frontend-contract compatibility.
*/
import { createClient } from "@supabase/supabase-js";
import { CORS_HEADERS, json, preflight } from "../_shared/http.ts";
import { buildChatRequest } from "../_shared/anthropic.ts";
import { callAnthropic } from "../_shared/anthropic-client.ts";

const MAX_TURNS = 10;
const MAX_QUESTION_CHARS = 2000;
const SESSION_INPUT_CAP = 60_000;
const SESSION_OUTPUT_CAP = 8_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!supabaseUrl || !serviceKey || !anthropicKey) {
    return json({ error: "not configured" }, 503);
  }

  const body = (await req.json().catch(() => null)) as {
    evaluation_id?: string;
    client_token?: string;
    session_id?: string | null;
    message?: string;
  } | null;
  const evaluationId = body?.evaluation_id ?? "";
  const clientToken = body?.client_token ?? "";
  const message = (body?.message ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(evaluationId) || !/^[0-9a-f-]{36}$/i.test(clientToken)) {
    return json({ error: "bad request" }, 400);
  }
  if (!message || message.length > MAX_QUESTION_CHARS) {
    return json({ error: `question must be 1 to ${MAX_QUESTION_CHARS} characters` }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: evaluation } = await supabase
    .from("evaluations")
    .select("id, client_token, report, status")
    .eq("id", evaluationId)
    .maybeSingle();
  if (!evaluation || evaluation.status !== "complete" || !evaluation.report) {
    return json({ error: "report not available" }, 404);
  }
  if (evaluation.client_token !== clientToken) {
    return json({ error: "chat is limited to the person who ran the check" }, 403);
  }

  /* Session lookup or creation. */
  let sessionId = body?.session_id ?? null;
  let session: { id: string; turns_used: number; input_tokens: number; output_tokens: number; exhausted: boolean } | null = null;
  if (sessionId && /^[0-9a-f-]{36}$/i.test(sessionId)) {
    const { data } = await supabase
      .from("chat_sessions")
      .select("id, turns_used, input_tokens, output_tokens, exhausted")
      .eq("id", sessionId)
      .eq("evaluation_id", evaluationId)
      .maybeSingle();
    session = data;
  }
  if (!session) {
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({ evaluation_id: evaluationId })
      .select("id, turns_used, input_tokens, output_tokens, exhausted")
      .single();
    if (error || !data) return json({ error: "session" }, 500);
    session = data;
    sessionId = data.id;
  }

  if (
    session.exhausted ||
    session.turns_used >= MAX_TURNS ||
    session.input_tokens > SESSION_INPUT_CAP ||
    session.output_tokens > SESSION_OUTPUT_CAP
  ) {
    await supabase.from("chat_sessions").update({ exhausted: true }).eq("id", sessionId);
    return json(
      { error: "session_limit", detail: "This session reached its limit. Run a fresh check to start another." },
      429,
    );
  }

  const { data: history } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("id", { ascending: true })
    .limit(2 * MAX_TURNS);

  const result = await callAnthropic(
    buildChatRequest(
      JSON.stringify(evaluation.report),
      (history ?? []) as { role: "user" | "assistant"; content: string }[],
      message,
    ),
    { apiKey: anthropicKey, timeoutMs: 30_000 },
  );

  if (!result.ok) {
    return json({ error: "upstream", detail: result.error?.slice(0, 200) }, 502);
  }
  const text = (result.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("")
    .trim();

  const turnsUsed = session.turns_used + 1;
  await Promise.all([
    supabase.from("chat_messages").insert([
      { session_id: sessionId, role: "user", content: message },
      { session_id: sessionId, role: "assistant", content: text },
    ]),
    supabase
      .from("chat_sessions")
      .update({
        turns_used: turnsUsed,
        input_tokens: session.input_tokens + result.usage.input_tokens,
        output_tokens: session.output_tokens + result.usage.output_tokens,
        exhausted: turnsUsed >= MAX_TURNS,
      })
      .eq("id", sessionId),
  ]);

  /* Small SSE stream: one delta event, then done. */
  const stream = [
    `data: ${JSON.stringify({ delta: text })}\n\n`,
    `data: [DONE]\n\n`,
  ].join("");
  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-store",
      "x-session-id": sessionId!,
      "x-turns-remaining": String(Math.max(0, MAX_TURNS - turnsUsed)),
      ...CORS_HEADERS,
      "access-control-expose-headers": "x-session-id, x-turns-remaining",
    },
  });
});
