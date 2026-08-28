/*
  One route, two states: the live progress experience while the pipeline
  runs, then the report. Insufficient and error states get friendly panels.
*/
import { Link, useParams } from "react-router-dom";
import {
  DotField,
  MarqueeBand,
  PillButton,
  Section,
} from "@/components/brand";
import { useEvaluation } from "@/lib/useEvaluation";
import type { EvaluationState, Report } from "@/lib/types";
import {
  StageTimeline,
  computeStepIndex,
} from "@/components/progress/StageTimeline";
import { MicroFindingFeed } from "@/components/progress/MicroFindingFeed";
import { DisclaimerHeader } from "@/components/report/DisclaimerHeader";
import { VerdictHero } from "@/components/report/VerdictHero";
import { GreenFlags } from "@/components/report/GreenFlags";
import { AdvFindingCard } from "@/components/report/AdvFindingCard";
import { VerificationLedger } from "@/components/report/VerificationLedger";
import { HonestyPanel } from "@/components/report/HonestyPanel";
import { QuestionPack } from "@/components/report/QuestionPack";
import { ManualCheckCards } from "@/components/report/ManualCheckCards";
import { NextSteps } from "@/components/report/NextSteps";
import { SourcesList } from "@/components/report/SourcesList";
import { PrintButton } from "@/components/report/PrintButton";
import { ReportChat } from "@/components/chat/ReportChat";

/* Check names for the ambient marquee while the pipeline works. */
const MARQUEE_CHECKS: { check_id: string; name: string }[] = [
  { check_id: "sos_registration", name: "State business registries" },
  { check_id: "sam_entity", name: "SAM.gov entity records" },
  { check_id: "sam_exclusions", name: "Federal exclusion lists" },
  { check_id: "rdap_domain_age", name: "Domain registration records" },
  { check_id: "wayback_history", name: "Web archive history" },
  { check_id: "usaspending", name: "Federal spending records" },
  { check_id: "sourcewell", name: "Cooperative contract lists" },
  { check_id: "fedramp_feed", name: "FedRAMP Marketplace" },
  { check_id: "govramp_list", name: "GovRAMP participants" },
  { check_id: "edgar_form_d", name: "SEC EDGAR filings" },
  { check_id: "ai_inventory", name: "State AI inventories" },
  { check_id: "state_checkbook", name: "State payment portals" },
];

function ProgressView({ state }: { state: EvaluationState }) {
  const stepIndex = computeStepIndex(state.events, false);
  const seen = new Set(
    state.events.map((e) => e.payload.check_id).filter(Boolean),
  );
  const remaining = MARQUEE_CHECKS.filter((c) => !seen.has(c.check_id)).map(
    (c) => c.name,
  );
  const marqueeItems = remaining.length > 0 ? remaining : MARQUEE_CHECKS.map((c) => c.name);

  return (
    <div>
      <Section tone="cobalt">
        <DotField className="text-white/10">
          <div>
            <h1 className="font-serif text-3xl font-black text-white sm:text-4xl">
              Checking this vendor now
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/80">
              We are testing the pitch against public registries and records.
              Findings appear below as each check lands. This usually takes a
              minute or two.
            </p>
            <div className="mt-10 grid gap-10 md:grid-cols-[280px_1fr]">
              <StageTimeline currentIndex={stepIndex} />
              <MicroFindingFeed events={state.events} />
            </div>
            <p className="mt-10">
              <Link
                to="/check"
                className="text-sm text-white/70 underline underline-offset-2 hover:text-white"
              >
                Cancel and go back
              </Link>
            </p>
          </div>
        </DotField>
      </Section>
      <MarqueeBand items={marqueeItems} tone="cream" />
    </div>
  );
}

function ReportView({
  report,
  disputed,
  evaluationId,
  mockCustom = false,
}: {
  report: Report;
  disputed: boolean;
  evaluationId: string;
  mockCustom?: boolean;
}) {
  return (
    <div className="bg-white">
      {mockCustom && (
        <div className="border-b border-status-warn bg-status-warn-soft px-5 py-4 sm:px-8">
          <p className="mx-auto max-w-5xl text-sm font-medium text-brand-charcoal">
            <span className="font-bold">Preview build.</span> The live research
            engine is not connected yet, so your pasted pitch was not
            evaluated. What follows is a sample report about a fictional
            vendor, shown so you can see what a real report looks like.
          </p>
        </div>
      )}
      <DisclaimerHeader report={report} />
      <VerdictHero report={report} disputed={disputed} />

      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 pt-6 sm:px-8">
        <p className="text-sm text-brand-charcoal-soft">
          Checked against {report.sources.length} public sources. Everything
          below links to its evidence.
        </p>
        <PrintButton />
      </div>

      <GreenFlags flags={report.green_flags} />
      <AdvFindingCard findings={report.adv_findings} />
      <VerificationLedger rows={report.ledger} />
      <HonestyPanel items={report.honesty_panel} />
      <QuestionPack report={report} />
      <ManualCheckCards checks={report.manual_checks} />
      <NextSteps steps={report.next_steps} />
      <SourcesList sources={report.sources} />

      <div className="mx-auto max-w-5xl px-5 pb-14 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-brand-silver-soft pt-6">
          <p className="text-[13px] text-brand-charcoal-soft">
            Are you this vendor? If something here is wrong,{" "}
            <Link
              to="/disputes"
              className="text-brand-cobalt underline underline-offset-2"
            >
              report an error
            </Link>{" "}
            and we will review it within five business days.
          </p>
          <PrintButton />
        </div>
      </div>

      <ReportChat evaluationId={evaluationId} />
    </div>
  );
}

function InsufficientView({ reason }: { reason?: string | null }) {
  return (
    <div>
      <Section tone="cream">
        <div className="max-w-3xl">
          <span className="rounded-pill bg-tier-nr-soft px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-tier-nr">
            Not enough to evaluate
          </span>
          <h1 className="mt-5 font-serif text-4xl font-black leading-tight sm:text-5xl">
            We could not complete an evaluation.
          </h1>
          {reason ? (
            <p className="mt-4 max-w-xl text-lg leading-relaxed">{reason}</p>
          ) : null}
          <p className="mt-4 max-w-xl text-lg leading-relaxed">
            This is not a negative finding. The material did not contain
            enough for us to research: we need a company we can resolve to a
            real entity. Reply to the vendor and ask for:
          </p>
          <ul className="mt-6 max-w-xl space-y-2.5">
            {[
              "Their registered legal entity name and state of registration",
              "Their UEI (federal ID), if they have one",
              "Their website address",
              "Two named government references you may contact",
            ].map((item) => (
              <li key={item} className="flex items-baseline gap-2.5 text-[15px]">
                <span aria-hidden="true" className="font-bold text-brand-cobalt">
                  →
                </span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-xl text-[15px] text-brand-charcoal-soft">
            When they answer, run the check again with the new details.
          </p>
          <div className="mt-8">
            <PillButton to="/check" variant="primary" size="lg">
              Start a new check
            </PillButton>
          </div>
        </div>
      </Section>
    </div>
  );
}

function ErrorView({ message }: { message: string | null }) {
  return (
    <div>
      <Section tone="cream">
        <div className="max-w-3xl">
          <h1 className="font-serif text-4xl font-black leading-tight sm:text-5xl">
            Something went wrong.
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed">
            {message ?? "The check hit an error on our side. Your pitch was not lost."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <PillButton variant="primary" size="lg" onClick={() => window.location.reload()}>
              Try again
            </PillButton>
            <PillButton to="/check" variant="ghost" size="lg">
              Start over
            </PillButton>
          </div>
        </div>
      </Section>
    </div>
  );
}

export default function Evaluation() {
  const { id } = useParams<{ id: string }>();
  const state = useEvaluation(id);

  let body: JSX.Element;
  if (state.status === "error" || (!id && state.report === null)) {
    body = <ErrorView message={state.error} />;
  } else if (state.status === "insufficient") {
    body = <InsufficientView reason={state.error} />;
  } else if (state.status === "complete" && state.report) {
    body = (
      <ReportView
        report={state.report}
        disputed={state.disputed}
        evaluationId={id ?? ""}
        mockCustom={state.mockCustom}
      />
    );
  } else {
    body = <ProgressView state={state} />;
  }

  return body;
}
