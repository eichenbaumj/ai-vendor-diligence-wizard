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

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
