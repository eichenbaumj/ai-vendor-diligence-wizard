/*
  "Everything we tried to check" — the transparency signature. Every check
  the tool attempted, grouped so that a source that failed this run, a check
  that exists as a manual card, and a check that does not apply to this
  vendor read differently. Grouping comes from the server (item.group);
  reports stored before that field existed fall back to a status-derived
  default from the shared mapping.
*/
import type { HonestyItem } from "@/lib/types";
import { HONESTY_GROUPS, defaultGroup } from "@shared/honesty-groups.ts";

const STATUS_PRESENT: Record<
  HonestyItem["status"],
  { glyph: string; label: string; className: string }
> = {
  pass: { glyph: "✓", label: "Pass", className: "text-status-good" },
  flag: { glyph: "⚠", label: "Flag", className: "text-status-warn" },
  could_not_check: {
    glyph: "○",
    label: "Could not check",
    className: "text-brand-charcoal-soft",
  },
  not_applicable: {
    glyph: "–",
    label: "Not applicable",
    className: "text-brand-steel",
  },
};

export function HonestyPanel({ items }: { items: HonestyItem[] }) {
  if (items.length === 0) return null;
  const grouped = HONESTY_GROUPS.map((g) => ({
    ...g,
    items: items.filter((i) => (i.group ?? defaultGroup(i.status)) === g.id),
  })).filter((g) => g.items.length > 0);
  return (
    <section className="bg-brand-vellum" aria-labelledby="honesty-h">
      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
        <h2 id="honesty-h" className="font-serif text-2xl font-bold sm:text-3xl">
          Everything we tried to check
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] text-brand-charcoal-soft">
          An unchecked item shown as unchecked is part of the answer. Nothing
          here is hidden, including what we could not reach.
        </p>
        {grouped.map((g) => (
          <div key={g.id} className="mt-8">
            <h3 className="font-sans text-sm font-bold tracking-[0.1em] [font-variant-caps:all-small-caps] text-brand-charcoal-soft">
              {g.label}
            </h3>
            <ul className="mt-3 grid gap-x-10 gap-y-4 sm:grid-cols-2">
              {g.items.map((item) => {
                const s = STATUS_PRESENT[item.status];
                return (
                  <li key={item.check_id} className="flex items-baseline gap-3">
                    <span
                      aria-hidden="true"
                      className={`w-4 shrink-0 text-center font-bold ${s.className}`}
                    >
                      {s.glyph}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[15px] leading-snug">
                        <span className="font-bold">{item.label}</span>{" "}
                        <span className={`text-xs font-bold uppercase tracking-wide ${s.className}`}>
                          · {s.label}
                        </span>
                      </p>
                      {item.reason && (
                        <p className="mt-1 text-[13px] leading-relaxed text-brand-charcoal-soft">
                          {item.reason}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
