/*
  Wall-clock budget for the S1b name-run site pass (discovery -> fetch ->
  extract), against the 400s function wall.

  The frame (evaluate/index.ts): the dynamic research deadline is
  max(120_000, min(260_000, 390_000 - elapsed - reserve)) with a 127s
  post-research reserve on name runs. The 120s floor means research is
  granted that much even when earlier stages ran long, so S3 must START
  by S3_START_BOUND_MS = 390 - 120 - 127 = 143s or the run risks the
  wall.

  The cutoffs below COMPOSE against that bound with both retries
  included; s1b-budget.test.ts re-derives the worst case from the
  constants, so the arithmetic is enforced, not asserted in prose:

  - Site pass start < 80s. Starting at 79.9s: one 22s fetch pass (the
    second pass is granted only under 55s) ends ~102s; extract attempt 1
    (25s) ends ~127s; the extract retry gate (<100s, checked after
    attempt 1) has long passed, so no retry. S1b ends <= ~127s.
  - Starting under 55s with both fetch passes: 54.9 + 44 = ~99s; extract
    attempt 1 ending just under the 100s retry cutoff earns the retry,
    ending <= 100 + 25 = 125s. S1b ends <= ~125s.
  - Composed worst over all branches: ~127s, + S2 registry/adjudication
    overhead (~15s observed) = ~142s <= 143s bound.
  - Discovery retry (20s deadline) is granted only under 60s elapsed, so
    it always finishes before the 80s pass gate and can never produce a
    domain the gate then discards.

  The pre-1.6 gate was a bare 60s magic number chosen before the retry
  ladder existed. These predicates replace it with budgeted, testable
  cutoffs that spend retry time only where a link actually failed.

  Pure module: no Deno APIs, no module-level state, no Date calls — the
  caller supplies elapsed milliseconds.
*/

/* Latest pipeline-elapsed time at which S3 research may start without
   risking the 400s wall (390s design target - 120s research floor -
   127s name-run post-research reserve). Mirrors the deadline formula in
   evaluate/index.ts; if that formula changes, change this with it. */
export const S3_START_BOUND_MS = 143_000;

/* Observed S2 registry + adjudication overhead between the site pass
   ending and S3 starting (12s registry lanes + margin). */
export const S2_OVERHEAD_ALLOWANCE_MS = 16_000;

/* The site extract's per-attempt timeout. Mirrors STAGE_TIMEOUTS.extract
   in evaluate/index.ts (Deno-only, not importable here); if that value
   changes, change this with it. */
export const SITE_EXTRACT_TIMEOUT_MS = 25_000;

/* Latest pipeline-elapsed time at which the site pass (fetch + extract)
   may still start. */
export const SITE_PASS_CUTOFF_MS = 80_000;

/* Latest elapsed time at which a failed discovery search earns a second
   attempt. The retry's own 20s deadline must land before the site-pass
   cutoff, or the retry could find a site the gate then discards. */
export const DISCOVERY_RETRY_CUTOFF_MS = 60_000;

/* Below this, a failed site fetch may re-run once (two full 22s passes
   plus the 3s inter-pass pause still compose inside the bound). */
export const SITE_FETCH_SECOND_ATTEMPT_CUTOFF_MS = 52_000;

/* Mirrors SITE_RETRY_PAUSE_MS in ingest-site.ts for the composition
   test; if that pause changes, change this with it. */
export const SITE_FETCH_PAUSE_ALLOWANCE_MS = 3_000;

/* Latest elapsed time at which a failed site extract earns its second
   attempt (mirrors the pitch extractor's 2-attempt loop). Sized so a
   retry granted at the last moment still ends by 125s, inside the
   composed bound. */
export const SITE_EXTRACT_RETRY_CUTOFF_MS = 100_000;

/* The retry attempt extracts from a SHORTENED copy of the fetched site
   text: a 25s timeout on the full 40k-character corpus is a correlated
   failure an identical retry re-hits (live zencity observation,
   2026-09-01: both attempts failed on the full corpus). Half the total
   cap keeps the homepage plus the highest-value pages. */
export const SITE_EXTRACT_RETRY_TEXT_CAP = 20_000;

export function canStartSitePass(elapsedMs: number): boolean {
  return elapsedMs < SITE_PASS_CUTOFF_MS;
}

export function siteFetchAttempts(elapsedMs: number): 1 | 2 {
  return elapsedMs < SITE_FETCH_SECOND_ATTEMPT_CUTOFF_MS ? 2 : 1;
}

export function canRetrySiteExtract(elapsedMs: number): boolean {
  return elapsedMs < SITE_EXTRACT_RETRY_CUTOFF_MS;
}

export function canRetryDiscovery(elapsedMs: number): boolean {
  return elapsedMs < DISCOVERY_RETRY_CUTOFF_MS;
}
