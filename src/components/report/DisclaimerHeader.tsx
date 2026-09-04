/*
  Thin vellum disclaimer band at the top of every report. Per-report
  contextual disclaimer, not TOS boilerplate (methodology section 5, rule 8).
  Also carries the one-line provenance link: report readers arrive by deep
  link, so who-made-this must be visible without scrolling to the footer.
  While the work-in-progress notice is on, the band opens with its clause
  from src/lib/wip-notice.ts (this band prints, the site chrome does not)
  and keeps its first lines clear of the corner ribbon's tail below 1264px.
*/
import { Link } from "react-router-dom";
import type { Report } from "@/lib/types";
import { WIP_NOTICE_ENABLED, WIP_REPORT } from "@/lib/wip-notice";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function DisclaimerHeader({ report }: { report: Report }) {
  return (
    <div className="bg-brand-vellum border-b border-brand-silver">
      <div
        className={`mx-auto max-w-5xl px-5 py-3 text-[13px] leading-relaxed text-brand-charcoal-soft sm:px-8${
          WIP_NOTICE_ENABLED ? " md:max-[1263px]:pr-14" : ""
        }`}
      >
        <p>
          <span className="font-mono text-xs font-medium tracking-tight text-brand-charcoal">
            Generated {formatDate(report.meta.generated_at)} · expires{" "}
            {formatDate(report.meta.expires_at)}.
          </span>{" "}
          {WIP_NOTICE_ENABLED && (
            <>
              <span className="font-bold text-brand-charcoal">
                {WIP_REPORT.lead}
              </span>{" "}
              {WIP_REPORT.text}{" "}
            </>
          )}
          This is a point-in-time triage of public evidence about a vendor
          pitch. It is not a purchase recommendation, and it is not a finding
          of wrongdoing. Records change: re-run this check before relying on
          it.{" "}
          <span className="font-mono text-xs tracking-tight">
            Methodology v{report.meta.methodology_version}.
          </span>{" "}
          A free public tool from 17A and partners.{" "}
          <Link
            to="/about"
            className="text-brand-cobalt underline underline-offset-2"
          >
            Why we made this
          </Link>
          {" · "}
          <Link
            to="/terms"
            className="text-brand-cobalt underline underline-offset-2"
          >
            Terms
          </Link>
        </p>
      </div>
    </div>
  );
}
