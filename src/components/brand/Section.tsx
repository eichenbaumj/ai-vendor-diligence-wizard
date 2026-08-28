import type { ReactNode } from "react";

export type SectionTone =
  | "cream"
  | "cobalt"
  | "tint"
  | "vellum"
  | "ink"
  | "white";

export interface SectionProps {
  tone?: SectionTone;
  className?: string;
  children: ReactNode;
  id?: string;
}

/*
  Full-bleed color-blocked section: the page is built from these magazine
  billboards, never from bordered cards floating on gray. Dark tones (cobalt,
  ink) force light text onto headings, which default to ink in brand.css.
*/
const TONES: Record<SectionTone, string> = {
  cream: "bg-brand-cream text-brand-charcoal",
  cobalt:
    "bg-brand-cobalt text-white [&_:is(h1,h2,h3,h4,h5)]:text-white",
  tint: "bg-brand-cobalt-50 text-brand-charcoal",
  vellum: "bg-brand-vellum text-brand-charcoal",
  ink: "bg-brand-ink text-brand-vellum [&_:is(h1,h2,h3,h4,h5)]:text-white",
  white: "bg-white text-brand-charcoal",
};

export function Section({
  tone = "cream",
  className = "",
  children,
  id,
}: SectionProps) {
  return (
    <section id={id} className={`w-full py-16 md:py-24 ${TONES[tone]} ${className}`}>
      <div className="mx-auto w-full max-w-6xl px-5 md:px-8">{children}</div>
    </section>
  );
}
