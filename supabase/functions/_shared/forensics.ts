/*
  Deterministic ingest forensics. Runs BEFORE any LLM sees the pitch.

  Three jobs:
  1. Strip and log invisible Unicode (tag characters, zero-width, bidi
     controls) — the classic carrier for hidden instructions (ADV-03).
  2. Detect instruction-like text addressed to AI evaluators (a deterministic
     pre-screen; the S1 model screen can ADD findings but never remove these)
     (ADV-02 candidates).
  3. Scrub obvious personal-data patterns (SSN-shaped strings) as a backstop —
     pitches are vendor marketing, not case files, but users may paste
     surrounding email context.

  Findings emitted here are un-suppressible: no downstream stage can clear
  them, and any ADV finding imposes a verdict-tier ceiling in tier.ts.
*/
import type { AdvFinding } from "./schemas.ts";

export interface ForensicsResult {
  normalized: string;
  adv_findings: AdvFinding[];
  pii_scrubbed: number; // count of scrubbed patterns
  invisible_stripped: number;
}

/* Invisible / control characters commonly used to smuggle instructions.
   - U+E0000–U+E007F: Unicode tag characters
   - U+200B–U+200F: zero-width space/joiner/non-joiner, LRM/RLM
   - U+202A–U+202E: bidi embedding controls
   - U+2060–U+2064: word joiner & invisible operators
   - U+FEFF: BOM / zero-width no-break space
*/
const INVISIBLE_RE =
  /[\u{E0000}-\u{E007F}\u{200B}-\u{200F}\u{202A}-\u{202E}\u{2060}-\u{2064}\u{FEFF}]/gu;

/* PAYLOAD classes cap on a single character: tag characters exist only to
   smuggle data, and bidi embedding controls rewrite what a human reads.
   Everything else in INVISIBLE_RE is ubiquitous in ordinary web text and
   copy-paste (zero-width spaces and joiners, LRM/RLM in right-to-left
   copy, BOMs), so those cap only at volume: a contiguous run of
   ADV03_RUN_THRESHOLD or a total of ADV03_TOTAL_THRESHOLD — one stray
   zero-width character capped a real page's verdict live (2026-08-31).
   Below threshold they are stripped silently; invisible_stripped records
   the count either way. */
const INVISIBLE_PAYLOAD_RE = /[\u{E0000}-\u{E007F}\u{202A}-\u{202E}]/u;
const INVISIBLE_RUN_RE =
  /[\u{E0000}-\u{E007F}\u{200B}-\u{200F}\u{202A}-\u{202E}\u{2060}-\u{2064}\u{FEFF}]+/gu;
export const ADV03_RUN_THRESHOLD = 8;
export const ADV03_TOTAL_THRESHOLD = 20;

/* Deterministic "addressed to AI" phrases. Case-insensitive, whitespace-
   tolerant. Deliberately narrow: these phrases have no legitimate reason to
   appear in a vendor pitch. */
const AI_ADDRESSED_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts)/i,
  /\bnote\s+to\s+(the\s+)?ai\b/i,
  /\b(dear|attention|hello)[,:\s]+(ai|llm|language\s+model|evaluat(or|ion)\s+system)\b/i,
  /\bif\s+you\s+are\s+an?\s+(ai|llm|language\s+model|automated\s+(system|evaluator))\b/i,
  /\byou\s+(must|should)\s+(rate|score|rank|classify|evaluate)\s+this\s+(vendor|company|pitch)\s+(as|positively|favorably)/i,
  /\bsystem\s*prompt\b/i,
  /\bgive\s+(a\s+)?positive\s+(review|evaluation|assessment)\s+only\b/i,
  /\bthis\s+(vendor|company)\s+(is|has\s+been)\s+(pre[- ]?approved|verified|vetted)\s+by\s+(the\s+)?(system|evaluator|administrator)/i,
];

/* SSN-shaped strings (loose): 3-2-4 digit groups with separators, or the
   labeled form. Deliberately does NOT match bare 9-digit numbers (too many
   false positives: UEIs, EINs are business identifiers we need). */
const SSN_RE = /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b|\bSSN[:\s#]*\d{9}\b/gi;

export function runForensics(raw: string): ForensicsResult {
  const adv: AdvFinding[] = [];

  /* 1. Invisible Unicode: strip always; find only on a meaningful signal
     (a payload-class character, a long contiguous run, or sheer volume). */
  const invisibleMatches = raw.match(INVISIBLE_RE) ?? [];
  let normalized = raw.replace(INVISIBLE_RE, "");
  if (invisibleMatches.length > 0) {
    const payload = invisibleMatches.some((ch) => INVISIBLE_PAYLOAD_RE.test(ch));
    const longestRun = (raw.match(INVISIBLE_RUN_RE) ?? []).reduce(
      (n, run) => Math.max(n, [...run].length),
      0,
    );
    if (
      payload ||
      longestRun >= ADV03_RUN_THRESHOLD ||
      invisibleMatches.length >= ADV03_TOTAL_THRESHOLD
    ) {
      adv.push({
        code: "ADV-03",
        detail: payload
          ? `The submitted text contained invisible Unicode characters of a kind that exists to carry hidden data (tag or direction-control characters). They carry no visible content and were removed before analysis. Hidden characters are a known channel for concealed instructions to automated systems.`
          : `The submitted text contained ${invisibleMatches.length} invisible Unicode characters (zero-width or joiner characters), far more than ordinary copying and pasting produces. They were removed before analysis. Hidden characters are a known channel for concealed instructions to automated systems.`,
      });
    }
  }

  /* 2. Instruction-like language addressed to AI systems. */
  const hits: string[] = [];
  for (const re of AI_ADDRESSED_PATTERNS) {
    const m = normalized.match(re);
    if (m && m[0]) hits.push(m[0].slice(0, 120));
  }
  if (hits.length > 0) {
    adv.push({
      code: "ADV-02",
      detail: `The submitted material contains text that appears to be addressed to automated evaluation systems rather than to a human reader (for example: "${hits[0]}"). The analysis treats all submitted text as data, and surfaces this as a finding.`,
    });
  }

  /* 3. PII scrub backstop. */
  const piiMatches = normalized.match(SSN_RE) ?? [];
  if (piiMatches.length > 0) {
    normalized = normalized.replace(SSN_RE, "[removed: possible SSN]");
  }

  return {
    normalized,
    adv_findings: adv,
    pii_scrubbed: piiMatches.length,
    invisible_stripped: invisibleMatches.length,
  };
}

/*
  HTML-specific forensics for URL-submitted pitches: detects content hidden
  from human readers but visible to machines. Works on raw HTML before text
  extraction; returns ADV-01 when hidden blocks contain substantive text,
  quoting the hidden span (the methodology promises the finding quotes what
  was hidden), and hands back every captured span so the caller can store
  the evidence.
*/
const HIDDEN_HTML_PATTERNS: RegExp[] = [
  /style\s*=\s*["'][^"']*display\s*:\s*none[^"']*["'][^>]*>(?<hidden>[^<]{40,})/gi,
  /style\s*=\s*["'][^"']*visibility\s*:\s*hidden[^"']*["'][^>]*>(?<hidden>[^<]{40,})/gi,
  /style\s*=\s*["'][^"']*font-size\s*:\s*0[^"']*["'][^>]*>(?<hidden>[^<]{40,})/gi,
  /style\s*=\s*["'][^"']*color\s*:\s*(?:#fff(?:fff)?|white)[^"']*["'][^>]*>(?<hidden>[^<]{40,})/gi,
  /<!--(?<hidden>[^>]{80,})-->/g,
];

export interface HiddenHtmlResult {
  finding: AdvFinding | null;
  spans: string[];
}

/* Remove hidden-text regions from raw HTML entirely, using the SAME
   patterns detectHiddenHtml matches on. Used for auto-fetched vendor-site
   pages: hidden text must never reach the extractor, but no ADV finding is
   emitted for it there (display:none navigation is near-universal on real
   marketing sites, and the ADV ceiling would cap legitimate vendors —
   ADV-01 stays scoped to pages the USER submitted). */
export function stripHiddenHtml(html: string): {
  html: string;
  spanCount: number;
  spans: string[];
} {
  const { spans } = detectHiddenHtml(html);
  let out = html;
  for (const re of HIDDEN_HTML_PATTERNS) {
    re.lastIndex = 0;
    out = out.replace(re, " ");
  }
  return { html: out, spanCount: spans.length, spans };
}

export function detectHiddenHtml(html: string): HiddenHtmlResult {
  const spans: string[] = [];
  for (const re of HIDDEN_HTML_PATTERNS) {
    re.lastIndex = 0;
    for (const m of html.matchAll(re)) {
      const span = (m.groups?.hidden ?? "")
        .replace(INVISIBLE_RE, "")
        .replace(/\s+/g, " ")
        .trim();
      if (span) spans.push(span);
    }
  }
  if (spans.length === 0) return { finding: null, spans };
  const quoted = spans[0].slice(0, 180);
  return {
    finding: {
      code: "ADV-01",
      detail:
        `The submitted page contains text that is hidden from human readers (invisible styling or oversized comments). The first hidden passage reads: "${quoted}". Hidden text is a known channel for content aimed at automated systems, and its presence is surfaced as a finding.`.slice(
          0,
          500,
        ),
    },
    spans,
  };
}
