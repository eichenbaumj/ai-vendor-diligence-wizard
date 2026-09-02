/*
  Request-builder contracts that are load-bearing for methodology 1.7.

  Temperature 0 (extraction determinism) may sit ONLY on the Haiku extract
  builder. Sonnet 5 (research) and Fable 5 (review) reject any sampling
  parameter with a 400 at request time, so a stray temperature there would
  kill every run of that stage. These tests pin both directions.
*/
import { describe, expect, it } from "vitest";
import {
  MODELS,
  STRUCTURE_SCHEMA,
  buildClassifyRequest,
  buildDiscoveryRequest,
  buildExtractRequest,
  buildResearchRequest,
  buildReviewRequest,
  buildStructureRequest,
} from "@shared/anthropic.ts";

describe("buildExtractRequest (S1 pitch extract and S1b site extract)", () => {
  it("runs the Haiku extractor at temperature 0 with the strict schema", () => {
    const req = buildExtractRequest("test source", "Acme AI sells software.");
    expect(req.model).toBe(MODELS.extract);
    expect(req.model).toBe("claude-haiku-4-5");
    expect(req.temperature).toBe(0);
    expect(req.max_tokens).toBe(8192);
    const format = (req.output_config as { format: { type: string } }).format;
    expect(format.type).toBe("json_schema");
    expect(req.tools).toBeUndefined();
  });

  it("carries the source label and the pitch text verbatim in one user message", () => {
    const req = buildExtractRequest("label-x", "verbatim pitch body");
    expect(req.messages).toHaveLength(1);
    expect(req.messages[0].role).toBe("user");
    const body = JSON.parse(req.messages[0].content as string) as { source: string; pitch_text: string };
    expect(body.source).toBe("label-x");
    expect(body.pitch_text).toBe("verbatim pitch body");
  });
});

describe("STRUCTURE_SCHEMA (methodology 1.7)", () => {
  it("has no green_flags field: green flags are code templates over assemble's facts", () => {
    expect(Object.keys(STRUCTURE_SCHEMA.properties)).toEqual(["verdict_summary", "row_notes", "next_steps"]);
    expect((STRUCTURE_SCHEMA.required as readonly string[]).includes("green_flags")).toBe(false);
    expect(STRUCTURE_SCHEMA.additionalProperties).toBe(false);
  });
});

describe("no other builder sets a sampling temperature", () => {
  const s3Input = {
    vendor_name_candidates: ["Acme AI"],
    domains: ["acmeai.example.com"],
    people: [],
    named_customers: [],
    claims: [],
    registry_summary: [],
    user_state: null,
  };

  it("research (Sonnet 5) carries no temperature key", () => {
    const req = buildResearchRequest(s3Input);
    expect(req.model).toBe(MODELS.research);
    expect("temperature" in req).toBe(false);
  });

  it("review (Fable 5) carries no temperature key", () => {
    const req = buildReviewRequest("{}");
    expect(req.model).toBe(MODELS.review);
    expect("temperature" in req).toBe(false);
  });

  it("structure, classify, and discovery carry no temperature key (one variable per observation cycle)", () => {
    const structure = buildStructureRequest({
      tier: 3,
      tier_label: "x",
      rationale: [],
      vendor_display_name: "Acme AI",
      generated_date: "2026-09-01",
      ledger_rows: [],
      green_flag_facts: [],
      sector: { pack_names: [], elevated: false, overlay_reason: null },
      research_partial: false,
    });
    expect("temperature" in structure).toBe(false);
    const classify = buildClassifyRequest({ use_case_description: "x", claims: [], packs: [] });
    expect("temperature" in classify).toBe(false);
    const discovery = buildDiscoveryRequest(["Acme AI"]);
    expect("temperature" in discovery).toBe(false);
  });
});
