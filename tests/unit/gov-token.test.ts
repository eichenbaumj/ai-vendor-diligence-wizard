/*
  Tests for the stateless government-email credential. The invariant: verify
  returns the email hash ONLY for a token this secret minted, inside its
  lifetime, byte-for-byte intact. Everything else is null — including an
  empty secret, which must read as "nobody is verified".
*/
import { describe, expect, it } from "vitest";
import { mintGovToken, verifyGovToken } from "@shared/gov-token.ts";

const SECRET = "test-secret-for-gov-tokens";
const HASH = "abcdef0123456789abcdef01";
const NOW = new Date("2026-08-31T12:00:00Z");
const FUTURE = Math.floor(NOW.getTime() / 1000) + 3600;
const PAST = Math.floor(NOW.getTime() / 1000) - 3600;

describe("mintGovToken", () => {
  it("produces the v1 four-part format with a 64-hex MAC", async () => {
    const token = await mintGovToken(HASH, FUTURE, SECRET);
    expect(token).toMatch(new RegExp(`^v1\\.${HASH}\\.${FUTURE}\\.[0-9a-f]{64}$`));
  });

  it("refuses an empty secret", async () => {
    await expect(mintGovToken(HASH, FUTURE, "")).rejects.toThrow();
  });
});

describe("verifyGovToken", () => {
  it("round trips a freshly minted token", async () => {
    const token = await mintGovToken(HASH, FUTURE, SECRET);
    expect(await verifyGovToken(token, SECRET, NOW)).toEqual({ emailHash24: HASH });
  });

  it("rejects an expired token", async () => {
    const token = await mintGovToken(HASH, PAST, SECRET);
    expect(await verifyGovToken(token, SECRET, NOW)).toBeNull();
  });

  it("rejects a token at its exact expiry instant", async () => {
    const exp = Math.floor(NOW.getTime() / 1000);
    const token = await mintGovToken(HASH, exp, SECRET);
    expect(await verifyGovToken(token, SECRET, NOW)).toBeNull();
  });

  it("rejects a tampered email hash", async () => {
    const token = await mintGovToken(HASH, FUTURE, SECRET);
    const other = "ffffff0123456789abcdef01";
    const tampered = token.replace(HASH, other);
    expect(await verifyGovToken(tampered, SECRET, NOW)).toBeNull();
  });

  it("rejects a tampered expiry", async () => {
    const token = await mintGovToken(HASH, FUTURE, SECRET);
    const tampered = token.replace(`.${FUTURE}.`, `.${FUTURE + 999_999}.`);
    expect(tampered).not.toBe(token);
    expect(await verifyGovToken(tampered, SECRET, NOW)).toBeNull();
  });

  it("rejects a tampered MAC", async () => {
    const token = await mintGovToken(HASH, FUTURE, SECRET);
    const macStart = token.lastIndexOf(".") + 1;
    const macChar = token[macStart];
    const flipped = macChar === "0" ? "1" : "0";
    const tampered = token.slice(0, macStart) + flipped + token.slice(macStart + 1);
    expect(await verifyGovToken(tampered, SECRET, NOW)).toBeNull();
  });

  it("rejects a token minted with a different secret", async () => {
    const token = await mintGovToken(HASH, FUTURE, "some-other-secret");
    expect(await verifyGovToken(token, SECRET, NOW)).toBeNull();
  });

  it("rejects a wrong version", async () => {
    const token = await mintGovToken(HASH, FUTURE, SECRET);
    expect(await verifyGovToken(token.replace(/^v1\./, "v2."), SECRET, NOW)).toBeNull();
  });

  it("rejects malformed tokens", async () => {
    for (const bad of [
      "",
      "v1",
      "v1.x",
      `v1.${HASH}.${FUTURE}`,
      `v1.${HASH}.${FUTURE}.zzzz`,
      `v1.short.${FUTURE}.${"a".repeat(64)}`,
      `v1.${HASH}.notanumber.${"a".repeat(64)}`,
      `v1.${HASH}.${FUTURE}.${"a".repeat(64)}.extra`,
    ]) {
      expect(await verifyGovToken(bad, SECRET, NOW), bad).toBeNull();
    }
  });

  it("rejects a null token", async () => {
    expect(await verifyGovToken(null, SECRET, NOW)).toBeNull();
  });

  it("rejects any token when the secret is empty", async () => {
    const token = await mintGovToken(HASH, FUTURE, SECRET);
    expect(await verifyGovToken(token, "", NOW)).toBeNull();
  });
});
