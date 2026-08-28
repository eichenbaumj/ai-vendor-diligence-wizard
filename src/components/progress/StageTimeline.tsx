/*
  Vertical step indicator for the evaluation's six plain-language stages.
  USWDS-style: numbered steps, aria-current on the active one, findings feed
  rendered separately underneath.
*/
import type { StoredEvent } from "@/lib/types";

export const STAGE_STEPS = [
  "Reading the pitch",
  "Identifying the company",
  "Checking registries and records",
  "Searching for delivery evidence",
  "Writing your report",
  "Reviewing the language",
] as const;

/*
  Map pipeline events to a display step. The registry stage covers two
  human-sized steps: identifying the company (first registry hits) and the
  wider registry sweep.
*/
export function computeStepIndex(events: StoredEvent[], complete: boolean): number {
  if (complete) return STAGE_STEPS.length;
  let index = 0;
  let registryResults = 0;
  for (const e of events) {
    if (e.kind === "stage_start") {
      switch (e.stage) {
        case "parse":
          index = Math.max(index, 0);
          break;
        case "registry":
          index = Math.max(index, 1);
          break;
        case "research":
          index = Math.max(index, 3);
          break;
        case "packs":
        case "synthesis":
          index = Math.max(index, 4);
          break;
        case "review":
          index = Math.max(index, 5);
          break;
      }
    }
    if (e.stage === "registry" && e.kind === "check_result") {
      registryResults += 1;
    }
    if (e.kind === "done") return STAGE_STEPS.length;
  }
  if (index === 1 && registryResults >= 2) index = 2;
  return index;
}

export function StageTimeline({ currentIndex }: { currentIndex: number }) {
  return (
    <ol className="space-y-0" aria-label="Evaluation progress">
      {STAGE_STEPS.map((label, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className="relative flex items-start gap-4 pb-5 last:pb-0"
          >
            {/* connector */}
            {i < STAGE_STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={`absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-0.5 ${
                  done ? "bg-white/80" : "bg-white/25"
                }`}
              />
            )}
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-pill border-2 text-xs font-bold ${
                done
                  ? "border-white bg-white text-brand-cobalt"
                  : active
                    ? "border-white bg-brand-cobalt text-white"
                    : "border-white/40 bg-transparent text-white/60"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span
              className={`pt-1 text-sm leading-snug ${
                active
                  ? "font-bold text-white"
                  : done
                    ? "text-white/90"
                    : "text-white/55"
              }`}
            >
              {label}
              {active && (
                <span className="sr-only"> (current step)</span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
