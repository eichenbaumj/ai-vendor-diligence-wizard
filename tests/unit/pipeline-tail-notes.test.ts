/*
  The identity clean-miss note is code-templated (model phrasing inverted
  the coverage fact live). Pin its content and lint-cleanliness.
*/
import { describe, expect, it } from "vitest";
import { identityMissNote } from "../../supabase/functions/_shared/pipeline-tail.ts";
import { lintText } from "../../supabase/functions/_shared/lint.ts";

describe("identityMissNote", () => {
  const note = identityMissNote("2026-08-29T12:00:00Z");

  it("states the coverage fact the right way around", () => {
    expect(note).toContain("registries that offer free automated search");
    expect(note).toContain("Most states do not offer automated registry search");
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
