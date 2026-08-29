/*
  Tests for the quantized research budget: exactly two buckets, keyed on the
  number of named customers, so the cross-run prompt cache splits at most
  once. The budget also rides the S3 user message so the model can pace.
*/
import { describe, expect, it } from "vitest";
import { buildResearchRequest, researchBudget, researchTools } from "@shared/anthropic.ts";
import type { S3UserInput } from "@shared/prompts/s3-research.ts";

function input(customers: number): S3UserInput {
  return {
    vendor_name_candidates: ["Acme AI"],
    domains: ["acmeai.example.com"],
    people: [],
    named_customers: Array.from({ length: customers }, (_, i) => `City ${i}`),
    claims: [],
    registry_summary: [],
    user_state: null,
  };
}

describe("researchBudget", () => {
  it("standard bucket below four named customers", () => {
    expect(researchBudget(input(0))).toEqual({ searches: 12, fetches: 6 });
    expect(researchBudget(input(3))).toEqual({ searches: 12, fetches: 6 });
  });

  it("extended bucket at four or more named customers", () => {
    expect(researchBudget(input(4))).toEqual({ searches: 20, fetches: 8 });
    expect(researchBudget(input(7))).toEqual({ searches: 20, fetches: 8 });
  });

  it("exactly two buckets exist across 0..15 customers", () => {
    const buckets = new Set(
      Array.from({ length: 16 }, (_, n) => JSON.stringify(researchBudget(input(n)))),
    );
    expect(buckets.size).toBe(2);
  });
});

describe("buildResearchRequest budget wiring", () => {
  it("tool max_uses carry the bucket and the user turn names the budget", () => {
    const req = buildResearchRequest(input(5));
    const tools = req.tools as { name: string; max_uses: number }[];
    expect(tools.find((t) => t.name === "web_search")?.max_uses).toBe(20);
    expect(tools.find((t) => t.name === "web_fetch")?.max_uses).toBe(8);
    const userContent = String(req.messages[0].content);
    expect(userContent).toContain('"search_budget": 20');
  });

  it("the system prompt is byte-identical across buckets (cache-stable)", () => {
    const std = buildResearchRequest(input(1));
    const ext = buildResearchRequest(input(6));
    expect(JSON.stringify(std.system)).toBe(JSON.stringify(ext.system));
  });

  it("researchTools output is deterministic for a bucket", () => {
    expect(JSON.stringify(researchTools({ searches: 12, fetches: 6 }))).toBe(
      JSON.stringify(researchTools({ searches: 12, fetches: 6 })),
    );
  });
});

describe("buildDiscoveryRequest", () => {
  it("uses the cheap model, two basic searches, and never a format schema", async () => {
    const { buildDiscoveryRequest, MODELS } = await import("@shared/anthropic.ts");
    const req = buildDiscoveryRequest(["TrueTax by Govra", "Govra"]);
    expect(req.model).toBe(MODELS.extract);
    const tool = (req.tools as { type: string; max_uses: number }[])[0];
    expect(tool.type).toBe("web_search_20250305");
    expect(tool.max_uses).toBe(2);
    expect(req.output_config).toBeUndefined();
    expect(JSON.stringify(req.messages)).toContain("Govra");
  });
});

describe("budget override and deep-mode config", () => {
  it("buildResearchRequest honors an override; two buckets absent one", async () => {
    const { buildResearchRequest, DEEP_MODE } = await import("@shared/anthropic.ts");
    const input = {
      vendor_name_candidates: ["Acme"],
      domains: [],
      people: [],
      named_customers: [],
      claims: [],
      registry_summary: [],
      user_state: null,
    };
    const std = buildResearchRequest(input);
    const stdTool = (std.tools as { max_uses: number }[])[0];
    expect(stdTool.max_uses).toBe(12);
    const over = buildResearchRequest(input, { searches: 32, fetches: 12 });
    const overTool = (over.tools as { max_uses: number }[])[0];
    expect(overTool.max_uses).toBe(32);
    /* Deep lanes share one tool-array shape via perLane. */
    expect(DEEP_MODE.lanes.length).toBe(4);
    expect(DEEP_MODE.perLane.searches * DEEP_MODE.lanes.length).toBeGreaterThanOrEqual(40);
    const lane = buildResearchRequest(
      { ...input, objective_focus: DEEP_MODE.lanes[0].focus },
      DEEP_MODE.perLane,
    );
    expect(JSON.stringify(lane.messages)).toContain("Objective 1 ONLY");
  });
});
