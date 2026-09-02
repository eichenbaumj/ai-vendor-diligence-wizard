/*
  Deterministic "does the pitch claim this authorization as a CURRENT status"
  logic. Pure TS, no I/O.

  The registry-contradiction checks (FedRAMP, GovRAMP, TX-RAMP, Sourcewell)
  must arm only on an affirmative claim of the program's own designation:
  - "FedRAMP Authorized" absent from the feed is the Critical contradiction;
    "FedRAMP compliant" is vague vocabulary and takes the Medium path in
    assembly instead (methodology D3.1 draws exactly this line).
  - "Pursuing certification" / "pending approval" is a legitimate state
    (methodology section 6) and must never arm — that path ends in a
    CRITICAL contradiction, so under-arming is the safe direction.

  The rule, applied across all claim quotes:

    armed = (some quote names the program with its designation wording)
            AND NOT (some quote names the program with pending wording)

  The cross-quote negation matters because extractors sometimes split a
  qualifying footnote ("*Pending Approval Q2 2026") into its own claim.
*/

export interface ProgramPattern {
  name: RegExp;
  affirm: RegExp;
}

export const PENDING_RE =
  /\b(pending|in[- ]?process|in[- ]?progress|pursuing|seeking|apply\w*|working toward|under (review|way|assessment)|anticipat\w*|expect\w*|planned|roadmap|upcoming|will (be|become)|not yet)\b/i;

/* Designation wording per program — the words the program itself uses for a
   holder's status, not adjacent marketing vocabulary. */
export const PROGRAMS: Record<string, ProgramPattern> = {
  fedramp: {
    name: /fedramp/i,
    affirm: /\bauthoriz\w*\b/i,
  },
  govramp: {
    name: /govramp|stateramp/i,
    affirm: /\b(authoriz\w*|ready|certif\w*|listed|core|snapshot)\b/i,
  },
  txramp: {
    name: /tx-?ramp/i,
    affirm: /\b(certif\w*|provisional|level\s*(1|2|one|two))\b/i,
  },
  sourcewell: {
    name: /sourcewell|naspo|omnia|cooperative (purchasing|contract)/i,
    affirm: /\b(contracts?|awarded|holder|holds?|hold)\b/i,
  },
};

export function affirmsProgram(
  claims: { quote: string }[],
  program: ProgramPattern,
): boolean {
  const about = claims.filter((c) => program.name.test(c.quote));
  if (about.length === 0) return false;
  if (about.some((c) => PENDING_RE.test(c.quote))) return false;
  return about.some((c) => program.affirm.test(c.quote));
}

/* Sentences of a pitch, whitespace-collapsed, split on terminal
   punctuation and on bullet starts. Verbatim spans of the source text
   after whitespace normalization, so a synthesized quote passes the
   caller's loose verbatim guard. */
export function pitchSentences(pitchText: string): string[] {
  return pitchText
    .replace(/\r/g, "")
    .split(/\n\s*\n|\n\s*[-*•]\s+|(?<=[.!?])\s+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 8);
}

export interface BackstopClaim {
  id: string;
  type: "compliance";
  quote: string;
  subject: string | null;
}

/* Code-side backstop for the program claims that drive registry
   contradictions (methodology 1.7). The pitch reader omits a claim about
   one run in several even at temperature 0 (the qa-pdf twins since 1.3;
   a pasted control on 2026-09-01 lost its Sourcewell line and fell from
   tier 1 to tier 0). When the extracted claims do not affirm a program
   but a sentence of the pitch itself does, under exactly the rules
   affirmsProgram applies (designation wording present, pending wording
   absent), that sentence becomes a compliance claim quoted verbatim.
   Under-arming stays the safe direction: a pending sentence anywhere in
   the pitch about the program blocks the backstop for that program. */
export function programClaimBackstop(
  pitchText: string,
  claims: { quote: string }[],
): BackstopClaim[] {
  const sentences = pitchSentences(pitchText);
  const out: BackstopClaim[] = [];
  for (const [key, program] of Object.entries(PROGRAMS)) {
    if (affirmsProgram(claims, program)) continue;
    const about = sentences.filter((s) => program.name.test(s));
    if (about.length === 0) continue;
    if (about.some((s) => PENDING_RE.test(s))) continue;
    const hit = about.find((s) => program.affirm.test(s));
    if (!hit) continue;
    out.push({
      id: `clm-program-${key}`,
      type: "compliance",
      quote: hit.slice(0, 400),
      subject: null,
    });
  }
  return out;
}
