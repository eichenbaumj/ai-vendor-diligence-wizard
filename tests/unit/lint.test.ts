/*
  Tests for the legal-safe language lint (methodology.md §5, Rule 2).

  The banned list converts protected opinion into actionable assertion when
  aimed at a named company; nothing on it may ever ship. Style patterns are
  house-style and self-description guards. These tests pin every pattern,
  case handling, and the word-boundary behavior (including one documented
  loose match).
*/
import { describe, expect, it } from "vitest";
import {lintObject, lintText, looseQuoteInSource, looseText, stripEmDashes, tidyProse } from "@shared/lint.ts";

describe("lintText: every banned pattern fires", () => {
  const bannedCases: [sample: string, label: string][] = [
    ["That would be a scam.", "scam"],
    ["Watch out for scammers.", "scam"],
    ["It felt scammy.", "scam"],
    ["a fraudulent filing", "fraud"],
    ["accused of fraud", "fraud"],
    ["the report was faked", "fake"],
    ["a fake certificate", "fake"],
    ["a sham operation", "sham"],
    ["it is a shell company", "shell company"],
    ["two shell companies", "shell company"],
    ["a shell corporation in Nevada", "shell company"],
    ["nothing more than a shell entity", "shell company"],
    ["you do not have to assume the company is a shell", "shell company"],
    ["they were shells for the parent", "shell company"],
    ["a front company for the parent", "front company"],
    ["they are lying", "lying/liar"],
    ["he is a liar", "lying/liar"],
    ["a deceptive claim", "deceptive"],
    ["an attempt to deceive", "deceit"],
    ["outright deceit", "deceit"],
    ["a misleading statement", "misleading"],
    ["predatory pricing", "predatory"],
    ["classic vaporware", "vaporware"],
    ["selling snake oil", "snake oil"],
    ["selling snakeoil", "snake oil"],
    ["an obvious grift", "grift"],
    ["a serial grifter", "grift"],
    ["an illegitimate operation", "illegitimate"],
    ["a bogus certificate", "bogus"],
    ["a con artist", "con artist"],
    ["criminally negligent", "criminal"],
    ["a dishonest answer", "dishonest"],
    ["an untrustworthy source", "untrustworthy"],
    ["this is a high-risk vendor", "high-risk vendor (use disclosed criteria instead)"],
    ["this is a high risk vendor", "high-risk vendor (use disclosed criteria instead)"],
  ];

  for (const [sample, label] of bannedCases) {
    it(`"${sample}" -> ${label}`, () => {
      const violations = lintText(sample);
      expect(violations.map((v) => v.label)).toContain(label);
      const hit = violations.find((v) => v.label === label);
      expect(hit?.kind).toBe("banned");
    });
  }

  it("matches case-insensitively", () => {
    expect(lintText("SCAM ALERT").map((v) => v.label)).toContain("scam");
    expect(lintText("Fraudulent Behavior").map((v) => v.label)).toContain("fraud");
    expect(lintText("VAPORWARE").map((v) => v.label)).toContain("vaporware");
    expect(lintText("High-Risk Vendor").map((v) => v.label)).toContain(
      "high-risk vendor (use disclosed criteria instead)",
    );
  });
});

describe("lintText: word boundaries", () => {
  const cleanWords = [
    "We ordered the scampi.",
    "a scamper across the lawn",
    "a shamrock pin",
    "The Grifton office opened Tuesday.",
    "the supplies arrived",
    "she believes the report",
    "a conference with the artist",
    "constant improvement",
  ];
  for (const sample of cleanWords) {
    it(`"${sample}" does not fire`, () => {
      expect(lintText(sample).filter((v) => v.kind === "banned")).toEqual([]);
    });
  }

  it('documented loose match: "fakery" DOES fire the fake pattern', () => {
    /* /\bfake(s|d|ry)?\b/ deliberately covers the -ry derivative. This is
       intentional: "fakery" aimed at a vendor is as actionable as "fake",
       so the looseness is on the safe side. Pinned here so a future regex
       edit that changes it is a conscious decision. */
    const violations = lintText("plain fakery");
    expect(violations.map((v) => v.label)).toContain("fake");
  });
});

describe("lintText: style patterns", () => {
  const styleCases: [sample: string, labelPrefix: string][] = [
    ["We leverage AI daily.", "leverage"],
    ["leveraging modern tools", "leverage"],
    ["a robust platform", "robust"],
    ["seamless integration", "seamless"],
    ["works seamlessly", "seamless"],
    ["a holistic approach", "holistic"],
    ["we delve into records", "delve"],
    ["delving deeper", "delve"],
    ["a comprehensive review", "comprehensive"],
    ["an unbiased evaluation", "unbiased"],
    ["we guarantee results", "guarantee"],
    ["guaranteed outcomes", "guarantee"],
  ];

  for (const [sample, labelPrefix] of styleCases) {
    it(`"${sample}" -> ${labelPrefix}`, () => {
      const violations = lintText(sample);
      const hit = violations.find((v) => v.label.startsWith(labelPrefix));
      expect(hit).toBeDefined();
      expect(hit?.kind).toBe("style");
    });
  }

  it("em dash fires", () => {
    const violations = lintText("wide gaps — resolve them first");
    expect(violations.some((v) => v.label.startsWith("em dash"))).toBe(true);
  });

  it("en dash and hyphen do NOT fire (numeric ranges stay legal)", () => {
    expect(lintText("2019–2024 revenue, a well-known firm")).toEqual([]);
  });

  it('"not just X but Y" fires within 40 characters', () => {
    const violations = lintText("It is not just fast but accurate.");
    expect(violations.some((v) => v.label.includes("not just"))).toBe(true);
  });

  it('"not just ... but" beyond the 40-character window does not fire', () => {
    const filler = "a".repeat(45);
    expect(lintText(`not just ${filler} but`)).toEqual([]);
  });
});

describe("lintText: aggregation behavior", () => {
  it("clean text produces no violations", () => {
    expect(
      lintText(
        "We could not verify this claim in public sources. State records show an active registration.",
      ),
    ).toEqual([]);
  });

  it("reports one violation per pattern even with repeated matches", () => {
    const violations = lintText("scam scam scam");
    expect(violations).toHaveLength(1);
    expect(violations[0].label).toBe("scam");
  });

  it("reports banned and style violations together, with excerpts", () => {
    const violations = lintText("A robust product from a shell company.");
    const labels = violations.map((v) => v.label);
    expect(labels).toContain("shell company");
    expect(labels.some((l) => l.startsWith("robust"))).toBe(true);
    const shell = violations.find((v) => v.label === "shell company");
    expect(shell?.excerpt).toContain("shell company");
  });
});

describe("lintObject", () => {
  it("skips url, evidence_url, link, and id keys", () => {
    const obj = {
      id: "rpt_scam_001",
      url: "https://example.com/scam-report",
      evidence_url: "https://example.com/fraud-database",
      link: "https://example.com/fake-detector",
      summary: "State records show an active registration.",
    };
    expect(lintObject(obj)).toEqual([]);
  });

  it("reports JSON paths through nested objects and arrays", () => {
    const obj = {
      summary: "A robust summary.",
      ledger: [
        { note: "All records matched.", id: "row-1" },
        { note: "Looks like vaporware.", evidence_url: "https://x.example/scam" },
      ],
    };
    const violations = lintObject(obj);
    const paths = violations.map((v) => v.path);
    expect(paths).toContain("$.summary");
    expect(paths).toContain("$.ledger[1].note");
    expect(paths).toHaveLength(2);
    const vapor = violations.find((v) => v.path === "$.ledger[1].note");
    expect(vapor?.label).toBe("vaporware");
    expect(vapor?.kind).toBe("banned");
  });

  it("lints a bare string at path $", () => {
    const violations = lintObject("an obvious grift");
    expect(violations).toHaveLength(1);
    expect(violations[0].path).toBe("$");
    expect(violations[0].label).toBe("grift");
  });

  it("ignores numbers, booleans, and null", () => {
    expect(lintObject({ count: 42, ok: true, missing: null })).toEqual([]);
  });

  it("id is only skipped as an exact key name", () => {
    /* A field named check_id is still prose-linted. */
    const violations = lintObject({ check_id: "a bogus check" });
    expect(violations.map((v) => v.label)).toContain("bogus");
  });
});

describe("prose hygiene helpers", () => {
  it("stripEmDashes rewrites em dashes as comma joins", () => {
    expect(stripEmDashes("numbers—50% reduction—that we could not verify")).toBe(
      "numbers, 50% reduction, that we could not verify",
    );
  });

  it("tidyProse never ships a fragment: trims to the last complete sentence", () => {
    const cut = "We found records. Ask the vendor in writing to provide the basis";
    expect(tidyProse(cut, 600)).toBe("We found records.");
  });

  it("tidyProse leaves complete prose alone", () => {
    expect(tidyProse("All checks passed. See the ledger below.", 600)).toBe(
      "All checks passed. See the ledger below.",
    );
  });

  it("tidyProse caps overlong prose at a sentence boundary", () => {
    const s = "First sentence here. ".repeat(40);
    const out = tidyProse(s, 200);
    expect(out.length).toBeLessThanOrEqual(200);
    expect(out.endsWith(".")).toBe(true);
  });

  it("looseText containment catches misremembered names", () => {
    const pitch = looseText("customers include Sarasota County, FL, and others");
    expect(pitch.includes(looseText("Sarasota County, FL"))).toBe(true);
    expect(pitch.includes(looseText("Sarasun County, FL"))).toBe(false);
  });
});

describe("looseQuoteInSource: digit-boundary guard (the lost leading digit)", () => {
  it("a quote starting mid-number never matches (0% inside 40%)", () => {
    const src = looseText("delivers a 40% productivity increase and $17M annual savings");
    expect(looseQuoteInSource(src, "0% productivity increase")).toBe(false);
  });

  it("the full number still matches", () => {
    const src = looseText("delivers a 40% productivity increase and $17M annual savings");
    expect(looseQuoteInSource(src, "40% productivity increase")).toBe(true);
  });

  it("a digit-led quote at the start of the source matches", () => {
    const src = looseText("40% faster processing for permit review teams");
    expect(looseQuoteInSource(src, "40% faster processing")).toBe(true);
  });

  it("non-digit quotes behave like plain containment", () => {
    const src = looseText("customers include Sarasota County, FL, and others");
    expect(looseQuoteInSource(src, "Sarasota County")).toBe(true);
    expect(looseQuoteInSource(src, "Sarasun County")).toBe(false);
  });
});
