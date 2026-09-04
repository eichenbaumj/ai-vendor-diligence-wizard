/*
  Who made this and why. Report readers arrive by deep link and may never
  see the landing page, so provenance needs a stable destination the header
  can point at from anywhere. While the beta notice is on, the status block
  comes first: the phase banner links here.
*/
import { Link } from "react-router-dom";
import { Section } from "@/components/brand";
import { BETA_ABOUT, BETA_NOTICE_ENABLED } from "@/lib/beta-notice";

const BLOCK_HEADING = "font-serif text-2xl font-bold leading-tight";
const BLOCK_BODY = "mt-3 max-w-2xl font-sans text-[15px] leading-relaxed";
const INLINE_LINK =
  "text-brand-cobalt underline underline-offset-2 hover:text-brand-cobalt-deep";

export default function About() {
  return (
    <>
      <Section tone="tint" className="py-12! md:py-16!">
        <p className="font-sans text-sm font-bold tracking-[0.14em] text-brand-cobalt [font-variant-caps:all-small-caps]">
          Why we made this
        </p>
        <h1 className="mt-2 max-w-3xl font-serif text-[clamp(2rem,3.6vw,3rem)] font-bold leading-tight">
          A free check, from people who want government technology to work.
        </h1>
        <p className="mt-5 max-w-2xl font-sans text-lg leading-relaxed">
          The AI Vendor Diligence Wizard is built by 17A with New America.
          We are genuinely excited about what new AI tools can
          do for state and local government, and we know what it is like to
          buy them right now. So we built the first hour of diligence and made
          it free.
        </p>
      </Section>

      <Section tone="white" className="py-14! md:py-20!">
        <div className="mx-auto max-w-3xl space-y-12">
          {BETA_NOTICE_ENABLED && (
            <div id={BETA_ABOUT.id} className="scroll-mt-24">
              <h2 className={BLOCK_HEADING}>{BETA_ABOUT.heading}</h2>
              {BETA_ABOUT.paragraphs.map((text) => (
                <p key={text} className={BLOCK_BODY}>
                  {text}
                </p>
              ))}
              <p className={BLOCK_BODY}>
                {BETA_ABOUT.feedback.lead} {BETA_ABOUT.feedback.vendorsBefore}{" "}
                <Link to="/disputes" className={INLINE_LINK}>
                  {BETA_ABOUT.feedback.vendorsLink}
                </Link>
                {BETA_ABOUT.feedback.vendorsAfter}
              </p>
            </div>
          )}
          <div>
            <h2 className={BLOCK_HEADING}>Why we built it</h2>
            <p className={BLOCK_BODY}>
              New AI tools can help governments deliver excellent services,
              and we want that future to arrive. But buying AI for a city or a
              state today feels like buying auto parts in 1910. The invention
              is real, the market is young, quality varies wildly, and trusted
              mechanics are hard to find.
            </p>
            <p className={BLOCK_BODY}>
              We believe in getting quality tools into public hands, and in
              asking every vendor the hard questions early. Public staff time
              is valuable, and state and local government deserves the best.
            </p>
            <p className={BLOCK_BODY}>
              We built this tool because the first hour of due diligence is
              where automation pays off most. That hour is the hardest to
              invest: where should you start, and why research this pitch
              instead of that one, when they all look the same? It is also the
              hour a computer does best. Only an expert can judge a vendor's
              scope, references, and team. Checking registries, records, and
              claims at the top of the funnel is work a computer can do on
              every pitch, in minutes.
            </p>
          </div>

          <div>
            <h2 className={BLOCK_HEADING}>Who we are</h2>
            <p className={BLOCK_BODY}>
              17A is a consulting firm that works with state and local
              governments on technology and data. New America is a
              nonpartisan think tank in Washington, D.C. that works on
              technology and public policy.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-4">
              <a href="https://group17a.com" aria-label="17A">
                <img
                  src="/brand-17a-cobalt.svg"
                  alt="17A"
                  className="h-9 w-auto"
                />
              </a>
              <a
                href="https://www.newamerica.org/"
                aria-label="New America"
                className="border-l border-brand-silver pl-6"
              >
                <img
                  src="/brand-newamerica-ink.svg"
                  alt="New America"
                  className="h-8 w-auto"
                />
              </a>
            </div>
          </div>

          <div>
            <h2 className={BLOCK_HEADING}>What this tool never does</h2>
            <p className={BLOCK_BODY}>
              It never recommends buying or not buying, and it never scores a
              company with a number. Absence of a record is never treated as
              proof of anything. Every negative statement carries its source
              and its date. A vendor who believes a report is wrong can use
              the{" "}
              <Link to="/disputes" className={INLINE_LINK}>
                corrections page
              </Link>
              , and a person reviews every dispute.
            </p>
          </div>

          <div>
            <h2 className={BLOCK_HEADING}>Look under the hood</h2>
            <p className={BLOCK_BODY}>
              The{" "}
              <Link to="/methodology" className={INLINE_LINK}>
                methodology
              </Link>{" "}
              lists every check the tool runs and every source it consults.
              For a plain-language walk through one check, with rules you
              can try yourself, read{" "}
              <Link to="/how-it-works" className={INLINE_LINK}>
                how a check runs
              </Link>
              .{" "}
              <Link to="/your-data" className={INLINE_LINK}>
                Your data
              </Link>{" "}
              explains what is stored and what never is. The{" "}
              <a
                href="https://github.com/eichenbaumj/ai-vendor-diligence-wizard"
                className={INLINE_LINK}
              >
                source code is public
              </a>
              .
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
