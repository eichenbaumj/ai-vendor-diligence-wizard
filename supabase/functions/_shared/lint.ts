/*
  Legal-safe language lint (methodology.md §5, Rule 2).

  Every piece of generated narrative passes through this before publication.
  The banned list covers vocabulary that converts protected opinion into
  actionable assertion when aimed at a named company or person (Budget Van
  Lines: "grossly misleading" from a self-styled expert evaluator was held
  actionable as fact). On violation the pipeline regenerates once, then falls
  back to neutral templates — it never ships a violation.

  Also enforced here: no em dashes in user-facing generated prose (17A house
  style) and no AI-tell vocabulary.
*/

const BANNED_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bscam(s|my|mer|mers)?\b/i, label: "scam" },
  { pattern: /\bfraud(ulent|ster|sters)?\b/i, label: "fraud" },
  { pattern: /\bfake(s|d|ry)?\b/i, label: "fake" },
  { pattern: /\bsham\b/i, label: "sham" },
  { pattern: /\bshell\s+compan(y|ies)\b/i, label: "shell company" },
  { pattern: /\bl(ying|iar|ies)\b/i, label: "lying/liar" },
  { pattern: /\bdeceptive\b/i, label: "deceptive" },
  { pattern: /\bdecei(t|ve|ving)\b/i, label: "deceit" },
  { pattern: /\bmisleading\b/i, label: "misleading" },
  { pattern: /\bpredatory\b/i, label: "predatory" },
  { pattern: /\bvaporware\b/i, label: "vaporware" },
  { pattern: /\bsnake\s*oil\b/i, label: "snake oil" },
  { pattern: /\bgrift(er|ers|ing)?\b/i, label: "grift" },
  { pattern: /\billegitimate\b/i, label: "illegitimate" },
  { pattern: /\bbogus\b/i, label: "bogus" },
  { pattern: /\bcon\s+artist(s)?\b/i, label: "con artist" },
  { pattern: /\bcriminal(s|ly)?\b/i, label: "criminal" },
  { pattern: /\bdishonest(y|ly)?\b/i, label: "dishonest" },
  { pattern: /\buntrustworthy\b/i, label: "untrustworthy" },
  { pattern: /\bhigh[- ]risk\s+vendor\b/i, label: "high-risk vendor (use disclosed criteria instead)" },
];

/* Language the tool must not use about ITSELF (over-description exposure) or
   that reads as AI-generated filler. */
const STYLE_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bcomprehensive\b/i, label: "comprehensive (overdescribes the tool)" },
  { pattern: /\bunbiased\b/i, label: "unbiased (overdescribes the tool)" },
  { pattern: /\bguarantee(s|d)?\b/i, label: "guarantee" },
  { pattern: /\bleverag(e|es|ed|ing)\b/i, label: "leverage (AI tell)" },
  { pattern: /\brobust\b/i, label: "robust (AI tell)" },
  { pattern: /\bseamless(ly)?\b/i, label: "seamless (AI tell)" },
  { pattern: /\bholistic\b/i, label: "holistic (AI tell)" },
  { pattern: /\bdelv(e|es|ed|ing)\b/i, label: "delve (AI tell)" },
  { pattern: /\bnot just\b.{0,40}\bbut\b/i, label: "'not just X but Y' (AI tell)" },
  { pattern: /—/, label: "em dash (house style: rewrite the sentence)" },
];

export interface LintViolation {
  label: string;
  excerpt: string;
  kind: "banned" | "style";
}

export function lintText(text: string): LintViolation[] {
  const violations: LintViolation[] = [];
  for (const { pattern, label } of BANNED_PATTERNS) {
    const m = text.match(pattern);
    if (m) {
      violations.push({
        label,
        excerpt: excerptAround(text, m.index ?? 0),
        kind: "banned",
      });
    }
  }
  for (const { pattern, label } of STYLE_PATTERNS) {
    const m = text.match(pattern);
    if (m) {
      violations.push({
        label,
        excerpt: excerptAround(text, m.index ?? 0),
        kind: "style",
      });
    }
  }
  return violations;
}

/* Lint every user-facing string field of an object tree. Returns violations
   with a JSON-path-ish location for debugging. */
export function lintObject(
  obj: unknown,
  path = "$",
): (LintViolation & { path: string })[] {
  const out: (LintViolation & { path: string })[] = [];
  if (typeof obj === "string") {
    for (const v of lintText(obj)) out.push({ ...v, path });
  } else if (Array.isArray(obj)) {
    obj.forEach((item, i) => out.push(...lintObject(item, `${path}[${i}]`)));
  } else if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      /* URLs and ids are not prose. */
      if (k === "url" || k === "evidence_url" || k === "link" || k === "id") continue;
      out.push(...lintObject(v, `${path}.${k}`));
    }
  }
  return out;
}

function excerptAround(text: string, index: number): string {
  const start = Math.max(0, index - 40);
  return text.slice(start, index + 60).replace(/\s+/g, " ").trim();
}

/* ------------------------------------------------------ prose hygiene */

/* House style forbids em dashes in client-facing prose. Model output is
   asked not to use them, but enforcement is deterministic: rewrite them as
   comma joins on the way out. */
export function stripEmDashes(s: string): string {
  return s
    .replace(/\s*—\s*/g, ", ")
    .replace(/,\s*,/g, ", ")
    .replace(/\s+,/g, ",");
}

/* Cap model prose without ever shipping a sentence cut off mid-thought:
   schema maxLength constraints make constrained decoding stop at the cap,
   so a hard slice ends reports with fragments like "...and the basis". Trim
   to the cap, then back to the last complete sentence when the text does
   not end on terminal punctuation. */
export function tidyProse(s: string, max: number): string {
  let out = stripEmDashes(s).trim();
  if (out.length > max) out = out.slice(0, max);
  if (!/[.!?]["')\]]?$/.test(out)) {
    let cut = -1;
    for (const m of out.matchAll(/[.!?]["')\]]?(?=\s|$)/g)) {
      cut = m.index + m[0].length;
    }
    /* Any complete sentence beats a fragment; leave untouched only when
       there is no sentence boundary to trim to. */
    if (cut > 0) out = out.slice(0, cut);
  }
  return out.trim();
}

/* Loose textual containment for verbatim guards: compares letters and
   digits only, so punctuation and whitespace drift do not matter but a
   misremembered name ("Sarasun" for "Sarasota") fails. */
export function looseText(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}
