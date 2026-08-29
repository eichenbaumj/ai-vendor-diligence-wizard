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
