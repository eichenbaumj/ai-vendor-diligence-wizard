/*
  The dispute-word match that orders the leads list. A boolean over the
  retrieved headline only: whole words after normalization, never a
  substring, never the passage, never the pitch.
*/
import { describe, expect, it } from "vitest";
import { ADVERSE_HEADLINE_LEXICON, adverseHeadlineHit } from "@shared/adverse-lexicon.ts";
import { lintText } from "@shared/lint.ts";

describe("adverseHeadlineHit", () => {
  it("hits the round-2 headlines that the old order hid", () => {
    for (const t of [
      "NSW Police to defend Mark43 lawsuit",
      "Mark43 sues NSW Police over junked $1bn upgrade",
      "NSW govt heads to court over dumped $177m police system",
      "Click2Gov class action: CentralSquare settles one lawsuit",
      "CentralSquare reaches $1.9M settlement",
      "Vendor contract terminated after audit",
      "City cancelled its Acme deal",
      "Acme fined by state regulator",
    ]) {
      expect(adverseHeadlineHit(t), t).toBe(true);
    }
  });
  it("matches whole words only, case-insensitively, through punctuation", () => {
    expect(adverseHeadlineHit("Acme SUED!")).toBe(true);
    expect(adverseHeadlineHit("Acme, sued.")).toBe(true);
    expect(adverseHeadlineHit("Acme fixes login issues")).toBe(false); // "sues" inside "issues"
    expect(adverseHeadlineHit("Acme courtside seats giveaway")).toBe(false);
    expect(adverseHeadlineHit("Acme announces fine-grained permissions")).toBe(false);
    expect(adverseHeadlineHit("Acme wins state contract")).toBe(false);
  });
  it("is null-safe and never hits an empty title", () => {
    expect(adverseHeadlineHit(null)).toBe(false);
    expect(adverseHeadlineHit(undefined)).toBe(false);
    expect(adverseHeadlineHit("")).toBe(false);
    expect(adverseHeadlineHit("!!!")).toBe(false);
  });
  it("the list is lowercase single words or two-word phrases, and the reader label never carries a banned word", () => {
    for (const w of ADVERSE_HEADLINE_LEXICON) {
      expect(w).toBe(w.toLowerCase());
      expect(w.split(" ").length).toBeLessThanOrEqual(2);
    }
    expect(lintText("Headline mentions a dispute, lawsuit, or breach")).toEqual([]);
  });
});
