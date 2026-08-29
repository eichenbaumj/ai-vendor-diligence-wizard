/*
  Tests for name-only domain inference.

  The rule under test: a domain is nominated only from Channel-A citations
  (title/cited_text present) on class 3 hosts whose registrable domain
  covers the vendor's name tokens, with at least two distinct citation URLs
  on the domain. Narrative-harvested URLs, official sources, and press can
  never nominate. Most-cited wins; ties break lexicographically.
*/
import { describe, expect, it } from "vitest";
import {
  inferPrimaryDomain,
  registrableDomain,
} from "@shared/domain-inference.ts";
import type { Citation } from "@shared/schemas.ts";

const AT = "2026-08-28T00:00:00.000Z";

function cite(
  url: string,
  domain_class: 1 | 2 | 3 | 4,
  title: string | null = "Some page title",
): Citation {
  return { url, title, cited_text: null, retrieved_at: AT, domain_class };
}

describe("registrableDomain", () => {
  it("keeps two-label hosts and strips subdomains", () => {
    expect(registrableDomain("acmeai.com")).toBe("acmeai.com");
    expect(registrableDomain("www.acmeai.com")).toBe("acmeai.com");
    expect(registrableDomain("docs.app.acmeai.com")).toBe("acmeai.com");
  });

  it("keeps three labels for two-part country registries", () => {
    expect(registrableDomain("www.acmeai.co.uk")).toBe("acmeai.co.uk");
    expect(registrableDomain("acmeai.com.au")).toBe("acmeai.com.au");
  });
});

describe("inferPrimaryDomain", () => {
  const NAMES = ["Acme AI"];

  it("nominates a class 3 domain with two retrieved citations covering the name", () => {
    const domain = inferPrimaryDomain(
      [
        cite("https://acmeai.com/about", 3),
        cite("https://acmeai.com/customers", 3),
      ],
      NAMES,
    );
    expect(domain).toBe("acmeai.com");
  });

  it("one citation is never enough", () => {
    expect(
      inferPrimaryDomain([cite("https://acmeai.com/about", 3)], NAMES),
    ).toBeNull();
  });

  it("narrative-harvested URLs (no title, no cited_text) never nominate", () => {
    const domain = inferPrimaryDomain(
      [
        cite("https://acmeai.com/about", 3, null),
        cite("https://acmeai.com/customers", 3, null),
      ],
      NAMES,
    );
    expect(domain).toBeNull();
  });

  it("official and press hosts never nominate, even covering the name", () => {
    expect(
      inferPrimaryDomain(
        [
          cite("https://acmeai.gov/a", 1),
          cite("https://acmeai.gov/b", 1),
          cite("https://acmeai-news.com/a", 2),
          cite("https://acmeai-news.com/b", 2),
        ],
        NAMES,
      ),
    ).toBeNull();
  });

  it("a domain that does not cover the vendor name never nominates", () => {
    expect(
      inferPrimaryDomain(
        [
          cite("https://example.com/acme-ai-review", 3),
          cite("https://example.com/acme-ai-pricing", 3),
        ],
        NAMES,
      ),
    ).toBeNull();
  });

  it("subdomains group under the registrable domain", () => {
    const domain = inferPrimaryDomain(
      [
        cite("https://www.acmeai.com/about", 3),
        cite("https://docs.acmeai.com/api", 3),
      ],
      NAMES,
    );
    expect(domain).toBe("acmeai.com");
  });

  it("duplicate URLs count once", () => {
    expect(
      inferPrimaryDomain(
        [
          cite("https://acmeai.com/about", 3),
          cite("https://acmeai.com/about", 3),
        ],
        NAMES,
      ),
    ).toBeNull();
  });

  it("the most-cited qualifying domain wins", () => {
    const domain = inferPrimaryDomain(
      [
        cite("https://acmeai.com/a", 3),
        cite("https://acmeai.com/b", 3),
        cite("https://acmeai.io/a", 3),
        cite("https://acmeai.io/b", 3),
        cite("https://acmeai.io/c", 3),
      ],
      NAMES,
    );
    expect(domain).toBe("acmeai.io");
  });

  it("ties break lexicographically for determinism", () => {
    const domain = inferPrimaryDomain(
      [
        cite("https://acmeai.io/a", 3),
        cite("https://acmeai.io/b", 3),
        cite("https://acmeai.com/a", 3),
        cite("https://acmeai.com/b", 3),
      ],
      NAMES,
    );
    expect(domain).toBe("acmeai.com");
  });

  it("tolerates malformed URLs and empty vendor names", () => {
    expect(
      inferPrimaryDomain([cite("not a url", 3), cite("also-not", 3)], NAMES),
    ).toBeNull();
    expect(
      inferPrimaryDomain(
        [cite("https://acmeai.com/a", 3), cite("https://acmeai.com/b", 3)],
        [],
      ),
    ).toBeNull();
  });
});
