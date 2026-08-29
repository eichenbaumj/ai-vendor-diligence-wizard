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
