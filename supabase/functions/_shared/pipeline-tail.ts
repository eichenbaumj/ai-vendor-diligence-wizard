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
  DecisionImpact,
  PitchExtract,
  type RegistryCheck,
  Report,
  type SectorContext,
} from "./schemas.ts";
import {
  buildLexiconCorpus,
  eligibilityLexiconHit,
  lexiconFallbackPackIds,
} from "./sector-lexicon.ts";
import { computeTier } from "./tier.ts";
import { assemble, IDENTITY_WHAT_CHECKED } from "./assemble.ts";
import { lintImplication, lintObject, lintText, tidyProse } from "./lint.ts";
import { NO_BASIS_IMPLICATION } from "./plausibility.ts";
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
import {
  adjudicateChecks,
  buildTieCorpus,
  discoverBridgeNames,
  tieFactsForCheck,
} from "./identity-ties.ts";
import { splitNameCandidates } from "./text-match.ts";
import { PACKS, PACK_RELEASE } from "./packs.gen.ts";
import { STATE_ITEMS } from "./state-items.ts";
import type { S5UserInput } from "./prompts/s5-structure.ts";
import * as registry from "./registry/index.ts";

export const METHODOLOGY_VERSION = "1.5";

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
  /* Optional: callers predating the tying-signal build omit them. */
  pitchAddressCount?: number;
  productNames?: string[];
  siteClaimQuotes: string[];
  /* Marks the report as a deep-mode result in the usage jsonb. */
  deep?: boolean;
  /* A deep check was requested but the deep-research handoff failed, so
     this run continued as a standard check. Recorded in the usage jsonb
     and surfaced as an honesty-panel row — a degraded deep run must never
     pass silently (the cook-time study caught one in the wild). */
  deepHandoffFailed?: boolean;
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

  /* ----------------------------------------------- S2c attribution pass */

  /* Authoritative adjudication: the head's provisional pass ran before
     research, so coverage-based ties (an officer's name in class 1-2
     press) could not exist yet. Ties are monotone-add — re-running with
     citations can only attribute more records, never fewer. Identity is
     recomputed from the adjudicated checks; this is the authoritative
     value for assembly on both the standard and deep paths. */
  const tieCorpus = buildTieCorpus({
    extract,
    pitchPersonCount: state.pitchPersonCount,
    pitchAddressCount: state.pitchAddressCount ?? 0,
    primaryDomain: state.primaryDomain,
    productNames: state.productNames ?? [],
    citations,
  });
  adjudicateChecks(checks, tieCorpus);

  /* S3 -> S2 name bridge (the SteadyIQ/Prepared fix): when NO registry
     record is attributed to the vendor but research retrieved a fuller
     legal name from a registry-grade official source, re-run the registry
     lanes under that name. A bridge hit replaces the same lane's non-hit;
     a bridge miss is discarded, so the sweep that already ran never gets
     worse. Bridged checks then go through the same adjudication — the
     discovered record still needs a tie to attribute. */
  const nameSplit = splitNameCandidates(extract.vendor_name_candidates);
  const hasAttributedRegistry = checks.some(
    (c) =>
      c.attribution === "attributed" &&
      (c.check_id.startsWith("sos_") ||
        /^sam(_entity)?$/.test(c.check_id) ||
        /edgar/.test(c.check_id)),
  );
  if (!hasAttributedRegistry) {
    const bridgeNames = discoverBridgeNames(citations, {
      anchorNames: nameSplit.anchorNames,
      productNames: nameSplit.productNames,
      knownNames: nameSplit.identityNames,
    });
    if (bridgeNames.length > 0) {
      await emit({
        stage: "registry",
        kind: "micro_finding",
        label: `Official records name ${bridgeNames.map((b) => b.name).join(" and ")}; re-running the registry search under that name`,
      });
      const bridgeQueryNames = bridgeNames.map((b) => b.name);
      const productTokens = registry.productOnlyTokens(
        nameSplit.productNames,
        nameSplit.anchorNames,
      );
      const bridgeResults = await Promise.allSettled([
        registry.checkSosSweep(
          { companyNames: bridgeQueryNames, productTokens },
          ctx(12_000),
        ),
        registry.checkSamEntity(
          { companyNames: bridgeQueryNames, productTokens },
          ctx(),
        ),
        registry.checkEdgarFts({ companyNames: bridgeQueryNames }, ctx()),
      ]);
      const bridged: RegistryCheck[] = [];
      for (const r of bridgeResults) {
        if (r.status !== "fulfilled") continue;
        bridged.push(...(Array.isArray(r.value) ? r.value : [r.value]));
      }
      for (const fresh of bridged) {
        if (fresh.status !== "hit") continue;
        fresh.data = {
          ...((fresh.data ?? {}) as Record<string, unknown>),
          name_bridge: {
            discovered_name: bridgeNames[0].name,
            source_url: bridgeNames[0].source_url,
            source_host: bridgeNames[0].source_host,
          },
        };
        const existing = checks.findIndex((c) => c.check_id === fresh.check_id);
        if (existing === -1) checks.push(fresh);
        else if (checks[existing].status !== "hit") checks[existing] = fresh;
        else continue; /* never displace a hit the original sweep found */
        await emit({
          stage: "registry",
          kind: "check_result",
          label: fresh.summary,
          check_id: fresh.check_id,
          status: fresh.status,
          evidence_url: fresh.evidence_url,
        });
      }
      /* Re-adjudicate: the bridged records need their own verdicts. */
      adjudicateChecks(checks, tieCorpus);
    }
  }

  /* MX direct retry (identity availability robustness): when the RDAP
     lookup was unavailable and no working mail check exists for the
     vendor's domain, one DNS query — near-free and deterministic — can
     stand in as the second identity identifier. Previously the fallback
     only fired when a dns_email_hygiene check happened to have run and
     hit; a vendor's verdict must not drop tiers because a third-party
     lookup had a bad minute. Provenance flags copy from the domain's
     inference check so a discovered domain keeps its confirmed-name-match
     gate. */
  if (needsMxRetry(checks)) {
    const domainForMx = state.primaryDomain ?? state.discoveredDomain;
    if (domainForMx) {
      try {
        const retry = await registry.checkEmailHygiene(
          { domain: domainForMx, senderDomain: state.senderDomain },
          ctx(),
        );
        if (!state.primaryDomain) {
          const inference = checks.find((c) => c.check_id === "domain_inference");
          retry.data = {
            ...((retry.data ?? {}) as Record<string, unknown>),
            discovered_domain: true,
            confirmed_name_match:
              ((inference?.data ?? {}) as { confirmed_name_match?: boolean })
                .confirmed_name_match === true,
          };
        }
        const existing = checks.findIndex((c) => c.check_id === "dns_email_hygiene");
        if (existing === -1) checks.push(retry);
        else if (checks[existing].status === "error") checks[existing] = retry;
      } catch (err) {
        console.error(`mx retry failed: ${String(err)}`);
      }
    }
  }

  const adjudicatedIdentity = registry.resolveIdentity(checks);
  if (adjudicatedIdentity.identity_resolved !== identity.identity_resolved) {
    await emit({
      stage: "registry",
      kind: "micro_finding",
      label: adjudicatedIdentity.identity_resolved
        ? "Identity resolved: research coverage tied a registry record to this vendor"
        : "Identity not resolved: no detail ties the matched records to this vendor",
    });
  }

  /* Debarment follows the ATTRIBUTED entity: when an attributed registry
     record carries a legal name the original exclusion queries did not
     cover (the single-token "Govra" case), re-run the exclusions lane
     under that name; replace only when the follow-up finds a record.
     Candidate records' names are never searched here — querying the
     exclusion list under a namesake's legal name manufactures exact-match
     false CRITICALs. */
  {
    const rawNames = extract.vendor_name_candidates;
    const alreadyQueried = new Set(
      [
        ...rawNames,
        ...nameSplit.anchorNames.filter(
          (n) => !rawNames.includes(n) && n.trim().split(/\s+/).length >= 2,
        ),
      ].map((n) => registry.normalizeCompanyName(n)),
    );
    const attributedLegalNames = checks
      .filter(
        (c) =>
          c.attribution === "attributed" &&
          (c.check_id.startsWith("sos_") || c.check_id === "sam_entity"),
      )
      .flatMap((c) => {
        const facts = tieFactsForCheck(c);
        return facts ? [facts.legal_name] : [];
      });
    const freshLegalNames = registry
      .dedupeNames(attributedLegalNames)
      .filter((n) => !alreadyQueried.has(registry.normalizeCompanyName(n)));
    if (freshLegalNames.length > 0) {
      try {
        const follow = await registry.checkSamExclusions(
          { companyNames: freshLegalNames.slice(0, 4), people: [] },
          ctx(),
        );
        const existing = checks.findIndex((c) => c.check_id === "sam_exclusions");
        if (
          follow.status === "hit" &&
          (existing === -1 || checks[existing].status !== "hit")
        ) {
          if (existing >= 0) checks[existing] = follow;
          else checks.push(follow);
          await emit({
            stage: "registry",
            kind: "check_result",
            label: follow.summary,
            check_id: follow.check_id,
            status: follow.status,
            evidence_url: follow.evidence_url,
          });
        }
      } catch (err) {
        console.error(`exclusions follow-up failed: ${String(err)}`);
      }
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
      ? parseStructured<{
          pack_ids: string[];
          overlay: boolean;
          overlay_reason: string | null;
          decision_impact?: string;
        }>(res)
      : null;
    if (parsed) {
      const validIds = parsed.pack_ids.filter((id) => PACKS[id]).slice(0, 3);
      const elevatedPack = validIds.some((id) => PACKS[id]?.scrutiny_tier === "elevated");
      const impact = DecisionImpact.safeParse(parsed.decision_impact);
      sector = {
        ...sector,
        pack_ids: validIds as SectorContext["pack_ids"],
        /* A determinative read adds scrutiny even if the overlay boolean
           did not fire; nothing here can remove it. */
        elevated:
          elevatedPack || parsed.overlay || impact.data === "determinative",
        overlay_reason: parsed.overlay ? (parsed.overlay_reason ?? "").slice(0, 300) || null : null,
        ...(impact.success ? { decision_impact: impact.data } : {}),
      };
    }
    /* Lexicon fallback: a failed or empty model classification must not
       erase sector tailoring (a 12-second Haiku timeout used to do exactly
       that). Code matches each pack's signal_lexicon and takes the top
       matches. */
    if (sector.pack_ids.length === 0) {
      const corpus = buildLexiconCorpus(
        extract.use_case_description,
        extract.claims.map((c) => c.quote),
      );
      const fallbackIds = lexiconFallbackPackIds(PACKS, corpus).filter(
        (id): id is SectorContext["pack_ids"][number] => Boolean(PACKS[id]),
      );
      if (fallbackIds.length > 0) {
        sector = {
          ...sector,
          pack_ids: fallbackIds as SectorContext["pack_ids"],
          elevated:
            sector.elevated ||
            fallbackIds.some((id) => PACKS[id]?.scrutiny_tier === "elevated"),
        };
      }
    }
    /* Eligibility safety net, applied regardless of classifier health:
       an eligibility-lexicon hit can only ADD scrutiny. */
    if (!sector.elevated) {
      const corpus = buildLexiconCorpus(
        extract.use_case_description,
        extract.claims.map((c) => c.quote),
      );
      if (eligibilityLexiconHit(PACKS, corpus)) {
        sector = {
          ...sector,
          elevated: true,
          overlay_reason:
            sector.overlay_reason ??
            "Automatic pattern check: the product description matches eligibility and benefits decision vocabulary.",
        };
      }
    }
    if (sector.pack_ids.length > 0) {
      await emit({
        stage: "packs",
        kind: "micro_finding",
        label: `Category: ${sector.pack_ids.map((id) => PACKS[id].pack_name).join(", ")}${sector.elevated ? " (elevated scrutiny)" : ""}`,
      });
    }
  }

  /* --------------------------------------------------------- S5 synthesis */
  await setStatus("synthesis");
  await emit({ stage: "synthesis", kind: "stage_start", label: "Writing your report" });

  const generatedAt = new Date().toISOString();
  const skeleton = assemble({
    extract,
    checks,
    identity: adjudicatedIdentity,
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
    /* The identity miss-row explains the tool's own registry coverage, and
       model phrasing has inverted that fact live ("these six states do not
       offer free automated searches" about exactly the states that do).
       Both miss variants are templated in code; the second-identifier
       variant keeps model phrasing for its nuance. */
    if (
      r.id === "identity" &&
      r.result === "COULD_NOT_VERIFY" &&
      r.what_checked === IDENTITY_WHAT_CHECKED
    ) {
      /* EDGAR ran exactly when assemble put an EDGAR check in the row's
         sources; the note's EDGAR clause must match that. */
      const searchedEdgar = r.sources.some((s) => /edgar/i.test(s.title ?? ""));
      return {
        ...r,
        note: identityMissNote(r.sources[0]?.retrieved_at ?? generatedAt, searchedEdgar),
      };
    }
    if (
      r.id === "identity" &&
      r.result === "COVERAGE_LIMITED" &&
      r.what_checked === IDENTITY_WHAT_CHECKED
    ) {
      /* The coverage-limited variant enumerates which registries actually
         ran: model phrasing claimed searches of exactly the lanes that were
         could_not_check (Florida, 2026-08-29), the inverted-coverage class
         this template family exists to prevent. */
      const searchedEdgar = r.sources.some((s) => /edgar/i.test(s.title ?? ""));
      return {
        ...r,
        note: identityCoverageLimitedNote(
          checks,
          searchedEdgar,
          r.sources[0]?.retrieved_at ?? generatedAt,
        ),
      };
    }
    /* Rows assemble already templated in code (registry statuses, the
       dissolution surface, role-change conflicts, domain age, similarity
       candidates) keep their notes: load-bearing self-descriptions are
       never model-phrased. */
    if (r.note !== "") return r;
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
    green_flags: enforceRegistryStatusFlags(
      narrative.value?.green_flags ??
        skeleton.greenFlagFacts.map(
          (g) => `${g.fact} (${g.source_name}, checked ${g.date})`,
        ),
      skeleton.greenFlagFacts,
    )
      .slice(0, 15)
      .map((g) => tidyProse(g, 400)),
    adv_findings: adv.slice(0, 6),
    honesty_panel: skeleton.honesty,
    questions: skeleton.questions,
    manual_checks: skeleton.manualChecks,
    leads: skeleton.leads,
    unassessed_sources: firewallSources(skeleton.unassessedSources),
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

  if (state.deepHandoffFailed) {
    report.honesty_panel.push({
      check_id: "deep-mode",
      label: "Deep check",
      status: "could_not_check",
      reason:
        "The deep engine did not respond, so this ran as a standard check. Re-run to try deep mode again.",
      group: "unavailable",
    });
  }

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
    /* Questions can quote attacker-authored claim text (perf-* templates).
       A banned word in the question text drops the question; in the why or
       red_flag it falls back to a neutral template. Core questions carry no
       quotes and are never dropped. */
    report.questions = report.questions.flatMap((q) => {
      if (lintText(q.text).some((v) => v.kind === "banned")) return [];
      const cleaned = { ...q };
      if (lintText(cleaned.why).some((v) => v.kind === "banned")) {
        cleaned.why = "This question closes a gap the report flagged above.";
      }
      if (
        cleaned.red_flag &&
        lintText(cleaned.red_flag).some((v) => v.kind === "banned")
      ) {
        delete cleaned.red_flag;
      }
      return [cleaned];
    });
  }

  /* Implication surface guard (belt and suspenders on top of the module's
     own self-lint): quoted basis spans are attacker-authored, and the
     surface bans evaluative adjectives outright. */
  for (const row of report.ledger) {
    if (
      row.implication &&
      lintImplication(row.implication).some((v) => v.kind === "banned")
    ) {
      row.implication = NO_BASIS_IMPLICATION;
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
        ...(state.deepHandoffFailed
          ? { deep_requested: true, deep_handoff_failed: true }
          : {}),
      },
    })
    .eq("id", evaluationId);
  await emit({ stage: "synthesis", kind: "done", label: "Report ready" });
}

/* ------------------------------------------------------------- helpers */

/* Deterministic note for the identity clean-miss row. It describes the
   tool's own coverage, and model phrasing has inverted that fact live, so
   no model writes it. It leads with SEC EDGAR because that search is
   national for venture-funded companies; the state registries are the
   free-automated frontier, not the whole net. The EDGAR clause appears
   only when EDGAR actually ran (its check is then in the row's sources);
   claiming an EDGAR search that did not happen is the same class of
   coverage lie the template exists to prevent. */
/* The MX retry fires when RDAP was unavailable (never on a definitive
   unregistered-domain miss) and no working dns_email_hygiene hit exists —
   either the check never ran, or it errored. Pure predicate, exported for
   tests. */
export function needsMxRetry(checks: RegistryCheck[]): boolean {
  const rdap = checks.find((c) => c.check_id === "rdap_domain_age");
  const rdapUnavailable =
    rdap !== undefined &&
    (rdap.status === "error" || rdap.status === "coverage_limited");
  if (!rdapUnavailable) return false;
  const dns = checks.find((c) => c.check_id === "dns_email_hygiene");
  return dns === undefined || dns.status === "error";
}

export function identityMissNote(retrievedAt: string, searchedEdgar: boolean): string {
  const date = retrievedAt.slice(0, 10);
  if (searchedEdgar) {
    return (
      `We checked SEC EDGAR, the federal filing database that covers venture-funded companies in every state, plus the five state business registries that offer free automated search, on ${date}, and did not find a registered entity under any name the pitch uses. ` +
      "Companies that have raised venture money usually appear in EDGAR no matter where they operate. Even so, absence here is not proof the company does not exist: many firms never file with the SEC, and most states do not offer automated registry search. " +
      "Ask the vendor for its state of registration and search that state's official registry directly; it takes about a minute."
    );
  }
  return (
    `We searched the five state business registries that offer free automated search on ${date} and did not find a registered entity under any name the pitch uses. ` +
    "We could not reach SEC EDGAR, the federal filing database, for this report; the honesty panel says so. Absence here is not proof the company does not exist: most states do not offer automated registry search. " +
    "Ask the vendor for its state of registration and search that state's official registry directly; it takes about a minute."
  );
}

/* Deterministic note for the identity row when at least one registry lane
   was UNAVAILABLE and the reachable ones found nothing. Names only what
   actually ran; the unreachable lanes are pointed at the honesty panel. */
const SOS_STATE_NAMES: Record<string, string> = {
  sos_ny: "New York",
  sos_co: "Colorado",
  sos_ct: "Connecticut",
  sos_tx: "Texas",
  sos_or: "Oregon",
  sos_fl: "Florida",
};

export function identityCoverageLimitedNote(
  checks: RegistryCheck[],
  searchedEdgar: boolean,
  retrievedAt: string,
): string {
  const date = retrievedAt.slice(0, 10);
  const ran: string[] = [];
  const unavailable: string[] = [];
  for (const [id, name] of Object.entries(SOS_STATE_NAMES)) {
    const check = checks.find((c) => c.check_id === id);
    if (!check) continue;
    if (check.status === "definitive_miss") ran.push(name);
    else if (check.status === "coverage_limited" || check.status === "error") {
      unavailable.push(name);
    }
  }
  const unavailablePart =
    unavailable.length > 0
      ? `${unavailable.join(", ")} could not be checked this run; the honesty panel says why. `
      : "";
  const closing =
    "Absence here is not proof the company does not exist: many firms never file with the SEC, and most states do not offer automated registry search. Ask the vendor for its state of registration and search that state's official registry directly; it takes about a minute.";
  if (ran.length === 0 && !searchedEdgar) {
    return `We could not reach the state business registries or SEC EDGAR this run, so no definitive registration search completed; the honesty panel lists what was unavailable. ${closing}`.slice(0, 700);
  }
  if (searchedEdgar) {
    return `We checked SEC EDGAR, the federal filing database that covers venture-funded companies in every state${
      ran.length > 0 ? `, plus the state business registries we could reach (${ran.join(", ")})` : ""
    }, on ${date}, and did not find a registered entity under any name the pitch uses. ${unavailablePart}${closing}`.slice(0, 700);
  }
  return `We searched the state business registries we could reach (${ran.join(", ")}) on ${date} and did not find a registered entity under any name the pitch uses. ${unavailablePart}We could not reach SEC EDGAR, the federal filing database, for this report; the honesty panel says so. ${closing}`.slice(0, 700);
}

/* Registry-status legibility for green flags: a model-phrased flag about a
   program listing is replaced by the code-templated fact, which carries the
   exact status level ("Progressing" is not "Authorized"; "Provisional" is
   not "Level 2"). A program flag with no underlying fact is dropped. */
const PROGRAM_FLAG_PATTERNS: RegExp[] = [
  /fedramp/i,
  /govramp|stateramp/i,
  /tx-?ramp/i,
  /sourcewell/i,
];

export function enforceRegistryStatusFlags(
  flags: string[],
  facts: { fact: string; source_name: string; date: string }[],
): string[] {
  let out = [...flags];
  for (const re of PROGRAM_FLAG_PATTERNS) {
    const fact = facts.find((f) => re.test(f.fact));
    const templated = fact
      ? `${fact.fact} (${fact.source_name}, checked ${fact.date})`
      : null;
    let replaced = false;
    out = out.flatMap((f) => {
      if (!re.test(f)) return [f];
      if (!templated || replaced) return [];
      replaced = true;
      return [templated];
    });
  }
  return out;
}

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
