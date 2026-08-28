/*
  The question pack: numbered questions in white cards, per-question copy
  buttons, and a copy-all-as-email assembler.
*/
import { useState } from "react";
import { PillButton } from "@/components/brand";
import type { Report, ReportQuestion } from "@/lib/types";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function buildEmail(report: Report): string {
  const lines: string[] = [];
  lines.push("Hello,");
  lines.push("");
  lines.push(
    "Thank you for reaching out. Before we schedule any demo, our office asks every vendor a standard set of questions in writing. Written answers help us route your pitch to the right people.",
  );
  lines.push("");
  report.questions.forEach((q, i) => {
    lines.push(`${i + 1}. ${q.text}`);
    lines.push("");
  });
  lines.push(
    "Please reply with written answers. Where a question asks for a document, an attachment or a link is fine.",
  );
  lines.push("");
  lines.push("Thank you,");
  return lines.join("\n");
}

function QuestionCard({ q, index }: { q: ReportQuestion; index: number }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    const ok = await copyText(q.text);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <li className="rounded-2xl bg-white p-5 shadow-soft sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <span
            aria-hidden="true"
            className="font-serif text-xl font-black text-brand-cobalt"
          >
            {index + 1}
          </span>
          <p className="text-[15px] leading-relaxed">{q.text}</p>
        </div>
        <button
          type="button"
          onClick={() => void onCopy()}
          className="no-print shrink-0 rounded-pill border border-brand-silver px-3 py-1 text-xs font-bold text-brand-charcoal-soft transition-colors hover:border-brand-cobalt hover:text-brand-cobalt"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-2 pl-8 text-[13px] leading-relaxed text-brand-charcoal-soft">
        Why ask: {q.why}
      </p>
    </li>
  );
}

export function QuestionPack({ report }: { report: Report }) {
  const [allCopied, setAllCopied] = useState(false);

  if (report.questions.length === 0) return null;

  const onCopyAll = async () => {
    const ok = await copyText(buildEmail(report));
    if (ok) {
      setAllCopied(true);
      window.setTimeout(() => setAllCopied(false), 2500);
    }
  };

  return (
    <section
      className="bg-brand-cream"
      aria-labelledby="questions-h"
    >
      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="questions-h" className="font-serif text-2xl font-bold sm:text-3xl">
              Send these back before you take a demo
            </h2>
            <p className="mt-2 max-w-2xl text-[15px] text-brand-charcoal-soft">
              Written answers are the point. A vendor with real answers can
              write them down.
            </p>
          </div>
          <div className="no-print">
            <PillButton variant="primary" size="md" onClick={() => void onCopyAll()}>
              {allCopied ? "Copied to clipboard" : "Copy all as email"}
            </PillButton>
          </div>
        </div>
        <ol className="mt-6 space-y-3">
          {report.questions.map((q, i) => (
            <QuestionCard key={q.id} q={q} index={i} />
          ))}
        </ol>
      </div>
    </section>
  );
}
