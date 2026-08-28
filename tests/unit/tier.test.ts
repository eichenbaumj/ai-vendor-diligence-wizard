/*
  Exhaustive tests for computeTier — the deterministic verdict wall.

  Invariants under test (docs/research/methodology.md §3, §7):
  - Tier 1 requires >= 2 deterministic T1 triggers. One trigger is never
    enough, and an unresolved identity alone routes to Tier 0, never Tier 1.
  - Tier 0 beats a bad grade: insufficient input is "not enough to evaluate".
  - ADV findings impose a CEILING (max Tier 2) — they can lower a verdict,
    never raise one, and never below what the evidence already produced.
*/
import { describe, expect, it } from "vitest";
import {
  computeTier,
  type Finding,
  type T1Trigger,
  type TierInputs,
} from "@shared/tier.ts";
import { TIER_LABELS, type AdvFinding } from "@shared/schemas.ts";

function inputs(overrides: Partial<TierInputs> = {}): TierInputs {
  return {
    resolvable: true,
    identity_resolved: true,
    t1_triggers: [],
    findings: [],
    green_dimensions: [],
    startup_bar_met: false,
    adv_findings: [],
    ...overrides,
  };
}

function trigger(
  kind: T1Trigger["trigger"],
  check_id = "sam_entity",
): T1Trigger {
  return {
    trigger: kind,
    check_id,
    detail: `test detail for ${kind}`,
    evidence_url: null,
  };
}

function finding(
  severity: Finding["severity"],
  resolved = false,
  dimension = "D3",
): Finding {
  return {
    id: `f-${severity.toLowerCase()}`,
    dimension,
    severity,
    resolved,
    detail: `test ${severity} finding`,
  };
}

function adv(code: AdvFinding["code"]): AdvFinding {
  return { code, detail: "test adversarial finding" };
}

describe("computeTier: Tier 0 routing (insufficient input, never adverse)", () => {
  it("resolvable=false -> tier 0", () => {
    const d = computeTier(inputs({ resolvable: false, identity_resolved: false }));
    expect(d.tier).toBe(0);
    expect(d.label).toBe(TIER_LABELS[0]);
    expect(d.ceiling_applied).toBe(false);
    expect(d.rationale[0]).toMatch(/did not contain enough to research/);
    expect(d.rationale[0]).toMatch(/not a negative finding/);
  });

  it("identity unresolved with zero triggers -> tier 0, never tier 1", () => {
    const d = computeTier(inputs({ identity_resolved: false }));
    expect(d.tier).toBe(0);
    expect(d.rationale[0]).toMatch(/did not converge on a registered legal entity/);
  });

  it("identity unresolved with exactly 1 trigger -> still tier 0, never tier 1", () => {
    const d = computeTier(
      inputs({
        identity_resolved: false,
        t1_triggers: [trigger("no_registration_definitive", "sos_de")],
      }),
    );
    expect(d.tier).toBe(0);
  });

  it("the two tier-0 paths carry different rationale text", () => {
    const unresolvable = computeTier(
      inputs({ resolvable: false, identity_resolved: false }),
    );
    const unresolved = computeTier(inputs({ identity_resolved: false }));
    expect(unresolvable.rationale[0]).not.toBe(unresolved.rationale[0]);
  });
});

describe("computeTier: Tier 1 requires two deterministic triggers", () => {
  it("exactly 1 trigger with identity resolved is NOT tier 1", () => {
    const d = computeTier(
      inputs({ t1_triggers: [trigger("sam_exclusion_match")] }),
    );
    expect(d.tier).not.toBe(1);
    /* No unresolved HIGHs and < 3 green dims: falls to tier 3. */
    expect(d.tier).toBe(3);
  });

  it("2 triggers -> tier 1, with both triggers logged in the rationale", () => {
    const d = computeTier(
      inputs({
        t1_triggers: [
          trigger("no_registration_definitive", "sos_de"),
          trigger("compliance_registry_contradiction", "fedramp_feed"),
        ],
      }),
    );
    expect(d.tier).toBe(1);
    expect(d.label).toBe(TIER_LABELS[1]);
    expect(d.rationale).toHaveLength(2);
    expect(d.rationale[0]).toContain("no_registration_definitive");
    expect(d.rationale[0]).toContain("sos_de");
    expect(d.rationale[1]).toContain("compliance_registry_contradiction");
    expect(d.rationale[1]).toContain("fedramp_feed");
  });

  it("2 triggers beat identity resolution state (tier 1 even when identity unresolved)", () => {
    const d = computeTier(
      inputs({
        identity_resolved: false,
        t1_triggers: [
          trigger("sam_exclusion_match", "sam_exclusions"),
          trigger("cooperative_contract_contradiction", "sourcewell_list"),
        ],
      }),
    );
    expect(d.tier).toBe(1);
  });
});

describe("computeTier: Tier 2 on unresolved HIGH/CRITICAL findings", () => {
  it("identity ok + 1 unresolved HIGH -> tier 2", () => {
    const d = computeTier(inputs({ findings: [finding("HIGH")] }));
    expect(d.tier).toBe(2);
    expect(d.rationale[0]).toContain("Unresolved HIGH finding");
  });

  it("identity ok + 1 unresolved CRITICAL -> tier 2", () => {
    const d = computeTier(inputs({ findings: [finding("CRITICAL")] }));
    expect(d.tier).toBe(2);
  });

  it("a resolved HIGH does not produce tier 2", () => {
    const d = computeTier(
      inputs({
        findings: [finding("HIGH", true)],
        green_dimensions: ["D1", "D2", "D3"],
      }),
    );
    expect(d.tier).toBe(4);
  });

  it("unresolved MEDIUM/LOW findings do not produce tier 2", () => {
    const d = computeTier(
      inputs({
        findings: [finding("MEDIUM"), finding("LOW"), finding("INFO")],
        green_dimensions: ["D1", "D2", "D3"],
      }),
    );
    expect(d.tier).toBe(4);
  });
});

describe("computeTier: Tier 3 vs Tier 4 on green dimensions", () => {
  it("identity ok + no HIGH + 3 green dims -> tier 4", () => {
    const d = computeTier(
      inputs({ green_dimensions: ["D1", "D2", "D3"] }),
    );
    expect(d.tier).toBe(4);
    expect(d.label).toBe(TIER_LABELS[4]);
    expect(d.rationale[0]).toContain("D1, D2, D3");
  });

  it("identity ok + no HIGH + 2 green dims -> tier 3", () => {
    const d = computeTier(inputs({ green_dimensions: ["D1", "D2"] }));
    expect(d.tier).toBe(3);
    expect(d.label).toBe(TIER_LABELS[3]);
  });

  it("tier 3 rationale differs by startup_bar_met", () => {
    const met = computeTier(
      inputs({ green_dimensions: ["D1", "D2"], startup_bar_met: true }),
    );
    const notMet = computeTier(
      inputs({ green_dimensions: ["D1", "D2"], startup_bar_met: false }),
    );
    expect(met.tier).toBe(3);
    expect(notMet.tier).toBe(3);
    expect(met.rationale[0]).not.toBe(notMet.rationale[0]);
    expect(met.rationale[0]).toContain("startup calibration bar");
    expect(notMet.rationale[0]).toContain("public evidence of government delivery is thin");
  });
});

describe("computeTier: ADV ceiling (can only lower, floor at what evidence produced)", () => {
  it("tier-4 inputs + one ADV finding -> tier 2 with ceiling_applied", () => {
    const d = computeTier(
      inputs({
        green_dimensions: ["D1", "D2", "D3"],
        adv_findings: [adv("ADV-03")],
      }),
    );
    expect(d.tier).toBe(2);
    expect(d.ceiling_applied).toBe(true);
    expect(d.label).toBe(TIER_LABELS[2]);
    expect(d.rationale.at(-1)).toContain("Verdict capped");
    expect(d.rationale.at(-1)).toContain("ADV-03");
  });

  it("tier-3 inputs + ADV finding -> capped to tier 2", () => {
    const d = computeTier(
      inputs({ green_dimensions: ["D1"], adv_findings: [adv("ADV-02")] }),
    );
    expect(d.tier).toBe(2);
    expect(d.ceiling_applied).toBe(true);
  });

  it("ADV with tier already 1 -> stays 1, no ceiling flag", () => {
    const d = computeTier(
      inputs({
        t1_triggers: [
          trigger("no_registration_definitive"),
          trigger("sam_exclusion_match"),
        ],
        adv_findings: [adv("ADV-02")],
      }),
    );
    expect(d.tier).toBe(1);
    expect(d.ceiling_applied).toBe(false);
    expect(d.rationale.join(" ")).not.toContain("Verdict capped");
  });

  it("ADV with tier already 2 -> stays 2, no ceiling flag", () => {
    const d = computeTier(
      inputs({ findings: [finding("HIGH")], adv_findings: [adv("ADV-01")] }),
    );
    expect(d.tier).toBe(2);
    expect(d.ceiling_applied).toBe(false);
  });

  it("ADV with tier 0 -> stays 0, no ceiling flag", () => {
    const d = computeTier(
      inputs({
        resolvable: false,
        identity_resolved: false,
        adv_findings: [adv("ADV-03")],
      }),
    );
    expect(d.tier).toBe(0);
    expect(d.ceiling_applied).toBe(false);
  });

  it("multiple ADV codes are all listed in the ceiling rationale", () => {
    const d = computeTier(
      inputs({
        green_dimensions: ["D1", "D2", "D3"],
        adv_findings: [adv("ADV-02"), adv("ADV-03")],
      }),
    );
    expect(d.tier).toBe(2);
    expect(d.rationale.at(-1)).toContain("ADV-02, ADV-03");
  });
});

describe("computeTier: checks_met arithmetic", () => {
  /* met = 2 (identity) + min(greens, 4) + 1 (no unresolved HIGH/CRITICAL),
     capped at total = 7. */
  const cases: {
    name: string;
    overrides: Partial<TierInputs>;
    met: number;
  }[] = [
    { name: "identity only", overrides: {}, met: 3 },
    {
      name: "identity + 3 greens",
      overrides: { green_dimensions: ["D1", "D2", "D3"] },
      met: 6,
    },
    {
      name: "identity + 4 greens (full marks)",
      overrides: { green_dimensions: ["D1", "D2", "D3", "D4"] },
      met: 7,
    },
    {
      name: "greens capped at 4 even with 6 dimensions",
      overrides: { green_dimensions: ["D1", "D2", "D3", "D4", "D5", "D6"] },
      met: 7,
    },
    {
      name: "no identity + 2 greens",
      overrides: { identity_resolved: false, green_dimensions: ["D1", "D2"] },
      met: 3,
    },
    {
      name: "identity + 3 greens + unresolved HIGH loses the clean-findings point",
      overrides: {
        green_dimensions: ["D1", "D2", "D3"],
        findings: [finding("HIGH")],
      },
      met: 5,
    },
    {
      name: "nothing met except clean findings",
      overrides: { identity_resolved: false },
      met: 1,
    },
    {
      name: "unresolved CRITICAL also loses the clean-findings point",
      overrides: {
        identity_resolved: false,
        findings: [finding("CRITICAL")],
      },
      met: 0,
    },
    {
      name: "resolved HIGH keeps the clean-findings point",
      overrides: { identity_resolved: false, findings: [finding("HIGH", true)] },
      met: 1,
    },
  ];

  for (const c of cases) {
    it(c.name, () => {
      const d = computeTier(inputs(c.overrides));
      expect(d.checks_met).toEqual({ met: c.met, total: 7 });
    });
  }

  it("checks_met is computed even on tier-0 unresolvable input", () => {
    const d = computeTier(inputs({ resolvable: false, identity_resolved: false }));
    /* Documents actual behavior: the clean-findings point still accrues. */
    expect(d.checks_met).toEqual({ met: 1, total: 7 });
  });
});

describe("computeTier: label always matches TIER_LABELS", () => {
  const scenarios: TierInputs[] = [
    inputs({ resolvable: false, identity_resolved: false }),
    inputs({
      t1_triggers: [
        trigger("no_registration_definitive"),
        trigger("sam_exclusion_match"),
      ],
    }),
    inputs({ findings: [finding("HIGH")] }),
    inputs({ green_dimensions: ["D1"] }),
    inputs({ green_dimensions: ["D1", "D2", "D3"] }),
  ];
  it("every path returns the canonical label for its tier", () => {
    for (const s of scenarios) {
      const d = computeTier(s);
      expect(d.label).toBe(TIER_LABELS[d.tier]);
    }
  });
});

describe("computeTier: the Polimorphic scenario", () => {
  /* A real young vendor: identity resolves via two independent identifiers
     (registration + domain), no registry contradicted anything, coverage
     gaps produced zero triggers (coverage-limited is never adverse), no
     unresolved high-severity findings, and one dimension carries verified
     green evidence. Correct outcome: tier 3, calibrated to the startup bar —
     never tier 1. */
  it("identity resolved, zero triggers, no HIGHs, 1 green dim -> tier 3", () => {
    const d = computeTier(
      inputs({
        resolvable: true,
        identity_resolved: true, // two identifiers: SoS registration + domain RDAP
        t1_triggers: [],
        findings: [finding("LOW", false, "D2"), finding("INFO", false, "D6")],
        green_dimensions: ["D2"], // one verifiable government customer
        startup_bar_met: true,
      }),
    );
    expect(d.tier).toBe(3);
    expect(d.label).toBe(TIER_LABELS[3]);
    expect(d.ceiling_applied).toBe(false);
    expect(d.rationale[0]).toContain("startup calibration bar");
    expect(d.checks_met).toEqual({ met: 4, total: 7 });
  });
});
