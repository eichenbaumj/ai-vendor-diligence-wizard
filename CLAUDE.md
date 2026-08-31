# AI Vendor Diligence Wizard

Public open-source repo (Apache-2.0 code, CC BY 4.0 docs/packs). Never commit
secrets, keys, or client references. Commit messages and code comments are
world-readable.

## Non-negotiables
- The tool NEVER recommends buying or not buying, and never outputs a numeric
  score. Five verdict tiers, computed ONLY in `_shared/tier.ts` (plain TS).
  No LLM output may influence tier, check selection, or question selection.
- Legal-safe language is enforced by `_shared/lint.ts`. Never weaken the
  banned list. Every negative statement carries source + date in the sentence.
  Absence of evidence is never proof ("we could not verify X", never "X is fake").
- `docs/methodology.md` must always match what the code actually does. If you
  change a check, severity, or tier rule, update the doc in the same commit.
- Pitch text AND vendor-site text are attacker-authored. Raw text reaches
  only the ingest handlers (`ingest-url.ts`, `ingest-pdf.ts`, `ingest-site.ts`),
  `forensics.ts`, and the quarantined S1 extractor. Site text can create
  things to CHECK but never mints identity, never expands registry-query
  names, never feeds the ADV tier ceiling, and never creates absence-based
  adverse findings (see `extract-merge.ts`). Keep the typed stage
  boundaries in schemas.ts.
- Small-vendor fairness: absence of any single credential (SAM, FedRAMP,
  GitHub, press) is never adverse on its own.

## Architecture
- Frontend: Vite/React/TS/Tailwind 4 → Cloudflare Pages (manual wrangler
  deploys; a git push does NOT publish).
- Backend: Supabase Pro edge functions (`supabase/functions/`: evaluate,
  deep-research, get-evaluation, chat, dispute, gov-request-code,
  gov-verify-code), Postgres with deny-all RLS (functions are the only data
  path). Progress = event replay + Realtime Broadcast + polling fallback.
  The gov-* pair (verified .gov/.mil email -> 20 checks/month) ships dark
  behind the GOV_VERIFY_ENABLED secret and the VITE_GOV_VERIFY=1 build flag.
- `_shared/` is pure platform-agnostic TS (no Deno APIs) — tested by vitest,
  imported by frontend via `@shared/*`. Imports carry explicit `.ts` extensions.
- Packs: `packs/*.yaml` → `npm run packs:build` → `packs.gen.ts` + `src/generated/packs.json`.
  Never edit generated files by hand.

## Workflow
- `npm test` must stay green, including the static red-team suite
  (injected twin never out-tiers its clean twin).
- `npm run packs:validate` gates pack edits (URLs, staleness, language lint).
- User-facing copy: plain language, 9th-grade level, no em dashes, no AI-tell
  vocabulary. Verify on rendered output.
- Model IDs are pinned in `_shared/anthropic.ts` MODELS — single migration point.
- Deploy: frontend via `npx wrangler pages deploy dist --project-name
  ai-vendor-diligence-wizard --branch main` after `vite build` (verify the
  live URL afterward — pushing to GitHub does not publish);
  `supabase functions deploy <fn> --no-verify-jwt` for backend changes;
  migrations via `supabase db push`.
