/*
  Phase banner, in the GOV.UK sense: a thin band under the header on every
  page while the tool is in beta. Normal flow (never sticky, so the
  scroll-mt-24 anchor offsets and the header's measured widths are
  untouched), never dismissible, hidden in print (the report's date band
  and verdict pill carry the notice onto paper). Band and hairline are the
  DisclaimerHeader recipe; the solid deep-amber tag carries the color
  (white on #8A5504 is 6.2:1). Every word comes from src/lib/beta-notice.ts.
  Renders nothing once BETA_NOTICE is off.
*/
import { Link } from "react-router-dom";
import { BETA_BANNER, BETA_NOTICE_ENABLED, BETA_TAG } from "@/lib/beta-notice";

export function BetaBanner({
  enabled = BETA_NOTICE_ENABLED,
}: {
  enabled?: boolean;
}) {
  if (!enabled) return null;
  return (
    <div role="note" className="no-print border-b border-brand-silver bg-brand-vellum">
      <p className="mx-auto w-full max-w-6xl px-5 py-2.5 font-sans text-sm leading-snug text-brand-charcoal md:px-8">
        <strong className="mr-2.5 inline-block rounded-pill bg-status-warn-text px-2 py-0.5 align-middle font-sans text-xs font-bold uppercase leading-none tracking-wide text-white">
          {BETA_TAG}
        </strong>
        <span className="align-middle">
          {/* Long and short forms swap at sm, the header's own pattern. */}
          <span className="hidden sm:inline">{BETA_BANNER.full} </span>
          <span className="sm:hidden">{BETA_BANNER.short} </span>
          <Link
            to={BETA_BANNER.link.to}
            className="whitespace-nowrap text-brand-cobalt underline underline-offset-2 hover:text-brand-cobalt-deep"
          >
            {BETA_BANNER.link.label}
          </Link>
        </span>
      </p>
    </div>
  );
}
