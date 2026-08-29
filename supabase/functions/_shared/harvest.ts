/*
  Citation harvest: merges the two channels research sources arrive on into
  typed Citations. Channel A is the API citation objects captured on streamed
  text blocks (title and cited_text were retrieved by the search tool).
  Channel B is the inline URLs the research prompt instructs the model to
  write in its narrative — URL only, nothing was retrieved for these, so
  title and cited_text stay null and downstream code must treat them as
  unfetched leads, never as retrieved content.

  Pure platform-agnostic TS so the merge rules stay unit-testable:
  exact-URL dedupe across both channels (Channel A wins on collision),
  trailing sentence punctuation stripped from narrative URLs, the schema's
  600-character URL cap applied, and every citation classified in code by
  domain-classes.ts — a vendor cannot promote its own links.
*/
import type { Citation } from "./schemas.ts";
import { classifyDomain } from "./domain-classes.ts";

export interface ApiCitation {
  url: string;
  title: string | null;
  cited_text: string | null;
}

/* The cap bounds only narrative harvesting: Channel A citations always pass
   through (the research tool caps its own volume), while narrative URLs stop
   once the combined list reaches `cap`. */
export function harvestCitations(
  research: { citations: ApiCitation[]; narrative: string },
  vendorDomains: string[],
  retrievedAt: string,
  cap = 40,
): Citation[] {
  const seenUrls = new Set<string>();
  const citations: Citation[] = [];
  for (const c of research.citations) {
    if (seenUrls.has(c.url)) continue;
    seenUrls.add(c.url);
    /* Clamp API-supplied fields to the Citation schema caps here at the
       origin: these objects flow into ledger row sources and the report's
       source list, and an over-long search-result title or tracking-heavy
       URL would fail the final Report schema parse. */
    citations.push({
      url: c.url.slice(0, 600),
      title: c.title ? c.title.slice(0, 300) : null,
      cited_text: c.cited_text ? c.cited_text.slice(0, 400) : null,
      retrieved_at: retrievedAt,
      domain_class: classifyDomain(c.url, vendorDomains),
    });
  }
  for (const m of research.narrative.matchAll(/https?:\/\/[^\s)\]"'<>]+/g)) {
    const url = m[0].replace(/[.,;:]+$/, "").slice(0, 600);
    if (seenUrls.has(url) || citations.length >= cap) continue;
    seenUrls.add(url);
    citations.push({
      url,
      title: null,
      cited_text: null,
      retrieved_at: retrievedAt,
      domain_class: classifyDomain(url, vendorDomains),
    });
  }
  return citations;
}
