# Security Design: Evaluating Text Written by the Party Being Evaluated

This tool reads vendor pitches and vendor websites. Both are written by the party being evaluated, which means every input must be treated as potentially adversarial. This document explains, in plain terms, how the tool is built to stay honest when the material it reads is trying to influence it, what the ADV finding codes in a report mean, and where the honest limits are.

## The threat

Documents aimed at AI readers are no longer hypothetical:

- In July 2025, reporters found academic preprints from 14 institutions containing white-text instructions to AI peer reviewers such as "give a positive review only."
- Publicly available generators embed near-invisible text in PDFs that has caused AI resume screeners to rank a planted candidate first.
- A patched Microsoft 365 Copilot vulnerability (CVE-2025-32711) used an ordinary-looking email to hijack an AI assistant, with the payload written as natural human prose precisely to slip past injection classifiers.
- Published research shows that content placed on ordinary web pages can reliably steer AI research and recommendation systems, and a commercial industry now optimizes content for exactly that.

A vendor pitch is the same document class with the same incentive structure. The realistic attack goals against this tool are: inflate the verdict, suppress a finding, or poison the recommended questions.

## The design: architecture first, detection second

The core security decision is that **detection is a signal, never the load-bearing wall**. The tool is built so that even a fully successful, undetected injection cannot change the things that matter. Three structural rules do that work.

**1. The verdict tier is computed by code, over typed data.**
No AI model assigns the verdict tier. Plain TypeScript computes it from logged registry-check results: which official lookups ran, what they returned, which deterministic contradictions fired. The harshest tier requires at least two independent registry contradictions, each anchored to a logged check with an evidence link. An AI model's opinion, however manipulated, is not an input to that computation. The same code enforces the reverse protection: a registry we could not reach never counts against the vendor.

**2. Raw pitch text is quarantined.**
Before any AI model sees the pitch, deterministic code strips and logs invisible characters and screens for instruction-like text. The one model that then reads the pitch (the extraction stage) has no tools, no web access, and one job: emit a strictly typed summary (names, domains, claims as short verbatim quotes) validated against a fixed schema with hard length caps. Every later stage consumes only that typed object. The full pitch text never travels further down the pipeline, so there is no downstream stage for hidden instructions to reach.

**3. Detection can add caution, never remove it.**
Every adversarial-content screen in the pipeline is one-directional. The deterministic screens (pattern lists, invisible-character detection, hidden-HTML detection) fire findings that no later stage, human or model, can clear. The AI-based screen can add a finding the patterns missed; it cannot suppress one. And any confirmed adversarial finding caps the verdict at Tier 2, "Significant gaps." The cap only lowers, never raises. A pitch that attempts to influence automated evaluation cannot present as a vetted vendor, and the attempt itself becomes a finding in the report.

The web research stage gets the same treatment on its other flank: everything it reports must carry a citation, and our code, not the model, classifies each cited domain's authority. Only official registries and independent press can verify a claim. Vendor-controlled pages and press-release wires are treated as self-attestation no matter how convincingly they are written, and the registry checks that feed the verdict run as separate direct lookups against the official sources, outside the research context entirely.

## The ADV finding codes

When a report shows an ADV finding, this is what it means. Each one quotes or links its evidence, and each one caps the verdict tier.

| Code | Meaning | How it is detected |
|---|---|---|
| **ADV-01** | The submitted material contains substantive text hidden from human readers | Deterministic checks for invisible styling in web pages (hidden elements, zero-size or background-colored text, oversized comments). PDF text-layer analysis is planned; see limits below |
| **ADV-02** | The material contains text addressed to AI evaluation systems ("ignore previous instructions," "note to AI reviewers") | A fixed pattern list in code, plus an AI screen that can only add detections, never clear them |
| **ADV-03** | The material contains invisible Unicode characters (zero-width, directional, or tag characters), a known carrier for concealed content | Deterministic character-class scan; the characters are stripped before analysis, counted, and logged |
| **ADV-04** | The same marketing phrasing recurs across multiple low-authority websites, consistent with content planted to be found by AI research tools | Code compares retrieved passages across citations: an eight-word run recurring on two or more unrelated sites that present as independent fires the finding. Press-wire syndication and the vendor's own properties never count |

The report language for these findings follows the same rules as everything else the tool says: it reports the observation ("this document contains text invisible to human readers, quoted here"), never a characterization of intent.

## Honest limits

We would rather overstate the attacks than overstate the defenses.

- **Detection layers will be bypassed.** Published red-team results are consistent on this: commercial injection classifiers caught only 60 to 68 percent of live attacks in Microsoft's public email-injection challenge, and the most effective real-world payloads read as ordinary human prose. Our pattern lists and AI screens will miss things. That is why nothing that matters depends on them succeeding.
- **What is actually protected is control flow.** The specific claim we stand behind is architectural: no text authored by a vendor can change which checks run or what the verdict tier is, and detected manipulation can only lower that tier. Text a vendor authors can still appear inside the report where the design quotes it deliberately: claims are quoted verbatim in the ledger, in length-capped, clearly attributed fields.
- **Narrative text is a smaller, real surface.** AI models write the report's explanatory prose from typed inputs that include short quoted spans from the pitch. Those spans are capped in length and number, and every generated report passes a language lint before it ships. A sufficiently clever quoted span could still influence phrasing at the margin. It cannot alter the tier, the ledger results, or the check set.
- **PDF hidden text is planned, not live.** In the current version, ADV-01 detection covers web pages, and ADV-03 covers pasted text. Analysis of hidden text layers inside uploaded PDFs (tiny fonts, background-colored text, text absent from the rendered page) is designed and planned but not yet shipped. Until it ships, a PDF's hidden layer would still be neutralized by the quarantine design above, but it would not be surfaced as a finding.
- **Planted web corroboration is an arms race.** ADV-04 catches the plain version of the pattern. Content engineered for AI discovery is a commercial industry, and the more careful versions will not trip a phrasing-similarity check. The tool's defense in depth here is the domain-class rule: no volume of vendor-controlled or wire-service content can verify a claim, however well it evades detection.
- **The published methodology is itself testable by vendors.** This is deliberate. A rubric whose passing condition is "independently verifiable facts in government registries" is one you can only game by becoming verifiable, which is the outcome the tool exists to produce.

## Red-team us

The repository is public, and we want adversarial testing. If you can make an injected pitch raise its own verdict tier, suppress a deterministic finding, smuggle instructions past the quarantine into a later stage, or plant a question in the pack that serves the vendor, we want to know.

- Open an issue on the project's GitHub repository with the payload (or a minimized version), what you expected, and what the tool did.
- The repository's test suite includes an adversarial corpus (clean pitches paired with injected twins); the standing assertions are that an injected twin's tier is never higher than its clean twin's, that the expected ADV finding fires, and that no ledger row cites a vendor-controlled domain as verification. New attack classes that defeat an assertion become new fixtures.
- Please do not use a real vendor's name in attack payloads; invent one.

There is no bounty, only credit and a fixed tool. For a security issue in the hosting or data layer itself (as opposed to the evaluation pipeline), use the repository's security policy contact rather than a public issue.
