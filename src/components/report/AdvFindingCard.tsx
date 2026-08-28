/*
  Adversarial-content findings: shown only when the submitted material
  contained content aimed at automated evaluation systems. Amber field,
  plain-language explanation, no accusatory vocabulary.
*/
import type { AdvFinding } from "@/lib/types";

const ADV_EXPLAIN: Record<string, string> = {
  "ADV-01": "The submitted material contained text that is hidden from human readers.",
  "ADV-02": "The submitted material contained text addressed to AI evaluation systems rather than to you.",
  "ADV-03": "The submitted material contained invisible characters of a kind used to carry hidden instructions.",
  "ADV-04": "The same promotional phrasing appears across a network of low-authority sites, which weakens it as independent evidence.",
};

export function AdvFindingCard({ findings }: { findings: AdvFinding[] }) {
  if (findings.length === 0) return null;
  return (
    <section
      className="mx-auto max-w-5xl px-5 py-4 sm:px-8"
      aria-labelledby="adv-h"
    >
      <div className="rounded-2xl bg-status-warn-soft p-6 sm:p-8">
        <h2 id="adv-h" className="flex items-center gap-2 font-serif text-xl font-bold">
          <span aria-hidden="true" className="text-status-warn">⚠</span>
          About the material itself
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed">
          Some of what was submitted contained content aimed at automated
          systems like this one, not at human readers. That content did not
          change this report's checks, and its presence caps the verdict tier.
          Here is what we found:
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
