/*
  Temporary pre-launch access gate: one shared password via Supabase Auth
  (the pattern used by the firm's other gated apps). Built for deletion —
  removing the gate at launch is flipping GATE_ENABLED in config.ts and
  deleting this component plus the server-side check in evaluate. The
  title and intro come from src/lib/wip-notice.ts with the rest of the
  work-in-progress wording.
*/
import { useEffect, useState } from "react";
import { PillButton } from "@/components/brand";
import { supabase } from "@/lib/supabase";
import { WIP_GATE } from "@/lib/wip-notice";

/* Fixed identifier for the single shared-access account. NOT a secret — an
   email is just an identifier; only the password (typed by the user and
   validated server-side by Supabase Auth) gates access. */
const ACCESS_EMAIL = "access@group17a.com";

export function useGateSession(enabled: boolean): {
  unlocked: boolean;
  ready: boolean;
} {
  const [unlocked, setUnlocked] = useState(!enabled);
  const [ready, setReady] = useState(!enabled);
  useEffect(() => {
    if (!enabled || !supabase) {
      setUnlocked(true);
      setReady(true);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUnlocked(Boolean(data.session));
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUnlocked(Boolean(session));
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [enabled]);
  return { unlocked, ready };
}

export function PasswordGate() {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !value || !supabase) return;
    setSubmitting(true);
    setError(false);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: ACCESS_EMAIL,
      password: value,
    });
    setSubmitting(false);
    if (signInError) setError(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-cream px-5">
      <form onSubmit={submit} className="w-full max-w-sm text-center">
        <p className="font-sans text-sm font-bold tracking-[0.14em] [font-variant-caps:all-small-caps] text-brand-cobalt">
          AI Vendor Diligence Wizard
        </p>
        <h1 className="mt-3 font-serif text-3xl font-bold">
          {WIP_GATE.title}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-brand-charcoal-soft">
          {WIP_GATE.intro}
        </p>
        <input
          type="password"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          placeholder="Preview password"
          autoFocus
          disabled={submitting}
          className="mt-6 w-full rounded-2xl border border-brand-silver bg-white px-5 py-4 text-center text-[16px] shadow-soft outline-none focus:border-brand-cobalt"
        />
        {error && (
          <p className="mt-2 text-sm font-bold text-status-bad" role="alert">
            That password did not match.
          </p>
        )}
        <div className="mt-5">
          <PillButton variant="primary" size="lg" type="submit" disabled={submitting || !value}>
            {submitting ? "Unlocking…" : "Unlock"}
          </PillButton>
        </div>
      </form>
    </div>
  );
}
