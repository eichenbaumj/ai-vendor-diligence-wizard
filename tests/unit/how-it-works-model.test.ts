/*
  Sync and lint tests for the How it works model: the page describes what
  the tool does, so every fixture on it is held against the shared pure
  functions, the sample reports, the methodology document, and the registry
  manifest, and every sentence passes the same language lint as a report.
*/
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { METHODOLOGY_VERSION } from "@shared/pipeline-tail.ts";
import { REGISTRY_MANIFEST } from "@shared/registry/index.ts";
import { attributionFor } from "@shared/identity-ties.ts";
import { CEILING_ADV_CODES, VERDICT_CAPPED_PREFIX } from "@shared/tier.ts";
import { LedgerResult, TIER_LABELS } from "@shared/schemas.ts";
import {
  BLOCKED_SEARCH_DOMAINS,
  canVerify,
  classifyDomain,
} from "@shared/domain-classes.ts";
import { HONESTY_GROUPS } from "@shared/honesty-groups.ts";
import { lintObject } from "@shared/lint.ts";
import { SAMPLE_REPORTS } from "@/lib/sample-reports";
import { slugify } from "@/lib/methodology-slug";
import { fleschKincaid } from "../../scripts/lib/readability.ts";
import {
  CREDIT_CONTROLS,
  CREDIT_PRESETS,
  FEDRAMP_SCENARIOS,
  HONESTY_GROUP_LABELS,
  HOW_IT_WORKS_METHODOLOGY_VERSION,
  REGISTRY_LANES,
  ROW_RESULT_LABELS,
  SOURCE_CLASSES,
  SOURCE_EXAMPLES,
  STAGES,
  TIER_CONTROLS,
  TIER_DEFAULT,
  TIER_LADDER,
  TIER_PRESETS,
  TRUTH_TABLE,
  WALL_GATES,
  allReaderCopy,
  capExplanation,
  creditScenarioToInputs,
  runCredit,
  runSource,
  runTier,
  stepOutcomes,
  tierScenarioToInputs,
  whichRule,
  type CreditScenario,
  type TierScenario,
} from "@/lib/how-it-works-model";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const methodology = readFileSync(`${ROOT}docs/methodology.md`, "utf8");

/* Every combination of the credit controls (the two hidden fields too). */
function everyCreditScenario(): CreditScenario[] {
  let acc: Partial<CreditScenario>[] = [{}];
  for (const c of CREDIT_CONTROLS) {
    acc = acc.flatMap((s) => c.options.map((o) => ({ ...s, [c.key]: o.value })));
  }
  const withRecord = acc.flatMap((s) => [
    { ...s },
    { ...s, record: "program" as const },
  ]);
  return withRecord as CreditScenario[];
}

function everyTierScenario(): TierScenario[] {
  let acc: Partial<TierScenario>[] = [{}];
  for (const c of TIER_CONTROLS) {
    acc = acc.flatMap((s) => c.options.map((o) => ({ ...s, [c.key]: o.value })));
  }
  return acc as TierScenario[];
}

describe("1. version pin", () => {
  it("matches the shared methodology version and the document header", () => {
    expect(HOW_IT_WORKS_METHODOLOGY_VERSION).toBe(METHODOLOGY_VERSION);
    const line3 = methodology.split("\n")[2];
    const m = line3.match(/Methodology version (\S+)\*\*/);
    expect(m?.[1]).toBe(HOW_IT_WORKS_METHODOLOGY_VERSION);
  });
});

describe("2. tier labels, presets, ladder, and cap", () => {
  it("the ladder carries the shared tier labels, top down", () => {
    expect(TIER_LADDER.map((r) => r.tier)).toEqual([4, 3, 2, 1, 0]);
    for (const r of TIER_LADDER) expect(r.label).toBe(TIER_LABELS[r.tier]);
    expect([0, 1, 2, 3, 4].map((t) => TIER_LADDER.find((r) => r.tier === t)!.label)).toEqual(
      [0, 1, 2, 3, 4].map((t) => TIER_LABELS[t]),
    );
  });

  it.each(TIER_PRESETS)("$id lands on its stated tier and points", (p) => {
    const { decision } = runTier(p.scenario);
    expect(decision.tier).toBe(p.tier);
    expect(decision.checks_met.met).toBe(p.met);
    expect(decision.checks_met.total).toBe(7);
    if (p.sample) {
      const report = SAMPLE_REPORTS[p.sample];
      expect(decision.tier).toBe(report.verdict.tier);
      expect(decision.checks_met.met).toBe(report.verdict.checks_met.met);
      expect(decision.label).toBe(report.verdict.label);
    }
  });

  it("the FedRAMP trio lands 3, 2, 3 and never Tier 1 on one contradiction", () => {
    expect(FEDRAMP_SCENARIOS.map((f) => runTier(f.scenario).decision.tier)).toEqual([3, 2, 3]);
    for (const f of FEDRAMP_SCENARIOS) expect(runTier(f.scenario).decision.tier).toBe(f.tier);
    const one = runTier(FEDRAMP_SCENARIOS[1].scenario);
    expect(one.inputs.t1_triggers).toHaveLength(1);
    expect(one.decision.tier).not.toBe(1);
  });

  it("stepOutcomes marks exactly one step Applies and agrees with computeTier on every combination", () => {
    const all = everyTierScenario();
    expect(all.length).toBeGreaterThan(1000);
    for (const s of all) {
      const { inputs, decision } = runTier(s);
      const out = stepOutcomes(inputs, decision);
      expect(out.steps.filter((x) => x.outcome === "Applies")).toHaveLength(1);
      expect(out.expectedTier).toBe(decision.tier);
      expect(out.cap === "Applies").toBe(decision.ceiling_applied);
      const applied = out.steps.findIndex((x) => x.outcome === "Applies");
      for (const [i, x] of out.steps.entries()) {
        if (i < applied) expect(x.outcome).toBe("Passed");
        if (i > applied) expect(x.outcome).toBe("Not reached");
      }
    }
  });

  it("the cap scenario caps with the verbatim prefix; informational ADV-01 and ADV-04 never cap", () => {
    const capped = runTier({ ...TIER_DEFAULT, green: "4", adv: "caps" });
    expect(capped.decision.ceiling_applied).toBe(true);
    expect(capped.decision.tier).toBe(2);
    expect(capped.decision.rationale.some((r) => r.startsWith(VERDICT_CAPPED_PREFIX))).toBe(true);
    for (const adv of ["info", "web"] as const) {
      const d = runTier({ ...TIER_DEFAULT, green: "4", adv }).decision;
      expect(d.ceiling_applied).toBe(false);
      expect(d.tier).toBe(4);
    }
    expect(CEILING_ADV_CODES.size).toBe(3);
    expect(capExplanation(tierScenarioToInputs({ ...TIER_DEFAULT, adv: "caps" }).adv_findings)).toMatch(/caps the verdict at Tier 2/);
    expect(capExplanation(tierScenarioToInputs({ ...TIER_DEFAULT, adv: "info" }).adv_findings)).toMatch(/never caps/);
    expect(capExplanation(tierScenarioToInputs({ ...TIER_DEFAULT, adv: "web" }).adv_findings)).toMatch(/never moves the tier/);
  });

  it("the 'nothing to research' preset still earns the no-open-finding point", () => {
    const p = TIER_PRESETS.find((x) => x.id === "nothing")!;
    expect(runTier(p.scenario).decision.checks_met.met).toBe(1);
    expect(p.footnote).toMatch(/no-open-finding point/);
  });
});

describe("3. the credit rule and its truth table", () => {
  it("has one row per rule, in code order", () => {
    const ids = TRUTH_TABLE.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      "gate-ended",
      "gate-short",
      "exact-1",
      "exact-2",
      "exact-3",
      "exact-4",
      "exact-5",
      "contains-1",
      "contains-2",
      "contains-3",
      "contains-4",
      "inside-1",
      "inside-2",
      "else",
    ]);
  });

  it.each(TRUTH_TABLE)("$id: its example lands on the row with the stated outcome", (row) => {
    const r = runCredit(row.example);
    expect(r.verdict).toBe(row.outcome);
    expect(r.ruleId).toBe(row.id);
  });

  it("every preset lands as stated", () => {
    const by = (id: string) => runCredit(CREDIT_PRESETS.find((p) => p.id === id)!.scenario!);
    expect(by("own")).toMatchObject({ verdict: "attributed", ruleId: "exact-1" });
    expect(by("old-namesake")).toMatchObject({ verdict: "candidate", ruleId: "exact-2" });
    expect(by("ended-untied")).toMatchObject({ verdict: "candidate", ruleId: "gate-ended" });
    expect(by("longer-name-state")).toMatchObject({ verdict: "attributed", ruleId: "contains-3" });
    expect(by("bare-name")).toMatchObject({ verdict: "attributed", ruleId: "exact-5" });
    expect(by("bare-name").knownGap).toMatch(/web address/);
    expect(by("two-equal")).toMatchObject({ verdict: "candidate", ruleId: "exact-5" });
    expect(by("two-equal").collision).toMatch(/collision/);
    expect(CREDIT_PRESETS.find((p) => p.id === "unreachable")?.coverageLimited).toBe(true);
  });

  it("the known-gap note appears only when no web address was typed", () => {
    const bare = CREDIT_PRESETS.find((p) => p.id === "bare-name")!.scenario!;
    expect(runCredit(bare).knownGap).not.toBeNull();
    expect(runCredit({ ...bare, root: "covers" }).knownGap).toBeNull();
  });

  it("whichRule agrees with attributionFor on every control combination", () => {
    const all = everyCreditScenario();
    expect(all.length).toBeGreaterThan(2000);
    const seen = new Set<string>();
    for (const s of all) {
      const { facts, tie, guard } = creditScenarioToInputs(s);
      const real = attributionFor(facts, tie, guard);
      const named = whichRule(s);
      expect(named.outcome, JSON.stringify(s)).toBe(real);
      const r = runCredit(s);
      expect(r.verdict).toBe(real);
      expect(r.ruleId).toBe(named.ruleId);
      seen.add(named.ruleId);
    }
    /* Every row in the table is reachable from the controls. */
    for (const row of TRUTH_TABLE) expect(seen.has(row.id), row.id).toBe(true);
  });

  it("an ended registration is never shown as a green Verified row, and a candidate never arms a warning", () => {
    for (const s of everyCreditScenario()) {
      const r = runCredit(s);
      if (s.status === "ended") expect(r.ledger.result).not.toBe("VERIFIED");
      if (r.verdict === "candidate") {
        expect(r.effects.every((e) => e.answer === "No")).toBe(true);
        expect(r.ledger.candidate).toBe(true);
      }
      if (r.verdict === "attributed" && s.status === "ended") {
        expect(r.ledger.severity).toBe("Critical");
        expect(r.sentence).toMatch(/ended status is the finding/);
      }
    }
  });
});

describe("4. source classes", () => {
  it("names four classes and classifies every invented address as stated", () => {
    expect(SOURCE_CLASSES.length).toBe(4);
    expect(SOURCE_CLASSES.map((c) => c.cls)).toEqual([1, 2, 3, 4]);
    for (const e of SOURCE_EXAMPLES) {
      expect(runSource(e, "yes").cls, e.label).toBe(e.expected);
      expect(runSource(e, "yes").canVerify).toBe(e.expected === 1 || e.expected === 2);
    }
    expect(canVerify(1)).toBe(true);
    expect(canVerify(2)).toBe(true);
    expect(canVerify(3)).toBe(false);
    expect(canVerify(4)).toBe(false);
  });

  it("a link alone never verifies; classes 3 and 4 never verify", () => {
    const gov = SOURCE_EXAMPLES.find((e) => e.expected === 1)!;
    expect(runSource(gov, "yes").verdict).toMatch(/verified/);
    expect(runSource(gov, "no").verdict).toMatch(/link alone never verifies/);
    const vendor = SOURCE_EXAMPLES.find((e) => e.id === "vendor-io")!;
    expect(runSource(vendor, "yes").verdict).toMatch(/Never verifies/);
  });

  it("a listed newsroom is class 2 and the first blocked wire is class 4", () => {
    expect(classifyDomain("https://www.govtech.com/some/story")).toBe(2);
    expect(classifyDomain(`https://www.${BLOCKED_SEARCH_DOMAINS[0]}/release`)).toBe(4);
  });
});

describe("5. registry lanes", () => {
  it("names every check in the manifest, and nothing else", () => {
    const keys = Object.keys(REGISTRY_LANES).sort();
    const manifest = REGISTRY_MANIFEST.map((m) => m.check_id).sort();
    expect(keys).toEqual(manifest);
    for (const label of Object.values(REGISTRY_LANES)) {
      expect(label).not.toMatch(/_/);
    }
  });
});

describe("6. stages", () => {
  it("has the fourteen ground-truth stages in order, numbered", () => {
    expect(STAGES.map((s) => s.id)).toEqual([
      "inputs",
      "ingest",
      "pitch-reader",
      "vendor-site",
      "registry",
      "ties",
      "research",
      "packs",
      "assembly",
      "verdict",
      "writer",
      "review",
      "lint",
      "report",
    ]);
    expect(STAGES.map((s) => s.n)).toEqual(STAGES.map((_, i) => i + 1));
  });

  it("every methodology link points at a real heading of docs/methodology.md", () => {
    const slugs = new Set(
      methodology
        .split("\n")
        .filter((l) => /^#+\s/.test(l))
        .map((l) => slugify(l.replace(/^#+\s*/, "").trim())),
    );
    for (const s of STAGES) expect(slugs.has(s.methodologyRef), `${s.id} -> ${s.methodologyRef}`).toBe(true);
  });

  it("every code anchor names a path that exists on disk", () => {
    for (const s of STAGES) {
      expect(s.anchors.length).toBeGreaterThan(0);
      for (const a of s.anchors) {
        const path = a.match(/^([^\s:]+)/)![1];
        expect(existsSync(`${ROOT}${path}`), `${s.id}: ${a}`).toBe(true);
      }
    }
  });

  it("the four gates sit on the stages whose output crosses the wall, in order", () => {
    expect(WALL_GATES.map((g) => g.id)).toEqual(["A", "B", "C", "D"]);
    for (const g of WALL_GATES) {
      const from = STAGES.findIndex((s) => s.id === g.from);
      const to = STAGES.findIndex((s) => s.id === g.to);
      expect(to).toBe(from + 1);
      expect(STAGES[from].gate).toBe(g.id);
    }
    expect(STAGES.filter((s) => s.gate).length).toBe(4);
  });

  it("diagram labels fit a 67-unit node at 13px: two lines, ten characters or fewer each", () => {
    for (const s of STAGES) {
      expect(s.label).toHaveLength(2);
      for (const line of s.label) expect(line.length, `${s.id}: ${line}`).toBeLessThanOrEqual(10);
    }
  });
});

describe("7. honesty groups and row results", () => {
  it("reuse the shared labels", () => {
    expect(HONESTY_GROUP_LABELS).toEqual(HONESTY_GROUPS.map((g) => g.label));
    expect(Object.keys(ROW_RESULT_LABELS).sort()).toEqual([...LedgerResult.options].sort());
  });
});

describe("8. copy discipline", () => {
  const copy = allReaderCopy();
  const JARGON =
    /—|\bz-scores?\b|\bAPI\b|\bRDAP\b|\bCDX\b|\bLLMs?\b|\bleverag(e|es|ed|ing)\b|\brobust\b|\bseamless(ly)?\b|\bholistic\b|\bdelv(e|es|ed|ing)\b|\bnot just\b|\bcomprehensive\b|\bunbiased\b|\bguarantee(s|d)?\b|\btyped, logged\b|\bskeletons?\b|\bsurfaces?\b|\bsurfaced\b|\bcensus\b|\bSourcewell\b|\bHaiku\b|\bSonnet\b|\bClaude\b/;

  it("collects a large corpus", () => {
    expect(copy.length).toBeGreaterThan(300);
    for (const s of copy) expect(typeof s).toBe("string");
  });

  it("carries zero language-lint findings", () => {
    expect(lintObject(copy)).toEqual([]);
  });

  it("carries no jargon, no em dashes, no model names, and no real cooperative", () => {
    const hits = copy.filter((s) => JARGON.test(s));
    expect(hits).toEqual([]);
  });

  it("carries none of the code-only numbers the methodology lacks", () => {
    const numbers = /40,000|\b25 pages\b|\b6 MB\b|\b5 company names\b|\b30 claims\b|\b400 characters\b|\b12 searches\b|\b6 page reads\b|\b2 to 160\b/;
    expect(copy.filter((s) => numbers.test(s))).toEqual([]);
  });

  it("reads at grade 10 or lower, with no runaway sentences", () => {
    const joined = copy.map((s) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`)).join(" ");
    const grade = fleschKincaid(joined);
    expect(grade, `Flesch-Kincaid ${grade.toFixed(1)}`).toBeLessThanOrEqual(10);
    const long = joined
      .split(/[.!?]+\s/)
      .map((s) => s.trim())
      .filter((s) => s.split(/\s+/).length > 30);
    expect(long).toEqual([]);
  });

  it("labels every sample vendor as fictional where it is introduced", () => {
    for (const p of TIER_PRESETS) {
      if (p.sample) expect(p.label).toMatch(/\(sample, fictional\)/);
    }
  });
});
