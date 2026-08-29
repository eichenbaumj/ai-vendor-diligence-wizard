/*
  The input page: paste the pitch, pick your state, run the check.
*/
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PillButton, Section } from "@/components/brand";
import { StateSelect } from "@/components/input/StateSelect";
import {
  TurnstileWidget,
  type TurnstileHandle,
} from "@/components/input/TurnstileWidget";
import { ApiError, evaluate } from "@/lib/api";
import { IS_MOCK } from "@/lib/config";
import { FilePicker } from "@/components/input/FilePicker";
import {
  SAMPLE_PITCHES,
  getSamplePitch,
  type SampleId,
} from "@/lib/sample-pitches";

type Tab = "paste" | "name" | "pdf" | "url";

/* pdf/url need the live backend; the preview build has no ingestion path. */
const TABS: { id: Tab; label: string; enabled: boolean }[] = [
  { id: "paste", label: "Paste text", enabled: true },
  { id: "name", label: "Vendor name only", enabled: true },
  { id: "pdf", label: "Upload PDF", enabled: !IS_MOCK },
  { id: "url", label: "Website URL", enabled: !IS_MOCK },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      resolve(dataUrl.slice(dataUrl.indexOf(",") + 1));
    };
    reader.readAsDataURL(file);
  });
}

export default function Check() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [tab, setTab] = useState<Tab>("paste");
  const [content, setContent] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [siteUrl, setSiteUrl] = useState("");
  const [sampleId, setSampleId] = useState<SampleId | undefined>(undefined);
  /* The token lives in a ref, not state: nothing renders from it, and the
     completion callback arriving seconds after load must not re-render the
     page mid-interaction. */
  const turnstileTokenRef = useRef<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);
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
    let value = "";
    let filename: string | undefined;
    if (tab === "name") {
      value = vendorName.trim();
      if (!value) {
        setError({ message: "Type the vendor's name first.", hint: null });
        return;
      }
    } else if (tab === "pdf") {
      if (!pdfFile) {
        setError({ message: "Choose the vendor's PDF first.", hint: null });
        return;
      }
    } else if (tab === "url") {
      value = siteUrl.trim();
      if (value && !/^[a-z]+:\/\//i.test(value)) value = `https://${value}`;
      if (!value || !/^https:\/\/.+\..+/i.test(value)) {
        setError({
          message: "Enter the vendor's web address first.",
          hint: "A full https address, like https://vendor.example.com.",
        });
        return;
      }
    } else {
      value = content.trim();
      if (!value) {
        setError({
          message: "Paste the vendor's email first, or try one of the samples below.",
          hint: null,
        });
        return;
      }
    }
    setError(null);
    setSubmitting(true);
    try {
      if (tab === "pdf" && pdfFile) {
        value = await fileToBase64(pdfFile);
        filename = pdfFile.name;
      }
      const res = await evaluate({
        input_kind: tab,
        content: value,
        filename,
        state: stateCode || null,
        turnstile_token: turnstileTokenRef.current,
        /* Samples only ride along on the paste tab (they replay fixtures). */
        sampleId: tab === "paste" ? sampleId : undefined,
      });
      navigate(`/r/${res.evaluation_id}`);
    } catch (e) {
      /* Turnstile tokens are single-use and the server consumed this one
         even though the request failed; reset for a fresh token before the
         user retries. */
      turnstileRef.current?.reset();
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
            <p className="font-sans text-sm font-bold tracking-[0.14em] [font-variant-caps:all-small-caps] text-brand-cobalt">Run a check</p>
            <h1 className="mt-3 font-serif text-4xl font-bold leading-[1.08] sm:text-5xl">
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
              ) : tab === "pdf" ? (
                <div>
                  <FilePicker file={pdfFile} onChange={setPdfFile} />
                  <p className="mt-2 text-sm text-brand-charcoal-soft">
                    We read the text inside the PDF and check it like a pasted
                    pitch. The file itself is not stored.
                  </p>
                </div>
              ) : tab === "url" ? (
                <div>
                  <label htmlFor="site-url" className="sr-only">
                    The vendor's web address
                  </label>
                  <input
                    id="site-url"
                    type="url"
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                    placeholder="https://vendor.example.com"
                    className="w-full rounded-2xl border border-transparent bg-white px-5 py-4 font-mono text-[15px] shadow-soft outline-none focus:border-brand-cobalt"
                  />
                  <p className="mt-2 text-sm text-brand-charcoal-soft">
                    We fetch this page once and read its text. Anything after a
                    question mark in the address is removed first.
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

          <TurnstileWidget
            ref={turnstileRef}
            onToken={(t) => {
              turnstileTokenRef.current = t;
            }}
          />
        </div>
      </Section>
    </div>
  );
}
