/*
  The research collector joins the search tool's page_age onto the
  citations the model actually cited (methodology 1.8). Result blocks never
  add a citation on their own.
*/
import { describe, expect, it } from "vitest";
import { collectResearchContent } from "@shared/anthropic-client.ts";

describe("collectResearchContent", () => {
  it("joins page_age by exact URL and never mints a citation from a result block", () => {
    const out = collectResearchContent([
      {
        type: "web_search_tool_result",
        content: [
          { type: "web_search_result", url: "https://a.example.org/x", title: "A", page_age: "3 days ago" },
          { type: "web_search_result", url: "https://never-cited.example.org/", title: "N", page_age: "2024-01-01" },
          { type: "web_search_result", url: "https://b.example.org/y", title: "B" },
        ],
      },
      {
        type: "text",
        text: "Finding one. ",
        citations: [
          { type: "web_search_result_location", url: "https://a.example.org/x", title: "A", cited_text: "alpha" },
          { type: "web_search_result_location", url: "https://b.example.org/y", title: "B", cited_text: "beta" },
        ],
      },
      { type: "text", text: "Finding two.", citations: [] },
    ]);
    expect(out.narrative).toBe("Finding one. Finding two.");
    expect(out.citations).toEqual([
      { url: "https://a.example.org/x", title: "A", cited_text: "alpha", page_age: "3 days ago" },
      { url: "https://b.example.org/y", title: "B", cited_text: "beta", page_age: null },
    ]);
  });
});
