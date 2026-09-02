/*
  Tests for the QA panel schema and its structural rules (panelProblems),
  plus a lockdown of the real public panel file: it must parse, carry no
  structural problems, and reference only fixtures that resolve
  repo-relative. Fixtures still being authored by the fixture workstream
  are asserted as declared paths only, not for on-disk existence.
*/
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PanelInput } from "../../scripts/lib/qa-panel-schema.ts";

describe("PanelInput website field (1.7)", () => {
  it("accepts a name input with a website and keeps the strict shape", () => {
    const ok = PanelInput.safeParse({ input_kind: "name", content: "Polco", levels: ["L1"], state: null, website: "polco.us" });
    expect(ok.success).toBe(true);
    const unknown = PanelInput.safeParse({ input_kind: "name", content: "Polco", levels: ["L1"], state: null, web: "polco.us" });
    expect(unknown.success).toBe(false);
  });
});
import {
  PanelFile,
  panelProblems,
} from "../../scripts/lib/qa-panel-schema.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PANEL_PATH = join(ROOT, "tests", "qa", "panel", "synthetic.panel.json");

/* Fixtures owned by a concurrent workstream: declared in the panel now,
   land on disk by integration time. */
const PENDING_FIXTURES = new Set([
  "tests/fixtures/pitches/flagged-munivault.txt",
  "tests/fixtures/pdfs/qa-clean-established.pdf",
  "tests/fixtures/pdfs/qa-injected-established-tinyfont.pdf",
]);

function entry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "sample-entry",
    display_name: "Sample Fictional Vendor",
    category: "synthetic-control",
    visibility: "public",
    inputs: [
      { input_kind: "paste", content: "A fictional pitch body.", levels: ["L1"] },
    ],
    expected: { status: "complete" },
    rationale: "Fictional control whose expectations are pinned by design.",
    added: "2026-08-29",
    calibrated_against: {
      methodology_version: "1.1",
      runs: 0,
      last_calibrated: "2026-08-29",
    },
    expectations_status: "calibrating",
    ...overrides,
  };
}

function panel(entries: unknown[]): unknown {
  return { schema_version: 1, panel_version: "2026-08-29", entries };
}

describe("PanelFile schema", () => {
  it("accepts a valid minimal entry", () => {
    const parsed = PanelFile.safeParse(panel([entry()]));
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const e = parsed.data.entries[0];
      expect(e.expected.lint_clean).toBe(true); // default
      expect(e.inputs[0].state).toBeNull(); // default
      expect(panelProblems(parsed.data, { isPublicFile: true })).toEqual([]);
    }
  });

  it("rejects duplicate entry ids", () => {
    const parsed = PanelFile.safeParse(
      panel([entry(), entry({ display_name: "Same id, different name" })]),
    );
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(
        parsed.error.issues.some((i) =>
          i.message.includes("duplicate entry id: sample-entry"),
        ),
      ).toBe(true);
    }
  });

  it("rejects an input with both content and fixture", () => {
    const parsed = PanelFile.safeParse(
      panel([
        entry({
          inputs: [
            {
              input_kind: "paste",
              content: "inline",
              fixture: "tests/fixtures/pitches/clean-established.txt",
            },
          ],
        }),
      ]),
    );
    expect(parsed.success).toBe(false);
  });
});

describe("panelProblems", () => {
  it("rejects a real-vendor category in a public file", () => {
    const parsed = PanelFile.parse(
      panel([entry({ category: "established" })]),
    );
    const problems = panelProblems(parsed, { isPublicFile: true });
    expect(
      problems.some((p) => p.includes("cannot ship in the public repo")),
    ).toBe(true);
    /* visibility "public" independently requires a synthetic category. */
    expect(
      problems.some((p) => p.includes("requires a synthetic category")),
    ).toBe(true);
  });

  it("rejects a hard ledger expectation on VERIFIED", () => {
    const parsed = PanelFile.parse(
      panel([
        entry({
          expected: {
            status: "complete",
            ledger: [
              {
                match: { id: "sourcewell" },
                presence: "required",
                result_in: ["VERIFIED"],
                hardness: "hard",
              },
            ],
          },
        }),
      ]),
    );
    const problems = panelProblems(parsed, { isPublicFile: true });
    expect(
      problems.some((p) =>
        p.includes("hard ledger expectation REQUIRING a VERIFIED row is not allowed"),
      ),
    ).toBe(true);
  });

  it("allows a hard forbidden_result_in on VERIFIED (deterministic ground truth)", () => {
    const parsed = PanelFile.parse(
      panel([
        entry({
          expected: {
            status: "complete",
            ledger: [
              {
                match: { id: "usaspending" },
                presence: "optional",
                forbidden_result_in: ["VERIFIED"],
                hardness: "hard",
              },
            ],
          },
        }),
      ]),
    );
    const problems = panelProblems(parsed, { isPublicFile: true });
    expect(problems.some((p) => p.includes("VERIFIED"))).toBe(false);
  });

  it('rejects "calibrated" with fewer than 3 runs', () => {
    const parsed = PanelFile.parse(
      panel([
        entry({
          expectations_status: "calibrated",
          calibrated_against: {
            methodology_version: "1.1",
            runs: 2,
            last_calibrated: "2026-08-29",
          },
        }),
      ]),
    );
    const problems = panelProblems(parsed, { isPublicFile: true });
    expect(
      problems.some((p) => p.includes("at least 3 recorded calibration runs")),
    ).toBe(true);
  });

  it("rejects a monotonic_pair pointing at a missing id", () => {
    const parsed = PanelFile.parse(
      panel([
        entry({
          expected: { status: "complete", monotonic_pair: "no-such-entry" },
        }),
      ]),
    );
    const problems = panelProblems(parsed, { isPublicFile: true });
    expect(
      problems.some((p) =>
        p.includes('monotonic_pair "no-such-entry" is not an entry'),
      ),
    ).toBe(true);
  });
});

describe("tests/qa/panel/synthetic.panel.json", () => {
  const raw = JSON.parse(readFileSync(PANEL_PATH, "utf8"));

  it("parses and has no structural problems as a public file", () => {
    const parsed = PanelFile.safeParse(raw);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.panel_version).toBe("2026-09-01");
      expect(parsed.data.entries).toHaveLength(9);
      expect(panelProblems(parsed.data, { isPublicFile: true })).toEqual([]);
    }
  });

  it("declares the pending fixtures and resolves every existing one", () => {
    const file = PanelFile.parse(raw);
    const declared = new Set<string>();
    for (const e of file.entries) {
      for (const input of e.inputs) {
        if (input.fixture) declared.add(input.fixture);
      }
    }
    for (const pending of PENDING_FIXTURES) {
      expect(declared).toContain(pending);
    }
    for (const fixture of declared) {
      if (PENDING_FIXTURES.has(fixture)) continue;
      expect(existsSync(join(ROOT, fixture)), `missing fixture: ${fixture}`).toBe(
        true,
      );
    }
  });
});
