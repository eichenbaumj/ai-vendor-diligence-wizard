import { Link } from "react-router-dom";
import { PillButton } from "./PillButton";
import { IS_MOCK } from "@/lib/config";

const NAV_LINK =
  "font-sans text-base font-medium text-brand-charcoal no-underline transition-colors hover:text-brand-cobalt";

export function SiteHeader() {
  return (
    <header className="no-print sticky top-0 z-40 border-b border-brand-ink/10 bg-brand-cream/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3.5 md:px-8">
        <span className="flex min-w-0 items-center gap-3">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2.5 whitespace-nowrap font-serif text-lg font-bold leading-tight text-brand-ink no-underline md:text-xl"
          >
            <img
              src="/brand-17a-cobalt.svg"
              alt="17A"
              className="h-5 w-auto md:h-6"
            />
            {/* Full name from 460px to sm (the row is logo, name, one
                button) and from 820px up. Between sm and 820px the short
                name gives the nav links room: the full name plus two links
                met at 768px and overlapped by 29px at 640px. Below 460px
                the short name keeps the single button on the row; the full
                name sat 6px from the button at 440px. (All measured
                2026-09-02; the link is shrink-0 so the numbers are honest.) The two
                ranges are written so they never overlap: an arbitrary
                min-[820px] rule lost to sm:hidden in the emitted CSS. */}
            <span className="hidden min-[460px]:max-[640px]:inline min-[820px]:inline">
              AI Vendor Diligence Wizard
            </span>
            <span className="min-[460px]:max-[640px]:hidden min-[820px]:hidden">
              Diligence Wizard
            </span>
          </Link>
          {IS_MOCK && (
            <span
              className="hidden rounded-pill border border-status-warn bg-status-warn-soft px-2.5 py-0.5 font-sans text-xs font-bold uppercase tracking-wide text-status-warn-text xl:inline-block"
              title="The live research engine is not connected. Evaluations replay fictional sample reports."
            >
              Preview
            </span>
          )}
        </span>
        <nav aria-label="Main" className="flex shrink-0 items-center gap-3 md:gap-5 lg:gap-7">
          {/* Order: purpose first, then the walk-through, then data handling,
              then the full methodology. Purpose and attribution stay reachable
              without scrolling from sm up. Below sm the row is logo, title and
              the one button, so nothing wraps at 375px; /about stays one tap
              away in the footer. Your data and Methodology join at lg: with
              the full name, three links overlapped the name by 76px at 768px
              wide, and four links fit at 1024px with 30px to spare (measured
              2026-09-02). Every link stays in the footer at every width. */}
          <Link to="/about" className={`hidden sm:block ${NAV_LINK}`}>
            Why we made this
          </Link>
          <Link to="/how-it-works" className={`hidden sm:block ${NAV_LINK}`}>
            How it works
          </Link>
          <Link to="/your-data" className={`hidden lg:block ${NAV_LINK}`}>
            Your data
          </Link>
          <Link to="/methodology" className={`hidden lg:block ${NAV_LINK}`}>
            Methodology
          </Link>
          <PillButton
            to="/check"
            size="md"
            className="shrink-0 max-sm:px-4 max-sm:py-2 max-sm:text-sm"
          >
            Check a pitch
          </PillButton>
        </nav>
      </div>
    </header>
  );
}
