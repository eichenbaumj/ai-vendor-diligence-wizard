/*
  Deterministic report assembly. Pure code, no LLM, no I/O.

  Converts the pipeline's typed stage outputs (pitch extraction, registry
  ledger, research citations, sector context, ADV findings) into:
  - the verification ledger rows (results decided HERE, not by a model),
  - TierInputs for tier.ts,
  - the question pack (selected by id from packs + templates, never free-form),
  - the honesty panel,
  - manual check cards.

  The S5 narrative model only phrases what this module decides.
*/
import type {
  AdvFinding,
  Citation,
  HonestyItem,
  LeadRef,
  LedgerRow,
  SourceRef,
  ManualCheck,
  PitchExtract,
  RegistryCheck,
  ReportQuestion,
  SectorContext,
} from "./schemas.ts";
import { lintText } from "./lint.ts";
import {
  anchorIndexOf,
  domainRootCoversName,
  isDegenerateBrandName,
  tieFactsForCheck,
} from "./identity-ties.ts";
import { normalizeCompanyName, normalizeUnstripped } from "./registry/sam.ts";
import { computeImplication } from "./plausibility.ts";
import { PROGRAMS } from "./claim-status.ts";
import { computeTier } from "./tier.ts";
import type { Finding, T1Trigger, TierInputs } from "./tier.ts";
import type { SectorPack } from "./packs-types.ts";
import { selectQuestions } from "./questions.ts";
import { canVerify, isVendorHost } from "./domain-classes.ts";
import { adverseHeadlineHit } from "./adverse-lexicon.ts";
import {
  contentMentions,
  hostCovers,
  isNamedOrganization,
  norm,
  splitNameCandidates,
  urlMentions,
} from "./text-match.ts";

/* The identity row's what_checked doubles as the join key pipeline-tail
   uses to apply the code-templated clean-miss note. The partial-hit
   variant of the row shares the same id and result, so this exact string
   is load-bearing: import it, never retype it. */
export const IDENTITY_WHAT_CHECKED =
  "Whether a registered legal entity stands behind this pitch";

export interface AssembleInput {
  extract: PitchExtract;
  checks: RegistryCheck[];
  identity: { identity_resolved: boolean; identifiers_found: string[] };
  citations: Citation[];
  adv_findings: AdvFinding[];
  sector: SectorContext;
  packs: Record<string, SectorPack>;
  resolvable: boolean;
  /* True when research was cut off before completing its objectives. Gates
     the D5 aggregate finding: leadership corroboration is research objective
     3, so a partial run cannot support "the whole team left no trace". */
  research_partial: boolean;
  /* How many leading entries of extract.people / extract.named_customers
     came from the PITCH (the rest were mined from the vendor's site). The
     zero-verified aggregate findings count pitch-origin entries only: a
     vendor must never be worse off because its marketing site named more
     people or customers. Defaults to the full lengths. */
  pitch_person_count?: number;
  pitch_customer_count?: number;
  generated_at: string; // ISO
  /* The submitted domain's root label (identity-ties.ts domainRootOf),
     when the buyer put a web address in front of the tool. Federal-award
     credit requires the root to cover the recipient's name, the same
     consistency check D1.1 applies to registry records: a product name
     that took over the vendor name credited "CONDUIT"'s 50 federal awards
     to a company whose address is conductorai.com (probe, 2026-09-01). */
  submitted_domain_root?: string | null;
  /* Every domain the run treats as the vendor's own (pitch-stated,
     submitted, discovered), the same list harvestCitations received. The
     leads list keeps pages on these hosts out of the follow-up slots.
     Defaults to extract.domains, which misses a discovered domain, so the
     tail passes the tie corpus's union. */
  vendor_domains?: string[];
}

export interface AssembledSkeleton {
  tierInputs: TierInputs;
  ledger: LedgerRow[];
  greenFlagFacts: { fact: string; source_name: string; date: string }[];
  questions: ReportQuestion[];
  honesty: HonestyItem[];
  manualChecks: ManualCheck[];
  leads: LeadRef[];
  /* Class 1-2 citations that produced no row, attached to no row or card,
     and won no lead slot. The structuring invariant: every class 1-2
     citation is attached, a lead, or listed here — never silently
     dropped (research retrieved the adverse record and structuring
     discarded it, gauntlet theme C). */
  unassessedSources: SourceRef[];
}

function find(checks: RegistryCheck[], id: string): RegistryCheck | undefined {
  return checks.find((c) => c.check_id === id);
}

function dateOf(c: RegistryCheck): string {
  return c.retrieved_at.slice(0, 10);
}

/* Methodology 1.8: the candidate-record note, a code template over the
   record the lane was judged on. Candidate framing throughout: the record
   is shown for review, earns nothing, and drives no warning. */
export function candidateRecordNote(args: {
  source: string;
  legalName: string;
  exact: boolean;
  status: string | null;
  registered: string | null;
}): string {
  let s = `${args.source} lists an entry under a ${args.exact ? "matching" : "similar"} name: ${args.legalName}`;
  if (args.registered) s += `, registered ${args.registered}`;
  if (args.status) s += `, status listed as "${args.status}"`;
  s +=
    ". No detail connecting that record to this vendor was found, so it is shown as a candidate record only: it earns no credit and drives no warning. Ask the vendor whether this record is theirs.";
  return s;
}

/* The identity VERIFIED row's sentence, written by code from the credited
   record (methodology 1.7). Names only the credited record's legal name;
   the anchor-less variant names identifier labels only. Capped at the
   row's 700-character note limit by construction. */
export function identityVerifiedNote(args: {
  source: string | null;
  legalName: string | null;
  status: string | null;
  registered: string | null;
  checked: string;
  secondIdentifier: string | null;
  bridgeHost: string | null;
  identifiers?: string[];
}): string {
  if (args.source && args.legalName) {
    const status = args.status ? ` with status "${args.status.slice(0, 40)}"` : "";
    const registered = args.registered && /^\d{4}/.test(args.registered) ? `, registered ${args.registered.slice(0, 10)}` : "";
    const second = args.secondIdentifier
      ? ` A second independent identifier corroborates it: ${args.secondIdentifier}.`
      : "";
    const bridge = args.bridgeHost
      ? ` That name surfaced on ${args.bridgeHost} during research, so confirm it is the same company.`
      : "";
    return `${args.source} lists ${args.legalName}${status}${registered} (checked ${args.checked}).${second}${bridge}`.slice(0, 700);
  }
  const ids = (args.identifiers ?? []).slice(0, 2);
  return `Two independent identifiers converge on a registered legal entity: ${ids.join("; ")} (checked ${args.checked}).`.slice(0, 700);
}

function src(c: RegistryCheck) {
  return c.evidence_url
    ? [{ url: c.evidence_url, title: c.source, retrieved_at: c.retrieved_at }]
    : [];
}

/* Green-flag fact for a registry-feed hit: carries the EXACT listed status
   (methodology D3.2 promises exact-status reporting; "Progressing" is not
   "Authorized" and "Provisional" is not "Level 2") and labels similarity
   matches so a favorable line never silently borrows a namesake's listing. */
function registryHitFact(
  vendorName: string,
  wherePhrase: string,
  check: RegistryCheck,
): string {
  const data = (check.data ?? {}) as {
    matches?: {
      provider?: string;
      supplier?: string;
      status?: string;
      contract?: string;
    }[];
  };
  const best = data.matches?.[0];
  const status = best?.status ? ` with status "${best.status}"` : "";
  const contract = best?.contract ? ` (contract ${best.contract})` : "";
  const listedName = best?.provider ?? best?.supplier ?? null;
  const similar =
    check.confidence === "name_similarity" && listedName
      ? `, listed under the similar name ${listedName}; confirm it is the same company`
      : "";
  return `${vendorName} appears ${wherePhrase}${status}${contract}${similar}`;
}

/* Ledger row ids are stable and semantic so QA expectations and drift
   reports can key on them across runs. Loop-generated rows carry a slug
   of their subject; collisions get a numeric suffix. */
const usedRowIds = new Set<string>();
function uniqueRowId(base: string): string {
  let id = base.slice(0, 36) || "row";
  let n = 2;
  while (usedRowIds.has(id)) {
    id = `${base.slice(0, 32)}-${n}`;
    n += 1;
  }
  usedRowIds.add(id);
  return id;
}
/* Executive roles whose holders change, and the vocabulary independent
   coverage uses when they do. Both must hit in one citation's retrieved
   text for the dated role-change conflict to arm (a change verb alone
   false-positives on ordinary product copy like "replaces paper forms"). */
const EXEC_TITLE =
  /\b(?:CEO|CFO|COO|CTO|CIO|chief executive|chief financial|chief operating|chief technology|president)\b/i;
const ROLE_CHANGE_WORDS =
  /\b(?:ceo|cfo|coo|cto|cio|president|chief executive|chief financial|chief operating|chief technology)\b/i;
const ROLE_CHANGE_VERBS =
  /\bappoints?\b|\bappointed\b|steps? down|stepp(?:ed|ing) down|\bsucceeds?\b|\bsucceeded\b|\boutgoing\b|\bsuccessor\b|\bretir(?:es|ing|ed)\b|\bnew\b.{0,24}\b(?:ceo|cfo|coo|cto|cio|president)\b/i;
const ROLE_CHANGE = {
  test(corpus: string): boolean {
    return ROLE_CHANGE_WORDS.test(corpus) && ROLE_CHANGE_VERBS.test(corpus);
  },
};

/* Plain-language labels for tie kinds, used in code-templated notes. */
const TIE_KIND_PHRASES: Record<string, string> = {
  officer: "a named officer",
  address: "a shared address",
  domain: "the vendor's web domain",
  feed_product: "the product named in the feed",
  full_legal_name: "the full legal name the buyer submitted",
  state: "a matching state",
};

function slugPart(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 28) || "unnamed"
  );
}

export function assemble(input: AssembleInput): AssembledSkeleton {
  usedRowIds.clear();
  const { extract, checks, identity, citations, adv_findings, sector } = input;
  const ledger: LedgerRow[] = [];
  const findings: Finding[] = [];
  const triggers: T1Trigger[] = [];
  const greenFlagFacts: AssembledSkeleton["greenFlagFacts"] = [];
  const greenDims = new Set<string>();

  const vendorName = extract.vendor_name_candidates[0] ?? "this vendor";
  const claimsUsEntity = extract.claims.some((c) => c.type === "identity");

  /* ---------------------------------------------- D1: identity & registration */

  const sosChecks = checks.filter((c) => c.check_id.startsWith("sos_"));
  const sosHits = sosChecks.filter((c) => c.status === "hit");
  const edgar = find(checks, "edgar_fts");
  /* The company-name EDGAR lane is an identity leg like the full-text
     lane (resolveIdentity reads both); the anchor chain reads it too, so a
     vendor whose only credited record is its EDGAR company entry gets its
     legal name on the identity sentence and the green flag (ConductorAI
     Corp probe, 2026-09-01). */
  const edgarCompany = find(checks, "edgar_company");
  const sam = find(checks, "sam_entity");

  if (identity.identity_resolved) {
    greenDims.add("D1");
    const basis = identity.identifiers_found.slice(0, 3).join("; ");
    /* Only an ATTRIBUTED record may put a legal name on the identity
       surfaces: naming an unattributed match's record printed the wrong
       company's name live (Granicus read "Granicus Property Solutions,
       LLC", 2026-08-29). Identity itself now resolves only from attributed
       records — a name match joined by a tying signal (identity-ties.ts) —
       so an attributed anchor normally exists; the fallback keeps a source
       link without naming any record. Attribution covers containment
       promotions, so "ZENCITY TECHNOLOGIES US, INC." may anchor the brand
       "Zencity" when a tie connects them. */
    const attributedSos = sosHits.filter((c) => c.attribution === "attributed");
    const anchor =
      attributedSos.find((c) => c.confidence === "exact") ??
      attributedSos[0] ??
      (edgar?.status === "hit" && edgar.attribution === "attributed"
        ? edgar
        : null) ??
      (edgarCompany?.status === "hit" && edgarCompany.attribution === "attributed"
        ? edgarCompany
        : null) ??
      (sam?.status === "hit" && sam.attribution === "attributed" ? sam : null);
    const sourceCheck =
      anchor ?? sosHits[0] ?? (edgar?.status === "hit" ? edgar : sam);
    ledger.push({
      id: uniqueRowId("identity"),
      dimension: "D1",
      claim_quote: null,
      what_checked: IDENTITY_WHAT_CHECKED,
      result: "VERIFIED",
      evidence_tier: "T1",
      severity: null,
      sources: [
        ...(sourceCheck ? src(sourceCheck) : []),
        ...(edgar && edgar.status === "hit" && sourceCheck !== edgar
          ? src(edgar)
          : []),
      ].slice(0, 4),
      /* Methodology 1.7: the identity sentence is a code template over the
         credited record (identityVerifiedNote below). The structure model
         substituted a namesake's legal name into this one sentence against
         its own retrieval (round 2, R2-F9); a non-empty note never reaches
         the model. */
      note: "",
      methodology_ref: "d1-1",
      ...(anchor?.confidence ? { match_confidence: anchor.confidence } : {}),
      ...(anchor ? { attribution: "attributed" as const } : {}),
    });
    /* The credited record's own facts. tieFactsForCheck picks the
       exact-first best match, the same record attribution judged; reading
       matches[0] named a similarity namesake on the green flag when the
       lane listed it first (granicus and accela, promoted baseline). */
    const anchorFacts = anchor ? tieFactsForCheck(anchor) : null;
    const anchorMatch = anchor
      ? (((anchor.data ?? {}) as { matches?: { name?: string; status?: string; date?: string; confidence?: string }[] }).matches ?? []).find(
          (m) => anchorFacts && m.name === anchorFacts.legal_name,
        ) ?? null
      : null;
    if (anchor) {
      /* When the record's legal name differs from the pitch's display name
         (compound names like "TrueTax by Govra" resolving to GOVRA, INC.),
         say so: the D1 row must not conflate product and company. When the
         record was found through the research-to-registry name bridge, the
         report must disclose the discovered name's source and flag it for
         the buyer to confirm. */
      const bestData = (anchor.data ?? {}) as {
        legal_business_name?: string;
        name_bridge?: { discovered_name?: string; source_host?: string };
      };
      const legalName = anchorFacts?.legal_name ?? bestData.legal_business_name ?? null;
      const differs =
        legalName && norm(legalName) !== norm(vendorName) ? legalName : null;
      const bridgePart = bestData.name_bridge?.source_host
        ? `; that name surfaced on ${bestData.name_bridge.source_host} during research, so confirm it is the same company`
        : "";
      const identityRow = ledger[ledger.length - 1];
      identityRow.note = identityVerifiedNote({
        source: anchor.source,
        legalName,
        status: anchorMatch?.status ?? null,
        registered: anchorMatch?.date ?? null,
        checked: dateOf(anchor),
        secondIdentifier: identity.identifiers_found.find((i) => i !== identity.identifiers_found[0]) ?? null,
        bridgeHost: bestData.name_bridge?.source_host ?? null,
      });
      greenFlagFacts.push({
        fact: differs
          ? `A registered legal entity was found for ${vendorName} under the legal name ${differs} (${basis})${bridgePart}`
          : `A registered legal entity was found for ${vendorName} (${basis})${bridgePart}`,
        source_name: anchor.source,
        date: dateOf(anchor),
      });
    } else {
      const identityRow = ledger[ledger.length - 1];
      identityRow.note = identityVerifiedNote({
        source: null,
        legalName: null,
        status: null,
        registered: null,
        checked: sourceCheck ? dateOf(sourceCheck) : input.generated_at.slice(0, 10),
        secondIdentifier: null,
        bridgeHost: null,
        identifiers: identity.identifiers_found,
      });
      if (sourceCheck) {
        greenFlagFacts.push({
          fact: `A registered legal entity was found for ${vendorName} (${basis})`,
          source_name: sourceCheck.source,
          date: dateOf(sourceCheck),
        });
      }
    }
  } else {
    const allDefinitiveMiss =
      sosChecks.length > 0 &&
      sosChecks.every(
        (c) => c.status === "definitive_miss" || c.status === "coverage_limited",
      ) &&
      sosChecks.some((c) => c.status === "definitive_miss") &&
      edgar?.status === "definitive_miss";
    /* Trigger fires ONLY when the pitch targets a definitively-searchable
       state and both that state's registry and EDGAR ran real, empty searches
       (the coverage-limited rule from the 50-state research). */
    const targetState = extract.state_mentioned?.toLowerCase() ?? null;
    const targetStateCheck = targetState
      ? find(checks, `sos_${targetState}`)
      : undefined;
    if (
      claimsUsEntity &&
      allDefinitiveMiss &&
      targetStateCheck?.status === "definitive_miss"
    ) {
      triggers.push({
        trigger: "no_registration_definitive",
        check_id: targetStateCheck.check_id,
        detail: `Definitive searches of ${targetStateCheck.source} and SEC EDGAR found no registration under any name the pitch uses.`,
        evidence_url: targetStateCheck.evidence_url,
      });
    }
    const limited = sosChecks.some((c) => c.status === "coverage_limited");
    /* When a registration WAS found but only one identifier class exists,
       the row must say that — otherwise the narrative model reads the
       COULD_NOT_VERIFY result plus the state sources and writes "we
       searched Texas and found nothing" over a Texas hit. Only an
       ATTRIBUTED hit counts as "the registration found": an untied record
       is a candidate, not this vendor's registration. */
    const partialHit =
      sosHits.find((c) => c.attribution === "attributed") ?? null;
    ledger.push({
      id: uniqueRowId("identity"),
      dimension: "D1",
      claim_quote: null,
      what_checked: partialHit
        ? `Whether a second independent identifier corroborates the registration found in ${partialHit.source}`
        : IDENTITY_WHAT_CHECKED,
      result: limited && !partialHit ? "COVERAGE_LIMITED" : "COULD_NOT_VERIFY",
      evidence_tier: "T4",
      severity: "MEDIUM",
      /* All searched states, hit first (6 SOS lanes), then the EDGAR
         checks that actually ran: the clean-miss note names SEC EDGAR, so
         the row's own evidence list must name it too. Slicing the states
         lower made the verdict claim only three states were searched;
         the schema's sources cap is 8 to fit the EDGAR entries. */
      sources: [
        ...[...sosHits, ...sosChecks.filter((c) => c.status !== "hit")].slice(0, 6),
        ...["edgar_fts", "edgar_company"]
          .map((id) => find(checks, id))
          .filter(
            (c): c is NonNullable<typeof c> =>
              c?.status === "definitive_miss" || c?.status === "hit",
          ),
      ].flatMap(src),
      note: "",
      methodology_ref: "d1-1",
    });
  }

  /* A candidate dissolved-record row plus the MEDIUM finding that mints
     its question (MEDIUM findings never move the tier); the row carries no
     severity. Shared by the anchored-record candidate branch below and by
     the namesake pass after it. One row per legal name. */
  type DissolvedRecord = {
    legal_name: string;
    status: string;
    reason: string | null;
    effective_date: string | null;
    domestic: boolean | null;
    designation_class?: "dissolution" | "withdrawal";
  };
  const dissolvedNamesRendered = new Set<string>();
  const pushDissolvedCandidate = (check: RegistryCheck, dissolved: DissolvedRecord) => {
    const key = normalizeUnstripped(dissolved.legal_name);
    if (dissolvedNamesRendered.has(key)) return;
    dissolvedNamesRendered.add(key);
    const reasonPart =
      dissolved.reason && dissolved.reason !== dissolved.status ? `: ${dissolved.reason}` : "";
    const whenPart = dissolved.effective_date ? `, effective ${dissolved.effective_date}` : "";
    ledger.push({
      id: uniqueRowId(`dissolved-${slugPart(dissolved.legal_name)}`),
      dimension: "D1",
      claim_quote: null,
      what_checked: `The current registration status of ${dissolved.legal_name} in ${check.source}`.slice(0, 300),
      result: "OFFICIAL_RECORD_FOUND",
      evidence_tier: "T1",
      severity: null,
      sources: src(check),
      note: `${check.source} lists ${dissolved.legal_name} with status "${dissolved.status}"${reasonPart}${whenPart}, under a name matching this vendor's. No detail connecting that record to this vendor was found, so it is shown as a candidate record only: it earns no credit and drives no warning. Ask the vendor whether this record is theirs.`.slice(0, 700),
      methodology_ref: "d1-1",
      ...(check.confidence ? { match_confidence: check.confidence } : {}),
      attribution: "candidate",
    });
    findings.push({
      id: `dissolved-candidate-${slugPart(dissolved.legal_name)}`,
      dimension: "D1",
      severity: "MEDIUM",
      resolved: false,
      detail: `${check.source} lists an ended registration under a matching name (${dissolved.legal_name}) that no detail ties to this vendor.`,
    });
  };

  /* Affirmative end-of-registration designations on registry records (the
     lanes set data.dissolved only for affirmative designations like
     "Voluntarily Dissolved" — a bare "Inactive" or a late annual report
     never arms this). Arming requires ATTRIBUTION, which for a dissolved
     record requires a STRONG tie (officer, address, domain, or the full
     legal name — identity-ties.ts): a namesake's ended registration was
     pinned on a live company by bare name equality (POLCO INC., 2004-2011,
     attributed to today's Polco; 2026-08-31). An unattributed designation
     renders as a labeled candidate record with a question, never a
     finding. The language rule holds everywhere: report what the record
     shows, never failure or wrongdoing framing. A domestic
     end-of-registration is CRITICAL (the registered company itself ended);
     anything else stays HIGH. */
  for (const check of sosChecks) {
    if (check.status !== "hit") continue;
    const dissolved = ((check.data ?? {}) as {
      dissolved?: {
        legal_name: string;
        status: string;
        reason: string | null;
        effective_date: string | null;
        domestic: boolean | null;
        designation_class?: "dissolution" | "withdrawal";
      };
    }).dissolved;
    if (!dissolved) continue;
    const reasonPart =
      dissolved.reason && dissolved.reason !== dissolved.status
        ? `: ${dissolved.reason}`
        : "";
    const whenPart = dissolved.effective_date
      ? `, effective ${dissolved.effective_date}`
      : "";
    /* WITHDRAWAL-class designations ("Terminated", "Surrendered") on a
       record that is not the entity's home-state registration are routine
       record-keeping — a company ending its authority in one state it once
       operated in — reported as record-only information, never
       dissolution-class severity (the CivicPlus rule). A domestic
       withdrawal is an affirmative end and keeps dissolution treatment;
       so does an unknown-class record from older data. */
    const designationClass = dissolved.designation_class ?? "dissolution";
    if (
      check.attribution === "attributed" &&
      designationClass === "withdrawal" &&
      dissolved.domestic !== true
    ) {
      ledger.push({
        id: uniqueRowId(`withdrawn-${slugPart(dissolved.legal_name)}`),
        dimension: "D1",
        claim_quote: null,
        what_checked: `The current registration status of ${dissolved.legal_name} in ${check.source}`.slice(0, 300),
        result: "OFFICIAL_RECORD_FOUND",
        evidence_tier: "T1",
        severity: "INFO",
        sources: src(check),
        note: `${check.source} lists ${dissolved.legal_name} with status "${dissolved.status}"${reasonPart}${whenPart}. Ending a registration in one state where a company once did business is routine record-keeping; it is not a dissolution of the company. Ask the vendor which legal entity would sign a contract today.`.slice(0, 700),
        methodology_ref: "d1-1",
        ...(check.confidence ? { match_confidence: check.confidence } : {}),
        attribution: "attributed",
      });
      continue;
    }
    if (check.attribution === "attributed") {
      const severity = dissolved.domestic === true ? "CRITICAL" : "HIGH";
      const tieBasis = check.tie?.signals.find((s) => s.strength === "strong");
      const tiePart = tieBasis
        ? ` A second detail connects this record to the vendor (${TIE_KIND_PHRASES[tieBasis.kind] ?? "a matching detail"}: ${tieBasis.value}).`
        : "";
      const rowId = uniqueRowId(`dissolved-${slugPart(dissolved.legal_name)}`);
      ledger.push({
        id: rowId,
        dimension: "D1",
        claim_quote: null,
        what_checked: `The current registration status of ${dissolved.legal_name} in ${check.source}`.slice(0, 300),
        result: "OFFICIAL_RECORD_FOUND",
        evidence_tier: "T1",
        severity,
        sources: src(check),
        note: `${check.source} lists ${dissolved.legal_name} with status "${dissolved.status}"${reasonPart}${whenPart}.${tiePart} This is what the public record shows as of the check date; it does not by itself say anything about the people or products involved. Ask the vendor which legal entity would sign a contract today and how it relates to this record.`.slice(0, 700),
        methodology_ref: "d1-1",
        ...(check.confidence ? { match_confidence: check.confidence } : {}),
        attribution: "attributed",
      });
      findings.push({
        id: `dissolved-${slugPart(dissolved.legal_name)}`,
        dimension: "D1",
        severity,
        resolved: false,
        detail: `${check.source} shows the registration for ${dissolved.legal_name} ended (${dissolved.status}${reasonPart}${whenPart}).`,
      });
    } else {
      pushDissolvedCandidate(check, dissolved);
    }
  }

  /* Methodology 1.8: a lane is judged on its anchored record, so an ended
     registration on a DIFFERENT exact-name record in the same lane (a
     namesake listed beside the vendor's live record, or beside another
     candidate) is no longer the lane's data.dissolved. It still renders
     as a candidate record with its question, as the methodology promises
     for every untied ended registration, capped at two across the report
     and never twice for one legal name. */
  let namesakeDissolvedRows = 0;
  for (const check of sosChecks) {
    if (namesakeDissolvedRows >= 2) break;
    if (check.status !== "hit") continue;
    const anchorIdx = anchorIndexOf(check);
    const matches = ((check.data ?? {}) as {
      matches?: { name?: string; confidence?: string; dissolved?: DissolvedRecord | null }[];
    }).matches ?? [];
    for (let i = 0; i < matches.length; i++) {
      if (namesakeDissolvedRows >= 2) break;
      if (i === anchorIdx) continue;
      const m = matches[i];
      if (m.confidence !== "exact" || !m.dissolved || !m.name) continue;
      const key = normalizeUnstripped(m.dissolved.legal_name);
      if (dissolvedNamesRendered.has(key)) continue;
      pushDissolvedCandidate(check, m.dissolved);
      namesakeDissolvedRows += 1;
    }
  }

  /* Untied live registry hits render as labeled candidate records too (cap
     2; dissolved candidates already rendered above). Methodology 1.8: the
     note is a code template over the ANCHORED record (the lane summary
     describes the lane's first exact match, which the identity step may
     not have anchored on); the summary stays the fallback for data with
     no listed records. */
  let candidateRows = 0;
  for (const check of sosChecks) {
    if (candidateRows >= 2) break;
    if (check.status !== "hit") continue;
    if (check.attribution === "attributed") continue;
    if (((check.data ?? {}) as { dissolved?: unknown }).dissolved) continue;
    const anchoredFacts = tieFactsForCheck(check);
    const anchoredIdx = anchorIndexOf(check);
    const anchoredMatch =
      anchoredIdx === null
        ? null
        : (((check.data ?? {}) as { matches?: { status?: string | null; date?: string | null }[] }).matches ?? [])[anchoredIdx] ?? null;
    const candidateNote = anchoredFacts
      ? candidateRecordNote({
          source: check.source,
          legalName: anchoredFacts.legal_name,
          exact: anchoredFacts.match_confidence === "exact",
          status: anchoredMatch?.status ?? null,
          registered: anchoredMatch?.date ?? null,
        })
      : check.summary;
    ledger.push({
      id: uniqueRowId(`candidate-${check.check_id.replace(/^sos_/, "")}`),
      dimension: "D1",
      claim_quote: null,
      what_checked: `Whether a registry record found in ${check.source} belongs to this vendor`.slice(0, 300),
      result: "COULD_NOT_VERIFY",
      evidence_tier: "T4",
      severity: null,
      sources: src(check),
      note: candidateNote.slice(0, 700),
      methodology_ref: "d1-1",
      ...(check.confidence ? { match_confidence: check.confidence } : {}),
      attribution: "candidate",
    });
    candidateRows += 1;
  }

  /* Exclusions. */
  const excl = find(checks, "sam_exclusions");
  if (excl?.status === "hit" && excl.confidence === "exact") {
    triggers.push({
      trigger: "sam_exclusion_match",
      check_id: excl.check_id,
      detail: excl.summary,
      evidence_url: excl.evidence_url,
    });
    ledger.push({
      id: uniqueRowId("excl"),
      dimension: "D1",
      claim_quote: null,
      what_checked: "Federal exclusion and debarment records (SAM.gov)",
      result: "OFFICIAL_RECORD_FOUND",
      evidence_tier: "T1",
      severity: "CRITICAL",
      sources: src(excl),
      note: "",
      methodology_ref: "d1-3",
    });
    findings.push({
      id: "excl",
      dimension: "D1",
      severity: "CRITICAL",
      resolved: false,
      detail: "An exclusion record matched this entity exactly in SAM.gov.",
    });
  }

  /* Domain age vs. claims. */
  const rdap = find(checks, "rdap_domain_age");
  const rdapContradiction =
    rdap?.status === "hit" &&
    (rdap.data as { contradiction?: boolean } | null)?.contradiction === true;
  if (rdap && rdap.status === "hit") {
    const identityClaim = extract.claims.find((c) => c.type === "identity");
    const rdapClaimedYear =
      (rdap.data as { claimed_year?: number | null } | null)?.claimed_year ?? null;
    ledger.push({
      id: uniqueRowId("domain-age"),
      dimension: "D1",
      claim_quote: rdapContradiction ? (identityClaim?.quote ?? null) : null,
      /* On claim-less runs (name-only) there are no history claims to test:
         the row must say so, or the narrative invents consistency "with the
         vendor's history claims" that do not exist (Govra/Granicus,
         2026-08-29). */
      what_checked: rdapClaimedYear !== null
        ? "Domain registration date against the pitch's history claims"
        : "Domain registration date (no age or history claims were made to compare against)",
      result: rdapContradiction ? "CONTRADICTED" : "VERIFIED",
      evidence_tier: "T1",
      severity: rdapContradiction ? "HIGH" : null,
      sources: src(rdap),
      /* Code-templated: the check summary states the registration date and
         mentions claim consistency only when a claimed year existed. */
      note: rdap.summary.slice(0, 700),
      methodology_ref: "d1-4",
    });
    if (rdapContradiction) {
      findings.push({
        id: "domain-age",
        dimension: "D1",
        severity: "HIGH",
        resolved: false,
        detail:
          "The domain registration date is years later than the history the pitch describes.",
      });
    }
  }

  /* Email hygiene. */
  const dns = find(checks, "dns_email_hygiene");
  const dnsData = (dns?.data ?? {}) as {
    free_mail_sender?: boolean;
    sender_mismatch?: boolean;
    mx_present?: boolean;
  };
  if (dns && (dnsData.free_mail_sender || dnsData.mx_present === false)) {
    ledger.push({
      id: uniqueRowId("email"),
      dimension: "D1",
      claim_quote: null,
      what_checked: "Whether the pitch was sent from working corporate email infrastructure",
      result: "COULD_NOT_VERIFY",
      evidence_tier: "T1",
      severity: "MEDIUM",
      sources: src(dns),
      note: "",
      methodology_ref: "d1-7",
    });
    findings.push({
      id: "email",
      dimension: "D1",
      severity: "MEDIUM",
      resolved: false,
      detail: dnsData.free_mail_sender
        ? "The pitch was sent from a free consumer mail address rather than a company domain."
        : "The company domain has no working mail configuration.",
    });
  }

  /* -------------------------------------------------- D2: government track record */

  const usasp = find(checks, "usaspending_awards");
  const usaspRecipient =
    ((usasp?.data ?? {}) as { recipient_name?: string }).recipient_name ?? null;
  /* Federal-award credit requires an exact recipient match on a
     non-degenerate name: a name this tool can't tell apart from strangers
     ("17A", "Zip") earns no credit from a bare equality — the live "17A"
     run collected 17A WASHINGTON STREET, LLC's awards (2026-08-29). No
     recipient-side tie facts exist for this lane yet, so degenerate names
     always stay candidates here. */
  /* Methodology 1.7: credit also requires at least one award in the
     record. The lane reports a hit for a recipient ENTRY with zero awards
     ("did not find contract awards in the last five years"), and both
     Forerunner and Ironclad earned a VERIFIED row and a federal
     track-record green flag from such entries (round 2, R2-F2 and R2-F11).
     The row note is the lane's own summary, which carries the "same
     company" caution; it is no longer left for the model to phrase. */
  const usaspAwards = (() => {
    const n = ((usasp?.data ?? {}) as { award_count?: unknown }).award_count;
    return typeof n === "number" && Number.isFinite(n) ? n : 0;
  })();
  const usaspExactDistinctive =
    usasp?.status === "hit" &&
    usasp.confidence === "exact" &&
    !isDegenerateBrandName(usaspRecipient ?? vendorName);
  const usaspRootCovered =
    !input.submitted_domain_root ||
    domainRootCoversName(input.submitted_domain_root, usaspRecipient ?? vendorName);
  const usaspCredit = usaspExactDistinctive && usaspAwards > 0 && usaspRootCovered;
  if (usaspCredit && usasp) {
    greenDims.add("D2");
    greenFlagFacts.push({
      fact: `Federal payment records show ${usaspAwards} federal award${usaspAwards === 1 ? "" : "s"} to a recipient named ${usaspRecipient ?? vendorName}. Confirm with the vendor that this recipient is the same company`,
      source_name: usasp.source,
      date: dateOf(usasp),
    });
    ledger.push({
      id: uniqueRowId("usaspending"),
      dimension: "D2",
      claim_quote: null,
      what_checked: "Federal award records (USAspending.gov)",
      result: "VERIFIED",
      evidence_tier: "T1",
      severity: null,
      sources: src(usasp),
      note: usasp.summary.slice(0, 700),
      methodology_ref: "d2-1",
      match_confidence: "exact",
      attribution: "attributed",
    });
  } else if (usasp?.status === "hit") {
    /* A candidate recipient record, never favorable credit. The row stays
       visible, labeled, and neutral; the note is code-templated so no
       model can upgrade it to credit. An exact distinctive recipient with
       zero awards keeps the lane's own hedged summary. */
    const degenerateExact =
      usasp.confidence === "exact" && isDegenerateBrandName(usaspRecipient ?? vendorName);
    ledger.push({
      id: uniqueRowId("usaspending"),
      dimension: "D2",
      claim_quote: null,
      what_checked: "Federal award records (USAspending.gov)",
      result: "COULD_NOT_VERIFY",
      evidence_tier: "T4",
      severity: null,
      sources: src(usasp),
      note: degenerateExact
        ? `Federal payment records list awards under the name ${usaspRecipient ?? "a matching name"}. Names this short appear on unrelated companies, so this record is shown for your review and earns no credit until a second detail connects it to this vendor.`.slice(0, 700)
        : usasp.summary.slice(0, 700),
      methodology_ref: "d2-1",
      ...(usasp.confidence ? { match_confidence: usasp.confidence } : {}),
      attribution: "candidate",
    });
  }

  /* Named-customer traces via research citations (deterministic over citation
     metadata: only class 1-2 sources can verify). A row VERIFIES only when
     one citation ties the customer and the vendor together in retrieved
     content: the customer tie may come from page content or from the page
     living on the customer's own site; the vendor tie must come from page
     content. A class 1-2 URL that merely names the customer in its address
     becomes an unconfirmed lead: the row stays COULD_NOT_VERIFY at MEDIUM,
     the link is attached, and a manual card offers one-click confirmation.
     Leads never count as verified customers. */
  let verifiedCustomers = 0;
  const leadCards: ManualCheck[] = [];
  /* The pipeline filters counts/descriptions out of named_customers before
     assembly; the filter repeats here so the invariant holds for every
     caller of this pure function. */
  const namedCustomers = extract.named_customers
    .filter(isNamedOrganization)
    .slice(0, 8);
  for (const customer of namedCustomers) {
    const support = citations.find(
      (c) =>
        canVerify(c.domain_class) &&
        (contentMentions(c, customer) || hostCovers(c.url, customer)) &&
        contentMentions(c, vendorName),
    );
    const claim = extract.claims.find(
      (c) => c.type === "customer" && c.subject && norm(c.subject) === norm(customer),
    );
    if (support) {
      verifiedCustomers += 1;
      greenDims.add("D2");
      ledger.push({
        id: uniqueRowId(`cust-${slugPart(customer)}`),
        dimension: "D2",
        claim_quote: claim?.quote ?? null,
        what_checked: `Public traces of the claimed customer relationship with ${customer}`,
        result: "VERIFIED",
        evidence_tier: support.domain_class === 1 ? "T1" : "T3",
        severity: null,
        sources: [
          {
            url: support.url,
            title: support.title,
            retrieved_at: support.retrieved_at,
          },
        ],
        note: "",
        methodology_ref: "d2-4",
      });
    } else {
      const lead = citations.find(
        (c) => canVerify(c.domain_class) && urlMentions(c.url, customer),
      );
      ledger.push({
        id: uniqueRowId(`cust-${slugPart(customer)}`),
        dimension: "D2",
        claim_quote: claim?.quote ?? null,
        what_checked: `Public traces of the claimed customer relationship with ${customer}`,
        result: "COULD_NOT_VERIFY",
        evidence_tier: "T4",
        severity: lead ? "MEDIUM" : "HIGH",
        sources: lead
          ? [{ url: lead.url, title: lead.title, retrieved_at: lead.retrieved_at }]
          : [],
        note: "",
        methodology_ref: "d2-4",
      });
      if (lead && leadCards.length < 2) {
        leadCards.push({
          id: `manual-customer-${leadCards.length + 1}`,
          label: `Confirm the ${customer} page`.slice(0, 160),
          instructions:
            `Research surfaced an official page whose address mentions ${customer}, but the tool did not retrieve it. Open the link and check whether the page names ${vendorName}.`.slice(
              0,
              600,
            ),
          link: lead.url,
          what_bad_looks_like:
            `The page never names ${vendorName}, or it covers an unrelated topic.`.slice(
              0,
              400,
            ),
        });
      }
    }
  }
  /* The zero-verified aggregate counts PITCH-origin customers only (the
     leading entries; site-derived customers get rows and research but can
     never make the report harsher), and any verified customer suppresses
     it. */
  const pitchCustomerCount = Math.min(
    input.pitch_customer_count ?? extract.named_customers.length,
    namedCustomers.length,
  );
  if (pitchCustomerCount > 0 && verifiedCustomers === 0) {
    findings.push({
      id: "customers",
      dimension: "D2",
      severity: "HIGH",
      resolved: false,
      detail:
        leadCards.length > 0
          ? `None of the ${pitchCustomerCount} named government customers could be verified in retrieved public records. Candidate pages on official sites are linked under manual checks for confirmation.`
          : `None of the ${pitchCustomerCount} named government customers left a public trace we could find.`,
    });
  }

  /* --------------------------------------------- D3: security & compliance */

  /* Compliance-feed credit rule (the calibration guard): an exact
     multi-token listing keeps credit as before; a similarity listing, or
     an exact listing under a degenerate short name, earns credit only when
     the feed's own product metadata ties it to this vendor (a feed_product
     signal from identity-ties.ts) OR (1.6, FedRAMP lane) the listed name
     BEGINS WITH the vendor's own complete name: a curated feed listing
     "Tyler Technologies Data & Insights" for the vendor "Tyler
     Technologies" is that company's own entry, and the row's standing
     "confirm the listed product" caveat still applies. Four guards keep
     the wrong-namesake class closed (the review that shipped with 1.6
     confirmed each is load-bearing): the matched query must be one of the
     vendor's IDENTITY names (feed lanes also receive product names from
     the "X by Y" split, and a product name matching an unrelated firm's
     listing must never credit); it must be multi-token and
     non-degenerate; the containment direction must be query_in_record;
     and the listed name must START with the query's tokens in order (a
     token-subset like "Alto Networks" inside "Palo Alto Networks" never
     credits — subsidiary-style listings are brand-plus-qualifier, not
     scrambled subsets). Everything else renders as a labeled candidate
     row. */
  const vendorIdentityNorms = new Set(
    splitNameCandidates(extract.vendor_name_candidates)
      .identityNames.map((n) => normalizeCompanyName(n))
      .filter(Boolean),
  );
  const feedCredited = (c: RegistryCheck | undefined): boolean => {
    if (c?.status !== "hit") return false;
    const d = (c.data ?? {}) as {
      matches?: {
        provider?: string;
        supplier?: string;
        containment?: string;
        matched_query?: string;
      }[];
    };
    const listed = d.matches?.[0]?.provider ?? d.matches?.[0]?.supplier ?? null;
    const productTie =
      c.tie?.signals.some((s) => s.kind === "feed_product") === true;
    /* The lanes set confidence on every hit; a null here is a non-name-
       matched caller and takes the exact path. */
    if (c.confidence !== "name_similarity") {
      return !isDegenerateBrandName(listed ?? vendorName) || productTie;
    }
    const m0 = d.matches?.[0];
    const containedQuery =
      m0?.containment === "query_in_record" ? (m0.matched_query ?? null) : null;
    let containmentCreditable = false;
    if (containedQuery !== null && listed !== null) {
      const qNorm = normalizeCompanyName(containedQuery);
      containmentCreditable =
        vendorIdentityNorms.has(qNorm) &&
        qNorm.split(" ").filter(Boolean).length >= 2 &&
        !isDegenerateBrandName(containedQuery) &&
        normalizeCompanyName(listed).startsWith(`${qNorm} `);
    }
    return productTie || containmentCreditable;
  };
  const pushFeedCandidateRow = (
    c: RegistryCheck,
    rowId: string,
    whatChecked: string,
    dimension: LedgerRow["dimension"],
    ref: string,
  ) => {
    ledger.push({
      id: uniqueRowId(rowId),
      dimension,
      claim_quote: null,
      what_checked: whatChecked,
      result: "COULD_NOT_VERIFY",
      evidence_tier: "T4",
      severity: null,
      sources: src(c),
      note: `${c.summary} No detail connects that listing to this vendor, so it is shown as a candidate record and earns no credit. Confirm with the vendor that the listing is theirs.`.slice(0, 700),
      methodology_ref: ref,
      ...(c.confidence ? { match_confidence: c.confidence } : {}),
      attribution: "candidate",
    });
  };

  const fedramp = find(checks, "fedramp_marketplace");
  const fedrampData = (fedramp?.data ?? {}) as { claimed_but_absent?: boolean };
  const claimsFedramp = extract.claims.some(
    (c) => c.type === "compliance" && /fedramp/i.test(c.quote),
  );
  if (fedramp) {
    if (fedrampData.claimed_but_absent) {
      triggers.push({
        trigger: "compliance_registry_contradiction",
        check_id: fedramp.check_id,
        detail: fedramp.summary,
        evidence_url: fedramp.evidence_url,
      });
      const claim = extract.claims.find(
        (c) => c.type === "compliance" && /fedramp/i.test(c.quote),
      );
      ledger.push({
        id: uniqueRowId("fedramp_marketplace"),
        dimension: "D3",
        claim_quote: claim?.quote ?? null,
        what_checked: "The FedRAMP Marketplace authorization feed",
        result: "CONTRADICTED",
        evidence_tier: "T1",
        severity: "CRITICAL",
        sources: src(fedramp),
        note: "",
        methodology_ref: "d3-1",
      });
      findings.push({
        id: "fedramp_marketplace",
        dimension: "D3",
        severity: "CRITICAL",
        resolved: false,
        detail: "A FedRAMP authorization described in the pitch is absent from the FedRAMP Marketplace feed.",
      });
    } else if (fedramp.status === "hit" && feedCredited(fedramp)) {
      greenDims.add("D3");
      greenFlagFacts.push({
        fact: registryHitFact(vendorName, "in the FedRAMP Marketplace", fedramp),
        source_name: fedramp.source,
        date: dateOf(fedramp),
      });
      ledger.push({
        id: uniqueRowId("fedramp_marketplace"),
        dimension: "D3",
        claim_quote: null,
        what_checked: "The FedRAMP Marketplace authorization feed",
        result: "VERIFIED",
        evidence_tier: "T1",
        severity: null,
        sources: src(fedramp),
        /* Code-templated: the check summary carries the exact listed status
           and the product-scope caveat, which model phrasing has inflated
           live ("has completed a federal cloud security review"). */
        note: fedramp.summary.slice(0, 700),
        methodology_ref: "d3-1",
        ...(fedramp.confidence ? { match_confidence: fedramp.confidence } : {}),
        attribution: "attributed",
      });
    } else if (fedramp.status === "hit") {
      pushFeedCandidateRow(
        fedramp,
        "fedramp_marketplace",
        "The FedRAMP Marketplace authorization feed",
        "D3",
        "d3-1",
      );
    } else if (claimsFedramp) {
      ledger.push({
        id: uniqueRowId("fedramp_marketplace"),
        dimension: "D3",
        claim_quote: extract.claims.find((c) => /fedramp/i.test(c.quote))?.quote ?? null,
        what_checked: "The FedRAMP Marketplace authorization feed",
        result: "COULD_NOT_VERIFY",
        evidence_tier: "T4",
        severity: "MEDIUM",
        sources: src(fedramp),
        note: "",
        methodology_ref: "d3-1",
      });
    }
  }

  /* GovRAMP mirrors the FedRAMP three-branch shape: contradictions, hits,
     and vague claims all leave a ledger row (methodology section 3 promises
     contradictions render side by side with the record). */
  const govramp = find(checks, "govramp");
  const govrampData = (govramp?.data ?? {}) as { claimed_but_absent?: boolean };
  const claimsGovramp = extract.claims.some(
    (c) => c.type === "compliance" && PROGRAMS.govramp.name.test(c.quote),
  );
  if (govramp) {
    if (govrampData.claimed_but_absent) {
      triggers.push({
        trigger: "compliance_registry_contradiction",
        check_id: govramp.check_id,
        detail: govramp.summary,
        evidence_url: govramp.evidence_url,
      });
      const claim = extract.claims.find(
        (c) => c.type === "compliance" && PROGRAMS.govramp.name.test(c.quote),
      );
      ledger.push({
        id: uniqueRowId("govramp"),
        dimension: "D3",
        claim_quote: claim?.quote ?? null,
        what_checked: "The GovRAMP program participant list",
        result: "CONTRADICTED",
        evidence_tier: "T1",
        severity: "CRITICAL",
        sources: src(govramp),
        note: "",
        methodology_ref: "d3-2",
      });
      findings.push({
        id: "govramp",
        dimension: "D3",
        severity: "CRITICAL",
        resolved: false,
        detail: "A GovRAMP status described in the pitch is absent from the GovRAMP participant list.",
      });
    } else if (govramp.status === "hit" && feedCredited(govramp)) {
      greenDims.add("D3");
      greenFlagFacts.push({
        fact: registryHitFact(vendorName, "on the GovRAMP program participant list", govramp),
        source_name: govramp.source,
        date: dateOf(govramp),
      });
      ledger.push({
        id: uniqueRowId("govramp"),
        dimension: "D3",
        claim_quote: null,
        what_checked: "The GovRAMP program participant list",
        result: "VERIFIED",
        evidence_tier: "T1",
        severity: null,
        sources: src(govramp),
        /* Code-templated: GovRAMP has several levels ("Progressing" is not
           "Authorized") and the summary states the exact one. */
        note: govramp.summary.slice(0, 700),
        methodology_ref: "d3-2",
        ...(govramp.confidence ? { match_confidence: govramp.confidence } : {}),
        attribution: "attributed",
      });
    } else if (govramp.status === "hit") {
      pushFeedCandidateRow(
        govramp,
        "govramp",
        "The GovRAMP program participant list",
        "D3",
        "d3-2",
      );
    } else if (claimsGovramp) {
      ledger.push({
        id: uniqueRowId("govramp"),
        dimension: "D3",
        claim_quote: extract.claims.find((c) => PROGRAMS.govramp.name.test(c.quote))?.quote ?? null,
        what_checked: "The GovRAMP program participant list",
        result: "COULD_NOT_VERIFY",
        evidence_tier: "T4",
        severity: "MEDIUM",
        sources: src(govramp),
        note: "",
        methodology_ref: "d3-2",
      });
    }
  }

  /* TX-RAMP: the published list is known to lag actual certifications, so a
     claimed-but-absent result is HIGH, never CRITICAL, and never a tier-1
     trigger (methodology D3.3). Rows mirror the FedRAMP shape otherwise;
     the contradiction row carries the lag caveat in what_checked because
     it explains why the severity stops at HIGH. */
  const txramp = find(checks, "txramp");
  const txrampData = (txramp?.data ?? {}) as { claimed_but_absent?: boolean };
  const claimsTxramp = extract.claims.some(
    (c) => c.type === "compliance" && PROGRAMS.txramp.name.test(c.quote),
  );
  if (txramp && txramp.status !== "not_applicable") {
    if (txrampData.claimed_but_absent) {
      const claim = extract.claims.find(
        (c) => c.type === "compliance" && PROGRAMS.txramp.name.test(c.quote),
      );
      ledger.push({
        id: uniqueRowId("txramp"),
        dimension: "D3",
        claim_quote: claim?.quote ?? null,
        what_checked:
          "The TX-RAMP certified cloud products list, which is known to lag new certifications",
        result: "CONTRADICTED",
        evidence_tier: "T1",
        severity: "HIGH",
        sources: src(txramp),
        note: "",
        methodology_ref: "d3-3",
      });
      findings.push({
        id: "txramp",
        dimension: "D3",
        severity: "HIGH",
        resolved: false,
        detail:
          "A TX-RAMP certification described in the pitch is absent from the published TX-RAMP list. That list is known to lag actual certifications.",
      });
    } else if (txramp.status === "hit" && feedCredited(txramp)) {
      greenDims.add("D3");
      greenFlagFacts.push({
        fact: registryHitFact(vendorName, "on the TX-RAMP certified cloud products list", txramp),
        source_name: txramp.source,
        date: dateOf(txramp),
      });
      ledger.push({
        id: uniqueRowId("txramp"),
        dimension: "D3",
        claim_quote: null,
        what_checked: "The TX-RAMP certified cloud products list",
        result: "VERIFIED",
        evidence_tier: "T1",
        severity: null,
        sources: src(txramp),
        /* Code-templated: TX-RAMP levels differ ("Provisional" is not
           "Level 2") and the summary states the exact one. */
        note: txramp.summary.slice(0, 700),
        methodology_ref: "d3-3",
        ...(txramp.confidence ? { match_confidence: txramp.confidence } : {}),
        attribution: "attributed",
      });
    } else if (txramp.status === "hit") {
      pushFeedCandidateRow(
        txramp,
        "txramp",
        "The TX-RAMP certified cloud products list",
        "D3",
        "d3-3",
      );
    } else if (claimsTxramp) {
      ledger.push({
        id: uniqueRowId("txramp"),
        dimension: "D3",
        claim_quote: extract.claims.find((c) => PROGRAMS.txramp.name.test(c.quote))?.quote ?? null,
        what_checked: "The TX-RAMP certified cloud products list",
        result: "COULD_NOT_VERIFY",
        evidence_tier: "T4",
        severity: "MEDIUM",
        sources: src(txramp),
        note: "",
        methodology_ref: "d3-3",
      });
    }
  }

  const sourcewell = find(checks, "sourcewell");
  const sourcewellData = (sourcewell?.data ?? {}) as { claimed_but_absent?: boolean };
  if (sourcewellData.claimed_but_absent) {
    triggers.push({
      trigger: "cooperative_contract_contradiction",
      check_id: sourcewell!.check_id,
      detail: sourcewell!.summary,
      evidence_url: sourcewell!.evidence_url,
    });
    const claim = extract.claims.find(
      (c) => c.type === "compliance" && /sourcewell|cooperative/i.test(c.quote),
    );
    ledger.push({
      id: uniqueRowId("sourcewell"),
      dimension: "D3",
      claim_quote: claim?.quote ?? null,
      what_checked: "The Sourcewell cooperative contract holder list",
      result: "CONTRADICTED",
      evidence_tier: "T1",
      severity: "CRITICAL",
      sources: src(sourcewell!),
      note: "",
      methodology_ref: "d2-2",
    });
    findings.push({
      id: "sourcewell",
      dimension: "D3",
      severity: "CRITICAL",
      resolved: false,
      detail: "A cooperative contract described in the pitch is absent from the cooperative's own holder list.",
    });
  } else if (sourcewell?.status === "hit" && feedCredited(sourcewell)) {
    greenDims.add("D2");
    greenFlagFacts.push({
      fact: registryHitFact(vendorName, "on the Sourcewell cooperative contract holder list", sourcewell),
      source_name: sourcewell.source,
      date: dateOf(sourcewell),
    });
    /* A hit earns a VERIFIED row so all four registry checks read alike in
       the ledger. Dimension D2 to match the green dimension and the D2.2
       methodology section (the CONTRADICTED row above predates this and
       keeps its QA-keyed D3 dimension). */
    ledger.push({
      id: uniqueRowId("sourcewell"),
      dimension: "D2",
      claim_quote: null,
      what_checked: "The Sourcewell cooperative contract holder list",
      result: "VERIFIED",
      evidence_tier: "T1",
      severity: null,
      sources: src(sourcewell),
      note: sourcewell.summary.slice(0, 700),
      methodology_ref: "d2-2",
      ...(sourcewell.confidence ? { match_confidence: sourcewell.confidence } : {}),
      attribution: "attributed",
    });
  } else if (sourcewell?.status === "hit") {
    pushFeedCandidateRow(
      sourcewell,
      "sourcewell",
      "The Sourcewell cooperative contract holder list",
      "D2",
      "d2-2",
    );
  }

  /* Nonexistent-certification vocabulary. */
  const fakeCert = extract.claims.find(
    (c) =>
      c.type === "compliance" &&
      /\b(hipaa|cjis|ferpa|nist)[- ]?(certified|certification)\b/i.test(c.quote),
  );
  if (fakeCert) {
    ledger.push({
      id: uniqueRowId("cert-vocab"),
      dimension: "D3",
      claim_quote: fakeCert.quote,
      what_checked: "Whether this certification exists under the named regime",
      result: "CONTRADICTED",
      evidence_tier: "T1",
      severity: "MEDIUM",
      sources: [
        {
          url: "https://www.hhs.gov/hipaa/for-professionals/faq/2003/are-we-required-to-certify-our-organizations-compliance-with-the-standards/index.html",
          title: "HHS: no HIPAA certification exists",
          retrieved_at: input.generated_at,
        },
      ],
      note: "",
      methodology_ref: "d3-5",
    });
    findings.push({
      id: "cert-vocab",
      dimension: "D3",
      severity: "MEDIUM",
      resolved: false,
      detail: `The pitch names a certification that does not exist under that regime ("${fakeCert.quote.slice(0, 80)}").`,
    });
  }

  /* --------------------------------------------------- D4: technical substance */

  const crtsh = find(checks, "crtsh_subdomains");
  const crtshData = (crtsh?.data ?? {}) as { product_subdomains?: string[] };
  if ((crtshData.product_subdomains?.length ?? 0) > 0) {
    greenDims.add("D4");
    greenFlagFacts.push({
      fact: `Product infrastructure exists beyond the marketing site (${crtshData.product_subdomains!.slice(0, 3).join(", ")})`,
      source_name: crtsh!.source,
      date: dateOf(crtsh!),
    });
  }
  const github = find(checks, "github_org");
  if (github?.status === "hit") {
    greenDims.add("D4");
    greenFlagFacts.push({
      fact: "A public engineering footprint exists on GitHub",
      source_name: github.source,
      date: dateOf(github),
    });
  }

  /* ------------------------------------------------- D5: team credibility */

  /* Person corroboration over research citations, same grounded rule as
     customer traces: a person is corroborated only when ONE class 1-2
     citation names both the person and the vendor in retrieved content
     (the two-identifier rule instantiated as name + affiliation). URL
     strings never corroborate. Corroboration establishes the person exists
     in public sources independent of the vendor's site — not employment or
     title. Uncorroborated is never individually adverse (thin founder
     footprints are real and normal); the only adverse path is the aggregate
     below, gated on complete research. */
  const people = extract.people.slice(0, 6);
  const pitchPeopleLead = input.pitch_person_count ?? extract.people.length;
  let corroboratedPeople = 0;
  people.forEach((person, personIndex) => {
    const support = citations.find(
      (c) =>
        canVerify(c.domain_class) &&
        contentMentions(c, person.name) &&
        contentMentions(c, vendorName),
    );
    const claim = extract.claims.find(
      (c) =>
        c.type === "team" && c.subject && norm(c.subject) === norm(person.name),
    );
    /* Titles are ATTRIBUTED, never asserted as current fact: "CEO Zac
       Bookman" was true when a pitch was written and false by check time
       (OpenGov, disposition #6). Every person surface says who described
       the title. */
    const describedIn =
      personIndex < pitchPeopleLead ? "the pitch" : "the vendor's materials";
    /* Dated role-change conflict: when retrieved class 1-2 coverage of this
       vendor discusses a change in an executive role this person is said to
       hold, the report must say so with the date, never re-assert the title
       as current. Detection is code over citation metadata; no semantic
       claim is made beyond "a report discusses a change in this role". */
    const execTitle = EXEC_TITLE.exec(person.title)?.[0] ?? null;
    const roleConflict = execTitle
      ? citations.find(
          (c) =>
            canVerify(c.domain_class) &&
            contentMentions(c, vendorName) &&
            ROLE_CHANGE.test(`${c.title ?? ""} ${c.cited_text ?? ""}`),
        )
      : null;
    let conflictNote = "";
    if (roleConflict) {
      let host = roleConflict.url;
      try {
        host = new URL(roleConflict.url).hostname;
      } catch {
        /* keep the raw URL */
      }
      conflictNote = ` Coverage retrieved on ${roleConflict.retrieved_at.slice(0, 10)} (${host}) discusses a change in the ${execTitle} role at this vendor, so confirm who holds the title today.`;
    }
    ledger.push({
      id: uniqueRowId(`person-${slugPart(person.name)}`),
      dimension: "D5",
      claim_quote: claim?.quote ?? null,
      what_checked: `Whether ${person.name} appears in public sources independent of the vendor's site`,
      result: support ? "VERIFIED" : "COULD_NOT_VERIFY",
      evidence_tier: support ? (support.domain_class === 1 ? "T1" : "T3") : "T4",
      severity: null,
      sources: [
        ...(support
          ? [{ url: support.url, title: support.title, retrieved_at: support.retrieved_at }]
          : []),
        ...(roleConflict && roleConflict.url !== support?.url
          ? [{ url: roleConflict.url, title: roleConflict.title, retrieved_at: roleConflict.retrieved_at }]
          : []),
      ],
      /* Code-templated when a role conflict exists (a model note re-asserted
         a stale title while citing the succession article, 2026-08-29);
         otherwise S5 phrases it. */
      note: roleConflict
        ? `${person.name}, described in ${describedIn} as ${person.title}, ${
            support
              ? "appears in public sources independent of the vendor's site."
              : "could not be corroborated in retrieved public sources independent of the vendor's site. That is common and not adverse on its own."
          }${conflictNote}`.slice(0, 700)
        : "",
      methodology_ref: "d5-1",
    });
    if (support) {
      corroboratedPeople += 1;
      greenDims.add("D5");
      if (corroboratedPeople <= 2) {
        let host = support.url;
        try {
          host = new URL(support.url).hostname;
        } catch {
          /* keep the raw URL as the source name */
        }
        greenFlagFacts.push({
          fact: `${person.name}, described in ${describedIn} as ${person.title}, appears in public sources independent of the vendor's site${roleConflict ? ". Dated coverage discusses a change in this role; confirm current titles" : ""}`,
          source_name: host,
          date: support.retrieved_at.slice(0, 10),
        });
      }
    }
  });
  /* Threshold on PITCH-origin people only; any corroborated person
     (pitch- or site-origin — it is the same team) suppresses the
     aggregate. */
  const pitchPeopleCount = Math.min(
    input.pitch_person_count ?? extract.people.length,
    people.length,
  );
  if (!input.research_partial && corroboratedPeople === 0 && pitchPeopleCount >= 2) {
    findings.push({
      id: "leadership",
      dimension: "D5",
      severity: pitchPeopleCount >= 3 ? "HIGH" : "MEDIUM",
      resolved: false,
      detail: `None of the ${pitchPeopleCount} people the pitch presents as leadership could be corroborated in retrieved public sources independent of the vendor's site.`,
    });
  }

  /* ------------------------------------------------- D6: claims hygiene */

  for (const claim of extract.claims.filter((c) => c.type === "performance")) {
    const extreme = /\b(9[89]|100)\s*%|\bguarantee|zero\s+(errors|bias|hallucinations)|\bnever\s+(wrong|fails|hallucinates)/i.test(
      claim.quote,
    );
    /* "What this number implies" (D6.1 rider): code-templated arithmetic
       against the pitch's own stated basis, or the honest no-basis line.
       Narrative only — nothing here touches severity, findings, or tier
       inputs. */
    const implication = computeImplication(claim);
    ledger.push({
      id: uniqueRowId(`perf-${claim.id}`),
      dimension: "D6",
      claim_quote: claim.quote,
      what_checked: "Whether a published methodology or independent evaluation supports this number",
      result: "COULD_NOT_VERIFY",
      evidence_tier: "T4",
      severity: extreme ? "HIGH" : "MEDIUM",
      sources: [],
      note: "",
      methodology_ref: "d6-1",
      ...(implication ? { implication } : {}),
    });
    if (extreme) {
      findings.push({
        id: `perf-${claim.id}`,
        dimension: "D6",
        severity: "HIGH",
        resolved: false,
        detail: `An absolute performance claim ("${claim.quote.slice(0, 80)}") has no published methodology behind it.`,
      });
    }
  }

  if (extract.urgency_language.length > 0) {
    ledger.push({
      id: uniqueRowId("urgency"),
      dimension: "D6",
      claim_quote: extract.urgency_language[0],
      what_checked: "Pressure tactics in the pitch",
      result: "OFFICIAL_RECORD_FOUND",
      evidence_tier: "T2",
      severity: "MEDIUM",
      sources: [],
      note: "",
      methodology_ref: "d6-4",
    });
  }

  /* D4.1 model transparency: a pitch selling performance with no model
     disclosure anywhere gets a MEDIUM finding and a direct question
     (methodology D4.1). MEDIUM never moves the tier. */
  const disclosureCorpus = [
    extract.use_case_description,
    ...extract.claims.map((c) => c.quote),
  ]
    .join(" ")
    .toLowerCase();
  const mentionsModel =
    /\b(gpt[-\s]?[0-9a-z]*|claude|gemini|llama|mistral|anthropic|openai|azure openai|bedrock|vertex ai|foundation models?|large language models?|llms?|open[-\s]?weights?|fine[-\s]?tun\w*)\b/i.test(
      disclosureCorpus,
    );
  const sellsCapability = extract.claims.some(
    (c) => c.type === "performance" || c.type === "availability",
  );
  if (!mentionsModel && sellsCapability) {
    findings.push({
      id: "model-transparency",
      dimension: "D4",
      severity: "MEDIUM",
      resolved: false,
      detail:
        "The materials make capability claims without disclosing what AI models power the product.",
    });
  }

  /* D4.3 automation honesty: an unqualified full-automation claim gets a
     MEDIUM finding and the staffing question (methodology D4.3). */
  const automationClaim = extract.claims.find((c) =>
    /\b(fully automated|no human (intervention|review|in the loop)|zero[-\s]touch|end[-\s]to[-\s]end automation|without (any )?human)\b/i.test(
      c.quote,
    ),
  );
  if (automationClaim) {
    findings.push({
      id: "automation",
      dimension: "D4",
      severity: "MEDIUM",
      resolved: false,
      detail: `The materials describe unqualified full automation ("${automationClaim.quote.slice(0, 80)}").`,
    });
  }

  /* Domain-age contradiction escalates to a trigger only with zero verified
     customers (methodology tier-1 criteria). A candidate award record
     (uncredited) does not rescue the escalation. */
  if (rdapContradiction && verifiedCustomers === 0 && !usaspCredit) {
    triggers.push({
      trigger: "domain_age_contradiction_no_customers",
      check_id: "rdap_domain_age",
      detail:
        "The domain registration date contradicts the pitch's history claims, and no claimed customer could be verified in public records.",
      evidence_url: rdap?.evidence_url ?? null,
    });
  }

  /* ---------------------------------------------------------- tier inputs */

  /* Severity reconciliation (structuring invariant): the tier reads
     FINDINGS, and the verdict rationale asserts "no unresolved
     high-severity findings" — so a HIGH or CRITICAL ledger row that no
     unresolved finding covers would make that sentence true of the
     findings and false of the page above it (one unverified customer
     among verified ones was the live case). Such rows downgrade to
     MEDIUM: the tier stays finding-driven and the ledger never outranks
     it. Locked by test: a tier-4 decision never coexists with an open
     HIGH/CRITICAL row. */
  for (const row of ledger) {
    if (row.severity !== "HIGH" && row.severity !== "CRITICAL") continue;
    const covered = findings.some(
      (f) =>
        !f.resolved &&
        (f.severity === "HIGH" || f.severity === "CRITICAL") &&
        (f.id === row.id ||
          row.id.startsWith(`${f.id}-`) ||
          (f.id === "customers" && row.id.startsWith("cust-"))),
    );
    if (!covered) row.severity = "MEDIUM";
  }

  /* Favorable credit follows the attribution rule: identity-class
     connectors count only when the record is credited to THIS vendor (a
     namesake's records must not clear the startup bar). */
  const startupBar =
    (govramp?.status === "hit" && feedCredited(govramp)) ||
    verifiedCustomers > 0 ||
    usaspCredit ||
    (edgar?.status === "hit" && edgar.attribution === "attributed");

  const tierInputs: TierInputs = {
    resolvable: input.resolvable,
    identity_resolved: identity.identity_resolved,
    t1_triggers: triggers,
    findings,
    green_dimensions: [...greenDims],
    startup_bar_met: startupBar,
    adv_findings,
  };

  /* ------------------------------------------------------------- questions */

  /* Question selection lives in questions.ts (pure code, tier-aware). The
     tier is computed here because selection honors the methodology's tier
     conditioning; computeTier is pure and cheap, and the pipeline tail's
     own call returns the identical decision. */
  const decision = computeTier(tierInputs);
  const t4Dimensions = [
    ...new Set(
      ledger
        .filter((r) => r.result === "COULD_NOT_VERIFY")
        .map((r) => r.dimension),
    ),
  ];
  const finalQuestions = selectQuestions({
    findings,
    extract,
    sector,
    packs: input.packs,
    tier: decision.tier,
    t4_dimensions: t4Dimensions,
    namedCustomers,
  });

  /* ---------------------------------------------------------- honesty panel */

  const honesty: HonestyItem[] = checks.map((c) => ({
    check_id: c.check_id,
    label: c.source,
    status:
      c.status === "hit"
        ? "pass"
        : c.status === "definitive_miss"
          ? "pass" /* the search ran and completed; the result feeds the ledger */
          : c.status === "not_applicable"
            ? "not_applicable"
            : "could_not_check",
    reason:
      c.status === "coverage_limited" || c.status === "error" ? c.summary : null,
  }));
  /* Coverage legibility: EDGAR's full-text search is national, and readers
     should not have to open the methodology to learn that. */
  const edgarFtsItem = honesty.find((h) => h.check_id === "edgar_fts");
  if (edgarFtsItem && edgarFtsItem.reason === null) {
    edgarFtsItem.reason =
      "This search is national. A venture-funded company's Form D filing shows it exists and names its state of incorporation, whatever state it operates in.";
  }
  /* crt.sh outages are common and expected; the panel must say the tool
     never leans on it, or an unavailable row reads like a coverage hole.
     REPLACE the generic could-not-reach copy (appending overflowed the
     schema's 300-char reason cap and failed report assembly whenever
     crt.sh was down, 2026-09-01). */
  const crtshItem = honesty.find((h) => h.check_id === "crtsh_subdomains");
  if (crtshItem && crtshItem.status === "could_not_check") {
    crtshItem.reason =
      "This public certificate log is often unavailable and the tool never relies on it alone; a working mail lookup stands in where identity needs a second identifier.";
  }
  /* Inferred-domain caveat: when the site checks ran against a domain we
     inferred from research citations (name-only submissions), say so, and
     say what the inference did not do. */
  const domainInference = honesty.find((h) => h.check_id === "domain_inference");
  if (domainInference) {
    domainInference.reason =
      "The website was matched to the vendor's name by our research, not stated by the vendor. Its registration record counts toward identity only alongside a government registry record, and only when the site itself names the vendor.";
  }
  /* Adverse ledger rows flip their check to "flag". */
  const flaggedChecks = new Set(
    ledger
      .filter((r) => r.result === "CONTRADICTED" || (r.severity === "HIGH" || r.severity === "CRITICAL"))
      .flatMap((r) => r.sources.map((s) => s.title ?? "")),
  );
  for (const h of honesty) {
    if (flaggedChecks.has(h.label)) h.status = "flag";
  }
  /* Planned checks, shown honestly. */
  honesty.push(
    {
      check_id: "planned_soc2",
      label: "SOC 2 report verification",
      status: "could_not_check",
      reason: "No public registry of SOC 2 reports exists. Use the document-request question instead.",
    },
    {
      check_id: "planned_linkedin",
      label: "LinkedIn team footprint",
      status: "could_not_check",
      reason: "LinkedIn prohibits automated checking. A manual check card below walks you through it in about a minute.",
    },
  );

  /* ---------------------------------------------------------- manual checks */

  const manualChecks: ManualCheck[] = [
    {
      id: "manual-linkedin",
      label: "LinkedIn headcount and team",
      instructions: `Search LinkedIn for "${vendorName}". Open the company page and look at the number of listed employees and their roles.`,
      link: `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(vendorName)}`,
      what_bad_looks_like:
        "A company claiming dozens of staff with two or three profiles, no engineers at an AI company, or a page created in the last few months.",
    },
    {
      id: "manual-reverse-image",
      label: "Team photo check",
      instructions:
        "Right-click a team photo on the vendor's site and search the image with Google Lens or TinEye.",
      link: "https://tineye.com",
      what_bad_looks_like:
        "The same face appearing on unrelated websites, or photos with the telltale symmetry of AI-generated portraits.",
    },
  ];
  const limitedSos = sosChecks.find((c) => c.status === "coverage_limited");
  if (limitedSos && !identity.identity_resolved) {
    manualChecks.push({
      id: "manual-sos",
      label: "State business registry search",
      instructions: `Search the official business registry for "${vendorName}" in the company's home state. The link opens the official search page.`,
      link: limitedSos.evidence_url,
      what_bad_looks_like:
        "No registration under any name the vendor uses, or a registration only weeks old for a company claiming years of work.",
    });
  }

  manualChecks.push(...leadCards);

  /* Honesty-panel grouping: an unavailable-this-run source and a check that
     exists as a one-minute manual card must not read identically. Assigned
     here, after the manual cards exist, so "for you to check" reflects an
     actual card in this report. */
  const cardCheckIds = new Set<string>(["planned_linkedin"]);
  if (limitedSos && manualChecks.some((m) => m.id === "manual-sos")) {
    cardCheckIds.add(limitedSos.check_id);
  }
  for (const h of honesty) {
    if (h.status === "flag") h.group = "flag";
    else if (h.status === "pass") h.group = "checked";
    else if (h.status === "not_applicable") h.group = "not_applicable";
    else h.group = cardCheckIds.has(h.check_id) ? "needs_you" : "unavailable";
  }

  /* -------------------------------------------------------------- leads */

  /* Research findings that back no ledger row, surfaced instead of silently
     discarded (the Carahsoft/PitchBook problem): a citation qualifies when
     it mentions a report subject — a named customer, a named person, or the
     vendor — and its URL is not already attached to a row or a manual card.
     Leads are follow-ups for the reader, never evidence: class 4 (PR wires)
     never appears, class 3 carries a verify-independently note, and note
     copy states honestly whether the page was read or only surfaced.

     Order (methodology 1.8, D2.4): the vendor's own pages take no slot;
     pages whose retrieved headline carries a dispute word come first and
     carry the adverse_headline flag; then source class ascending; then the
     URL string, compared by code point so the order is the same on every
     run. Before 1.8 the sort was class then URL and vendor pages were
     eligible, so on Mark43 the eight slots went to the vendor's own pages
     while the retrieved contract-termination and lawsuit stories, class 3
     like the vendor pages, lost on the URL string (gauntlet round 2,
     2026-09-01). The flag orders and marks; it is never a finding and
     never reaches the tier inputs. */
  const usedUrls = new Set<string>([
    ...ledger.flatMap((r) => r.sources.map((s) => s.url)),
    ...manualChecks.flatMap((m) => (m.link ? [m.link] : [])),
  ]);
  const leadSubjects = [
    ...namedCustomers,
    ...people.map((p) => p.name),
    vendorName,
  ];
  const vendorDomains = input.vendor_domains ?? extract.domains;
  const byCodePoint = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  const leadSeen = new Set<string>();
  const leadCandidates: { c: Citation; retrieved: boolean; subject: string; adverse: boolean }[] = [];
  for (const c of citations) {
    if (c.domain_class === 4) continue;
    if (usedUrls.has(c.url) || leadSeen.has(c.url)) continue;
    if (isVendorHost(c.url, vendorDomains)) continue;
    const retrieved = c.title !== null || c.cited_text !== null;
    const subject = leadSubjects.find((s) =>
      retrieved ? contentMentions(c, s) || urlMentions(c.url, s) : urlMentions(c.url, s),
    );
    if (!subject) continue;
    leadSeen.add(c.url);
    leadCandidates.push({ c, retrieved, subject, adverse: adverseHeadlineHit(c.title) });
  }
  leadCandidates.sort(
    (a, b) =>
      Number(b.adverse) - Number(a.adverse) ||
      a.c.domain_class - b.c.domain_class ||
      byCodePoint(a.c.url, b.c.url),
  );
  const leads: LeadRef[] = leadCandidates.slice(0, 8).map(({ c, retrieved, subject, adverse }) => {
    const classPhrase =
      c.domain_class === 1
        ? "an official government source"
        : c.domain_class === 2
          ? "independent press"
          : "a directory or vendor-linked page; verify independently";
    const channelPhrase = retrieved
      ? "Read during research"
      : "Surfaced during research but not opened";
    /* A headline that trips the banned-word lint is withheld (the link
       still renders as its URL); the flag stands, because the match was
       made on the retrieved headline and the label is fixed copy. */
    const cleanTitle =
      c.title && lintText(c.title).some((v) => v.kind === "banned") ? null : c.title;
    return {
      url: c.url,
      title: cleanTitle,
      retrieved_at: c.retrieved_at,
      source_class: c.domain_class as 1 | 2 | 3,
      note: `${channelPhrase}: mentions ${subject}. This is ${classPhrase}.`.slice(0, 200),
      ...(adverse ? { flag: "adverse_headline" as const } : {}),
    };
  });

  /* Source accounting (structuring invariant): every class 1-2 citation
     lands in exactly one bucket — attached to a row or card, surfaced as
     a lead, or listed here as retrieved-but-not-assessed. Research spend
     must be visible even when structuring found no place for a page. */
  const leadUrls = new Set(leads.map((l) => l.url));
  const unassessedSeen = new Set<string>();
  const unassessedSources: SourceRef[] = [];
  for (const c of citations) {
    if (unassessedSources.length >= 12) break;
    if (!canVerify(c.domain_class)) continue;
    if (usedUrls.has(c.url) || leadUrls.has(c.url) || unassessedSeen.has(c.url)) continue;
    unassessedSeen.add(c.url);
    unassessedSources.push({
      url: c.url,
      title:
        c.title && lintText(c.title).some((v) => v.kind === "banned")
          ? null
          : c.title,
      retrieved_at: c.retrieved_at,
    });
  }

  return {
    tierInputs,
    ledger,
    greenFlagFacts,
    questions: finalQuestions,
    honesty,
    manualChecks: manualChecks.slice(0, 8),
    leads,
    unassessedSources,
  };
}
