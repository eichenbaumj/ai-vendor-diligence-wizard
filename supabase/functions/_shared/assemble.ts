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
  LedgerRow,
  ManualCheck,
  PitchExtract,
  RegistryCheck,
  ReportQuestion,
  SectorContext,
} from "./schemas.ts";
import type { Finding, T1Trigger, TierInputs } from "./tier.ts";
import type { SectorPack } from "./packs-types.ts";
import { canVerify } from "./domain-classes.ts";

export interface AssembleInput {
  extract: PitchExtract;
  checks: RegistryCheck[];
  identity: { identity_resolved: boolean; identifiers_found: string[] };
  citations: Citation[];
  adv_findings: AdvFinding[];
  sector: SectorContext;
  packs: Record<string, SectorPack>;
  resolvable: boolean;
  generated_at: string; // ISO
}

export interface AssembledSkeleton {
  tierInputs: TierInputs;
  ledger: LedgerRow[];
  greenFlagFacts: { fact: string; source_name: string; date: string }[];
  questions: ReportQuestion[];
  honesty: HonestyItem[];
  manualChecks: ManualCheck[];
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(inc|llc|corp|co|ltd|pbc|company|corporation)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

function tokensOf(s: string): string[] {
  return norm(s)
    .split(" ")
    .filter((t) => t.length > 2);
}

/* A haystack "covers" a subject when it contains a majority of the
   subject's tokens. Deterministic and conservative. */
function tokenMajority(hay: string, subject: string): boolean {
  const toks = tokensOf(subject);
  if (toks.length === 0) return false;
  const hits = toks.filter((t) => hay.includes(t)).length;
  return hits >= Math.max(1, Math.ceil(toks.length * 0.6));
}

/* Verification is grounded in retrieved content. contentMentions matches a
   subject against what the search tool actually captured from a page (title
   and quoted passage) — narrative-harvested links carry neither and can
   never match. urlMentions matches against the URL string alone: enough to
   surface a lead for manual confirmation, never enough to verify, because
   nothing was fetched for a URL the research model merely wrote down.
   hostCovers ties a citation to a customer when the page lives on the
   customer's own site. */
function contentMentions(c: Citation, subject: string): boolean {
  if (c.title === null && c.cited_text === null) return false;
  return tokenMajority(norm(`${c.title ?? ""} ${c.cited_text ?? ""}`), subject);
}

function urlMentions(url: string, subject: string): boolean {
  return tokenMajority(norm(url), subject);
}

function hostCovers(url: string, subject: string): boolean {
  try {
    return tokenMajority(norm(new URL(url).hostname), subject);
  } catch {
    return false;
  }
}

function find(checks: RegistryCheck[], id: string): RegistryCheck | undefined {
  return checks.find((c) => c.check_id === id);
}

function dateOf(c: RegistryCheck): string {
  return c.retrieved_at.slice(0, 10);
}

function src(c: RegistryCheck) {
  return c.evidence_url
    ? [{ url: c.evidence_url, title: c.source, retrieved_at: c.retrieved_at }]
    : [];
}

let rowSeq = 0;
function rowId(): string {
  rowSeq += 1;
  return `row-${String(rowSeq).padStart(2, "0")}`;
}

export function assemble(input: AssembleInput): AssembledSkeleton {
  rowSeq = 0;
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
  const sam = find(checks, "sam_entity");

  if (identity.identity_resolved) {
    greenDims.add("D1");
    const basis = identity.identifiers_found.slice(0, 3).join("; ");
    const best = sosHits[0] ?? (edgar?.status === "hit" ? edgar : sam);
    ledger.push({
      id: rowId(),
      dimension: "D1",
      claim_quote: null,
      what_checked: "Whether a registered legal entity stands behind this pitch",
      result: "VERIFIED",
      evidence_tier: "T1",
      severity: null,
      sources: [
        ...(best ? src(best) : []),
        ...(edgar && edgar.status === "hit" && best !== edgar ? src(edgar) : []),
      ].slice(0, 4),
      note: "", // phrased by S5
      methodology_ref: "d1-1",
    });
    if (best) {
      greenFlagFacts.push({
        fact: `A registered legal entity was found for ${vendorName} (${basis})`,
        source_name: best.source,
        date: dateOf(best),
      });
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
    ledger.push({
      id: rowId(),
      dimension: "D1",
      claim_quote: null,
      what_checked: "Whether a registered legal entity stands behind this pitch",
      result: limited && sosHits.length === 0 ? "COVERAGE_LIMITED" : "COULD_NOT_VERIFY",
      evidence_tier: "T4",
      severity: "MEDIUM",
      sources: sosChecks.slice(0, 3).flatMap(src),
      note: "",
      methodology_ref: "d1-1",
    });
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
      id: rowId(),
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
    ledger.push({
      id: rowId(),
      dimension: "D1",
      claim_quote: rdapContradiction ? (identityClaim?.quote ?? null) : null,
      what_checked: "Domain registration date against the pitch's history claims",
      result: rdapContradiction ? "CONTRADICTED" : "VERIFIED",
      evidence_tier: "T1",
      severity: rdapContradiction ? "HIGH" : null,
      sources: src(rdap),
      note: "",
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
      id: rowId(),
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
  if (usasp?.status === "hit") {
    greenDims.add("D2");
    greenFlagFacts.push({
      fact: `Federal payment records show awards to ${vendorName}`,
      source_name: usasp.source,
      date: dateOf(usasp),
    });
    ledger.push({
      id: rowId(),
      dimension: "D2",
      claim_quote: null,
      what_checked: "Federal award records (USAspending.gov)",
      result: "VERIFIED",
      evidence_tier: "T1",
      severity: null,
      sources: src(usasp),
      note: "",
      methodology_ref: "d2-1",
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
  for (const customer of extract.named_customers.slice(0, 8)) {
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
        id: rowId(),
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
        id: rowId(),
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
  if (extract.named_customers.length > 0 && verifiedCustomers === 0) {
    findings.push({
      id: "customers",
      dimension: "D2",
      severity: "HIGH",
      resolved: false,
      detail:
        leadCards.length > 0
          ? `None of the ${extract.named_customers.length} named government customers could be verified in retrieved public records. Candidate pages on official sites are linked under manual checks for confirmation.`
          : `None of the ${extract.named_customers.length} named government customers left a public trace we could find.`,
    });
  }

  /* --------------------------------------------- D3: security & compliance */

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
        id: rowId(),
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
    } else if (fedramp.status === "hit") {
      greenDims.add("D3");
      greenFlagFacts.push({
        fact: `${vendorName} appears in the FedRAMP Marketplace`,
        source_name: fedramp.source,
        date: dateOf(fedramp),
      });
      ledger.push({
        id: rowId(),
        dimension: "D3",
        claim_quote: null,
        what_checked: "The FedRAMP Marketplace authorization feed",
        result: "VERIFIED",
        evidence_tier: "T1",
        severity: null,
        sources: src(fedramp),
        note: "",
        methodology_ref: "d3-1",
      });
    } else if (claimsFedramp) {
      ledger.push({
        id: rowId(),
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

  const govramp = find(checks, "govramp");
  const govrampData = (govramp?.data ?? {}) as { claimed_but_absent?: boolean };
  if (govramp?.status === "hit") {
    greenDims.add("D3");
    greenFlagFacts.push({
      fact: `${vendorName} appears on the GovRAMP program participant list`,
      source_name: govramp.source,
      date: dateOf(govramp),
    });
  } else if (govrampData.claimed_but_absent) {
    triggers.push({
      trigger: "compliance_registry_contradiction",
      check_id: govramp!.check_id,
      detail: govramp!.summary,
      evidence_url: govramp!.evidence_url,
    });
    findings.push({
      id: "govramp",
      dimension: "D3",
      severity: "CRITICAL",
      resolved: false,
      detail: "A GovRAMP status described in the pitch is absent from the GovRAMP participant list.",
    });
  }

  /* TX-RAMP: the published list is known to lag actual certifications, so a
     claimed-but-absent result is HIGH, never CRITICAL, and never a tier-1
     trigger (methodology D3.3). */
  const txramp = find(checks, "txramp");
  const txrampData = (txramp?.data ?? {}) as { claimed_but_absent?: boolean };
  if (txramp?.status === "hit") {
    greenDims.add("D3");
    greenFlagFacts.push({
      fact: `${vendorName} appears on the TX-RAMP certified cloud products list`,
      source_name: txramp.source,
      date: dateOf(txramp),
    });
  } else if (txrampData.claimed_but_absent) {
    findings.push({
      id: "txramp",
      dimension: "D3",
      severity: "HIGH",
      resolved: false,
      detail:
        "A TX-RAMP certification described in the pitch is absent from the published TX-RAMP list. That list is known to lag actual certifications.",
    });
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
      id: rowId(),
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
  } else if (sourcewell?.status === "hit") {
    greenDims.add("D2");
    greenFlagFacts.push({
      fact: `${vendorName} holds a Sourcewell cooperative contract`,
      source_name: sourcewell.source,
      date: dateOf(sourcewell),
    });
  }

  /* Nonexistent-certification vocabulary. */
  const fakeCert = extract.claims.find(
    (c) =>
      c.type === "compliance" &&
      /\b(hipaa|cjis|ferpa|nist)[- ]?(certified|certification)\b/i.test(c.quote),
  );
  if (fakeCert) {
    ledger.push({
      id: rowId(),
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

  /* ------------------------------------------------- D6: claims hygiene */

  for (const claim of extract.claims.filter((c) => c.type === "performance")) {
    const extreme = /\b(9[89]|100)\s*%|\bguarantee|zero\s+(errors|bias|hallucinations)|\bnever\s+(wrong|fails|hallucinates)/i.test(
      claim.quote,
    );
    ledger.push({
      id: rowId(),
      dimension: "D6",
      claim_quote: claim.quote,
      what_checked: "Whether a published methodology or independent evaluation supports this number",
      result: "COULD_NOT_VERIFY",
      evidence_tier: "T4",
      severity: extreme ? "HIGH" : "MEDIUM",
      sources: [],
      note: "",
      methodology_ref: "d6-1",
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
      id: rowId(),
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

  /* Domain-age contradiction escalates to a trigger only with zero verified
     customers (methodology tier-1 criteria). */
  if (rdapContradiction && verifiedCustomers === 0 && usasp?.status !== "hit") {
    triggers.push({
      trigger: "domain_age_contradiction_no_customers",
      check_id: "rdap_domain_age",
      detail:
        "The domain registration date contradicts the pitch's history claims, and no claimed customer could be verified in public records.",
      evidence_url: rdap?.evidence_url ?? null,
    });
  }

  /* ---------------------------------------------------------- tier inputs */

  const startupBar =
    govramp?.status === "hit" ||
    verifiedCustomers > 0 ||
    usasp?.status === "hit" ||
    edgar?.status === "hit";

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

  const questions: ReportQuestion[] = [];

  /* Gap-driven. */
  for (const f of findings.filter((x) => x.severity === "HIGH" || x.severity === "CRITICAL").slice(0, 4)) {
    if (f.id === "customers") {
      questions.push({
        id: "gap-customers",
        source: "gap",
        text: `Your materials name ${extract.named_customers.slice(0, 3).join(", ")} as customers. For each: is there an active paid contract, a pilot, or individual users? Please provide the contract administrator's name and contact so we may verify.`,
        why: "None of the named customers left a public record trace we could find.",
      });
    } else if (f.id.startsWith("perf-")) {
      const q = extract.claims.find((c) => `perf-${c.id}` === f.id);
      if (q) {
        questions.push({
          id: f.id,
          source: "claim",
          text: `Your materials state: "${q.quote}". Which deployment produced this figure, measured how, over what period, and may we contact that organization?`,
          why: "Performance numbers need a methodology and a named reference before they can inform a decision.",
        });
      }
    } else if (f.id === "fedramp_marketplace" || f.id === "govramp") {
      questions.push({
        id: `gap-${f.id}`,
        source: "gap",
        text: "Please provide the exact authorization your product holds: the program (FedRAMP or GovRAMP), the status level, the package or listing ID, and the sponsoring agency, so we can confirm it in the public marketplace.",
        why: "The authorization described in the pitch did not match the public feed when we checked.",
      });
    } else if (f.id === "txramp") {
      questions.push({
        id: "gap-txramp",
        source: "gap",
        text: "Please provide your TX-RAMP certification letter, or a confirmation from Texas DIR, naming the level you hold (Level 1, Level 2, or Provisional) and the certified product.",
        why: "The TX-RAMP certification described in the pitch was not on the published list when we checked, and that list can lag.",
      });
    } else if (f.id === "domain-age") {
      questions.push({
        id: "gap-domain-age",
        source: "gap",
        text: "Your materials describe a multi-year track record. Please list the legal entity name and founding year, any prior company names, and two customers from that earlier period we may contact.",
        why: "The company's web presence is much newer than the history described.",
      });
    }
  }

  /* Sector pack questions (top of each matched pack, by id). */
  const perPack = sector.pack_ids.length > 1 ? 3 : 5;
  for (const packId of sector.pack_ids) {
    const pack = input.packs[packId];
    if (!pack) continue;
    for (const pq of pack.diligence_questions.slice(0, perPack)) {
      questions.push({
        id: pq.id,
        source: "pack",
        text: pq.question,
        why: `A standard question for ${pack.pack_name.toLowerCase()} vendors. A credible answer: ${pq.good_answer}`,
      });
    }
  }

  /* Universal core. */
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
  questions.push(...core);

  /* Dedup by id, cap at 15. */
  const seenQ = new Set<string>();
  const finalQuestions = questions
    .filter((q) => (seenQ.has(q.id) ? false : (seenQ.add(q.id), true)))
    .slice(0, 15);

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

  return {
    tierInputs,
    ledger,
    greenFlagFacts,
    questions: finalQuestions,
    honesty,
    manualChecks: manualChecks.slice(0, 8),
  };
}
