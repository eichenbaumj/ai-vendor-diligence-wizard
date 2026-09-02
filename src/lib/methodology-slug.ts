/*
  Heading ids for docs/methodology.md, shared by the Methodology page (which
  stamps the ids onto rendered headings) and the How it works page (whose
  "Read this part of the method" links point at them). One function, one
  contract: a unit test checks every stage link against the slugified
  headings of the document, so the two can never drift apart.
*/
export function slugify(text: string): string {
  /* Check headings ("D1.4 Domain age...", "ADV-01 Hidden text") get short
     stable ids ("d1-4", "adv-01") — report ledger rows deep-link to these via
     LedgerRow.methodology_ref, so the mapping is a contract. */
  const check = text.match(/^D(\d)\.(\d+)\b/);
  if (check) return `d${check[1]}-${check[2]}`;
  const adv = text.match(/^ADV-(\d+)\b/);
  if (adv) return `adv-${adv[1].padStart(2, "0")}`;
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}
