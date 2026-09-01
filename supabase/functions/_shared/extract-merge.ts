/*
  Provenance-guarded merge of the pitch extract with the vendor-site
  extract. Pure TS, no I/O.

  The governing principle: everything on the vendor's site is
  attacker-authored. Site text may generate rows, questions, research
  targets, and registry-contradiction checks. It must NEVER:
  - mint identity or expand the registry-query name set
    (vendor_name_candidates and domains stay pitch-only — a site listing
    "Deloitte" as a name must not produce Deloitte's registry hits);
  - create absence-based adverse findings (site people and customers get
    rows and research, but the zero-verified aggregates count pitch-origin
    entries only — a vendor is never worse off for having a normal
    marketing site);
  - feed the ADV ceiling (the site S1 call's injection_screen is dropped;
    forensics on site text is informational only, handled by the caller);
  - inject performance marketing as findings (site performance claims and
    urgency language never merge — "99% accuracy" on a pricing page is
    marketing, and D6's extreme-claim findings are reserved for what the
    vendor put in front of THIS buyer).
*/
import type { PitchExtract } from "./schemas.ts";
import { norm, isNamedOrganization } from "./text-match.ts";

/* A degenerate extraction: a non-trivial pitch that yielded no claims, no
   people, and no customers is far more likely a flaky parse than a truly
   empty pitch (observed ~1-in-6 on PDF text layers, where a thin extract
   dropped a clean twin from tier 1 to tier 0 and flipped the monotonic
   pair). The caller retries the extractor once; a second degenerate result
   is accepted as genuine. */
export function isDegenerateExtract(
  extract: PitchExtract,
  sourceTextLength: number,
): boolean {
  return (
    sourceTextLength >= 400 &&
    extract.claims.length === 0 &&
    extract.people.length === 0 &&
    extract.named_customers.length === 0
  );
}

/* Claim types that may cross from site text into the pipeline. Compliance
   claims deliberately cross: an affirmative "FedRAMP Authorized" on the
   public site that is absent from the official feed is a registry
   CONTRADICTION (the signal this tool exists for), and the
   affirmative-designation arming rule does the fairness work. */
const SITE_CLAIM_TYPES = new Set(["identity", "customer", "compliance", "team"]);

const SITE_CUSTOMER_CAP = 6;
const SITE_ADDRESS_CAP = 4;

export interface MergedExtract {
  extract: PitchExtract;
  /* How many leading entries of people / named_customers / addresses are
     pitch-origin. The adverse aggregates in assembly count only those, and
     tying signals carry the provenance into their vendor_source label. */
  pitch_person_count: number;
  pitch_customer_count: number;
  pitch_address_count: number;
  /* Verbatim quotes of site-origin claims, for report attribution
     ("the vendor's website states..."). */
  site_claim_quotes: string[];
}

export function mergeExtracts(
  pitch: PitchExtract,
  site: PitchExtract,
): MergedExtract {
  const people = [...pitch.people];
  const seenPeople = new Set(people.map((p) => norm(p.name)));
  for (const p of site.people) {
    if (people.length >= 10) break;
    const k = norm(p.name);
    if (!k || seenPeople.has(k)) continue;
    seenPeople.add(k);
    people.push(p);
  }

  const customers = [...pitch.named_customers];
  const seenCustomers = new Set(customers.map((c) => norm(c)));
  let siteCustomers = 0;
  for (const c of site.named_customers) {
    if (customers.length >= 15 || siteCustomers >= SITE_CUSTOMER_CAP) break;
    if (!isNamedOrganization(c)) continue;
    const k = norm(c);
    if (!k || seenCustomers.has(k)) continue;
    seenCustomers.add(k);
    customers.push(c);
    siteCustomers += 1;
  }

  /* Vendor addresses merge like people: site-origin entries append after
     the pitch's, capped, deduped. They feed tying signals only (an address
     can corroborate that a registry record belongs to this vendor) — never
     identity on their own, never an adverse aggregate. */
  const addresses = [...pitch.addresses];
  const seenAddresses = new Set(addresses.map((a) => norm(a)));
  let siteAddresses = 0;
  for (const a of site.addresses) {
    if (addresses.length >= 6 || siteAddresses >= SITE_ADDRESS_CAP) break;
    const k = norm(a);
    if (!k || seenAddresses.has(k)) continue;
    seenAddresses.add(k);
    addresses.push(a);
    siteAddresses += 1;
  }

  const claims = [...pitch.claims];
  const siteClaimQuotes: string[] = [];
  for (const c of site.claims) {
    if (claims.length >= 30) break;
    if (!SITE_CLAIM_TYPES.has(c.type)) continue;
    const id = c.id.startsWith("site-") ? c.id : `site-${c.id}`;
    claims.push({ ...c, id });
    siteClaimQuotes.push(c.quote);
  }

  return {
    extract: {
      ...pitch,
      /* names, domains, sender_email, state_mentioned, urgency_language,
         and injection_screen are pitch-only by taking ...pitch above. */
      people,
      named_customers: customers,
      addresses,
      claims,
      use_case_description:
        pitch.use_case_description || site.use_case_description,
    },
    pitch_person_count: pitch.people.length,
    pitch_customer_count: pitch.named_customers.length,
    pitch_address_count: pitch.addresses.length,
    site_claim_quotes: siteClaimQuotes,
  };
}
