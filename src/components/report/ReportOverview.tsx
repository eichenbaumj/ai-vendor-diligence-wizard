/*
  The at-a-glance card: the whole report on one screen, straddling the
  verdict hero's colored field onto the white page. Every count and
  sentence comes from report-overview-model.ts (pure, tested, linted);
  this file is layout only. Tiles are real anchors so keyboard, middle
  click, and no-JS behavior all work; the click handler adds smooth
  scrolling (honoring reduced motion) and moves focus to the section.
*/
import type { MouseEvent } from "react";
import type { Report } from "@/lib/types";
import { buildOverviewModel } from "@/components/report/report-overview-model";
import type { ResultChipCount } from "@/components/report/report-overview-model";
import { PrintButton } from "@/components/report/PrintButton";

function scrollToSection(e: MouseEvent<HTMLAnchorElement>, id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  e.preventDefault();
  /* Focus BEFORE scrolling: a focus() call during a smooth scroll cancels
     the scroll animation in Chromium. */
  el.focus({ preventScroll: true });
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const before = window.scrollY;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  if (!reduce) {
    /* Some embedded and emulated browsers silently drop smooth scrolls.
       If nothing has moved shortly after the click, jump instead: the
       navigation must always land. */
    window.setTimeout(() => {
      if (
        Math.abs(window.scrollY - before) < 4 &&
        Math.abs(el.getBoundingClientRect().top) > 120
      ) {
        el.scrollIntoView({ behavior: "auto" });
      }
    }, 350);
  }
  history.replaceState(null, "", `#${id}`);
}

/* The ledger's own glyph and color vocabulary, at chip scale. Word always
   present; glyph decorative (never color or glyph alone). */
const BREAKDOWN_STYLES: Record<
  ResultChipCount["result"],
  { glyph: string; className: string }
> = {
  VERIFIED: { glyph: "✓", className: "text-status-good" },
  OFFICIAL_RECORD_FOUND: { glyph: "✓", className: "text-brand-cobalt" },
  CONTRADICTED: { glyph: "⚠", className: "text-status-bad" },
  COULD_NOT_VERIFY: { glyph: "○", className: "text-brand-charcoal-soft" },
  COVERAGE_LIMITED: { glyph: "·", className: "text-brand-steel" },
};

const TILE_LINK_CLASS =
  "group flex min-h-[5.5rem] flex-col justify-between rounded-2xl border border-brand-silver-soft bg-white p-4 no-underline shadow-soft transition-colors hover:border-brand-cobalt";
const TILE_MUTED_CLASS =
  "flex min-h-[5.5rem] flex-col justify-between rounded-2xl border border-dashed border-brand-silver bg-brand-vellum p-4";

export function ReportOverview({ report }: { report: Report }) {
  const model = buildOverviewModel(report);

  return (
    <div className="relative mx-auto max-w-5xl px-5 sm:px-8">
      <section
        aria-labelledby="overview-h"
        className="-mt-8 rounded-2xl border border-brand-silver-soft bg-white p-5 shadow-soft-lg sm:p-7"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="overview-h"
            className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-brand-charcoal-soft"
          >
            Report at a glance
          </h2>
          <PrintButton />
        </div>

        <p className="mt-3 max-w-3xl font-serif text-lg leading-relaxed text-brand-ink">
          {model.bluf}
        </p>

        {model.partialNotice && (
          <p className="mt-3 rounded-xl bg-status-warn-soft px-4 py-2.5 text-sm leading-relaxed text-brand-charcoal">
            {model.partialNotice}
          </p>
        )}

        {(model.claims || model.questions) && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {model.claims && (
              <a
                href={`#${model.claims.targetId}`}
                onClick={(e) => scrollToSection(e, model.claims!.targetId)}
                className={TILE_LINK_CLASS}
              >
                <p>
                  <span className="font-serif text-4xl font-bold leading-none text-brand-ink">
                    {model.claims.count}
                  </span>{" "}
                  <span className="text-sm font-bold text-brand-charcoal">
                    claims tested
                  </span>
                  <span className="sr-only">. Jump to the ledger.</span>
                </p>
                <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px]">
                  {model.claims.breakdown.map((b) => (
                    <span key={b.result} className={BREAKDOWN_STYLES[b.result].className}>
                      <span aria-hidden="true">
                        {BREAKDOWN_STYLES[b.result].glyph}{" "}
                      </span>
                      {b.count} {b.label}
                    </span>
                  ))}
                </p>
                <p className="mt-1 text-[13px] text-brand-charcoal-soft">
                  {model.claims.sourcesLine}
                </p>
              </a>
            )}
            {model.questions && (
              <a
                href={`#${model.questions.targetId}`}
                onClick={(e) => scrollToSection(e, model.questions!.targetId)}
                className="group flex min-h-[5.5rem] flex-col justify-between rounded-2xl border border-brand-cobalt bg-brand-cobalt-50 p-4 no-underline shadow-soft transition-colors hover:bg-brand-cobalt-100"
              >
                <p>
                  <span className="font-serif text-4xl font-bold leading-none text-brand-cobalt">
                    {model.questions.count}
                  </span>{" "}
                  <span className="text-sm font-bold text-brand-charcoal">
                    {model.questions.lead}
                  </span>
                  <span className="sr-only">. Jump to the question pack.</span>
                </p>
                <p className="mt-2 text-[13px] text-brand-charcoal">
                  {model.questions.detail}
                </p>
              </a>
            )}
          </div>
        )}

        <nav aria-label="Report contents" className="mt-3">
          <ul className="grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-4">
            {model.tiles.map((tile) => (
              <li key={tile.key}>
                {tile.state === "link" ? (
                  <a
                    href={`#${tile.targetId}`}
                    onClick={(e) => scrollToSection(e, tile.targetId)}
                    className={TILE_LINK_CLASS}
                  >
                    <p>
                      <span className="font-serif text-2xl font-bold leading-none text-brand-ink">
                        {tile.count}
                      </span>{" "}
                      <span className="text-[13px] font-bold text-brand-charcoal">
                        {tile.label}
                      </span>
                      <span className="sr-only">. Jump to section.</span>
                    </p>
                    {tile.detail && (
                      <p className="mt-1.5 text-[12px] leading-snug text-brand-charcoal-soft">
                        {tile.detail}
                      </p>
                    )}
                  </a>
                ) : (
                  <div className={TILE_MUTED_CLASS}>
                    <p className="text-[13px] font-bold text-brand-charcoal-soft">
                      {tile.count} {tile.label}
                    </p>
                    {tile.detail && (
                      <p className="mt-1.5 text-[12px] leading-snug text-brand-charcoal-soft">
                        {tile.detail}
                      </p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </section>
    </div>
  );
}
