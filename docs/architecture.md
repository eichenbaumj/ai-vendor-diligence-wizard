# Architecture Overview

A concise technical map for contributors. For what the tool checks and why, read [the methodology](./methodology.md). For the adversarial-input design, read [security](./security.md).

## Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind 4, deployed to Cloudflare Pages | Static SPA; renders reports, streams pipeline progress, renders this documentation at `/methodology` |
| Backend | Supabase Edge Functions (Deno) | `evaluate` (the pipeline), `get-evaluation`, `chat` (grounded Q&A over a finished report), `dispute` (correction channel) |
| Database | Supabase Postgres | Evaluations (with a 30-day per-vendor result cache, skipped whenever adversarial-content findings are present), cached registry results, source snapshots (litigation-hold-ready logging), disputes |
| AI | Anthropic API | Claude Haiku 4.5 and Claude Sonnet 5; server-side `web_search` and `web_fetch` tools in the research stage |
| Abuse controls | Cloudflare Turnstile, per-IP limits, workspace spend caps | The tool is free and unauthenticated, so all three matter |

Shared contracts live in `supabase/functions/_shared/` as pure TypeScript modules (zod schemas, no Deno APIs, no I/O). They are imported by the edge functions (Deno), the frontend (via the `@shared/*` alias), and the tests, so the same types and the same deterministic logic (tier computation, language lint, domain classification, ingest forensics) run everywhere. Imports from `_shared` always carry explicit `.ts` extensions so both Deno and Vite's bundler resolution accept them.

## The pipeline

Six stages, orchestrated by the `evaluate` edge function, with progress streamed to the client as typed events (`EvalEvent` in `schemas.ts`). Every stage boundary is a zod-validated typed object; that is the security architecture as much as the data architecture.

| Stage | What it does | Model | Key contract |
|---|---|---|---|
| **1. parse** | Deterministic ingest forensics first (`forensics.ts`: invisible-Unicode strip, instruction-pattern screen, PII backstop), then a quarantined extraction call turns the pitch into typed claims | Claude Haiku 4.5, no tools, strict JSON schema output | `PitchExtract` |
| **2. registry** | Deterministic fan-out against public registries: EDGAR, the five open-data state registries, RDAP, Wayback CDX, crt.sh, SAM entity + exclusions, USAspending, FedRAMP feed, GovRAMP list, TX-RAMP (when Texas), Sourcewell, GitHub org, DNS/MX. Each check logs query, timestamp, status, and evidence URL | None (plain code) | `RegistryLedger` |
| **3. research** | Agentic web research: customer traces on .gov sites, leadership corroboration, case-study cross-existence, AI-inventory presence. Citations required on everything; application code classifies each cited domain (`domain-classes.ts`) | Claude Sonnet 5 with `web_search_20260318` (max 12 uses) and `web_fetch_20260318` (max 6 uses, citations on, content capped at 15k tokens), content-farm domains blocked; the work arrives in bounded `pause_turn` cycles, so completed cycles survive even when a later one hits the stage deadline | `ResearchOutput` |
| **4. packs** | Use-case classification, high-impact escalation, state-obligation mapping; selects the sector question pack | Heuristic tables, Claude Haiku 4.5 as classification fallback | `SectorContext` |
| **5. synthesis** | Composes ledger rows and narrative; computes the verdict tier in plain code (`tier.ts`) from typed inputs; generates the question pack; runs the language lint (`lint.ts`), regenerating once on violation, falling back to neutral templates | Claude Haiku 4.5 with strict JSON schema output, plus non-LLM validators | `Report` |
| **6. review** | Optional quality pass over the assembled report JSON: wording adjustments only, each one logged in `report.review.adjustments`. It cannot touch the tier, the ledger results, or the deterministic findings | Recorded per-report in `report.review.model` | `Report.review` |

After the pipeline: the report page renders the `Report` object, manual check cards work as an interactive checklist, and the `chat` function answers follow-up questions with the finished report as its only context (Haiku 4.5, no tools, capped output, server-enforced session budget).

## Trust map

The load-bearing table: which stage is exposed to attacker-authored text, and what constrains it. "Raw pitch" is the full submitted text; "quoted spans" are the length-capped verbatim claim quotes carried in `PitchExtract` (max 400 chars each, max 30 claims).

| Stage | Sees raw pitch? | Sees fetched web content? | Constraint |
|---|---|---|---|
| Ingest forensics | Yes | No | Deterministic code; its findings cannot be cleared downstream |
| 1 parse (Haiku) | Yes (normalized, as labeled untrusted tool content) | No | No tools; strict schema out; nothing else it emits is used |
| 2 registry | No (typed identity fields only) | No (structured API responses only) | No LLM anywhere in the stage |
| 3 research (Sonnet) | No (typed extract + quoted spans) | Yes (untrusted) | Citations mandatory; domain authority classified by code; registry facts come from stage 2, not from fetched pages; fetch/search capped and domain-filtered |
| 4 packs | No (typed fields + quoted spans) | No | Enum-constrained classification |
| 5 synthesis (Haiku) | No (typed ledger + quoted spans) | No (citation records only) | Tier computed by code before the model runs; strict schema; language lint |
| 6 review | No (report JSON only) | No | Adjustments logged; tier and ledger immutable |
| Tier computation (`tier.ts`) | No | No | Pure function over typed, code-produced inputs; no model output reaches it |
| chat | No (rendered report only) | No | No tools; output capped; session budget server-side |

The invariant, stated once: **no vendor-authored text can change which checks run or what the verdict tier is; detected manipulation can only lower the tier** (the ADV ceiling in `tier.ts`).

## Cost envelope

From the [cost model](./research/gap-no-per-evaluation-cost-model-an-explicit.md) (all rates verified August 2026), scaled to the current tool caps (12 searches, 6 fetches, 15k content tokens): observed evaluations run **$0.30 to $0.45** in API spend; the all-caps-exhausted ceiling is roughly $1.50. The cost model's original figures assumed the larger launch caps. Composition at typical: the Sonnet 5 research stage is about $0.34 (a third of that is the $0.01-per-search fee), synthesis and extraction are a few cents each, registry checks are effectively free.

Two operational notes that matter more than the totals:

- **Prompt caching is the single largest cost control.** The research loop re-bills accumulated context each iteration; with `cache_control` set correctly the typical evaluation is $0.42, and with caching broken it roughly doubles. Treat `cache_read_input_tokens > 0` as a monitored invariant.
- **The tool caps, not throttles, depth.** Search/fetch `max_uses` are a hard stop against runaway cost. If costs ever need trimming, reduce `max_content_tokens` (depth per document) before reducing `max_uses` (number of independent sources); the latter degrades verification of small vendors first, which is the fairness failure the methodology forbids.

## Local development

Prerequisites: Node 20+, the Supabase CLI, an Anthropic API key.

```bash
npm install
npm run dev                 # Vite dev server on :8080
npm run functions:serve     # Supabase edge functions, reads supabase/.env.local
npm test                    # vitest (unit + red-team fixtures under tests/)
npm run packs:build         # compile packs/*.yaml -> generated pack modules
npm run packs:validate      # schema-check the pack files
npm run readability         # grade-level check on user-facing copy
```

- Frontend env (`.env.local` at the repo root): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TURNSTILE_SITE_KEY`; set `VITE_MOCK=1` to run the UI against fixture data with no backend.
- Function env (`supabase/.env.local`): `ANTHROPIC_API_KEY` plus keys for the registry APIs that need them (SAM.gov). Never commit these; the repo is public.
- Path aliases: `@/*` maps to `src/`, `@shared/*` to `supabase/functions/_shared/`. Keep `_shared` modules pure (no Deno APIs, no I/O) and keep `.ts` extensions on relative imports there, or the dual Deno/Vite resolution breaks.
- TypeScript is strict; `npx tsc --noEmit` must pass before a PR.
- Sector packs are YAML under `packs/`, validated in CI against `packs-types.ts`; the build compiles them to `packs.gen.ts` (functions) and `src/generated/packs.json` (frontend).
- The adversarial test corpus lives under `tests/redteam/`; see [security](./security.md) for the standing assertions. New attack classes should arrive as fixtures with an expected-outcome assertion.

## Repository layout

```
docs/                      methodology, coverage map, security, this file; research/ holds the underlying reports
packs/                     sector question packs (YAML, CC BY 4.0)
scripts/                   pack build/validation, readability check
src/                       frontend (pages, components, styles, generated pack data)
supabase/functions/        edge functions; _shared/ holds the typed contracts and deterministic logic
supabase/migrations/       Postgres schema
tests/                     unit tests, fixtures, red-team corpus
```

Licensing: code under Apache-2.0; `docs/methodology.md` and the packs under CC BY 4.0; the tool's name and logo are reserved. See methodology Section 11.
