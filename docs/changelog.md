# Methodology changelog

Every change to checks, weights, tier criteria, or language rules lands here
with its date and its expected effect on verdicts. The methodology document
states the current rules; this file records how they got there.

## Version 1.3 (August 29, 2026)

**What changed.** GovRAMP, TX-RAMP, and Sourcewell checks now leave rows in
the verification ledger the way the FedRAMP check always has. A claimed
GovRAMP status absent from the participant list shows as a contradiction
row next to the list itself. A TX-RAMP claim absent from the published list
shows the same way, weighted High because that list lags new certifications.
A listing found on any of the three shows as a verified row, and a program
claim we could not check against its list stays as an unverified row. Two
knock-on effects of the new rows: a report that claims one of these programs
while the list is unreachable can gain one consolidated document-request
question, and a contradiction row flips the matching honesty panel item to
flagged.

**Expected effect on verdicts: none.** Tier logic is untouched. The same
contradictions that moved verdicts before still move them; the new rows make
them visible in the ledger.

## Version 1.2 (August 29, 2026)

**What changed.** The question pack is now selected by a dedicated engine
(`questions.ts`) that tailors questions to the specific pitch. Sector packs
grew from six to nine with the addition of public safety and policing, tax
and revenue, and permitting and licensing. Several behaviors the methodology
already described are now implemented exactly as written: the elevated-
scrutiny escalation adds the eligibility pack's oversight and appeals
questions (D7.2), the AI governance question is added automatically at
Tier 2 and above (D3.10), a missing model disclosure becomes a direct
question (D4.1), an unqualified full-automation claim becomes the staffing
question (D4.3), and unverified areas produce consolidated document-request
questions. Pack questions now show what a credible answer and a weak answer
look like. Two new Medium findings exist (model transparency, automation
honesty); a failed sector classification now falls back to a published
signal lexicon in code; and a deep check that silently fell back to a
standard check now says so in the honesty panel.

**Expected effect on verdicts: none.** The two new findings are Medium, and
Medium findings cannot move a tier. Question packs change on most reports;
tiers do not. Reports generated under version 1.1 are no longer served from
cache and regenerate on request.

## Version 1.1 (August 29, 2026)

**What changed.** The vendor's own public website became an evidence source
for every submission kind, under strict provenance rules (site text creates
things to check; it never verifies anything, never expands registry
searches, and never creates absence-based findings). Compound vendor names
are split so a product name can match its company's registration. Registry
contradictions arm only on affirmative designation claims; vague or pending
language can no longer produce the most severe verdict. Research findings
that match no ledger row are surfaced as leads instead of being discarded.
The honesty panel groups checks by what actually happened. A deep-check
mode with four parallel research lanes went live.

**Expected effect on verdicts.** Some vendors whose evidence lived on their
own websites or under a different legal name moved up; the fictional
control cases were unaffected.

## Version 1.0 (August 2026)

Initial public methodology: the seven dimensions, five verdict tiers with
deterministic tier logic in code, the two-identifier identity rule, the
evidence-tier grading system, the adversarial-content ceiling, the language
policy, and the first six sector packs.
