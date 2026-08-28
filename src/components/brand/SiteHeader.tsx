import { Link } from "react-router-dom";
import { PillButton } from "./PillButton";

const NAV_LINK =
  "font-sans text-base font-medium text-brand-charcoal no-underline transition-colors hover:text-brand-cobalt";

export function SiteHeader() {
  return (
    <header className="no-print sticky top-0 z-40 border-b border-brand-ink/10 bg-brand-cream/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3.5 md:px-8">
        <Link
          to="/"
          className="font-serif text-lg font-bold leading-tight text-brand-ink no-underline md:text-xl"
        >
          AI Vendor Diligence Wizard
        </Link>
        <nav aria-label="Main" className="flex items-center gap-3 md:gap-7">
          <Link to="/methodology" className={`hidden sm:block ${NAV_LINK}`}>
            How it works
          </Link>
          <Link to="/your-data" className={`hidden sm:block ${NAV_LINK}`}>
            Your data
          </Link>
          <PillButton to="/check" size="md">
            Check a pitch
          </PillButton>
        </nav>
      </div>
    </header>
  );
}
