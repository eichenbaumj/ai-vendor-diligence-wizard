/*
  useEvaluation(id): the single data hook behind the evaluation page.

  Mock mode: polls the in-browser mock driver on a short interval.
  Real mode: initial replay via TanStack Query, live events via a Supabase
  Broadcast channel ("eval:<id>", event "progress"), plus a 3.5s polling
  fallback that pauses while the websocket is delivering.
*/
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { EvalEvent } from "@shared/schemas.ts";
import { IS_MOCK } from "@/lib/config";
import { getEvaluation } from "@/lib/api";
import { getMockEvaluation, isMockEvaluationId } from "@/lib/mock";
import { supabase } from "@/lib/supabase";
import type {
  EvaluationState,
  GetEvaluationResponse,
  StoredEvent,
} from "@/lib/types";

const TERMINAL = new Set(["complete", "insufficient", "error"]);
const POLL_MS = 3500;
const MOCK_POLL_MS = 650;
const WS_FRESH_MS = 8000;

function eventKey(e: { stage: string; kind: string; payload: EvalEvent }): string {
  return `${e.stage}|${e.kind}|${e.payload.label}`;
}

export function useEvaluation(id: string | undefined): EvaluationState {
  const useMockPath = IS_MOCK || (id !== undefined && isMockEvaluationId(id));

  /* ------------------------------------------------------------ mock path */
  const [mockSnapshot, setMockSnapshot] = useState<GetEvaluationResponse | null>(
    null,
  );
  const [mockMissing, setMockMissing] = useState(false);

  useEffect(() => {
    if (!useMockPath || !id) return;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const snapshot = getMockEvaluation(id);
      if (!snapshot) {
        setMockMissing(true);
        return;
      }
      setMockSnapshot(snapshot);
      if (!TERMINAL.has(snapshot.status)) {
        timer = window.setTimeout(tick, MOCK_POLL_MS);
      }
    };

    let timer = window.setTimeout(tick, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [useMockPath, id]);

  /* ------------------------------------------------------------ real path */
  const queryClient = useQueryClient();
  const lastWsAtRef = useRef(0);
  const [liveEvents, setLiveEvents] = useState<StoredEvent[]>([]);

  const query = useQuery({
    queryKey: ["evaluation", id],
    queryFn: () => getEvaluation(id as string),
    enabled: !useMockPath && !!id,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const status = query.data?.status;
  const isTerminal = status !== undefined && TERMINAL.has(status);

  /* Broadcast subscription. */
  useEffect(() => {
    if (useMockPath || !id || !supabase || isTerminal) return;

    const channel = supabase.channel(`eval:${id}`);
    channel.on("broadcast", { event: "progress" }, (message) => {
      lastWsAtRef.current = Date.now();
      const payload = message.payload as EvalEvent | undefined;
      if (!payload || typeof payload.label !== "string") return;
      setLiveEvents((prev) => [
        ...prev,
        {
          id: prev.length + 100000,
          stage: payload.stage,
          kind: payload.kind,
          payload,
        },
      ]);
      /* A terminal event means the report is ready server-side: fetch it. */
      if (payload.kind === "done" || payload.kind === "error") {
        void queryClient.invalidateQueries({ queryKey: ["evaluation", id] });
      }
    });
    channel.subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [useMockPath, id, isTerminal, queryClient]);

  /* Polling fallback: every 3.5s, skipped while the websocket is fresh. */
  useEffect(() => {
    if (useMockPath || !id || isTerminal) return;
    const interval = window.setInterval(() => {
      const wsFresh = Date.now() - lastWsAtRef.current < WS_FRESH_MS;
      if (!wsFresh) {
        void query.refetch();
      }
    }, POLL_MS);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useMockPath, id, isTerminal]);

  /* ------------------------------------------------------------- assemble */
  return useMemo<EvaluationState>(() => {
    if (useMockPath) {
      if (mockMissing) {
        return {
          status: "error",
          events: [],
          report: null,
          disputed: false,
          error: "We could not find that check. It may have expired. Start a new one from the check page.",
        };
      }
      if (!mockSnapshot) {
        return {
          status: "queued",
          events: [],
          report: null,
          disputed: false,
          error: null,
        };
      }
      return { ...mockSnapshot, error: null };
    }

    if (query.isError) {
      return {
        status: "error",
        events: [],
        report: null,
        disputed: false,
        error:
          query.error instanceof Error
            ? query.error.message
            : "Something went wrong loading this check.",
      };
    }

    const serverEvents = query.data?.events ?? [];
    const seen = new Set(serverEvents.map(eventKey));
    const merged = [...serverEvents];
    for (const e of liveEvents) {
      const key = eventKey(e);
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(e);
      }
    }

    return {
      status: query.data?.status ?? "queued",
      events: merged,
      report: query.data?.report ?? null,
      disputed: query.data?.disputed ?? false,
      error: null,
    };
  }, [useMockPath, mockSnapshot, mockMissing, query.data, query.isError, query.error, liveEvents]);
}
