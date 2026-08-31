/*
  Adversarial-content findings: shown only when the submitted material
  contained content aimed at automated evaluation systems. Amber field,
  plain-language explanation, no accusatory vocabulary. Copy variants and
  the applied-cap detection live in adv-card-model.ts.
*/
import type { AdvFinding } from "@/lib/types";
import { REPORT_SECTION_IDS } from "@/components/report/report-overview-model";
import {
  ADV_CARD_LEAD,
  ADV_EXPLAIN,
  advCardVariant,
} from "@/components/report/adv-card-model";

export function AdvFindingCard({
  findings,
  rationale,
}: {
  findings: AdvFinding[];
  rationale: string[];
}) {
  if (findings.length === 0) return null;
  const variant = advCardVariant(findings, rationale);
  return (
    <section
      id={REPORT_SECTION_IDS.advFindings}
      tabIndex={-1}
      className="mx-auto max-w-5xl scroll-mt-24 px-5 py-4 sm:px-8"
      aria-labelledby="adv-h"
    >
      <div className="rounded-2xl bg-status-warn-soft p-6 sm:p-8">
        <h2 id="adv-h" className="flex items-center gap-2 font-serif text-xl font-bold">
          <span aria-hidden="true" className="text-status-warn">⚠</span>
          About the material itself
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed">
          {ADV_CARD_LEAD[variant]}
        </p>
        <ul className="mt-4 space-y-3">
          {findings.map((f) => (
            <li key={f.code + f.detail} className="text-[15px] leading-relaxed">
              <span className="font-bold">{ADV_EXPLAIN[f.code] ?? f.code}</span>{" "}
              <span className="text-brand-charcoal-soft">{f.detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
