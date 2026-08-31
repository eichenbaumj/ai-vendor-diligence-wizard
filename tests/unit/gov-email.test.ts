/*
  Tests for the government-email normalization and domain policy behind the
  verified quota tier. The policy is strict on purpose: .gov/.mil as the
  FINAL label only (foo.gov.com must never pass), ASCII-only shapes, and the
  staging extraDomains list honored only when explicitly passed.
*/
import { describe, expect, it } from "vitest";
import {
  emailHash24,
  isAllowedGovDomain,
  normalizeGovEmail,
} from "@shared/gov-email.ts";

describe("normalizeGovEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeGovEmail("  Jane.Doe@CI.Springfield.GOV  ")).toBe(
      "jane.doe@ci.springfield.gov",
    );
  });

  it("strips the +tag from the local part", () => {
    expect(normalizeGovEmail("jane+intake@springfield.gov")).toBe(
      "jane@springfield.gov",
    );
  });

  it("keeps dots in the local part (no provider dot folding)", () => {
    expect(normalizeGovEmail("first.last+tag@army.mil")).toBe("first.last@army.mil");
  });

  it("accepts a plain two-label address", () => {
    expect(normalizeGovEmail("a@b.gov")).toBe("a@b.gov");
  });

  it("rejects empty and whitespace-only input", () => {
    expect(normalizeGovEmail("")).toBeNull();
    expect(normalizeGovEmail("   ")).toBeNull();
  });

  it("rejects input without exactly one @", () => {
    expect(normalizeGovEmail("no-at-sign.gov")).toBeNull();
    expect(normalizeGovEmail("two@@signs.gov")).toBeNull();
    expect(normalizeGovEmail("a@b@c.gov")).toBeNull();
  });

  it("rejects a missing local part or domain", () => {
    expect(normalizeGovEmail("@springfield.gov")).toBeNull();
    expect(normalizeGovEmail("jane@")).toBeNull();
  });

  it("rejects a single-label domain", () => {
    expect(normalizeGovEmail("x@gov")).toBeNull();
  });

  it("rejects non-ASCII characters", () => {
    expect(normalizeGovEmail("josé@ciudad.gov")).toBeNull();
    expect(normalizeGovEmail("jane@ciudád.gov")).toBeNull();
  });

  it("rejects addresses over 254 characters", () => {
    const long = `${"a".repeat(250)}@b.gov`;
    expect(normalizeGovEmail(long)).toBeNull();
  });

  it("rejects spaces inside the address", () => {
    expect(normalizeGovEmail("jane doe@springfield.gov")).toBeNull();
  });
});

describe("isAllowedGovDomain", () => {
  it("accepts .gov with one label before it", () => {
    expect(isAllowedGovDomain("x@a.gov", [])).toBe(true);
  });

  it("accepts nested .gov subdomains", () => {
    expect(isAllowedGovDomain("x@ci.springfield.gov", [])).toBe(true);
    expect(isAllowedGovDomain("x@ci.town.gov", [])).toBe(true);
  });

  it("accepts .mil", () => {
    expect(isAllowedGovDomain("x@army.mil", [])).toBe(true);
  });

  it("rejects bare gov (no label before the final label)", () => {
    expect(isAllowedGovDomain("x@gov", [])).toBe(false);
  });

  it("rejects gov as a non-final label (the classic spoof)", () => {
    expect(isAllowedGovDomain("x@foo.gov.com", [])).toBe(false);
  });

  it("rejects commercial domains", () => {
    expect(isAllowedGovDomain("x@gmail.com", [])).toBe(false);
  });

  it("rejects empty input", () => {
    expect(isAllowedGovDomain("", [])).toBe(false);
  });

  it("rejects non-ASCII domains regardless of suffix", () => {
    expect(isAllowedGovDomain("x@ciudád.gov", [])).toBe(false);
  });

  it("honors extraDomains only when passed, matched exactly and lowercased", () => {
    expect(isAllowedGovDomain("x@staging.example.org", [])).toBe(false);
    expect(isAllowedGovDomain("x@staging.example.org", ["staging.example.org"])).toBe(true);
    expect(isAllowedGovDomain("x@staging.example.org", ["Staging.Example.Org"])).toBe(true);
    /* Exact match only — no suffix matching on the extras list. */
    expect(isAllowedGovDomain("x@sub.staging.example.org", ["staging.example.org"])).toBe(false);
  });
});

describe("emailHash24", () => {
  it("returns 24 lowercase hex chars, deterministically", async () => {
    const a = await emailHash24("jane@springfield.gov");
    const b = await emailHash24("jane@springfield.gov");
    expect(a).toMatch(/^[0-9a-f]{24}$/);
    expect(a).toBe(b);
  });

  it("differs across addresses", async () => {
    const a = await emailHash24("jane@springfield.gov");
    const b = await emailHash24("john@springfield.gov");
    expect(a).not.toBe(b);
  });
});
