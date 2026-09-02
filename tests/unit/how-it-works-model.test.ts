/*
  Sync and lint tests for the How it works model: the page describes what
  the tool does, so every fixture on it is held against the shared pure
  functions, the sample reports, the methodology document, and the registry
  manifest, and every sentence passes the same language lint as a report.
  Section 9 adds the writing-tell rules from the 2026-09-02 rewrite (colon
  density, staccato, never-chains, tag contrasts, tics, duplicate sentences,
  question headings), section 10 checks that every term of art is explained
  before or where it is first read, section 11 keeps reader copy out of the
  page's JSX, and section 12 holds the chip key to the ledger's badge titles
  and the methodology's dimension headings.
*/
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { METHODOLOGY_VERSION } from "@shared/pipeline-tail.ts";
import { REGISTRY_MANIFEST } from "@shared/registry/index.ts";
import { attributionFor } from "@shared/identity-ties.ts";
import { CEILING_ADV_CODES, VERDICT_CAPPED_PREFIX } from "@shared/tier.ts";
import { Dimension, EvidenceTier, LedgerResult, TIER_LABELS } from "@shared/schemas.ts";
import {
  BLOCKED_SEARCH_DOMAINS,
  canVerify,
  classifyDomain,
} from "@shared/domain-classes.ts";
import { HONESTY_GROUPS } from "@shared/honesty-groups.ts";
import { lintObject } from "@shared/lint.ts";
import { SAMPLE_REPORTS } from "@/lib/sample-reports";
import { slugify } from "@/lib/methodology-slug";
import { TIER_TITLES } from "@/components/report/VerificationLedger";
import { fleschKincaid } from "../../scripts/lib/readability.ts";
import {
  CHIP_KEY,
  CHIP_KEY_DIMENSIONS,
  CHIP_KEY_TIERS,
  CREDIT_CONTROLS,
  CREDIT_PRESETS,
  FAIRNESS_LINES,
  FEDRAMP_SCENARIOS,
  HERO,
  HONESTY_GROUP_LABELS,
  HOW_IT_WORKS_METHODOLOGY_VERSION,
  PART_SCREEN,
  POINTS,
  POINT_GROUPS,
  REGISTRY_LANES,
  REPORT_PARTS,
  ROW_RESULT_LABELS,
  SECTIONS,
  SOURCE_CLASSES,
  SOURCE_EXAMPLES,
  STAGES,
  TIER_CONTROLS,
  TIER_DEFAULT,
  TIER_LADDER,
  TIER_PRESETS,
  TRIGGER_KINDS,
  TRUTH_TABLE,
  WALL_GATES,
  WORKED_EXAMPLE_STAGES,
  allReaderCopy,
  capExplanation,
  creditScenarioToInputs,
  readerCopyEntries,
  runCredit,
  runSource,
  runTier,
  stepOutcomes,
  tierScenarioToInputs,
  whichRule,
  workedLead,
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

/* Sentence helpers shared by the writing-tell rules. */
const sentencesOf = (s: string) =>
  s
    .split(/(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
const wordsOf = (s: string) => s.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w));
const opener = (s: string) =>
  wordsOf(s)
    .slice(0, 3)
    .map((w) => w.toLowerCase().replace(/[^a-z0-9']/g, ""))
    .join(" ");

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

  it("the ClaraDocs fixture prints the one rationale line computeTier prints", () => {
    const p = TIER_PRESETS.find((x) => x.id === "claradocs")!;
    expect(SAMPLE_REPORTS.claradocs.verdict.rationale).toEqual(runTier(p.scenario).decision.rationale);
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

  it("the three point groups cover the seven points once each, in order", () => {
    expect(POINT_GROUPS.flatMap((g) => g.points.map((p) => p.id))).toEqual(POINTS.map((p) => p.id));
    expect(POINT_GROUPS.map((g) => g.points.length)).toEqual([2, 4, 1]);
    expect(POINTS).toHaveLength(7);
  });

  it("the 'nothing to research' preset still earns the no-open-finding point", () => {
    const p = TIER_PRESETS.find((x) => x.id === "nothing")!;
    expect(runTier(p.scenario).decision.checks_met.met).toBe(1);
    expect(p.footnote).toMatch(/no-open-finding point/);
  });

  it("names the five Tier 1 trigger kinds the methodology lists, and nothing else", () => {
    expect(TRIGGER_KINDS).toHaveLength(5);
    const tier1 = methodology.slice(methodology.indexOf("### Tier 1"), methodology.indexOf("### Tier 2"));
    for (const needle of ["exclusion", "FedRAMP or GovRAMP", "cooperative", "Domain age"]) {
      expect(tier1).toContain(needle);
    }
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

  it("effect tiles take their tone from meaning: a warning that can fire is never the good tone", () => {
    for (const s of everyCreditScenario()) {
      const [identity, green, warning] = runCredit(s).effects;
      expect(identity.tone).toBe(identity.answer === "Yes" ? "good" : "muted");
      expect(green.tone).toBe(green.answer === "Yes" ? "good" : "muted");
      expect(warning.tone).toBe(warning.answer === "No" ? "muted" : "warn");
    }
  });

  it("an ended registration is never shown as a green Verified row, and a candidate never produces a warning", () => {
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
    expect(runSource(vendor, "yes").verdict).toMatch(/cannot verify a claim/);
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

  it("the worked example names real stages, in order, and ends on the report", () => {
    expect(WORKED_EXAMPLE_STAGES.every((id) => STAGES.some((s) => s.id === id))).toBe(true);
    const order = WORKED_EXAMPLE_STAGES.map((id) => STAGES.findIndex((s) => s.id === id));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(WORKED_EXAMPLE_STAGES[0]).toBe("inputs");
    expect(WORKED_EXAMPLE_STAGES[WORKED_EXAMPLE_STAGES.length - 1]).toBe("report");
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

  it("the report parts follow the report's own top-to-bottom order", () => {
    expect(REPORT_PARTS.map((p) => p.id)).toEqual([
      "date-band",
      "verdict-tier",
      "summary",
      "meets-n-of-7",
      "rationale",
      "overview",
      "green-flags",
      "adv-card",
      "row-notes",
      "honesty-panel",
      "question-pack",
      "manual-cards",
      "leads",
      "next-steps",
      "sources",
    ]);
    expect(PART_SCREEN).toBe(HERO.wall.doors[1].text);
    expect(SECTIONS.parts.sampleLink).toBe(HERO.sampleLink);
  });

  it("every worked-example lead is the stage's first sentence, one sentence of 30 words or fewer", () => {
    for (const id of WORKED_EXAMPLE_STAGES) {
      const s = STAGES.find((x) => x.id === id)!;
      const lead = workedLead(s);
      expect(s.inThisCheck.startsWith(lead)).toBe(true);
      expect(sentencesOf(lead)).toHaveLength(1);
      expect(wordsOf(lead).length).toBeLessThanOrEqual(30);
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
    /—|\bz-scores?\b|\bAPI\b|\bRDAP\b|\bCDX\b|\bLLMs?\b|\bleverag(e|es|ed|ing)\b|\brobust\b|\bseamless(ly)?\b|\bholistic\b|\bdelv(e|es|ed|ing)\b|\bnot just\b|\bcomprehensive\b|\bunbiased\b|\bguarantee(s|d)?\b|\btyped, logged\b|\bskeletons?\b|\bsurfaces?\b|\bsurfaced\b|\bcensus\b|\bSourcewell\b|\bHaiku\b|\bSonnet\b|\bClaude\b|\bload-bearing\b/;

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

  it("reads at grade 10 or lower (house target 9), with no runaway sentences", () => {
    const joined = copy.map((s) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`)).join(" ");
    const grade = fleschKincaid(joined);
    expect(grade, `Flesch-Kincaid ${grade.toFixed(1)} (house target 9, cap 10)`).toBeLessThanOrEqual(10);
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

describe("9. writing tells", () => {
  const entries = readerCopyEntries();
  const unique = [...new Set(entries.map((e) => e.text))];
  const verdictInputs = STAGES.find((s) => s.id === "verdict")!.inputs;

  it("has no 'never X, never Y' chain and at most three nevers per string", () => {
    expect(unique.filter((s) => /\bnever\b[^.;]*,\s*(and\s+)?never\b/i.test(s))).toEqual([]);
    expect(unique.filter((s) => (s.match(/\bnever\b/gi) ?? []).length > 3)).toEqual([]);
  });

  it("uses at most one colon per string, no fragment-colon opener, and no colon where a full stop fits", () => {
    expect(unique.filter((s) => (s.match(/:/g) ?? []).length > 1)).toEqual([]);
    expect(unique.filter((s) => /^(What|The|Strong tie|Otherwise|Only record|Then the cap)[^.]{0,40}:\s/.test(s))).toEqual([]);
    const allow = new Set<string>([HERO.intro]);
    const clauseAfterColon = unique.filter(
      (s) => !allow.has(s) && /[a-z]:\s+[a-z][^,]*\b(was|were|is|are|did|does|so)\b/.test(s),
    );
    expect(clauseAfterColon).toEqual([]);
  });

  it("has no three consecutive fragments under four words", () => {
    const staccato = unique.filter((s) => {
      const pieces = s.split(/[.!?]\s+/).map((p) => wordsOf(p).length);
      for (let i = 0; i + 2 < pieces.length; i++) {
        if (pieces[i] < 4 && pieces[i + 1] < 4 && pieces[i + 2] < 4) return true;
      }
      return false;
    });
    expect(staccato).toEqual([]);
  });

  it("has no verbless 'Never', 'Plus', 'Also', 'Noted only', or 'Reported' sentence", () => {
    expect(unique.filter((s) => /(^|\.\s+)(Never|Plus|Also|Noted only|Reported)\b[^.]*\./.test(s))).toEqual([]);
  });

  it("has no ', never Y' or ', not Y' tag at the end of a sentence", () => {
    expect(unique.filter((s) => /,\s*(never|not)\s+(a|an|the|as|proof|raise|to)\b[^.]*\./.test(s))).toEqual([]);
  });

  it("uses the 'not X; only Y' semicolon contrast at most once in the fairness list and nowhere else", () => {
    const re = /(never|not)[^;]*;\s*only\b/i;
    expect(FAIRNESS_LINES.filter((f) => re.test(f.text)).length).toBeLessThanOrEqual(1);
    const fairness = new Set(FAIRNESS_LINES.map((f) => f.text));
    expect(unique.filter((s) => !fairness.has(s) && re.test(s))).toEqual([]);
  });

  it("keeps the tics out: one 'plain code', no 'fixed', no code verbs, no two stage rules opening alike", () => {
    expect(unique.filter((s) => /\bplain code\b/i.test(s)).length).toBeLessThanOrEqual(1);
    expect(unique.filter((s) => /\bfixed\b/i.test(s))).toEqual([]);
    expect(unique.filter((s) => /\bactually\b/i.test(s))).toEqual([]);
    const codeVerbs = /\b(arm|arms|armed|veto|vetoes|promoted|load-bearing|trigger events?)\b/i;
    expect(unique.filter((s) => s !== verdictInputs && codeVerbs.test(s))).toEqual([]);
    expect(verdictInputs).toMatch(/the report calls them trigger events/);
    const openers = STAGES.map((s) => wordsOf(s.plain).slice(0, 2).join(" ").toLowerCase());
    expect(new Set(openers).size, openers.join(" | ")).toBe(STAGES.length);
  });

  it("renders no sentence over eight words from two different exports", () => {
    const owners = new Map<string, Set<string>>();
    for (const e of entries) {
      if (e.exp === "PART_SCREEN") continue;
      for (const sentence of sentencesOf(e.text)) {
        if (wordsOf(sentence).length <= 8) continue;
        const set = owners.get(sentence) ?? new Set<string>();
        set.add(e.exp);
        owners.set(sentence, set);
      }
    }
    const dupes = [...owners.entries()].filter(([, set]) => set.size > 1).map(([s, set]) => `${[...set].join(" + ")}: ${s}`);
    expect(dupes).toEqual([]);
  });

  it("has no two consecutive sentences sharing their first three words", () => {
    const repeats = unique.filter((s) => {
      const os = sentencesOf(s).map(opener).filter((o) => o.split(" ").length === 3);
      return os.some((o, i) => i > 0 && o === os[i - 1]);
    });
    expect(repeats).toEqual([]);
  });

  it("keeps noun-phrase list items unpunctuated and sentence list items verbed", () => {
    for (const n of HERO.wall.never) expect(n).not.toMatch(/[.!?]$/);
    const verb = /\b(is|are|was|were|can|cannot|does|do|goes|counts|found|claims?|runs?|sends?|weighs|flags)\b/;
    for (const f of FAIRNESS_LINES) expect(f.text, f.id).toMatch(verb);
    for (const k of TRIGGER_KINDS) expect(k).toMatch(verb);
  });

  it("asks no question in a section heading", () => {
    expect(Object.values(SECTIONS).filter((s) => /\?$/.test(s.title))).toEqual([]);
  });
});

describe("10. every term of art is explained before or where it is first read", () => {
  /* Render order with every fold expanded in place (the print order). A
     term counts as explained when its gloss sits in the same block (a card,
     a list, a paragraph group) or an earlier one. */
  const entries = readerCopyEntries();
  const GLOSSARY: { term: string; use: RegExp; gloss: RegExp }[] = [
    { term: "report", use: /\breport\b/i, gloss: /The report has three parts/ },
    { term: "verdict tier", use: /\bverdict\b|\btier\b/i, gloss: /verdict tier says how much could be confirmed/ },
    { term: "ledger", use: /\bledger\b/i, gloss: /ledger has one row per claim/ },
    { term: "question pack", use: /question pack/i, gloss: /question pack lists questions to send the vendor/ },
    { term: "green flag", use: /green flag/i, gloss: /green flag \(a fact a public record or independent page confirmed\)/ },
    { term: "row result", use: /row result|row's result/i, gloss: /one row per claim: what was checked, what was found/ },
    { term: "tier scale", use: /\bTier [0-4]\b/, gloss: /Tier 2 on a scale of 0 to 4/ },
    { term: "source class", use: /\bclass(es)?\b/i, gloss: /four classes are official record, independent press/ },
    { term: "honesty panel", use: /honesty panel/i, gloss: /honesty panel (is the list of|lists) every check the tool tried/ },
    { term: "strong tie", use: /strong tie/i, gloss: /strong tie linking that record to the vendor|strong tie is an officer/ },
    { term: "weak tie", use: /weak tie/i, gloss: /weak tie that still supports credit|matching state is a weak tie/ },
    { term: "produce a warning", use: /warning/i, gloss: /produce a warning \(an adverse finding\)/ },
    { term: "candidate record", use: /\bcandidate\b/i, gloss: /name match alone makes a record a candidate/ },
    { term: "identity resolved", use: /identity (is )?(resolve|unresolve)|identity counts as resolved/i, gloss: /Identity resolves because two independent records/ },
    { term: "row results", use: /official record found|coverage limited|contradicted\b/i, gloss: /Official record found means/ },
    { term: "evidence grade", use: /\bT[1-4]\b|evidence grade/, gloss: /T1 \(a public record the tool fetched/ },
    { term: "weight", use: /\bweights?\b/i, gloss: /weight is Critical, High, Medium, Low, or Info/ },
    { term: "honesty headings", use: new RegExp(HONESTY_GROUP_LABELS.join("|")), gloss: /honesty panel's five headings/ },
    { term: "sector pack", use: /sector (question )?pack/i, gloss: /pack is the set of questions written for one kind of product/ },
    { term: "elevated scrutiny", use: /elevated scrutiny/i, gloss: /which the report calls elevated scrutiny/ },
    { term: "contradiction", use: /contradiction/i, gloss: /compliance contradiction, meaning a program status the pitch claims/ },
    { term: "trigger events", use: /trigger events?/i, gloss: /the report calls them trigger events/ },
    { term: "deep check", use: /deep(er)? check/i, gloss: /deep check is a box you can choose on the start page/ },
    { term: "startup bar", use: /startup bar/i, gloss: /startup bar, the least a young company can fairly be asked to show/ },
    { term: "area", use: /\bareas?\b/i, gloss: /area \(a group of related checks\)/ },
    { term: "open finding", use: /(still|left) open|open (High|finding)|no-open-finding/i, gloss: /left open, meaning unresolved/ },
    { term: "meets N of 7", use: /meets \d of \d|Meets N of 7/i, gloss: /verification checks, which the report prints as meets/ },
    { term: "D1", use: /\bD1\b/, gloss: /D1 means identity and registration/ },
    { term: "manual check card", use: /manual (check )?cards?/i, gloss: /Manual check cards hand you a link and say what a bad answer looks like/ },
  ];

  it.each(GLOSSARY)("$term", ({ use, gloss }) => {
    const first = entries.findIndex((e) => use.test(e.text));
    expect(first, "the term never appears").toBeGreaterThanOrEqual(0);
    const block = entries[first].block;
    let last = first;
    while (last + 1 < entries.length && entries[last + 1].block === block) last++;
    const explained = entries.slice(0, last + 1).some((e) => gloss.test(e.text));
    expect(explained, `first read in block '${block}': ${entries[first].text}`).toBe(true);
  });

  it("covers every block the page renders", () => {
    const blocks = [...new Set(entries.map((e) => e.block))];
    expect(blocks[0]).toBe("hero-head");
    expect(blocks[blocks.length - 1]).toBe("footer");
    for (const id of ["pipeline-worked", "stage-report", "credit-result", "tier-result", "source-lab", "fairness-list"]) {
      expect(blocks).toContain(id);
    }
  });
});

describe("12. the chip key matches the ledger's badge titles and the methodology's dimension headings", () => {
  it("names the seven areas as the methodology's dimension headings, in order, at their anchors", () => {
    const headings = methodology
      .split("\n")
      .map((l) => l.match(/^### Dimension (\d): (.+?) \(D(\d)\)$/))
      .filter((m): m is RegExpMatchArray => m !== null);
    expect(headings).toHaveLength(7);
    expect(CHIP_KEY_DIMENSIONS.map((d) => d.code)).toEqual([...Dimension.options]);
    expect(CHIP_KEY_DIMENSIONS.map((d) => d.name)).toEqual(headings.map((h) => h[2]));
    const slugs = new Set(
      methodology
        .split("\n")
        .filter((l) => /^#+\s/.test(l))
        .map((l) => slugify(l.replace(/^#+\s*/, "").trim())),
    );
    for (const [i, d] of CHIP_KEY_DIMENSIONS.entries()) {
      expect(headings[i][1]).toBe(String(i + 1));
      expect(headings[i][3]).toBe(String(i + 1));
      expect(slugs.has(slugify(`Dimension ${i + 1}: ${d.name} (${d.code})`)), d.code).toBe(true);
    }
    expect(CHIP_KEY).toContain(`D1 means ${CHIP_KEY_DIMENSIONS[0].name.toLowerCase()}`);
  });

  it("describes each evidence grade by the property the ledger's badge title states", () => {
    const DEFINING: Record<EvidenceTier, RegExp> = {
      T1: /public record/i,
      T2: /vendor-published/i,
      T3: /third-party/i,
      T4: /could not corroborate/i,
    };
    expect(CHIP_KEY_TIERS.map((t) => t.code)).toEqual([...EvidenceTier.options]);
    for (const t of CHIP_KEY_TIERS) {
      expect(TIER_TITLES[t.code], t.code).toMatch(DEFINING[t.code]);
      expect(t.text, t.code).toMatch(DEFINING[t.code]);
      expect(t.text.startsWith(t.code)).toBe(true);
      expect(methodology).toContain(`| **${t.code}** |`);
    }
  });
});

describe("11. the page's JSX holds no reader copy", () => {
  /* Every visible word comes from the model, so the lint above covers it:
     no JSX text with two or more letters, no literal in a human-readable
     attribute, and no string or template text inside a child expression. */
  it("HowItWorks.tsx renders only model strings and glyphs", () => {
    const path = `${ROOT}src/pages/HowItWorks.tsx`;
    const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const READABLE_ATTRS = new Set(["aria-label", "aria-description", "title", "alt", "placeholder"]);
    const GLYPHS = new Set(["×", "▸", "+", "·", "✓", "–"]);
    const hits: string[] = [];
    const flag = (node: ts.Node, text: string) => {
      const t = text.trim();
      if (!t || GLYPHS.has(t) || !/[A-Za-z]{2,}/.test(t)) return;
      const { line } = source.getLineAndCharacterOfPosition(node.getStart());
      hits.push(`line ${line + 1}: ${JSON.stringify(t)}`);
    };
    /* A literal counts as rendered when the expression can hand it to the
       DOM as text: the expression itself, a branch of a conditional, a side
       of &&, ||, ??, or +, or the text of a template. Code inside callbacks,
       comparisons, and calls is not text (their JSX is visited on its own). */
    const scanRendered = (node: ts.Node) => {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) flag(node, node.text);
      else if (ts.isTemplateExpression(node)) {
        flag(node.head, node.head.text);
        for (const span of node.templateSpans) {
          flag(span.literal, span.literal.text);
          scanRendered(span.expression);
        }
      } else if (ts.isConditionalExpression(node)) {
        scanRendered(node.whenTrue);
        scanRendered(node.whenFalse);
      } else if (ts.isParenthesizedExpression(node)) scanRendered(node.expression);
      else if (ts.isBinaryExpression(node)) {
        const op = node.operatorToken.kind;
        if (op === ts.SyntaxKind.AmpersandAmpersandToken) scanRendered(node.right);
        else if (op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.QuestionQuestionToken || op === ts.SyntaxKind.PlusToken) {
          scanRendered(node.left);
          scanRendered(node.right);
        }
      }
    };
    const visit = (node: ts.Node) => {
      if (ts.isJsxText(node)) flag(node, node.text);
      else if (ts.isJsxAttribute(node) && READABLE_ATTRS.has(node.name.getText()) && node.initializer && ts.isStringLiteral(node.initializer)) {
        flag(node.initializer, node.initializer.text);
      } else if (ts.isJsxExpression(node) && node.expression && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
        scanRendered(node.expression);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    expect(hits).toEqual([]);
  });
});
