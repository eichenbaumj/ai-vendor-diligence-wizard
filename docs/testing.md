# How this tool is tested

The tool's value rests on one thing: when it says it checked something, that
check really ran, and the result really holds. This page describes the three
layers of testing that protect that promise. The code for all three is in
this repository.

## Layer 1: unit tests

Every rule that computes a verdict lives in plain code, and every rule has
tests. The suite covers the tier logic, each registry parser, the language
rules, the evidence merge rules, and the report assembly. It runs on every
change, costs nothing, and touches no live systems.

## Layer 2: the static red-team suite

The pitch text a vendor sends is treated as hostile input. The red-team
suite keeps matched pairs of fixtures: a clean pitch, and the same pitch
with one attack payload added (hidden text, instructions aimed at the AI,
or an invisible note). The tests hold one line: an attack can only lower
a verdict, never raise it. A pitch that tries to manipulate the evaluation
is capped at Tier 2 and the attempt is shown in the report.

## Layer 3: the live QA panel

Unit tests cannot catch a live problem: a registry feed that changed shape,
a search step that quietly stopped finding things, a deep check that fell
back to a standard one. So the tool is also tested end to end, against the
real deployed pipeline, on a fixed panel of vendors with known expected
results.

The public part of that panel is in `tests/qa/panel/`. Every vendor in it
is fictional, built to exercise one known path: a control with fabricated
certification claims that must always land at Tier 1, an unverifiable
pitch that must land at Tier 0, and injected twins that must always trip
the adversarial checks.

Expected results are bands, not exact numbers. Research-dependent results
vary a little from run to run, because the public web varies. What must
never vary is held as a hard rule: the fabricated-claims control can never
score well, an injected pitch can never outscore its clean twin, and a
deep check must really run deep. Everything else is tracked as drift and
reviewed by a person.

## Why no real companies appear in this repository

The panel also includes real vendors, checked against their real public
records. Those files are not in the repository, on purpose. This tool's
own first rule is that absence of evidence is never proof, and a published
file of expected scores for real companies would break that rule in
spirit: it would be a standing public claim about them. So the machinery
is public, the method is public, and the expectations about real
companies stay private, where they can be corrected quietly when the
record changes. They live in a gitignored private directory, and a unit
test fails the suite if any of those files ever becomes tracked.

## Running it

`npm test` runs layers 1 and 2. The live panel runs from
`scripts/qa-harness.ts` and spends real research budget, so it is run by
a person, on a schedule, not by automation on every change. See
`scripts/validate-qa-panel.ts` for the panel file rules.
