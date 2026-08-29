/*
  Deterministic text matching shared by report assembly, person
  corroboration, and domain inference. Pure TS, no I/O.

  Verification is grounded in retrieved content. contentMentions matches a
  subject against what the search tool actually captured from a page (title
  and quoted passage) — narrative-harvested links carry neither and can
  never match. urlMentions matches against the URL string alone: enough to
  surface a lead for manual confirmation, never enough to verify, because
  nothing was fetched for a URL the research model merely wrote down.
  hostCovers ties a citation to a subject when the page lives on the
  subject's own site.
*/
import type { Citation } from "./schemas.ts";

export const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(inc|llc|corp|co|ltd|pbc|company|corporation)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

export function tokensOf(s: string): string[] {
  return norm(s)
    .split(" ")
    .filter((t) => t.length > 2);
}

/* A haystack "covers" a subject when it contains a majority of the
   subject's tokens. Deterministic and conservative. */
export function tokenMajority(hay: string, subject: string): boolean {
  const toks = tokensOf(subject);
  if (toks.length === 0) return false;
  const hits = toks.filter((t) => hay.includes(t)).length;
  return hits >= Math.max(1, Math.ceil(toks.length * 0.6));
}

export function contentMentions(c: Citation, subject: string): boolean {
  if (c.title === null && c.cited_text === null) return false;
  return tokenMajority(norm(`${c.title ?? ""} ${c.cited_text ?? ""}`), subject);
}

export function urlMentions(url: string, subject: string): boolean {
  return tokenMajority(norm(url), subject);
}

export function hostCovers(url: string, subject: string): boolean {
  try {
    return tokenMajority(norm(new URL(url).hostname), subject);
  } catch {
    return false;
  }
}

/* ------------------------------------------------ candidate name splitting */

/* Compound vendor names hide the registered company from every registry
   query: "TrueTax by Govra" can never full-text-match "GOVRA, INC.".
   splitNameCandidates derives extra candidates under a deliberately narrow
   grammar:
   - "X by Y": Y is the company (identity candidate), X is the product.
   - "X (Y)":  Y is an alternate company name (identity candidate).
   Guards: both sides must look like proper names (a capital letter, no
   digits, at least one real token) and Y must not start with a stopword
   ("formerly", "a Delaware corporation"...). The verbatim originals always
   stay first — candidates[0] is the display name and the cache key.
   productNames never join identity queries; anchorNames (Y-parts plus
   unsplit originals) define which tokens can anchor a registry match. */
const SPLIT_STOP = new Set(["formerly", "a", "an", "the", "dba", "aka", "now"]);

function properName(s: string): boolean {
  const t = s.trim();
  return /[A-Z]/.test(t) && !/\d/.test(t) && tokensOf(t).length >= 1;
}

export interface SplitCandidates {
  /* Verbatim originals first, then company parts. Feed to identity lanes. */
  identityNames: string[];
  /* Product parts (the X of "X by Y"). Product/feed matching only. */
  productNames: string[];
  /* Names whose tokens may anchor a registry match: Y-parts + originals
     that produced no split. */
  anchorNames: string[];
}

export function splitNameCandidates(candidates: string[]): SplitCandidates {
  const identity: string[] = [...candidates];
  const product: string[] = [];
  const anchors: string[] = [];
  for (const c of candidates) {
    const by = c.match(/^(.{2,}?)\s+by\s+(.{2,})$/i);
    const paren = by ? null : c.match(/^(.{2,}?)\s*\(([^)]{2,})\)\s*$/);
    const m = by ?? paren;
    if (m && properName(m[1]) && properName(m[2])) {
      const yFirst = norm(m[2]).split(" ")[0] ?? "";
      if (!SPLIT_STOP.has(yFirst)) {
        identity.push(m[2].trim());
        product.push(m[1].trim());
        anchors.push(m[2].trim());
        continue;
      }
    }
    anchors.push(c);
  }
  /* Originals pass through untouched (the lanes dedupe for themselves);
     only APPENDED parts are deduped against what is already present. */
  const appendUnique = (base: string[], extras: string[], cap: number) => {
    const seen = new Set(base.map((x) => norm(x)));
    const out = [...base];
    for (const x of extras) {
      const k = norm(x);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(x);
    }
    return out.slice(0, cap);
  };
  const originals = [...candidates];
  const yParts = identity.slice(candidates.length);
  const unsplitOriginals = anchors.filter((a) => candidates.includes(a));
  /* Cap at 6: S1 provides at most 5 candidates and the SOS lanes run two
     serial fetches per name inside a 12s budget — early exact-match breaks
     keep the common case far below the cap. */
  return {
    identityNames: appendUnique(originals, yParts, 6),
    productNames: appendUnique([], product, 3),
    anchorNames: appendUnique(unsplitOriginals, yParts, 5),
  };
}

/* A named customer must look like a proper organization name, not a count
   or a description ("1,600 governments", "more than 50 municipalities").
   Counts carry digits; descriptions carry no capitalized word or are a
   bare generic noun. A dropped entry gets no ledger row and no finding:
   scale claims are not customer claims. */
const GENERIC_CUSTOMER =
  /^(?:local |state |federal |municipal |public |government )*(?:governments?|municipalities|cities|counties|agencies|districts|customers|clients|organizations|localities|users)$/;

export function isNamedOrganization(s: string): boolean {
  const t = s.trim();
  if (t.length < 2) return false;
  if (/\d/.test(t)) return false;
  if (!/[A-Z]/.test(t)) return false;
  if (GENERIC_CUSTOMER.test(norm(t))) return false;
  return true;
}
