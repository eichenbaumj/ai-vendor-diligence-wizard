/*
  Name-only domain inference. Pure TS, no I/O.

  When the user submits only a vendor name, none of the domain-hygiene
  checks can run (RDAP age, mail configuration, web history, subdomains,
  GitHub org). After research, the citations often reveal the vendor's
  website. This module nominates one, under rules a vendor cannot game
  from narrative text alone:
  - Only Channel-A citations count (title or cited_text present, meaning
    the search tool actually retrieved the page). Narrative-harvested
    URLs never nominate.
  - Only class 3 hosts qualify (vendor-controlled or unknown): official
    and press sites are never "the vendor's website".
  - The registrable domain must cover the vendor's name tokens.
  - At least two distinct citation URLs must live on the domain.
  - The most-cited domain wins; a lexicographic tie-break keeps the
    result deterministic.

  The inferred domain feeds hygiene checks only. It NEVER counts toward
  identity resolution (the two-identifier bar): identity stays as computed
  before research, and the caller must not recompute it.
*/
import type { Citation } from "./schemas.ts";
import { norm, tokenMajority } from "./text-match.ts";

/* Common second-level registries under two-letter country TLDs (co.uk,
   com.au). Not a full public-suffix list; enough for vendor domains. */
const SECOND_LEVEL = new Set(["co", "com", "org", "net", "gov", "ac", "edu"]);

export function registrableDomain(hostname: string): string {
  const labels = hostname.toLowerCase().split(".").filter(Boolean);
  if (labels.length <= 2) return labels.join(".");
  const tld = labels[labels.length - 1];
  const second = labels[labels.length - 2];
  const take = tld.length === 2 && SECOND_LEVEL.has(second) ? 3 : 2;
  return labels.slice(-take).join(".");
}

export function inferPrimaryDomain(
  citations: Citation[],
  vendorNames: string[],
  /* Minimum distinct citation URLs required on the winning domain. The
     default (2) is for RESEARCH citations, which are downstream of
     attacker-influencable text. The two-search DISCOVERY step passes 1:
     its citations come only from a name search, and the pick is validated
     afterwards by fetching the site and requiring its own extracted name
     to match before anything can count toward identity. */
  minUrls = 2,
): string | null {
  const names = vendorNames.filter((n) => n.trim().length > 0);
  if (names.length === 0) return null;

  const urlsByDomain = new Map<string, Set<string>>();
  for (const c of citations) {
    if (c.title === null && c.cited_text === null) continue; // Channel B
    if (c.domain_class !== 3) continue;
    let host: string;
    try {
      host = new URL(c.url).hostname;
    } catch {
      continue;
    }
    const domain = registrableDomain(host);
    if (!domain.includes(".")) continue;
    if (!names.some((n) => tokenMajority(norm(domain), n))) continue;
    const set = urlsByDomain.get(domain) ?? new Set<string>();
    set.add(c.url);
    urlsByDomain.set(domain, set);
  }

  let best: string | null = null;
  let bestCount = 0;
  for (const [domain, urls] of urlsByDomain) {
    if (urls.size < minUrls) continue;
    if (
      urls.size > bestCount ||
      (urls.size === bestCount && best !== null && domain < best)
    ) {
      best = domain;
      bestCount = urls.size;
    }
  }
  return best;
}
