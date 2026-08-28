import {
  Section,
  PillButton,
  MarqueeBand,
  DotField,
} from "@/components/brand";

const MARQUEE_ITEMS = [
  "State business registries",
  "SAM.gov exclusions",
  "FedRAMP marketplace",
  "Federal award records",
  "Domain history",
  "Web archive snapshots",
  "SEC filings",
  "News archives",
  "Security attestations",
  "GovRAMP participants",
  "Cooperative contracts",
  "Court records",
];

const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: "1",
    title: "Paste the pitch",
    body: "Copy the vendor's email into the box. A link or a company name works too. No account, no sign-up, nothing to install.",
  },
  {
    n: "2",
    title: "We check public sources",
    body: "The tool looks the company up in state business registries, SAM.gov, USAspending, the FedRAMP marketplace, and news archives, among others. Every check is logged with a source link and a date.",
  },
  {
    n: "3",
    title: "You get the report",
    body: "A clear verdict tier, the evidence behind it, and a set of questions you can send back to the vendor word for word.",
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "Is this a purchase recommendation?",
    a: "No. The tool never says buy or don't buy, and it never gives a score. It tells you what public records show about the company, what it could not verify, and what to ask next. What you do with that is your call.",
  },
  {
    q: "Who sees what I paste?",
    a: "The pitch you paste and the report are stored for about 90 days, then deleted. There is no account, no tracking, no ads, and no public list of what anyone checked. See the Your data page for details.",
  },
  {
    q: "What does it cost?",
    a: "Nothing. The tool is free and the code is open source. Agencies that want full control can run their own copy.",
  },
  {
    q: "What if the vendor disputes a finding?",
    a: "Any vendor named in a report can ask for a review at no cost. We review within 5 business days, and the item is marked as disputed and under review until it is resolved. See the Disputes and corrections page.",
  },
  {
    q: "Can I trust the AI parts?",
    a: "The checks that matter most do not rest on AI judgment. Registry lookups run as plain code against official sources, and the most serious verdict can only come from logged registry results. AI helps read the pitch and search the web, and everything it reports carries a source link and a date so you can check it yourself.",
  },
  {
    q: "Does it punish small vendors?",
    a: "No. A missing certification or a short track record is never counted against a vendor on its own. Young companies are held to a bar sized for young companies, and the report says which bar it applied. What raises a flag is contradiction, like a claim of a decade of government work from a company whose website is four months old.",
  },
];

export default function Landing() {
  return (
    <>
      {/* 1. Hero: cobalt billboard with ambient dot texture. */}
      <Section tone="cobalt" className="relative overflow-hidden">
        <DotField className="pointer-events-none absolute inset-0 text-white" />
        <div className="relative max-w-4xl">
          <h1 className="font-serif text-[clamp(2.75rem,6.5vw,5.5rem)] font-black leading-[1.02] tracking-tight">
            Got an AI vendor pitch? Check it before you spend an hour on it.
          </h1>
          <p className="mt-7 max-w-2xl font-sans text-lg leading-relaxed text-brand-cobalt-100 md:text-xl">
            Paste the email. We check the company against public records and
            registries, then hand you the questions to send back. Free, open,
            built for state and local government.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <PillButton to="/check" variant="inverse" size="lg">
              Check a pitch
            </PillButton>
            <PillButton to="/check?sample=meridian" variant="ghost" size="lg">
              Try a sample pitch
            </PillButton>
          </div>
        </div>
      </Section>

      {/* 2. Honesty strip: thin vellum band directly under the hero. */}
      <div className="w-full bg-brand-vellum">
        <p className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-5 py-4 font-sans text-base font-medium text-brand-charcoal md:px-8">
          <span>Runs 30+ automated checks against public registries.</span>
          <span aria-hidden="true" className="text-brand-cobalt">
            ·
          </span>
          <span>Shows you what it could and could not verify.</span>
          <span aria-hidden="true" className="text-brand-cobalt">
            ·
          </span>
          <span>Never says buy or don't buy.</span>
        </p>
      </div>

      {/* 3. What happens: three serif-numeral steps on cream. */}
      <Section tone="cream">
        <h2 className="max-w-2xl font-serif text-[clamp(2rem,4vw,3.25rem)] font-bold leading-tight">
          What happens when you paste a pitch
        </h2>
        <div className="mt-12 grid gap-12 md:grid-cols-3 md:gap-8">
          {STEPS.map((step) => (
            <div key={step.n}>
              <span
                aria-hidden="true"
                className="block font-serif text-7xl font-black leading-none text-brand-cobalt"
              >
                {step.n}
              </span>
              <span className="mt-4 block h-[3px] w-12 bg-brand-carolina" />
              <h3 className="mt-5 font-serif text-2xl font-bold">
                {step.title}
              </h3>
              <p className="mt-3 font-sans text-base leading-relaxed md:text-lg">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* 4. Kinetic texture: the checks themselves as a marquee band. */}
      <MarqueeBand items={MARQUEE_ITEMS} tone="cobalt" />

      {/* 5. The problem, stated plainly, on a pale cobalt tint field. */}
      <Section tone="tint">
        <div className="max-w-3xl">
          <h2 className="font-serif text-[clamp(2rem,4vw,3.25rem)] font-bold leading-tight">
            Built for the flood
          </h2>
          <p className="mt-7 font-sans text-lg leading-relaxed md:text-xl">
            If you work in state or local government, your inbox fills with AI
            pitches. Some come from serious companies. Some come from companies
            formed last month. They often look the same, and nobody has an hour
            to vet each one.
          </p>
          <p className="mt-5 font-sans text-lg leading-relaxed md:text-xl">
            The sell side now has AI tools writing thousands of polished
            emails. The buy side has an inbox. This tool gives the buy side a
            fast, honest first read, grounded in public records, so staff time
            goes to the vendors who earn it.
          </p>
        </div>
      </Section>

      {/* 6. Methodology teaser on white. */}
      <Section tone="white">
        <div className="flex flex-col items-start gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-serif text-[clamp(2rem,4vw,3.25rem)] font-bold leading-tight">
              Read exactly how it works
            </h2>
            <p className="mt-6 font-sans text-lg leading-relaxed">
              Every check the tool runs is published in the open methodology,
              with the source it queries and how the result can affect the
              verdict. There are no secret checks. The code is open source, so
              anyone can read it, run it, or improve it.
            </p>
          </div>
          <PillButton to="/methodology" variant="ghost" size="lg">
            Read the methodology
          </PillButton>
        </div>
      </Section>

      {/* 7. FAQ on cream. */}
      <Section tone="cream">
        <h2 className="font-serif text-[clamp(2rem,4vw,3.25rem)] font-bold leading-tight">
          Common questions
        </h2>
        <div className="mt-10 max-w-3xl divide-y divide-brand-ink/10 border-y border-brand-ink/10">
          {FAQS.map((faq) => (
            <details key={faq.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-xl font-bold text-brand-ink [&::-webkit-details-marker]:hidden">
                {faq.q}
                <span
                  aria-hidden="true"
                  className="shrink-0 font-sans text-2xl font-light text-brand-cobalt transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-4 max-w-2xl font-sans text-base leading-relaxed md:text-lg">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </Section>
    </>
  );
}
