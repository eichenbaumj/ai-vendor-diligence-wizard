# Contributing

Thank you for helping government buyers triage AI pitches. Two kinds of
contribution matter most: sector pack updates and registry coverage.

## Sector packs

Packs live in `packs/*.yaml` (schema: `packs/pack-spec.md`). To update one:

1. Edit the YAML. Every incident, deployment, and skepticism trigger needs a
   source URL. Vendor-reported metrics must be labeled as vendor-reported.
2. Run `npm run packs:validate` and `npm run packs:build`.
3. Open a PR. CI enforces the schema, staleness limits, and the language lint
   (packs never contain purchase-recommendation language).

Adding a vendor to `established_vendors` requires a verifiable government
deployment with a source. Presence in a pack is not an endorsement.

## Registry coverage

New free, deterministic lookup lanes (especially state business registries)
are the highest-value code contribution. See `docs/coverage-map.md` for the
current map and `supabase/functions/_shared/registry/` for the module
contract. Rules: honor sites' automation policies (some states prohibit
automated search; we do not scrape them), fail soft (a broken source becomes
"could not check", never an adverse finding), and ship fixtures + tests.

## Language rules

Everything user-facing follows `docs/methodology.md` section on language:
plain English, no em dashes, absence of evidence is never proof, and the
banned-vocabulary list in `_shared/lint.ts` is enforced in CI. PRs that
weaken the language rules will not be merged.

## Disputes rota

The vendor dispute channel has a 5-business-day review promise. A named
maintainer owns dispute triage each week; the current owner is listed in the
project board. Disputes are a legal control: do not let them sit.

## Tests

`npm test` runs the unit suite and the static red-team regression (an
injected pitch must never receive a better verdict than its clean twin).
Both must pass before merge.
