/*
  Synthesis guard (methodology 1.7, "what the AI writes and what code writes").

  The narrative model sees the decided skeleton and phrases it. Twice in
  the audits it phrased a different company into the report: the structure
  pass named a Texas construction firm as a vendor's legal entity against
  its own registry retrieval (round 2, R2-F9), and a green flag named a
  noise match ending "you do not have to assume the company is a shell"
  (live, 2026-09-01). This module is the code-side invariant: every entity
  name in model prose must be a name the run CREDITED (the vendor's own
  names and the legal names of records tied to it). A sentence naming any
  other company is dropped; a surface with nothing left falls back to its
  template. Pure TS, no I/O, so the invariant is pinned in vitest.

  Two screens, both deterministic:
  1. DENY: every company name the run retrieved and did not credit (other
     registry matches, rejected names, uncredited recipients) is banned
     verbatim, compared loosely (letters and digits only).
  2. ALLOW: any span that ends in a corporate suffix, and any span the
     prose introduces as a legal name ("under the name X", "registered
     as X"), must normalize to a credited name.
  Plus, for the verdict summary only: a sentence that says a state was
  searched must name a state whose registry lane actually ran (R2-F56).
*/
import type { PitchExtract, RegistryCheck } from "./schemas.ts";
import { normalizeUnstripped } from "./registry/sam.ts";
import { STATE_NAMES, tieFactsForCheck } from "./identity-ties.ts";
import { splitNameCandidates } from "./text-match.ts";
import { looseText } from "./lint.ts";

export interface SynthesisGuard {
  /* normalizeUnstripped forms of every credited name. */
  allowedNames: Set<string>;
  /* looseText forms of every retrieved-but-not-credited company name. */
  deniedNames: string[];
  /* Full state names whose registry lane ran this run (hit or definitive
     miss), for the summary's search-claim screen. */
  ranStates: Set<string>;
}

/* Corporate suffixes that mark a legal-name span. Two-letter forms (CO,
   LC, LP, PC) are left out: "Denver, CO 80202" is an address, not a
   company. */
const SPAN_SUFFIXES = new Set([
  "INC",
  "INCORPORATED",
  "LLC",
  "LLP",
  "PLLC",
  "CORP",
  "CORPORATION",
  "COMPANY",
  "LTD",
  "LIMITED",
  "PBC",
]);

const MAX_SPAN_TOKENS = 7;
const MIN_DENIED_LOOSE = 6;

function stripEdgePunct(token: string): string {
  return token.replace(/^[("'\[]+/, "").replace(/[)."',;:\]]+$/, "");
}

function isCapToken(token: string): boolean {
  const t = stripEdgePunct(token);
  if (!t) return false;
  if (t === "&") return true;
  return /^[A-Z0-9]/.test(t);
}

/* Legal-name spans in a text: each run of capitalized tokens ending in a
   corporate suffix, as a list of suffix-anchored windows (longest first).
   "Texas records list IRONCLAD CONSTRUCTION GROUP LLC today" yields the
   windows "IRONCLAD CONSTRUCTION GROUP LLC", "CONSTRUCTION GROUP LLC",
   "GROUP LLC". */
export function legalNameSpans(text: string): string[][] {
  const tokens = text.split(/\s+/).filter(Boolean);
  const spans: string[][] = [];
  for (let i = 0; i < tokens.length; i++) {
    const raw = stripEdgePunct(tokens[i]);
    const bare = raw.toUpperCase();
    if (!SPAN_SUFFIXES.has(bare)) continue;
    /* Only a capitalized suffix marks a legal name ("Inc.", "LLC",
       "Company"); lowercase prose ("the company is registered") does not. */
    if (!/^[A-Z]/.test(raw)) continue;
    let start = i;
    while (start > 0 && i - start < MAX_SPAN_TOKENS && isCapToken(tokens[start - 1])) start--;
    if (start === i) continue;
    const windows: string[] = [];
    for (let k = start; k < i; k++) {
      windows.push(tokens.slice(k, i + 1).map(stripEdgePunct).join(" "));
    }
    spans.push(windows);
  }
  return spans;
}

const INTRO_PHRASES =
  /\b(?:under the (?:legal |registered )?name|legal name (?:is|of)|entity (?:named|called)|registered as|listed as|doing business as|d\/b\/a|known as)\s+((?:[A-Z&][\w&'.,-]*\s*){1,7})/g;

/* Names the prose introduces as a legal name, with their windows. */
export function introducedNameSpans(text: string): string[][] {
  const out: string[][] = [];
  for (const m of text.matchAll(INTRO_PHRASES)) {
    const raw = m[1].replace(/[\s,.;:]+$/, "");
    const tokens = raw.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    const windows: string[] = [];
    for (let end = tokens.length; end >= 1; end--) {
      windows.push(tokens.slice(0, end).map(stripEdgePunct).join(" "));
    }
    out.push(windows);
  }
  return out;
}

function matchesOf(data: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const v = data[key];
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}

function stringsOf(data: Record<string, unknown>, key: string): string[] {
  const v = data[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function buildSynthesisGuard(args: {
  checks: RegistryCheck[];
  extract: PitchExtract;
  vendorName: string;
  /* Code-authored green-flag facts: any legal-name span inside them is a
     credited name by construction (feed listings, the award recipient). */
  greenFlagFacts: { fact: string }[];
  ranStates: string[];
}): SynthesisGuard {
  const allowed = new Set<string>();
  const addAllowed = (name: string | null | undefined) => {
    if (!name) return;
    const n = normalizeUnstripped(name);
    if (n) allowed.add(n);
  };
  addAllowed(args.vendorName);
  for (const n of args.extract.vendor_name_candidates) addAllowed(n);
  const split = splitNameCandidates(args.extract.vendor_name_candidates);
  for (const n of [...split.identityNames, ...split.productNames]) addAllowed(n);
  for (const p of args.extract.people) addAllowed(p.name);
  for (const c of args.extract.named_customers) addAllowed(c);
  for (const check of args.checks) {
    if (check.attribution !== "attributed") continue;
    const facts = tieFactsForCheck(check);
    if (facts) addAllowed(facts.legal_name);
    const bridge = ((check.data ?? {}) as { name_bridge?: { discovered_name?: unknown } }).name_bridge;
    if (bridge && typeof bridge.discovered_name === "string") addAllowed(bridge.discovered_name);
  }
  for (const f of args.greenFlagFacts) {
    for (const windows of legalNameSpans(f.fact)) addAllowed(windows[0]);
  }

  /* Deny: every retrieved company name that is not credited. */
  const retrieved: string[] = [];
  for (const check of args.checks) {
    if (check.status !== "hit") continue;
    const data = (check.data ?? {}) as Record<string, unknown>;
    for (const m of matchesOf(data, "matches")) {
      const n = str(m["name"]) ?? str(m["provider"]) ?? str(m["supplier"]);
      if (n) retrieved.push(n);
    }
    for (const e of matchesOf(data, "filing_entities")) {
      const n = str(e["name"]);
      if (n) retrieved.push(n);
    }
    retrieved.push(...stringsOf(data, "rejected_investment_vehicles"));
    retrieved.push(...stringsOf(data, "rejected_product_only"));
    const recipient = str(data["recipient_name"]);
    if (recipient) retrieved.push(recipient);
    const sam = str(data["legal_business_name"]);
    if (sam) retrieved.push(sam);
  }
  const allowedLoose = [...allowed].map((a) => looseText(a));
  const vendorLoose = looseText(args.vendorName);
  const denied = new Set<string>();
  for (const name of retrieved) {
    if (allowed.has(normalizeUnstripped(name))) continue;
    const loose = looseText(name);
    if (loose.length < MIN_DENIED_LOOSE) continue;
    /* A denied name inside a credited name (or the vendor's own) would
       ban the credited name itself; drop it. */
    if (allowedLoose.some((a) => a.includes(loose)) || vendorLoose.includes(loose)) continue;
    denied.add(loose);
  }

  return {
    allowedNames: allowed,
    deniedNames: [...denied],
    ranStates: new Set(args.ranStates.map((s) => s.toUpperCase())),
  };
}

const SEARCH_VERBS = /\b(search|searched|check|checked|look|looked|quer|queried|registr|sweep|swept)/i;

export interface GuardViolation {
  kind: "denied_name" | "unallowed_legal_name" | "unallowed_introduced_name" | "unran_state";
  span: string;
}

/* Violations in ONE sentence. */
export function nameViolations(
  sentence: string,
  guard: SynthesisGuard,
  opts: { summary?: boolean } = {},
): GuardViolation[] {
  const out: GuardViolation[] = [];
  const loose = looseText(sentence);
  for (const d of guard.deniedNames) {
    if (loose.includes(d)) out.push({ kind: "denied_name", span: d });
  }
  for (const windows of legalNameSpans(sentence)) {
    if (!windows.some((w) => guard.allowedNames.has(normalizeUnstripped(w)))) {
      out.push({ kind: "unallowed_legal_name", span: windows[0] });
    }
  }
  for (const windows of introducedNameSpans(sentence)) {
    const ok = windows.some((w) => {
      const n = normalizeUnstripped(w);
      if (!n) return false;
      if (guard.allowedNames.has(n)) return true;
      /* A credited name that carries this window whole ("Acme" for
         "ACME GOV, INC.") is fine; a random capitalized word is not. */
      const wl = looseText(w);
      return wl.length >= 4 && [...guard.allowedNames].some((a) => looseText(a) === wl);
    });
    if (!ok) out.push({ kind: "unallowed_introduced_name", span: windows[0] });
  }
  if (opts.summary && SEARCH_VERBS.test(sentence)) {
    const upper = sentence.toUpperCase();
    for (const state of STATE_NAMES) {
      if (upper.includes(state) && !guard.ranStates.has(state)) {
        out.push({ kind: "unran_state", span: state });
      }
    }
  }
  return out;
}

/* Split prose into sentences on terminal punctuation. */
export function sentencesOf(text: string): string[] {
  return text
    .split(/(?<=[.!?]["')\]]?)\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/* Drop every sentence that names a company the run did not credit (or,
   in a summary, claims a search of a state whose lane did not run).
   Returns the surviving prose, or null when nothing survives so the
   caller falls back to its template. */
export function guardProse(
  text: string,
  guard: SynthesisGuard,
  opts: { summary?: boolean } = {},
): string | null {
  const kept = sentencesOf(text).filter((s) => nameViolations(s, guard, opts).length === 0);
  const out = kept.join(" ").trim();
  return out.length > 0 ? out : null;
}

/* True when the text has no violations at all (used to gate the review's
   replacement text, which is accepted whole or not at all). */
export function guardClean(text: string, guard: SynthesisGuard, opts: { summary?: boolean } = {}): boolean {
  return sentencesOf(text).every((s) => nameViolations(s, guard, opts).length === 0);
}
