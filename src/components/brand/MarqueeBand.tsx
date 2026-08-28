export interface MarqueeBandProps {
  items: string[];
  tone?: string; // "cobalt" | "cream"
}

/*
  The one kinetic texture of the site: a full-width scrolling band of
  small-caps check names. The track holds the item list twice; the
  --animate-marquee keyframes translate it -50% for a seamless loop.
  Purely decorative (aria-hidden); prefers-reduced-motion kills the
  animation via the global rule in brand.css.
*/
export function MarqueeBand({ items, tone = "cobalt" }: MarqueeBandProps) {
  const toneClasses =
    tone === "cream"
      ? "bg-brand-cream-deep text-brand-charcoal"
      : "bg-brand-cobalt text-white";

  return (
    <div
      className={`w-full overflow-hidden py-3.5 ${toneClasses}`}
      aria-hidden="true"
    >
      <div className="flex w-max animate-marquee">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center">
            {items.map((item, i) => (
              <span key={i} className="flex items-center">
                <span className="whitespace-nowrap px-5 font-sans text-sm font-bold tracking-[0.14em] [font-variant-caps:all-small-caps]">
                  {item}
                </span>
                <span className="text-base opacity-60">·</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
