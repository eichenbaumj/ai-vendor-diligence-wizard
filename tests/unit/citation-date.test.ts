/*
  Publication dates parsed by code from the page address or the search
  tool's page age (methodology 1.8). Best effort, never inferred: a value
  appears only when the input carries one.
*/
import { describe, expect, it } from "vitest";
import {
  publishedDateFor,
  publishedDateFromPageAge,
  publishedDateFromUrl,
} from "@shared/citation-date.ts";

const NOW = new Date("2026-09-02T12:00:00.000Z");
const AT = "2026-09-02T12:00:00.000Z";

describe("publishedDateFromUrl", () => {
  it("reads /YYYY/MM/DD/ and /YYYY/MM/ path segments", () => {
    expect(publishedDateFromUrl("https://www.itnews.com.au/news/2024/03/15/story", NOW)).toBe("2024-03-15");
    expect(publishedDateFromUrl("https://example.org/2024/03/story-title", NOW)).toBe("2024-03");
    expect(publishedDateFromUrl("https://example.org/blog/2019/7/2", NOW)).toBe("2019-07-02");
  });
  it("reads a dashed date inside a segment", () => {
    expect(publishedDateFromUrl("https://example.org/news/2024-03-15-council-vote", NOW)).toBe("2024-03-15");
    expect(publishedDateFromUrl("https://example.org/p/2024-03-15", NOW)).toBe("2024-03-15");
  });
  it("ignores query strings, invalid dates, future dates, and numbers that are not dates", () => {
    expect(publishedDateFromUrl("https://example.org/story?d=2024/03/15", NOW)).toBeNull();
    expect(publishedDateFromUrl("https://example.org/2024/13/01/x", NOW)).toBeNull();
    expect(publishedDateFromUrl("https://example.org/2024/02/30/x", NOW)).toBeNull();
    expect(publishedDateFromUrl("https://example.org/2031/01/01/x", NOW)).toBeNull();
    expect(publishedDateFromUrl("https://example.org/1990/01/01/x", NOW)).toBeNull();
    expect(publishedDateFromUrl("https://example.org/products/2024/", NOW)).toBeNull();
    expect(publishedDateFromUrl("https://example.org/case/0:21-cv-60856", NOW)).toBeNull();
    expect(publishedDateFromUrl("https://sec.gov/Archives/edgar/data/1755112/000175511224000012/x.htm", NOW)).toBeNull();
    expect(publishedDateFromUrl("not a url", NOW)).toBeNull();
  });
});

describe("publishedDateFromPageAge", () => {
  it("reads absolute dates in ISO and month-name forms", () => {
    expect(publishedDateFromPageAge("2025-04-30", AT)).toBe("2025-04-30");
    expect(publishedDateFromPageAge("2025-04-30T08:00:00Z", AT)).toBe("2025-04-30");
    expect(publishedDateFromPageAge("April 30, 2025", AT)).toBe("2025-04-30");
    expect(publishedDateFromPageAge("30 April 2025", AT)).toBe("2025-04-30");
    expect(publishedDateFromPageAge("Sept 9, 2024", AT)).toBe("2024-09-09");
  });
  it("resolves relative phrases against the retrieval time; month and year phrases give a month", () => {
    expect(publishedDateFromPageAge("3 days ago", AT)).toBe("2026-08-30");
    expect(publishedDateFromPageAge("2 weeks ago", AT)).toBe("2026-08-19");
    expect(publishedDateFromPageAge("5 hours ago", AT)).toBe("2026-09-02");
    expect(publishedDateFromPageAge("1 month ago", AT)).toBe("2026-08");
    expect(publishedDateFromPageAge("a year ago", AT)).toBe("2025-09");
  });
  it("returns null for empty, unknown, or impossible input", () => {
    expect(publishedDateFromPageAge(null, AT)).toBeNull();
    expect(publishedDateFromPageAge("", AT)).toBeNull();
    expect(publishedDateFromPageAge("recently", AT)).toBeNull();
    expect(publishedDateFromPageAge("Smarch 1, 2025", AT)).toBeNull();
    expect(publishedDateFromPageAge("2027-01-01", AT)).toBeNull();
    expect(publishedDateFromPageAge("3 days ago", "garbage")).toBeNull();
  });
});

describe("publishedDateFor", () => {
  it("prefers the address, then the page age, then null", () => {
    expect(publishedDateFor("https://x.org/2024/03/15/a", "April 30, 2025", AT)).toBe("2024-03-15");
    expect(publishedDateFor("https://x.org/a", "April 30, 2025", AT)).toBe("2025-04-30");
    expect(publishedDateFor("https://x.org/a", null, AT)).toBeNull();
  });
});
