/*
  Tests for the domain-authority taxonomy. Class assignment lives in code,
  not model judgment: Class 1 verifies, Class 2 corroborates, Class 3 is
  self-attestation, Class 4 is PR-wire noise that can never raise confidence.
*/
import { describe, expect, it } from "vitest";
import {
  BLOCKED_SEARCH_DOMAINS,
  canVerify,
  classifyDomain,
  isVendorHost,
} from "@shared/domain-classes.ts";

describe("isVendorHost: the vendor's own pages by host", () => {
  const domains = ["AcmeAI.example.com", "www.acme-ai.example.net", " ", ""];
  it("matches the host and its subdomains, www stripped on both sides", () => {
    expect(isVendorHost("https://acmeai.example.com/x", domains)).toBe(true);
    expect(isVendorHost("https://www.acmeai.example.com/x", domains)).toBe(true);
    expect(isVendorHost("https://trust.acmeai.example.com/", domains)).toBe(true);
    expect(isVendorHost("https://acme-ai.example.net/blog", domains)).toBe(true);
  });
  it("never matches a lookalike, a suffix overlap, or an unparseable URL", () => {
    expect(isVendorHost("https://notacmeai.example.com/", domains)).toBe(false);
    expect(isVendorHost("https://acmeai.example.com.evil.test/", domains)).toBe(false);
    expect(isVendorHost("https://www.itnews.com.au/acmeai", domains)).toBe(false);
    expect(isVendorHost("not a url", domains)).toBe(false);
    expect(isVendorHost("https://acmeai.example.com/", [])).toBe(false);
  });
  it("classifyDomain agrees: a vendor host is class 3 whatever its TLD", () => {
    expect(classifyDomain("https://acmeai.example.gov/", ["acmeai.example.gov"])).toBe(3);
  });
});

describe("classifyDomain: Class 1 (official / registry)", () => {
  const class1 = [
    "https://sam.gov/entity/ABC123",
    "https://www.sam.gov/search?q=vendor",
    "https://alpha.sam.gov/anything/at/all",
    "https://sec.gov/edgar/browse",
    "https://sos.state.tx.us/corp/search",
    "https://www.cityofdenver.gov/procurement",
    "https://contracts.army.mil/awards",
    "https://courtlistener.com/opinion/12345",
    "https://marketplace.fedramp.gov/products",
  ];
  for (const url of class1) {
    it(`${url} -> 1`, () => {
      expect(classifyDomain(url)).toBe(1);
    });
  }
});

describe("classifyDomain: .us is an open TLD, not a government suffix (v1.6)", () => {
  it("locality-namespace .us hosts stay class 1", () => {
    for (const url of [
      "https://sos.state.tx.us/corp/search",
      "https://www.naperville.il.us/2026-news-articles/",
      "https://ci.shakopee.mn.us/agenda",
      "https://tx.us/",
      "https://www.fs.fed.us/",
      "https://ho-chunk.nsn.us/",
    ]) {
      expect(classifyDomain(url), url).toBe(1);
    }
  });

  it("a bare commercial .us domain is class 3, never official", () => {
    /* polco.us is a company's own website: treating it as class 1 both
       blocked it from ever being discovered as the vendor's site and let
       its self-published pages count as verification-grade sources. */
    for (const url of [
      "https://polco.us/",
      "https://blog.polco.us/some-case-study",
      "https://info.polco.us/about",
      "https://anything.us/page",
    ]) {
      expect(classifyDomain(url), url).toBe(3);
    }
  });

  it("the documented tradeoff: a locality outside the namespace reads unknown", () => {
    /* Honest miss over false credit: losalamosnm.us is a real county but
       shares its shape with any commercial .us registration. */
    expect(
      classifyDomain("https://www.losalamosnm.us/News-articles/survey"),
    ).toBe(3);
  });
});

describe("classifyDomain: Class 2 (independent press / academic / archive)", () => {
  it("statescoop.com -> 2", () => {
    expect(classifyDomain("https://statescoop.com/some-article")).toBe(2);
  });

  it("subdomains inherit: news.reuters.com -> 2", () => {
    expect(classifyDomain("https://news.reuters.com/tech/story")).toBe(2);
  });

  it("national business and metro newsrooms are class 2", () => {
    for (const url of [
      "https://www.cnbc.com/video/2024/02/28/opengov-ceo.html",
      "https://www.sfchronicle.com/sf/article/contract-story.html",
      "https://sfstandard.com/2026/05/13/permitting-story",
      "https://www.seattletimes.com/seattle-news/story",
      "https://www.texastribune.org/2026/story/",
    ]) {
      expect(classifyDomain(url), url).toBe(2);
    }
  });

  it("crowd-edited and self-submitted profiles stay class 3", () => {
    for (const url of [
      "https://en.wikipedia.org/wiki/OpenGov",
      "https://www.crunchbase.com/person/nate-levine",
    ]) {
      expect(classifyDomain(url), url).toBe(3);
    }
  });

  it(".edu -> 2", () => {
    expect(classifyDomain("https://cs.stanford.edu/research/paper")).toBe(2);
    expect(classifyDomain("https://osu.edu/news")).toBe(2);
  });

  it("web.archive.org -> 2", () => {
    expect(classifyDomain("https://web.archive.org/web/2024/https://x.com")).toBe(2);
  });
});

describe("classifyDomain: Class 3 (vendor-controlled or unknown)", () => {
  it("an unknown commercial domain -> 3", () => {
    expect(classifyDomain("https://unknown-vendor.com/about")).toBe(3);
  });

  it("the vendor's own domain -> 3 even when it appears on an authority list", () => {
    /* A vendor domain always reads as self-attestation, whatever its TLD or
       list membership. */
    expect(
      classifyDomain("https://statescoop.com/press-release", ["statescoop.com"]),
    ).toBe(3);
    expect(
      classifyDomain("https://prnewswire.com/story", ["prnewswire.com"]),
    ).toBe(3);
  });

  it("subdomains of a vendor domain -> 3", () => {
    expect(
      classifyDomain("https://blog.acmegov.ai/customers", ["acmegov.ai"]),
    ).toBe(3);
  });

  it("vendor domains match case-insensitively and with www. stripped", () => {
    expect(
      classifyDomain("https://www.acmegov.ai/security", ["WWW.AcmeGov.AI"]),
    ).toBe(3);
  });

  it("an invalid URL -> 3", () => {
    expect(classifyDomain("not a url")).toBe(3);
    expect(classifyDomain("")).toBe(3);
  });
});

describe("classifyDomain: Class 4 (PR wires and self-publishing)", () => {
  const class4 = [
    "https://prnewswire.com/releases/vendor-announces-thing",
    "https://www.prnewswire.com/releases/another",
    "https://medium.com/@founder/our-journey",
    "https://linkedin.com/company/vendor/posts",
    "https://www.linkedin.com/pulse/article",
    "https://businesswire.com/news/home/x",
  ];
  for (const url of class4) {
    it(`${url} -> 4`, () => {
      expect(classifyDomain(url)).toBe(4);
    });
  }

  it("every blocked search domain classifies as 4", () => {
    for (const d of BLOCKED_SEARCH_DOMAINS) {
      expect(classifyDomain(`https://${d}/anything`)).toBe(4);
    }
  });
});

describe("classifyDomain: www. stripping", () => {
  it("strips a leading www. before matching", () => {
    expect(classifyDomain("https://www.statescoop.com/article")).toBe(2);
    expect(classifyDomain("https://www.sec.gov/filing")).toBe(1);
  });

  it("does not strip www from the middle of a hostname", () => {
    /* wwwexample.com is just an unknown host. */
    expect(classifyDomain("https://wwwexample.com/page")).toBe(3);
  });
});

describe("canVerify", () => {
  it("true only for Classes 1 and 2", () => {
    expect(canVerify(1)).toBe(true);
    expect(canVerify(2)).toBe(true);
    expect(canVerify(3)).toBe(false);
    expect(canVerify(4)).toBe(false);
  });

  it("composes with classifyDomain: only official and press URLs can verify", () => {
    expect(canVerify(classifyDomain("https://sam.gov/entity/X"))).toBe(true);
    expect(canVerify(classifyDomain("https://apnews.com/article/y"))).toBe(true);
    expect(canVerify(classifyDomain("https://unknown-vendor.com"))).toBe(false);
    expect(canVerify(classifyDomain("https://prnewswire.com/z"))).toBe(false);
  });
});
