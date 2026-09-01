/*
  Name-only website discovery with one bounded retry.

  On a name run the vendor's website is the gateway to the SECOND identity
  identifier (discovered domain -> site fetch -> name confirmation -> RDAP
  record), so a transient search failure here silently costs identity
  resolution and drops an honest vendor to "not enough to evaluate" (the
  polco name-run variance, defect basket 6b's spirit). This module wraps
  the two-search discovery request so that:

  - An INFRASTRUCTURE failure (empty content from an aborted or non-ok
    call: no citations, no narrative) earns exactly one retry while the
    S1b budget allows.
  - An HONEST MISS (the model answered but code picked no domain) is an
    answer, never retried.
  - The domain itself is still picked by CODE (harvestCitations ->
    inferPrimaryDomain, minUrls=1) — narrative text can never nominate a
    site, and nothing downstream of this module changes: the discovered
    record still needs the site's own extracted name to match before it
    can count toward identity (resolveIdentity's confirmed-provenance
    rule).

  Attempt 1 runs under a 35s deadline: a pause_turn cycle that ends by
  ~18s leaves the >=15s the loop requires for its one continuation, where
  the pre-1.6 30s deadline made that continuation nearly unreachable.
  The retry gets a tighter 20s. Per-cycle request timeouts derive from
  the deadline inside runResearchLoop (a passed timeoutMs would be
  overridden there, so none is passed).

  Pure module: no Deno APIs; the research loop and clock are injected.
*/
import type { Citation } from "./schemas.ts";
import { buildDiscoveryRequest } from "./anthropic.ts";
import {
  runResearchLoop,
  type ResearchRunResult,
  type Usage,
  ZERO_USAGE,
  addUsage,
} from "./anthropic-client.ts";
import { harvestCitations } from "./harvest.ts";
import { inferPrimaryDomain } from "./domain-inference.ts";
import { canRetryDiscovery } from "./s1b-budget.ts";

export const DISCOVERY_ATTEMPT_1_DEADLINE_MS = 35_000;
export const DISCOVERY_ATTEMPT_2_DEADLINE_MS = 20_000;

export type DiscoveryOutcome = "domain_found" | "no_match" | "infra_failure";

export interface DiscoveryResult {
  domain: string | null;
  outcome: DiscoveryOutcome;
  attempts: number;
  usage: Usage;
  citations: Citation[];
}

/* Classify one attempt's result. no_match requires evidence the model
   actually answered: narrative text or at least one citation. A result
   with neither is an infrastructure failure (aborted stream, non-ok
   call), the only class a retry can help. */
export function classifyDiscoveryOutcome(args: {
  domain: string | null;
  narrative: string;
  citationCount: number;
}): DiscoveryOutcome {
  if (args.domain !== null) return "domain_found";
  if (args.narrative.trim().length > 0 || args.citationCount > 0) {
    return "no_match";
  }
  return "infra_failure";
}

export async function discoverVendorSite(
  companyNames: string[],
  matchNames: string[],
  opts: {
    apiKey: string;
    /* Pipeline-elapsed clock, for the retry budget gate. */
    elapsedMs: () => number;
    runLoop?: typeof runResearchLoop;
    now?: () => Date;
  },
): Promise<DiscoveryResult> {
  const runLoop = opts.runLoop ?? runResearchLoop;
  const nowIso = () => (opts.now?.() ?? new Date()).toISOString();
  let usage: Usage = ZERO_USAGE;
  let attempts = 0;

  const attempt = async (deadlineMs: number) => {
    attempts += 1;
    const res: ResearchRunResult = await runLoop(
      buildDiscoveryRequest(companyNames),
      { apiKey: opts.apiKey, deadlineMs, maxContinuations: 1 },
    );
    usage = addUsage(usage, res.usage);
    const citations = harvestCitations(
      { citations: res.citations, narrative: res.narrative },
      [],
      nowIso(),
    );
    const domain = inferPrimaryDomain(citations, matchNames, 1);
    return {
      domain,
      citations,
      outcome: classifyDiscoveryOutcome({
        domain,
        narrative: res.narrative,
        citationCount: res.citations.length,
      }),
    };
  };

  let out = await attempt(DISCOVERY_ATTEMPT_1_DEADLINE_MS);
  if (out.outcome === "infra_failure" && canRetryDiscovery(opts.elapsedMs())) {
    out = await attempt(DISCOVERY_ATTEMPT_2_DEADLINE_MS);
  }
  return {
    domain: out.domain,
    outcome: out.outcome,
    attempts,
    usage,
    citations: out.citations,
  };
}
