/*
  Tests for the citation harvest: the merge of API citation objects
  (Channel A, retrieved content) and narrative inline URLs (Channel B,
  unfetched). Pins the current merge rules, including two deliberate
  quirks: the cap bounds only Channel B, and trailing `!` / `?` are not
  stripped from narrative URLs.
*/
import { describe, expect, it } from "vitest";
import { type ApiCitation, harvestCitations } from "@shared/harvest.ts";

const AT = "2026-08-28T00:00:00.000Z";

function api(url: string, title: string | null = null, cited: string | null = null): ApiCitation {
  return { url, title, cited_text: cited };
}

function run(citations: ApiCitation[], narrative: string, domains: string[] = [], cap = 40) {
  return harvestCitations({ citations, narrative }, domains, AT, cap);
}

describe("Channel A: API citation passthrough", () => {
  it("preserves title and cited_text and stamps retrieved_at", () => {
    const out = run([api("https://sec.gov/x", "Form D", "filed 2025")], "");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      url: "https://sec.gov/x",
      title: "Form D",
      cited_text: "filed 2025",
      retrieved_at: AT,
    });
  });

  it("classifies by domain in code: .gov suffix -> 1, .edu -> 2, unknown -> 3, PR wire -> 4", () => {
    const out = run(
      [
        api("https://cityofdenver.gov/minutes"),
        api("https://mit.edu/paper"),
        api("https://random-blog.example.com/post"),
        api("https://www.prnewswire.com/release"),
      ],
      "",
    );
    expect(out.map((c) => c.domain_class)).toEqual([1, 2, 3, 4]);
  });

  it("classifies a vendor-controlled URL as 3 even with an official-looking suffix", () => {
    const out = run([api("https://vendor.example.gov/about")], "", ["vendor.example.gov"]);
    expect(out[0].domain_class).toBe(3);
  });

  it("dedupes exact URLs within Channel A, first entry wins", () => {
    const out = run([api("https://a.gov/x", "first"), api("https://a.gov/x", "second")], "");
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("first");
  });
});

describe("Channel B: narrative URL extraction", () => {
  it("harvests plain URLs with null title and cited_text", () => {
    const out = run([], "Found the filing at https://sec.gov/edgar/doc.pdf today.");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      url: "https://sec.gov/edgar/doc.pdf",
      title: null,
      cited_text: null,
      domain_class: 1,
    });
  });

  it("terminates URLs at whitespace, parens, brackets, quotes, and angle brackets", () => {
    const narrative = [
      "(https://a.gov/paren)",
      "[https://b.gov/bracket]",
      '"https://c.gov/quote"',
      "'https://d.gov/single'",
      "<https://e.gov/angle>",
    ].join(" ");
    const out = run([], narrative);
    expect(out.map((c) => c.url)).toEqual([
      "https://a.gov/paren",
      "https://b.gov/bracket",
      "https://c.gov/quote",
      "https://d.gov/single",
      "https://e.gov/angle",
    ]);
  });

  it("strips repeated trailing sentence punctuation", () => {
    const out = run([], "See https://a.gov/page.,; and https://b.gov/other:");
    expect(out.map((c) => c.url)).toEqual(["https://a.gov/page", "https://b.gov/other"]);
  });

  it("keeps trailing ! and ? (pinned quirk: not treated as sentence punctuation)", () => {
    const out = run([], "Look at https://a.gov/search?q=1 now");
    expect(out[0].url).toBe("https://a.gov/search?q=1");
  });

  it("caps URLs at 600 characters after punctuation strip", () => {
    const long = "https://a.gov/" + "x".repeat(700) + ".";
    const out = run([], long);
    expect(out[0].url).toHaveLength(600);
  });

  it("ignores non-http schemes and bare hostnames", () => {
    const out = run([], "ftp://a.gov/file and www.b.gov/page have no scheme match");
    expect(out).toHaveLength(0);
  });

  it("harvests multiple URLs from one line in order", () => {
    const out = run([], "https://a.gov/1 then https://b.gov/2 then https://c.gov/3");
    expect(out.map((c) => c.url)).toEqual([
      "https://a.gov/1",
      "https://b.gov/2",
      "https://c.gov/3",
    ]);
  });
});

describe("cap interplay (pinned quirk: cap bounds only Channel B)", () => {
  const urls = (n: number, prefix: string) =>
    Array.from({ length: n }, (_, i) => `https://${prefix}.gov/${i}`);

  it("Channel A at the cap leaves zero room for narrative URLs", () => {
    const out = run(urls(40, "a").map((u) => api(u)), "https://fresh.gov/new");
    expect(out).toHaveLength(40);
    expect(out.some((c) => c.url === "https://fresh.gov/new")).toBe(false);
  });

  it("Channel A above the cap passes through uncapped", () => {
    const out = run(urls(42, "a").map((u) => api(u)), "https://fresh.gov/new");
    expect(out).toHaveLength(42);
  });

  it("narrative fills only the room the cap leaves, in narrative order", () => {
    const narrative = "https://n.gov/1 https://n.gov/2 https://n.gov/3";
    const out = run(urls(39, "a").map((u) => api(u)), narrative);
    expect(out).toHaveLength(40);
    expect(out[39].url).toBe("https://n.gov/1");
  });
});

describe("cross-channel dedupe", () => {
  it("a narrative URL already cited by Channel A keeps Channel A's metadata", () => {
    const out = run(
      [api("https://a.gov/x", "Real title", "quoted")],
      "Also mentioned at https://a.gov/x today.",
    );
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("Real title");
  });

  it("dedupes when the stripped narrative form matches a Channel A URL", () => {
    const out = run([api("https://a.gov/x")], "See https://a.gov/x. for details");
    expect(out).toHaveLength(1);
  });

  it("dedupes a repeated narrative URL", () => {
    const out = run([], "https://a.gov/x and again https://a.gov/x");
    expect(out).toHaveLength(1);
  });
});

describe("empty inputs", () => {
  it("returns an empty list for no citations and no URLs in narrative", () => {
    expect(run([], "no links here at all")).toEqual([]);
  });
});
