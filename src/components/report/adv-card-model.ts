/*
  Copy model for the adversarial-content card. Which lead sentence renders
  depends on whether the verdict was ACTUALLY capped, not on which codes are
  present: a ceiling-class finding on a report whose tier already sat at or
  below the ceiling never moved the verdict, and the card must not say it
  did. Stored reports do not carry ceiling_applied, so the deterministic
  rationale log is the source of truth: tier.ts always writes a line with
  VERDICT_CAPPED_PREFIX when (and only when) it caps.
*/
import { isCeilingAdvFinding, VERDICT_CAPPED_PREFIX } from "@shared/tier.ts";
import type { AdvFinding } from "@/lib/types";

export const ADV_EXPLAIN: Record<string, string> = {
  "ADV-01": "The submitted material contained text that is hidden from human readers.",
  "ADV-02": "The submitted material contained text addressed to AI evaluation systems rather than to you.",
  "ADV-03": "The submitted material contained invisible characters of a kind used to carry hidden instructions.",
  "ADV-04": "The same promotional phrasing appears across a network of low-authority sites, which weakens it as independent evidence.",
};

export type AdvCardVariant = "capped" | "cap_not_reached" | "informational";

export function advCardVariant(
  findings: AdvFinding[],
  rationale: string[],
): AdvCardVariant {
  /* Informational-flagged findings never count toward the cap variants:
     benign hidden text on a URL submission renders like ADV-04 does. */
  if (!findings.some(isCeilingAdvFinding)) {
    return "informational";
  }
  return rationale.some((r) => r.startsWith(VERDICT_CAPPED_PREFIX))
    ? "capped"
    : "cap_not_reached";
}

export const ADV_CARD_LEAD: Record<AdvCardVariant, string> = {
  capped:
    "Some of what was submitted contained content aimed at automated systems like this one, not at human readers. That content did not change this report's checks, and its presence capped the verdict tier. Here is what we found:",
  cap_not_reached:
    "Some of what was submitted contained content aimed at automated systems like this one, not at human readers. Findings like these can cap the verdict tier. This report's tier was already at or below that cap, so the verdict did not change. Here is what we found:",
  informational:
    "During research we noticed a pattern worth knowing about. It did not change this report's checks or the verdict tier. Here is what we found:",
};
