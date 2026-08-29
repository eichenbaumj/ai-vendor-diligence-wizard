/*
  Tests for the code-side sector-classification fallback (sector-lexicon.ts).

  All packs are synthetic. The rules under test: a pack qualifies only with
  >= 2 distinct lexicon-term hits (one term is noise), results order by hit
  count then pack id and cap at 3, and the eligibility check is a safety net
  that reads only the eligibility-case-mgmt pack's lexicon.
*/
import { describe, expect, it } from "vitest";
import {
  buildLexiconCorpus,
  eligibilityLexiconHit,
  lexiconFallbackPackIds,
} from "@shared/sector-lexicon.ts";
import type { SectorPack } from "@shared/packs-types.ts";

function makePack(pack_id: string, signal_lexicon?: string[]): SectorPack {
  return {
    pack_id,
    pack_name: `${pack_id} Synthetic`,
    definition: "Synthetic pack for lexicon tests.",
    inclusion_test: ["Is this a test?"],
    ...(signal_lexicon ? { signal_lexicon } : {}),
    scrutiny_tier: "standard",
    incumbent_landscape: "",
    established_vendors: [],
    failure_modes: [],
    skepticism_triggers: [],
    diligence_questions: [],
    elevated_scrutiny_rules: [],
    reference_deployments: [],
    registries_to_check: [],
    legal_context: "",
    realistic_pricing: "",
    last_updated: "2026-08-01",
    refresh_cadence: "quarterly",
    known_gaps: "",
  };
}

describe("buildLexiconCorpus", () => {
  it("lowercases, collapses whitespace, and pads with spaces", () => {
    expect(buildLexiconCorpus("HeLLo   World\n\nFoo", ["BAR\tbaz"])).toBe(
      " hello world foo bar baz ",
    );
  });

  it("joins the use-case description and every claim quote", () => {
    const corpus = buildLexiconCorpus("Call deflection", [
      "IVR containment",
      "Live agents",
    ]);
    expect(corpus).toContain("call deflection");
    expect(corpus).toContain("ivr containment");
    expect(corpus).toContain("live agents");
  });
});

describe("lexiconFallbackPackIds", () => {
  const corpus = buildLexiconCorpus(
    "Automates medicaid and snap eligibility screening for county caseworkers",
    ["Reduces call center wait times", "Handles ivr containment"],
  );

  it("requires at least two distinct term hits", () => {
    const packs = {
      "one-hit": makePack("one-hit", ["medicaid", "unrelatedterm"]),
      "two-hit": makePack("two-hit", ["medicaid", "snap"]),
    };
    expect(lexiconFallbackPackIds(packs, corpus)).toEqual(["two-hit"]);
  });

  it("orders by hit count descending, then pack id ascending on ties", () => {
    const packs = {
      "b-two": makePack("b-two", ["call center", "ivr"]),
      "a-two": makePack("a-two", ["medicaid", "snap"]),
      "c-three": makePack("c-three", ["medicaid", "snap", "eligibility"]),
    };
    expect(lexiconFallbackPackIds(packs, corpus)).toEqual([
      "c-three",
      "a-two",
      "b-two",
    ]);
  });

  it("caps the result at three packs", () => {
    const packs = Object.fromEntries(
      ["p1", "p2", "p3", "p4"].map((id) => [
        id,
        makePack(id, ["medicaid", "snap"]),
      ]),
    );
    expect(lexiconFallbackPackIds(packs, corpus)).toHaveLength(3);
  });

  it("returns empty for no qualifying packs, missing lexicons included", () => {
    const packs = {
      "no-lexicon": makePack("no-lexicon"),
      "no-match": makePack("no-match", ["blockchain", "drone"]),
    };
    expect(lexiconFallbackPackIds(packs, corpus)).toEqual([]);
  });

  it("matches case-insensitively and ignores empty or padded terms", () => {
    const packs = {
      padded: makePack("padded", ["  MEDICAID  ", "", "  Snap "]),
    };
    expect(lexiconFallbackPackIds(packs, corpus)).toEqual(["padded"]);
  });
});

describe("eligibilityLexiconHit", () => {
  const corpus = buildLexiconCorpus(
    "Scores benefit applications and flags cases for denial",
    [],
  );

  it("true when the eligibility pack's lexicon hits twice", () => {
    const packs = {
      "eligibility-case-mgmt": makePack("eligibility-case-mgmt", [
        "benefit",
        "denial",
      ]),
    };
    expect(eligibilityLexiconHit(packs, corpus)).toBe(true);
  });

  it("false on a single hit", () => {
    const packs = {
      "eligibility-case-mgmt": makePack("eligibility-case-mgmt", [
        "benefit",
        "recertification",
      ]),
    };
    expect(eligibilityLexiconHit(packs, corpus)).toBe(false);
  });

  it("false when the eligibility pack is absent", () => {
    const packs = { "call-center": makePack("call-center", ["benefit", "denial"]) };
    expect(eligibilityLexiconHit(packs, corpus)).toBe(false);
  });

  it("reads only the eligibility pack's lexicon, not other packs'", () => {
    const packs = {
      "eligibility-case-mgmt": makePack("eligibility-case-mgmt", [
        "unrelated",
        "terms",
      ]),
      "other-pack": makePack("other-pack", ["benefit", "denial"]),
    };
    expect(eligibilityLexiconHit(packs, corpus)).toBe(false);
  });
});
