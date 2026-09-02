/*
  The identity clean-miss note is code-templated (model phrasing inverted
  the coverage fact live). Pin its content and lint-cleanliness for both
  variants: EDGAR searched (the note leads with EDGAR's national coverage)
  and EDGAR unreachable (the note must not claim an EDGAR search).
*/
import { describe, expect, it } from "vitest";
import { identityMissNote } from "../../supabase/functions/_shared/pipeline-tail.ts";
import { lintText } from "../../supabase/functions/_shared/lint.ts";

describe("identityMissNote with EDGAR searched", () => {
  const note = identityMissNote("2026-08-29T12:00:00Z", true);

  it("leads with EDGAR's national coverage and states the state coverage fact the right way around", () => {
    expect(note).toContain("SEC EDGAR");
    expect(note).toContain("every state");
    expect(note).toContain("five state business registries that offer free automated search");
    expect(note).toContain("most states do not offer automated registry search");
    expect(note).not.toMatch(/these .* states do not offer/i);
  });

  it("carries the date and the absence framing", () => {
    expect(note).toContain("2026-08-29");
    expect(note).toContain("not proof the company does not exist");
  });

  it("is lint-clean and inside the note length cap", () => {
    expect(lintText(note).filter((v) => v.kind === "banned")).toEqual([]);
    expect(note.length).toBeLessThanOrEqual(700);
  });
});

describe("identityMissNote with EDGAR unreachable", () => {
  const note = identityMissNote("2026-08-29T12:00:00Z", false);

  it("never claims an EDGAR search that did not run", () => {
    expect(note).not.toMatch(/checked SEC EDGAR/i);
    expect(note).toContain("could not reach SEC EDGAR");
    expect(note).toContain("five state business registries that offer free automated search");
  });

  it("keeps the date and the absence framing", () => {
    expect(note).toContain("2026-08-29");
    expect(note).toContain("not proof the company does not exist");
  });

  it("is lint-clean and inside the note length cap", () => {
    expect(lintText(note).filter((v) => v.kind === "banned")).toEqual([]);
    expect(note.length).toBeLessThanOrEqual(700);
  });
});

/* ------------------------ coverage-limited identity note (v1.4) */

import { identityCoverageLimitedNote } from "../../supabase/functions/_shared/pipeline-tail.ts";
import type { RegistryCheck } from "../../supabase/functions/_shared/schemas.ts";

function sosCheck(id: string, status: RegistryCheck["status"]): RegistryCheck {
  return {
    check_id: id,
    source: `${id} source`,
    status,
    summary: "test",
    evidence_url: null,
    confidence: null,
    retrieved_at: "2026-08-30T00:00:00.000Z",
    data: null,
  };
}

describe("identityCoverageLimitedNote", () => {
  const checks = [
    sosCheck("sos_ny", "definitive_miss"),
    sosCheck("sos_co", "definitive_miss"),
    sosCheck("sos_ct", "definitive_miss"),
    sosCheck("sos_tx", "definitive_miss"),
    sosCheck("sos_or", "definitive_miss"),
    sosCheck("sos_fl", "coverage_limited"),
  ];

  it("names only the states that ran and points unavailable ones at the honesty panel", () => {
    const note = identityCoverageLimitedNote(checks, true, "2026-08-30T00:00:00.000Z");
    expect(note).toContain("New York, Colorado, Connecticut, Texas, Oregon");
    expect(note).toContain("Florida could not be checked this run");
    expect(note).toContain("SEC EDGAR");
    expect(note).toContain("not proof the company does not exist");
    expect(note.length).toBeLessThanOrEqual(700);
    expect(lintText(note).filter((v) => v.kind === "banned")).toEqual([]);
    expect(note).not.toContain("—");
  });

  it("never claims an EDGAR search that did not run", () => {
    const note = identityCoverageLimitedNote(checks, false, "2026-08-30T00:00:00.000Z");
    expect(note).toContain("could not reach SEC EDGAR");
    expect(note).not.toContain("We checked SEC EDGAR");
  });

  it("a full registry outage says so instead of claiming searches", () => {
    const allDown = checks.map((c) => ({ ...c, status: "error" as const }));
    const note = identityCoverageLimitedNote(allDown, false, "2026-08-30T00:00:00.000Z");
    expect(note).toContain("could not reach the state business registries");
    expect(note).not.toContain("did not find a registered entity");
  });
});
