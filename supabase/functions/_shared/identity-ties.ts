/*
  Tying signals: deterministic attribution of registry records to the vendor
  (methodology D1.1 attribution rule).

  A registry record under a matching name is a CANDIDATE until a second
  detail ties it to this vendor. Ties compare facts captured from the
  official record (an officer, an address, a state, a domain) against
  vendor-side facts already inside the typed stage boundaries: the merged
  pitch/site extract and class 1-2 research citations. Raw attacker text
  never reaches this module, and site text still never expands the query
  name set or mints identity on its own — a tie can only corroborate a
  record that a name match already surfaced.

  MONOTONE-ADD INVARIANT (the planted-tie containment): vendor-authored
  text can only ADD facts to compare; nothing a pitch or site says can
  remove or negate a tie computed from the record side. The worst a hostile
  pitch can do is claim a namesake record's officer or address as its own,
  which attributes the record AGAINST the attacker — they inherit its
  dissolution, exclusions, and history. Denials are inert: no function here
  reads one.

  Strength classes (Joe's disposition, 2026-08-31): officer, address,
  domain, feed_product, and full_legal_name are STRONG; a bare state match
  is WEAK. Adverse findings arm only on strong ties; favorable identity
  accepts any tie. That policy lives in the consumers (resolveIdentity,
  assemble) — this module only reports what tied and how strongly.

  Conservatism notes:
  - City+state ties come only from structured extracted addresses, never
    from free citation text: bare two-letter codes are English words
    ("OR", "IN", "CO") and would tie everywhere.
  - Street ties require a digit-bearing line (a house number), matched as a
    whole normalized fragment.
  - Officer ties from coverage require at least two name tokens; a
    single-token name is too generic to tie anything.

  Pure module: no Deno APIs, no I/O.
*/
import type {
  Citation,
  PitchExtract,
  RegistryCheck,
  TieEvidence,
  TieSignal,
} from "./schemas.ts";
import {
  hasCorporateSuffix,
  isProductOnlyName,
  normalizeCompanyName,
  normalizePersonName,
  normalizeUnstripped,
  productOnlyTokens,
} from "./registry/sam.ts";
import { isRegistryGradeHost } from "./domain-classes.ts";
import { contentMentions, tokensOf } from "./text-match.ts";

/* ------------------------------------------------------------- state names */

const STATE_NAME_TO_CODE: Record<string, string> = {
  ALABAMA: "AL",
  ALASKA: "AK",
  ARIZONA: "AZ",
  ARKANSAS: "AR",
  CALIFORNIA: "CA",
  COLORADO: "CO",
  CONNECTICUT: "CT",
  DELAWARE: "DE",
  FLORIDA: "FL",
  GEORGIA: "GA",
  HAWAII: "HI",
  IDAHO: "ID",
  ILLINOIS: "IL",
  INDIANA: "IN",
  IOWA: "IA",
  KANSAS: "KS",
  KENTUCKY: "KY",
  LOUISIANA: "LA",
  MAINE: "ME",
  MARYLAND: "MD",
  MASSACHUSETTS: "MA",
  MICHIGAN: "MI",
  MINNESOTA: "MN",
  MISSISSIPPI: "MS",
  MISSOURI: "MO",
  MONTANA: "MT",
  NEBRASKA: "NE",
  NEVADA: "NV",
  "NEW HAMPSHIRE": "NH",
  "NEW JERSEY": "NJ",
  "NEW MEXICO": "NM",
  "NEW YORK": "NY",
  "NORTH CAROLINA": "NC",
  "NORTH DAKOTA": "ND",
  OHIO: "OH",
  OKLAHOMA: "OK",
  OREGON: "OR",
  PENNSYLVANIA: "PA",
  "RHODE ISLAND": "RI",
  "SOUTH CAROLINA": "SC",
  "SOUTH DAKOTA": "SD",
  TENNESSEE: "TN",
  TEXAS: "TX",
  UTAH: "UT",
  VERMONT: "VT",
  VIRGINIA: "VA",
  WASHINGTON: "WA",
  "WEST VIRGINIA": "WV",
  WISCONSIN: "WI",
  WYOMING: "WY",
  "DISTRICT OF COLUMBIA": "DC",
};

const STATE_CODES = new Set(Object.values(STATE_NAME_TO_CODE));

/* Normalize a state expression to a two-letter code, or null: accepts a
   bare code ("NY"), a full name ("New York"), or a jurisdiction string
   containing one ("New York, United States"). */
export function stateCodeOf(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const upper = raw.toUpperCase().replace(/[^A-Z\s]/g, " ").replace(/\s+/g, " ").trim();
  if (upper.length === 2 && STATE_CODES.has(upper)) return upper;
  if (STATE_NAME_TO_CODE[upper]) return STATE_NAME_TO_CODE[upper];
  for (const [name, code] of Object.entries(STATE_NAME_TO_CODE)) {
    if (upper.includes(name)) return code;
  }
  return null;
}

/* ------------------------------------------------------------ text helpers */

/* Address fragments: case-fold, collapse punctuation, keep digits. */
function normAddr(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* The digit-bearing street fragment of an address line ("405 LEXINGTON
   AVENUE" out of "C/O EABO, 37TH FL. 405 LEXINGTON AVENUE"), or null when
   no token sequence starts with a house number followed by a word. */
export function streetFragment(raw: string): string | null {
  const tokens = normAddr(raw).split(" ");
  for (let i = 0; i < tokens.length - 1; i++) {
    if (/^\d{1,6}$/.test(tokens[i]) && /[A-Z]/.test(tokens[i + 1])) {
      return tokens.slice(i, Math.min(i + 4, tokens.length)).join(" ");
    }
  }
  return null;
}

/* Two-letter state codes appearing in an address string, in address
   position (followed by a zip or at the end): "Austin, TX 78701" -> TX. */
function statesInAddress(raw: string): string[] {
  const out: string[] = [];
  const upper = raw.toUpperCase();
  for (const m of upper.matchAll(/\b([A-Z]{2})\b(?=[\s,]*(?:\d{5}|$))/g)) {
    if (STATE_CODES.has(m[1]) && !out.includes(m[1])) out.push(m[1]);
  }
  const named = stateCodeOf(raw);
  if (named && !out.includes(named)) out.push(named);
  return out;
}

/* ----------------------------------------------------------------- corpora */

type VendorSource = "pitch" | "site";

export interface VendorTieCorpus {
  peopleNames: { name: string; source: VendorSource }[];
  addresses: { value: string; source: VendorSource }[];
  /* Coverage-sourced states come from full state names in class 1-2
     citations; the resulting tie is always weak (favorable-only). */
  states: { code: string; source: VendorSource | "coverage" }[];
  /* Pitch-stated registrable domains, lowercase. Discovered/inferred
     domains are excluded: their provenance is not vendor-asserted. */
  domains: string[];
  productNames: string[];
  /* Raw submitted vendor names (pitch-only by construction). */
  submittedNames: string[];
  /* Class 1-2 citations only. */
  coverage: Citation[];
}

export function buildTieCorpus(args: {
  extract: PitchExtract;
  /* extract.people[0..pitchPersonCount) are pitch-origin (extract-merge). */
  pitchPersonCount: number;
  /* extract.addresses[0..pitchAddressCount) are pitch-origin. */
  pitchAddressCount: number;
  primaryDomain: string | null;
  productNames: string[];
  citations: Citation[];
}): VendorTieCorpus {
  const { extract } = args;
  const peopleNames = extract.people.map((p, i) => ({
    name: p.name,
    source: (i < args.pitchPersonCount ? "pitch" : "site") as VendorSource,
  }));
  const addresses = extract.addresses.map((a, i) => ({
    value: a,
    source: (i < args.pitchAddressCount ? "pitch" : "site") as VendorSource,
  }));
  const states: { code: string; source: VendorSource | "coverage" }[] = [];
  const addState = (
    code: string | null,
    source: VendorSource | "coverage",
  ) => {
    if (code && !states.some((s) => s.code === code)) states.push({ code, source });
  };
  addState(stateCodeOf(extract.state_mentioned), "pitch");
  for (const a of addresses) {
    for (const code of statesInAddress(a.value)) addState(code, a.source);
  }
  /* States from class 1-2 coverage, FULL NAMES ONLY (bare two-letter codes
     are English words and would tie everywhere): independent press writing
     "the Madison, Wisconsin company" corroborates a Wisconsin record. The
     resulting tie is weak — favorable identity only, never adverse — the
     same risk class Joe accepted for pitch-claimed states, and coverage is
     not attacker-authored. Without this, a name-only run of a real company
     whose site yields no extractable address lands at "could not verify"
     while the run's own citations name its home state (Polco and Zencity,
     2026-09-01 run 1). */
  for (const c of args.citations) {
    if (c.domain_class > 2) continue;
    const text = `${c.title ?? ""} ${c.cited_text ?? ""}`.toUpperCase();
    for (const [name, code] of Object.entries(STATE_NAME_TO_CODE)) {
      if (text.includes(name)) addState(code, "coverage");
    }
  }
  const domains = new Set<string>();
  for (const d of extract.domains) {
    const clean = d.toLowerCase().replace(/^www\./, "").trim();
    if (clean) domains.add(clean);
  }
  if (args.primaryDomain) {
    domains.add(args.primaryDomain.toLowerCase().replace(/^www\./, ""));
  }
  return {
    peopleNames,
    addresses,
    states,
    domains: [...domains],
    productNames: args.productNames,
    submittedNames: extract.vendor_name_candidates,
    coverage: args.citations.filter((c) => c.domain_class <= 2),
  };
}

/* ------------------------------------------------------------ record facts */

export interface RecordTieFacts {
  legal_name: string;
  street?: string | null;
  city?: string | null;
  addr_state?: string | null;
  officers?: string[];
  agent?: string | null;
  /* The state whose registry produced the record. */
  registration_state?: string | null;
  /* Formation/home jurisdiction when the record states one. */
  jurisdiction?: string | null;
  domain?: string | null;
  /* Compliance-feed service/product metadata, when the feed carries it. */
  product?: string | null;
  /* How the record's name matched (from the lane's best match): drives the
     attribution verdict, not the tie computation. */
  match_confidence?: "exact" | "name_similarity";
  containment?: "query_in_record" | "record_in_query";
  /* The record carries an affirmative end-of-registration designation.
     Such a record needs a STRONG tie to be attributed at all: without this,
     a weak state tie could mint identity from a dissolved namesake while
     the strong-tie rule kept its dissolution from arming — identity credit
     and a suppressed red flag from the same record. */
  dissolved?: boolean;
}

/* --------------------------------------------------------------- computeTies */

const STRONG = "strong" as const;
const WEAK = "weak" as const;

export function computeTies(
  record: RecordTieFacts,
  corpus: VendorTieCorpus,
): TieEvidence {
  const checkable =
    corpus.peopleNames.length > 0 ||
    corpus.addresses.length > 0 ||
    corpus.states.length > 0 ||
    corpus.domains.length > 0 ||
    corpus.coverage.length > 0;
  const signals: TieSignal[] = [];
  const seenSignals = new Set<string>();
  const add = (s: TieSignal) => {
    if (signals.length >= 8) return;
    /* One signal per normalized fact: "Jane Roe" and "JANE ROE" are the
       same tie. */
    const key = `${s.kind}|${s.value.toUpperCase().replace(/[^A-Z0-9]/g, "")}`;
    if (seenSignals.has(key)) return;
    seenSignals.add(key);
    signals.push(s);
  };

  /* Officer / registered agent (strong). */
  const recordPeople = [...(record.officers ?? []), record.agent ?? ""].filter(
    (n) => n.trim().length > 0,
  );
  for (const person of recordPeople) {
    const norm = normalizePersonName(person);
    if (!norm) continue;
    const vendorPerson = corpus.peopleNames.find(
      (p) => normalizePersonName(p.name) === norm,
    );
    if (vendorPerson) {
      add({
        kind: "officer",
        strength: STRONG,
        value: person.slice(0, 120),
        vendor_source: vendorPerson.source,
      });
      continue;
    }
    /* Coverage mention: the officer's name in a class 1-2 page's title or
       captured text. Needs two or more tokens to mean anything. */
    if (tokensOf(person).length >= 2) {
      const cite = corpus.coverage.find((c) => contentMentions(c, person));
      if (cite) {
        add({
          kind: "officer",
          strength: STRONG,
          value: person.slice(0, 120),
          vendor_source: "coverage",
        });
      }
    }
  }

  /* Address (strong): a digit-bearing street fragment shared with a vendor
     address or a class 1-2 page, or a city+state pair shared with a vendor
     address. */
  if (record.street) {
    const frag = streetFragment(record.street);
    if (frag) {
      const vendorAddr = corpus.addresses.find((a) =>
        normAddr(a.value).includes(frag),
      );
      if (vendorAddr) {
        add({
          kind: "address",
          strength: STRONG,
          value: frag.slice(0, 120),
          vendor_source: vendorAddr.source,
        });
      } else {
        const cite = corpus.coverage.find((c) =>
          normAddr(`${c.title ?? ""} ${c.cited_text ?? ""}`).includes(frag),
        );
        if (cite) {
          add({
            kind: "address",
            strength: STRONG,
            value: frag.slice(0, 120),
            vendor_source: "coverage",
          });
        }
      }
    }
  }
  if (record.city && record.addr_state) {
    const cityNorm = normAddr(record.city);
    const stateCode = stateCodeOf(record.addr_state);
    if (cityNorm && stateCode) {
      const vendorAddr = corpus.addresses.find(
        (a) =>
          normAddr(a.value).includes(cityNorm) &&
          statesInAddress(a.value).includes(stateCode),
      );
      if (vendorAddr) {
        add({
          kind: "address",
          strength: STRONG,
          value: `${record.city}, ${stateCode}`.slice(0, 120),
          vendor_source: vendorAddr.source,
        });
      }
    }
  }

  /* Domain (strong): the record names the vendor's registrable domain. */
  if (record.domain) {
    const clean = record.domain.toLowerCase().replace(/^www\./, "").trim();
    if (clean && corpus.domains.includes(clean)) {
      add({
        kind: "domain",
        strength: STRONG,
        value: clean.slice(0, 120),
        vendor_source: "pitch",
      });
    }
  }

  /* Compliance-feed product metadata (strong): the feed's own service or
     product field names the vendor's product or domain. */
  if (record.product) {
    const productNorm = normalizeUnstripped(record.product);
    const named =
      corpus.productNames.find(
        (p) => productNorm.length > 0 && productNorm === normalizeUnstripped(p),
      ) ??
      corpus.submittedNames.find(
        (n) => productNorm.length > 0 && productNorm === normalizeUnstripped(n),
      );
    const domainNamed = corpus.domains.find((d) =>
      record.product!.toLowerCase().includes(d),
    );
    if (named || domainNamed) {
      add({
        kind: "feed_product",
        strength: STRONG,
        value: record.product.slice(0, 120),
        vendor_source: "pitch",
      });
    }
  }

  /* Full legal name (strong): the buyer typed the record's complete legal
     name, corporate suffix included. Two or more tokens required, so a bare
     brand ("Polco") can never earn it. */
  for (const submitted of corpus.submittedNames) {
    const s = normalizeUnstripped(submitted);
    if (
      s.length > 0 &&
      s.split(" ").length >= 2 &&
      hasCorporateSuffix(record.legal_name) &&
      s === normalizeUnstripped(record.legal_name)
    ) {
      add({
        kind: "full_legal_name",
        strength: STRONG,
        value: record.legal_name.slice(0, 120),
        vendor_source: "submitted_name",
      });
      break;
    }
  }

  /* State (weak): the record's registration, formation, or principal-
     address state matches a claimed state. Weak by policy — enough to
     support favorable identity, never enough to arm an adverse finding. */
  for (const raw of [
    record.registration_state,
    record.jurisdiction,
    record.addr_state,
  ]) {
    const code = stateCodeOf(raw);
    if (!code) continue;
    const claimed = corpus.states.find((s) => s.code === code);
    if (claimed) {
      add({
        kind: "state",
        strength: WEAK,
        value: code,
        vendor_source: claimed.source,
      });
    }
  }

  return {
    tied: signals.length > 0,
    strong: signals.some((s) => s.strength === STRONG),
    checkable,
    signals,
  };
}

/* ---------------------------------------------------------- check adjudication */

const SOS_LANE_STATE: Record<string, string> = {
  sos_ny: "NY",
  sos_co: "CO",
  sos_ct: "CT",
  sos_tx: "TX",
  sos_or: "OR",
  sos_fl: "FL",
};

interface SosLaneMatch {
  name?: unknown;
  confidence?: unknown;
  street?: unknown;
  city?: unknown;
  addr_state?: unknown;
  entity_type?: unknown;
  jurisdiction?: unknown;
  agent?: unknown;
  officers?: unknown;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function strArray(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
}

/* Record-side facts for the check's BEST match — the record the downstream
   identity anchor and dissolution surface consume. Returns null for check
   families that carry no adjudicable record. */
export function tieFactsForCheck(check: RegistryCheck): RecordTieFacts | null {
  if (check.status !== "hit") return null;
  const data = (check.data ?? {}) as Record<string, unknown>;

  if (check.check_id.startsWith("sos_")) {
    const matches = Array.isArray(data["matches"])
      ? (data["matches"] as SosLaneMatch[])
      : [];
    if (matches.length === 0) return null;
    const best =
      matches.find((m) => str(m.confidence) === "exact") ?? matches[0];
    const name = str(best.name);
    if (!name) return null;
    const confidence = str(best.confidence);
    const containment = str((best as { containment?: unknown }).containment);
    return {
      legal_name: name,
      street: str(best.street),
      city: str(best.city),
      addr_state: str(best.addr_state),
      officers: strArray(best.officers),
      agent: str(best.agent),
      registration_state: SOS_LANE_STATE[check.check_id] ?? null,
      jurisdiction: str(best.jurisdiction),
      ...(confidence === "exact" || confidence === "name_similarity"
        ? { match_confidence: confidence }
        : {}),
      ...(containment === "query_in_record" || containment === "record_in_query"
        ? { containment }
        : {}),
      ...(data["dissolved"] ? { dissolved: true } : {}),
    };
  }

  if (check.check_id === "sam_entity") {
    const name = str(data["legal_business_name"]);
    if (!name) return null;
    const addr = (data["physical_address"] ?? {}) as Record<string, unknown>;
    return {
      legal_name: name,
      street: str(addr["street"]),
      city: str(addr["city"]),
      addr_state: str(addr["state"]),
      ...(check.confidence ? { match_confidence: check.confidence } : {}),
    };
  }

  if (
    check.check_id === "fedramp_marketplace" ||
    check.check_id === "govramp" ||
    check.check_id === "txramp" ||
    check.check_id === "sourcewell"
  ) {
    const matches = Array.isArray(data["matches"])
      ? (data["matches"] as Record<string, unknown>[])
      : [];
    const best = matches[0]; /* the lanes sort exact-confidence first */
    const name = best ? (str(best["provider"]) ?? str(best["supplier"])) : null;
    if (!name) return null;
    return {
      legal_name: name,
      product: str(best!["product"]),
      ...(check.confidence ? { match_confidence: check.confidence } : {}),
    };
  }

  if (check.check_id === "edgar_fts" || check.check_id === "edgar_company") {
    const entities = Array.isArray(data["filing_entities"])
      ? (data["filing_entities"] as Record<string, unknown>[])
      : [];
    const best =
      entities.find((e) => str(e["confidence"]) === "exact") ?? entities[0];
    const name = best ? str(best["name"]) : null;
    if (!name) return null;
    const confidence = str(best!["confidence"]);
    const containment = str(best!["containment"]);
    return {
      legal_name: name,
      jurisdiction: str(best!["inc_state"]),
      ...(confidence === "exact" || confidence === "name_similarity"
        ? { match_confidence: confidence }
        : {}),
      ...(containment === "query_in_record" || containment === "record_in_query"
        ? { containment }
        : {}),
    };
  }

  return null;
}

/* A brand that collides everywhere: a single normalized token under four
   characters ("17A", "Zip"). Exact matches on such names are the proven
   false-attribution class, so their attribution requires a STRONG tie —
   a same-state namesake is common exactly where short names collide. */
export function isDegenerateBrandName(name: string): boolean {
  const tokens = normalizeUnstripped(name).split(" ").filter(Boolean);
  if (tokens.length === 0) return true;
  /* Judge the SUFFIX-STRIPPED form: "ZIP, LLC" is still the brand "ZIP". */
  const stripped =
    tokens.length > 1 && hasCorporateSuffix(name) ? tokens.slice(0, -1) : tokens;
  return stripped.length === 1 && stripped[0].length < 4;
}

/* The attribution verdict for one adjudicated record.

   The proven false-attribution classes are DEGENERATE names (single token
   under four characters: the 17A and Zip class), CONTAINMENT matches in
   either direction (BASIS ASJ, KAIZEN 3), and END-OF-REGISTRATION records
   (the dissolved Polco namesake) — each keeps a tie requirement below. An
   exact match on a DISTINCTIVE name against a LIVE record attributes even
   untied: real early-stage companies' registrations legitimately carry
   facts nothing public relates to them anymore (Polco's true 2018 Texas
   registration lists the founder's old apartment, which no coverage of
   the Madison-based company will ever mention; 2026-09-01 run 2), and no
   audited false attribution came from that class. Ties still matter for
   such records: adverse findings on them require a STRONG tie always. */
export function attributionFor(
  facts: RecordTieFacts,
  tie: TieEvidence,
): "attributed" | "candidate" {
  if (facts.dissolved && !tie.strong) return "candidate";
  if (isDegenerateBrandName(facts.legal_name)) {
    return tie.strong ? "attributed" : "candidate";
  }
  if (facts.match_confidence === "exact") {
    return "attributed";
  }
  if (facts.match_confidence === "name_similarity") {
    /* Promotable direction (record ⊇ query): any tie promotes. Namesake
       direction (record ⊂ query): only a STRONG tie promotes — a shared
       officer or address means the shorter-named record is genuinely
       connected, while a state coincidence means nothing there. */
    if (facts.containment === "query_in_record") {
      return tie.tied ? "attributed" : "candidate";
    }
    if (facts.containment === "record_in_query") {
      return tie.strong ? "attributed" : "candidate";
    }
  }
  return "candidate";
}

/* Write tie evidence and the attribution verdict onto every adjudicable
   hit. Mutates the checks in place (they are pipeline-local values, not
   shared state). Checks whose family carries no record facts are left
   untouched — consumers treat a missing attribution as candidate. */
export function adjudicateChecks(
  checks: RegistryCheck[],
  corpus: VendorTieCorpus,
): void {
  for (const check of checks) {
    const facts = tieFactsForCheck(check);
    if (!facts) continue;
    check.tie = computeTies(facts, corpus);
    check.attribution = attributionFor(facts, check.tie);
  }
}

/* ------------------------------------------------- S3 -> S2 name bridge */

export interface BridgeName {
  name: string;
  source_url: string;
  source_host: string;
}

/* Corporate-suffix-terminated spans in registry-grade text: the SteadyIQ/
   Prepared fix. Research retrieved "Steady Platform, Inc." from official
   sources while every registry query ran on "SteadyIQ"; this finds such
   legal names so the registry stage can re-run under them.

   Security containment: only citations on the REGISTRY_GRADE_HOSTS
   allowlist qualify — vendor sites are Class 3 by construction and the
   pitch never reaches this function, so attacker-authored text cannot
   plant a name here. A candidate must share at least one anchor token
   with the vendor's own name (a registry page merely mentioning
   "Deloitte LLP" fails), must not be built from product-brand tokens,
   and must not already be a known query name. Discovered names feed ONLY
   the local registry re-run: never extract.vendor_name_candidates, never
   research queries. The report always states the discovered name and its
   source (assemble's identity green flag). */
const LEGAL_NAME_SPAN =
  /([A-Z][A-Za-z0-9&.,'’ -]{1,80}?[,.]?\s+(?:Inc|Incorporated|LLC|Corp|Corporation|Co|Company|Ltd|Limited|PBC|LP|LLP)\.?)(?=[^A-Za-z0-9]|$)/g;

export function discoverBridgeNames(
  citations: Citation[],
  args: {
    anchorNames: string[];
    productNames: string[];
    knownNames: string[];
  },
): BridgeName[] {
  const anchorTokens = [
    ...new Set(args.anchorNames.flatMap((n) => normalizeCompanyName(n).split(" "))),
  ].filter(Boolean);
  /* Anchor coverage includes shared prefixes of four or more characters:
     "Steady Platform, Inc." must anchor on the brand "SteadyIQ" (STEADY is
     a prefix of STEADYIQ), while a registry page merely mentioning an
     unrelated company still fails. */
  const anchors = (token: string): boolean =>
    anchorTokens.some(
      (a) =>
        a === token ||
        (token.length >= 4 && a.startsWith(token)) ||
        (a.length >= 4 && token.startsWith(a)),
    );
  const productTokens = productOnlyTokens(args.productNames, args.anchorNames);
  const known = new Set(
    args.knownNames.map((n) => normalizeCompanyName(n)).filter(Boolean),
  );
  const out: BridgeName[] = [];
  const seen = new Set<string>();
  const wordNorm = (w: string) => w.toUpperCase().replace(/[^A-Z0-9]/g, "");
  for (const c of citations) {
    if (out.length >= 2) break;
    if (c.domain_class !== 1) continue;
    if (!isRegistryGradeHost(c.url)) continue;
    for (const field of [c.title, c.cited_text]) {
      if (!field || out.length >= 2) continue;
      for (const m of field.matchAll(LEGAL_NAME_SPAN)) {
        if (out.length >= 2) break;
        /* A capitalized run can swallow leading page-title words ("Active
           Franchise Taxpayers Steady Platform, Inc."): trim the span to
           start at the first word the vendor's own name anchors. */
        const words = m[1].trim().split(/\s+/);
        const startIdx = words.findIndex((w) => anchors(wordNorm(w)));
        if (startIdx === -1) continue;
        const candidate = words.slice(startIdx).join(" ").replace(/^[,.\s]+/, "");
        const norm = normalizeCompanyName(candidate);
        if (!norm || known.has(norm) || seen.has(norm)) continue;
        if (isProductOnlyName(candidate, productTokens)) continue;
        if (!hasCorporateSuffix(candidate)) continue;
        seen.add(norm);
        let host = c.url;
        try {
          host = new URL(c.url).hostname.replace(/^www\./, "");
        } catch {
          /* keep the raw URL as the label */
        }
        out.push({ name: candidate, source_url: c.url, source_host: host });
      }
    }
  }
  return out;
}
