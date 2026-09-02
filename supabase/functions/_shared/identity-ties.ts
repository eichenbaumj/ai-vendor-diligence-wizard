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
import { registrableDomain } from "./domain-inference.ts";
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
/* Full state names, uppercase, for prose screens (synthesis-guard.ts). */
export const STATE_NAMES: readonly string[] = Object.keys(STATE_NAME_TO_CODE);

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

/* Deterministic footer-state harvest: two-letter codes in ADDRESS POSITION
   ("New York, NY 10014" — a comma-or-word boundary before, a zip after)
   in fetched site text. Code over quarantined text, no model: the model's
   address extraction is run-variable, and a tie corpus that flaps makes
   identity flap (Zencity resolved on one run and not the next,
   2026-09-01). Zip REQUIRED here, unlike statesInAddress: free page text
   needs the strictest shape. */
export function siteStatesFromText(text: string): string[] {
  const out: string[] = [];
  for (const m of text.toUpperCase().matchAll(/,\s*([A-Z]{2})[\s,]+\d{5}(?:-\d{4})?\b/g)) {
    if (STATE_CODES.has(m[1]) && !out.includes(m[1])) out.push(m[1]);
  }
  return out;
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
  /* The registrable root label of a SUBMITTED domain (the web-address
     tab's host, or the address typed beside a vendor name), lowercase,
     letters and digits only ("acmegov" from www.acmegov.com). Null on
     bare-name runs and for pitch-stated, discovered, or inferred domains:
     only an address the buyer put in front of the tool is a statement
     about WHICH company is being checked. It is a name-consistency check
     on record credit (methodology D1.1), never a tie: a product name that
     took over the vendor name on a URL run ("Conduit" for a company whose
     address is conductorai.com, 2026-09-01) must not mint an unrelated
     exact-name record. */
  submittedDomainRoot: string | null;
  /* The earliest vendor-side year the run knows: a founding year the
     pitch states, or the registration year of the vendor's own domain
     (pitch-stated or submitted, or discovered and confirmed). Null when
     neither exists. Drives the age veto in computeTies: a record formed
     long before the vendor existed is a namesake until a strong detail
     says otherwise (a 1996 corporation minted a 2019 startup's identity,
     gauntlet round 2, R2-F1). */
  vendorYear: number | null;
}

/* Years a record may predate the vendor's earliest known year before the
   age veto applies. Five: a company can be older than its current website
   or its stated founding story by a few years; two decades is a namesake. */
export const AGE_VETO_YEARS = 5;

/* The root label of a host's registrable domain, letters and digits only:
   "www.Acme-Gov.com" -> "acmegov"; "vendor.co.uk" -> "vendor". */
export function domainRootOf(host: string): string {
  const clean = host.toLowerCase().replace(/^www\./, "").trim();
  const root = registrableDomain(clean).split(".")[0] ?? "";
  return root.replace(/[^a-z0-9]/g, "");
}

/* Tokens that carry no identity in a legal name: a root must cover a
   DISTINCTIVE token, never only one of these. */
const GENERIC_NAME_TOKENS = new Set([
  "group", "holdings", "technologies", "technology", "tech", "solutions",
  "systems", "services", "software", "labs", "global", "international",
  "america", "american", "national", "united", "partners", "enterprises",
  "industries", "network", "networks", "digital", "data", "capital",
  "ventures", "management", "consulting", "associates", "the", "and", "of",
]);

/* Does a submitted domain's root label cover a record's legal name? The
   record's name tokens (suffixes stripped) are checked AGAINST the root,
   never the reverse: tokenMajority(root, name) would fail every real
   multi-token legal name ("ZENCITY TECHNOLOGIES US" vs "zencity" covers
   one token of three). A distinctive token (four or more characters, not
   a generic business word) contained in the root covers the name; so does
   the whole name concatenated. Short names with no distinctive token fall
   back to the concatenation ("zip" in "zipsec"), and the degenerate-name
   rule upstream still demands a strong tie for those. */
export function domainRootCoversName(root: string, legalName: string): boolean {
  const r = root.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!r) return false;
  const tokens = normalizeCompanyName(legalName).toLowerCase().split(" ").filter(Boolean);
  if (tokens.length === 0) return false;
  const concat = tokens.join("");
  const distinctive = tokens.filter((t) => t.length >= 4 && !GENERIC_NAME_TOKENS.has(t));
  if (distinctive.length === 0) {
    return concat.length >= 3 && r.includes(concat);
  }
  if (distinctive.some((t) => r.includes(t))) return true;
  if (r.includes(concat)) return true;
  return r.length >= 4 && concat.includes(r);
}

/* The registration year of the vendor's own domain, when the run knows
   it: the RDAP lane's hit for a pitch-stated or submitted domain, or a
   discovered domain the site itself confirmed (the same provenance rule
   identity resolution applies). Null otherwise. */
export function domainRegistrationYear(checks: RegistryCheck[]): number | null {
  const rdap = checks.find((c) => c.check_id === "rdap_domain_age" && c.status === "hit");
  if (!rdap) return null;
  const d = (rdap.data ?? {}) as {
    registered_year?: unknown;
    discovered_domain?: unknown;
    confirmed_name_match?: unknown;
  };
  if (d.discovered_domain && d.confirmed_name_match !== true) return null;
  return typeof d.registered_year === "number" && Number.isFinite(d.registered_year)
    ? d.registered_year
    : null;
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
  /* The SITE extract's own claimed state (never merged into the pitch
     extract): a tie source per the design's site-claimed-HQ rule. */
  siteState?: string | null;
  /* Deterministic footer states harvested by siteStatesFromText. */
  siteStates?: string[];
  /* A domain the BUYER submitted (url tab host, or the website typed
     beside a name). Never the pitch-stated, discovered, or inferred
     domain. */
  submittedDomain?: string | null;
  /* The founding year the pitch states, if any. */
  foundingYear?: number | null;
  /* The registration year of the vendor's own domain (domainRegistrationYear). */
  domainYear?: number | null;
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
  addState(stateCodeOf(args.siteState ?? null), "site");
  for (const s of args.siteStates ?? []) addState(stateCodeOf(s), "site");
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
    /* Methodology 1.7: a citation's state names count only when the
       citation also mentions the vendor. A full state name anywhere in a
       class 1-2 page tied namesakes to this vendor (the accela cell's
       promoted baseline anchored on ACCELA AVALON MANAGEMENT LLC through a
       coverage state, 2026-09-01). */
    if (!extract.vendor_name_candidates.some((n) => contentMentions(c, n))) continue;
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
  const years = [args.foundingYear ?? null, args.domainYear ?? null].filter(
    (y): y is number => typeof y === "number" && Number.isFinite(y),
  );
  return {
    peopleNames,
    addresses,
    states,
    domains: [...domains],
    productNames: args.productNames,
    submittedNames: extract.vendor_name_candidates,
    coverage: args.citations.filter((c) => c.domain_class <= 2),
    submittedDomainRoot: args.submittedDomain ? domainRootOf(args.submittedDomain) || null : null,
    vendorYear: years.length > 0 ? Math.min(...years) : null,
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
  /* The record's registration or formation year in the lane that found
     it, when the dataset states one. A foreign registration date is later
     than formation, which only makes the record look younger: the age
     veto never fires on it wrongly. */
  formation_year?: number | null;
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

  /* Age veto (methodology 1.7): a record formed more than AGE_VETO_YEARS
     before the vendor's earliest known year is a namesake until a strong
     detail says otherwise. Evidence only; attributionFor applies it. */
  const ageContradicted =
    typeof record.formation_year === "number" &&
    typeof corpus.vendorYear === "number" &&
    record.formation_year < corpus.vendorYear - AGE_VETO_YEARS;

  return {
    tied: signals.length > 0,
    strong: signals.some((s) => s.strength === STRONG),
    checkable,
    signals,
    ...(ageContradicted ? { age_contradicted: true } : {}),
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
  status?: unknown;
  date?: unknown;
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

/* A four-digit year at the start of a lane date ("2019-05-20", "1996"). */
function yearOf(raw: string | null): number | null {
  const m = raw?.match(/^((?:19|20)\d{2})/);
  return m ? Number(m[1]) : null;
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
      formation_year: yearOf(str(best.date)),
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
  /* Judge the FULLY suffix-stripped form, using the same loop the matcher
     normalizes with: "Zip Co Ltd" strips to the brand "ZIP" exactly as it
     exact-matches the query "Zip" — stripping only one suffix let the
     Australian Zip Co Ltd attribute as a distinctive name and green-flag
     the wrong company's SEC filing (zipsec eye-read, 2026-09-01). */
  const stripped = normalizeCompanyName(name).split(" ").filter(Boolean);
  if (stripped.length === 0) return true;
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
export interface AttributionGuard {
  /* The record's family takes the symmetric rules (state registries, SEC,
     SAM). Compliance feeds keep the plain exact-match verdict here: their
     credit is decided by feedCredited in assemble, under its own rules. */
  symmetric: boolean;
  /* Whether the submitted domain's root covers the record's name; null
     when the run has no submitted domain. */
  rootCovered: boolean | null;
  /* The record came through the research-to-registry name bridge, whose
     whole purpose is a legal name the brand (and so the root) cannot
     reveal: the root check does not apply to it. */
  bridged: boolean;
  /* Census verdict across the run's registry lanes: true when no other
     live exact-name record under a DIFFERENT name competes, or when this
     record's name is backed by strictly more independent registries than
     every competitor. False when a competitor is at least as well
     supported. Null when no census ran (direct calls). */
  anchor: boolean | null;
}

const DEFAULT_GUARD: AttributionGuard = {
  symmetric: true,
  rootCovered: null,
  bridged: false,
  anchor: null,
};

/* Methodology 1.7 (symmetric attribution). Before 1.7 an exact match on a
   distinctive live name attributed untied, while adverse records needed a
   strong tie: the favorable side had no gate, and a 1996 Colorado namesake
   minted a 2019 startup's identity (round 2, R2-F1), a product name minted
   an unrelated Texas LLC on a URL run (2026-09-01), and a Connecticut
   namesake LLC joined a Delaware corporation's identity row (R2-F10). The
   untied exact path now needs, in order: a strong tie (always enough); no
   age contradiction and a covering submitted root (else candidate); any
   tie (enough); otherwise the census: the record's name must be the only
   live exact name in the run or the best-supported one. Real single-record
   startups whose registrations tie to nothing public (Polco's true Texas
   record) still attribute: nothing competes with them. */
export function attributionFor(
  facts: RecordTieFacts,
  tie: TieEvidence,
  guard: Partial<AttributionGuard> = {},
): "attributed" | "candidate" {
  const g: AttributionGuard = { ...DEFAULT_GUARD, ...guard };
  if (facts.dissolved && !tie.strong) return "candidate";
  if (isDegenerateBrandName(facts.legal_name)) {
    return tie.strong ? "attributed" : "candidate";
  }
  /* A weak or absent tie cannot carry a record that is too old for this
     vendor or that the buyer's own web address does not cover. */
  const vetoed =
    g.symmetric &&
    !tie.strong &&
    (tie.age_contradicted === true || (g.rootCovered === false && !g.bridged));
  if (facts.match_confidence === "exact") {
    if (tie.strong) return "attributed";
    if (vetoed) return "candidate";
    if (tie.tied) return "attributed";
    if (!g.symmetric) return "attributed";
    return g.anchor === false ? "candidate" : "attributed";
  }
  if (facts.match_confidence === "name_similarity") {
    /* Promotable direction (record ⊇ query): any tie promotes, unless the
       age or root veto applies. Namesake direction (record ⊂ query): only
       a STRONG tie promotes; a shared officer or address means the
       shorter-named record is genuinely connected, while a state
       coincidence means nothing there. */
    if (facts.containment === "query_in_record") {
      if (tie.strong) return "attributed";
      if (vetoed) return "candidate";
      return tie.tied ? "attributed" : "candidate";
    }
    if (facts.containment === "record_in_query") {
      return tie.strong ? "attributed" : "candidate";
    }
  }
  return "candidate";
}

/* Statuses that mark a registry record as no longer live, for the census
   only (the dissolution surface has its own detector). A record that is
   not live cannot compete for the vendor's identity. */
const NOT_LIVE_STATUS = /dissol|revok|forfeit|terminat|surrender|withdraw|cancel|inactive/i;

const SYMMETRIC_FAMILY = /^sos_|edgar|^sam(_entity)?$/;

/* The live exact-name census: every live registry record whose name
   exactly matches a query, keyed by unstripped normalized name, with the
   set of independent registries (each state lane, EDGAR, SAM) that hold
   it. Reads every lane match, not only the best one. */
export function exactLiveKeys(checks: RegistryCheck[]): Map<string, Set<string>> {
  const keys = new Map<string, Set<string>>();
  const add = (name: string | null, lane: string) => {
    if (!name) return;
    const k = normalizeUnstripped(name);
    if (!k) return;
    if (!keys.has(k)) keys.set(k, new Set());
    keys.get(k)!.add(lane);
  };
  for (const check of checks) {
    if (check.status !== "hit") continue;
    const data = (check.data ?? {}) as Record<string, unknown>;
    if (check.check_id.startsWith("sos_")) {
      const matches = Array.isArray(data["matches"]) ? (data["matches"] as SosLaneMatch[]) : [];
      for (const m of matches) {
        if (str(m.confidence) !== "exact") continue;
        const status = str(m.status);
        if (status && NOT_LIVE_STATUS.test(status)) continue;
        add(str(m.name), check.check_id);
      }
    } else if (/edgar/.test(check.check_id)) {
      const entities = Array.isArray(data["filing_entities"])
        ? (data["filing_entities"] as Record<string, unknown>[])
        : [];
      for (const e of entities) {
        if (str(e["confidence"]) === "exact") add(str(e["name"]), "edgar");
      }
    } else if (/^sam(_entity)?$/.test(check.check_id) && check.confidence === "exact") {
      add(str(data["legal_business_name"]), "sam");
    }
  }
  return keys;
}

/* The refused-namesake census for the collision notice: distinct
   exact-name records (live or dissolved) across the registry lanes that
   were NOT credited to the vendor. Similarity matches and the rejected
   product-only or investment-vehicle names are not namesakes and never
   count. A name credited anywhere never counts, wherever else it appears
   (the same entity registered in several states). The count is a floor:
   lanes stop on the first exact match and cap their lists. */
export function namesakeCensus(checks: RegistryCheck[]): number {
  const credited = new Set<string>();
  const seen = new Set<string>();
  const facts = new Map<RegistryCheck, RecordTieFacts | null>();
  for (const check of checks) {
    const f = tieFactsForCheck(check);
    facts.set(check, f);
    if (f && check.attribution === "attributed") credited.add(normalizeUnstripped(f.legal_name));
  }
  for (const check of checks) {
    if (check.status !== "hit") continue;
    const data = (check.data ?? {}) as Record<string, unknown>;
    const names: string[] = [];
    if (check.check_id.startsWith("sos_")) {
      const matches = Array.isArray(data["matches"]) ? (data["matches"] as SosLaneMatch[]) : [];
      for (const m of matches) {
        if (str(m.confidence) === "exact") {
          const n = str(m.name);
          if (n) names.push(n);
        }
      }
    } else if (/edgar/.test(check.check_id)) {
      const entities = Array.isArray(data["filing_entities"])
        ? (data["filing_entities"] as Record<string, unknown>[])
        : [];
      for (const e of entities) {
        if (str(e["confidence"]) === "exact") {
          const n = str(e["name"]);
          if (n) names.push(n);
        }
      }
    } else if (/^sam(_entity)?$/.test(check.check_id) && check.confidence === "exact") {
      const n = str(data["legal_business_name"]);
      if (n) names.push(n);
    }
    for (const n of names) {
      const key = normalizeUnstripped(n);
      if (!key || credited.has(key)) continue;
      seen.add(key);
    }
  }
  return seen.size;
}

/* Guard facts for one check, from the census and the corpus. */
export function guardFor(
  check: RegistryCheck,
  facts: RecordTieFacts,
  corpus: VendorTieCorpus,
  census: Map<string, Set<string>>,
): AttributionGuard {
  const symmetric = SYMMETRIC_FAMILY.test(check.check_id);
  const rootCovered = corpus.submittedDomainRoot
    ? domainRootCoversName(corpus.submittedDomainRoot, facts.legal_name)
    : null;
  const bridged = Boolean(((check.data ?? {}) as { name_bridge?: unknown }).name_bridge);
  const key = normalizeUnstripped(facts.legal_name);
  const support = census.get(key)?.size ?? 0;
  const competitors = [...census.entries()].filter(([k]) => k !== key);
  const anchor =
    competitors.length === 0 || competitors.every(([, lanes]) => lanes.size < support);
  return { symmetric, rootCovered, bridged, anchor };
}

/* Write tie evidence and the attribution verdict onto every adjudicable
   hit. Mutates the checks in place (they are pipeline-local values, not
   shared state). Checks whose family carries no record facts are left
   untouched — consumers treat a missing attribution as candidate. */
export function adjudicateChecks(
  checks: RegistryCheck[],
  corpus: VendorTieCorpus,
): void {
  const census = exactLiveKeys(checks);
  for (const check of checks) {
    const facts = tieFactsForCheck(check);
    if (!facts) continue;
    check.tie = computeTies(facts, corpus);
    check.attribution = attributionFor(facts, check.tie, guardFor(check, facts, corpus, census));
  }
}

/* A compact, record-free trace of every adjudication for the stored row:
   RegistryCheck.data is not persisted on standard runs, so this is how a
   probe reads why a record was or was not credited. No addresses, no
   officers, no raw record payloads. */
export function attributionTrace(checks: RegistryCheck[]): {
  check_id: string;
  confidence: string | null;
  attribution: "attributed" | "candidate" | null;
  legal_name: string | null;
  formation_year: number | null;
  tie: {
    tied: boolean;
    strong: boolean;
    age_contradicted: boolean;
    signals: { kind: string; strength: string; vendor_source: string }[];
  } | null;
}[] {
  const out = [];
  for (const check of checks) {
    if (check.status !== "hit") continue;
    const facts = tieFactsForCheck(check);
    if (!facts) continue;
    out.push({
      check_id: check.check_id,
      confidence: check.confidence ?? null,
      attribution: check.attribution ?? null,
      legal_name: facts.legal_name.slice(0, 160),
      formation_year: facts.formation_year ?? null,
      tie: check.tie
        ? {
            tied: check.tie.tied,
            strong: check.tie.strong,
            age_contradicted: check.tie.age_contradicted === true,
            signals: check.tie.signals.map((s) => ({
              kind: s.kind,
              strength: s.strength,
              vendor_source: s.vendor_source,
            })),
          }
        : null,
    });
  }
  return out;
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
