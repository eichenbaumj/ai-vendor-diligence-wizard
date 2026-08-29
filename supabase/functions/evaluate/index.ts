/*
  POST /evaluate — the pipeline orchestrator.

  Foreground (< 2s): validate → Turnstile → rate limits → insert evaluation →
  respond 202 with the evaluation id. Background (EdgeRuntime.waitUntil):
  S1 parse → S2 registry checks → S3 web research → S4 pack match →
  S5 synthesis (+ S5.5 adversarial review) → persist report. Every stage
  writes replayable events and broadcasts live progress.

  Runs on the Supabase Pro plan (400s wall clock). Stage budgets: S1 25s,
  S2 30s, S3 200s, S4 12s, S5 50s, review 40s. Worst case ~320s.
*/
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CORS_HEADERS, clientIp, json, preflight } from "../_shared/http.ts";
import { verifyTurnstile } from "../_shared/turnstile.ts";
import { allow, dayKey, sha256Hex } from "../_shared/ratelimit.ts";
import { makeEmitter, type Emitter } from "../_shared/broadcast.ts";
import { detectHiddenHtml, runForensics } from "../_shared/forensics.ts";
import {
  buildClassifyRequest,
  buildExtractRequest,
  buildResearchRequest,
  buildReviewRequest,
  buildStructureRequest,
  MODELS,
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
import { lintObject, lintText, looseText, tidyProse } from "../_shared/lint.ts";
import { harvestCitations } from "../_shared/harvest.ts";
import { inferPrimaryDomain } from "../_shared/domain-inference.ts";
import { isNamedOrganization } from "../_shared/text-match.ts";
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

const METHODOLOGY_VERSION = "1.0";
const IP_DAILY_CAP = 3;
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

  const turnstileOk = await verifyTurnstile(
    body?.turnstile_token ?? null,
    env.turnstileSecret,
    ip === "unknown" ? null : ip,
  );
  if (!turnstileOk) return json({ error: "verification failed, reload and retry" }, 403);

  const ipHash = (await sha256Hex(ip)).slice(0, 24);
  if (!(await allow(supabase, dayKey("ip", ipHash), IP_DAILY_CAP))) {
    return json(
      { error: "rate_limited", retry_hint: "Daily limit reached for this connection. Try again tomorrow." },
      429,
    );
  }
  if (!(await allow(supabase, dayKey("global", "all"), GLOBAL_DAILY_CAP))) {
    return json({ error: "capacity" }, 503);
  }

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

  /* Name-only inputs have a known vendor key now — check the result cache
     before spending anything. */
  if (inputKind === "name") {
    const key = vendorKeyFromName(content);
    const cached = await findCached(supabase, key);
    if (cached) return json({ evaluation_id: cached, cached: true }, 202);
  }

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

  return json({ evaluation_id: evaluationId, cached: false }, 202);
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
    .gt("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.id as string) ?? null;
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

  let usage: Usage = {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    web_search_requests: 0,
  };
  const stageUsage: Record<string, Usage> = {};

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
    const res = await callAnthropic(
      buildExtractRequest(S1_SOURCE_LABELS[inputKind] ?? S1_SOURCE_LABELS.paste, pitchText),
      { apiKey: env.anthropicKey, timeoutMs: STAGE_TIMEOUTS.extract },
    );
    usage = addUsage(usage, res.usage);
    stageUsage.s1 = res.usage;
    const parsed = res.ok ? parseStructured<unknown>(res) : null;
    const validated = parsed ? PitchExtract.safeParse(parsed) : null;
    if (!validated?.success) {
      await finishInsufficient(
        supabase,
        evaluationId,
        emit,
        "The pitch could not be parsed. Try pasting the plain text of the email.",
      );
      return;
    }
    extract = validated.data;
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
      pitchLoose.includes(looseText(c.quote)),
    );
  }

  const vendorName = extract.vendor_name_candidates[0] ?? pitchText.slice(0, 60);
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

  /* Result cache for pasted pitches (vendor key only known after parse). */
  const cachedId = await findCached(supabase, vendorKey);
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

  /* --------------------------------------------------------- S2 registry */
  await setStatus("registry");
  await emit({
    stage: "registry",
    kind: "stage_start",
    label: "Checking registries and public records",
  });

  const foundingYear = extractFoundingYear(extract);
  const claimsText = extract.claims.map((c) => c.quote).join(" \n ");
  const claimedFedramp = /fedramp/i.test(claimsText);
  const claimedGovramp = /govramp|stateramp/i.test(claimsText);
  const claimedTxramp = /tx-?ramp/i.test(claimsText);
  const claimedSourcewell = /sourcewell|naspo|omnia|cooperative (purchasing|contract)/i.test(claimsText);
  const senderDomain = extract.sender_email?.split("@")[1] ?? null;
  const companyNames = extract.vendor_name_candidates.length
    ? extract.vendor_name_candidates
    : [vendorName];

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
    track(registry.checkSosSweep({ companyNames }, ctx(12_000))),
    track(registry.checkSamEntity({ companyNames }, ctx())),
    track(
      registry.checkSamExclusions(
        { companyNames, people: extract.people },
        ctx(),
      ),
    ),
    track(registry.checkFederalAwards({ companyNames }, ctx())),
    track(registry.checkFedramp({
      companyNames,
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
    track(Promise.resolve(registry.checkGovRamp({ companyNames, claimed: claimedGovramp }, feeds.govramp, ctx()))),
    track(Promise.resolve(registry.checkTxRamp({ companyNames, claimed: claimedTxramp, sellingIntoTexas: userState === "TX" }, feeds.txramp, ctx()))),
    track(Promise.resolve(registry.checkSourcewell({ companyNames, claimed: claimedSourcewell }, feeds.sourcewell, ctx()))),
  ];
  if (primaryDomain) {
    tasks.push(
      track(registry.checkDomainAge({ domain: primaryDomain, claimedFoundingYear: foundingYear }, ctx())),
      track(registry.checkEmailHygiene({ domain: primaryDomain, senderDomain }, ctx())),
      track(registry.checkWebHistory({ domain: primaryDomain }, ctx())),
      track(registry.checkSubdomains({ domain: primaryDomain }, ctx(10_000))),
      track(registry.checkGithubOrg({ candidates: companyNames, domain: primaryDomain }, ctx())),
    );
  }
  await Promise.allSettled(tasks);
  const identity = registry.resolveIdentity(checks);

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
      domains: extract.domains,
      people: extract.people,
      named_customers: extract.named_customers,
      claims: extract.claims,
      registry_summary: checks.map((c) => ({
        check_id: c.check_id,
        status: c.status,
        summary: c.summary,
      })),
      user_state: userState,
    }),
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
  usage = addUsage(usage, research.usage);
  stageUsage.s3 = research.usage;
  const citations = harvestCitations(
    research,
    extract.domains,
    new Date().toISOString(),
  );
  const budget = researchBudget({
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

  /* ADV-04: deterministic planted-corroboration scan over the retrieved
     citations. Like every ADV path this only ADDS a finding. */
  const planted = detectPlantedCorroboration(citations, extract.domains);
  if (planted && !adv.some((a) => a.code === "ADV-04")) {
    adv.push(planted);
    await emit({
      stage: "research",
      kind: "micro_finding",
      label: "Repeated identical phrasing found across unrelated sites",
    });
  }

  /* ----------------------------------- S2b: inferred-domain checks (name-only) */

  /* A name-only submission carries no domain, so the domain-hygiene lanes
     were skipped above. If the research citations nominate the vendor's
     website (see domain-inference.ts for the rules a vendor cannot game),
     run those lanes now against the inferred domain. Identity stays
     authoritative from the pre-research computation: do NOT recompute
     resolveIdentity here — an inferred RDAP hit must never count toward
     the two-identifier bar. The inferred domain feeds D1 hygiene rows and
     D4 greens only, labeled as inferred in the honesty panel. */
  if (inputKind === "name" && !primaryDomain) {
    const inferred = inferPrimaryDomain(citations, extract.vendor_name_candidates);
    if (inferred) {
      checks.push({
        check_id: "domain_inference",
        source: "Domain inference from research citations",
        status: "hit",
        confidence: "name_similarity",
        summary: `Research citations point to ${inferred} as the vendor's website. The pitch did not state one, so the site checks below use this inferred address.`,
        evidence_url: `https://${inferred}`,
        retrieved_at: new Date().toISOString(),
        data: { inferred: true, domain: inferred },
      });
      await emit({
        stage: "registry",
        kind: "micro_finding",
        label: `Vendor website inferred from research citations: ${inferred}`,
      });
      await Promise.allSettled([
        track(registry.checkDomainAge({ domain: inferred, claimedFoundingYear: foundingYear }, ctx())),
        track(registry.checkEmailHygiene({ domain: inferred, senderDomain }, ctx())),
        track(registry.checkWebHistory({ domain: inferred }, ctx())),
        track(registry.checkSubdomains({ domain: inferred }, ctx(10_000))),
        track(registry.checkGithubOrg({ candidates: companyNames, domain: inferred }, ctx())),
      ]);
    }
  }

  /* --------------------------------------------------------- S4 packs */
  await setStatus("research");
  await emit({ stage: "packs", kind: "stage_start", label: "Matching the product category" });

  let sector: SectorContext = {
    pack_ids: [],
    elevated: false,
    overlay_reason: null,
    state_items: userState ? (STATE_ITEMS[userState] ?? []) : [],
  };
  if (extract.use_case_description || extract.claims.length > 0) {
    const res = await callAnthropic(
      buildClassifyRequest({
        use_case_description: extract.use_case_description,
        claims: extract.claims.map((c) => ({ type: c.type, quote: c.quote })),
        packs: Object.values(PACKS).map((p) => ({
          pack_id: p.pack_id,
          pack_name: p.pack_name,
          inclusion_test: p.inclusion_test,
        })),
      }),
      { apiKey: env.anthropicKey, timeoutMs: STAGE_TIMEOUTS.classify },
    );
    usage = addUsage(usage, res.usage);
    stageUsage.s4 = res.usage;
    const parsed = res.ok
      ? parseStructured<{ pack_ids: string[]; overlay: boolean; overlay_reason: string | null }>(res)
      : null;
    if (parsed) {
      const validIds = parsed.pack_ids.filter((id) => PACKS[id]).slice(0, 3);
      const elevatedPack = validIds.some((id) => PACKS[id]?.scrutiny_tier === "elevated");
      sector = {
        ...sector,
        pack_ids: validIds as SectorContext["pack_ids"],
        elevated: elevatedPack || parsed.overlay,
        overlay_reason: parsed.overlay ? (parsed.overlay_reason ?? "").slice(0, 300) || null : null,
      };
      if (validIds.length > 0) {
        await emit({
          stage: "packs",
          kind: "micro_finding",
          label: `Category: ${validIds.map((id) => PACKS[id].pack_name).join(", ")}${sector.elevated ? " (elevated scrutiny)" : ""}`,
        });
      }
    }
  }

  /* --------------------------------------------------------- S5 synthesis */
  await setStatus("synthesis");
  await emit({ stage: "synthesis", kind: "stage_start", label: "Writing your report" });

  const generatedAt = new Date().toISOString();
  const skeleton = assemble({
    extract,
    checks,
    identity,
    citations,
    adv_findings: adv,
    sector,
    packs: PACKS,
    resolvable,
    research_partial: research.partial,
    generated_at: generatedAt,
  });
  const decision = computeTier(skeleton.tierInputs);

  /* Narrative pass. */
  const s5Input: S5UserInput = {
    tier: decision.tier,
    tier_label: decision.label,
    rationale: decision.rationale,
    vendor_display_name: vendorName,
    generated_date: generatedAt.slice(0, 10),
    ledger_rows: skeleton.ledger.map((r) => ({
      id: r.id,
      dimension: r.dimension,
      claim_quote: r.claim_quote,
      what_checked: r.what_checked,
      result: r.result,
      evidence_tier: r.evidence_tier,
      source_names: r.sources.map((s) => s.title ?? s.url),
      source_dates: r.sources.map((s) => s.retrieved_at.slice(0, 10)),
      fact_basis: `${r.what_checked}. Result: ${r.result}. ${
        r.sources.map((s) => `${s.title ?? s.url} (${s.retrieved_at.slice(0, 10)})`).join("; ") || "No public source located."
      }`,
    })),
    green_flag_facts: skeleton.greenFlagFacts,
    sector: {
      pack_names: sector.pack_ids.map((id) => PACKS[id]?.pack_name ?? id),
      elevated: sector.elevated,
      overlay_reason: sector.overlay_reason,
    },
    research_partial: research.partial,
  };

  let narrative = await runStructurePass(env, s5Input);
  usage = addUsage(usage, narrative.usage);
  stageUsage.s5 = narrative.usage;

  /* Compose the report. */
  const ledger = skeleton.ledger.map((r) => {
    const modelNote = narrative.value?.row_notes.find((n) => n.id === r.id)?.note;
    return {
      ...r,
      note: modelNote
        ? tidyProse(modelNote, 700)
        : fallbackNote(r.result, r.what_checked, r.sources[0]?.title ?? null),
    };
  });

  const allowedUrls = new Set<string>([
    ...checks.flatMap((c) => (c.evidence_url ? [c.evidence_url] : [])),
    ...citations.map((c) => c.url),
    "https://www.hhs.gov/hipaa/for-professionals/faq/2003/are-we-required-to-certify-our-organizations-compliance-with-the-standards/index.html",
    "https://tineye.com",
  ]);
  const firewallSources = (srcs: { url: string; title: string | null; retrieved_at: string }[]) =>
    srcs.filter((s) => allowedUrls.has(s.url));

  let report: Report = {
    verdict: {
      tier: decision.tier,
      label: decision.label,
      summary:
        tidyProse(narrative.value?.verdict_summary ?? "", 600) ||
        defaultSummary(decision.tier),
      checks_met: decision.checks_met,
      rationale: decision.rationale.slice(0, 8).map((r) => r.slice(0, 400)),
    },
    ledger: ledger.map((r) => ({ ...r, sources: firewallSources(r.sources) })),
    green_flags: (narrative.value?.green_flags ?? skeleton.greenFlagFacts.map(
      (g) => `${g.fact} (${g.source_name}, checked ${g.date})`,
    ))
      .slice(0, 15)
      .map((g) => tidyProse(g, 400)),
    adv_findings: adv.slice(0, 6),
    honesty_panel: skeleton.honesty,
    questions: skeleton.questions,
    manual_checks: skeleton.manualChecks,
    next_steps: (narrative.value?.next_steps ?? defaultNextSteps(decision.tier))
      .slice(0, 8)
      .map((s) => tidyProse(s, 500)),
    sector,
    sources: firewallSources(
      citations.map((c) => ({ url: c.url, title: c.title, retrieved_at: c.retrieved_at })),
    ),
    review: null,
    meta: {
      generated_at: generatedAt,
      expires_at: new Date(Date.now() + 90 * 86_400_000).toISOString(),
      methodology_version: METHODOLOGY_VERSION,
      pack_release: PACK_RELEASE,
      vendor_key: vendorKey,
      vendor_display_name: vendorName,
      research_partial: research.partial,
      input_kind: inputKind,
    },
  };

  /* --------------------------------------------- S5.5 adversarial review */
  const needsReview =
    decision.tier <= 2 ||
    ledger.some((r) => r.result === "CONTRADICTED") ||
    adv.length > 0;
  if (needsReview) {
    await setStatus("synthesis");
    await emit({ stage: "review", kind: "stage_start", label: "Reviewing the language before publication" });
    const res = await callAnthropic(buildReviewRequest(JSON.stringify(report)), {
      apiKey: env.anthropicKey,
      timeoutMs: STAGE_TIMEOUTS.review,
    });
    usage = addUsage(usage, res.usage);
    stageUsage.review = res.usage;
    const review = res.ok
      ? parseStructured<{
          approved: boolean;
          issues: {
            kind: string;
            target_row_id: string | null;
            explanation: string;
            replacement_note: string | null;
          }[];
          verdict_summary_rewrite: string | null;
        }>(res)
      : null;
    if (review) {
      const adjustments: string[] = [];
      for (const issue of review.issues.slice(0, 10)) {
        if (issue.target_row_id && issue.replacement_note === null && issue.kind === "misread_evidence") {
          report.ledger = report.ledger.filter((r) => r.id !== issue.target_row_id);
          adjustments.push(`Removed an unsupported item (${issue.explanation.slice(0, 120)})`);
        } else if (issue.target_row_id && issue.replacement_note) {
          const row = report.ledger.find((r) => r.id === issue.target_row_id);
          if (row && lintText(issue.replacement_note).filter((v) => v.kind === "banned").length === 0) {
            row.note = tidyProse(issue.replacement_note, 700);
            adjustments.push(`Tightened language (${issue.kind}): ${issue.explanation.slice(0, 120)}`);
          }
        }
      }
      if (
        review.verdict_summary_rewrite &&
        lintText(review.verdict_summary_rewrite).filter((v) => v.kind === "banned").length === 0
      ) {
        report.verdict.summary = tidyProse(review.verdict_summary_rewrite, 600);
        adjustments.push("Rewrote the summary for accuracy");
      }
      report.review = { reviewed: true, model: MODELS.review, adjustments: adjustments.slice(0, 10) };
    }
  }

  /* Final lint: banned-vocabulary violations anywhere fall back to templates. */
  const violations = lintObject(report).filter((v) => v.kind === "banned");
  if (violations.length > 0) {
    console.error(`final lint violations: ${JSON.stringify(violations.slice(0, 5))}`);
    for (const row of report.ledger) {
      if (lintText(row.note).some((v) => v.kind === "banned")) {
        row.note = fallbackNote(row.result, row.what_checked, row.sources[0]?.title ?? null);
      }
    }
    if (lintText(report.verdict.summary).some((v) => v.kind === "banned")) {
      report.verdict.summary = defaultSummary(report.verdict.tier);
    }
  }

  const validated = Report.safeParse(report);
  if (!validated.success) {
    console.error(`report schema invalid: ${validated.error.message.slice(0, 500)}`);
    /* Persist the zod detail into the forensics jsonb (never exposed by
       get-evaluation) so a production failure is diagnosable without
       platform log access. */
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
          assembly_schema_error: validated.error.message.slice(0, 1600),
        },
      })
      .eq("id", evaluationId);
    await finishInsufficient(supabase, evaluationId, emit, "Report assembly failed. Please re-run.");
    return;
  }

  await supabase
    .from("evaluations")
    .update({
      report: validated.data,
      status: "complete",
      usage: { total: usage, stages: stageUsage },
    })
    .eq("id", evaluationId);
  await emit({ stage: "synthesis", kind: "done", label: "Report ready" });
}

/* ------------------------------------------------------------- helpers */

async function runStructurePass(
  env: Env,
  input: S5UserInput,
): Promise<{
  value: {
    verdict_summary: string;
    row_notes: { id: string; note: string }[];
    green_flags: string[];
    next_steps: string[];
  } | null;
  usage: Usage;
}> {
  let usage: Usage = {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    web_search_requests: 0,
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await callAnthropic(buildStructureRequest(input), {
      apiKey: env.anthropicKey,
      timeoutMs: STAGE_TIMEOUTS.structure,
    });
    usage = addUsage(usage, res.usage);
    if (!res.ok) break;
    const parsed = parseStructured<{
      verdict_summary: string;
      row_notes: { id: string; note: string }[];
      green_flags: string[];
      next_steps: string[];
    }>(res);
    if (!parsed) continue;
    const banned = lintObject(parsed).filter((v) => v.kind === "banned");
    if (banned.length === 0) return { value: parsed, usage };
    console.warn(`s5 lint retry: ${banned.map((b) => b.label).join(", ")}`);
  }
  return { value: null, usage };
}

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

async function finishInsufficient(
  supabase: SupabaseClient,
  evaluationId: string,
  emit: (e: { stage: EvalEvent["stage"]; kind: EvalEvent["kind"]; label: string }) => Promise<void>,
  reason: string,
): Promise<void> {
  await supabase
    .from("evaluations")
    .update({ status: "insufficient", error: reason })
    .eq("id", evaluationId);
  await emit({ stage: "synthesis", kind: "error", label: reason });
}

function fallbackNote(result: string, whatChecked: string, sourceName: string | null): string {
  const src = sourceName ? ` Source: ${sourceName}.` : "";
  switch (result) {
    case "VERIFIED":
      return `This checked out against public records.${src}`;
    case "OFFICIAL_RECORD_FOUND":
      return `An official record was found. Review the linked source and consult your procurement counsel before acting on it.${src}`;
    case "CONTRADICTED":
      return `The public record we checked does not match this claim. Ask the vendor for documentation.${src}`;
    case "COVERAGE_LIMITED":
      return `We could not run a definitive automated search here. A manual check card below gives you the official link.${src}`;
    default:
      return `We searched public sources and did not find support for this. Not finding a record is not proof the claim is false. The question pack asks the vendor for the document that would resolve it.${src}`;
  }
}

function defaultSummary(tier: number): string {
  switch (tier) {
    case 0:
      return "We could not complete an evaluation because the submission did not give us enough to research. This is not a negative finding. Ask the vendor for its legal entity name, state of registration, and website, then run the check again.";
    case 1:
      return "Public sources could not confirm the basic claims in this pitch, and at least two specific items did not match the official records we checked. The details and sources are in the ledger below. Our suggestion: do not invest staff time until the vendor provides the documents listed in the next steps.";
    case 2:
      return "The company behind this pitch exists, but key claims could not be corroborated in public sources. Resolve the items below in writing before you schedule a demo.";
    case 3:
      return "This looks like a young vendor whose claims are consistent with the public records we checked. Being early-stage is not a defect. The question pack below is calibrated to what a company this size should be able to produce.";
    default:
      return "Public records corroborate this vendor's core claims across several independent sources. The remaining diligence is substantive rather than existential: before a demo, ask the questions below. Note that verifying the company is not an evaluation of the product itself.";
  }
}

function defaultNextSteps(tier: number): string[] {
  switch (tier) {
    case 0:
      return [
        "Reply to the vendor asking for: legal entity name, state of registration, and website.",
        "Re-run this check when you have those details.",
      ];
    case 1:
      return [
        "Do not schedule a call yet. Send the document requests from the question pack in writing.",
        "If the vendor responds with documentation, re-run this check with the new information.",
        "The vendor can dispute any finding through the corrections page.",
      ];
    case 2:
      return [
        "Send the question pack by email before agreeing to a demo.",
        "Complete the manual checks below. They take a few minutes total.",
        "Ask the vendor to complete a GovAI Coalition AI FactSheet.",
      ];
    case 3:
      return [
        "A demo is reasonable. Send the question pack first so answers arrive in writing.",
        "Complete the manual checks below.",
        "If a pilot follows, put data ownership, no-training, and exit terms in writing from day one.",
      ];
    default:
      return [
        "Send the question pack before the demo so the conversation starts substantive.",
        "Call at least two of the verified customers in the green flags.",
        "Remember that an established company still needs the accuracy and contract questions answered.",
      ];
  }
}
