import { Link } from "react-router-dom";

const FOOTER_LINK =
  "font-sans text-base text-brand-vellum no-underline transition-colors hover:text-white hover:underline";

export function SiteFooter() {
  return (
    <footer className="no-print bg-brand-ink text-brand-vellum">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-16 md:grid-cols-3 md:px-8">
        <div>
          <p className="font-serif text-xl font-bold text-white">
            AI Vendor Diligence Wizard
          </p>
          <p className="mt-3 max-w-xs font-sans text-base leading-relaxed">
            A free tool for state and local government staff. Paste an AI
            vendor pitch and get a first read grounded in public records,
            plus the questions to send back.
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 className="font-sans text-sm font-bold tracking-[0.14em] text-brand-steel [font-variant-caps:all-small-caps]">
            Learn more
          </h2>
          <ul className="mt-4 space-y-3">
            <li>
              <Link to="/about" className={FOOTER_LINK}>
                Why we made this
              </Link>
            </li>
            <li>
              <Link to="/methodology" className={FOOTER_LINK}>
                Methodology
              </Link>
            </li>
            <li>
              <Link to="/how-it-works" className={FOOTER_LINK}>
                How it works
              </Link>
            </li>
            <li>
              <Link to="/your-data" className={FOOTER_LINK}>
                Your data
              </Link>
            </li>
            <li>
              <Link to="/disputes" className={FOOTER_LINK}>
                Disputes and corrections
              </Link>
            </li>
            <li>
              <Link to="/terms" className={FOOTER_LINK}>
                Terms of use
              </Link>
            </li>
            <li>
              <a
                href="https://github.com/eichenbaumj/ai-vendor-diligence-wizard"
                className={FOOTER_LINK}
              >
                Source code on GitHub
              </a>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="font-sans text-sm font-bold tracking-[0.14em] text-brand-steel [font-variant-caps:all-small-caps]">
            A project of
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-4">
            <img src="/brand-17a-white.svg" alt="17A" className="h-8 w-auto" />
            <a
              href="https://www.newamerica.org/"
              aria-label="New America"
              className="border-l border-white/25 pl-6"
            >
              <img src="/brand-newamerica-white.svg" alt="New America" className="h-7 w-auto" />
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 md:px-8">
          <p className="font-sans text-sm text-brand-silver">
            Open methodology. Open source. Never a purchase recommendation.
          </p>
          <p className="font-sans text-sm text-brand-steel">
            Code licensed Apache-2.0.
          </p>
        </div>
      </div>
    </footer>
  );
}
