/*
  Cloudflare Turnstile server-side verification. Runs before any Claude call.
  When no secret is configured (local dev), the gate logs and passes —
  production configuration is asserted in the deploy checklist.
*/

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(
  token: string | null,
  secret: string | undefined,
  remoteIp: string | null,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<boolean> {
  if (!secret) {
    console.warn("turnstile: no secret configured; gate open (dev only)");
    return true;
  }
  if (!token) return false;
  try {
    const form = new URLSearchParams({ secret, response: token });
    if (remoteIp) form.set("remoteip", remoteIp);
    const res = await fetchFn(VERIFY_URL, { method: "POST", body: form });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error(`turnstile verify failed: ${String(err)}`);
    return false;
  }
}
