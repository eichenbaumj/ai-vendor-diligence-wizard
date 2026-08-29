/*
  The finding-id vocabulary: every literal id that assemble.ts can push into
  the findings array, in one place, so pack YAML `select.finding_ids`
  metadata and code cannot drift apart. A source-scan unit test asserts
  every findings.push site in assemble.ts uses an id listed here.
*/

export const FINDING_IDS = [
  "excl",
  "domain-age",
  "email",
  "customers",
  "fedramp_marketplace",
  "govramp",
  "txramp",
  "sourcewell",
  "cert-vocab",
  "leadership",
  "model-transparency",
  "automation",
] as const;
export type FindingId = (typeof FINDING_IDS)[number];

/* Templated ids: `perf-<claimId>` performance findings match this prefix. */
export const FINDING_PREFIXES = ["perf-"] as const;

export function isKnownFindingId(id: string): boolean {
  return (
    (FINDING_IDS as readonly string[]).includes(id) ||
    FINDING_PREFIXES.some((p) => id.startsWith(p))
  );
}

/* A finding-id selector from pack metadata: exact id or "perf-*" form. */
export function findingSelectorMatches(selector: string, findingId: string): boolean {
  if (selector.endsWith("*")) return findingId.startsWith(selector.slice(0, -1));
  return selector === findingId;
}

export function isValidFindingSelector(selector: string): boolean {
  if (selector.endsWith("*")) {
    return (FINDING_PREFIXES as readonly string[]).includes(selector.slice(0, -1));
  }
  return (FINDING_IDS as readonly string[]).includes(selector);
}
