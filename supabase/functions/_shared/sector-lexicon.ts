/*
  Code-side sector classification fallback. The S4 model call is the primary
  classifier; when it fails or returns nothing, matching each pack's
  signal_lexicon against the pitch's use-case description and claim quotes
  keeps sector tailoring alive instead of silently disappearing.

  Safety-net rule: lexicon results can only ADD scrutiny. The eligibility
  check runs on every report regardless of what S4 said — a hit can set
  elevated=true, never clear it.
*/
import type { SectorPack } from "./packs-types.ts";

const ELIGIBILITY_PACK = "eligibility-case-mgmt";
/* Distinct term hits required before a lexicon match counts. One term is
   noise ("analytics" appears everywhere); two independent domain terms is
   a real signal. */
const MIN_HITS = 2;

function normalize(text: string): string {
  return ` ${text.toLowerCase().replace(/\s+/g, " ")} `;
}

function countHits(lexicon: string[] | undefined, corpus: string): number {
  if (!lexicon) return 0;
  let hits = 0;
  for (const term of lexicon) {
    const t = term.toLowerCase().trim();
    if (t && corpus.includes(t)) hits += 1;
  }
  return hits;
}

export function buildLexiconCorpus(
  useCaseDescription: string,
  claimQuotes: string[],
): string {
  return normalize([useCaseDescription, ...claimQuotes].join(" "));
}

/* Ordered pack ids (strongest match first, max 3) with >= MIN_HITS distinct
   lexicon terms present. Deterministic: ties break on pack id. */
export function lexiconFallbackPackIds(
  packs: Record<string, SectorPack>,
  corpus: string,
): string[] {
  return Object.values(packs)
    .map((p) => ({ id: p.pack_id, hits: countHits(p.signal_lexicon, corpus) }))
    .filter((x) => x.hits >= MIN_HITS)
    .sort((a, b) => b.hits - a.hits || a.id.localeCompare(b.id))
    .slice(0, 3)
    .map((x) => x.id);
}

export function eligibilityLexiconHit(
  packs: Record<string, SectorPack>,
  corpus: string,
): boolean {
  const pack = packs[ELIGIBILITY_PACK];
  if (!pack) return false;
  return countHits(pack.signal_lexicon, corpus) >= MIN_HITS;
}
