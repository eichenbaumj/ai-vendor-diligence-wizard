/*
  The checks only a person can do: short cards with instructions, an official
  link, and what a bad answer looks like.
*/
import type { ManualCheck } from "@/lib/types";
import { REPORT_SECTION_IDS } from "@/components/report/report-overview-model";

export function ManualCheckCards({ checks }: { checks: ManualCheck[] }) {
  if (checks.length === 0) return null;
  return (
    <section
      id={REPORT_SECTION_IDS.manualChecks}
      tabIndex={-1}
      className="mx-auto max-w-5xl scroll-mt-24 px-5 py-12 sm:px-8"
      aria-labelledby="manual-h"
    >
      <h2 id="manual-h" className="font-serif text-2xl font-bold sm:text-3xl">
        {checks.length === 3 ? "Three checks only you can do" : "Checks only you can do"}
      </h2>
      <p className="mt-2 max-w-2xl text-[15px] text-brand-charcoal-soft">
        Some sources do not allow automated checks, so these are yours. Each
        takes about a minute.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {checks.map((c) => (
          <article
            key={c.id}
            className="flex flex-col rounded-2xl border border-brand-silver-soft bg-white p-5 shadow-soft"
          >
            <h3 className="font-serif text-lg font-bold leading-snug">{c.label}</h3>
            <p className="mt-2 flex-1 text-[14px] leading-relaxed">{c.instructions}</p>
            {c.link && (
              <p className="mt-3">
                <a
                  href={c.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-bold text-brand-cobalt underline underline-offset-2 hover:text-brand-cobalt-deep"
                >
                  Open the official search
                </a>
              </p>
            )}
            <p className="mt-3 border-t border-brand-silver-soft pt-3 text-[13px] leading-relaxed text-brand-charcoal-soft">
              <span className="font-bold text-status-warn">What bad looks like:</span>{" "}
              {c.what_bad_looks_like}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
