/*
  Green flags: what passed, with sources in the ledger. Findings too
  (methodology axiom 2).
*/
export function GreenFlags({ flags }: { flags: string[] }) {
  if (flags.length === 0) return null;
  return (
    <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8" aria-labelledby="green-flags-h">
      <h2 id="green-flags-h" className="font-serif text-2xl font-bold sm:text-3xl">
        What checked out
      </h2>
      <ul className="mt-5 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
        {flags.map((f) => (
          <li key={f} className="flex items-baseline gap-2.5 text-[15px] leading-relaxed">
            <span aria-hidden="true" className="font-bold text-status-good">
              ✓
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
