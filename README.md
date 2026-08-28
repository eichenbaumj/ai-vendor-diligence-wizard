# AI Vendor Diligence Wizard

A free, open-source triage tool for state and local government staff who are
flooded with AI vendor pitches. Paste the pitch (a cold email, a marketing
page, or just the vendor's name) and get back an evidence-based read on the
company behind it: what public records confirm, what they do not, and the
specific questions to send the vendor before anyone books a demo.

**The tool never says buy or don't buy.** It checks companies against public
registries and records, shows its work, and converts unverified claims into
questions. It is a dam for the inbound river, not a procurement recommender.

Built by [17A](https://group17a.com) with partners. The full evaluation
methodology is public: see [docs/methodology.md](docs/methodology.md), which
also renders inside the app.

## How it works

1. **Parse.** The pitch is scanned for hidden text and then distilled into
   typed claims (identity, customers, compliance, performance, team, pricing).
2. **Registry checks.** Plain code queries public sources: state business
   registries, SEC EDGAR, SAM.gov entity and exclusion records, USAspending,
   the FedRAMP marketplace feed, GovRAMP and cooperative contract lists,
   domain registration and archive history.
3. **Web research.** Claude searches for the traces real government work
   leaves: agency websites, council agendas, procurement awards, independent
   press. Every statement carries its source.
4. **Sector match.** The pitch is matched to a sector pack (call centers,
   document processing, eligibility and case management, and more), which
   contributes category-specific failure modes and questions.
5. **Verdict.** Deterministic code — not a model — computes one of five
   verdict tiers from the evidence ledger. The harshest tier requires two
   independent registry contradictions.
6. **Review.** Reports that carry adverse findings get an adversarial review
   pass by the strongest available model before publication. The reviewer can
   only tighten language, never inflate a verdict.

Security note: verdicts, check selection, and question selection are computed
in code over typed data, so text inside a pitch cannot change the outcome —
attempts to manipulate automated analysis are themselves surfaced as findings.
See [docs/security.md](docs/security.md).

## Stack

- Frontend: Vite + React + TypeScript + Tailwind 4, deployed on Cloudflare Pages
- Backend: Supabase Edge Functions + Postgres (deny-all RLS; functions are the only data path)
- Models: Claude Sonnet (research), Claude Haiku (extraction, structuring, chat), Claude Fable (adversarial review)

## Local development

```bash
npm install
npm run dev          # frontend in mock mode (no backend needed)
npm test             # unit + static red-team suite
npm run packs:build  # compile packs/*.yaml
```

The frontend runs fully mocked until `VITE_SUPABASE_URL` is set. Backend
functions run locally with `supabase start` + `npm run functions:serve`
(copy `supabase/.env.local.example`).

## Licensing

Code: [Apache-2.0](LICENSE). Documentation and sector packs: [CC BY 4.0](LICENSE-docs).
The project name and logo are reserved.

## Disputes

Vendors named in a report can dispute any finding; disputes are reviewed
within 5 business days and open disputes are flagged on affected reports.
See the app's disputes page or [CONTRIBUTING.md](CONTRIBUTING.md).
