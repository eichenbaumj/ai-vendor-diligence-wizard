/*
  The pipeline tail: everything after web-research citations exist —
  ADV-04 scan, the name-only inference fallback, S4 pack match, report
  assembly + tier computation, S5 narrative, S5.5 review, lint, schema
  validation, and persistence.

  Extracted from evaluate/index.ts so the deep-research function can run
  the identical tail over its own (larger) citation set. Pure TS except
  for the injected Supabase client and fetch-based model calls; no Deno
  APIs, so vitest can import it.
*/
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type AdvFinding,
  type Citation,
  PitchExtract,
  type RegistryCheck,
  Report,
  type SectorContext,
} from "./schemas.ts";
import { computeTier } from "./tier.ts";
import { assemble } from "./assemble.ts";
import { lintObject, lintText, tidyProse } from "./lint.ts";
import {
  MODELS,
  buildClassifyRequest,
  buildReviewRequest,
  buildStructureRequest,
} from "./anthropic.ts";
import {
  addUsage,
  callAnthropic,
  parseStructured,
  type Usage,
} from "./anthropic-client.ts";
import { detectPlantedCorroboration } from "./adv-corroboration.ts";
import { inferPrimaryDomain } from "./domain-inference.ts";
import { PACKS, PACK_RELEASE } from "./packs.gen.ts";
import { STATE_ITEMS } from "./state-items.ts";
import type { S5UserInput } from "./prompts/s5-structure.ts";
import * as registry from "./registry/index.ts";

export const METHODOLOGY_VERSION = "1.0";

const TAIL_TIMEOUTS = {
  registryPerEndpoint: 8_000,
  classify: 12_000,
  structure: 50_000,
  review: 40_000,
};

export interface TailEmitEvent {
  stage: "parse" | "registry" | "research" | "packs" | "synthesis" | "review";
  kind: string;
  label: string;
  check_id?: string | null;
  status?: string | null;
  evidence_url?: string | null;
}

export interface TailDeps {
  supabase: SupabaseClient;
  anthropicKey: string;
  apiKeys: Record<string, string>;
  evaluationId: string;
  emit: (e: TailEmitEvent) => Promise<void>;
  setStatus: (s: string) => Promise<unknown>;
  markStage: (name: string) => void;
  /* Mutable usage accounting shared with the head. */
  usageBox: { value: Usage };
  stageUsage: Record<string, Usage>;
  stageMs: Record<string, number>;
}

export interface TailState {
  inputKind: "paste" | "name" | "pdf" | "url";
  userState: string | null;
  vendorName: string;
  vendorKey: string;
  resolvable: boolean;
  extract: PitchExtract;
  checks: RegistryCheck[];
  identity: { identity_resolved: boolean; identifiers_found: string[] };
  adv: AdvFinding[];
  citations: Citation[];
  researchPartial: boolean;
  primaryDomain: string | null;
  discoveredDomain: string | null;
  feedNames: string[];
  foundingYear: number | null;
  senderDomain: string | null;
  pitchPersonCount: number;
  pitchCustomerCount: number;
  siteClaimQuotes: string[];
  /* Marks the report as a deep-mode result in the usage jsonb. */
  deep?: boolean;
}

export async function runPipelineTail(
  deps: TailDeps,
  state: TailState,
): Promise<void> {
  const { supabase, evaluationId, emit, setStatus, markStage } = deps;
  const {
    inputKind,
    userState,
    extract,
    checks,
    identity,
    adv,
    citations,
    vendorName,
    vendorKey,
  } = state;

  const ctx = (ms = TAIL_TIMEOUTS.registryPerEndpoint) => ({
    signal: AbortSignal.timeout(ms),
    apiKeys: deps.apiKeys,
  });
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

  /* S2b fallback: name-only runs whose pre-research discovery found no
     site can still infer one from research citations. Identity stays
     authoritative from the pre-research computation — the inferred RDAP
     hit never counts toward the two-identifier bar (it lacks the
     confirmed_name_match provenance). */
  if (inputKind === "name" && !state.primaryDomain && !state.discoveredDomain) {
    const inferred = inferPrimaryDomain(citations, state.feedNames);
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
        track(registry.checkDomainAge({ domain: inferred, claimedFoundingYear: state.foundingYear }, ctx())),
        track(registry.checkEmailHygiene({ domain: inferred, senderDomain: state.senderDomain }, ctx())),
        track(registry.checkWebHistory({ domain: inferred }, ctx())),
        track(registry.checkSubdomains({ domain: inferred }, ctx(10_000))),
        track(registry.checkGithubOrg({ candidates: state.feedNames, domain: inferred }, ctx())),
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
      { apiKey: deps.anthropicKey, timeoutMs: TAIL_TIMEOUTS.classify },
    );
    deps.usageBox.value = addUsage(deps.usageBox.value, res.usage);
    deps.stageUsage.s4 = res.usage;
    markStage("s4_classify");
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
    resolvable: state.resolvable,
    research_partial: state.researchPartial,
    pitch_person_count: state.pitchPersonCount,
    pitch_customer_count: state.pitchCustomerCount,
    generated_at: generatedAt,
  });
  const decision = computeTier(skeleton.tierInputs);

  /* Narrative pass. */
  const siteQuoteSet = new Set(state.siteClaimQuotes);
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
      }${r.claim_quote && siteQuoteSet.has(r.claim_quote) ? " The quoted claim comes from the vendor's public website." : ""}`,
    })),
    green_flag_facts: skeleton.greenFlagFacts,
    sector: {
      pack_names: sector.pack_ids.map((id) => PACKS[id]?.pack_name ?? id),
      elevated: sector.elevated,
      overlay_reason: sector.overlay_reason,
    },
    research_partial: state.researchPartial,
  };

  const narrative = await runStructurePass(deps.anthropicKey, s5Input);
  deps.usageBox.value = addUsage(deps.usageBox.value, narrative.usage);
  deps.stageUsage.s5 = narrative.usage;
  markStage("s5_structure");

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

  const report: Report = {
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
    leads: skeleton.leads,
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
      research_partial: state.researchPartial,
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
      apiKey: deps.anthropicKey,
      timeoutMs: TAIL_TIMEOUTS.review,
    });
    deps.usageBox.value = addUsage(deps.usageBox.value, res.usage);
    deps.stageUsage.review = res.usage;
    markStage("s5r_review");
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
      checkpoint: null,
      usage: {
        total: deps.usageBox.value,
        stages: deps.stageUsage,
        stages_ms: deps.stageMs,
        ...(state.deep ? { deep: true } : {}),
      },
    })
    .eq("id", evaluationId);
  await emit({ stage: "synthesis", kind: "done", label: "Report ready" });
}

/* ------------------------------------------------------------- helpers */

async function runStructurePass(
  anthropicKey: string,
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
      apiKey: anthropicKey,
      timeoutMs: TAIL_TIMEOUTS.structure,
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

export async function finishInsufficient(
  supabase: SupabaseClient,
  evaluationId: string,
  emit: (e: TailEmitEvent) => Promise<void>,
  reason: string,
): Promise<void> {
  await supabase
    .from("evaluations")
    .update({ status: "insufficient", error: reason })
    .eq("id", evaluationId);
  await emit({ stage: "synthesis", kind: "done", label: reason });
}

export function fallbackNote(result: string, _whatChecked: string, sourceName: string | null): string {
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

export function defaultSummary(tier: number): string {
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
      return "Public records corroborate this vendor's core claims across several independent sources. What remains is product and contract diligence: before a demo, ask the questions below. Note that verifying the company is not an evaluation of the product itself.";
  }
}

export function defaultNextSteps(tier: number): string[] {
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
