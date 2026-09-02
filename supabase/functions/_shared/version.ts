/*
  The methodology version, in one place. The engine stamps it on every
  report and keys the result cache on it (pipeline-tail.ts); the landing
  hero and the "How a check works" page read it too, so no surface can
  quote a stale number (the landing hero said "v1.5" while the engine
  shipped 1.7, 2026-09-01). Pure TS, no Deno APIs, importable by the
  frontend through @shared. Bump it only with a methodology + changelog
  entry in the same commit (CLAUDE.md).
*/
export const METHODOLOGY_VERSION = "1.8";
