/*
  Follow-up chat drawer, grounded in the report only. Collapsed: a pill tab
  fixed to the bottom right. Expanded: message list, input, and a visible
  turn counter. When the backend is absent (mock mode), a friendly
  coming-with-the-pilot state.
*/
import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  ChatUnavailableError,
  streamChat,
} from "@/lib/api";
import type { ChatMessage } from "@/lib/types";

const DEFAULT_TURNS = 10;

export function ReportChat({ evaluationId }: { evaluationId: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turnsRemaining, setTurnsRemaining] = useState<number>(DEFAULT_TURNS);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  const send = async () => {
    const message = input.trim();
    if (!message || busy || unavailable || turnsRemaining <= 0) return;
    setInput("");
    setError(null);
    setBusy(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", text: message },
      { role: "assistant", text: "" },
    ]);

    try {
      const result = await streamChat(
        { evaluation_id: evaluationId, session_id: sessionId, message },
        (delta) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === "assistant") {
              next[next.length - 1] = { ...last, text: last.text + delta };
            }
            return next;
          });
        },
      );
      if (result.sessionId) setSessionId(result.sessionId);
      setTurnsRemaining((prev) =>
        result.turnsRemaining !== null ? result.turnsRemaining : Math.max(prev - 1, 0),
      );
    } catch (e) {
      /* Remove the empty assistant bubble. */
      setMessages((prev) =>
        prev[prev.length - 1]?.role === "assistant" && prev[prev.length - 1]?.text === ""
          ? prev.slice(0, -1)
          : prev,
      );
      if (e instanceof ChatUnavailableError) {
        setUnavailable(true);
      } else if (e instanceof ApiError) {
        setError(e.message);
        if (e.status === 429) setTurnsRemaining(0);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div className="no-print fixed bottom-5 right-5 z-40">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-pill bg-brand-cobalt px-5 py-3 text-sm font-bold text-white shadow-soft-lg transition-colors hover:bg-brand-cobalt-deep"
        >
          Ask about this report
        </button>
      </div>
    );
  }

  return (
    <div
      className="no-print fixed bottom-0 right-0 z-40 flex w-full flex-col rounded-t-2xl border border-brand-silver bg-white shadow-soft-lg sm:bottom-5 sm:right-5 sm:w-96 sm:rounded-2xl"
      style={{ maxHeight: "70vh" }}
      role="dialog"
      aria-label="Ask about this report"
    >
      <div className="flex items-center justify-between border-b border-brand-silver-soft px-4 py-3">
        <p className="font-serif text-base font-bold">Ask about this report</p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-brand-charcoal-soft" aria-live="polite">
            {turnsRemaining} of {DEFAULT_TURNS} questions left
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close chat"
            className="rounded-pill px-2 py-1 text-sm font-bold text-brand-charcoal-soft hover:text-brand-charcoal"
          >
            ✕
          </button>
        </div>
      </div>

      {unavailable ? (
        <div className="p-5 text-sm leading-relaxed text-brand-charcoal">
          <p className="font-bold">Follow-up chat arrives with the pilot release.</p>
          <p className="mt-2 text-brand-charcoal-soft">
            For now, the whole answer is on this page: the ledger shows every
            source we checked, and the question pack is ready to copy and send
            to the vendor.
          </p>
        </div>
      ) : (
        <>
          <div
            ref={listRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
            style={{ minHeight: "8rem" }}
          >
            {messages.length === 0 && (
              <p className="text-sm leading-relaxed text-brand-charcoal-soft">
                Ask anything about this report: what a result means, why a
                check ran, or how to use the question pack. Answers come from
                this report only.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto bg-brand-cobalt text-white"
                    : "bg-brand-vellum text-brand-charcoal"
                }`}
              >
                {m.text || <span className="text-brand-steel">…</span>}
              </div>
            ))}
            {error && (
              <p className="text-sm text-status-bad" role="alert">
                {error}
              </p>
            )}
          </div>
          <form
            className="flex items-center gap-2 border-t border-brand-silver-soft p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <label htmlFor="report-chat-input" className="sr-only">
              Your question about this report
            </label>
            <input
              id="report-chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                turnsRemaining > 0 ? "Type a question…" : "No questions left for this report"
              }
              disabled={busy || turnsRemaining <= 0}
              className="min-w-0 flex-1 rounded-pill border border-brand-silver px-4 py-2 text-sm outline-none focus:border-brand-cobalt"
            />
            <button
              type="submit"
              disabled={busy || !input.trim() || turnsRemaining <= 0}
              className="rounded-pill bg-brand-cobalt px-4 py-2 text-sm font-bold text-white transition-colors enabled:hover:bg-brand-cobalt-deep disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </>
      )}
    </div>
  );
}
