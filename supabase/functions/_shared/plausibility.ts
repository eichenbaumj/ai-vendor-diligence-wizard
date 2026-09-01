/*
  Claim plausibility: "what this number implies" (methodology D6.1 rider).

  Most customer-impact numbers in vendor pitches are structurally
  unverifiable; the higher-value read for a procurement audience is the
  arithmetic — what would have to be true for "$17M annual savings" to
  hold. This module renders that arithmetic as a code-templated sentence on
  the claim's own D6 ledger row.

  Security posture (a new narrative surface is a new injection target):
  - Denominators are ATTACKER-AUTHORED. Every note quotes the basis span
    verbatim and attributes it ("the pitch's own figure"), so the reader
    always sees what the division rests on. A planted absurd denominator
    ("across our 2 million agents") flatters the headline number only by
    displaying itself.
  - The arithmetic never evaluates: only the division, stated as an
    implication. The adjective list (reasonable, inflated, ...) is banned
    on this surface by lintImplication, and the code falls back to the
    no-basis template on any violation.
  - Numbers are re-parsed from the VERBATIM quote and basis_quote in code;
    the extractor's structured amount/unit/period fields are hints only
    and never reach a rendered sentence.
  - Tier impact: none, ever. The note is narrative on an existing row; it
    never produces a finding, never feeds a trigger, never moves
    checks_met. Arithmetic can embarrass an honest vendor with a sloppy
    one-pager; the job is to arm the question, not to punish rounding.

  Pure module: no Deno APIs, no I/O, no model calls.
*/
import type { Claim } from "./schemas.ts";
import { lintImplication } from "./lint.ts";

export const NO_BASIS_IMPLICATION =
  "The pitch gives no basis to check this number against. The question pack asks for the deployment, measurement method, and period behind it.";

const QUESTION_POINTER =
  "The question pack asks which deployment produced this figure, how it was measured, and over what period.";

interface ParsedNumber {
  value: number;
  kind: "dollars" | "percent" | "count";
  raw: string;
}

const MAGNITUDE: Record<string, number> = {
  thousand: 1e3,
  k: 1e3,
  million: 1e6,
  m: 1e6,
  mm: 1e6,
  billion: 1e9,
  b: 1e9,
};

function magnitudeOf(word: string | undefined): number {
  if (!word) return 1;
  return MAGNITUDE[word.toLowerCase()] ?? 1;
}

function toNumber(digits: string): number | null {
  const n = Number(digits.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/* The leading quantitative signal of a claim quote: dollars first, then a
   percentage, then nothing (bare counts make no plausibility arithmetic on
   their own). */
export function parseLeadNumber(text: string): ParsedNumber | null {
  const dollars = text.match(
    /\$\s?([\d,]+(?:\.\d+)?)\s*(thousand|million|billion|k|mm?|b)?\b/i,
  );
  if (dollars) {
    const base = toNumber(dollars[1]);
    if (base !== null) {
      return {
        value: base * magnitudeOf(dollars[2]),
        kind: "dollars",
        raw: dollars[0].trim(),
      };
    }
  }
  const percent = text.match(/([\d,]+(?:\.\d+)?)\s*(?:%|percent\b)/i);
  if (percent) {
    const base = toNumber(percent[1]);
    if (base !== null && base > 0 && base <= 1000) {
      return { value: base, kind: "percent", raw: percent[0].trim() };
    }
  }
  return null;
}

interface ParsedDenominator {
  value: number;
  noun: string;
  raw: string;
}

/* A denominator the pitch itself offers: a count followed by a noun phrase
   ("about 500 agents", "40,000 permits a month"). The noun keeps up to
   three lowercase words so "permits a month" survives. */
export function parseDenominator(basis: string): ParsedDenominator | null {
  const m = basis.match(
    /([\d,]+(?:\.\d+)?)\s*(thousand|million|billion)?\s+([a-z][a-z-]*(?:\s+[a-z][a-z-]*){0,2})/i,
  );
  if (!m) return null;
  const base = toNumber(m[1]);
  if (base === null || base <= 0) return null;
  return {
    value: base * magnitudeOf(m[2]),
    noun: m[3].trim(),
    raw: m[0].trim(),
  };
}

/* Round to two significant figures and format with separators: 34285.7 ->
   "34,000". */
export function approx(value: number): string {
  if (value === 0) return "0";
  const digits = Math.floor(Math.log10(Math.abs(value)));
  const factor = 10 ** (digits - 1);
  const rounded = Math.round(value / factor) * factor;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function periodPhrase(quote: string): string {
  if (/\b(annual(?:ly)?|per year|a year|each year|yearly)\b/i.test(quote)) {
    return " per year";
  }
  if (/\b(monthly|per month|a month|each month)\b/i.test(quote)) {
    return " per month";
  }
  return "";
}

/* Singular unit label for the per-X phrase: "agents" -> "agent"; multiword
   nouns keep their tail ("permits a month" -> "permit a month" reads
   wrong, so multiword nouns render as "per 'noun'"). */
function perNoun(noun: string): string {
  const words = noun.split(/\s+/);
  if (words.length === 1) {
    return words[0].replace(/ies$/i, "y").replace(/s$/i, "");
  }
  return noun;
}

/* The implication sentence for one performance claim, or null when the
   quote carries no dollar or percent figure (nothing to unpack). Every
   emitted sentence passes the implication lint or collapses to the
   no-basis template; the no-basis template is itself the answer when the
   pitch offers no denominator. */
export function computeImplication(claim: Claim): string | null {
  const lead = parseLeadNumber(claim.quote);
  if (!lead) return null;
  const denom = claim.basis_quote ? parseDenominator(claim.basis_quote) : null;
  if (!denom) return NO_BASIS_IMPLICATION;

  /* The note renders the FULL verbatim basis span, not the parsed
     fragment: the reader must see exactly what the division rests on, and
     a hostile span that smuggles an adjective trips the self-guard below
     instead of being trimmed into acceptability. */
  const basisDisplay = (claim.basis_quote ?? denom.raw).slice(0, 120);
  let sentence: string;
  if (lead.kind === "dollars") {
    const per = lead.value / denom.value;
    sentence = `Taken with the pitch's own figure of "${basisDisplay}", ${lead.raw} works out to about $${approx(per)} per ${perNoun(denom.noun)}${periodPhrase(claim.quote)}. ${QUESTION_POINTER}`;
  } else {
    const share = (lead.value / 100) * denom.value;
    sentence = `${lead.raw} of the pitch's own "${basisDisplay}" is about ${approx(share)} ${denom.noun}. ${QUESTION_POINTER}`;
  }
  sentence = sentence.slice(0, 400);
  /* Self-guard: templates are adjective-free by construction, but quoted
     spans are attacker-authored; a violation collapses to the no-basis
     template rather than shipping the span. */
  if (lintImplication(sentence).some((v) => v.kind === "banned")) {
    return NO_BASIS_IMPLICATION;
  }
  return sentence;
}
