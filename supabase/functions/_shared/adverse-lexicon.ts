/*
  Dispute words in retrieved headlines, for ordering the leads list.

  Two audited reports retrieved independent news about a canceled contract
  and a lawsuit and then let the vendor's own pages take every lead slot
  (leads sorted by source class, then by URL string; gauntlet round 2,
  2026-09-01). This module is the whole of the fix's judgment: a fixed word
  list, matched by code against the retrieved TITLE only, never against
  the quoted passage and never against the pitch. The result is a boolean.
  The matched word is never echoed anywhere: the report carries a keyword
  flag, and the reader-facing label is a fixed sentence in the frontend.

  Never tier-bearing. Anyone can publish a headline, and ADV-04's rule
  (tier.ts) already says third parties never hold a lever over a verdict.
  A hit orders a lead and marks it; it is not a finding and it has no
  severity. Pure TS, no I/O.
*/
import { norm } from "./text-match.ts";

/* Whole words over norm(title): lowercased, punctuation to spaces. Words
   that also carry ordinary meanings (fine, complaint, recall, audit) are
   left out on purpose; "fined" and "penalty" stay. "fraud" and "criminal"
   are matched here but never printed: lint bans them in report prose. */
const ADVERSE_HEADLINE_WORDS = [
  "lawsuit",
  "lawsuits",
  "sues",
  "sued",
  "suing",
  "settlement",
  "settlements",
  "settles",
  "settled",
  "breach",
  "breaches",
  "breached",
  "terminated",
  "termination",
  "canceled",
  "cancelled",
  "cancellation",
  "scrapped",
  "investigation",
  "investigates",
  "investigated",
  "subpoena",
  "subpoenaed",
  "fined",
  "penalty",
  "penalties",
  "debarred",
  "debarment",
  "suspended",
  "suspension",
  "indicted",
  "indictment",
  "fraud",
  "criminal",
  "ransomware",
  "hacked",
  "court",
] as const;

const ADVERSE_HEADLINE_RE = new RegExp(
  `\\b(?:${ADVERSE_HEADLINE_WORDS.join("|")})\\b`,
);

/* Also matched as a two-word phrase after normalization. */
const ADVERSE_PHRASES = ["class action"] as const;

/** True when a retrieved headline contains a dispute word. Null-safe. */
export function adverseHeadlineHit(title: string | null | undefined): boolean {
  if (!title) return false;
  const t = norm(title);
  if (!t) return false;
  if (ADVERSE_HEADLINE_RE.test(t)) return true;
  return ADVERSE_PHRASES.some((p) => t.includes(p));
}

/** Exported for the sync test that holds the methodology's examples to the list. */
export const ADVERSE_HEADLINE_LEXICON: readonly string[] = [
  ...ADVERSE_HEADLINE_WORDS,
  ...ADVERSE_PHRASES,
];
