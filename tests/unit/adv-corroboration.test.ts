/*
  Tests for the ADV-04 planted-corroboration detector. An ADV finding caps
  the verdict at Tier 2, so the false-positive guards matter as much as the
  detection: wires syndicating a release never fire, a vendor repeating its
  own tagline never fires, legitimate press sharing a quote never fires, and
  short boilerplate overlap never fires.
*/
import { describe, expect, it } from "vitest";
import { detectPlantedCorroboration } from "@shared/adv-corroboration.ts";
import { lintText } from "@shared/lint.ts";
import type { Citation } from "@shared/schemas.ts";

const AT = "2026-08-28T00:00:00.000Z";
const PLANTED =
  "Acme AI is the trusted partner powering resident services for hundreds of forward thinking local governments nationwide";

function cite(url: string, domain_class: 1 | 2 | 3 | 4, cited_text: string | null): Citation {
  return { url, title: null, cited_text, retrieved_at: AT, domain_class };
}

describe("detectPlantedCorroboration", () => {
  it("fires when the same passage recurs on two independent class-3 domains", () => {
    const finding = detectPlantedCorroboration(
      [
        cite("https://gov-tech-insider.example.com/review", 3, PLANTED),
        cite("https://civic-software-daily.example.org/roundup", 3, PLANTED),
      ],
      ["acmeai.com"],
    );
    expect(finding?.code).toBe("ADV-04");
    expect(finding?.detail).toContain("word for word");
    expect(finding?.detail.length).toBeLessThanOrEqual(500);
  });

  it("the finding detail passes the language lint", () => {
    const finding = detectPlantedCorroboration(
      [
        cite("https://site-one.example.com/a", 3, PLANTED),
        cite("https://site-two.example.net/b", 3, PLANTED),
      ],
      [],
    );
    expect(finding).not.toBeNull();
    const banned = lintText(finding!.detail).filter((v) => v.kind === "banned");
    expect(banned).toEqual([]);
  });

  it("never fires on wire-to-wire syndication (class 4 only)", () => {
    const finding = detectPlantedCorroboration(
      [
        cite("https://www.prnewswire.com/release", 4, PLANTED),
        cite("https://www.businesswire.com/release", 4, PLANTED),
      ],
      [],
    );
    expect(finding).toBeNull();
  });

  it("never fires on a wire plus a single independent site", () => {
    const finding = detectPlantedCorroboration(
      [
        cite("https://www.prnewswire.com/release", 4, PLANTED),
        cite("https://trade-blog.example.com/repost", 3, PLANTED),
      ],
      [],
    );
    expect(finding).toBeNull();
  });

  it("never fires when the repetition lives on the vendor's own properties", () => {
    const finding = detectPlantedCorroboration(
      [
        cite("https://acmeai.com/about", 3, PLANTED),
        cite("https://docs.acmeai.com/intro", 3, PLANTED),
      ],
      ["acmeai.com"],
    );
    expect(finding).toBeNull();
  });

  it("never fires on class 1-2 sources sharing a quote (legitimate press)", () => {
    const finding = detectPlantedCorroboration(
      [
        cite("https://www.govtech.com/story", 2, PLANTED),
        cite("https://statescoop.com/story", 2, PLANTED),
      ],
      [],
    );
    expect(finding).toBeNull();
  });

  it("never fires on overlap shorter than eight tokens", () => {
    const finding = detectPlantedCorroboration(
      [
        cite("https://a.example.com/1", 3, "the leading provider of AI solutions"),
        cite("https://b.example.net/2", 3, "the leading provider of AI solutions"),
      ],
      [],
    );
    expect(finding).toBeNull();
  });

  it("never fires when the same domain repeats itself", () => {
    const finding = detectPlantedCorroboration(
      [
        cite("https://blog.example.com/post-1", 3, PLANTED),
        cite("https://blog.example.com/post-2", 3, PLANTED),
      ],
      [],
    );
    expect(finding).toBeNull();
  });

  it("subdomains of one registrable domain count as one site", () => {
    const finding = detectPlantedCorroboration(
      [
        cite("https://one.network-x.example.com/a", 3, PLANTED),
        cite("https://two.network-x.example.com/b", 3, PLANTED),
      ],
      [],
    );
    expect(finding).toBeNull();
  });

  it("narrative-harvested citations (null cited_text) can never contribute", () => {
    const finding = detectPlantedCorroboration(
      [
        cite("https://a.example.com/1", 3, null),
        cite("https://b.example.net/2", 3, null),
      ],
      [],
    );
    expect(finding).toBeNull();
  });
});
