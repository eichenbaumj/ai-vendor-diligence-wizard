/*
  Tests for the monthly-window rate-limit helpers behind the verified
  government tier. The UTC month boundary matters: the reset promise in the
  user-facing copy ("resets on the first of the month") is UTC, and a key
  that rolled at local midnight would double-count or reset early.
*/
import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { allowWithRemaining, monthKey, parseExemptIpHashes } from "@shared/ratelimit.ts";

describe("monthKey", () => {
  it("formats prefix:id:YYYY-MM in UTC", () => {
    expect(monthKey("govmail", "abc123", new Date("2026-08-31T12:00:00Z"))).toBe(
      "govmail:abc123:2026-08",
    );
  });

  it("keeps the old month one second before the UTC boundary", () => {
    expect(monthKey("govmail", "abc", new Date("2025-12-31T23:59:59Z"))).toBe(
      "govmail:abc:2025-12",
    );
  });

  it("rolls to the new month just after the UTC boundary", () => {
    expect(monthKey("govmail", "abc", new Date("2026-01-01T00:00:01Z"))).toBe(
      "govmail:abc:2026-01",
    );
  });
});

/* A stub Supabase client: only .rpc is exercised. */
function stubClient(result: { data: unknown; error: { message: string } | null }): SupabaseClient {
  return {
    rpc: async (_fn: string, _args: unknown) => result,
  } as unknown as SupabaseClient;
}

describe("allowWithRemaining", () => {
  it("reports allowed with the remaining count under the cap", async () => {
    const out = await allowWithRemaining(stubClient({ data: 5, error: null }), "k", 20);
    expect(out).toEqual({ allowed: true, remaining: 15 });
  });

  it("the final allowed request leaves zero remaining", async () => {
    const out = await allowWithRemaining(stubClient({ data: 20, error: null }), "k", 20);
    expect(out).toEqual({ allowed: true, remaining: 0 });
  });

  it("refuses over the cap, clamping remaining at zero", async () => {
    const out = await allowWithRemaining(stubClient({ data: 21, error: null }), "k", 20);
    expect(out).toEqual({ allowed: false, remaining: 0 });
  });

  it("returns null on an RPC error (caller decides the failure posture)", async () => {
    const out = await allowWithRemaining(
      stubClient({ data: null, error: { message: "boom" } }),
      "k",
      20,
    );
    expect(out).toBeNull();
  });

  it("returns null on a non-numeric result", async () => {
    const out = await allowWithRemaining(stubClient({ data: "5", error: null }), "k", 20);
    expect(out).toBeNull();
  });
});

describe("parseExemptIpHashes: the owner/reviewer exemption list", () => {
  it("parses a comma-separated list of 24-hex hashes", () => {
    const set = parseExemptIpHashes(
      "378fa843493c53d4196431ae, 61C9BB4F0C47287BCBC5CB8E",
    );
    expect(set.has("378fa843493c53d4196431ae")).toBe(true);
    /* case-insensitive: hashes normalize to lowercase */
    expect(set.has("61c9bb4f0c47287bcbc5cb8e")).toBe(true);
    expect(set.size).toBe(2);
  });

  it("rejects anything that is not a 24-character hash (no raw IPs)", () => {
    const set = parseExemptIpHashes("203.0.113.7, not-a-hash, deadbeef, ");
    expect(set.size).toBe(0);
  });

  it("an unset secret exempts nobody", () => {
    expect(parseExemptIpHashes(undefined).size).toBe(0);
    expect(parseExemptIpHashes("").size).toBe(0);
    expect(parseExemptIpHashes(null).size).toBe(0);
  });
});
