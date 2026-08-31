/*
  Verified-government-email card for the Check page. Walks a .gov/.mil
  address holder through the emailed 6-digit code and stores the resulting
  credential in the browser (see the gov helpers in src/lib/api.ts).

  Rendered only when the GOV_VERIFY_UI flag is on; the server refuses every
  request unless its own GOV_VERIFY_ENABLED secret is set, so the card being
  visible is never enough by itself.

  It carries its own TurnstileWidget: the Check page's main widget token is
  single-use and reserved for the evaluate call, so requesting a code must
  spend a separate token.
*/
import { useRef, useState } from "react";
import { PillButton } from "@/components/brand";
import {
  TurnstileWidget,
  type TurnstileHandle,
} from "@/components/input/TurnstileWidget";
import {
  ApiError,
  clearGovVerification,
  getGovVerification,
  requestGovCode,
  verifyGovCode,
} from "@/lib/api";

type Stage = "collapsed" | "email" | "code" | "verified";

const FIELD_CLASS =
  "w-full rounded-2xl border border-brand-silver bg-white px-5 py-3 text-[16px] outline-none focus:border-brand-cobalt";

export function GovVerifyCard() {
  const [stage, setStage] = useState<Stage>(() =>
    getGovVerification() ? "verified" : "collapsed",
  );
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; hint: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  /* Token in a ref, not state: nothing renders from it (the Check page's
     main widget uses the same pattern). */
  const turnstileTokenRef = useRef<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);

  /* Falls back to the in-memory email when storage is blocked (private
     mode): the badge still names the address that was just verified. */
  const verifiedEmail = getGovVerification()?.email ?? email.trim().toLowerCase();

  const sendCode = async () => {
    if (!email.trim()) {
      setError({ message: "Type your work email first.", hint: null });
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await requestGovCode(email.trim(), turnstileTokenRef.current);
      setNotice(res.message);
      setCode("");
      setStage("code");
    } catch (e) {
      if (e instanceof ApiError) {
        setError({ message: e.message, hint: e.retryHint });
      } else {
        setError({
          message: "The code could not be sent.",
          hint: "Please try again in a moment.",
        });
      }
    } finally {
      /* Turnstile tokens are single-use and the server consumed this one
         either way; reset so a resend gets a fresh token. */
      turnstileRef.current?.reset();
      setBusy(false);
    }
  };

  const checkCode = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      setError({ message: "Enter the 6 digit code from the email.", hint: null });
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await verifyGovCode(email.trim(), code.trim());
      setNotice(res.message);
      setStage("verified");
    } catch (e) {
      if (e instanceof ApiError) {
        setError({ message: e.message, hint: e.retryHint });
      } else {
        setError({
          message: "The code could not be checked.",
          hint: "Please try again in a moment.",
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    clearGovVerification();
    setEmail("");
    setCode("");
    setNotice(null);
    setError(null);
    setStage("collapsed");
  };

  if (stage === "collapsed") {
    return (
      <div className="rounded-2xl border border-brand-silver-soft bg-white p-5 shadow-soft">
        <button
          type="button"
          onClick={() => setStage("email")}
          className="text-left font-sans text-[15px] text-brand-cobalt underline underline-offset-2 hover:text-brand-cobalt-deep"
        >
          Work in government? Verify your .gov email to get 20 checks a month.
        </button>
      </div>
    );
  }

  if (stage === "verified") {
    return (
      <div className="rounded-2xl border border-brand-silver-soft bg-white p-5 shadow-soft">
        <p className="font-sans text-[15px] font-bold text-status-good" role="status">
          Verified government email. Checks renew monthly.
        </p>
        {verifiedEmail && (
          <p className="mt-1 font-sans text-sm text-brand-charcoal">{verifiedEmail}</p>
        )}
        <button
          type="button"
          onClick={remove}
          className="mt-2 font-sans text-sm text-brand-charcoal-soft underline underline-offset-2 hover:text-brand-charcoal"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-silver-soft bg-white p-5 shadow-soft">
      <p className="font-sans text-[15px] font-bold">
        Verify a government email for 20 checks a month
      </p>
      <p className="mt-1 font-sans text-sm text-brand-charcoal-soft">
        We email a 6 digit code to your .gov or .mil address, then forget the
        address. Only a scrambled fingerprint is kept.
      </p>

      {stage === "email" ? (
        <div className="mt-4">
          <label htmlFor="gov-email" className="sr-only">
            Your government email address
          </label>
          <input
            id="gov-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@agency.gov"
            className={FIELD_CLASS}
          />
          <div className="mt-3">
            <PillButton variant="primary" size="md" onClick={() => void sendCode()} disabled={busy}>
              {busy ? "Sending…" : "Send the code"}
            </PillButton>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          {notice && (
            <p className="font-sans text-sm text-brand-charcoal" role="status">
              {notice}
            </p>
          )}
          <label htmlFor="gov-code" className="sr-only">
            The 6 digit code from the email
          </label>
          <input
            id="gov-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="6 digit code"
            className={`mt-3 font-mono ${FIELD_CLASS}`}
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <PillButton variant="primary" size="md" onClick={() => void checkCode()} disabled={busy}>
              {busy ? "Checking…" : "Verify the code"}
            </PillButton>
            <button
              type="button"
              onClick={() => void sendCode()}
              disabled={busy}
              className="font-sans text-sm text-brand-charcoal-soft underline underline-offset-2 hover:text-brand-charcoal disabled:opacity-50"
            >
              Send a new code
            </button>
            <button
              type="button"
              onClick={() => {
                setStage("email");
                setError(null);
                setNotice(null);
              }}
              disabled={busy}
              className="font-sans text-sm text-brand-charcoal-soft underline underline-offset-2 hover:text-brand-charcoal disabled:opacity-50"
            >
              Use a different email
            </button>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="mt-4 rounded-2xl bg-status-bad-soft px-5 py-4">
          <p className="text-[15px] font-bold text-status-bad">{error.message}</p>
          {error.hint && <p className="mt-1 text-sm text-brand-charcoal">{error.hint}</p>}
        </div>
      )}

      <TurnstileWidget
        ref={turnstileRef}
        onToken={(t) => {
          turnstileTokenRef.current = t;
        }}
      />
    </div>
  );
}
