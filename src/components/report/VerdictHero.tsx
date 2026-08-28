/*
  The verdict-first moment (HIBP pattern): full-bleed field in the tier's
  soft color, tier badge, serif display summary, checks-met line, and the
  deterministic rationale in small print. Never color alone.
*/
import { TierBadge } from "@/components/brand";
import type { Report } from "@/lib/types";
import { TIER_TOKENS } from "@/components/report/tier-tokens";

export function VerdictHero({
  report,
  disputed,
}: {
  report: Report;
  disputed: boolean;
}) {
  const tokens = TIER_TOKENS[report.verdict.tier];

  return (
    <section className={`${tokens.softBg} w-full`}>
      <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="flex flex-wrap items-center gap-3">
          <TierBadge tier={report.verdict.tier} size="lg" />
          {disputed && (
            <span className="rounded-pill border border-brand-charcoal-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-charcoal">
              Disputed by vendor · under review
            </span>
          )}
        </div>

        <p className="mt-6 text-sm font-bold uppercase tracking-wide text-brand-charcoal-soft">
          {report.meta.vendor_display_name}
        </p>

        <h1 className="mt-3 max-w-3xl font-serif text-3xl font-bold leading-[1.12] sm:text-4xl md:text-5xl">
          {report.verdict.label}
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-brand-charcoal">
          {report.verdict.summary}
        </p>

        <p className={`mt-6 text-sm font-bold ${tokens.strongText}`}>
          Meets {report.verdict.checks_met.met} of{" "}
          {report.verdict.checks_met.total} verification checks. See the ledger
          below.
        </p>

        {report.verdict.rationale.length > 0 && (
          <div className="mt-8 max-w-2xl border-t border-brand-charcoal/15 pt-5">
            <h2 className="text-xs font-bold uppercase tracking-wide text-brand-charcoal-soft">
              How this verdict was reached
            </h2>
            <ul className="mt-3 space-y-2">
              {report.verdict.rationale.map((r) => (
                <li
                  key={r}
                  className="text-[13px] leading-relaxed text-brand-charcoal-soft"
                >
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
