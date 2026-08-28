/*
  Thin vellum disclaimer band at the top of every report. Per-report
  contextual disclaimer, not TOS boilerplate (methodology section 5, rule 8).
*/
import type { Report } from "@/lib/types";

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
      <div className="mx-auto max-w-5xl px-5 py-3 text-[13px] leading-relaxed text-brand-charcoal-soft sm:px-8">
        <p>
          <span className="font-bold text-brand-charcoal">
            Generated {formatDate(report.meta.generated_at)} · expires{" "}
            {formatDate(report.meta.expires_at)}.
          </span>{" "}
          This is a point-in-time triage of public evidence about a vendor
          pitch. It is not a purchase recommendation, and it is not a finding
          of wrongdoing. Records change: re-run this check before relying on
          it. Methodology v{report.meta.methodology_version}.
        </p>
      </div>
    </div>
  );
}
