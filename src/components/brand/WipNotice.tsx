/*
  The work-in-progress notice, in two shapes for one job while the tool is in
  field testing. Every word comes from src/lib/wip-notice.ts; both shapes
  render nothing once WIP_NOTICE is off.

  WipRibbon: a construction-tape ribbon slanted across the top-right corner.
  It is rendered inside SiteHeader, whose sticky position makes it the
  containing block, so the ribbon stays in the viewport corner on every page
  and scroll position, and disappears in print with the header. Geometry and
  stripes live in brand.css (.wip-ribbon). Shown from md up; below that the
  header row has no room beside its one button (the short brand name and two
  links already fill a 640px row), so WipBand takes over.

  WipBand: a thin vellum band in normal flow directly under the header, below
  md only. Never sticky, never dismissible, hidden in print (the report's date
  band and verdict pill carry the notice onto paper).
*/
import { Link } from "react-router-dom";
import { WIP_BAND, WIP_NOTICE_ENABLED, WIP_RIBBON } from "@/lib/wip-notice";

export function WipRibbon({
  enabled = WIP_NOTICE_ENABLED,
}: {
  enabled?: boolean;
}) {
  if (!enabled) return null;
  return (
    <div className="wip-ribbon hidden md:block">
      <Link to={WIP_RIBBON.to} title={WIP_RIBBON.title} className="wip-ribbon__band">
        {WIP_RIBBON.text}
      </Link>
    </div>
  );
}

export function WipBand({
  enabled = WIP_NOTICE_ENABLED,
}: {
  enabled?: boolean;
}) {
  if (!enabled) return null;
  return (
    <div role="note" className="no-print border-b border-brand-silver bg-brand-vellum md:hidden">
      <p className="mx-auto w-full max-w-6xl px-5 py-2.5 font-sans text-sm leading-snug text-brand-charcoal">
        <strong className="mr-2.5 inline-block rounded-pill border border-brand-ink bg-caution px-2 py-0.5 align-middle font-sans text-xs font-bold uppercase leading-none tracking-wide text-brand-ink">
          {WIP_BAND.tag}
        </strong>
        <span className="align-middle">
          {WIP_BAND.text}{" "}
          <Link
            to={WIP_BAND.link.to}
            className="whitespace-nowrap text-brand-cobalt underline underline-offset-2 hover:text-brand-cobalt-deep"
          >
            {WIP_BAND.link.label}
          </Link>
        </span>
      </p>
    </div>
  );
}
