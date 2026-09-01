/*
  POST /evaluate — the pipeline orchestrator.

  Foreground (< 2s): validate → Turnstile → name-cache lookup → rate limits
  (verified-gov monthly pool or anonymous per-IP daily cap) → insert
  evaluation → respond 202 with the evaluation id. Background (EdgeRuntime.waitUntil):
  S1 parse → S2 registry checks → S3 web research → S4 pack match →
  S5 synthesis (+ S5.5 adversarial review) → persist report. Every stage
  writes replayable events and broadcasts live progress.

  Runs on the Supabase Pro plan (400s wall clock). The research deadline
  is dynamic: whatever remains after the earlier stages, minus a reserve
  for synthesis and review (see the deadline formula at the S3 call).
*/
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CORS_HEADERS, clientIp, json, preflight } from "../_shared/http.ts";
import { verifyTurnstile } from "../_shared/turnstile.ts";
import {
  allow,
  allowWithRemaining,
  dayKey,
  monthKey,
  parseExemptIpHashes,
  sha256Hex,
} from "../_shared/ratelimit.ts";
import { verifyGovToken } from "../_shared/gov-token.ts";
import { makeEmitter, type Emitter } from "../_shared/broadcast.ts";
import { detectHiddenHtml, runForensics } from "../_shared/forensics.ts";
import {
  buildClassifyRequest,
  buildDiscoveryRequest,
  buildExtractRequest,
  buildResearchRequest,
  buildReviewRequest,
  buildStructureRequest,
  MODELS,
  type ResearchBudget,
  researchBudget,
} from "../_shared/anthropic.ts";
import {
  addUsage,
  callAnthropic,
  parseStructured,
  runResearchLoop,
  type Usage,
} from "../_shared/anthropic-client.ts";
import {
  type AdvFinding,
  EvalEvent,
  PitchExtract,
  type RegistryCheck,
  Report,
  type SectorContext,
  TIER_LABELS,
} from "../_shared/schemas.ts";
import { computeTier } from "../_shared/tier.ts";
import { assemble } from "../_shared/assemble.ts";
import { lintObject, lintText, looseQuoteInSource, looseText, tidyProse } from "../_shared/lint.ts";
import { harvestCitations } from "../_shared/harvest.ts";
import { fetchVendorSite } from "../_shared/ingest-site.ts";
import { isDegenerateExtract, mergeExtracts } from "../_shared/extract-merge.ts";
import { adjudicateChecks, buildTieCorpus } from "../_shared/identity-ties.ts";
import { inferPrimaryDomain } from "../_shared/domain-inference.ts";
import { isNamedOrganization, splitNameCandidates } from "../_shared/text-match.ts";
import { PROGRAMS, affirmsProgram } from "../_shared/claim-status.ts";
import {
  METHODOLOGY_VERSION,
  finishInsufficient,
  runPipelineTail,
} from "../_shared/pipeline-tail.ts";
import {
  UrlIngestError,
  fetchSubmittedUrl,
  htmlToText,
  normalizeSubmittedUrl,
} from "../_shared/ingest-url.ts";
import {
  PdfIngestError,
  analyzePdfItems,
  extractPdf,
  isPdfBytes,
} from "../_shared/ingest-pdf.ts";
import { detectPlantedCorroboration } from "../_shared/adv-corroboration.ts";
import { PACKS, PACK_RELEASE } from "../_shared/packs.gen.ts";
import { STATE_ITEMS } from "../_shared/state-items.ts";
import type { S5UserInput } from "../_shared/prompts/s5-structure.ts";
import * as registry from "../_shared/registry/index.ts";

const IP_DAILY_CAP = 3;
/* Verified-government-email tier: monthly, keyed to the email hash. */
const GOV_MONTHLY_CAP = 20;
const DEEP_IP_DAILY_CAP = 1;
const DEEP_GLOBAL_DAILY_CAP = 10;
const GLOBAL_DAILY_CAP = 400;
const RESULT_CACHE_DAYS = 30;

const STAGE_TIMEOUTS = {
  extract: 25_000,
  registryPerEndpoint: 8_000,
  /* Ceiling for the dynamic research deadline (see runPipeline). */
  research: 260_000,
  classify: 12_000,
  structure: 50_000,
  review: 40_000,
};

interface Env {
  supabaseUrl: string;
  serviceKey: string;
  anthropicKey: string;
  turnstileSecret?: string;
  apiKeys: Record<string, string>;
}

function readEnv(): Env | null {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  /* Prefer the new secret API key when set; the platform-injected legacy
     service-role JWT remains the fallback until legacy keys are disabled. */
  const serviceKey =
    Deno.env.get("SB_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!supabaseUrl || !serviceKey || !anthropicKey) return null;
  return {
    supabaseUrl,
    serviceKey,
    anthropicKey,
    turnstileSecret: Deno.env.get("TURNSTILE_SECRET_KEY"),
    apiKeys: {
      sam: Deno.env.get("SAM_GOV_API_KEY") ?? "",
      socrata: Deno.env.get("SOCRATA_APP_TOKEN") ?? "",
      edgar_user_agent: Deno.env.get("EDGAR_USER_AGENT") ?? "",
      github: Deno.env.get("GITHUB_TOKEN") ?? "",
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const env = readEnv();
  if (!env) return json({ error: "not configured" }, 503);

  const body = (await req.json().catch(() => null)) as {
    input_kind?: string;
    content?: string;
    filename?: string;
    state?: string | null;
    turnstile_token?: string | null;
    client_token?: string;
    deep?: boolean;
    power?: { searches?: number; fetches?: number };
  } | null;

  const inputKind = body?.input_kind;
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  const filename =
    typeof body?.filename === "string" ? body.filename.slice(0, 160) : null;
  const clientToken = body?.client_token ?? "";
  const KINDS = ["paste", "name", "pdf", "url"] as const;
  if (!KINDS.includes(inputKind as (typeof KINDS)[number])) {
    return json({ error: "input_kind must be paste, name, pdf, or url" }, 400);
  }
  if (inputKind === "paste" && (content.length < 40 || content.length > 40_000)) {
    return json({ error: "paste between 40 and 40,000 characters" }, 400);
  }
  if (inputKind === "name" && (content.length < 2 || content.length > 160)) {
    return json({ error: "vendor name between 2 and 160 characters" }, 400);
  }
  /* PDF arrives base64 in content: cheap length gate before any work.
     8,400,000 base64 chars is ~6 MB decoded. */
  if (inputKind === "pdf" && (content.length < 100 || content.length > 8_400_000)) {
    return json({ error: "upload a PDF smaller than 6 MB" }, 400);
  }
  if (inputKind === "url" && (content.length < 12 || content.length > 2_048)) {
    return json({ error: "submit a full https web address" }, 400);
  }
  if (!/^[0-9a-f-]{36}$/i.test(clientToken)) {
    return json({ error: "client_token required" }, 400);
  }
  const userState =
    typeof body?.state === "string" && /^[A-Z]{2}$/.test(body.state)
      ? body.state
      : null;

  const supabase = createClient(env.supabaseUrl, env.serviceKey);
  const ip = clientIp(req);

  /* Eval-harness bypass: one header, checked against a secret that is only
     set during evaluation windows (unset = this path is dead). Compared by
     hash so the check is constant-time. When valid: Turnstile, the gate,
     the per-IP cap, and the result cache are skipped, and the power/deep
     fields are honored. The GLOBAL daily cap still applies. */
  const evalSecret = Deno.env.get("EVAL_BYPASS_TOKEN") ?? "";
  const evalHeader = req.headers.get("x-eval-token") ?? "";
  const evalBypass = Boolean(
    evalSecret &&
      evalHeader &&
      (await sha256Hex(evalHeader)) === (await sha256Hex(evalSecret)),
  );

  /* Temporary pre-launch gate: when the GATE_ENABLED secret is set, the
     request must carry a valid Supabase Auth session token from the shared
     preview account. Built for deletion: unset the secret to open the
     tool; the frontend flag lives in src/lib/config.ts. */
  if (Deno.env.get("GATE_ENABLED") && !evalBypass) {
    const gateToken = req.headers.get("x-gate-token") ?? "";
    if (!gateToken) return json({ error: "locked" }, 403);
    const { data: gateData, error: gateErr } = await supabase.auth.getUser(gateToken);
    if (gateErr || !gateData?.user) return json({ error: "locked" }, 403);
  }

  const turnstileOk =
    evalBypass ||
    (await verifyTurnstile(
      body?.turnstile_token ?? null,
      env.turnstileSecret,
      ip === "unknown" ? null : ip,
    ));
  if (!turnstileOk) return json({ error: "verification failed, reload and retry" }, 403);

  /* Verified-government-email tier: a valid stateless credential (minted by
     gov-verify-code) switches the caller from the per-IP daily cap to a
     monthly cap keyed to the email hash. Any defect in the token just means
     "anonymous" (null) — never an error. */
  const govClaim = evalBypass
    ? null
    : await verifyGovToken(
        req.headers.get("x-gov-token"),
        Deno.env.get("GOV_TOKEN_SECRET") ?? "",
        new Date(),
      );

  const ipHash = (await sha256Hex(ip)).slice(0, 24);
  const deepRequested = body?.deep === true;

  /* Owner/reviewer exemption (RATE_EXEMPT_IP_HASHES secret): listed
     connections skip the per-IP daily and deep caps so the people running
     the pilot can test freely. Everything else still applies to them:
     Turnstile, the gate, and both GLOBAL caps, so a leaked hash cannot
     take the service past its spend guards. Hashes only; no raw IP is
     ever configured or stored. */
  const ipExempt = parseExemptIpHashes(
    Deno.env.get("RATE_EXEMPT_IP_HASHES"),
  ).has(ipHash);

  /* Name-only inputs have a known vendor key already — serve the result
     cache BEFORE any counter is touched, so a cache hit never consumes
     anyone's daily or monthly quota. Deep and harness runs are deliberate
     spend and never serve from cache. */
  if (inputKind === "name" && !deepRequested && !evalBypass) {
    const key = vendorKeyFromName(content);
    const cached = await findCached(supabase, key);
    if (cached) {
      return json(
        { evaluation_id: cached, cached: true },
        202,
        govClaim ? await govRemainingHeader(supabase, govClaim.emailHash24) : undefined,
      );
    }
  }

  /* Quota: verified government callers draw from the monthly pool; everyone
     else stays on the per-IP daily cap. A rate-limit RPC failure on the
     monthly pool falls through to the per-IP path (fail safe, never open). */
  let govRemaining: number | null = null;
  if (govClaim) {
    const monthly = await allowWithRemaining(
      supabase,
      monthKey("govmail", govClaim.emailHash24),
      GOV_MONTHLY_CAP,
    );
    if (monthly && !monthly.allowed) {
      return json(
        {
          error: "rate_limited",
          retry_hint:
            "You have used all 20 verified checks for this month. The count resets on the first of the month.",
        },
        429,
      );
    }
    if (monthly) govRemaining = monthly.remaining;
  }
  if (govRemaining === null && !evalBypass && !ipExempt) {
    if (!(await allow(supabase, dayKey("ip", ipHash), IP_DAILY_CAP))) {
      return json(
        {
          error: "rate_limited",
          retry_hint:
            "Daily limit reached for this connection. Government staff can verify a .gov email for 20 checks a month, or try again tomorrow.",
        },
        429,
      );
    }
  }
  if (!(await allow(supabase, dayKey("global", "all"), GLOBAL_DAILY_CAP))) {
    return json({ error: "capacity" }, 503);
  }

  /* Deep mode: user-facing while the DEEP_MODE_ENABLED secret is set
     (unset it to remove the feature without a deploy); harness runs may
     use it via the bypass regardless. Deep runs carry their own caps. */
  if (deepRequested && !Deno.env.get("DEEP_MODE_ENABLED") && !evalBypass) {
    return json({ error: "deep checks are not available right now" }, 400);
  }
  if (deepRequested && !evalBypass) {
    /* The per-connection deep cap honors the exemption; the GLOBAL deep
       cap never does — it is the spend guard. */
    if (!ipExempt && !(await allow(supabase, dayKey("deepip", ipHash), DEEP_IP_DAILY_CAP))) {
      return json(
        { error: "rate_limited", retry_hint: "One deep check per day per connection. Run a standard check, or try tomorrow." },
        429,
      );
    }
    if (!(await allow(supabase, dayKey("deepglobal", "all"), DEEP_GLOBAL_DAILY_CAP))) {
      return json({ error: "capacity" }, 503);
    }
  }
  const budgetOverride =
    evalBypass && body?.power && typeof body.power.searches === "number" && typeof body.power.fetches === "number"
      ? { searches: Math.min(64, body.power.searches), fetches: Math.min(24, body.power.fetches) }
      : undefined;

  /* Ingestion + forensics in the foreground (after Turnstile and the caps:
     no decoding or network I/O for unverified or capped requests). The
     stored pitch is always the normalized extracted text; PDF binaries are
     never stored. */
  let pitchSource = content;
  let rawHash = await sha256Hex(content);
  const ingestNotes: string[] = [];
  const ingestAdv: AdvFinding[] = [];
  let hiddenSpans: string[] = [];
  let sourceMeta: Record<string, unknown> = { kind: inputKind };

  if (inputKind === "pdf") {
    let bytes: Uint8Array;
    try {
      bytes = Uint8Array.from(atob(content.replace(/\s+/g, "")), (c) => c.charCodeAt(0));
    } catch {
      return json({ error: "that file does not look like a PDF" }, 400);
    }
    if (!isPdfBytes(bytes)) {
      return json({ error: "that file does not look like a PDF" }, 400);
    }
    let extracted;
    try {
      extracted = await extractPdf(bytes);
    } catch (err) {
      const message =
        err instanceof PdfIngestError ? err.message : "that file does not look like a readable PDF";
      return json({ error: message }, 400);
    }
    if (extracted.text.length < 40) {
      return json(
        { error: "this PDF has no selectable text, paste the pitch text instead" },
        400,
      );
    }
    const hidden = analyzePdfItems(extracted.items);
    if (hidden.finding) ingestAdv.push(hidden.finding);
    hiddenSpans = hidden.spans;
    pitchSource = extracted.text;
    rawHash = await sha256Hex(bytes);
    sourceMeta = { kind: "pdf", filename, pdf_pages: extracted.pages };
    ingestNotes.push(
      `Read ${extracted.pages === 1 ? "1 page" : `${extracted.pages} pages`} of text from the uploaded PDF.`,
    );
  } else if (inputKind === "url") {
    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeSubmittedUrl(content);
    } catch (err) {
      return json(
        { error: err instanceof UrlIngestError ? err.message : "submit a full https web address" },
        400,
      );
    }
    let page;
    try {
      page = await fetchSubmittedUrl(normalizedUrl);
    } catch (err) {
      return json(
        { error: err instanceof UrlIngestError ? err.message : "that page could not be fetched" },
        400,
      );
    }
    /* Hidden-text detection runs on the RAW html, before stripping. */
    const hidden = detectHiddenHtml(page.html);
    if (hidden.finding) ingestAdv.push(hidden.finding);
    hiddenSpans = hidden.spans;
    const text = htmlToText(page.html);
    if (text.length < 40) {
      return json({ error: "that address did not return a readable web page" }, 400);
    }
    pitchSource = text;
    rawHash = await sha256Hex(normalizedUrl);
    sourceMeta = {
      kind: "url",
      url: normalizedUrl,
      final_url: page.final_url,
      fetched_bytes: page.fetched_bytes,
    };
    const host = new URL(page.final_url).hostname;
    ingestNotes.push(
      `Fetched the page at ${host} (${Math.max(1, Math.round(page.fetched_bytes / 1024))} KB) and read its text.`,
    );
  }

  const forensics = runForensics(pitchSource);
  /* Ingest-detected findings (hidden HTML or PDF text) join the deterministic
     set; like every ADV path, detection only ever ADDS. */
  forensics.adv_findings.push(...ingestAdv);

  const { data: row, error: insErr } = await supabase
    .from("evaluations")
    .insert({
      client_token: clientToken,
      status: "queued",
      input_kind: inputKind,
      input_sha256: rawHash,
      pitch_raw: forensics.normalized,
      forensics: {
        adv: forensics.adv_findings,
        pii_scrubbed: forensics.pii_scrubbed,
        invisible_stripped: forensics.invisible_stripped,
        source: sourceMeta,
        ...(hiddenSpans.length > 0 ? { hidden_spans: hiddenSpans.slice(0, 10) } : {}),
      },
      user_state: userState,
      methodology_version: METHODOLOGY_VERSION,
      pack_release: PACK_RELEASE,
    })
    .select("id")
    .single();
  if (insErr || !row) {
    console.error(`insert failed: ${insErr?.message}`);
    return json({ error: "storage" }, 500);
  }
  const evaluationId = row.id as string;

  const pipeline = runPipeline(
    supabase,
    env,
    evaluationId,
    inputKind,
    forensics.normalized,
    forensics.adv_findings,
    userState,
    ingestNotes,
    inputKind === "url" && typeof sourceMeta.url === "string" ? sourceMeta.url : null,
    { deep: deepRequested, budgetOverride, skipCache: deepRequested || evalBypass },
  ).catch(async (err) => {
    console.error(`pipeline fatal for ${evaluationId}: ${String(err)}`);
    await supabase
      .from("evaluations")
      .update({ status: "error", error: String(err).slice(0, 500) })
      .eq("id", evaluationId);
  });

  const runtime = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } })
    .EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(pipeline);
  /* Without waitUntil (local dev without per_worker) the promise still runs. */

  return json(
    { evaluation_id: evaluationId, cached: false },
    202,
    govRemaining !== null ? { "x-gov-remaining": String(govRemaining) } : undefined,
  );
});

function vendorKeyFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(inc|llc|corp|co|ltd|pbc)\b/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-|-$/g, "");
}

async function findCached(
  supabase: SupabaseClient,
  vendorKey: string,
): Promise<string | null> {
  const cutoff = new Date(Date.now() - RESULT_CACHE_DAYS * 86_400_000).toISOString();
  const { data } = await supabase
    .from("evaluations")
    .select("id")
    .eq("vendor_key", vendorKey)
    .eq("status", "complete")
    .eq("methodology_version", METHODOLOGY_VERSION)
    .gt("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.id as string) ?? null;
}

/* Remaining monthly checks for a verified caller WITHOUT consuming one —
   used on cache hits, which are free. A read failure just omits the header. */
async function govRemainingHeader(
  supabase: SupabaseClient,
  emailHash24: string,
): Promise<Record<string, string> | undefined> {
  const { data, error } = await supabase
    .from("rate_limits")
    .select("count")
    .eq("key", monthKey("govmail", emailHash24))
    .maybeSingle();
  if (error) return undefined;
  const used = typeof data?.count === "number" ? data.count : 0;
  return { "x-gov-remaining": String(Math.max(0, GOV_MONTHLY_CAP - used)) };
}

/* ------------------------------------------------------------ the pipeline */

/* How each input kind is labeled to the quarantined extractor: source
   framing calibrates trust (research gap file, source-labeling rule). */
const S1_SOURCE_LABELS: Record<string, string> = {
  paste: "pasted vendor pitch from an unknown sender",
  pdf: "text extracted from a PDF file uploaded by the user, authored by an unknown vendor",
  url: "text extracted from the public web page at a URL the user submitted, authored by an unknown vendor",
};

async function runPipeline(
  supabase: SupabaseClient,
  env: Env,
  evaluationId: string,
  inputKind: "paste" | "name" | "pdf" | "url",
  pitchText: string,
  forensicAdv: AdvFinding[],
  userState: string | null,
  ingestNotes: string[] = [],
  /* The normalized submitted URL for url-kind runs (the site pass fetches
     more pages of that host). */
  sourceUrl: string | null = null,
  opts: { deep?: boolean; budgetOverride?: ResearchBudget; skipCache?: boolean } = {},
): Promise<void> {
  const pipelineStart = Date.now();
  const emitter = makeEmitter(supabase, env.supabaseUrl, env.serviceKey, evaluationId);
  const emit = (e: Partial<EvalEvent> & { stage: EvalEvent["stage"]; kind: EvalEvent["kind"]; label: string }) =>
    emitter.emit({
      check_id: null,
      status: null,
      evidence_url: null,
      ...e,
    } as EvalEvent);
  const setStatus = (status: string) =>
    supabase.from("evaluations").update({ status }).eq("id", evaluationId);

  const usageBox: { value: Usage } = {
    value: {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      web_search_requests: 0,
    },
  };
  const stageUsage: Record<string, Usage> = {};
  /* Wall-clock elapsed per stage (ms). Persisted alongside usage as
     stages_ms — kept OUT of `stages`, whose Usage shape feeds addUsage. */
  const stageMs: Record<string, number> = {};
  let stageMark = Date.now();
  const markStage = (name: string) => {
    stageMs[name] = Date.now() - stageMark;
    stageMark = Date.now();
  };

  /* ------------------------------------------------------------- S1 parse */
  await setStatus("parsing");
  await emit({ stage: "parse", kind: "stage_start", label: "Reading the pitch" });
  for (const note of ingestNotes) {
    await emit({ stage: "parse", kind: "micro_finding", label: note.slice(0, 300) });
  }

  let extract: PitchExtract;
  if (inputKind === "name") {
    extract = {
      vendor_name_candidates: [pitchText],
      domains: [],
      addresses: [],
      sender_email: null,
      people: [],
      named_customers: [],
      claims: [],
      use_case_description: "",
      urgency_language: [],
      state_mentioned: null,
      injection_screen: {
        injection_suspected: false,
        addressed_to_ai: false,
        suspicious_spans: [],
      },
    };
  } else {
    /* S1 extraction is nondeterministically flaky in two known ways: a
       ~1-in-5 refusal to parse injection-laden text, and a ~1-in-6 thin
       extract on PDF text layers (zero claims from a real pitch). One
       retry turns either into a completed run; a second thin result is
       accepted as genuine. Safety properties are unchanged: every attempt
       runs the same quarantined extractor, schema validation, and the
       verbatim guards below. */
    let extractOut: PitchExtract | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await callAnthropic(
        buildExtractRequest(S1_SOURCE_LABELS[inputKind] ?? S1_SOURCE_LABELS.paste, pitchText),
        { apiKey: env.anthropicKey, timeoutMs: STAGE_TIMEOUTS.extract },
      );
      usageBox.value = addUsage(usageBox.value, res.usage);
      stageUsage.s1 = stageUsage.s1 ? addUsage(stageUsage.s1, res.usage) : res.usage;
      const parsed = res.ok ? parseStructured<unknown>(res) : null;
      const validated = parsed ? PitchExtract.safeParse(parsed) : null;
      if (validated?.success) {
        if (!isDegenerateExtract(validated.data, pitchText.length)) {
          extractOut = validated.data;
          break;
        }
        extractOut ??= validated.data;
        console.warn(`s1 degenerate extract on attempt ${attempt + 1}, pitch length ${pitchText.length}`);
      } else {
        console.warn(`s1 parse failure on attempt ${attempt + 1}`);
      }
    }
    markStage("s1_extract");
    if (!extractOut) {
      await finishInsufficient(
        supabase,
        evaluationId,
        emit,
        "The pitch could not be parsed. Try pasting the plain text of the email.",
      );
      return;
    }
    extract = extractOut;
    /* Verbatim guards: the extractor sometimes misremembers a name or a
       quote ("Sarasun" for "Sarasota"), and a wrong name drives wrong
       searches and a mislabeled ledger row, while a drifted quote breaks
       the promise that claims are quoted verbatim. Keep only customers and
       claim quotes that actually appear in the pitch text. */
    const pitchLoose = looseText(pitchText);
    extract.named_customers = extract.named_customers
      .filter((c) => pitchLoose.includes(looseText(c)))
      /* Counts and descriptions ("1,600 governments") are scale claims, not
         customer names: no row, no finding, no search budget spent. */
      .filter(isNamedOrganization);
    extract.claims = extract.claims.filter((c) =>
      looseQuoteInSource(pitchLoose, c.quote),
    );
    /* Addresses feed tying signals, so a hallucinated address could tie a
       namesake record to this vendor. Keep only addresses that actually
       appear in the pitch text. */
    extract.addresses = extract.addresses.filter((a) =>
      pitchLoose.includes(looseText(a)),
    );
  }

  const vendorName = extract.vendor_name_candidates[0] ?? pitchText.slice(0, 60);
  /* URL-mode binds to the SUBMITTED domain (rule P1.6): a polco.us
     submission must key vendor_key, RDAP, and the site lanes to polco.us
     even when the page text names polco.com (the run 1 rebind defect).
     Putting the submitted host first also makes it the ADV-04 vendor-host
     exclusion's anchor. */
  if (inputKind === "url" && sourceUrl) {
    try {
      const submitted = new URL(sourceUrl).hostname.toLowerCase().replace(/^www\./, "");
      extract.domains = [
        submitted,
        ...extract.domains.filter((d) => d !== submitted),
      ].slice(0, 5);
    } catch {
      /* keep the extracted domains */
    }
  }
  const primaryDomain = extract.domains[0] ?? null;
  const vendorKey = primaryDomain ?? vendorKeyFromName(vendorName || "unknown");
  await supabase.from("evaluations").update({ vendor_key: vendorKey }).eq("id", evaluationId);
  await emit({
    stage: "parse",
    kind: "micro_finding",
    label: `Identified: ${vendorName}${primaryDomain ? ` (${primaryDomain})` : ""}`,
  });

  /* Model injection screen only ADDS findings (never removes deterministic ones). */
  const adv: AdvFinding[] = [...forensicAdv];
  if (
    (extract.injection_screen.injection_suspected ||
      extract.injection_screen.addressed_to_ai) &&
    !adv.some((a) => a.code === "ADV-02")
  ) {
    adv.push({
      code: "ADV-02",
      detail:
        "The intake screen found text in the pitch that appears aimed at automated evaluation systems. The analysis treats all pitch text as data.",
    });
  }

  /* Result cache for pasted pitches (vendor key only known after parse).
     Deep and harness runs never serve from cache. */
  const cachedId = opts.skipCache ? null : await findCached(supabase, vendorKey);
  if (cachedId && cachedId !== evaluationId && adv.length === 0) {
    const { data: cachedRow } = await supabase
      .from("evaluations")
      .select("report")
      .eq("id", cachedId)
      .single();
    if (cachedRow?.report) {
      await supabase
        .from("evaluations")
        .update({ report: cachedRow.report, status: "complete", usage: { cached_from: cachedId } })
        .eq("id", evaluationId);
      await emit({
        stage: "synthesis",
        kind: "done",
        label: "A recent report for this vendor already existed and was reused.",
      });
      return;
    }
  }

  const resolvable = Boolean(primaryDomain || (vendorName && vendorName.length > 2));
  if (!resolvable) {
    await finishInsufficient(
      supabase,
      evaluationId,
      emit,
      "No company name or website could be identified in the submission.",
    );
    return;
  }

  /* Compound names ("TrueTax by Govra") hide the registered company from
     every query: split into identity candidates (the company) and product
     names. Identity lanes query identityNames; product names additionally
     join feed/product matching; productTokens guard acceptance so a record
     named entirely from product-brand tokens ("TRUETAX INC") is never
     accepted as this vendor. The verbatim name stays candidates[0].
     (Names are pitch-only by construction, so this is safe to compute
     before the site merge below.) */
  const rawNames = extract.vendor_name_candidates.length
    ? extract.vendor_name_candidates
    : [vendorName];
  const split = splitNameCandidates(rawNames);
  const companyNames = split.identityNames;
  const productTokens = registry.productOnlyTokens(split.productNames, split.anchorNames);
  const feedNames = [...split.identityNames, ...split.productNames];
  /* Debarment queries: verbatim names plus multi-token company parts.
     Single-token fragments are never queried directly (a namesake exact
     match on the exclusion list would be a false CRITICAL); the resolved
     legal name follow-up below covers them. */
  const exclusionNames = [
    ...rawNames,
    ...split.anchorNames.filter(
      (n) => !rawNames.includes(n) && n.trim().split(/\s+/).length >= 2,
    ),
  ];

  /* ---------------------------------------- S1b: vendor-site evidence pass */

  /* The vendor's public website is an evidence source for EVERY input kind:
     users rarely submit it and rarely know what to look for on it. The site
     is discovered (two code-picked searches) for name-only runs, fetched
     under the SSRF bounds in ingest-site.ts, quarantined exactly like pitch
     text (forensics + the S1 extractor), and merged under the provenance
     rules in extract-merge.ts — site text creates things to CHECK, never
     identity, and never absence-based findings. Runs after the cache check
     so cached results never pay for fetches; vendorKey never changes. */
  let pitchPersonCount = extract.people.length;
  let pitchCustomerCount = extract.named_customers.length;
  let pitchAddressCount = extract.addresses.length;
  let siteClaimQuotes: string[] = [];
  let discoveredDomain: string | null = null;
  let discoveredConfirmed = false;
  {
    let siteHost: string | null = null;
    let siteSourceLabel = "";
    if (inputKind === "url" && sourceUrl) {
      try {
        siteHost = new URL(sourceUrl).hostname;
      } catch {
        siteHost = null;
      }
      siteSourceLabel =
        "text extracted from additional pages of the website the user submitted, authored by the vendor";
    } else if (primaryDomain) {
      siteHost = primaryDomain;
      siteSourceLabel =
        "text extracted from a public website the pitch identifies as the vendor's, authored by the vendor";
    } else if (inputKind === "name") {
      const disc = await runResearchLoop(buildDiscoveryRequest(companyNames), {
        apiKey: env.anthropicKey,
        timeoutMs: 20_000,
        deadlineMs: 30_000,
        maxContinuations: 1,
      });
      usageBox.value = addUsage(usageBox.value, disc.usage);
      const discCitations = harvestCitations(
        { citations: disc.citations, narrative: disc.narrative },
        [],
        new Date().toISOString(),
      );
      discoveredDomain = inferPrimaryDomain(discCitations, feedNames, 1);
      markStage("s1b_discovery");
      if (discoveredDomain) {
        siteHost = discoveredDomain;
        siteSourceLabel =
          "text extracted from a public website matched to the vendor's name, authored by the vendor";
        await emit({
          stage: "parse",
          kind: "micro_finding",
          label: `Found a likely vendor website: ${discoveredDomain}`,
        });
      }
    }
    if (siteHost && Date.now() - pipelineStart < 60_000) {
      const site = await fetchVendorSite(siteHost);
      markStage("s1b_site_fetch");
      /* 60 chars admits a title-plus-description JS shell — enough for
         the name-match confirmation even when the body is client-rendered. */
      if (site && site.combinedText.length >= 60) {
        /* Informational forensics only: the SSN scrub and invisible-char
           strip run, but site findings NEVER join the ceiling-bearing adv
           set — "system prompt" appears on every AI vendor's docs pages,
           and hidden text was already subtracted before this point. */
        const siteForensics = runForensics(site.combinedText);
        const res = await callAnthropic(
          buildExtractRequest(siteSourceLabel, siteForensics.normalized),
          { apiKey: env.anthropicKey, timeoutMs: STAGE_TIMEOUTS.extract },
        );
        usageBox.value = addUsage(usageBox.value, res.usage);
        stageUsage.s1b = res.usage;
        const parsed = res.ok ? parseStructured<unknown>(res) : null;
        const validated = parsed ? PitchExtract.safeParse(parsed) : null;
        if (validated?.success) {
          const siteExtract = validated.data;
          const siteLoose = looseText(siteForensics.normalized);
          siteExtract.named_customers = siteExtract.named_customers.filter(
            (c) => siteLoose.includes(looseText(c)) && isNamedOrganization(c),
          );
          siteExtract.claims = siteExtract.claims.filter((c) =>
            looseQuoteInSource(siteLoose, c.quote),
          );
          siteExtract.addresses = siteExtract.addresses.filter((a) =>
            siteLoose.includes(looseText(a)),
          );
          if (discoveredDomain) {
            /* The discovered domain's registration record may count as the
               SECOND identity identifier only when the site's own extracted
               name matches the submitted name (see resolveIdentity). */
            discoveredConfirmed = siteExtract.vendor_name_candidates.some(
              (n) => registry.matchCompanyName(n, companyNames).kind === "match",
            );
          }
          const merged = mergeExtracts(extract, siteExtract);
          extract = merged.extract;
          pitchPersonCount = merged.pitch_person_count;
          pitchCustomerCount = merged.pitch_customer_count;
          pitchAddressCount = merged.pitch_address_count;
          siteClaimQuotes = merged.site_claim_quotes;
          await emit({
            stage: "parse",
            kind: "micro_finding",
            label: `Read ${site.pages.length} page${site.pages.length === 1 ? "" : "s"} of ${siteHost} as vendor-stated evidence`,
          });
          const { data: fRow } = await supabase
            .from("evaluations")
            .select("forensics")
            .eq("id", evaluationId)
            .maybeSingle();
          await supabase
            .from("evaluations")
            .update({
              forensics: {
                ...((fRow?.forensics as Record<string, unknown>) ?? {}),
                site_signals: {
                  domain: siteHost,
                  pages: site.pages.map((pg) => pg.final_url),
                  hidden_spans: site.hidden_span_total,
                  adv_codes: siteForensics.adv_findings.map((a) => a.code),
                  invisible_stripped: siteForensics.invisible_stripped,
                },
              },
            })
            .eq("id", evaluationId);
        }
        markStage("s1b_site_extract");
      }
    }
  }

  /* --------------------------------------------------------- S2 registry */
  await setStatus("registry");
  await emit({
    stage: "registry",
    kind: "stage_start",
    label: "Checking registries and public records",
  });

  const foundingYear = extractFoundingYear(extract);
  /* Registry contradictions arm only on affirmative present-status claims:
     "pursuing FedRAMP authorization" is a legitimate state (methodology D3.1)
     and must never end in a CRITICAL contradiction. */
  const claimedFedramp = affirmsProgram(extract.claims, PROGRAMS.fedramp);
  const claimedGovramp = affirmsProgram(extract.claims, PROGRAMS.govramp);
  const claimedTxramp = affirmsProgram(extract.claims, PROGRAMS.txramp);
  const claimedSourcewell = affirmsProgram(extract.claims, PROGRAMS.sourcewell);
  const senderDomain = extract.sender_email?.split("@")[1] ?? null;

  const feeds = await loadFeeds(supabase);
  const checks: RegistryCheck[] = [];
  const track = async (p: Promise<RegistryCheck | RegistryCheck[]>) => {
    try {
      const result = await p;
      const list = Array.isArray(result) ? result : [result];
      for (const c of list) {
        checks.push(c);
        await emit({
          stage: "registry",
          kind: "check_result",
          label: c.summary,
          check_id: c.check_id,
          status: c.status,
          evidence_url: c.evidence_url,
        });
      }
    } catch (err) {
      console.error(`registry check crashed: ${String(err)}`);
    }
  };

  const ctx = (ms = STAGE_TIMEOUTS.registryPerEndpoint) => ({
    signal: AbortSignal.timeout(ms),
    apiKeys: env.apiKeys,
  });

  const tasks: Promise<void>[] = [
    track(registry.checkEdgarFts({ companyNames }, ctx())),
    track(registry.checkEdgarCompany({ companyNames }, ctx(12_000))),
    track(registry.checkSosSweep({ companyNames, productTokens }, ctx(12_000))),
    track(registry.checkSamEntity({ companyNames, productTokens }, ctx())),
    track(
      registry.checkSamExclusions(
        { companyNames: exclusionNames, people: extract.people },
        ctx(),
      ),
    ),
    track(registry.checkFederalAwards({ companyNames, productTokens }, ctx())),
    track(registry.checkFedramp({
      companyNames: feedNames,
      claimedFedramp,
      cachedFeed: async () => {
        const { data } = await supabase
          .from("registry_cache")
          .select("payload, fetched_at")
          .eq("source", "fedramp")
          .eq("key", "all")
          .maybeSingle();
        return data ? { payload: data.payload, fetched_at: String(data.fetched_at) } : null;
      },
    }, ctx(12_000))),
    track(Promise.resolve(registry.checkGovRamp({ companyNames: feedNames, claimed: claimedGovramp }, feeds.govramp, ctx()))),
    track(Promise.resolve(registry.checkTxRamp({ companyNames: feedNames, claimed: claimedTxramp, sellingIntoTexas: userState === "TX" }, feeds.txramp, ctx()))),
    track(Promise.resolve(registry.checkSourcewell({ companyNames: feedNames, claimed: claimedSourcewell }, feeds.sourcewell, ctx()))),
  ];
  if (primaryDomain) {
    tasks.push(
      track(registry.checkDomainAge({ domain: primaryDomain, claimedFoundingYear: foundingYear }, ctx())),
      track(registry.checkEmailHygiene({ domain: primaryDomain, senderDomain }, ctx())),
      track(registry.checkWebHistory({ domain: primaryDomain }, ctx())),
      track(registry.checkSubdomains({ domain: primaryDomain }, ctx(10_000))),
      track(registry.checkGithubOrg({ candidates: feedNames, domain: primaryDomain }, ctx())),
    );
  } else if (discoveredDomain) {
    /* Hygiene lanes for the DISCOVERED domain. Every check is annotated
       with provenance: resolveIdentity applies the second-identifier-only
       rule to the RDAP record (never on its own, never unconfirmed), and
       the honesty panel carries the inference caveat via the synthetic
       check below. */
    const annotate = (p: Promise<RegistryCheck | RegistryCheck[]>) =>
      p.then((r) => {
        const list = Array.isArray(r) ? r : [r];
        for (const c of list) {
          c.data = {
            ...((c.data ?? {}) as Record<string, unknown>),
            discovered_domain: true,
            confirmed_name_match: discoveredConfirmed,
          };
        }
        return r;
      });
    checks.push({
      check_id: "domain_inference",
      source: "Domain inference from research citations",
      status: "hit",
      confidence: "name_similarity",
      summary: `A web search matched ${discoveredDomain} to the vendor's name, so the site checks below use this address. The pitch did not state a website.`,
      evidence_url: `https://${discoveredDomain}`,
      retrieved_at: new Date().toISOString(),
      data: { inferred: true, domain: discoveredDomain, confirmed_name_match: discoveredConfirmed },
    });
    tasks.push(
      track(annotate(registry.checkDomainAge({ domain: discoveredDomain, claimedFoundingYear: foundingYear }, ctx()))),
      track(annotate(registry.checkEmailHygiene({ domain: discoveredDomain, senderDomain }, ctx()))),
      track(annotate(registry.checkWebHistory({ domain: discoveredDomain }, ctx()))),
      track(annotate(registry.checkSubdomains({ domain: discoveredDomain }, ctx(10_000)))),
      track(annotate(registry.checkGithubOrg({ candidates: feedNames, domain: discoveredDomain }, ctx()))),
    );
  }
  await Promise.allSettled(tasks);

  markStage("s2_registry");
  /* S2c, provisional pass: adjudicate record attribution from the pitch and
     site corpus (identity-ties.ts). Research citations have not run yet;
     the tail re-adjudicates with them, and ties are monotone-add, so this
     provisional identity can only improve there. The exclusions follow-up
     (debarment under the resolved legal name) also moved to the tail so it
     keys on ATTRIBUTED records only — re-searching the exclusion list under
     a namesake's legal name was a latent false-CRITICAL. */
  adjudicateChecks(
    checks,
    buildTieCorpus({
      extract,
      pitchPersonCount,
      pitchAddressCount,
      primaryDomain,
      productNames: split.productNames,
      citations: [],
    }),
  );
  const identity = registry.resolveIdentity(checks);

  /* Research and citation classification should know the vendor's site
     even when the pitch did not state it (context only — never identity). */
  const researchDomains = [
    ...extract.domains,
    ...(discoveredDomain ? [discoveredDomain] : []),
  ];

  /* --------------------------------------------- deep-mode hand-off */
  let deepHandoffFailed = false;
  if (opts.deep) {
    const nonce = crypto.randomUUID() + crypto.randomUUID();
    await supabase
      .from("evaluations")
      .update({
        checkpoint: {
          nonce,
          inputKind,
          userState,
          vendorName,
          vendorKey,
          resolvable,
          extract,
          checks,
          identity,
          adv,
          primaryDomain,
          discoveredDomain,
          feedNames,
          foundingYear,
          senderDomain,
          pitchPersonCount,
          pitchCustomerCount,
          pitchAddressCount,
          productNames: split.productNames,
          siteClaimQuotes,
          researchDomains,
          usage: usageBox.value,
          stageUsage,
          stageMs,
        },
      })
      .eq("id", evaluationId);
    await setStatus("research");
    await emit({
      stage: "research",
      kind: "stage_start",
      label: "Deep check: four focused research passes starting in parallel",
    });
    const handoff = await fetch(`${env.supabaseUrl}/functions/v1/deep-research`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: env.serviceKey,
        authorization: `Bearer ${env.serviceKey}`,
      },
      body: JSON.stringify({ evaluation_id: evaluationId, nonce }),
    }).catch(() => null);
    if (handoff?.ok) return; /* deep-research owns the rest of the run */
    console.error(`deep hand-off failed: HTTP ${handoff?.status ?? "network"}`);
    deepHandoffFailed = true; /* recorded in usage + honesty panel by the tail */
    await emit({
      stage: "research",
      kind: "micro_finding",
      label: "The deep engine did not answer, so this run continues as a standard check.",
    });
  }

  /* --------------------------------------------------------- S3 research */
  await setStatus("research");
  await emit({
    stage: "research",
    kind: "stage_start",
    label: "Searching for delivery evidence on the open web",
  });

  const research = await runResearchLoop(
    buildResearchRequest({
      vendor_name_candidates: extract.vendor_name_candidates,
      domains: researchDomains,
      people: extract.people,
      named_customers: extract.named_customers,
      claims: extract.claims,
      registry_summary: checks.map((c) => ({
        check_id: c.check_id,
        status: c.status,
        summary: c.summary,
      })),
      user_state: userState,
    }, opts.budgetOverride),
    {
      /* Research streams (idle timeout, not total). Its deadline is dynamic:
         whatever remains of the 400s function wall clock after the stages
         already run, minus a reserve for synthesis and review. */
      apiKey: env.anthropicKey,
      timeoutMs: 90_000,
      /* The post-research reserve covers synthesis + review; name-only runs
         reserve extra for the S2b inferred-domain checks (8-12s). */
      deadlineMs: Math.max(
        120_000,
        Math.min(
          STAGE_TIMEOUTS.research,
          390_000 - (Date.now() - pipelineStart) -
            (inputKind === "name" ? 127_000 : 115_000),
        ),
      ),
    },
  );
  usageBox.value = addUsage(usageBox.value, research.usage);
  stageUsage.s3 = research.usage;
  markStage("s3_research");
  const citations = harvestCitations(
    research,
    researchDomains,
    new Date().toISOString(),
  );
  const budget =
    opts.budgetOverride ??
    researchBudget({
      vendor_name_candidates: extract.vendor_name_candidates,
      domains: extract.domains,
      people: extract.people,
      named_customers: extract.named_customers,
      claims: extract.claims,
      registry_summary: [],
      user_state: userState,
    });
  console.log(
    `s3 budget bucket: ${budget.searches}/${budget.fetches}, used ${research.usage.web_search_requests} searches, partial=${research.partial}`,
  );
  await emit({
    stage: "research",
    kind: "micro_finding",
    label: `Web research finished: ${citations.length} sources collected (${research.usage.web_search_requests} of up to ${budget.searches} searches)`,
  });

  await runPipelineTail(
    {
      supabase,
      anthropicKey: env.anthropicKey,
      apiKeys: env.apiKeys,
      evaluationId,
      emit,
      setStatus,
      markStage,
      usageBox,
      stageUsage,
      stageMs,
    },
    {
      inputKind,
      userState,
      vendorName,
      vendorKey,
      resolvable,
      extract,
      checks,
      identity,
      adv,
      citations,
      researchPartial: research.partial,
      primaryDomain,
      discoveredDomain,
      feedNames,
      foundingYear,
      senderDomain,
      pitchPersonCount,
      pitchCustomerCount,
      pitchAddressCount,
      productNames: split.productNames,
      siteClaimQuotes,
      ...(deepHandoffFailed ? { deepHandoffFailed: true } : {}),
    },
  );
}

/* ------------------------------------------------------------- helpers */


function extractFoundingYear(extract: PitchExtract): number | null {
  for (const c of extract.claims.filter((x) => x.type === "identity")) {
    const m = c.quote.match(/(?:founded|established|since|est\.?)\s*(?:in\s*)?((?:19|20)\d{2})/i);
    if (m) return Number(m[1]);
  }
  return null;
}

async function loadFeeds(supabase: SupabaseClient): Promise<{
  govramp: registry.FeedInput<{ provider: string; product?: string; status: string }>;
  txramp: registry.FeedInput<{ provider: string; product?: string; status: string }>;
  sourcewell: registry.FeedInput<{ supplier: string; contract?: string }>;
}> {
  const { data } = await supabase
    .from("registry_cache")
    .select("source, payload, fetched_at")
    .in("source", ["govramp", "txramp", "sourcewell"])
    .eq("key", "all");
  const nowIso = new Date().toISOString();
  const bySource = new Map((data ?? []).map((r) => [r.source, r]));
  /* Rows must be a bare array (the refresh job guarantees it); anything else
     degrades to "not loaded". Stale rows degrade to a dated stale marker so
     the checks can say honestly why they did not run. */
  const resolve = (source: string) => {
    const row = bySource.get(source);
    if (!row || !Array.isArray(row.payload)) return null;
    if (registry.isFeedStale(String(row.fetched_at), nowIso)) {
      return { stale: true as const, fetched_at: String(row.fetched_at) };
    }
    return row.payload;
  };
  return {
    govramp: resolve("govramp") as never,
    txramp: resolve("txramp") as never,
    sourcewell: resolve("sourcewell") as never,
  };
}




