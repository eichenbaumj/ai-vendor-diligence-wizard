/*
  Bounded retry primitives for third-party lookups.

  The identity chain (website discovery -> site fetch -> RDAP/MX) is only
  as reliable as its flakiest link, and a vendor's verdict must never drop
  tiers because a lookup service had a bad minute (defect basket 6b; the
  polco/zencity floor variance). These helpers make "one retry" a tested,
  signal-aware building block instead of an inline pattern that each call
  site gets subtly wrong (the pre-1.6 RDAP retry slept past its own abort
  signal and treated its two attempts asymmetrically).

  Retries re-run the SAME code path with fresh time. They never change a
  trust boundary, never widen what a check may read, and never turn a
  definitive answer into another attempt — retryIf decides, and callers
  must only retry infrastructure-class failures.

  Pure module: no Deno APIs, no module-level state.
*/

/* Sleep that ends early — resolved, never rejected — when the signal
   aborts. A retry pause must not burn real wall-clock past the deadline
   that bounds the whole check. */
export function sleepBounded(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onAbort = () => {
      if (timer !== undefined) clearTimeout(timer);
      resolve();
    };
    timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export interface RetryOnceOpts<T> {
  /* Decide from the first attempt's outcome whether a second is worth
     making. Receives the resolved value (null when the attempt threw) and
     the thrown error (undefined when it resolved). Return true ONLY for
     infrastructure-class failures — a definitive answer must stand. */
  retryIf: (result: T | null, err: unknown) => boolean;
  /* Pause between attempts; bounded by the signal. */
  sleepMs: number;
  signal?: AbortSignal;
}

/* At most two invocations of fn. The second attempt is skipped when the
   signal has already aborted (its request would die instantly and mask the
   first attempt's more informative failure). If both attempts throw, the
   SECOND error propagates to the caller's own error handling. */
export async function retryOnce<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOnceOpts<T>,
): Promise<T> {
  let result: T | null = null;
  let error: unknown;
  let threw = false;
  try {
    result = await fn(0);
  } catch (err) {
    threw = true;
    error = err;
  }
  if (!opts.retryIf(threw ? null : result, threw ? error : undefined)) {
    if (threw) throw error;
    return result as T;
  }
  if (opts.signal?.aborted) {
    if (threw) throw error;
    return result as T;
  }
  await sleepBounded(opts.sleepMs, opts.signal);
  if (opts.signal?.aborted) {
    if (threw) throw error;
    return result as T;
  }
  return await fn(1);
}
