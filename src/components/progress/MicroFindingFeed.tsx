/*
  The labor illusion feed: streamed check results appearing line by line
  inside an aria-live region. Rendered on the cobalt progress field.
*/
import type { StoredEvent } from "@/lib/types";

function glyphFor(status: string | null): { glyph: string; className: string } {
  switch (status) {
    case "hit":
      return { glyph: "✓", className: "text-white" };
    case "flag":
      return { glyph: "⚠", className: "text-brand-cream" };
    case "searching":
      return { glyph: "·", className: "text-white/60" };
    default:
      return { glyph: "·", className: "text-white/60" };
  }
}

export function MicroFindingFeed({ events }: { events: StoredEvent[] }) {
  const findings = events.filter(
    (e) => e.kind === "micro_finding" || e.kind === "check_result",
  );

  return (
    <div
      aria-live="polite"
      aria-label="Check results as they arrive"
      className="space-y-2.5"
    >
      {findings.map((e) => {
        const { glyph, className } = glyphFor(e.payload.status);
        return (
          <div
            key={e.id}
            className="animate-rise flex items-baseline gap-3 text-[15px] leading-snug"
          >
            <span
              aria-hidden="true"
              className={`w-4 shrink-0 text-center font-bold ${className}`}
            >
              {glyph}
            </span>
            <span className="text-white/90">
              {e.payload.label}
              {e.payload.evidence_url && (
                <>
                  {" "}
                  <a
                    href={e.payload.evidence_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-carolina-100 underline decoration-white/40 underline-offset-2 hover:decoration-white"
                  >
                    source
                  </a>
                </>
              )}
            </span>
          </div>
        );
      })}
      {findings.length === 0 && (
        <p className="text-[15px] text-white/70">Starting the checks…</p>
      )}
    </div>
  );
}
