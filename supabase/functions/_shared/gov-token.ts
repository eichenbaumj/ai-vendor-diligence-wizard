/*
  Stateless credential for the verified-government-email tier. Pure
  platform-agnostic TS (crypto.subtle only) so vitest can import it.

  Format: v1.<emailHash24>.<expEpochSeconds>.<macHex>
  where mac = HMAC-SHA256(secret, "v1.<emailHash24>.<expEpochSeconds>").

  Stateless on purpose: verification needs no table lookup, revocation is
  rotation of the secret, and the credential carries only the email hash —
  never the address. A custom token (NOT a Supabase Auth session) because a
  session would breach the pre-launch password gate in evaluate/index.ts,
  which accepts any valid session.
*/
import { sha256Hex } from "./ratelimit.ts";

const VERSION = "v1";
const HASH_RE = /^[0-9a-f]{24}$/;
const EXP_RE = /^\d{1,12}$/;
const MAC_RE = /^[0-9a-f]{64}$/;

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function mintGovToken(
  emailHash24: string,
  expEpochSeconds: number,
  secret: string,
): Promise<string> {
  if (!secret) throw new Error("gov token secret required");
  const payload = `${VERSION}.${emailHash24}.${expEpochSeconds}`;
  const mac = await hmacHex(secret, payload);
  return `${payload}.${mac}`;
}

/*
  Returns the claimed email hash, or null on ANY defect: malformed token,
  wrong version, expired, bad MAC, or an empty secret (an unset secret must
  read as "nobody is verified", never as "everybody is"). MACs are compared
  by comparing sha256 digests of both values — the constant-time pattern used
  for EVAL_BYPASS_TOKEN in evaluate/index.ts.
*/
export async function verifyGovToken(
  token: string | null,
  secret: string,
  now: Date,
): Promise<{ emailHash24: string } | null> {
  if (!token || !secret) return null;

  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [version, emailHash, expRaw, mac] = parts;
  if (version !== VERSION) return null;
  if (!HASH_RE.test(emailHash) || !EXP_RE.test(expRaw) || !MAC_RE.test(mac)) {
    return null;
  }

  const expEpochSeconds = Number(expRaw);
  if (now.getTime() >= expEpochSeconds * 1000) return null;

  try {
    const expected = await hmacHex(secret, `${VERSION}.${emailHash}.${expRaw}`);
    if ((await sha256Hex(mac)) !== (await sha256Hex(expected))) return null;
  } catch {
    return null;
  }

  return { emailHash24: emailHash };
}
