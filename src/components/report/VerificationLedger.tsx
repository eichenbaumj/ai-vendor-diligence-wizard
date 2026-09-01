/*
  The verification ledger: every tested claim as a row with what we checked,
  the result (chip + word, never color alone), the evidence tier, the note,
  and dated source links. Rows collapse into <details> on small screens.
*/
import type { EvidenceTier, LedgerResult, LedgerRow, SourceRef } from "@/lib/types";
import { REPORT_SECTION_IDS } from "@/components/report/report-overview-model";

const RESULT_STYLES: Record<LedgerResult, { label: string; glyph: string; className: string }> = {
  VERIFIED: {
    label: "Verified",
    glyph: "✓",
    className: "bg-status-good-soft text-status-good",
  },
  OFFICIAL_RECORD_FOUND: {
    label: "Official record found",
    glyph: "✓",
    className: "bg-brand-cobalt-100 text-brand-cobalt",
  },
  COULD_NOT_VERIFY: {
    label: "Could not verify",
    glyph: "○",
    className: "bg-brand-silver-soft text-brand-charcoal",
  },
  CONTRADICTED: {
    label: "Contradicted",
    glyph: "⚠",
    className: "bg-status-bad-soft text-status-bad",
  },
  COVERAGE_LIMITED: {
    label: "Coverage limited",
    glyph: "·",
    className: "bg-brand-vellum text-brand-charcoal-soft",
  },
};

const TIER_TITLES: Record<EvidenceTier, string> = {
  T1: "T1: verified public record (government registry, official feed, or archive)",
  T2: "T2: vendor-published (the vendor's own site or documents)",
  T3: "T3: third-party coverage (press, conference programs, reviews)",
  T4: "T4: we searched public sources and could not corroborate this",
};

export function ResultChip({ result }: { result: LedgerResult }) {
  const s = RESULT_STYLES[result];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill px-3 py-1 text-xs font-bold uppercase tracking-wide ${s.className}`}
    >
      <span aria-hidden="true">{s.glyph}</span>
      {s.label}
    </span>
  );
}

export function EvidenceTierBadge({ tier }: { tier: EvidenceTier }) {
  return (
    <span
      title={TIER_TITLES[tier]}
      className="inline-flex cursor-help items-center rounded-pill border border-brand-silver px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums text-brand-charcoal-soft"
    >
      {tier}
    </span>
  );
}

function SourceLinks({ sources }: { sources: SourceRef[] }) {
  if (sources.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1">
      {sources.map((s) => (
        <li key={s.url} className="text-[13px] leading-snug">
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-cobalt underline underline-offset-2 hover:text-brand-cobalt-deep"
          >
            {s.title ?? s.url}
          </a>{" "}
          <span className="font-mono text-xs tabular-nums text-brand-steel">
            (retrieved{" "}
            {new Date(s.retrieved_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            )
          </span>
        </li>
      ))}
    </ul>
  );
}

function RowBody({ row }: { row: LedgerRow }) {
  return (
    <div className="space-y-3">
      {row.claim_quote && (
        <blockquote className="border-l-4 border-brand-silver pl-4 font-serif text-[17px] leading-relaxed text-brand-ink">
          “{row.claim_quote}”
        </blockquote>
      )}
      <p className="text-sm text-brand-charcoal-soft">
        <span className="font-bold text-brand-charcoal">What we checked:</span>{" "}
        {row.what_checked}
      </p>
      <p className="text-[15px] leading-relaxed">{row.note}</p>
      {row.implication && (
        <p className="rounded-xl bg-brand-vellum px-4 py-3 text-sm leading-relaxed text-brand-charcoal">
          <span className="font-bold">What this number implies:</span>{" "}
          {row.implication}
        </p>
      )}
      <SourceLinks sources={row.sources} />
      <p className="text-[13px]">
        <a
          href={`/methodology#${row.methodology_ref}`}
          className="text-brand-cobalt underline underline-offset-2 hover:text-brand-cobalt-deep"
        >
          How we check this
        </a>
      </p>
    </div>
  );
}

/* A row resting on a registry record we could not tie to this vendor.
   Newer reports carry the attribution field; older ones only labeled
   similarity matches, which were candidates by the old rule. */
export function isCandidateRow(row: LedgerRow): boolean {
  if (row.attribution) return row.attribution === "candidate";
  return row.match_confidence === "name_similarity";
}

function RowHeader({ row }: { row: LedgerRow }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <ResultChip result={row.result} />
      <EvidenceTierBadge tier={row.evidence_tier} />
      <span className="font-mono text-xs font-bold tabular-nums text-brand-steel">
        {row.dimension}
      </span>
      {isCandidateRow(row) && (
        <span
          title="A public record under a matching or similar name that we could not tie to this vendor. Shown for your review; it earns no credit and drives no warning."
          className="inline-flex cursor-help items-center rounded-pill bg-brand-vellum px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-charcoal-soft"
        >
          Candidate record
        </span>
      )}
    </div>
  );
}

export function VerificationLedger({ rows }: { rows: LedgerRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section
      id={REPORT_SECTION_IDS.ledger}
      tabIndex={-1}
      className="mx-auto max-w-5xl scroll-mt-24 px-5 py-10 sm:px-8"
      aria-labelledby="ledger-h"
    >
      <h2 id="ledger-h" className="font-serif text-2xl font-bold sm:text-3xl">
        The claims, checked
      </h2>
      <p className="mt-2 max-w-2xl text-[15px] text-brand-charcoal-soft">
        Each claim from the pitch, what we checked it against, and what we
        found. Every result links to its source with the date we looked.
      </p>

      {/* Desktop and print: rows always open. */}
      <div className="mt-6 hidden divide-y divide-brand-silver-soft md:block">
        {rows.map((row) => (
          <article key={row.id} className="grid grid-cols-[220px_1fr] gap-6 py-6">
            <div>
              <RowHeader row={row} />
            </div>
            <RowBody row={row} />
          </article>
        ))}
      </div>

      {/* Mobile: collapsible details. Print CSS forces these open. */}
      <div className="mt-6 space-y-3 md:hidden">
        {rows.map((row) => (
          <details
            key={row.id}
            className="rounded-2xl border border-brand-silver-soft bg-white p-4 open:shadow-soft"
          >
            <summary className="cursor-pointer list-none">
              <RowHeader row={row} />
              <p className="mt-2 line-clamp-2 text-sm text-brand-charcoal-soft">
                {row.claim_quote ? `“${row.claim_quote}”` : row.what_checked}
              </p>
            </summary>
            <div className="mt-4 border-t border-brand-silver-soft pt-4">
              <RowBody row={row} />
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
