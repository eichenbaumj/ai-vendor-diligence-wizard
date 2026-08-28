/*
  ADV-04: possible planted corroboration.

  The pattern: the same marketing phrasing recurring across multiple
  low-authority websites that present as independent — content placed to be
  found by AI research tools. Detection is pure code over citation metadata
  (never model judgment), and fires an AdvFinding, which caps the verdict at
  Tier 2, so the false-positive bar is deliberately high:

  - Only Class 3 citations count toward the network. Class 4 press wires
    syndicate identical releases as a matter of course, and a wire echoing a
    wire is ordinary vendor PR, not deception. Wires can carry the phrasing,
    but only sites presenting as independent make it a network.
  - Vendor-controlled hosts never count: a vendor repeating its own tagline
    across its own properties is normal.
  - The phrasing must be a verbatim run of eight normalized tokens — long
    enough that shared boilerplate ("the leading provider of") cannot trip
    it — recurring on at least two distinct registrable domains.
  - Only Channel A citations carry cited_text, so a URL the research model
    merely wrote into its narrative can never contribute to a match.

  The finding reports the observation with the hosts and the passage, never
  a characterization of intent.
*/
import type { AdvFinding, Citation } from "./schemas.ts";

const SHINGLE_TOKENS = 8;
const MIN_DOMAINS = 2;

function normalizeText(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

/* Approximate registrable domain: hostname without a www prefix, reduced to
   its last two labels. Multi-part public suffixes (co.uk) collapse slightly
   too far, which only makes the detector MORE conservative: distinct sites
   under one suffix merge into one domain and cannot inflate the count. */
function registrableDomain(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    const labels = host.split(".").filter(Boolean);
    if (labels.length < 2) return host || null;
    return labels.slice(-2).join(".");
  } catch {
    return null;
  }
}

function isVendorHost(url: string, vendorDomains: string[]): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return vendorDomains.some((d) => {
      const dom = d.toLowerCase().replace(/^www\./, "");
      return host === dom || host.endsWith("." + dom);
    });
  } catch {
    return false;
  }
}

export function detectPlantedCorroboration(
  citations: Citation[],
  vendorDomains: string[],
): AdvFinding | null {
  /* shingle -> map of registrable domain -> one example URL */
  const shingleDomains = new Map<string, Map<string, string>>();
  const shingleText = new Map<string, string>();

  for (const c of citations) {
    if (c.domain_class !== 3) continue;
    if (c.cited_text === null) continue;
    if (isVendorHost(c.url, vendorDomains)) continue;
    const domain = registrableDomain(c.url);
    if (!domain) continue;
    const tokens = normalizeText(c.cited_text);
    for (let i = 0; i + SHINGLE_TOKENS <= tokens.length; i++) {
      const window = tokens.slice(i, i + SHINGLE_TOKENS);
      const key = window.join(" ");
      let domains = shingleDomains.get(key);
      if (!domains) {
        domains = new Map();
        shingleDomains.set(key, domains);
        shingleText.set(key, window.join(" "));
      }
      if (!domains.has(domain)) domains.set(domain, c.url);
    }
  }

  let best: { key: string; domains: Map<string, string> } | null = null;
  for (const [key, domains] of shingleDomains) {
    if (domains.size < MIN_DOMAINS) continue;
    if (!best || domains.size > best.domains.size) best = { key, domains };
  }
  if (!best) return null;

  const hosts = [...best.domains.keys()].slice(0, 4).join(", ");
  const passage = shingleText.get(best.key) ?? best.key;
  const detail =
    `The same passage appears word for word on ${best.domains.size} unrelated sites (${hosts}): "${passage}". This repetition is reported as an observation for the reader to weigh.`.slice(
      0,
      500,
    );
  return { code: "ADV-04", detail };
}
