/*
  POST /gov-request-code — step one of the verified-government-email tier.
  A .gov/.mil address holder asks for a 6-digit code; we email it via Resend
  and store only hashes (email hash + peppered code hash), never the address.
  Turnstile + four layered rate caps, because this endpoint sends email.

  Ships dark: everything is refused until the GOV_VERIFY_ENABLED secret is
  set (unset it to close the tier without a deploy).
*/
import { createClient } from "@supabase/supabase-js";
import { clientIp, json, preflight } from "../_shared/http.ts";
import { verifyTurnstile } from "../_shared/turnstile.ts";
import { allow, dayKey, sha256Hex } from "../_shared/ratelimit.ts";
import {
  emailHash24,
  isAllowedGovDomain,
  normalizeGovEmail,
} from "../_shared/gov-email.ts";
import { sendCodeEmail } from "../_shared/resend.ts";

const CODE_TTL_MS = 10 * 60_000;

/* Rejection sampling keeps the 6-digit space unbiased: 2^32 is not a
   multiple of 10^6, so a raw modulo would favor low codes slightly. */
function randomCode(): string {
  const limit = 4_294_000_000; /* largest multiple of 1e6 at or below 2^32 */
  const buf = new Uint32Array(1);
  let v: number;
  do {
    crypto.getRandomValues(buf);
    v = buf[0];
  } while (v >= limit);
  return String(v % 1_000_000).padStart(6, "0");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SB_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "not configured" }, 503);
  if (!Deno.env.get("GOV_VERIFY_ENABLED")) {
    return json({ error: "Government email verification is not open yet." }, 503);
  }
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const tokenSecret = Deno.env.get("GOV_TOKEN_SECRET");
  if (!resendKey || !tokenSecret) return json({ error: "not configured" }, 503);
  /* Staging escape hatch only: comma-separated exact domains. Never set in
     production — the launch policy is strictly .gov/.mil. */
  const extraDomains = (Deno.env.get("GOV_EXTRA_DOMAINS") ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  const fromAddress = Deno.env.get("GOV_FROM_ADDRESS") || "verify@send.group17a.com";

  const body = (await req.json().catch(() => null)) as {
    email?: string;
    turnstile_token?: string | null;
  } | null;

  const email = normalizeGovEmail(String(body?.email ?? ""));
  if (!email) {
    return json({ error: "That does not look like a working email address." }, 400);
  }
  if (!isAllowedGovDomain(email, extraDomains)) {
    return json(
      { error: "That address does not end in .gov or .mil, the government domains this program covers." },
      400,
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const ip = clientIp(req);
  const ok = await verifyTurnstile(
    body?.turnstile_token ?? null,
    Deno.env.get("TURNSTILE_SECRET_KEY"),
    ip === "unknown" ? null : ip,
  );
  if (!ok) return json({ error: "verification failed" }, 403);

  /* Layered daily caps: per IP (one attacker), per email (one mailbox never
     gets flooded), per domain (one agency's mail server never gets flooded),
     and global (the Resend account itself). Checked in that order with
     short-circuiting, so a capped IP does not burn the wider budgets. */
  const ipHash = (await sha256Hex(ip)).slice(0, 24);
  const emailHash = await emailHash24(email);
  const domain = email.slice(email.lastIndexOf("@") + 1);
  const domainHash = (await sha256Hex(domain)).slice(0, 24);
  const withinCaps =
    (await allow(supabase, dayKey("govreq:ip", ipHash), 5)) &&
    (await allow(supabase, dayKey("govreq:em", emailHash), 3)) &&
    (await allow(supabase, dayKey("govreq:dom", domainHash), 50)) &&
    (await allow(supabase, dayKey("govreq:global", "all"), 80));
  if (!withinCaps) {
    return json(
      { error: "rate_limited", retry_hint: "Too many code requests for now. Try again tomorrow." },
      429,
    );
  }

  /* Peppered code hash: sha256(secret:emailHash:code). The pepper lives only
     in function secrets, so a database leak alone cannot brute-force the
     6-digit space offline. Upsert on email_hash: a new request replaces any
     pending code and resets the attempt counter. */
  const code = randomCode();
  const codeHash = await sha256Hex(`${tokenSecret}:${emailHash}:${code}`);
  const { error: upsertErr } = await supabase.from("gov_email_codes").upsert(
    {
      email_hash: emailHash,
      code_hash: codeHash,
      expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
      attempts: 0,
    },
    { onConflict: "email_hash" },
  );
  if (upsertErr) {
    console.error(`gov code upsert failed: ${upsertErr.message}`);
    return json({ error: "storage" }, 500);
  }

  const sent = await sendCodeEmail({ to: email, code, from: fromAddress }, resendKey);
  if (!sent) {
    return json(
      { error: "The code email could not be sent. Please try again in a few minutes." },
      502,
    );
  }

  return json({
    ok: true,
    message: "We sent a 6 digit code to your address. Enter it within 10 minutes.",
  });
});
