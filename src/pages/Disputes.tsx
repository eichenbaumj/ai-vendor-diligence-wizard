import { useRef, useState } from "react";
import { Section, PillButton } from "@/components/brand";
import {
  TurnstileWidget,
  type TurnstileHandle,
} from "@/components/input/TurnstileWidget";
import { ApiError, submitDispute } from "@/lib/api";

/* Accepts a report link or a bare id; returns the UUID or null. */
function extractEvaluationId(value: string): string | null {
  const m = value.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return m ? m[0] : null;
}

const FIELD_CLASS =
  "w-full rounded-2xl border border-brand-silver bg-white px-5 py-4 text-[16px] outline-none focus:border-brand-cobalt";

function DisputeForm() {
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [reportLink, setReportLink] = useState("");
  const [disputedItem, setDisputedItem] = useState("");
  const [statement, setStatement] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const turnstileTokenRef = useRef<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ message: string; hint: string | null } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const submit = async () => {
    if (!company.trim() || !email.trim() || !disputedItem.trim() || !statement.trim()) {
      setError({
        message: "The dispute is missing something.",
        hint: "Fill in your company, a work email, the item you dispute, and your statement.",
      });
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError({
        message: "That email address does not look right.",
        hint: "Use a work email address we can reply to.",
      });
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await submitDispute({
        vendor_key: company.trim().slice(0, 260),
        evaluation_id: extractEvaluationId(reportLink),
        contact_email: email.trim().slice(0, 254),
        disputed_item: disputedItem.trim().slice(0, 2000),
        vendor_statement: statement.trim().slice(0, 8000),
        evidence_url: evidenceUrl.trim() || null,
        turnstile_token: turnstileTokenRef.current,
      });
      setSuccessMessage(res.message);
    } catch (e) {
      /* Turnstile tokens are single-use; reset for a fresh one before retry. */
      turnstileRef.current?.reset();
      if (e instanceof ApiError) {
        setError({ message: e.message, hint: e.retryHint });
      } else {
        setError({
          message: "The dispute could not be sent.",
          hint: "Please try again in a moment, or email disputes@group17a.com.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (successMessage) {
    return (
      <div className="mt-6 rounded-2xl bg-status-good-soft px-6 py-5" role="status">
        <p className="font-sans text-[15px] font-bold text-status-good">
          Your dispute was received.
        </p>
        <p className="mt-1 font-sans text-sm text-brand-charcoal">{successMessage}</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="dispute-company" className="font-sans text-sm font-bold">
            Your company's name
          </label>
          <input
            id="dispute-company"
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="The name the report used"
            className={`mt-1 ${FIELD_CLASS}`}
          />
        </div>
        <div>
          <label htmlFor="dispute-email" className="font-sans text-sm font-bold">
            Work email
          </label>
          <input
            id="dispute-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className={`mt-1 ${FIELD_CLASS}`}
          />
        </div>
      </div>
      <div>
        <label htmlFor="dispute-report" className="font-sans text-sm font-bold">
          Report link <span className="font-normal text-brand-charcoal-soft">(if you have it)</span>
        </label>
        <input
          id="dispute-report"
          type="text"
          value={reportLink}
          onChange={(e) => setReportLink(e.target.value)}
          placeholder="Paste the report's web address"
          className={`mt-1 ${FIELD_CLASS}`}
        />
      </div>
      <div>
        <label htmlFor="dispute-item" className="font-sans text-sm font-bold">
          The finding you are disputing
        </label>
        <textarea
          id="dispute-item"
          value={disputedItem}
          onChange={(e) => setDisputedItem(e.target.value)}
          maxLength={2000}
          placeholder="Quote or clearly describe the specific finding."
          className={`mt-1 min-h-24 resize-y ${FIELD_CLASS}`}
        />
      </div>
      <div>
        <label htmlFor="dispute-statement" className="font-sans text-sm font-bold">
          Your statement and evidence
        </label>
        <textarea
          id="dispute-statement"
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          maxLength={8000}
          placeholder="Why the finding is wrong, with the record, letter, or contract that shows it."
          className={`mt-1 min-h-36 resize-y ${FIELD_CLASS}`}
        />
      </div>
      <div>
        <label htmlFor="dispute-evidence" className="font-sans text-sm font-bold">
          Evidence link <span className="font-normal text-brand-charcoal-soft">(optional)</span>
        </label>
        <input
          id="dispute-evidence"
          type="url"
          value={evidenceUrl}
          onChange={(e) => setEvidenceUrl(e.target.value)}
          placeholder="https://an-official-source.example.gov/record"
          className={`mt-1 ${FIELD_CLASS}`}
        />
      </div>

      {error && (
        <div role="alert" className="rounded-2xl bg-status-bad-soft px-5 py-4">
          <p className="text-[15px] font-bold text-status-bad">{error.message}</p>
          {error.hint && <p className="mt-1 text-sm text-brand-charcoal">{error.hint}</p>}
        </div>
      )}

      <div>
        <PillButton variant="primary" size="lg" onClick={() => void submit()} disabled={submitting}>
          {submitting ? "Sending…" : "Send the dispute"}
        </PillButton>
      </div>

      <TurnstileWidget
        ref={turnstileRef}
        onToken={(t) => {
          turnstileTokenRef.current = t;
        }}
      />
    </div>
  );
}

export default function Disputes() {
  return (
    <>
      <Section tone="tint" className="py-12! md:py-16!">
        <p className="font-sans text-sm font-bold tracking-[0.14em] text-brand-cobalt [font-variant-caps:all-small-caps]">
          Disputes and corrections
        </p>
        <h1 className="mt-2 max-w-3xl font-serif text-[clamp(2rem,3.6vw,3rem)] font-bold leading-tight">
          Think we got something wrong? Tell us.
        </h1>
        <p className="mt-5 max-w-2xl font-sans text-lg leading-relaxed">
          Reports draw on public records, and public records can be wrong,
          stale, or matched to the wrong company. The dispute channel exists
          so errors get fixed fast. It is free.
        </p>
      </Section>

      <Section tone="white">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-serif text-2xl font-bold">Who can dispute</h2>
          <p className="mt-4 font-sans text-base leading-relaxed md:text-lg">
            The vendor named in a report, or someone authorized to speak for
            that vendor. If a report about your company contains a finding you
            believe is wrong, you can ask for a review at no cost.
          </p>

          <h2 className="mt-10 font-serif text-2xl font-bold">What to send</h2>
          <ul className="mt-4 list-disc space-y-3 pl-6 font-sans text-base leading-relaxed md:text-lg">
            <li>Your company's legal name and your role there.</li>
            <li>
              The specific finding you are disputing, quoted or described
              clearly.
            </li>
            <li>
              The evidence that shows it is wrong. For example: a registration
              record, a certification letter, a contract number, or a link to
              an official source.
            </li>
          </ul>

          <h2 className="mt-10 font-serif text-2xl font-bold">What happens next</h2>
          <p className="mt-4 font-sans text-base leading-relaxed md:text-lg">
            A person reviews every dispute. While a finding is
            under review, it is marked "disputed by vendor, under review" in
            the report. If the finding is wrong, we correct it, and the
            correction carries through to every copy of the report the tool
            serves. If we stand by the finding, we explain why and cite the
            sources.
          </p>

          <h2 className="mt-10 font-serif text-2xl font-bold">
            Send a dispute
          </h2>
          <p className="mt-4 font-sans text-base leading-relaxed md:text-lg">
            Use the form below. We reply to the email you give here.
          </p>
          <DisputeForm />
          <p className="mt-6 font-sans text-sm text-brand-charcoal-soft">
            Prefer email? Write to{" "}
            <a
              href="mailto:disputes@group17a.com"
              className="text-brand-cobalt underline underline-offset-2 hover:text-brand-cobalt-deep"
            >
              disputes@group17a.com
            </a>{" "}
            with the same details.
          </p>

          <p className="mt-10 border-t border-brand-ink/10 pt-6 font-sans text-base leading-relaxed text-brand-charcoal-soft">
            A note on what reports say: when the tool cannot confirm a claim,
            the report says it could not verify the claim in public sources.
            That is not a finding of wrongdoing, and reports never make one.
            The dispute channel is here for the cases where even that careful
            statement rests on an error.
          </p>
        </div>
      </Section>
    </>
  );
}
