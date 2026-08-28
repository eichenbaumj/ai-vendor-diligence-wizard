/*
  Progress events: every event is (a) inserted into evaluation_events (the
  replay log that survives refresh) and (b) broadcast on the evaluation's
  Realtime channel for live listeners. Broadcast failures are non-fatal —
  polling replays the table.
*/
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EvalEvent } from "./schemas.ts";

export interface Emitter {
  emit: (event: EvalEvent) => Promise<void>;
}

export function makeEmitter(
  supabase: SupabaseClient,
  supabaseUrl: string,
  serviceKey: string,
  evaluationId: string,
  fetchFn: typeof fetch = globalThis.fetch,
): Emitter {
  return {
    async emit(event: EvalEvent) {
      try {
        await supabase.from("evaluation_events").insert({
          evaluation_id: evaluationId,
          stage: event.stage,
          kind: event.kind,
          payload: event,
        });
      } catch (err) {
        console.error(`event insert failed: ${String(err)}`);
      }
      try {
        await fetchFn(`${supabaseUrl}/realtime/v1/api/broadcast`, {
          method: "POST",
          headers: {
            apikey: serviceKey,
            authorization: `Bearer ${serviceKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            messages: [
              {
                topic: `eval:${evaluationId}`,
                event: "progress",
                payload: event,
              },
            ],
          }),
        });
      } catch {
        /* live listeners fall back to polling */
      }
    },
  };
}
