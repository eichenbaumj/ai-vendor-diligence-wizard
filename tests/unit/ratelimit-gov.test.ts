/*
  Tests for the monthly-window rate-limit helpers behind the verified
  government tier. The UTC month boundary matters: the reset promise in the
  user-facing copy ("resets on the first of the month") is UTC, and a key
  that rolled at local midnight would double-count or reset early.
*/
import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { allowWithRemaining, monthKey } from "@shared/ratelimit.ts";

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
