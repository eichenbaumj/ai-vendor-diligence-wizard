/*
  Terms of use, in plain language. DRAFT: final language goes through a
  lawyer before public launch (a Session C gate); the Draft pill below
  comes off only after that review.

  The real protections live in the product, not here: every negative
  statement carries source and date, absence is never adverse, the tool
  never recommends buying or not buying, and disputes get human review.
  These terms state the boundaries around that.
*/
import { Link } from "react-router-dom";
import { Section } from "@/components/brand";

const BLOCK_HEADING = "font-serif text-2xl font-bold leading-tight";
const BLOCK_BODY = "mt-3 max-w-2xl font-sans text-[15px] leading-relaxed";
const INLINE_LINK =
  "text-brand-cobalt underline underline-offset-2 hover:text-brand-cobalt-deep";

export default function Terms() {
  return (
    <>
      <Section tone="tint" className="py-12! md:py-16!">
        <p className="font-sans text-sm font-bold tracking-[0.14em] text-brand-cobalt [font-variant-caps:all-small-caps]">
          Terms of use
        </p>
        <h1 className="mt-2 flex max-w-3xl flex-wrap items-center gap-3 font-serif text-[clamp(2rem,3.6vw,3rem)] font-bold leading-tight">
          The terms, in plain language.
          <span className="rounded-pill border border-status-warn bg-status-warn-soft px-3 py-1 font-sans text-xs font-bold uppercase tracking-wide text-status-warn">
            Draft
          </span>
        </h1>
        <p className="mt-5 max-w-2xl font-sans text-lg leading-relaxed">
          These terms cover your use of this tool and the reports it produces.
          They are written to be read.
        </p>
      </Section>

      <Section tone="white" className="py-14! md:py-20!">
        <div className="mx-auto max-w-3xl space-y-12">
          <div>
            <h2 className={BLOCK_HEADING}>What a report is</h2>
            <p className={BLOCK_BODY}>
              A report is a point-in-time summary of what public records
              showed about a vendor pitch on the day of the check, together
              with our opinion of what those records mean. Every negative
              statement carries its source and its date. Absence of a record
              is never treated as proof of anything. A report is not a finding
              of wrongdoing, and the tool never recommends buying or not
              buying.
            </p>
          </div>

          <div>
            <h2 className={BLOCK_HEADING}>What you may rely on it for</h2>
            <p className={BLOCK_BODY}>
              Reports are a starting point for your own diligence, not a
              substitute for it. They are not legal, procurement, or
              investment advice. Public records change, and every report
              carries an expiry date: re-run a check before relying on one.
            </p>
          </div>

          <div>
            <h2 className={BLOCK_HEADING}>No warranty</h2>
            <p className={BLOCK_BODY}>
              The tool and its reports are provided as is, without warranty of
              any kind. Public sources can be wrong, incomplete, or out of
              date, and automated checks can miss things. We do not promise
              that any report is complete, current, or free of error.
            </p>
          </div>

          <div>
            <h2 className={BLOCK_HEADING}>Limits on our liability</h2>
            <p className={BLOCK_BODY}>
              To the fullest extent the law allows, we are not liable for
              decisions made in reliance on a report, or for indirect,
              incidental, or consequential damages arising from use of this
              tool. If you believe a report is wrong, the corrections process
              below is the path to fixing it.
            </p>
          </div>

          <div>
            <h2 className={BLOCK_HEADING}>Corrections and disputes</h2>
            <p className={BLOCK_BODY}>
              If you are the vendor and something in a report about your
              company is wrong, use the{" "}
              <Link to="/disputes" className={INLINE_LINK}>
                disputes page
              </Link>
              . A person reviews every dispute, and when a correction is
              warranted, the report is corrected.
            </p>
          </div>

          <div>
            <h2 className={BLOCK_HEADING}>The code and the content</h2>
            <p className={BLOCK_BODY}>
              The tool's{" "}
              <a
                href="https://github.com/eichenbaumj/ai-vendor-diligence-wizard"
                className={INLINE_LINK}
              >
                source code
              </a>{" "}
              is open under the Apache 2.0 license, and the methodology is
              published under CC BY 4.0. Those licenses cover the code and the
              methodology documents. Report content is our opinion of public
              records as of the check date.
            </p>
          </div>

          <div>
            <h2 className={BLOCK_HEADING}>Fair use of the service</h2>
            <p className={BLOCK_BODY}>
              Do not use the tool to harass a company or a person, to
              overwhelm the service, or to misrepresent what a report says.
              We may limit access to keep the tool available for the people it
              was built for: public servants deciding how to spend public
              money.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
