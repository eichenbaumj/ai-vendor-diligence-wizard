/*
  Claim plausibility (methodology D6.1 rider): deterministic arithmetic
  unpacking a performance number against the pitch's own stated basis.
  Everything rendered is code-templated, adjective-free, and re-parsed from
  verbatim spans — the extractor's structured fields never reach a
  sentence. Tier neutrality is pinned in assemble.test.ts; this file owns
  the arithmetic, the formatting, and the injection posture.
*/
import { describe, expect, it } from "vitest";
import type { Claim } from "@shared/schemas.ts";
import {
  approx,
  computeImplication,
  NO_BASIS_IMPLICATION,
  parseDenominator,
  parseLeadNumber,
} from "@shared/plausibility.ts";
import { lintImplication, lintText } from "@shared/lint.ts";

function claim(quote: string, basis: string | null = null): Claim {
  return {
    id: "clm-1",
    type: "performance",
    quote,
    subject: null,
    basis_quote: basis,
  };
}

describe("number parsing (verbatim, code-side)", () => {
  it("parses dollar figures with magnitude words and symbols", () => {
    expect(parseLeadNumber("$17M in annual savings")).toMatchObject({
      value: 17_000_000,
      kind: "dollars",
    });
    expect(parseLeadNumber("saves $1.5 million a year")).toMatchObject({
      value: 1_500_000,
      kind: "dollars",
    });
    expect(parseLeadNumber("$108,000,000 average")).toMatchObject({
      value: 108_000_000,
      kind: "dollars",
    });
  });

  it("parses percentages and rejects nonsense", () => {
    expect(parseLeadNumber("93% of permits")).toMatchObject({
      value: 93,
      kind: "percent",
    });
    expect(parseLeadNumber("cuts review time by 45 percent")).toMatchObject({
      value: 45,
      kind: "percent",
    });
    expect(parseLeadNumber("dramatically faster reviews")).toBeNull();
  });

  it("parses denominators with nouns and magnitude words", () => {
    expect(parseDenominator("about 500 agents")).toMatchObject({
      value: 500,
      noun: "agents",
    });
    expect(parseDenominator("40,000 permits a month")).toMatchObject({
      value: 40_000,
      noun: "permits a month",
    });
    expect(parseDenominator("2 million agents")).toMatchObject({
      value: 2_000_000,
      noun: "agents",
    });
    expect(parseDenominator("our nationwide platform")).toBeNull();
  });

  it("approx rounds to two significant figures with separators", () => {
    expect(approx(34285.7)).toBe("34,000");
    expect(approx(37200)).toBe("37,000");
    expect(approx(8.53)).toBe("8.5");
    expect(approx(120)).toBe("120");
  });
});

describe("computeImplication: the note", () => {
  it("dollars per denominator (the Percepta shape)", () => {
    const note = computeImplication(
      claim("$17M in annual savings", "about 500 agents"),
    );
    expect(note).toContain('"about 500 agents"');
    expect(note).toContain("about $34,000 per agent per year");
    expect(note).toContain("question pack");
  });

  it("percent of workload", () => {
    const note = computeImplication(
      claim("93% of permit decisions automated", "40,000 permits a month"),
    );
    expect(note).toContain("is about 37,000 permits a month");
  });

  it("a number with no pitch-stated basis gets the honest no-basis line", () => {
    expect(computeImplication(claim("$17M in annual savings"))).toBe(
      NO_BASIS_IMPLICATION,
    );
  });

  it("a numberless performance claim gets no note at all", () => {
    expect(computeImplication(claim("dramatically faster approvals"))).toBeNull();
  });

  it("every emitted template passes both the global and the surface lint", () => {
    const notes = [
      computeImplication(claim("$17M in annual savings", "about 500 agents")),
      computeImplication(claim("93% of decisions", "40,000 permits a month")),
      computeImplication(claim("$2M saved")),
    ];
    for (const note of notes) {
      expect(note).not.toBeNull();
      expect(lintText(note!).filter((v) => v.kind === "banned")).toEqual([]);
      expect(lintImplication(note!).filter((v) => v.kind === "banned")).toEqual([]);
      /* No em dashes on user-facing copy. */
      expect(note).not.toContain("—");
    }
  });

  it("never contains an evaluative adjective, even with a hostile basis span", () => {
    const note = computeImplication(
      claim("$17M in annual savings", "2 million agents, a reasonable estimate"),
    );
    /* The hostile span carries a banned adjective: the self-guard collapses
       the note to the no-basis template instead of quoting it. */
    expect(note).toBe(NO_BASIS_IMPLICATION);
  });

  it("a planted absurd denominator renders only the division and its own basis, visibly", () => {
    const note = computeImplication(
      claim("$17M in annual savings", "across our 2 million agents"),
    );
    expect(note).toContain('"across our 2 million agents"');
    expect(note).toContain("about $8.5 per agent");
    expect(lintImplication(note!).filter((v) => v.kind === "banned")).toEqual([]);
  });

  it("the surface lint catches every banned adjective", () => {
    for (const word of [
      "reasonable",
      "unreasonable",
      "plausible",
      "implausible",
      "inflated",
      "exaggerated",
    ]) {
      expect(
        lintImplication(`That works out to a ${word} figure.`).some(
          (v) => v.kind === "banned",
        ),
      ).toBe(true);
    }
    /* The global list is untouched: "reasonable" stays legal elsewhere. */
    expect(
      lintText("A demo is reasonable.").filter((v) => v.kind === "banned"),
    ).toEqual([]);
  });
});
