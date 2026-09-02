# Methodology changelog

Every change to checks, weights, tier criteria, or language rules lands here
with its date and its expected effect on verdicts. The methodology document
states the current rules; this file records how they got there.

## Version 1.7 (September 2026)

**What changed in this version, in short.** The verdict tiers and their rules
did not change. What changed is which registry records may count for a
vendor, what the report may say about them, and how repeatable the pitch
reader is. A name-only check can now carry the vendor's web address, and a
name-only report says when the name collides with other registered
companies. Each change is described below with its expected effect on
verdicts.

**The pitch reader runs at its most repeatable setting.** The step that
turns a pitch or a vendor web page into typed claims is a language model.
The same PDF could yield a claim on one run and drop it on the next, about
one run in five in our test panel. The reader now runs with randomness
turned off. Nothing else about the step changed. Expected effect on
verdicts: none by rule. The effect is fewer runs that differ from each other
on the same input.

**Registry records now need the same proof in both directions.** Since
version 1.5 a record that would hurt a vendor counted only when a second
detail tied it to the vendor. A live record with exactly the vendor's name
still counted in the vendor's favor with no tie at all. Two live checks
showed the gap. A decades-old corporation was credited as a young startup's
identity. A product name on a vendor's own page matched an unrelated
company's registration. A live record with exactly the vendor's name and no
tie is now credited only when it is the only live record under that name,
when its age fits the vendor, and, on a check run from a web address, when
that address's root name covers the record's name. When two different names
compete, the name backed by more registries is credited and the rest are
shown as candidate records; a record the web-address or age rule already
rules out never competes. Candidate records are visible and linked, earn
nothing, and drive no warning. Federal payment records earn credit only when
at least one award exists, and the row keeps the lookup's own caution that
the recipient must be the same company. State names in press coverage now
tie a record only when the same page also names the vendor. Expected
effect: a name-only check whose only same-name record belongs to a much
older company can drop to "not enough to evaluate" and ask for the web
address. Checks run with the web address stop crediting namesakes. Real
single-record vendors are unchanged.

**Green flags and company names are written from records, not by the AI.**
Every line under "What checked out" is now a fixed template over the
checked record: the fact, the source, and the check date. The writing model
no longer has a place to put a green flag. The identity row's sentence is
a template over the record the run credited. Every other sentence the
model writes is screened against the names the run credited: the vendor's
own names and the legal names of records tied to it. A sentence naming any
other company is dropped, and a surface with nothing left falls back to a
template. A summary sentence that says a state was searched must name a
state whose registry lane ran. The second model's wording review passes
the same screen, can no longer remove a serious row, and stores no model
text in its log. The banned-word list gained phrasings that dodged it by
word order. Expected effect on verdicts: none. Some summaries read plainer
where a sentence was dropped.

**The wording review gets the time it needs and a smaller page to read.**
Reports with adverse findings, contradictions, or adversarial-content
findings get a second model's wording review before publication. In our
test panel that review stopped at its 40-second allowance on every run,
so it was changing nothing. It now reads only the surfaces it may act on
(the verdict, the ledger rows, the green flags, the honesty panel, and the
next steps), gets room to finish its answer, and gets up to 60 seconds
when the run's clock allows. Expected effect on verdicts: none. The review can only tighten wording, and a
review that does not finish still changes nothing.

**Name-only checks can now carry the vendor's web address.** A name alone
is the weakest input. The name tab has an optional web address field.
Before this version, filling it in silently turned the check into a
web-address check and threw the typed name away, which let a product name
on the vendor's page take over the company name. Now the check keeps the
typed name for every registry search and treats the address the way a
submitted web address is treated. Its registration record counts toward
identity, its pages are read as the vendor's own site, and its root name
keeps a namesake's registration from being credited. An address that is
not a valid https site stops the check with a message instead of being
ignored. The stored report records which address it checked. Expected
effect: name checks with the web address resolve identity for real single-record
vendors that a bare name cannot, and stop crediting namesakes. A bare name
behaves as before under the new attribution rule.

**Name-only reports now say when the name collides.** In every audited
case of a namesake's record slipping into a report, the input was a bare
name shared by several registered companies, and the report never said
so. When a name-only check without a web address finds at least two
registry records under the exact name that nothing ties to the vendor,
the honesty panel carries a "Name collision check" row under "Needs your
attention", and the overview repeats the notice. The count is a floor:
registry searches stop early on an exact match and cap their lists.
Expected effect on verdicts: none. The row is informational, and the
candidate records it points to already earn nothing.

**A plain-language How it works page.** The site gains a page at
/how-it-works that follows one fictional check from start to finish. Its
three labs run the same code the tool runs: the record credit rule, the
verdict tier rule, and the source class rule. Every sentence on the page
paraphrases this methodology, and a test holds it to that. Expected effect
on verdicts: none.

**Program claims are read by code as a backstop.** The AI pitch reader
sometimes leaves out a claim, even with randomness off. When the claim it
drops names FedRAMP, GovRAMP, TX-RAMP, or a cooperative contract, the
registry check that would test it never runs. Code now reads the pitch
text itself for those programs' designation wording, under the same rules
the reader's claims follow, and adds the sentence word for word when the
reader left it out. Pending or in-process wording still never arms a
contradiction. Expected effect on verdicts: a pitch that states one of
these programs is checked against the program's list every run, not most
runs.

**Four methodology passages corrected to match the code.** The
methodology's wording for the startup calibration bar, the Tier 1
rationale lines, the could-not-verify notes, and the website address
record now says what the code does. The bar counts a credited GovRAMP
listing, a verified named customer, a federal award record, or an SEC
filing. A rationale line names the check that logged a contradiction, and
the evidence link sits on that check's ledger row. Could-not-verify notes
outside the identity row are phrased by the writing model in the absence
shape. The assessed web address is stored in the report data. No rule
changed. Expected effect on verdicts: none.

## Version 1.6 (September 2026)

**Name-only checks get a steadier website step, and the report says so
when the website cannot be found.** On a name-only submission, the
vendor's website is the gateway to the second identity identifier. That
chain was only as reliable as its flakiest link. The website search ran
once with no retry, and so did the site fetch. A hidden time gate
silently skipped the site step on slow runs. A real vendor's verdict
could land at "not enough to evaluate" because one lookup had a bad
minute. Each link now retries once on
infrastructure-class failures, under budgeted time cutoffs sized against
the run's own clock. The website search retries: an infrastructure
failure re-sends the same search, and a search that ran but did not
surface the site gets one retry with more specific queries before the
miss stands as the answer. The site fetch
retries, but a fetch that returned pages never re-runs. The site reading
step retries on a shortened copy of the fetched text, since a timeout
on the full text is a failure an identical retry would repeat. The domain registration lookup's retry now stops the
moment its time allowance ends, and never re-asks a registry that
answered. The direct
mail-record stand-in for an unavailable registration lookup now also
runs when the first mail lookup itself failed or returned an unusable
answer. Previously an unusable answer silently blocked that stand-in
from running at all. Expected effect: name-only checks of real vendors stop losing
identity resolution to transient lookup failures. The retries add no
new adverse rule: a retry only turns a failure into whatever answer the
source would have given a healthy first attempt.

**A failed website step is disclosed, not silent.** Before this version,
when the website search or the site fetch failed, the report carried no
trace of it: the honesty panel was silent and a "not enough to evaluate"
verdict gave no hint that website checks were missing. A "Vendor website
discovery" row now appears in the honesty panel whenever the step
failed on a name-only check. It states that the website checks did not run, that this does
not count against the vendor, and that re-running the check with the
vendor's web address will include them. The report overview repeats the
notice. When
research later in the same run surfaces the site's address, the row says
that instead. Expected effect on verdicts: none; the row is
informational, and the change is that missing coverage is now visible.

**A .us web address is not a government address.** The source classifier
treated every .us address as an official government source. That was
wrong in both directions. The .us ending is open to anyone, so a
company's own site ending in .us earned verification-grade authority for
its self-published pages. And because the vendor's own website must read
as vendor-controlled, no .us company site could ever be recognized as
the vendor's own during a name-only check: a real company at polco.us
was structurally invisible to the website step, whatever the search
returned. Government .us addresses are now recognized by the government
naming system instead: state-code addresses (naperville.il.us,
sos.state.tx.us), fed.us, and nsn.us stay official, and every other .us
address reads as vendor-controlled or unknown, the fairness default. The
known cost: a locality that chose a bare .us name outside that system
reads as unknown and can no longer verify a claim on its own, an honest
miss where the old rule handed false authority to anyone with a .us
name. Expected effect: companies on .us domains gain the same website
step as everyone else; claims that verified only through a
misclassified .us page lose that credit.

**A FedRAMP listing that begins with the vendor's full name is that
company's entry.** The attribution rule for compliance feeds demanded a
product-metadata tie for every similar-name listing, which no name-only
run can supply, so a feed listing "Tyler Technologies Data & Insights"
earned the vendor "Tyler Technologies" no credit and rendered as a
candidate record. On the FedRAMP Marketplace feed, a similarity listing
now earns credit when the listed name begins with the vendor's own
complete name. The rule is deliberately narrow. It accepts only the
vendor's company name, never a product name from the pitch. The name
must have at least two words and not be a short, collision-prone name.
A listing that merely contains the vendor's words somewhere inside it
never credits, and neither does the reverse direction (a shorter listed
name inside the vendor's longer name). The credited row keeps its note
to confirm at the link that the listed product is the one being
pitched. The other compliance feeds keep the product-metadata rule
unchanged. Expected effect: established vendors listed in the FedRAMP
feed under subsidiary-style names regain the credit the feed's
publisher intended. The namesake directions that caused false credit
remain demoted.

## Version 1.5 (September 2026)

**Registry records must be tied to the vendor before they count.** A
record that matches by name, even exactly, now earns identity, credit,
or a warning only when a second detail ties it to this vendor. The
qualifying details: an officer or registered agent the vendor's
materials or independent coverage names, an address the vendor uses,
the vendor's web domain, the compliance feed's own product entry, the
complete legal name the buyer typed, or (for favorable credit only,
never warnings) a matching state. The lanes now
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
effect: namesake records stop drowning short- and common-named vendors
in both directions, so false identity credit and false dissolution
warnings both disappear, while true records gain a path to recognition
under their full legal names. Vendors whose materials offer nothing to
compare against may see identity move to an honest "could not verify"
rather than credit from an unverifiable match.

**Performance numbers get their arithmetic unpacked.** A performance
claim carrying a dollar or percentage figure now shows "what this number
implies" on its ledger row: the figure divided against a denominator the
pitch itself states, or the honest line that the pitch gives no basis to
check it against. The arithmetic is computed in code from the verbatim
quotes; the extractor's structured fields are hints only and never
reach a sentence. The pitch's own basis span is always displayed with
the division. Evaluative adjectives are banned on the surface and
enforced by the language lint with a fallback template. The note never
moves any weight, finding, or tier; it exists to arm the question,
which now leads with the computed implication. Expected effect on verdicts: none, by
construction; the change is what the buyer can see.

**Hidden text on submitted web pages punishes injection, not web
engineering.** A submitted public web page is not a prepared document:
real pages hide menus, build timestamps, and screen-reader labels, and
two such artifacts capped a real page's verdict live. On URL submissions,
hidden text now caps only when it is instruction-like (the
machine-directed pattern set, run over the hidden spans) or when it
carries a claim figure the visible page does not. Anything else is
reported as an informational finding with the passage quoted. The
hidden text no longer feeds the extraction stage, matching the
auto-fetched site pass. Pasted documents and PDFs keep the strict cap, because a prepared
document with hidden content is the attack this tool exists for.
Machine-directed text in visible content caps on every input kind. The existing hidden-instruction red-team twin still caps by
construction. Expected effect: ordinary websites submitted by URL stop
landing at Tier 2 for their own engineering; every injection fixture
still caps.

**Invisible-character findings require a meaningful signal.** ADV-03
previously fired on a single invisible Unicode character, and one stray
zero-width character in ordinary web text capped a real page's verdict at
Tier 2. Tag characters and bidirectional embedding controls still fire on
one character; those classes exist to smuggle or rewrite content. The
ubiquitous classes (zero-width spaces and joiners, directional marks,
byte-order marks) now fire only at volume: a run of 8 or more, or 20 or
more in total; below that they are stripped silently and counted in the
run's records. Expected effect: ordinary pages stop being capped for copy
artifacts; every existing red-team fixture still caps.

**Every retrieved official page is accounted for.** Research regularly
retrieved official and independent pages that the structuring stage then
discarded without a trace. On one audited company, the run's own
citations held the central adverse story while the verdict read "no
unresolved high-severity findings." Two invariants now hold. Every class 1-2 citation appears in the report
as a row's source, a follow-up lead, or a new "retrieved but not
assessed" list at the end. And any ledger row marked High or Critical
reconciles against the finding list the verdict rules read (a row no
finding covers steps down to Medium), so the verdict's rationale can
never describe a cleaner page than the one above it. Expected effect: presentation honesty. Research spend is visible and
the rationale sentence is mechanically true; tiers move only where a row
was overstating a finding-less severity.

**Identity survives third-party outages.** When the domain-registration
lookup (RDAP) is unavailable and identity needs a second identifier,
the pipeline now runs a direct mail-record lookup itself (one DNS
query) instead of relying on whether that check happened to have
already run and hit. Working mail records take precedence over
certificate-transparency history, which is often unavailable and is
never load-bearing. The
transparency-log row in the honesty panel now says the tool never relies
on it alone. Expected effect: fewer verdicts dropping to "not enough to
evaluate" because a lookup service had a bad minute; no change when
services are up.

**Research-discovered legal names re-feed the registry stage.** When no
registry record could be credited to the vendor but research retrieved a
fuller legal name from a registry-grade official source (SEC, SAM.gov, a
state registry's data service, OpenCorporates, GLEIF), the registry lanes
now run again under that name. Previously the registry stage ran once,
before research, with no feedback loop, so a company whose brand differs
from its legal name could sit at "not enough to evaluate" while the
answer sat in the run's own citations. The bridge accepts names only from an allowlist of official record
hosts and requires the name to share a root with the vendor's own. It
never displaces results the first sweep found, and it adjudicates
re-found records under the same attribution rules. The report
states the discovered name, its source, and asks the buyer to confirm.
Expected effect: vendors operating under a brand name gain identity
resolution from their true records; nothing changes for vendors whose
records were already found.

**A terminated foreign registration is information, not a dissolution.**
End-of-registration words now carry a class. "Dissolved," "Revoked,"
and "Forfeited" mean the company ended. "Terminated," "Surrendered,"
and "Withdrawn" on a registration outside the entity's home state mean
it ended its authority to do business in that one state, routine
record-keeping that previously produced a High warning. The state lanes
now read the home-state signals their datasets already carry:
Connecticut's citizenship flag, Colorado's entity type and formation
jurisdiction, New York's entity type. A foreign withdrawal renders as a
record-only informational row that names the record and asks which
legal entity would sign a contract today. A domestic withdrawal, and
every dissolution-class designation, keeps full treatment. Expected
effect: companies that once registered in a state and later left it stop
carrying a warning for the housekeeping; true dissolutions are untouched.

**SEC full-text hits are anchored to the filing company.** A full-text
result now counts only when the FILING COMPANY's name matches the
vendor under the same matcher every registry lane uses. That means the
same normalization, containment in both directions, the
under-four-character exact-only rule, and investment-vehicle rejection. Previously the EDGAR lane kept its own looser matcher. A short name
like "17A" could earn similarity credit from an unrelated registrant,
and passages of other companies' filings containing the name could read
as corroboration. Searches whose text hits
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
