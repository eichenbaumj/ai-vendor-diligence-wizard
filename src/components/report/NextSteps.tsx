/*
  Next steps: the process recommendation, as a numbered list.
*/
export function NextSteps({ steps }: { steps: string[] }) {
  if (steps.length === 0) return null;
  return (
    <section
      className="mx-auto max-w-5xl px-5 py-10 sm:px-8"
      aria-labelledby="next-h"
    >
      <h2 id="next-h" className="font-serif text-2xl font-bold sm:text-3xl">
        What to do next
      </h2>
      <ol className="mt-5 max-w-3xl space-y-3">
        {steps.map((s, i) => (
          <li key={s} className="flex items-baseline gap-3">
            <span
              aria-hidden="true"
              className="font-serif text-lg font-bold text-brand-cobalt"
            >
              {i + 1}
            </span>
            <span className="text-[15px] leading-relaxed">{s}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
