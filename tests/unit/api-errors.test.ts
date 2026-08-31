/*
  Tests for the backend-error copy map. The regression that motivated it:
  the backend's machine code "rate_limited" rendered verbatim as the bold
  error headline. No machine code may ever reach the user.
*/
import { describe, expect, it } from "vitest";
import { mapApiError } from "../../src/lib/api-errors";

const EVALUATE_CODES: [number, string][] = [
  [405, "method"],
  [503, "not configured"],
  [400, "input_kind must be paste, name, pdf, or url"],
  [400, "upload a PDF smaller than 6 MB"],
  [400, "this PDF has no selectable text, paste the pitch text instead"],
  [400, "submit a full https web address"],
  [400, "that address is not one we can fetch"],
  [400, "that page could not be fetched"],
  [400, "paste between 40 and 40,000 characters"],
  [400, "vendor name between 2 and 160 characters"],
  [400, "client_token required"],
  [403, "verification failed, reload and retry"],
  [429, "rate_limited"],
  [503, "capacity"],
  [500, "storage"],
];

describe("mapApiError", () => {
  it("maps every known evaluate code to human copy (no raw codes, no underscores)", () => {
    for (const [status, code] of EVALUATE_CODES) {
      const out = mapApiError({ status, code, surface: "evaluate" });
      expect(out.headline, code).not.toBe(code);
      expect(out.headline, code).not.toMatch(/_/);
      expect(out.headline, code).toMatch(/\.$/);
    }
  });

  it("rate_limited passes the backend retry hint through", () => {
    const out = mapApiError({
      status: 429,
      code: "rate_limited",
      retryHint: "Daily limit reached. Come back after midnight UTC.",
      surface: "evaluate",
    });
    expect(out.headline).toBe("You have reached the limit for now.");
    expect(out.hint).toBe("Daily limit reached. Come back after midnight UTC.");
  });

  it("rate_limited falls back to a friendly hint without one", () => {
    const out = mapApiError({ status: 429, code: "rate_limited", surface: "evaluate" });
    expect(out.hint).toMatch(/try again/i);
  });

  it("session_limit passes chat detail through", () => {
    const out = mapApiError({
      status: 429,
      code: "session_limit",
      retryHint: "This report used its 10 questions.",
      surface: "chat",
    });
    expect(out.headline).toBe("This report has used all its questions.");
    expect(out.hint).toBe("This report used its 10 questions.");
  });

  it("chat upstream detail is suppressed (raw provider text must never render)", () => {
    const out = mapApiError({
      status: 502,
      code: "upstream",
      retryHint: "anthropic 529 overloaded: raw provider dump",
      surface: "chat",
    });
    expect(out.hint).toBe("Please ask again in a moment.");
    expect(JSON.stringify(out)).not.toContain("529");
  });

  it("403 verification maps to the re-verify copy", () => {
    const out = mapApiError({
      status: 403,
      code: "verification failed, reload and retry",
      surface: "evaluate",
    });
    expect(out.headline).toBe("We could not confirm your browser.");
    expect(out.hint).toMatch(/new security check/);
  });

  it("unknown sentence-shaped values pass through, normalized to a headline", () => {
    const out = mapApiError({
      status: 400,
      code: "the pitch must name a company we can look up",
      surface: "evaluate",
    });
    expect(out.headline).toBe("The pitch must name a company we can look up.");
  });

  it("unknown short tokens fall back to the status generic, never rendering the code", () => {
    const out = mapApiError({ status: 500, code: "zorp", surface: "evaluate" });
    expect(out.headline).toBe("Something went wrong on our side.");
    const out429 = mapApiError({ status: 429, code: "zorp", surface: "evaluate" });
    expect(out429.headline).toBe("You have reached the limit for now.");
  });

  it("get-evaluation failures use the load copy", () => {
    const out = mapApiError({ status: 500, code: "storage", surface: "get-evaluation" });
    expect(out.headline).toBe("Could not load this check.");
  });

  it("missing code falls back by status tier", () => {
    const out = mapApiError({ status: 503, surface: "evaluate" });
    expect(out.headline).toBe("Something went wrong on our side.");
  });
});

describe("dispute surface", () => {
  it("maps the validation sentence to its friendly copy", () => {
    const out = mapApiError({
      status: 400,
      code: "vendor, work email, the disputed item, and your statement are required",
      surface: "dispute",
    });
    expect(out.headline).toBe("The dispute is missing something.");
    expect(out.hint).toContain("work email");
  });

  it("maps verification failure to browser-confirm copy", () => {
    const out = mapApiError({ status: 403, code: "verification failed", surface: "dispute" });
    expect(out.headline).toBe("We could not confirm your browser.");
  });

  it("rate limit and storage point at the email fallback", () => {
    expect(
      mapApiError({ status: 429, code: "rate_limited", surface: "dispute" }).hint,
    ).toContain("disputes@group17a.com");
    expect(
      mapApiError({ status: 500, code: "storage", surface: "dispute" }).hint,
    ).toContain("disputes@group17a.com");
  });

  it("unknown short tokens fall back to the dispute generic", () => {
    const out = mapApiError({ status: 400, code: "zorp", surface: "dispute" });
    expect(out.headline).toBe("The dispute could not be sent.");
  });
});

describe("gov verification surfaces", () => {
  it("request-code rate limit passes the backend hint through", () => {
    const out = mapApiError({
      status: 429,
      code: "rate_limited",
      retryHint: "Too many code requests for now. Try again tomorrow.",
      surface: "gov-request-code",
    });
    expect(out.headline).toBe("You have reached the limit for code requests.");
    expect(out.hint).toBe("Too many code requests for now. Try again tomorrow.");
  });

  it("request-code rate limit falls back to a friendly hint without one", () => {
    const out = mapApiError({ status: 429, code: "rate_limited", surface: "gov-request-code" });
    expect(out.hint).toMatch(/try again/i);
  });

  it("verify-code rate limit uses its own copy", () => {
    const out = mapApiError({ status: 429, code: "rate_limited", surface: "gov-verify-code" });
    expect(out.headline).toBe("You have reached the limit for code attempts.");
  });

  it("the domain-policy sentence passes through verbatim", () => {
    const sentence =
      "That address does not end in .gov or .mil, the government domains this program covers.";
    const out = mapApiError({ status: 400, code: sentence, surface: "gov-request-code" });
    expect(out.headline).toBe(sentence);
  });

  it("the generic code-failure sentence passes through verbatim", () => {
    const sentence =
      "That code did not match or has expired. Request a new code and try again.";
    const out = mapApiError({ status: 400, code: sentence, surface: "gov-verify-code" });
    expect(out.headline).toBe(sentence);
  });

  it("the not-open-yet 503 sentence passes through verbatim", () => {
    const sentence = "Government email verification is not open yet.";
    const out = mapApiError({ status: 503, code: sentence, surface: "gov-request-code" });
    expect(out.headline).toBe(sentence);
  });

  it("turnstile failure maps to browser-confirm copy on request-code", () => {
    const out = mapApiError({
      status: 403,
      code: "verification failed",
      surface: "gov-request-code",
    });
    expect(out.headline).toBe("We could not confirm your browser.");
  });

  it("unknown short tokens fall back to the per-surface generic, never rendering the code", () => {
    const req = mapApiError({ status: 400, code: "zorp", surface: "gov-request-code" });
    expect(req.headline).toBe("The code could not be sent.");
    const ver = mapApiError({ status: 400, code: "zorp", surface: "gov-verify-code" });
    expect(ver.headline).toBe("The code could not be checked.");
  });
});
