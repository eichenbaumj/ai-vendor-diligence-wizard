import { Section, PillButton } from "@/components/brand";

export default function Disputes() {
  return (
    <>
      <Section tone="tint" className="py-12! md:py-16!">
        <p className="font-sans text-sm font-bold tracking-[0.14em] text-brand-cobalt [font-variant-caps:all-small-caps]">
          Disputes and corrections
        </p>
        <h1 className="mt-2 max-w-3xl font-serif text-[clamp(2.25rem,5vw,4rem)] font-black leading-tight">
          Think we got something wrong? Tell us.
        </h1>
        <p className="mt-5 max-w-2xl font-sans text-lg leading-relaxed">
          Reports draw on public records, and public records can be wrong,
          stale, or matched to the wrong company. The dispute channel exists
          so errors get fixed fast. It is free.
        </p>
      </Section>

      <Section tone="white">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-serif text-2xl font-bold">Who can dispute</h2>
          <p className="mt-4 font-sans text-base leading-relaxed md:text-lg">
            The vendor named in a report, or someone authorized to speak for
            that vendor. If a report about your company contains a finding you
            believe is wrong, you can ask for a review at no cost.
          </p>

          <h2 className="mt-10 font-serif text-2xl font-bold">What to send</h2>
          <ul className="mt-4 list-disc space-y-3 pl-6 font-sans text-base leading-relaxed md:text-lg">
            <li>Your company's legal name and your role there.</li>
            <li>
              The specific finding you are disputing, quoted or described
              clearly.
            </li>
            <li>
              The evidence that shows it is wrong. For example: a registration
              record, a certification letter, a contract number, or a link to
              an official source.
            </li>
          </ul>

          <h2 className="mt-10 font-serif text-2xl font-bold">What happens next</h2>
          <p className="mt-4 font-sans text-base leading-relaxed md:text-lg">
            We review every dispute within 5 business days. While a finding is
            under review, it is marked "disputed by vendor, under review" in
            the report. If the finding is wrong, we correct it, and the
            correction carries through to every copy of the report the tool
            serves. If we stand by the finding, we explain why and cite the
            sources.
          </p>

          <h2 className="mt-10 font-serif text-2xl font-bold">
            How to reach us
          </h2>
          <p className="mt-4 font-sans text-base leading-relaxed md:text-lg">
            Email is the channel for now. An in-app dispute form is coming.
          </p>
          <div className="mt-6">
            <PillButton href="mailto:disputes@group17a.com" variant="primary">
              Email disputes@group17a.com
            </PillButton>
          </div>

          <p className="mt-10 border-t border-brand-ink/10 pt-6 font-sans text-base leading-relaxed text-brand-charcoal-soft">
            A note on what reports say: when the tool cannot confirm a claim,
            the report says it could not verify the claim in public sources.
            That is not a finding of wrongdoing, and reports never make one.
            The dispute channel is here for the cases where even that careful
            statement rests on an error.
          </p>
        </div>
      </Section>
    </>
  );
}
