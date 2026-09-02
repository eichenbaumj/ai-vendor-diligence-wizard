/*
  The at-a-glance card: the whole report as one picture, straddling the
  verdict hero's colored field onto the white page. Three narrative groups
  (what we found, what we could check, what to do next); the two
  part-to-whole facts render as segmented bars in the ledger's own status
  colors, and every segment is also named with its count, so nothing rests
  on color alone. Content comes from report-overview-model.ts (pure,
  tested, linted); this file is layout only.

  Bar palette note: the five result hues pass the CVD and normal-vision
  separation checks together (validated 2026-08-31); the two grays are
  deliberate (absence states), carry a hairline ring for surface relief,
  and are always paired with the worded legend.
*/
import type { MouseEvent, ReactNode } from "react";
import type { Report } from "@/lib/types";
import {
  OVERVIEW_GROUP_LABELS,
  buildOverviewModel,
} from "@/components/report/report-overview-model";
import type {
  BarSegment,
  OverviewTile,
} from "@/components/report/report-overview-model";
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

/* The ledger's own status vocabulary at bar scale. Marks carry the color;
   the legend text stays in ink (text never wears the data color). */
const SEGMENT_STYLES: Record<string, { bar: string; dot: string }> = {
  VERIFIED: { bar: "bg-status-good", dot: "bg-status-good" },
  OFFICIAL_RECORD_FOUND: { bar: "bg-brand-cobalt", dot: "bg-brand-cobalt" },
  CONTRADICTED: { bar: "bg-status-bad", dot: "bg-status-bad" },
  COULD_NOT_VERIFY: { bar: "bg-brand-steel", dot: "bg-brand-steel" },
  COVERAGE_LIMITED: {
    bar: "bg-brand-silver ring-1 ring-inset ring-brand-steel/40",
    dot: "bg-brand-silver ring-1 ring-inset ring-brand-steel/40",
  },
  ran: { bar: "bg-brand-cobalt", dot: "bg-brand-cobalt" },
  could_not_run: {
    bar: "bg-brand-silver ring-1 ring-inset ring-brand-steel/40",
    dot: "bg-brand-silver ring-1 ring-inset ring-brand-steel/40",
  },
};

function SegmentedBar({
  segments,
  ariaLabel,
}: {
  segments: BarSegment[];
  ariaLabel: string;
}) {
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className="flex h-3 w-full gap-[2px] overflow-hidden rounded-r-[4px]"
    >
      {segments.map((s) => (
        <div
          key={s.key}
          title={`${s.count} ${s.label}`}
          style={{ flexGrow: s.count, minWidth: "10px" }}
          className={SEGMENT_STYLES[s.key]?.bar ?? "bg-brand-steel"}
        />
      ))}
    </div>
  );
}

function SegmentLegend({ segments }: { segments: BarSegment[] }) {
  return (
    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
      {segments.map((s) => (
        <span
          key={s.key}
          className="inline-flex items-baseline gap-1.5 text-[13px] text-brand-charcoal"
        >
          <span
            aria-hidden="true"
            className={`inline-block h-2.5 w-2.5 self-center rounded-[3px] ${SEGMENT_STYLES[s.key]?.dot ?? "bg-brand-steel"}`}
          />
          <span className="font-bold">{s.count}</span> {s.label}
        </span>
      ))}
    </p>
  );
}

/* Little pictures: minimal 20px stroke icons, one per tile kind. Decorative
   (aria-hidden); the worded label carries the meaning. */
const ICON_PATHS: Record<OverviewTile["key"], ReactNode> = {
  "green-flags": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.2 2.4 2.4 4.6-5" />
    </>
  ),
  "adv-findings": (
    <>
      <path d="M12 3.5 21 19H3l9-15.5Z" />
      <path d="M12 9.5v4.2" />
      <path d="M12 16.4v.2" />
    </>
  ),
  leads: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </>
  ),
  questions: (
    <>
      <path d="M21 3 3.8 9.7l6.4 3 8.1-7.4-6.6 8.9.1 5.8 2.9-4L21 3Z" />
    </>
  ),
  "manual-checks": (
    <>
      <path d="M8 12.5V5a1.6 1.6 0 0 1 3.2 0v6" />
      <path d="M11.2 11V9.4a1.6 1.6 0 0 1 3.2 0V12" />
      <path d="M14.4 12v-1a1.6 1.6 0 0 1 3.2 0v2.6c0 4-2.2 6.9-5.8 6.9-3 0-4.3-1.4-5.6-3.8L4.6 13.6a1.5 1.5 0 0 1 2.6-1.5l.8 1.3" />
    </>
  ),
  "next-steps": (
    <>
      <path d="M5 6h9" />
      <path d="M5 12h9" />
      <path d="M5 18h6" />
      <path d="m16 14 3 3-3 3" />
      <path d="M19 17h-4" />
    </>
  ),
};

function TileIcon({ kind, className }: { kind: OverviewTile["key"]; className: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {ICON_PATHS[kind]}
    </svg>
  );
}

function Tile({ tile }: { tile: OverviewTile }) {
  if (tile.state === "muted") {
    return (
      <div className="flex h-full items-start gap-3 rounded-2xl border border-dashed border-brand-silver bg-brand-vellum p-4">
        <TileIcon kind={tile.key} className="mt-0.5 h-5 w-5 shrink-0 text-brand-steel" />
        <div>
          <p className="text-[13px] font-bold leading-snug text-brand-charcoal-soft">
            {tile.count} {tile.label}
          </p>
          {tile.detail && (
            <p className="mt-1 text-[12px] leading-snug text-brand-charcoal-soft">
              {tile.detail}
            </p>
          )}
        </div>
      </div>
    );
  }
  const primary = tile.primary === true;
  return (
    <a
      href={`#${tile.targetId}`}
      onClick={(e) => scrollToSection(e, tile.targetId)}
      className={
        primary
          ? "flex h-full items-start gap-3 rounded-2xl border-2 border-brand-cobalt bg-brand-cobalt-50 p-4 no-underline shadow-soft transition-colors hover:bg-brand-cobalt-100"
          : "flex h-full items-start gap-3 rounded-2xl border border-brand-silver-soft bg-white p-4 no-underline shadow-soft transition-colors hover:border-brand-cobalt"
      }
    >
      <TileIcon
        kind={tile.key}
        className={`mt-0.5 h-5 w-5 shrink-0 ${primary ? "text-brand-cobalt" : "text-brand-charcoal-soft"}`}
      />
      <span className="min-w-0">
        <span className="block text-[15px] font-bold leading-snug text-brand-ink">
          {tile.count} {tile.label}
          <span className="sr-only">. Jump to section.</span>
        </span>
        {tile.detail && (
          <span className="mt-1 block text-[12px] leading-snug text-brand-charcoal-soft">
            {tile.detail}
          </span>
        )}
      </span>
    </a>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-sans text-sm font-bold tracking-[0.1em] [font-variant-caps:all-small-caps] text-brand-charcoal-soft">
      {children}
    </h3>
  );
}

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

        {model.siteNotice && (
          <p className="mt-3 rounded-xl bg-status-warn-soft px-4 py-2.5 text-sm leading-relaxed text-brand-charcoal">
            {model.siteNotice}
          </p>
        )}

        {model.collisionNotice && (
          <p className="mt-3 rounded-xl bg-status-warn-soft px-4 py-2.5 text-sm leading-relaxed text-brand-charcoal">
            {model.collisionNotice}
          </p>
        )}

        {/* ------------------------------------------------ what we found */}
        <div className="mt-6">
          <GroupLabel>{OVERVIEW_GROUP_LABELS.found}</GroupLabel>
          {model.found.claims && (
            <a
              href={`#${model.found.claims.targetId}`}
              onClick={(e) => scrollToSection(e, model.found.claims!.targetId)}
              className="group mt-3 block rounded-2xl border border-brand-silver-soft bg-white p-4 no-underline shadow-soft transition-colors hover:border-brand-cobalt"
            >
              <span className="block text-[15px] font-bold text-brand-ink">
                {model.found.claims.title}
                <span className="sr-only">. Jump to the ledger.</span>
              </span>
              <span className="mt-2.5 block">
                <SegmentedBar
                  segments={model.found.claims.segments}
                  ariaLabel={`${model.found.claims.count} claims by result`}
                />
              </span>
              <SegmentLegend segments={model.found.claims.segments} />
            </a>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {model.found.tiles.map((tile) => (
              <Tile key={tile.key} tile={tile} />
            ))}
          </div>
        </div>

        {/* ------------------------------------------- what we could check */}
        {model.coverage && (
          <div className="mt-6">
            <GroupLabel>{OVERVIEW_GROUP_LABELS.coverage}</GroupLabel>
            <a
              href={`#${model.coverage.targetId}`}
              onClick={(e) => scrollToSection(e, model.coverage!.targetId)}
              className="group mt-3 block rounded-2xl border border-brand-silver-soft bg-white p-4 no-underline shadow-soft transition-colors hover:border-brand-cobalt"
            >
              <span className="block text-[15px] font-bold text-brand-ink">
                {model.coverage.title}
                <span className="sr-only">. Jump to the honesty panel.</span>
              </span>
              <span className="mt-2.5 block">
                <SegmentedBar
                  segments={model.coverage.segments}
                  ariaLabel="Checks attempted, by whether they ran"
                />
              </span>
              <SegmentLegend segments={model.coverage.segments} />
              {model.coverage.notApplicable > 0 && (
                <span className="mt-1 block text-[12px] text-brand-charcoal-soft">
                  Plus {model.coverage.notApplicable} not applicable to this vendor.
                </span>
              )}
            </a>
            <p className="mt-2 text-[13px] text-brand-charcoal-soft">
              Built from{" "}
              <a
                href={`#${model.coverage.sourcesTargetId}`}
                onClick={(e) => scrollToSection(e, model.coverage!.sourcesTargetId)}
                className="text-brand-cobalt underline underline-offset-2"
              >
                {model.coverage.sourcesLine}
              </a>
              .
            </p>
          </div>
        )}

        {/* ------------------------------------------------ what to do next */}
        {model.next.tiles.length > 0 && (
          <div className="mt-6">
            <GroupLabel>{OVERVIEW_GROUP_LABELS.next}</GroupLabel>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {model.next.tiles.map((tile) => (
                <Tile key={tile.key} tile={tile} />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
