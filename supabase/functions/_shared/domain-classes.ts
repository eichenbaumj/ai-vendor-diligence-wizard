/*
  Domain-authority taxonomy — lives in code, not in model judgment.

  Class 1: official government / registry sources. Can VERIFY a claim (T1).
  Class 2: established independent press, archives, academic. Can corroborate (T3 evidence, strong).
  Class 3: vendor-controlled, unknown, or self-published. Self-attestation only (T2).
  Class 4: PR wires and content farms. Self-attestation dressed as coverage — can never raise confidence, and repeated phrasing across Class 3-4 domains fires ADV-04.

  A citation's class is assigned by matching its hostname here; anything not
  matched and not a vendor domain defaults to Class 3 (unknown).
*/

const CLASS1_SUFFIXES = [".gov", ".mil", ".us"];

const CLASS1_HOSTS = new Set([
  "sam.gov",
  "usaspending.gov",
  "fpds.gov",
  "sec.gov",
  "marketplace.fedramp.gov",
  "fedramp.gov",
  "govramp.org",
  "stateramp.org",
  "courtlistener.com",
  "govinfo.gov",
  "uspto.gov",
  "opencorporates.com",
  "gleif.org",
  "crt.sh",
  "rdap.org",
  "sourcewell-mn.gov",
  "naspovaluepoint.org",
  "iafcertsearch.org",
  "cloudsecurityalliance.org",
]);

const CLASS2_HOSTS = new Set([
  /* Government-technology and public-sector trade press. */
  "statescoop.com",
  "govtech.com",
  "route-fifty.com",
  "governing.com",
  "statetechmagazine.com",
  "fedscoop.com",
  "nextgov.com",
  "govexec.com",
  "americancityandcounty.com",
  /* National wire, investigative, business, and tech press. */
  "themarkup.org",
  "propublica.org",
  "apnews.com",
  "reuters.com",
  "nytimes.com",
  "washingtonpost.com",
  "wsj.com",
  "bloomberg.com",
  "axios.com",
  "politico.com",
  "techcrunch.com",
  "arstechnica.com",
  "wired.com",
  "npr.org",
  "cnbc.com",
  "cnn.com",
  "nbcnews.com",
  "cbsnews.com",
  "abcnews.go.com",
  "forbes.com",
  "fortune.com",
  "businessinsider.com",
  "fastcompany.com",
  "theverge.com",
  "theatlantic.com",
  "economist.com",
  "ft.com",
  "theguardian.com",
  "usatoday.com",
  /* Established metro dailies and regional newsrooms — the outlets that
     actually cover local-government vendor contracts. */
  "latimes.com",
  "sfchronicle.com",
  "sfgate.com",
  "sfstandard.com",
  "mercurynews.com",
  "sacbee.com",
  "kqed.org",
  "seattletimes.com",
  "oregonlive.com",
  "denverpost.com",
  "dallasnews.com",
  "houstonchronicle.com",
  "texastribune.org",
  "startribune.com",
  "chicagotribune.com",
  "suntimes.com",
  "detroitnews.com",
  "freep.com",
  "cleveland.com",
  "dispatch.com",
  "inquirer.com",
  "baltimoresun.com",
  "bostonglobe.com",
  "miamiherald.com",
  "tampabay.com",
  "orlandosentinel.com",
  "ajc.com",
  "charlotteobserver.com",
  "tennessean.com",
  "stltoday.com",
  "kansascity.com",
  "azcentral.com",
  "reviewjournal.com",
  /* Public-record broadcasters: nonpartisan outlets whose pages are records
     of public appearances and proceedings (Joe-approved allowlist addition,
     2026-08-31, the Percepta person-verification case). */
  "c-span.org",
  /* Web archives. */
  "web.archive.org",
  "archive.org",
]);

const CLASS4_HOSTS = new Set([
  "prnewswire.com",
  "businesswire.com",
  "globenewswire.com",
  "einnews.com",
  "einpresswire.com",
  "newswire.com",
  "accesswire.com",
  "prweb.com",
  "openpr.com",
  "issuewire.com",
  "medium.com",
  "substack.com",
  "linkedin.com", // posts/articles are self-published; profile checks are manual cards
  "prlog.org",
]);

export type DomainClass = 1 | 2 | 3 | 4;

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function matchesHost(host: string, set: Set<string>): boolean {
  if (set.has(host)) return true;
  /* subdomain match: news.sec.gov matches sec.gov */
  for (const h of set) {
    if (host.endsWith("." + h)) return true;
  }
  return false;
}

/**
 * Classify a cited URL. `vendorDomains` are the domains identified as
 * belonging to (or controlled by) the vendor being evaluated — always Class 3
 * regardless of TLD tricks.
 */
export function classifyDomain(
  url: string,
  vendorDomains: string[] = [],
): DomainClass {
  const host = hostnameOf(url);
  if (!host) return 3;

  for (const vd of vendorDomains) {
    const v = vd.toLowerCase().replace(/^www\./, "");
    if (host === v || host.endsWith("." + v)) return 3;
  }

  if (matchesHost(host, CLASS4_HOSTS)) return 4;
  if (matchesHost(host, CLASS1_HOSTS)) return 1;
  if (CLASS1_SUFFIXES.some((s) => host.endsWith(s))) return 1;
  if (host.endsWith(".edu")) return 2;
  if (matchesHost(host, CLASS2_HOSTS)) return 2;

  return 3;
}

/** Only Class 1-2 evidence can mark a claim VERIFIED. */
export function canVerify(cls: DomainClass): boolean {
  return cls === 1 || cls === 2;
}

/* Registry-grade hosts: the deliberately NARROW subset of Class 1 whose
   pages state legal entity names as a matter of record. Only these may
   feed the research-to-registry name bridge (identity-ties.ts
   discoverBridgeNames): courtlistener or uspto are Class 1 but their
   pages are not registry name records. Vendor sites are Class 3 by
   construction, so attacker-authored text can never reach the bridge. */
export const REGISTRY_GRADE_HOSTS = new Set([
  "sec.gov",
  "efts.sec.gov",
  "sam.gov",
  "usaspending.gov",
  "opencorporates.com",
  "gleif.org",
  "apps.dos.ny.gov",
  "data.ny.gov",
  "data.colorado.gov",
  "data.ct.gov",
  "data.texas.gov",
  "data.oregon.gov",
  "search.sunbiz.org",
  "marketplace.fedramp.gov",
]);

export function isRegistryGradeHost(url: string): boolean {
  const host = hostnameOf(url);
  return host !== null && matchesHost(host, REGISTRY_GRADE_HOSTS);
}

/* Content farms / SEO domains blocked from the S3 web-search tool entirely. */
export const BLOCKED_SEARCH_DOMAINS: string[] = [
  "prnewswire.com",
  "businesswire.com",
  "globenewswire.com",
  "einnews.com",
  "einpresswire.com",
  "newswire.com",
  "accesswire.com",
  "prweb.com",
  "openpr.com",
  "issuewire.com",
  "prlog.org",
];
