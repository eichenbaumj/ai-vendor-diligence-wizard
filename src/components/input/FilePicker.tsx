/*
  PDF file picker for the check page: a dropzone wrapping a hidden file
  input, with client-side type/size validation. The file itself never
  leaves the browser until submit, when Check.tsx converts it to base64.
*/
import { useRef, useState } from "react";

export const PDF_MAX_BYTES = 6 * 1024 * 1024;

export function FilePicker({
  file,
  onChange,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const accept = (candidate: File | undefined) => {
    setProblem(null);
    if (!candidate) return;
    const isPdf =
      candidate.type === "application/pdf" || /\.pdf$/i.test(candidate.name);
    if (!isPdf) {
      setProblem("That file is not a PDF. Choose a .pdf file.");
      return;
    }
    if (candidate.size > PDF_MAX_BYTES) {
      setProblem("That PDF is larger than 6 MB. Choose a smaller file, or paste the text instead.");
      return;
    }
    onChange(candidate);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={(e) => accept(e.target.files?.[0])}
      />
      {file ? (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-brand-silver bg-white px-5 py-4 shadow-soft">
          <div className="min-w-0">
            <p className="truncate font-bold text-brand-ink">{file.name}</p>
            <p className="font-mono text-xs text-brand-steel">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="shrink-0 rounded-pill border border-brand-silver px-4 py-1.5 text-sm font-bold text-brand-charcoal hover:border-brand-cobalt hover:text-brand-cobalt"
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            accept(e.dataTransfer.files?.[0]);
          }}
          className={`flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-5 py-8 text-center transition-colors ${
            dragOver
              ? "border-brand-cobalt bg-brand-cobalt-50"
              : "border-brand-silver bg-white hover:border-brand-cobalt"
          }`}
        >
          <span className="font-bold text-brand-ink">
            Drop the vendor's PDF here, or click to choose a file
          </span>
          <span className="text-sm text-brand-charcoal-soft">
            One PDF, up to 6 MB. We read the text inside it; the file itself is not kept.
          </span>
        </button>
      )}
      {problem ? (
        <p className="mt-2 text-sm font-medium text-status-bad">{problem}</p>
      ) : null}
    </div>
  );
}
