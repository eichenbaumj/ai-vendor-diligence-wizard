/*
  The question engine. Pure code, no LLM, no I/O: every question is selected
  by id from pack metadata or built from a fixed template, keyed only on
  typed pipeline signals (findings, claim types, sector context, verdict
  tier). docs/methodology.md "How the question pack is chosen" documents
  this module and must move with it in the same commit.

  Composition, in priority order into a budget of 15 with the 5 universal
  core questions reserved (they can never be crowded out):

  G1 gap/claim  — templates keyed to unresolved findings, severity-ordered
                  with a per-dimension cap so registry findings cannot crowd
                  out the vendor-specific D6 performance questions.
  G2 overlay    — the eligibility pack's four overlay-core questions, merged
                  into other packs' reports when elevated scrutiny fires
                  (methodology D7.2).
  G3 triggered  — pack questions whose `select` metadata matches a fired
                  finding, a present claim type, or elevated scrutiny.
  G4 base slate — the pack's default questions (select.base), tier-gated.
  G5 governance — the D3.10 NIST AI RMF / ISO 42001 ask at tier >= 2.
  G6 T4 sweep   — one consolidated document-request question per dimension
                  whose ledger rows could not be verified and produced no
                  G1 question (methodology "every T4 item generates or joins
                  a question, consolidated per dimension").
  G7 core       — the five universal questions, always last, always present.

  Tier conditioning: tiers 0-1 get gap + core only (pack marketing-stage
  questions are noise when the next step is "resolve identity first");
  tier 3 skips questions marked tiers:[4]; tier 4 includes the contract /
  reference / demo-stage questions (methodology tier descriptions).
*/
import type {
  PitchExtract,
  ReportQuestion,
  SectorContext,
  VerdictTier,
} from "./schemas.ts";
import type { Finding } from "./tier.ts";
import type { PackQuestion, SectorPack } from "./packs-types.ts";
import { findingSelectorMatches } from "./finding-ids.ts";
import { tidyProse } from "./lint.ts";

export interface QuestionSelectionInput {
  findings: Finding[];
  extract: PitchExtract;
  sector: SectorContext;
  packs: Record<string, SectorPack>;
  tier: VerdictTier;
  /* Dimensions (D1..D6) holding >= 1 COULD_NOT_VERIFY ledger row. */
  t4_dimensions: string[];
  namedCustomers: string[];
}

const TOTAL_BUDGET = 15;
const CORE_RESERVED = 5;
const GAP_CAP = 5;
const GAP_PER_DIMENSION = 2;
const OVERLAY_PACK = "eligibility-case-mgmt";
const PRIMARY_PACK_CAP = 6;
const SECONDARY_PACK_CAP = 3;
const T4_CAP = 3;

const SEVERITY_RANK: Record<Finding["severity"], number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
};

const CLAIM_TYPE_LABEL: Record<string, string> = {
  identity: "company-history",
  customer: "customer",
  compliance: "compliance",
  performance: "performance",
  team: "team",
  pricing: "pricing",
  availability: "availability",
};

/* ------------------------------------------------------- G1 templates */

interface GapContext {
  extract: PitchExtract;
  namedCustomers: string[];
}

function gapTemplate(f: Finding, ctx: GapContext): ReportQuestion | null {
  if (f.id === "customers") {
    return {
      id: "gap-customers",
      source: "gap",
      text: `Your materials name ${ctx.namedCustomers.slice(0, 3).join(", ")} as customers. For each: is there an active paid contract, a pilot, or individual users? Please provide the contract administrator's name and contact so we may verify.`,
      why: "None of the named customers left a public record trace we could find.",
    };
  }
  if (f.id.startsWith("perf-")) {
    const claim = ctx.extract.claims.find((c) => `perf-${c.id}` === f.id);
    if (!claim) return null;
    return {
      id: f.id,
      source: "claim",
      text: `Your materials state: "${claim.quote}". Which deployment produced this figure, measured how, over what period, and may we contact that organization?`,
      why: "Performance numbers need a methodology and a named reference before they can inform a decision.",
    };
  }
  if (f.id === "fedramp_marketplace" || f.id === "govramp") {
    return {
      id: `gap-${f.id}`,
      source: "gap",
      text: "Please provide the exact authorization your product holds: the program (FedRAMP or GovRAMP), the status level, the package or listing ID, and the sponsoring agency, so we can confirm it in the public marketplace.",
      why: "The authorization described in the pitch did not match the public feed when we checked.",
    };
  }
  if (f.id === "txramp") {
    return {
      id: "gap-txramp",
      source: "gap",
      text: "Please provide your TX-RAMP certification letter, or a confirmation from Texas DIR, naming the level you hold (Level 1, Level 2, or Provisional) and the certified product.",
      why: "The TX-RAMP certification described in the pitch was not on the published list when we checked, and that list can lag.",
    };
  }
  if (f.id === "domain-age") {
    return {
      id: "gap-domain-age",
      source: "gap",
      text: "Your materials describe a multi-year track record. Please list the legal entity name and founding year, any prior company names, and two customers from that earlier period we may contact.",
      why: "The company's web presence is much newer than the history described.",
    };
  }
  if (f.id.startsWith("dissolved-candidate-")) {
    /* Candidate-record variant: the record matched only by name and no
       detail ties it to this vendor, so the question asks whether it is
       theirs at all. Cheap for the buyer, no verdict impact (the finding
       is MEDIUM and the row carries no severity). */
    return {
      id: "gap-dissolved-candidate",
      source: "gap",
      text: "A state registry lists a company under a name matching yours whose registration has ended. We found no detail connecting that record to your company. Is it yours? If not, a one-line confirmation of your legal entity name and registration state settles it.",
      why: "A same-name record with an ended registration exists; one answer separates a namesake from a problem.",
    };
  }
  if (f.id.startsWith("dissolved-")) {
    return {
      id: "gap-dissolved",
      source: "gap",
      text: "A state registry lists a company under your name whose registration has ended. Which legal entity would sign a contract today, in what state is it registered and in good standing, and how does it relate to the record we found?",
      why: "The public record shows an ended registration under a matching name; the contracting entity needs to be clear before anything moves forward.",
    };
  }
  if (f.id === "excl") {
    return {
      id: "gap-excl",
      source: "gap",
      text: "A federal exclusions search returned a record matching your legal identity. Please explain that record: the entity and people it covers, its current status, and any resolution documents.",
      why: "An exclusion record match must be explained before any engagement can move forward.",
    };
  }
  if (f.id === "sourcewell") {
    return {
      id: "gap-sourcewell",
      source: "gap",
      text: "Please provide your cooperative contract number and a link to the cooperative's own listing for it, so we can confirm the contract in the cooperative's published holder list.",
      why: "The cooperative contract described in the pitch was absent from the cooperative's own published list when we checked.",
    };
  }
  if (f.id === "leadership") {
    return {
      id: "gap-leadership",
      source: "gap",
      text: "For each person your materials name as leadership, please share one independent public reference we can check, such as a conference program, press coverage, a patent, or a published paper.",
      why: "We could not corroborate the named leadership in public sources independent of the company's own site.",
    };
  }
  if (f.id === "cert-vocab") {
    return {
      id: "gap-cert-vocab",
      source: "gap",
      text: "For each certification your materials name, please provide the issuing body, the audit or certification date, and the exact product covered.",
      why: "The pitch uses certification language we could not match to a recognized program.",
    };
  }
  if (f.id === "email") {
    return {
      id: "gap-email",
      source: "gap",
      text: "Please confirm the email domain your team sends from and how it relates to your primary web domain, and name a contact at your company we can reach through the main domain.",
      why: "The pitch did not arrive from working corporate email infrastructure under the company's own domain.",
    };
  }
  if (f.id === "model-transparency") {
    return {
      id: "gap-model-transparency",
      source: "gap",
      text: "Which AI models power the product? Please name the model families, whether they are commercial services or self-hosted, and your policy for telling customers when the models change.",
      why: "No model disclosure appeared anywhere in the materials we reviewed.",
    };
  }
  if (f.id === "automation") {
    return {
      id: "gap-automation",
      source: "gap",
      text: "What fraction of transactions require human completion, and how is that staffed?",
      why: "Materials describing full automation rarely survive contact with production volumes; the staffing answer shows whether the vendor has measured it.",
    };
  }
  return null;
}

/* ------------------------------------------------- pack question builder */

type PackWhy =
  | { kind: "base"; packName: string }
  | { kind: "claim"; claimType: string }
  | { kind: "finding" }
  | { kind: "elevated" }
  | { kind: "overlay" };

function packQuestion(pq: PackQuestion, why: PackWhy): ReportQuestion {
  const good = pq.good_answer;
  let whyText: string;
  switch (why.kind) {
    case "base":
      whyText = `A standard question for ${why.packName} vendors. A credible answer: ${good}`;
      break;
    case "claim":
      whyText = `The pitch makes a ${CLAIM_TYPE_LABEL[why.claimType] ?? why.claimType} claim this question tests. A credible answer: ${good}`;
      break;
    case "finding":
      whyText = `This question follows up a gap flagged in the report above. A credible answer: ${good}`;
      break;
    case "elevated":
      whyText = `Added under elevated scrutiny for this use case. A credible answer: ${good}`;
      break;
    case "overlay":
      whyText = `Added because this use can affect decisions about individual residents. A credible answer: ${good}`;
      break;
  }
  return {
    id: pq.id,
    source: "pack",
    text: tidyProse(pq.question, 900),
    why: tidyProse(whyText, 400),
    ...(pq.red_flag ? { red_flag: tidyProse(pq.red_flag, 300) } : {}),
  };
}

/* Legacy packs (no select metadata anywhere): first five questions act as
   the base slate, preserving the pre-engine behavior. */
function baseSlate(pack: SectorPack): PackQuestion[] {
  const annotated = pack.diligence_questions.some((q) => q.select);
  if (!annotated) return pack.diligence_questions.slice(0, 5);
  return pack.diligence_questions.filter((q) => q.select?.base === true);
}

function tierEligible(pq: PackQuestion, tier: VerdictTier): boolean {
  const tiers = pq.select?.tiers;
  if (!tiers || tiers.length === 0) return true;
  return tiers.includes(tier);
}

/* --------------------------------------------------- G6 T4 templates */

const T4_TEMPLATES: Record<string, { id: string; text: string }> = {
  D1: {
    id: "t4-d1",
    text: "Please provide your legal entity name, state of registration, and founding year, so the registration checks we could not complete can be finished.",
  },
  D2: {
    id: "t4-d2",
    text: "For the government customers your materials describe, please provide two references we may contact, including each contract administrator.",
  },
  D3: {
    id: "t4-d3",
    text: "Please share your current security documents directly: the SOC 2 report under NDA, your latest penetration test summary, or the equivalent evidence for the frameworks you claim.",
  },
  D4: {
    id: "t4-d4",
    text: "Describe how the product works at the depth our technical reviewer needs: the model providers, the data flows, what leaves our environment, and what is logged.",
  },
  D5: {
    id: "t4-d5",
    text: "For each person your materials name, please share one independent public reference we can check.",
  },
  D6: {
    id: "t4-d6",
    text: "For each number in your materials, please provide the measurement methodology and a named deployment we may contact.",
  },
};

const T4_WHY =
  "We searched public sources and could not corroborate items in this area. Documents from you close the gap fastest.";

/* ------------------------------------------------------------ the engine */

export function selectQuestions(input: QuestionSelectionInput): ReportQuestion[] {
  const { findings, extract, sector, packs, tier } = input;

  const chosen: ReportQuestion[] = [];
  const chosenIds = new Set<string>();
  const coveredDimensions = new Set<string>();
  const nonCoreBudget = TOTAL_BUDGET - CORE_RESERVED;

  const push = (q: ReportQuestion, dimension?: string): boolean => {
    if (chosen.length >= nonCoreBudget) return false;
    if (chosenIds.has(q.id)) return false;
    chosen.push({ ...q, why: tidyProse(q.why, 400) });
    chosenIds.add(q.id);
    if (dimension) coveredDimensions.add(dimension);
    return true;
  };

  /* G1: unresolved findings -> templates. Filter first, then rank by
     severity with a per-dimension cap (the slice-before-match bug fix:
     a stack of D1-D3 registry findings can no longer crowd out the D6
     performance questions, which are the most vendor-specific output the
     engine has). */
  const unresolved = findings
    .filter((f) => !f.resolved && SEVERITY_RANK[f.severity] <= SEVERITY_RANK.MEDIUM)
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
  const perDimension = new Map<string, number>();
  let gapCount = 0;
  for (const f of unresolved) {
    if (gapCount >= GAP_CAP) break;
    const used = perDimension.get(f.dimension) ?? 0;
    if (used >= GAP_PER_DIMENSION) continue;
    const q = gapTemplate(f, { extract, namedCustomers: input.namedCustomers });
    if (!q) continue;
    if (push(q, f.dimension)) {
      perDimension.set(f.dimension, used + 1);
      gapCount += 1;
    }
  }

  /* Tiers 0-1: the report's next step is resolving identity, not vendor
     marketing follow-ups — gap questions plus the universal core only
     (plus the T4 document sweep below). */
  const packStagesApply = tier >= 2;

  if (packStagesApply) {
    /* G2: the eligibility overlay merge (D7.2). decision_impact refines the
       dose: determinative gets all four overlay-core questions, advisory the
       first two; the elevated boolean alone (older classifier output, or an
       elevated pack match) also gets all four. */
    const overlayPack = packs[OVERLAY_PACK];
    const overlayApplies =
      sector.elevated && !sector.pack_ids.includes(OVERLAY_PACK) && overlayPack;
    if (overlayApplies) {
      const overlayCore = overlayPack.diligence_questions.filter(
        (q) => q.select?.overlay_core === true,
      );
      const dose =
        sector.decision_impact === "advisory" ? 2 : overlayCore.length;
      for (const pq of overlayCore.slice(0, dose)) {
        push(packQuestion(pq, { kind: "overlay" }));
      }
    }

    /* G3 + G4 per pack: triggered questions first, then the base slate,
       under a combined per-pack cap (primary pack 6, secondaries 3). The
       eligibility pack, when matched, is treated first (research spec
       sector-packs.md §3.2). */
    const presentClaimTypes = new Set(extract.claims.map((c) => c.type));
    const unresolvedIds = unresolved.map((f) => f.id);
    const orderedPackIds = [...sector.pack_ids].sort((a, b) =>
      a === OVERLAY_PACK ? -1 : b === OVERLAY_PACK ? 1 : 0,
    );

    orderedPackIds.forEach((packId, index) => {
      const pack = packs[packId];
      if (!pack) return;
      const cap = index === 0 ? PRIMARY_PACK_CAP : SECONDARY_PACK_CAP;
      let taken = 0;
      const take = (pq: PackQuestion, why: PackWhy): void => {
        if (taken >= cap) return;
        if (!tierEligible(pq, tier)) return;
        if (push(packQuestion(pq, why))) taken += 1;
      };

      /* Triggered, by weight then file order. */
      const triggered = pack.diligence_questions
        .map((pq, fileIndex) => ({ pq, fileIndex }))
        .filter(({ pq }) => {
          const sel = pq.select;
          if (!sel || sel.base) return false;
          const byClaim = sel.claim_types?.some((t) => presentClaimTypes.has(t));
          const byFinding = sel.finding_ids?.some((selector) =>
            unresolvedIds.some((id) => findingSelectorMatches(selector, id)),
          );
          const byElevated = sel.elevated && sector.elevated;
          return Boolean(byClaim || byFinding || byElevated);
        })
        .sort(
          (a, b) =>
            (b.pq.select?.weight ?? 0) - (a.pq.select?.weight ?? 0) ||
            a.fileIndex - b.fileIndex,
        );
      for (const { pq } of triggered) {
        const sel = pq.select;
        const why: PackWhy = sel?.claim_types?.some((t) => presentClaimTypes.has(t))
          ? {
              kind: "claim",
              claimType:
                sel.claim_types.find((t) => presentClaimTypes.has(t)) ?? "",
            }
          : sel?.finding_ids?.some((selector) =>
                unresolvedIds.some((id) => findingSelectorMatches(selector, id)),
              )
            ? { kind: "finding" }
            : { kind: "elevated" };
        take(pq, why);
      }

      /* Base slate. */
      for (const pq of baseSlate(pack)) {
        take(pq, { kind: "base", packName: pack.pack_name });
      }
    });

    /* G5: the governance baseline ask (methodology D3.10). */
    push({
      id: "gap-governance",
      source: "core",
      text: "Do you maintain an AI governance program aligned to the NIST AI Risk Management Framework or ISO/IEC 42001? Please share the artifact that shows it, such as a certificate, an audit letter, or the policy document itself.",
      why: "A governance baseline is the fastest way to see how a vendor manages model risk.",
    });
  }

  /* G6: consolidated document requests for unverified dimensions that no
     gap question already covers. */
  let t4Count = 0;
  for (const dim of [...input.t4_dimensions].sort()) {
    if (t4Count >= T4_CAP) break;
    if (coveredDimensions.has(dim)) continue;
    const template = T4_TEMPLATES[dim];
    if (!template) continue;
    if (push({ id: template.id, source: "gap", text: template.text, why: T4_WHY }, dim)) {
      t4Count += 1;
    }
  }

  /* G7: the universal core, reserved — never crowded out. */
  const core: ReportQuestion[] = [
    {
      id: "core-data-training",
      source: "core",
      text: "Will you sign a contract clause permanently prohibiting the use of our data to train any model, yours or a subprocessor's, absent our written consent?",
      why: "The single most common gap in government AI contracts.",
    },
    {
      id: "core-export",
      source: "core",
      text: "At contract end, what do we get back? Confirm no-cost machine-readable export of all our data and configurations, and name the format.",
      why: "Protects you from lock-in before it starts.",
    },
    {
      id: "core-references",
      source: "core",
      text: "Which government agencies use this product today? Are you listed in the GovAI Coalition registry, a state AI inventory, or a cooperative contract we can check?",
      why: "Verifiable references are the fastest path from pitch to informed conversation.",
    },
    {
      id: "core-breach",
      source: "core",
      text: "Define a reportable incident under our contract, your notification timeline, and who pays for breach response.",
      why: "Incident terms are cheapest to fix before signature.",
    },
    {
      id: "core-pricing",
      source: "core",
      text: "Provide the complete pricing structure: platform, usage, integration, support, and every trigger that changes our bill, including a surge scenario.",
      why: "Surprise overage economics are a recurring failure mode in AI contracts.",
    },
  ];
  const result = [...chosen];
  for (const q of core) {
    if (!chosenIds.has(q.id)) {
      result.push(q);
      chosenIds.add(q.id);
    }
  }
  return result.slice(0, TOTAL_BUDGET);
}
