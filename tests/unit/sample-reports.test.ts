/*
  Guards for the sample-report fixtures (fictional vendors).

  Every fixture must (1) satisfy the Report schema exactly as a real engine
  run would, and (2) carry zero banned-language violations: the fixtures are
  the public face of the report format, so the legal-safe rules that gate
  generated prose gate them too. (Style-level lint findings are allowed only
  because claim_quote fields quote the fictional pitches verbatim, and a
  pushy pitch may contain style-listed words.)

  The Kestrel fixture is additionally pinned: the landing hero renders rows
  kes-L1..kes-L4 directly, and the tier-engine arithmetic it illustrates
  (identity resolved 2 + one green dimension 1 + unresolved HIGH 0 = 3 of 7,
  Tier 2) must not drift.
*/
import { describe, expect, it } from "vitest";
import { Report } from "@shared/schemas.ts";
import { lintObject, looseText } from "@shared/lint.ts";
import { SAMPLE_REPORTS } from "@/lib/sample-reports";
import { getSamplePitch } from "@/lib/sample-pitches";

const entries = Object.entries(SAMPLE_REPORTS);

describe("every sample report", () => {
  it.each(entries)("%s: satisfies the Report schema", (_id, report) => {
    const parsed = Report.safeParse(report);
    if (!parsed.success) {
      throw new Error(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n"));
    }
    expect(parsed.success).toBe(true);
  });

  it.each(entries)("%s: contains no banned language", (_id, report) => {
    const banned = lintObject(report).filter((v) => v.kind === "banned");
    expect(banned).toEqual([]);
  });

  it.each(entries)("%s: has a matching sample pitch", (id) => {
    expect(getSamplePitch(id)).toBeDefined();
  });
});

describe("kestrel fixture (Tier 2, significant gaps)", () => {
  const report = SAMPLE_REPORTS.kestrel;

  it("lands Tier 2 with 3 of 7 checks met", () => {
    expect(report.verdict.tier).toBe(2);
    expect(report.verdict.checks_met).toEqual({ met: 3, total: 7 });
  });

  it("pins the four hero ledger rows and their results", () => {
    const row = (id: string) => {
      const found = report.ledger.find((r) => r.id === id);
      expect(found, `ledger row ${id} must exist`).toBeDefined();
      return found!;
    };

    const l1 = row("kes-L1");
    expect(l1.result).toBe("OFFICIAL_RECORD_FOUND");
    expect(l1.dimension).toBe("D1");
    expect(l1.evidence_tier).toBe("T1");
    expect(l1.sources[0]?.title).toBe("Ohio Secretary of State business search");

    const l2 = row("kes-L2");
    expect(l2.result).toBe("VERIFIED");
    expect(l2.dimension).toBe("D2");
    expect(l2.evidence_tier).toBe("T1");
    expect(l2.claim_quote).toContain("Fairview Heights");

    const l3 = row("kes-L3");
    expect(l3.result).toBe("CONTRADICTED");
    expect(l3.dimension).toBe("D1");
    expect(l3.evidence_tier).toBe("T1");
    expect(l3.severity).toBe("HIGH");
    expect(l3.claim_quote).toContain("since 2018");

    const l4 = row("kes-L4");
    expect(l4.result).toBe("COULD_NOT_VERIFY");
    expect(l4.dimension).toBe("D6");
    expect(l4.evidence_tier).toBe("T4");
    expect(l4.claim_quote).toContain("93 percent");
  });

  it("quotes only language that appears in the kestrel pitch", () => {
    const pitch = getSamplePitch("kestrel");
    expect(pitch).toBeDefined();
    const pitchLoose = looseText(pitch!.text);
    const quoted = report.ledger.filter((r) => r.claim_quote !== null);
    expect(quoted.length).toBeGreaterThan(0);
    for (const rowWithQuote of quoted) {
      expect(
        pitchLoose,
        `claim_quote of ${rowWithQuote.id} must appear in the pitch`,
      ).toContain(looseText(rowWithQuote.claim_quote!));
    }
  });
});
