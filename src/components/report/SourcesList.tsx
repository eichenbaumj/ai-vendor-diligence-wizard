/*
  Full source list with retrieval dates. Prints in full (the print stylesheet
  expands every href) so the report is defensible in a procurement file.
*/
import type { SourceRef } from "@/lib/types";
import { REPORT_SECTION_IDS } from "@/components/report/report-overview-model";

export function SourcesList({ sources }: { sources: SourceRef[] }) {
  if (sources.length === 0) return null;
  return (
    <section
      id={REPORT_SECTION_IDS.sources}
      tabIndex={-1}
      className="mx-auto max-w-5xl scroll-mt-24 px-5 py-10 sm:px-8"
      aria-labelledby="sources-h"
    >
      <h2 id="sources-h" className="font-serif text-xl font-bold sm:text-2xl">
        Sources checked for this report
      </h2>
      <ol className="mt-4 max-w-3xl list-decimal space-y-1.5 pl-5">
        {sources.map((s) => (
          <li key={s.url} className="text-[13px] leading-relaxed">
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-cobalt underline underline-offset-2 hover:text-brand-cobalt-deep"
            >
              {s.title ?? s.url}
            </a>{" "}
            <span className="font-mono text-xs tabular-nums text-brand-steel">
              (retrieved{" "}
              {new Date(s.retrieved_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              )
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
