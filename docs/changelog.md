# Methodology changelog

Every change to checks, weights, tier criteria, or language rules lands here
with its date and its expected effect on verdicts. The methodology document
states the current rules; this file records how they got there.

## Version 1.5 (September 2026)

**Registry records must be tied to the vendor before they count.** A
record that matches by name — even exactly — now earns identity, credit,
or a warning only when a second detail ties it to this vendor: an officer
or registered agent the vendor's materials or independent coverage names,
an address the vendor uses, the vendor's web domain, the compliance feed's
own product entry, the complete legal name the buyer typed, or (for
favorable credit only, never warnings) a matching state. The lanes now
capture those details from the records they already receive, and the New
York detail record's CEO, registered agent, and service-of-process address
join the comparison. Untied records appear as labeled candidate records:
visible, linked, and earning nothing. In the other direction, a legal name
that contains the vendor's brand plus corporate boilerplate can now be
credited WITH a tie, where the old rule demoted the true record for not
being letter-exact. End-of-registration findings (dissolutions,
revocations) arm only on records tied by one of the stronger details; an
ended registration under a merely matching name becomes a candidate record
with a one-line question instead of a Critical warning. The debarment
follow-up search now keys only on legal names from tied records. Expected
effect: namesake records stop drowning short- and common-named vendors in
both directions — false identity credit and false dissolution warnings
both disappear — while true records gain a path to recognition under
their full legal names; vendors whose materials offer nothing to compare
against may see identity move to an honest "could not verify" rather than
credit from an unverifiable match.

**Identity survives third-party outages.** When the domain-registration
lookup (RDAP) is unavailable and identity needs a second identifier, the
pipeline now runs a direct mail-record lookup itself — one DNS query —
instead of relying on whether that check happened to have already run and
hit; working mail records take precedence over certificate-transparency
history, which is often unavailable and is never load-bearing. The
transparency-log row in the honesty panel now says the tool never relies
on it alone. Expected effect: fewer verdicts dropping to "not enough to
evaluate" because a lookup service had a bad minute; no change when
services are up.

**Research-discovered legal names re-feed the registry stage.** When no
registry record could be credited to the vendor but research retrieved a
fuller legal name from a registry-grade official source (SEC, SAM.gov, a
state registry's data service, OpenCorporates, GLEIF), the registry lanes
now run again under that name — previously the registry stage ran once,
before research, with no feedback loop, so a company whose brand differs
from its legal name could sit at "not enough to evaluate" while the
answer sat in the run's own citations. The bridge accepts names only from
an allowlist of official record hosts, requires the name to share a root
with the vendor's own, never displaces results the first sweep found, and
adjudicates re-found records under the same attribution rules. The report
states the discovered name, its source, and asks the buyer to confirm.
Expected effect: vendors operating under a brand name gain identity
resolution from their true records; nothing changes for vendors whose
records were already found.

**A terminated foreign registration is information, not a dissolution.**
End-of-registration words now carry a class: "Dissolved," "Revoked," and
"Forfeited" mean the company ended; "Terminated," "Surrendered," and
"Withdrawn" on a registration outside the entity's home state mean it
ended its authority to do business in that one state — routine
record-keeping that previously produced a High warning. The state lanes
now read the home-state signals their datasets already carry
(Connecticut's citizenship flag, Colorado's entity type and formation
jurisdiction, New York's entity type), and a foreign withdrawal renders
as a record-only informational row that names the record and asks which
legal entity would sign a contract today. A domestic withdrawal, and
every dissolution-class designation, keeps full treatment. Expected
effect: companies that once registered in a state and later left it stop
carrying a warning for the housekeeping; true dissolutions are untouched.

**SEC full-text hits are anchored to the filing company.** A full-text
result now counts only when the FILING COMPANY's name matches the vendor
under the same matcher every registry lane uses: same normalization,
containment in both directions, the under-four-character exact-only rule,
and investment-vehicle rejection. Previously the EDGAR lane kept its own
looser matcher, so a short name like "17A" could earn similarity credit
from an unrelated registrant, and passages of other companies' filings
containing the name could read as corroboration. Searches whose text hits
all belong to unmatched filers now report a definitive miss that records
the noise count. Expected effect: short-named and common-word vendors stop
earning federal corroboration from other companies' filings; correctly
matched vendors are unaffected.

## Version 1.4 (August 31, 2026)

**Match confidence now gates favorable credit.** A registry record that
merely resembles the vendor's name could previously mint identity, earn
federal-award green flags, and clear the startup calibration bar; a live
check of a short-named firm collected another company's awards as a green
row. Now identity resolution and identity-class credit count only exact
matches, similarity matches appear as labeled candidate rows with the
listed entity's actual name, compliance-registry listings found under a
similar name carry the label into the row and green flag, and names under
four characters match only exactly. Expected effect: short and common-name
vendors lose credit they never earned, which can lower a tier that was
manufactured by a collision; correctly matched vendors are unaffected.

**Dissolved registrations now surface.** The New York lane queries the
Department of State's public inquiry service, which covers all entity
statuses, with the active-corporations open dataset as its fallback. An
affirmative end-of-registration designation ("Voluntarily Dissolved") on an
exact match produces a record row and a Critical finding (High when the
record is not the entity's home-state registration), stated strictly as
what the record shows. Previously the lane read an active-only dataset and
dissolved entities were structurally invisible.

**ADV-04 no longer caps the verdict.** Only the injection-class findings
(hidden text, machine-directed text, invisible characters), which exist
only in material the submitter authored, cap at Tier 2. ADV-04 reads the
open web, ordinary press-release syndication looks identical to planted
coverage (a real vendor was capped by wire reprints), and a cap third
parties could trigger would hand outsiders a lever over any vendor's
verdict. The scan also now excludes any passage that appears in
wire-carried text, wherever it was reprinted. The cap rationale no longer
asserts intent. Expected effect: name-only checks of well-covered vendors
stop landing at Tier 2 on syndication artifacts.

**Identity survives lookup outages.** The domain registration check retries
once, and when the lookup service is unavailable (never when it shows the
domain unregistered), certificate transparency history or working mail
records can stand in as the second identifier alongside a registry record.
A verdict no longer drops multiple tiers because a third-party lookup had
a bad minute.

**Titles are attributed, statuses are exact, and coverage notes are
code-written.** Person surfaces say who described a title ("described in
the pitch as CEO") and add a dated note when independent coverage discusses
a change in that role. Registry-status rows and green flags carry the exact
listed status level ("Progressing," "Provisional") in code-templated copy.
The identity note for runs where some registries were unreachable names
only the registries that ran. Domain-age rows on claim-less submissions say
no history claims were made. URL submissions bind to the submitted domain,
not a domain named in the page text. Extraction retries once on a failed or
empty parse of a non-trivial pitch, and quoted claims can no longer match
inside a longer number in the source (a truncated "0%" can no longer stand
in for "40%").

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

**Also in 1.3: coverage made legible in the results.** Real identity
coverage is national for venture-funded companies, because SEC EDGAR's
full-text search runs nationwide, and the results now say so where people
actually read: the identity clean-miss note leads with EDGAR's national
coverage and now names EDGAR only when that search actually ran; the EDGAR
check joins the identity miss row's own source list; the honesty panel
explains that the EDGAR search is national; the EDGAR progress line says
nationwide; and the landing page answers which parts of the country the
tool can search. Copy consistently says five automated state registries,
with Florida described as a manual check until its bulk-data mirror ships.

**Expected effect on verdicts: none.** Tier logic is untouched. The same
contradictions that moved verdicts before still move them; the new rows make
them visible in the ledger, and the coverage copy changes how results read,
not how they are decided.

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
