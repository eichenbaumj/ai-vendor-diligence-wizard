import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import methodologyMd from "../../docs/methodology.md?raw";
import packsData from "@/generated/packs.json";
import type { SectorPack } from "@shared/packs-types.ts";
import { Section } from "@/components/brand";
import { slugify } from "@/lib/methodology-slug";

const packs = packsData.packs as SectorPack[];
const packRelease: string = packsData.pack_release;

/* ---------------------------------------------------------- heading anchors */

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(textOf).join("");
  }
  if (node && typeof node === "object" && "props" in node) {
    const el = node as { props: { children?: ReactNode } };
    return textOf(el.props.children);
  }
  return "";
}

const HEADING_STYLES: Record<"h1" | "h2" | "h3" | "h4", string> = {
  h1: "mt-2 font-serif text-4xl font-bold leading-tight md:text-5xl",
  h2: "mt-12 font-serif text-3xl font-bold leading-tight",
  h3: "mt-9 font-serif text-2xl font-bold leading-snug",
  h4: "mt-7 font-serif text-xl font-bold leading-snug",
};

function heading(Tag: "h1" | "h2" | "h3" | "h4") {
  return function Heading({ children }: { children?: ReactNode }) {
    const id = slugify(textOf(children));
    return (
      <Tag id={id} className={`group scroll-mt-24 ${HEADING_STYLES[Tag]}`}>
        {children}{" "}
        <a
          href={`#${id}`}
          aria-label="Link to this section"
          className="text-brand-cobalt-300 no-underline opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
        >
          #
        </a>
      </Tag>
    );
  };
}

/* --------------------------------------------------------- DIY prose styles */

const proseComponents: Components = {
  h1: heading("h1"),
  h2: heading("h2"),
  h3: heading("h3"),
  h4: heading("h4"),
  p: ({ children }) => (
    <p className="mt-4 font-sans text-base leading-relaxed md:text-lg">
      {children}
    </p>
  ),
  a: ({ href, children }) => {
    /* The markdown links sibling docs relatively; on the site those live in
       the public GitHub repo. */
    const resolved = href?.match(/^\.?\/?(coverage-map|security|architecture)\.md$/)
      ? `https://github.com/eichenbaumj/ai-vendor-diligence-wizard/blob/main/docs/${href.replace(/^\.?\//, "")}`
      : href;
    return (
      <a
        href={resolved}
        className="break-words font-medium text-brand-cobalt underline decoration-brand-carolina decoration-2 underline-offset-2 hover:decoration-brand-cobalt"
      >
        {children}
      </a>
    );
  },
  ul: ({ children }) => (
    <ul className="mt-4 list-disc space-y-2 pl-6 font-sans text-base leading-relaxed md:text-lg">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-4 list-decimal space-y-2 pl-6 font-sans text-base leading-relaxed md:text-lg">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mt-4 border-l-4 border-brand-carolina pl-4 text-brand-charcoal-soft">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-10 border-brand-ink/10" />,
  table: ({ children }) => (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full border-collapse text-left font-sans text-sm md:text-base">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b-2 border-brand-ink/20">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 align-top font-bold text-brand-ink">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-b border-brand-ink/10 px-3 py-2 align-top leading-relaxed">
      {children}
    </td>
  ),
  code: ({ children, className }) =>
    className ? (
      <code className={`${className} block overflow-x-auto rounded-lg bg-brand-vellum p-4 text-sm`}>
        {children}
      </code>
    ) : (
      <code className="rounded bg-brand-vellum px-1.5 py-0.5 text-[0.9em]">
        {children}
      </code>
    ),
  pre: ({ children }) => <pre className="mt-4">{children}</pre>,
  strong: ({ children }) => (
    <strong className="font-bold text-brand-ink">{children}</strong>
  ),
};

/* ------------------------------------------------------------ packs browser */

function PackDetails({ pack }: { pack: SectorPack }) {
  return (
    <details className="group border-b border-brand-ink/10 py-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-xl font-bold text-brand-ink [&::-webkit-details-marker]:hidden">
        {pack.pack_name}
        <span
          aria-hidden="true"
          className="shrink-0 font-sans text-2xl font-light text-brand-cobalt transition-transform group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="mt-4 max-w-2xl">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={proseComponents}>
          {pack.definition}
        </ReactMarkdown>
        <h4 className="mt-6 font-serif text-lg font-bold">
          Questions in this pack
        </h4>
        <ol className="mt-3 list-decimal space-y-3 pl-6 font-sans text-base leading-relaxed">
          {pack.diligence_questions.map((q) => (
            <li key={q.id} className="pl-1">
              {q.question}
            </li>
          ))}
        </ol>
        <p className="mt-5 font-sans text-sm text-brand-charcoal-soft">
          Last updated {pack.last_updated}. Reviewed {pack.refresh_cadence}.
        </p>
      </div>
    </details>
  );
}

/* ------------------------------------------------------------------- page */

export default function Methodology() {
  return (
    <>
      <Section tone="tint" className="py-12! md:py-16!">
        <p className="font-sans text-sm font-bold tracking-[0.14em] text-brand-cobalt [font-variant-caps:all-small-caps]">
          How it works
        </p>
        <h1 className="mt-2 max-w-3xl font-serif text-[clamp(2rem,3.6vw,3rem)] font-bold leading-tight">
          The methodology, in full
        </h1>
        <p className="mt-5 max-w-2xl font-sans text-lg leading-relaxed">
          Every check the tool runs is listed here, with its source and how it
          can affect the verdict. If a check is not on this page, the tool
          does not run it.
        </p>
      </Section>

      <Section tone="white">
        <article className="mx-auto max-w-3xl">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={proseComponents}
          >
            {methodologyMd}
          </ReactMarkdown>
        </article>
      </Section>

      <Section tone="vellum" id="sector-packs">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-serif text-3xl font-bold leading-tight">
            Sector packs
          </h2>
          <p className="mt-4 font-sans text-base leading-relaxed md:text-lg">
            Each report includes questions from a sector pack matched to the
            pitched use case. The full packs are published here so vendors and
            buyers see the same list.
          </p>
          {packs.length === 0 ? (
            <p className="mt-6 font-sans text-base leading-relaxed text-brand-charcoal-soft md:text-lg">
              The first pack release is being written now. It will cover call
              centers and resident chatbots, document processing, eligibility
              and case management, public communications, staff productivity,
              and data analytics.
            </p>
          ) : (
            <>
              <div className="mt-6 border-t border-brand-ink/10">
                {packs.map((pack) => (
                  <PackDetails key={pack.pack_id} pack={pack} />
                ))}
              </div>
              <p className="mt-5 font-sans text-sm text-brand-charcoal-soft">
                Pack release {packRelease}.
              </p>
            </>
          )}
        </div>
      </Section>
    </>
  );
}
