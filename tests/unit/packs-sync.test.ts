/*
  Lock test: the three hand-maintained pack-id lists cannot drift apart.

  1. Object.keys(PACKS)              — generated from packs/*.yaml
  2. PackId.options                  — the zod enum in schemas.ts
  3. CLASSIFY_SCHEMA pack_ids enum   — the S4 structured-output contract

  A new pack (or a rename) must land in all three in the same commit, or
  either the classifier can never select it (schema enum) or the pipeline
  drops it at validation (zod enum).
*/
import { describe, expect, it } from "vitest";
import { PACKS } from "@shared/packs.gen.ts";
import { PackId } from "@shared/schemas.ts";
import { CLASSIFY_SCHEMA } from "@shared/anthropic.ts";

const generatedIds = [...Object.keys(PACKS)].sort();
const zodIds = [...PackId.options].sort();
const classifyIds = [...CLASSIFY_SCHEMA.properties.pack_ids.items.enum].sort();

describe("pack-id lists stay in lockstep", () => {
  it("packs.gen.ts keys match the PackId zod enum (schemas.ts)", () => {
    expect(
      generatedIds,
      "Object.keys(PACKS) and PackId.options diverged. Add or remove the pack id in schemas.ts PackId in the same commit as the packs/*.yaml change.",
    ).toEqual(zodIds);
  });

  it("packs.gen.ts keys match the CLASSIFY_SCHEMA pack_ids enum (anthropic.ts)", () => {
    expect(
      generatedIds,
      "Object.keys(PACKS) and the CLASSIFY_SCHEMA pack_ids enum diverged. Update the enum in anthropic.ts CLASSIFY_SCHEMA in the same commit as the packs/*.yaml change.",
    ).toEqual(classifyIds);
  });

  it("each generated pack's pack_id field matches its record key", () => {
    for (const [key, pack] of Object.entries(PACKS)) {
      expect(pack.pack_id, `PACKS["${key}"].pack_id`).toBe(key);
    }
  });
});
