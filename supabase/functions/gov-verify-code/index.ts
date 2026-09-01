/*
  POST /gov-verify-code — step two of the verified-government-email tier.
  Checks the emailed 6-digit code and, on a match, mints the stateless
  90-day credential (_shared/gov-token.ts) that unlocks 20 checks a month.

  Every failure mode (no pending code, expired, too many attempts, wrong
  code) returns ONE generic sentence, so the endpoint never confirms whether
  a given address has a pending code.
*/
import { createClient } from "@supabase/supabase-js";
import { clientIp, json, preflight } from "../_shared/http.ts";
import { allow, dayKey, sha256Hex } from "../_shared/ratelimit.ts";
import {
  emailHash24,
  isAllowedGovDomain,
  normalizeGovEmail,
} from "../_shared/gov-email.ts";
import { mintGovToken } from "../_shared/gov-token.ts";

const TOKEN_TTL_DAYS = 90;
const MAX_ATTEMPTS = 5;
const FAILURE =
  "That code did not match or has expired. Request a new code and try again.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SB_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "not configured" }, 503);
  if (!Deno.env.get("GOV_VERIFY_ENABLED")) {
    return json({ error: "Government email verification is not open yet." }, 503);
  }
  const tokenSecret = Deno.env.get("GOV_TOKEN_SECRET");
  if (!tokenSecret) return json({ error: "not configured" }, 503);
  const extraDomains = (Deno.env.get("GOV_EXTRA_DOMAINS") ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

  const body = (await req.json().catch(() => null)) as {
    email?: string;
    code?: string;
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
  const code = String(body?.code ?? "").trim();
  if (!/^\d{6}$/.test(code)) return json({ error: FAILURE }, 400);

  const supabase = createClient(supabaseUrl, serviceKey);
  const ip = clientIp(req);
  const ipHash = (await sha256Hex(ip)).slice(0, 24);
  if (!(await allow(supabase, dayKey("govver:ip", ipHash), 20))) {
    return json(
      { error: "rate_limited", retry_hint: "Too many code attempts for now. Try again tomorrow." },
      429,
    );
  }

  /* Atomic attempts increment FIRST (gov_code_attempt RPC, migration 0005),
     before any comparison: parallel guesses each consume an attempt, so the
     6-digit space can never be probed beyond MAX_ATTEMPTS per code. */
  const emailHash = await emailHash24(email);
  const { data, error } = await supabase.rpc("gov_code_attempt", {
    p_email_hash: emailHash,
  });
  if (error) {
    console.error(`gov code attempt rpc failed: ${error.message}`);
    return json({ error: FAILURE }, 400);
  }
  const row = (Array.isArray(data) ? data[0] : data) as {
    code_hash?: string;
    expires_at?: string;
    attempts?: number;
  } | undefined;
  if (!row?.code_hash || !row.expires_at || typeof row.attempts !== "number") {
    return json({ error: FAILURE }, 400);
  }
  if (row.attempts > MAX_ATTEMPTS) return json({ error: FAILURE }, 400);
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return json({ error: FAILURE }, 400);
  }

  /* Peppered-hash comparison via sha256 digests of both values (the
     constant-time pattern used for EVAL_BYPASS_TOKEN in evaluate). */
  const expected = await sha256Hex(`${tokenSecret}:${emailHash}:${code}`);
  if ((await sha256Hex(expected)) !== (await sha256Hex(row.code_hash))) {
    return json({ error: FAILURE }, 400);
  }

  /* Success: the code is single-use. Delete the row, mint the credential.
     The only durable trace is a monthly COUNTER (how many verifications
     succeeded — never who): identity stays write-free, keeping the
     published promise that the fingerprint cannot be turned back into an
     address. A counter failure never blocks the verification. */
  await supabase.from("gov_email_codes").delete().eq("email_hash", emailHash);
  const { error: counterErr } = await supabase.rpc("bump_gov_enrollment", {
    p_month: new Date().toISOString().slice(0, 7),
  });
  if (counterErr) console.error(`gov enrollment counter: ${counterErr.message}`);
  const expEpochSeconds = Math.floor(Date.now() / 1000) + TOKEN_TTL_DAYS * 86_400;
  const govToken = await mintGovToken(emailHash, expEpochSeconds, tokenSecret);

  return json({
    gov_token: govToken,
    expires_at: new Date(expEpochSeconds * 1000).toISOString(),
    message: "Verified. You now have 20 checks each month.",
  });
});
