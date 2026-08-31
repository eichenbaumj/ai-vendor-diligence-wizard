/*
  Verification-code email via the Resend REST API. Pure platform-agnostic TS
  with an injectable fetch (the _shared/turnstile.ts pattern) so vitest can
  exercise both paths without network access.

  Plain text only, no links: a code email with nothing clickable is easy for
  government mail filters and easy to explain to IT.
*/

const SEND_URL = "https://api.resend.com/emails";

export async function sendCodeEmail(
  args: { to: string; code: string; from: string },
  apiKey: string,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<boolean> {
  try {
    const res = await fetchFn(SEND_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: args.from,
        to: [args.to],
        subject: "Your verification code",
        text:
          `Your code is ${args.code}. It expires in 10 minutes. ` +
          "If you did not request this, ignore this message. " +
          "This code unlocks a higher monthly limit on the AI Vendor Diligence Wizard.",
      }),
    });
    return res.ok;
  } catch (err) {
    /* Never throws: the caller turns false into a clean 502. */
    console.error(`resend send failed: ${String(err)}`);
    return false;
  }
}
