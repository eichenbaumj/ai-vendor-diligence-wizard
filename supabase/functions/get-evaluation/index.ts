/*
  GET /get-evaluation?id=<uuid> — status, event replay, and the report.
  The unguessable evaluation UUID is the read capability (RLS is deny-all;
  this function is the only read path). Powers both the initial page load
  (replay) and the polling fallback.
*/
import { createClient } from "@supabase/supabase-js";
import { json, preflight } from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "GET") return json({ error: "method" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "not configured" }, 503);

  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "bad id" }, 400);

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: evaluation } = await supabase
    .from("evaluations")
    .select("id, status, report, error, vendor_key, created_at, expires_at")
    .eq("id", id)
    .maybeSingle();
  if (!evaluation) return json({ error: "not found" }, 404);

  const { data: events } = await supabase
    .from("evaluation_events")
    .select("id, stage, kind, payload")
    .eq("evaluation_id", id)
    .order("id", { ascending: true })
    .limit(500);

  let disputed = false;
  if (evaluation.vendor_key) {
    const { data: dispute } = await supabase
      .from("vendor_disputes")
      .select("id")
      .eq("vendor_key", evaluation.vendor_key)
      .in("status", ["new", "under_review"])
      .limit(1)
      .maybeSingle();
    disputed = Boolean(dispute);
  }

  return json({
    status: evaluation.status,
    events: events ?? [],
    report: evaluation.report ?? null,
    error: evaluation.error ?? null,
    disputed,
  });
});
