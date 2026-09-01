import { afterEach, describe, expect, it, vi } from "vitest";
import { retryOnce, sleepBounded } from "@shared/retry.ts";

afterEach(() => {
  vi.useRealTimers();
});

describe("sleepBounded", () => {
  it("resolves after the given time", async () => {
    vi.useFakeTimers();
    let done = false;
    const p = sleepBounded(800).then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(799);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await p;
    expect(done).toBe(true);
  });

  it("resolves immediately when the signal is already aborted", async () => {
    vi.useFakeTimers();
    const ctrl = new AbortController();
    ctrl.abort();
    let done = false;
    const p = sleepBounded(60_000, ctrl.signal).then(() => {
      done = true;
    });
    /* No timer advancement at all: the promise must settle on its own. */
    await vi.advanceTimersByTimeAsync(0);
    await p;
    expect(done).toBe(true);
  });

  it("resolves early when the signal aborts mid-sleep, without rejecting", async () => {
    vi.useFakeTimers();
    const ctrl = new AbortController();
    let done = false;
    const p = sleepBounded(60_000, ctrl.signal).then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(100);
    expect(done).toBe(false);
    ctrl.abort();
    await vi.advanceTimersByTimeAsync(0);
    await p;
    expect(done).toBe(true);
  });
});

describe("retryOnce", () => {
  it("makes exactly one call when the first result is accepted", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const out = await retryOnce(fn, { retryIf: () => false, sleepMs: 0 });
    expect(out).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("makes a second call when retryIf accepts, and returns the second result", async () => {
    vi.useFakeTimers();
    const fn = vi
      .fn()
      .mockResolvedValueOnce("bad")
      .mockResolvedValueOnce("good");
    const p = retryOnce(fn, {
      retryIf: (r) => r === "bad",
      sleepMs: 800,
    });
    await vi.runAllTimersAsync();
    expect(await p).toBe("good");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, 0);
    expect(fn).toHaveBeenNthCalledWith(2, 1);
  });

  it("retries after a thrown first attempt and returns the second result", async () => {
    vi.useFakeTimers();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network"))
      .mockResolvedValueOnce("good");
    const p = retryOnce(fn, {
      retryIf: (_r, err) => err !== undefined,
      sleepMs: 800,
    });
    await vi.runAllTimersAsync();
    expect(await p).toBe("good");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("propagates the second error when both attempts throw", async () => {
    vi.useFakeTimers();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("first"))
      .mockRejectedValueOnce(new TypeError("second"));
    const p = retryOnce(fn, {
      retryIf: (_r, err) => err !== undefined,
      sleepMs: 800,
    });
    /* Attach the rejection expectation BEFORE advancing timers so the
       rejection is handled the moment it happens. */
    const assertion = expect(p).rejects.toThrow("second");
    await vi.runAllTimersAsync();
    await assertion;
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("a resolved-but-bad first attempt followed by a THROWING second propagates the second error", async () => {
    /* Pinned contract: the caller's own error handling sees the retry's
       failure (in the RDAP check this lands on the outer catch and the
       result is an honest "error" status, not the first bad response). */
    vi.useFakeTimers();
    const fn = vi
      .fn()
      .mockResolvedValueOnce("bad")
      .mockRejectedValueOnce(new TypeError("second down"));
    const p = retryOnce(fn, { retryIf: (r) => r === "bad", sleepMs: 800 });
    const assertion = expect(p).rejects.toThrow("second down");
    await vi.runAllTimersAsync();
    await assertion;
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("never retries when the signal is already aborted, and rethrows the first error", async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    const fn = vi.fn().mockRejectedValue(new TypeError("first"));
    await expect(
      retryOnce(fn, {
        retryIf: (_r, err) => err !== undefined,
        sleepMs: 800,
        signal: ctrl.signal,
      }),
    ).rejects.toThrow("first");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("skips the retry when the signal aborts during the pause", async () => {
    vi.useFakeTimers();
    const ctrl = new AbortController();
    const fn = vi.fn().mockResolvedValue("bad");
    const p = retryOnce(fn, {
      retryIf: (r) => r === "bad",
      sleepMs: 800,
      signal: ctrl.signal,
    });
    await vi.advanceTimersByTimeAsync(100);
    ctrl.abort();
    await vi.runAllTimersAsync();
    expect(await p).toBe("bad");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
