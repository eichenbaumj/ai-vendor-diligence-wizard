/*
  Tests for the Resend code-email sender. The contract: one POST to the
  Resend API with the exact payload shape, true only on a 2xx, and false —
  never a throw — on any failure, so the calling function can turn a mail
  outage into a clean 502.
*/
import { describe, expect, it } from "vitest";
import { sendCodeEmail } from "@shared/resend.ts";

function captureFetch(status: number) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response("{}", { status });
  }) as typeof fetch;
  return { calls, fetchFn };
}

describe("sendCodeEmail", () => {
  it("posts the expected payload and returns true on success", async () => {
    const { calls, fetchFn } = captureFetch(200);
    const ok = await sendCodeEmail(
      { to: "jane@springfield.gov", code: "042917", from: "verify@send.group17a.com" },
      "re_test_key",
      fetchFn,
    );
    expect(ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.resend.com/emails");
    expect(calls[0].init.method).toBe("POST");

    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer re_test_key");
    expect(headers["content-type"]).toBe("application/json");

    const body = JSON.parse(String(calls[0].init.body)) as {
      from: string;
      to: string[];
      subject: string;
      text: string;
    };
    expect(body.from).toBe("verify@send.group17a.com");
    expect(body.to).toEqual(["jane@springfield.gov"]);
    expect(body.subject).toBe("Your verification code");
    expect(body.text).toContain("Your code is 042917.");
    expect(body.text).toContain("expires in 10 minutes");
    expect(body.text).toContain("ignore this message");
  });

  it("returns false on a non-2xx response", async () => {
    const { fetchFn } = captureFetch(422);
    const ok = await sendCodeEmail(
      { to: "jane@springfield.gov", code: "000001", from: "verify@send.group17a.com" },
      "re_test_key",
      fetchFn,
    );
    expect(ok).toBe(false);
  });

  it("returns false (never throws) when fetch itself fails", async () => {
    const failing = (async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    const ok = await sendCodeEmail(
      { to: "jane@springfield.gov", code: "000001", from: "verify@send.group17a.com" },
      "re_test_key",
      failing,
    );
    expect(ok).toBe(false);
  });
});
