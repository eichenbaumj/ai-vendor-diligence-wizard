/*
  POST /dispute — vendor dispute intake (the correction channel is a legal
  control, not a courtesy: methodology rule 10). Turnstile + rate limited.
*/
import { createClient } from "@supabase/supabase-js";
import { clientIp, json, preflight } from "../_shared/http.ts";
import { verifyTurnstile } from "../_shared/turnstile.ts";
import { allow, dayKey, sha256Hex } from "../_shared/ratelimit.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SB_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "not configured" }, 503);

  const body = (await req.json().catch(() => null)) as {
    vendor_key?: string;
    evaluation_id?: string | null;
    contact_email?: string;
    disputed_item?: string;
    vendor_statement?: string;
    evidence_url?: string | null;
    turnstile_token?: string | null;
  } | null;

  const vendorKey = (body?.vendor_key ?? "").trim().slice(0, 260);
  const email = (body?.contact_email ?? "").trim().slice(0, 254);
  const item = (body?.disputed_item ?? "").trim().slice(0, 2000);
  const statement = (body?.vendor_statement ?? "").trim().slice(0, 8000);
  if (!vendorKey || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !item || !statement) {
    return json({ error: "vendor, work email, the disputed item, and your statement are required" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const ip = clientIp(req);
  const ok = await verifyTurnstile(
    body?.turnstile_token ?? null,
    Deno.env.get("TURNSTILE_SECRET_KEY"),
    ip === "unknown" ? null : ip,
  );
  if (!ok) return json({ error: "verification failed" }, 403);

  const ipHash = (await sha256Hex(ip)).slice(0, 24);
  if (!(await allow(supabase, dayKey("dispute", ipHash), 5))) {
    return json({ error: "rate_limited" }, 429);
  }

  const evaluationId =
    body?.evaluation_id && /^[0-9a-f-]{36}$/i.test(body.evaluation_id)
      ? body.evaluation_id
      : null;
  const evidenceUrl =
    body?.evidence_url && /^https?:\/\//.test(body.evidence_url)
      ? body.evidence_url.slice(0, 600)
      : null;

  const { error } = await supabase.from("vendor_disputes").insert({
    vendor_key: vendorKey,
    evaluation_id: evaluationId,
    contact_email: email,
    disputed_item: item,
    vendor_statement: statement,
    evidence_url: evidenceUrl,
  });
  if (error) {
    console.error(`dispute insert failed: ${error.message}`);
    return json({ error: "storage" }, 500);
  }

  return json({
    ok: true,
    message:
      "Received. A person reviews every dispute. While a dispute is open, affected reports show a disputed notice.",
  });
});
