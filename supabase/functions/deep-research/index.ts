/*
  POST /deep-research — the chained deep-mode invocation.

  The evaluate function runs S1/S1b/S2, persists a checkpoint (typed
  pipeline state + a one-time nonce), and fire-and-forgets a call here.
  This function starts a FRESH 400s wall clock, runs four objective-scoped
  research lanes in parallel (each its own pause_turn loop under
  DEEP_MODE), merges their citations, and runs the identical pipeline tail
  (S4 → assembly → S5 → review → persist).

  Not a public endpoint: the caller must present the checkpoint's nonce,
  which only the service role ever reads or writes. Progress flows through
  the same event/broadcast machinery, so the client notices nothing except
  a longer, richer research stage.
*/
import { createClient } from "@supabase/supabase-js";
import { json, preflight } from "../_shared/http.ts";
import { makeEmitter } from "../_shared/broadcast.ts";
import {
  DEEP_MODE,
  buildResearchRequest,
} from "../_shared/anthropic.ts";
import {
  addUsage,
  runResearchLoop,
  type Usage,
} from "../_shared/anthropic-client.ts";
import {
  type AdvFinding,
  EvalEvent,
  PitchExtract,
  type RegistryCheck,
} from "../_shared/schemas.ts";
import { harvestCitations, type ApiCitation } from "../_shared/harvest.ts";
import {
  finishInsufficient,
  runPipelineTail,
} from "../_shared/pipeline-tail.ts";

interface Checkpoint {
  nonce: string;
  inputKind: "paste" | "name" | "pdf" | "url";
  userState: string | null;
  vendorName: string;
  vendorKey: string;
  resolvable: boolean;
  extract: PitchExtract;
  checks: RegistryCheck[];
  identity: { identity_resolved: boolean; identifiers_found: string[] };
  adv: AdvFinding[];
  primaryDomain: string | null;
  discoveredDomain: string | null;
  feedNames: string[];
  foundingYear: number | null;
  senderDomain: string | null;
  pitchPersonCount: number;
  pitchCustomerCount: number;
  /* Optional: checkpoints written before the tying-signal build lack them;
     the tail defaults them (0 addresses, no product names). */
  pitchAddressCount?: number;
  productNames?: string[];
  siteStateMentioned?: string | null;
  siteStatesFound?: string[];
  siteClaimQuotes: string[];
  researchDomains: string[];
  usage: Usage;
  stageUsage: Record<string, Usage>;
  stageMs: Record<string, number>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey =
    Deno.env.get("SB_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!supabaseUrl || !serviceKey || !anthropicKey) {
    return json({ error: "not configured" }, 503);
  }

  const body = (await req.json().catch(() => null)) as {
    evaluation_id?: string;
    nonce?: string;
  } | null;
  const evaluationId = body?.evaluation_id ?? "";
  const nonce = body?.nonce ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(evaluationId) || nonce.length < 16) {
    return json({ error: "bad request" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: row } = await supabase
    .from("evaluations")
    .select("checkpoint, status")
    .eq("id", evaluationId)
    .maybeSingle();
  const checkpoint = (row?.checkpoint ?? null) as Checkpoint | null;
  if (!checkpoint || checkpoint.nonce !== nonce || row?.status !== "research") {
    return json({ error: "not found" }, 404);
  }
  /* The checkpoint was written by our own service role, but validate the
     model-adjacent structure anyway. */
  const extractOk = PitchExtract.safeParse(checkpoint.extract);
  if (!extractOk.success) return json({ error: "bad checkpoint" }, 400);

  const work = runDeep(
    supabase,
    { supabaseUrl, serviceKey, anthropicKey },
    evaluationId,
    { ...checkpoint, extract: extractOk.data },
  ).catch(async (err) => {
    console.error(`deep pipeline fatal for ${evaluationId}: ${String(err)}`);
    await supabase
      .from("evaluations")
      .update({ status: "error", error: String(err).slice(0, 500), checkpoint: null })
      .eq("id", evaluationId);
  });
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } })
    .EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(work);

  return json({ accepted: true }, 202);
});

async function runDeep(
  supabase: ReturnType<typeof createClient>,
  env: { supabaseUrl: string; serviceKey: string; anthropicKey: string },
  evaluationId: string,
  cp: Checkpoint,
): Promise<void> {
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

  const usageBox = { value: cp.usage };
  const stageUsage = cp.stageUsage ?? {};
  const stageMs = cp.stageMs ?? {};
  let stageMark = Date.now();
  const markStage = (name: string) => {
    stageMs[name] = Date.now() - stageMark;
    stageMark = Date.now();
  };

  await emit({
    stage: "research",
    kind: "stage_start",
    label: `Deep research: ${DEEP_MODE.lanes.length} focused searches running in parallel`,
  });

  const baseInput = {
    vendor_name_candidates: cp.extract.vendor_name_candidates,
    domains: cp.researchDomains,
    people: cp.extract.people,
    named_customers: cp.extract.named_customers,
    claims: cp.extract.claims,
    registry_summary: cp.checks.map((c) => ({
      check_id: c.check_id,
      status: c.status,
      summary: c.summary,
    })),
    user_state: cp.userState,
  };

  const laneResults = await Promise.allSettled(
    DEEP_MODE.lanes.map(async (lane) => {
      const res = await runResearchLoop(
        buildResearchRequest(
          { ...baseInput, objective_focus: lane.focus },
          DEEP_MODE.perLane,
        ),
        {
          apiKey: env.anthropicKey,
          timeoutMs: DEEP_MODE.laneIdleTimeoutMs,
          deadlineMs: DEEP_MODE.laneDeadlineMs,
        },
      );
      await emit({
        stage: "research",
        kind: "micro_finding",
        label: `Deep lane finished (${lane.key}): ${res.citations.length} sources, ${res.usage.web_search_requests} searches${res.partial ? ", cut short by the clock" : ""}`,
      });
      /* Persist lane output into the checkpoint as salvage: if this
         invocation dies later, the citations already gathered survive for
         diagnosis. */
      return { key: lane.key, res };
    }),
  );

  const mergedCitations: ApiCitation[] = [];
  const narratives: string[] = [];
  let anyComplete = false;
  for (const r of laneResults) {
    if (r.status !== "fulfilled") continue;
    usageBox.value = addUsage(usageBox.value, r.value.res.usage);
    mergedCitations.push(...r.value.res.citations);
    narratives.push(`## Lane: ${r.value.key}\n${r.value.res.narrative}`);
    if (!r.value.res.partial) anyComplete = true;
  }
  stageUsage.s3 = usageBox.value;
  markStage("s3_deep_research");

  if (mergedCitations.length === 0 && narratives.join("").length < 200) {
    await finishInsufficient(
      supabase,
      evaluationId,
      emit,
      "The deep research pass returned nothing usable. Please re-run.",
    );
    return;
  }

  const citations = harvestCitations(
    { citations: mergedCitations, narrative: narratives.join("\n\n") },
    cp.researchDomains,
    new Date().toISOString(),
  );
  await emit({
    stage: "research",
    kind: "micro_finding",
    label: `Deep research finished: ${citations.length} sources collected across ${DEEP_MODE.lanes.length} lanes`,
  });

  await runPipelineTail(
    {
      supabase,
      anthropicKey: env.anthropicKey,
      apiKeys: {
        sam: Deno.env.get("SAM_GOV_API_KEY") ?? "",
        socrata: Deno.env.get("SOCRATA_APP_TOKEN") ?? "",
        edgar_user_agent: Deno.env.get("EDGAR_USER_AGENT") ?? "",
        github: Deno.env.get("GITHUB_TOKEN") ?? "",
      },
      evaluationId,
      emit,
      setStatus,
      markStage,
      usageBox,
      stageUsage,
      stageMs,
    },
    {
      inputKind: cp.inputKind,
      userState: cp.userState,
      vendorName: cp.vendorName,
      vendorKey: cp.vendorKey,
      resolvable: cp.resolvable,
      extract: cp.extract,
      checks: cp.checks,
      identity: cp.identity,
      adv: cp.adv,
      citations,
      /* Partial only when EVERY lane was cut short. */
      researchPartial: !anyComplete,
      primaryDomain: cp.primaryDomain,
      discoveredDomain: cp.discoveredDomain,
      feedNames: cp.feedNames,
      foundingYear: cp.foundingYear,
      senderDomain: cp.senderDomain,
      pitchPersonCount: cp.pitchPersonCount,
      pitchCustomerCount: cp.pitchCustomerCount,
      pitchAddressCount: cp.pitchAddressCount ?? 0,
      productNames: cp.productNames ?? [],
      siteStateMentioned: cp.siteStateMentioned ?? null,
      siteStatesFound: cp.siteStatesFound ?? [],
      siteClaimQuotes: cp.siteClaimQuotes,
      deep: true,
    },
  );
}
