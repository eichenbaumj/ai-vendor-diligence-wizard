/*
  The adversarial-content card must claim a capped verdict only when the
  tier engine actually applied the cap (Joe's 2026-08-31 live read: ADV-01
  and ADV-03 fired on a tier-2 report, no cap was applied, and the card
  still said "caps the verdict tier"). The applied-cap signal is the
  VERDICT_CAPPED_PREFIX rationale line, so these tests also lock the model
  and the engine to the same prefix.
*/
import { describe, expect, it } from "vitest";
import {
  CEILING_ADV_CODES,
  VERDICT_CAPPED_PREFIX,
  computeTier,
} from "@shared/tier.ts";
import { lintObject } from "@shared/lint.ts";
import {
  ADV_CARD_LEAD,
  ADV_EXPLAIN,
  advCardVariant,
} from "@/components/report/adv-card-model";
import type { AdvFinding } from "@/lib/types";

const adv = (code: string): AdvFinding => ({
  code: code as AdvFinding["code"],
  detail: "test detail",
});

const CAPPED_LINE = `${VERDICT_CAPPED_PREFIX} the submitted material contained content its reader cannot see (ADV-01; see the adversarial-content findings).`;

describe("advCardVariant", () => {
  it("says capped only when the rationale carries the applied-cap line", () => {
    expect(advCardVariant([adv("ADV-01")], [CAPPED_LINE])).toBe("capped");
    expect(advCardVariant([adv("ADV-03")], ["Identity resolved."])).toBe(
      "cap_not_reached",
    );
  });

  it("a ceiling code without an applied cap reads cap_not_reached, even mixed with ADV-04", () => {
    expect(advCardVariant([adv("ADV-04"), adv("ADV-01")], [])).toBe(
      "cap_not_reached",
    );
  });

  it("ADV-04 alone is informational regardless of the rationale", () => {
    expect(advCardVariant([adv("ADV-04")], [CAPPED_LINE])).toBe(
      "informational",
    );
    expect(advCardVariant([adv("ADV-04")], [])).toBe("informational");
  });
});

describe("model/engine lockstep", () => {
  it("when the engine caps, it writes the exact prefix the card model detects", () => {
    const decision = computeTier({
      resolvable: true,
      identity_resolved: true,
      t1_triggers: [],
      findings: [],
      green_dimensions: ["D1", "D2", "D3"],
      startup_bar_met: true,
      adv_findings: [adv("ADV-01")],
    });
    if (decision.ceiling_applied) {
      expect(
        decision.rationale.some((r) => r.startsWith(VERDICT_CAPPED_PREFIX)),
      ).toBe(true);
      expect(advCardVariant([adv("ADV-01")], decision.rationale)).toBe(
        "capped",
      );
    } else {
      /* The fixture landed at or below the ceiling: the exact case the
         card copy must describe honestly. */
      expect(advCardVariant([adv("ADV-01")], decision.rationale)).toBe(
        "cap_not_reached",
      );
    }
  });

  it("every ceiling code has card copy", () => {
    for (const code of CEILING_ADV_CODES) {
      expect(ADV_EXPLAIN[code]).toBeTruthy();
    }
  });
});

describe("card copy language", () => {
  it("passes the language lint (no banned vocabulary, no em dashes)", () => {
    expect(lintObject(ADV_CARD_LEAD)).toEqual([]);
    expect(lintObject(ADV_EXPLAIN)).toEqual([]);
  });

  it("only the capped variant claims the tier moved", () => {
    expect(ADV_CARD_LEAD.capped).toContain("capped the verdict tier");
    expect(ADV_CARD_LEAD.cap_not_reached).toContain(
      "the verdict did not change",
    );
    expect(ADV_CARD_LEAD.cap_not_reached).not.toContain("capped the verdict");
    expect(ADV_CARD_LEAD.informational).toContain("did not change");
  });
});
