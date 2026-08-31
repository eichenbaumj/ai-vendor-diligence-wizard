import { Link } from "react-router-dom";
import {
  Section,
  PillButton,
  MarqueeBand,
  DotField,
  TierBadge,
} from "@/components/brand";
import {
  ResultChip,
  EvidenceTierBadge,
} from "@/components/report/VerificationLedger";
import { SAMPLE_REPORTS } from "@/lib/sample-reports";
import type { LedgerRow } from "@/lib/types";

/*
  The hero specimen is a genuine fragment of the Kestrel sample report
  (a fictional vendor), rendered with the same components the real report
  page uses. The row ids are pinned by tests/unit/sample-reports.test.ts.
*/
const SPECIMEN_REPORT = SAMPLE_REPORTS.kestrel;
const SPECIMEN_ROW_IDS = ["kes-L1", "kes-L2", "kes-L3", "kes-L4"];
/* Below lg, only the two rows that carry the contrast stay visible. */
const SPECIMEN_MOBILE_ROW_IDS = new Set(["kes-L2", "kes-L3"]);

const SPECIMEN_ROWS = SPECIMEN_ROW_IDS.map((id) =>
  SPECIMEN_REPORT.ledger.find((row) => row.id === id),
).filter((row): row is LedgerRow => row !== undefined);

const SPECIMEN_DATE = new Date(SPECIMEN_REPORT.meta.generated_at)
  .toLocaleDateString("en-US", { month: "short", year: "numeric" })
  .toUpperCase();

/* The fixture's display name carries a "(sample, fictional)" suffix for the
   report page; the caption under the card covers that here. */
const SPECIMEN_NAME = SPECIMEN_REPORT.meta.vendor_display_name
  .replace(/\s*\(.*\)\s*$/, "")
  .toUpperCase();

function specimenSourceHost(row: LedgerRow): string | null {
  const url = row.sources[0]?.url;
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "").toUpperCase();
  } catch {
    return null;
  }
}

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
    body: "The tool looks the company up in SEC EDGAR, which covers venture-funded companies in every state, plus state business registries, SAM.gov, USAspending, the FedRAMP marketplace, and news archives, among others. Every check is logged with a source link and a date.",
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
    q: "Who sees what I share?",
    a: "The pitch text (pasted, or extracted from a PDF or web page you submit) and the report are stored for about 90 days, then deleted. PDF files themselves are not stored. There is no account, no tracking, no ads, and no public list of what anyone checked. See the Your data page for details.",
  },
  {
    q: "What does it cost?",
    a: "Nothing. The tool is free and the code is open source. Agencies that want full control can run their own copy.",
  },
  {
    q: "What if the vendor disputes a finding?",
    a: "Any vendor named in a report can ask for a review at no cost. A person reviews every dispute, and the item is marked as disputed and under review until it is resolved. See the Disputes and corrections page.",
  },
  {
    q: "Can I trust the AI parts?",
    a: "The checks that matter most do not rest on AI judgment. Registry lookups run as plain code against official sources, and the most serious verdict can only come from logged registry results. AI helps read the pitch and search the web, and everything it reports carries a source link and a date so you can check it yourself.",
  },
  {
    q: "Does it punish small vendors?",
    a: "No. A missing certification or a short track record is never counted against a vendor on its own. Young companies are held to a bar sized for young companies, and the report says which bar it applied. What raises a flag is contradiction, like a claim of a decade of government work from a company whose website is four months old.",
  },
  {
    q: "How much of the country can it search?",
    a: "More than it may look like at first. SEC EDGAR is a national net: nearly every venture-funded company files a Form D there, naming its state of incorporation, wherever it operates. Federal sources like SAM.gov and USAspending are national too. Five state registries offer free automated search today (New York, Colorado, Connecticut, Oregon, and Texas); for every other state the report gives you a direct link to the official registry and a one-minute manual check.",
  },
  {
    q: "Does a high tier mean the vendor is good?",
    a: "No. A high tier means the company's claims match public records. It says nothing about whether the product works well or the team delivers. A fully verifiable vendor can still be the wrong choice, and a young vendor with a thin public record can still be excellent. The report measures what can be verified, and the question pack helps you judge the rest.",
  },
];

export default function Landing() {
  return (
    <>
      {/* 1. Hero: the product IS the billboard — an evidence-ledger specimen
          beside an editorial headline, instead of a generic SaaS card. */}
      <Section tone="cobalt" className="relative overflow-hidden">
        <DotField className="pointer-events-none absolute inset-0 text-white" />
        <div className="relative grid items-center gap-12 lg:grid-cols-[7fr_5fr]">
          <div>
            <p className="font-mono text-[13px] tracking-wide text-white/70">
              methodology v1.4 · open source · 30+ public-record checks
            </p>
            <h1 className="mt-5 font-serif text-[clamp(2.6rem,5.4vw,4.5rem)] font-bold leading-[1.02] tracking-tight">
              Got an AI vendor pitch? Check it before you spend an hour on it.
            </h1>
            <p className="mt-7 max-w-2xl font-sans text-lg leading-relaxed text-brand-cobalt-100 md:text-xl">
              Give us the website, the email, or just the name. We check the
              company against public records and registries, then hand you the
              questions to send back. Free, open, built for state and local
              government.
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

          {/* The specimen: a genuine fragment of the Kestrel sample report,
              rendered with the report page's own components. */}
          <Link
            to="/check?sample=kestrel"
            aria-label="Open the full sample report for Kestrel Permit AI, a fictional vendor"
            className="group block"
          >
            <div className="rounded-md border border-white/20 bg-white text-brand-charcoal shadow-soft-lg transition-transform duration-200 group-hover:-translate-y-0.5">
              <div className="flex items-baseline justify-between gap-4 border-b border-brand-silver-soft px-5 py-3">
                <span className="font-mono text-[11px] tracking-[0.12em] text-brand-steel">
                  VERIFICATION LEDGER · {SPECIMEN_NAME}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-brand-steel">
                  {SPECIMEN_DATE}
                </span>
              </div>
              <ul className="divide-y divide-brand-silver-soft">
                {SPECIMEN_ROWS.map((row) => (
                  <li
                    key={row.id}
                    className={`px-5 py-3 ${
                      SPECIMEN_MOBILE_ROW_IDS.has(row.id)
                        ? ""
                        : "hidden lg:block"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <ResultChip result={row.result} />
                      <EvidenceTierBadge tier={row.evidence_tier} />
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug">
                      {row.claim_quote ? (
                        <>&ldquo;{row.claim_quote}&rdquo;</>
                      ) : (
                        row.what_checked
                      )}
                    </p>
                    {specimenSourceHost(row) && (
                      <p className="mt-1 font-mono text-[11px] tracking-wide text-brand-steel">
                        {specimenSourceHost(row)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-silver-soft px-5 py-4">
                <TierBadge tier={SPECIMEN_REPORT.verdict.tier} />
                <span className="font-mono text-[11px] tabular-nums text-brand-steel">
                  MEETS {SPECIMEN_REPORT.verdict.checks_met.met} OF{" "}
                  {SPECIMEN_REPORT.verdict.checks_met.total} CHECKS
                </span>
              </div>
            </div>
            <p className="mt-3 text-center font-mono text-[11px] text-white/60">
              a report fragment · fictional vendor · open the full sample
            </p>
          </Link>
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
        <p className="flex items-baseline gap-3 font-sans text-sm font-bold tracking-[0.14em] [font-variant-caps:all-small-caps] text-brand-cobalt">
          <span className="font-mono text-[13px] font-medium tracking-normal text-brand-steel">01</span>
          How it works
        </p>
        <h2 className="mt-4 max-w-2xl font-serif text-[clamp(1.9rem,3.4vw,2.75rem)] font-bold leading-tight">
          What happens when you paste a pitch
        </h2>
        <div className="mt-12 grid gap-12 md:grid-cols-3 md:gap-8">
          {STEPS.map((step) => (
            <div key={step.n}>
              <span
                aria-hidden="true"
                className="block font-serif text-6xl font-bold leading-none text-brand-cobalt"
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
          <p className="flex items-baseline gap-3 font-sans text-sm font-bold tracking-[0.14em] [font-variant-caps:all-small-caps] text-brand-cobalt">
          <span className="font-mono text-[13px] font-medium tracking-normal text-brand-steel">02</span>
          Why it exists
        </p>
        <h2 className="mt-4 font-serif text-[clamp(1.9rem,3.4vw,2.75rem)] font-bold leading-tight">
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
            <p className="flex items-baseline gap-3 font-sans text-sm font-bold tracking-[0.14em] [font-variant-caps:all-small-caps] text-brand-cobalt">
          <span className="font-mono text-[13px] font-medium tracking-normal text-brand-steel">03</span>
          The methodology
        </p>
        <h2 className="mt-4 font-serif text-[clamp(1.9rem,3.4vw,2.75rem)] font-bold leading-tight">
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
        <p className="flex items-baseline gap-3 font-sans text-sm font-bold tracking-[0.14em] [font-variant-caps:all-small-caps] text-brand-cobalt">
          <span className="font-mono text-[13px] font-medium tracking-normal text-brand-steel">04</span>
          Questions
        </p>
        <h2 className="mt-4 font-serif text-[clamp(1.9rem,3.4vw,2.75rem)] font-bold leading-tight">
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
