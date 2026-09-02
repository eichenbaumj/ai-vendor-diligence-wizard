/*
  Research findings that back no ledger row: surfaced for the reader to
  follow up, never counted as evidence. The note copy says whether the page
  was read or only surfaced, and what kind of source it is. A lead whose
  retrieved headline carried a dispute word (adverse-lexicon.ts) arrives
  first with flag "adverse_headline"; the label below is the only copy that
  flag ever produces, so no headline word is repeated by the tool.
*/
import type { LeadRef } from "@/lib/types";
import { REPORT_SECTION_IDS } from "@/components/report/report-overview-model";
import { sourceDatePhrase } from "@/lib/source-date";

const CLASS_LABEL: Record<number, string> = {
  1: "Official source",
  2: "Independent press",
  3: "Directory or vendor-linked",
};

/* Fixed copy for the adverse_headline flag. Exported so the How it works
   model can hold its sentence to the same words. */
export const ADVERSE_HEADLINE_LABEL = "Headline mentions a dispute, lawsuit, or breach";

export function LeadsList({ leads }: { leads: LeadRef[] }) {
  if (leads.length === 0) return null;
  return (
    <section
      id={REPORT_SECTION_IDS.leads}
      tabIndex={-1}
      className="mx-auto max-w-5xl scroll-mt-24 px-5 py-12 sm:px-8"
      aria-labelledby="leads-h"
    >
      <h2 id="leads-h" className="font-serif text-2xl font-bold sm:text-3xl">
        Found during research, not yet confirmed
      </h2>
      <p className="mt-2 max-w-2xl text-[15px] text-brand-charcoal-soft">
        These pages came up while researching this vendor but did not confirm
        or contradict any claim. They may still be worth a look. Pages whose
        headline mentions a lawsuit, settlement, breach, or ended contract are
        listed first. The tool has not verified those events, and they do not
        affect the verdict.
      </p>
      <ul className="mt-6 grid gap-3 md:grid-cols-2">
        {leads.map((l) => (
          <li
            key={l.url}
            className="rounded-2xl border border-brand-silver-soft bg-white p-4 shadow-soft"
          >
            <p className="flex flex-wrap items-baseline gap-2">
              <span className="shrink-0 rounded-pill border border-brand-silver px-2 py-0.5 font-mono text-[11px] tracking-wide text-brand-steel">
                {CLASS_LABEL[l.source_class] ?? "Source"}
              </span>
              {l.flag === "adverse_headline" && (
                <span className="rounded-pill border border-status-warn bg-status-warn-soft px-2 py-0.5 font-mono text-[11px] tracking-wide text-status-warn-text">
                  {ADVERSE_HEADLINE_LABEL}
                </span>
              )}
            </p>
            <p className="mt-2">
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[14px] font-bold leading-snug text-brand-cobalt underline underline-offset-2 hover:text-brand-cobalt-deep"
              >
                {l.title ?? l.url}
              </a>
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-brand-charcoal-soft">
              {l.note}
            </p>
            <p className="mt-2 font-mono text-xs tabular-nums text-brand-steel">
              {sourceDatePhrase(l)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
