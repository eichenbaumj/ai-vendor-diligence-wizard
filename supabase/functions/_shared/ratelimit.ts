/*
  Rate limiting over the atomic Postgres RPC (see migrations 0001):
  increment_and_check(key, cap) increments the counter for a daily-windowed
  key and returns whether the request is within cap.
*/
import type { SupabaseClient } from "@supabase/supabase-js";

export async function allow(
  supabase: SupabaseClient,
  key: string,
  cap: number,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("increment_and_check", {
    p_key: key,
    p_cap: cap,
  });
  if (error) {
    /* Fail closed on rate-limit infrastructure errors: a broken limiter must
       not become an open faucet on a paid API. */
    console.error(`rate limit rpc error for ${key}: ${error.message}`);
    return false;
  }
  return data === true;
}

export function dayKey(prefix: string, id: string, now = new Date()): string {
  const day = now.toISOString().slice(0, 10);
  return `${prefix}:${id}:${day}`;
}

/* Calendar-month window (UTC), for the verified-government-email quota.
   The prune job in migration 0005 carves govmail:* keys out of the two-day
   sweep so a month's counter survives the whole month. */
export function monthKey(prefix: string, id: string, now = new Date()): string {
  const month = now.toISOString().slice(0, 7);
  return `${prefix}:${id}:${month}`;
}

/*
  Like allow(), but over the counting RPC (increment_and_check_count,
  migration 0005) so the caller can tell the user how many checks remain.
  Returns null on RPC error — callers decide their own failure posture
  (evaluate falls back to the anonymous per-IP path: fail safe, never open).
*/
export async function allowWithRemaining(
  supabase: SupabaseClient,
  key: string,
  cap: number,
): Promise<{ allowed: boolean; remaining: number } | null> {
  const { data, error } = await supabase.rpc("increment_and_check_count", {
    p_key: key,
    p_cap: cap,
  });
  if (error || typeof data !== "number") {
    console.error(
      `rate limit count rpc error for ${key}: ${error?.message ?? "non-numeric result"}`,
    );
    return null;
  }
  return { allowed: data <= cap, remaining: Math.max(0, cap - data) };
}

export async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : (input as unknown as BufferSource),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
