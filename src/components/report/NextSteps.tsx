/*
  Next steps: the process recommendation, as a numbered list, plus the
  state-specific obligations block when the engine supplied any
  (sector.state_items, methodology D7.3).
*/
import { REPORT_SECTION_IDS } from "@/components/report/report-overview-model";

export function NextSteps({
  steps,
  stateItems = [],
}: {
  steps: string[];
  stateItems?: string[];
}) {
  if (steps.length === 0 && stateItems.length === 0) return null;
  return (
    <section
      id={REPORT_SECTION_IDS.nextSteps}
      tabIndex={-1}
      className="mx-auto max-w-5xl scroll-mt-24 px-5 py-10 sm:px-8"
      aria-labelledby="next-h"
    >
      {steps.length > 0 ? (
        <>
          <h2 id="next-h" className="font-serif text-2xl font-bold sm:text-3xl">
            What to do next
          </h2>
          <ol className="mt-5 max-w-3xl space-y-3">
            {steps.map((s, i) => (
              <li key={s} className="flex items-baseline gap-3">
                <span
                  aria-hidden="true"
                  className="font-serif text-lg font-bold text-brand-cobalt"
                >
                  {i + 1}
                </span>
                <span className="text-[15px] leading-relaxed">{s}</span>
              </li>
            ))}
          </ol>
        </>
      ) : null}
      {stateItems.length > 0 ? (
        <div className={steps.length > 0 ? "mt-10" : undefined}>
          <h3
            id="state-items-h"
            className="font-serif text-xl font-bold sm:text-2xl"
          >
            What your state already requires
          </h3>
          <ul
            className="mt-4 max-w-3xl space-y-3"
            aria-labelledby="state-items-h"
          >
            {stateItems.map((item) => (
              <li key={item} className="flex items-baseline gap-3">
                <span
                  aria-hidden="true"
                  className="font-bold text-brand-cobalt"
                >
                  →
                </span>
                <span className="text-[15px] leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
