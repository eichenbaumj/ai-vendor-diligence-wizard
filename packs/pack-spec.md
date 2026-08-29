# Sector Pack Authoring Spec

This document defines the format, invariants, and maintenance process for the
sector packs in `packs/*.yaml`. It adapts Part 1 and Part 4 of
`docs/research/sector-packs.md` into the working rules for this repo. Where
this spec and the research document differ, the type contract in
`supabase/functions/_shared/packs-types.ts` is authoritative.

A sector pack is the tool's structured knowledge about one category of AI
vendor pitch (call center, document processing, and so on): who actually
sells in that market, how deployments have gone wrong, which claims should
raise skepticism, and the exact questions a non-technical program officer can
send a vendor. Packs never recommend a purchase, and never assert that a
vendor is dishonest. Absence of evidence is always written as "we could not
verify X in public sources."

## Pipeline

```
packs/*.yaml
   |  npx tsx scripts/build-packs.ts
   +--> supabase/functions/_shared/packs.gen.ts   (typed, for the pipeline)
   +--> src/generated/packs.json                  (for the methodology page)

   npx tsx scripts/validate-packs.ts              (CI gate, exits 1 on error)
```

Both generated files are committed. Never edit them by hand; edit the YAML
and rebuild. The npm scripts `packs:build` and `packs:validate` wrap the two
commands, and `npm run build` runs `packs:build` first.

One file per pack. The filename must equal the `pack_id`
(`packs/call-center.yaml` has `pack_id: call-center`). Pack ids are stable
forever and are never reused after retirement; the frontend/edge contract in
`supabase/functions/_shared/schemas.ts` (`PackId`) enumerates the live set.

## Field reference

All fields are required. Markdown-valued fields are YAML block scalars
(`>-` for one flowing paragraph, `|-` for multi-line markdown). Fields
marked "user-facing" render directly into wizard output and must follow the
copy rules below.

| Field | Type | Rules |
|---|---|---|
| `pack_id` | slug | Stable identifier, matches the filename. Never reused. |
| `pack_name` | string, user-facing | Plain-language name a program officer recognizes ("Call Center & Phone AI"). |
| `definition` | markdown, user-facing | 120 words or fewer. What the category IS, in the buyer's language, plus what it is NOT (an explicit boundary with adjacent packs, naming them). |
| `inclusion_test` | list of 3 to 6 strings | Yes/no questions answerable from the pitch artifact alone. A pitch matches the pack if ANY answer is yes. Each question should map to detectable pitch language. |
| `signal_lexicon` | list of 8 to 15 strings | Lowercase domain terms for the code-side classifier fallback (`_shared/sector-lexicon.ts`): when the S4 model call fails, terms are substring-matched against the pitch's use-case description and claim quotes, and 2 or more distinct hits select the pack. Prefer multi-word domain phrases ("call deflection", "meeting transcription") over single common words ("analytics" would hit everywhere). Each term is 3 to 40 characters, lowercase, no surrounding whitespace (CI-enforced). An eligibility-lexicon hit can only ADD scrutiny, never remove it. |
| `scrutiny_tier` | `standard` or `elevated` | `elevated` changes output behavior: the strongest caution band floor, a mandatory legal-context block, and overlay behavior. `eligibility-case-mgmt` is elevated and must stay elevated (CI-enforced). |
| `incumbent_landscape` | markdown, user-facing | 300 words or fewer. Who actually sells this to state and local government, structured in layers (platforms, integrators, startups). Answers the buyer's first question: is this vendor even on the real market map? |
| `established_vendors` | list of `{name, tier, one_liner, gov_evidence_url}` | `tier` is one of `platform`, `integrator`, `specialist`, `startup-verified`. Presence is a "known quantity" signal, never an endorsement. A vendor with no independently verifiable government deployment never appears here. `gov_evidence_url` may be null when the evidence is cited by outlet and date in the one-liner. |
| `failure_modes` | list of `{title, description, named_incident, source_url}` | Category-specific ways deployments go wrong. Every mode must cite a real named incident or oversight finding. No hypotheticals. `source_url` is required (CI-enforced). Extra supporting URLs can live inside `description`. |
| `skepticism_triggers` | list of `{claim_pattern, threshold, why, source_url}` | Claims that flip the output toward caution, each with a numeric or categorical threshold and the evidence-based reason. These feed the pitch scanner. `source_url` may be null (the type allows it); CI warns so the gap is visible each run. |
| `diligence_questions` | ordered list of 10 to 15 `{id, question, good_answer, red_flag, source_url, select?}` | Copy-paste-ready questions an officer can send verbatim. Ids are `<pack_id>-q01` through `<pack_id>-qNN`, sequential and zero-padded (CI-enforced). Question 1 is always the highest-yield discriminator for the category. `good_answer` describes what a credible answer looks like; `red_flag` describes the disqualifying answer. `select` is the question-selection metadata; see "Question selection metadata" below. |
| `elevated_scrutiny_rules` | list of `{condition, action}` | Machine-readable rules that raise scrutiny within the pack, including overlay triggers into `eligibility-case-mgmt`. Present in every pack, including `standard` ones. |
| `reference_deployments` | list of `{agency, vendor_stack, what, metric, metric_source_type, source_url}` | Named government deployments the user can cite back to vendors. `metric_source_type` is one of `oversight`, `independent-press`, `government-page`, `vendor-reported`. `source_url` is required (CI-enforced). Cautionary deployments are welcome; label them in `agency`. |
| `registries_to_check` | list of `{name, url, what_it_proves}` | Category-relevant automated checks (FedRAMP Marketplace, GovRAMP APL, BTAH, AI Incident Database, and so on). Only registries with a confirmed URL appear; registries known by name but with an unconfirmed URL go in `known_gaps`. |
| `legal_context` | markdown, user-facing | Laws, rulings, and memos the output should surface. Every item is date-stamped. Items with uncertain current status say "verify current status before citing" in the text. Rendered in full for `elevated` packs, collapsed for `standard`. The eligibility pack's `legal_context` opens with the "Why this category is different" block, which the overlay prepends onto other packs' output. |
| `realistic_pricing` | markdown, user-facing | Published price anchors and "if the quote is 10x this, ask why" heuristics. Link live pricing pages instead of hard-coding volatile numbers. If no honest anchor exists, say so. |
| `last_updated` | `YYYY-MM-DD` string | Date of the last substantive review, not typo fixes. |
| `refresh_cadence` | `quarterly` or `monthly` | Quarterly is the default. Monthly is for fast-moving packs (`eligibility-case-mgmt`). Rendered in output as "this guidance was last reviewed on {date}." |
| `known_gaps` | markdown | The honest list of what the pack could not verify this cycle: unverified vendor claims, incidents retained with outlet-and-date citations because a direct URL was not captured, registries cited by name only. This field operationalizes the project's uncertainty-handling standard, and it is the standing to-do list for the next refresh. |

### Vendor-reported metrics

Vendor-reported figures are never promoted to fact. In
`reference_deployments`, the flag is the `metric_source_type:
vendor-reported` value, which the UI renders as a caveat badge. If the
`metric` text itself says "vendor-reported," the field must agree
(CI-enforced). In `established_vendors` one-liners and landscape prose,
write the caveat inline: "(vendor-reported)".

## Question selection metadata (`select`)

The question engine (`_shared/questions.ts`) selects pack questions from
typed signals only; the `select` block on each question is how the YAML
controls that selection. The type contract is `QuestionSelect` in
`packs-types.ts`. Fields, all optional:

| Field | Meaning |
|---|---|
| `base: true` | Member of the pack's default slate, asked of every vendor matching the pack (3 to 6 per pack, CI-enforced). Reserve it for the universal asks: disclosure, escalation, monitoring, security basics, and the pack's question 1 discriminator. Base questions never double as triggered questions. |
| `claim_types` | Fires when the pitch carries a claim of a listed type. Values come from the `ClaimType` enum in `_shared/schemas.ts`: `identity`, `customer`, `compliance`, `performance`, `team`, `pricing`, `availability` (CI-enforced). Use for questions that test a specific claim class (a containment number, a named customer, a certification). |
| `finding_ids` | Fires on an unresolved engine finding: an exact id from `FINDING_IDS` in `_shared/finding-ids.ts`, or the prefix form `"perf-*"` (CI-enforced). Use only where the question is the natural follow-up to that finding; do not spray selectors. |
| `elevated: true` | Fires when the report runs under elevated scrutiny (methodology D7.2): pre-deployment testing, impact assessment, human oversight, appeals and redress. An `elevated` pack must carry at least 2 (CI-enforced). |
| `overlay_core: true` | `eligibility-case-mgmt` only, on exactly 4 questions (CI-enforced): the human-decision, denial-notice, appeal-record, and rollback questions the overlay merges into other packs' reports. |
| `tiers` | Verdict tiers (0 to 4) at which the question is eligible. Use `[3, 4]` or `[4]` for contract-stage, reference-call, and demo-structure questions, which are noise in a tier-2 report. A gate, not a trigger: a question with only `tiers` never fires. |
| `weight` | Integer 0 to 10, default 0. Orders triggered questions within a pack (higher first); the base slate keeps file order. Use sparingly. |

A question may combine keys (`base` + `tiers`, `claim_types` +
`finding_ids`). A pack with no `select` anywhere is a legacy pack: its
first five questions act as the base slate. Once ANY question carries
`select`, the pack is annotated and the full CI invariants below apply;
questions left without a trigger or `base` flag will not ship in reports.

## CI invariants

`scripts/validate-packs.ts` fails the build (exit 1) on any of:

1. Schema violations against the `packs-types.ts` shape (zod, strict: no
   unknown keys, no missing fields, enum values only, real URLs).
2. `pack_id` not matching the filename.
3. Fewer than 10 or more than 15 diligence questions, or ids that are not
   sequential `<pack_id>-q01`...
4. A failure mode or reference deployment without a valid `source_url`, or a
   failure mode with an empty `named_incident`.
5. `last_updated` older than 2x the refresh cadence: 180 days for quarterly,
   60 days for monthly. A stale pack fails until it is reviewed (or an
   explicit waiver is recorded by updating `last_updated` with a dated note
   in `known_gaps`).
6. Purchase-recommendation language anywhere in prose: "best choice,"
   "leading choice," "leading vendor," "we recommend buying/purchasing/
   selecting," "top pick."
7. Legal-safe language violations of kind "banned" from
   `supabase/functions/_shared/lint.ts` (the vocabulary that converts
   protected opinion into actionable assertion: "scam," "deceptive,"
   "misleading," and so on), with one documented carve-out described below.
8. `definition` over 120 words or `incumbent_landscape` over 300 words.
9. `eligibility-case-mgmt` not marked `scrutiny_tier: elevated`.
10. A metric described as vendor-reported without `metric_source_type:
    vendor-reported`.
11. `signal_lexicon` missing, outside 8 to 15 entries, or containing a term
    that is not lowercase, is shorter than 3 or longer than 40 characters,
    or has surrounding whitespace.
12. In an annotated pack (any question carrying `select`): fewer than 3 or
    more than 6 `base: true` questions; a `claim_types` value outside the
    `ClaimType` enum; a `finding_ids` entry that is not a `FINDING_IDS` id
    or a known prefix form (`"perf-*"`); a `tiers` value outside 0 to 4; a
    `weight` outside integer 0 to 10; `overlay_core` outside
    `eligibility-case-mgmt` or not on exactly 4 questions there; or an
    `elevated`-tier pack with fewer than 2 `elevated: true` questions.

Warnings (printed, non-fatal): lint violations of kind "style" (em dashes,
AI-tell vocabulary), because pack content may legitimately quote vendor
claims and research-document language; skepticism triggers with a null
`source_url`; and bare-noun "fraud" matches (see below). Keep the warning
list short anyway; every warning is reviewed at each refresh.

### The "fraud" carve-out

The lint module bans the fraud word family because calling a specific vendor
fraudulent is exactly what this tool must never do. But this corpus cannot
describe its own subject matter without the bare noun: "fraud detection" is a
product category, and "false fraud determinations" is the language of the
Michigan settlement. The validator therefore:

- fails on "fraudulent" and "fraudster" anywhere in prose, and
- downgrades bare-noun "fraud" matches to warnings.

URL-valued fields (`source_url`, `gov_evidence_url`) are excluded from all
language lints, since source slugs legitimately contain flagged words.

## Copy rules (user-facing fields)

- Plain language at or below a 9th-grade reading level wherever the content
  allows; verbatim question text from the research corpus is pre-approved.
- No em dashes anywhere; rewrite the sentence. En dashes only inside numeric
  ranges ("65–70%").
- Never "leverage," "robust," "seamless," "holistic," "delve," or
  "not just X but Y."
- Absence is framed as "we could not verify X in public sources," never as
  an assertion that something is untrue.
- The tool never recommends a purchase, and a pack never marks a vendor
  safe. `established_vendors` is a market-map signal only.
- Every causal or factual claim carries a source URL or a named,
  date-stamped citation; if the URL was not captured, the claim moves to
  `known_gaps` or carries an explicit "URL pending re-capture" note.

## Refresh process

### Cadence

- Quarterly review for all packs; monthly for `eligibility-case-mgmt`
  (fast-moving litigation, state automated-decision laws, OBBBA
  implementation).
- Each review re-verifies: every URL resolves, every "verify current status
  before citing" item, pricing anchors against live pages, and registry
  names and status (the StateRAMP-to-GovRAMP rename is the canonical example
  of why names must be re-verified).
- CI enforces staleness mechanically (invariant 5). Every rendered output
  shows "guidance last reviewed {date}"; honesty about staleness is itself a
  trust feature.

### Event triggers (update out of cycle)

Any of the following opens a maintainer issue within a week:

1. Litigation or oversight event: a new court ruling, IG/GAO/TIGTA report,
   or settlement involving a named vendor or category. Add to
   `failure_modes`; annotate `established_vendors`.
2. Law or policy change: state AI acts taking effect (Colorado's Jun 30,
   2026 date is queued), new OMB memos, FCC or DOJ actions, registry
   renames.
3. Vendor lifecycle event: acquisition, shutdown, major funding, product
   rename, pricing-model change, FedRAMP/GovRAMP authorization granted or
   revoked.
4. Prominent deployment outcome: a new named government deployment with
   public metrics, or a public decommissioning. NYC-MyCity-shutdown-class
   events must land in packs within one week; they are the tool's most
   persuasive content.
5. Pack-gap telemetry: three or more similar no-match pitches in a quarter
   trigger a draft-pack proposal (public safety/surveillance and
   permitting/licensing are the anticipated next two).
6. User or partner flag: the in-tool "report outdated info" link files a
   pre-templated GitHub issue.

### Community contributions

- Everything is contributable by PR against the YAML files. Every factual
  change carries a URL; metrics are labeled by `metric_source_type`;
  vendor-reported figures are never promoted to fact; recommendation
  language is linted out.
- Two-lane review. Lane 1 (fast, one maintainer): link fixes, date stamps,
  new sourced reference deployments. Lane 2 (slow, two maintainers, one
  from a partner org): changes to `established_vendors`,
  `skepticism_triggers`, `diligence_questions`, `scrutiny_tier`, or
  anything in `eligibility-case-mgmt`.
- Conflict-of-interest rule: contributors disclose vendor affiliation in
  the PR. Vendor-affiliated PRs may correct factual errors about their own
  product (with sources) but may not add their product to
  `established_vendors`; that requires an independently verifiable
  government deployment (press, government page, or contract record; a
  vendor case study alone is insufficient) confirmed by a maintainer.
- Suggested issue templates: "New failure mode / incident," "New reference
  deployment," "Vendor status change," "Stale claim," "New pack proposal."
- Versioning: the wizard pins a pack-set release (`PACK_RELEASE`, the
  newest `last_updated` across packs) so outputs are reproducible:
  "evaluated against pack release 2026-08-28."

### Known-gap discipline

`known_gaps` is the standing to-do list for the next refresh. A gap that
persists for two consecutive reviews gets resolved or the dependent claim is
removed.

## Deviations from the research document (v1)

Recorded here so the next maintainer does not "fix" them backward:

- The research doc's `platform-API` vendor tier does not exist in
  `packs-types.ts`; hyperscaler APIs (Textract, Azure Document
  Intelligence, Google Document AI) are tiered `platform` with the API
  nature stated in the one-liner.
- The eligibility pack's "Why this category is different" block lives at
  the top of its `legal_context` field (the type has no dedicated field).
  The overlay rule in `elevated_scrutiny_rules` points there.
- Three incidents with no captured URL (Klarna reversal, Washington
  AI-voice removal, EDDNext) are retained with outlet-and-date citations
  plus `known_gaps` notes rather than guessed URLs; the 2023 Medicaid
  unwinding ex parte event is excluded from failure modes entirely until
  the primary CMS document is re-fetched.
- Registries the research doc names without URLs (GovAI Trellis, TX-RAMP,
  state AI inventories) are cited by name in `known_gaps` until their URLs
  are confirmed.
