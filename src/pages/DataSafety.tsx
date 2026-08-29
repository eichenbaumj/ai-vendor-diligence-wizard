import { Section } from "@/components/brand";

function Check({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`mt-1 h-5 w-5 shrink-0 ${className}`}
    >
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

export default function DataSafety() {
  return (
    <>
      <Section tone="tint" className="py-12! md:py-16!">
        <p className="font-sans text-sm font-bold tracking-[0.14em] text-brand-cobalt [font-variant-caps:all-small-caps]">
          Your data
        </p>
        <h1 className="mt-2 max-w-3xl font-serif text-[clamp(2rem,3.6vw,3rem)] font-bold leading-tight">
          What we keep, what we never do
        </h1>
        <p className="mt-5 max-w-2xl font-sans text-lg leading-relaxed">
          This tool is built for government staff, so it is built to be easy
          to explain to your IT and legal teams. Here is the whole picture.
        </p>
      </Section>

      <Section tone="white">
        <div className="mx-auto grid max-w-4xl gap-12 md:grid-cols-2">
          <div>
            <h2 className="font-serif text-2xl font-bold">What we store</h2>
            <ul className="mt-5 space-y-4 font-sans text-base leading-relaxed md:text-lg">
              <li className="flex gap-3">
                <Check className="text-brand-cobalt" />
                <span>
                  The pitch text you share (pasted, or extracted from a PDF or web page you submit) and the report we generate. Both
                  are kept for about 90 days, then deleted.
                </span>
              </li>
              <li className="flex gap-3">
                <Check className="text-brand-cobalt" />
                <span>
                  A log of the public-source checks each report ran, so
                  findings can be backed up if a vendor disputes one.
                </span>
              </li>
              <li className="flex gap-3">
                <Check className="text-brand-cobalt" />
                <span>
                  Reports live at private links. Save or print yours before it
                  expires; you can re-run the check any time.
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-serif text-2xl font-bold">What we never do</h2>
            <ul className="mt-5 space-y-4 font-sans text-base leading-relaxed md:text-lg">
              <li className="flex gap-3">
                <Check className="text-brand-cobalt" />
                <span>No account required, ever.</span>
              </li>
              <li className="flex gap-3">
                <Check className="text-brand-cobalt" />
                <span>No tracking and no ads.</span>
              </li>
              <li className="flex gap-3">
                <Check className="text-brand-cobalt" />
                <span>No selling or sharing of your data.</span>
              </li>
              <li className="flex gap-3">
                <Check className="text-brand-cobalt" />
                <span>
                  No public directory of what you checked. Reports are
                  on-demand only, and nobody can browse them.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </Section>

      <Section tone="vellum">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-serif text-2xl font-bold">Before you share</h2>
          <p className="mt-4 font-sans text-base leading-relaxed md:text-lg">
            Pitches are vendor marketing, so they rarely contain sensitive
            information. Still, remove anything about a resident or a case
            before pasting. As a backstop, the tool scrubs number patterns
            that look like Social Security numbers before anything is stored
            or analyzed.
          </p>

          <h2 className="mt-10 font-serif text-2xl font-bold">Where it runs</h2>
          <p className="mt-4 font-sans text-base leading-relaxed md:text-lg">
            The tool runs on hosted cloud infrastructure (Supabase) in the
            United States. Registry checks query public government sources
            directly. AI analysis runs through a commercial AI API under terms
            that do not use your inputs to train models.
          </p>

          <h2 className="mt-10 font-serif text-2xl font-bold">
            Check our work
          </h2>
          <p className="mt-4 font-sans text-base leading-relaxed md:text-lg">
            The code is open source, so your IT team can read exactly what
            happens to the text you paste, or run a private copy inside your
            own environment.{" "}
            <a
              href="https://github.com/eichenbaumj/ai-vendor-diligence-wizard"
              className="font-medium text-brand-cobalt underline decoration-brand-carolina decoration-2 underline-offset-2 hover:decoration-brand-cobalt"
            >
              View the source on GitHub
            </a>
            .
          </p>
        </div>
      </Section>
    </>
  );
}
