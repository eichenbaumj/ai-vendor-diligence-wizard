/*
  The input page: paste the pitch, pick your state, run the check.
*/
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PillButton, Section } from "@/components/brand";
import { StateSelect } from "@/components/input/StateSelect";
import { TurnstileWidget } from "@/components/input/TurnstileWidget";
import { ApiError, evaluate } from "@/lib/api";
import { IS_MOCK } from "@/lib/config";
import {
  SAMPLE_PITCHES,
  getSamplePitch,
  type SampleId,
} from "@/lib/sample-pitches";

type Tab = "paste" | "name" | "pdf" | "url";

const TABS: { id: Tab; label: string; enabled: boolean }[] = [
  { id: "paste", label: "Paste text", enabled: true },
  { id: "name", label: "Vendor name only", enabled: true },
  { id: "pdf", label: "Upload PDF", enabled: false },
  { id: "url", label: "Website URL", enabled: false },
];

export default function Check() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [tab, setTab] = useState<Tab>("paste");
  const [content, setContent] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [sampleId, setSampleId] = useState<SampleId | undefined>(undefined);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ message: string; hint: string | null } | null>(null);

  /* Preselect a sample from ?sample= (linked from the landing page). */
  useEffect(() => {
    const requested = searchParams.get("sample");
    if (!requested) return;
    const pitch = getSamplePitch(requested);
    if (pitch) {
      setTab("paste");
      setContent(pitch.text);
      setSampleId(pitch.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applySample = (id: SampleId) => {
    const pitch = getSamplePitch(id);
    if (!pitch) return;
    setTab("paste");
    setContent(pitch.text);
    setSampleId(id);
    setError(null);
  };

  const onContentChange = (value: string) => {
    setContent(value);
    if (sampleId && getSamplePitch(sampleId)?.text !== value) {
      setSampleId(undefined);
    }
  };

  const submit = async () => {
    const isName = tab === "name";
    const value = (isName ? vendorName : content).trim();
    if (!value) {
      setError({
        message: isName
          ? "Type the vendor's name first."
          : "Paste the vendor's email first, or try one of the samples below.",
        hint: null,
      });
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await evaluate({
        input_kind: isName ? "name" : "paste",
        content: value,
        state: stateCode || null,
        turnstile_token: turnstileToken,
        sampleId,
      });
      navigate(`/r/${res.evaluation_id}`);
    } catch (e) {
      if (e instanceof ApiError) {
        setError({ message: e.message, hint: e.retryHint });
      } else {
        setError({
          message: "Something went wrong starting the check.",
          hint: "Please try again in a moment.",
        });
      }
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Section tone="cream">
        <div className="max-w-3xl">
            <h1 className="font-serif text-5xl font-black leading-[1.05] sm:text-6xl">
              Paste the pitch.
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-brand-charcoal">
              We check what the vendor claims against public records and hand
              you the evidence, plus the questions to send back. About a
              minute.
            </p>

            {/* Input-kind tabs */}
            <div
              role="tablist"
              aria-label="How do you want to share the pitch?"
              className="mt-8 flex flex-wrap gap-2"
            >
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  disabled={!t.enabled}
                  title={t.enabled ? undefined : "Coming soon"}
                  onClick={() => t.enabled && setTab(t.id)}
                  className={`rounded-pill px-4 py-2 text-sm font-bold transition-colors ${
                    tab === t.id
                      ? "bg-brand-cobalt text-white"
                      : t.enabled
                        ? "border border-brand-silver bg-white text-brand-charcoal hover:border-brand-cobalt hover:text-brand-cobalt"
                        : "cursor-not-allowed border border-brand-silver-soft bg-transparent text-brand-steel"
                  }`}
                >
                  {t.label}
                  {!t.enabled && <span className="sr-only"> (coming soon)</span>}
                </button>
              ))}
            </div>

            {/* The input itself */}
            <div className="mt-5">
              {tab === "name" ? (
                <div>
                  <label htmlFor="vendor-name" className="sr-only">
                    Vendor name
                  </label>
                  <input
                    id="vendor-name"
                    type="text"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    placeholder="Type the company's name, e.g. Acme GovTech"
                    className="w-full rounded-2xl border border-transparent bg-white px-5 py-4 text-[16px] shadow-soft outline-none focus:border-brand-cobalt"
                  />
                  <p className="mt-2 text-sm text-brand-charcoal-soft">
                    With only a name we can still run the registry checks, but
                    pasting the full email gives the claims we can test.
                  </p>
                </div>
              ) : (
                <div>
                  <label htmlFor="pitch-text" className="sr-only">
                    The vendor's pitch
                  </label>
                  <textarea
                    id="pitch-text"
                    value={content}
                    onChange={(e) => onContentChange(e.target.value)}
                    placeholder="Paste the vendor's email exactly as you got it, including links."
                    className="min-h-64 w-full resize-y rounded-2xl border border-transparent bg-white px-5 py-4 text-[15px] leading-relaxed shadow-soft outline-none focus:border-brand-cobalt"
                  />
                </div>
              )}
            </div>

            {/* Sample strip */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-brand-charcoal-soft">Try a sample:</span>
              {SAMPLE_PITCHES.map((p) => (
                <PillButton
                  key={p.id}
                  variant="ghost"
                  size="md"
                  onClick={() => applySample(p.id)}
                >
                  {p.shortLabel}
                </PillButton>
              ))}
            </div>

            <div className="mt-8">
              <StateSelect value={stateCode} onChange={setStateCode} />
            </div>

            <p className="mt-6 text-sm text-brand-charcoal-soft">
              Your paste is used for this check and deleted on the schedule
              described in{" "}
              <Link
                to="/your-data"
                className="text-brand-cobalt underline underline-offset-2 hover:text-brand-cobalt-deep"
              >
                how we handle your data
              </Link>
              . Nothing you paste trains any model.
            </p>

            {error && (
              <div role="alert" className="mt-6 rounded-2xl bg-status-bad-soft px-5 py-4">
                <p className="text-[15px] font-bold text-status-bad">{error.message}</p>
                {error.hint && (
                  <p className="mt-1 text-sm text-brand-charcoal">{error.hint}</p>
                )}
              </div>
            )}

            <div className="mt-8">
              <PillButton
                variant="primary"
                size="lg"
                onClick={() => void submit()}
                disabled={submitting}
              >
                {submitting ? "Starting the check…" : "Run the check"}
              </PillButton>
              {IS_MOCK && (
                <p className="mt-3 max-w-xl text-sm text-brand-charcoal-soft">
                  Preview build: the live research engine is not connected yet.
                  Submissions replay a sample report about a fictional vendor
                  so you can see the format. The three sample buttons above
                  show all three verdict shapes.
                </p>
              )}
            </div>

          <TurnstileWidget onToken={setTurnstileToken} />
        </div>
      </Section>
    </div>
  );
}
