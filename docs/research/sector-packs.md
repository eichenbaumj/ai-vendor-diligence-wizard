# Sector Pack System Specification — AI Vendor Diligence Wizard

**Version:** 1.0 draft (2026-08-28)
**Status:** Ready for repo import as `/packs/` content + `/docs/pack-spec.md`
**Authors:** 17A, with New America New Practice Lab and Center for Civic Futures
**Grounding:** Synthesized exclusively from the five commissioned research reports (call center, document processing, eligibility/case management, public comms + productivity + analytics, competitive landscape, procurement frameworks). Vendor-reported metrics are flagged `[vendor-reported]` throughout; oversight-sourced findings are flagged `[oversight]`.

---

# Part 1 — Sector Pack Schema

Every pack is a single structured file (`/packs/<pack-id>.yaml` with markdown-valued fields) validated by CI against this schema. Fields marked ★ are rendered directly into user-facing output; unmarked fields drive matching and internal logic.

| # | Field | Type | Definition & authoring rules |
|---|---|---|---|
| 1 | `pack_id` | slug | Stable identifier. Never reused after retirement. |
| 2 | `pack_name` ★ | string | Plain-language name a program officer recognizes ("Call Center & Phone AI"). |
| 3 | `definition` ★ | markdown, ≤120 words | What the category IS, in the buyer's language, plus what it is NOT (explicit boundary with adjacent packs). |
| 4 | `inclusion_test` | list of yes/no questions | 3–6 questions the classifier (and a human) can answer from the pitch artifact alone. Pitch matches if ANY answer is yes. Each question maps to detectable pitch language (see Part 3). |
| 5 | `scrutiny_tier` | enum: `standard` \| `elevated` | `elevated` changes output behavior: strongest caution band available, mandatory legal-context block, overlay behavior (Part 3.4). |
| 6 | `incumbent_landscape` ★ | markdown, ≤300 words | Who actually sells this to SLG, structured in layers (platforms / integrators / startups). Must answer the buyer's first question: "is this vendor even in the real market map?" |
| 7 | `established_vendors` ★ | list of `{name, one_liner, tier, gov_evidence_url}` | Named vendors with a verifiable SLG or federal footprint. `tier` ∈ {platform, integrator, specialist, startup-verified}. Presence here is NOT an endorsement — the tool never recommends; it is a "this name is a known quantity" signal. A vendor with no verified government deployment never appears here. |
| 8 | `failure_modes` ★ | list of `{title, description, named_incident, source_url}` | Category-specific ways deployments go wrong. Every failure mode MUST cite at least one named incident or oversight finding — no hypotheticals. |
| 9 | `skepticism_triggers` ★ | list of `{claim_pattern, threshold, why, source_url}` | Claims that flip the output toward caution, each with a numeric or categorical threshold ("containment ≥80%") and the evidence-based reason. These feed the pitch-scanner regexes/classifier. |
| 10 | `diligence_questions` ★ | ordered list of 10–15 `{question, good_answer, red_flag, source_url}` | Copy-paste-ready questions a non-technical officer can send verbatim, each with the tell for a good vs. disqualifying answer. Question 1 is always the highest-yield discriminator for the category. |
| 11 | `elevated_scrutiny_rules` | list of `{condition, action}` | Machine-readable rules that bump scrutiny within the pack (e.g., "pitch claims outbound synthetic-voice calling → add TCPA/FCC 24-17 block"). Present in every pack, even `standard` ones. |
| 12 | `reference_deployments` ★ | list of `{agency, vendor_stack, what, metric, metric_source_type, source_url}` | Named government deployments the user can cite back to vendors as benchmarks. `metric_source_type` ∈ {oversight, independent-press, government-page, vendor-reported}. Vendor-reported metrics render with an inline caveat badge. |
| 13 | `registries_to_check` | list of `{name, url, what_it_proves}` | Category-relevant automated checks (FedRAMP Marketplace, GovRAMP APL, GovAI Trellis registry, Pavilion Contract Hub, CT/NY public AI inventories, Procurated, CCF AI Knowledge Hub). |
| 14 | `legal_context` ★ | markdown | Laws/rulings/memos the output should surface for this category (rendered prominently for `elevated` packs, collapsed for `standard`). Every item date-stamped; items with uncertain current status carry a `verify_before_citing: true` flag. |
| 15 | `realistic_pricing` ★ | markdown | Published price anchors and "if the quote is 10x this, ask why" heuristics. Links to live pricing pages rather than hard-coding volatile numbers where the research flagged volatility. |
| 16 | `last_updated` | ISO date | Date of last substantive review (not typo fixes). |
| 17 | `refresh_cadence` | enum | `quarterly` (default) or `monthly` (fast-moving packs). Rendered in output: "This guidance was last reviewed on {date}." |
| 18 | `known_gaps` | markdown | Honest list of what this pack could not verify (rendered to maintainers, and summarized to users as "what this tool doesn't know"). Operationalizes the project's uncertainty-handling standard. |

**Schema invariants (CI-enforced):**
- Every `named_incident`, `reference_deployments` row, and `skepticism_triggers` row has ≥1 URL.
- Vendor-reported metrics must carry `metric_source_type: vendor-reported`.
- `diligence_questions` length between 10 and 15.
- `last_updated` older than 2× `refresh_cadence` fails CI (forces review or explicit waiver).
- No pack may contain purchase-recommendation language ("best," "leading choice," "we recommend buying"). A lint rule scans for it.

---

# Part 2 — Draft V1 Pack Content

## PACK 1: `call-center` — Call Center & Phone AI

**scrutiny_tier:** standard (with overlay rules — see below)
**refresh_cadence:** quarterly · **last_updated:** 2026-08-28

### Definition
AI that answers, routes, or assists resident phone and chat contact: virtual agents/IVR bots, voice AI, agent-assist and after-call summarization, and the cloud contact-center (CCaaS) platforms they run on. **Not** this pack: website-only chatbots with no contact-center function (→ `public-comms`), and anything that determines eligibility or flags fraud from a call (→ `eligibility-case-mgmt` overlay).

### Inclusion test
1. Does the pitch mention phone calls, IVR, voice agents, hold times, call deflection/containment, or contact-center agents?
2. Does it target 311, benefits hotlines, unemployment lines, DMV, or "resident support"?
3. Does it offer agent-assist, call summarization, or transcription for call-center staff?
4. Does it name a CCaaS platform (Amazon Connect, Genesys, NICE, Five9, Talkdesk) as its base?

### Incumbent landscape
Three layers, and the first triage step is establishing which layer the sender occupies. **Layer 1 — platforms:** AWS (Amazon Connect), Google Cloud (Customer Engagement Suite, ex-"Contact Center AI"), Genesys, NICE, Five9, Talkdesk, Salesforce Agentforce, ServiceNow, Verint/SoundHound — all with real, named SLG deployments. **Layer 2 — integrators/BPOs who actually deliver most state deployments:** Deloitte (TrueServe on AWS), Accenture (TWC "Larry"), Quantiphi/Presidio/Cisco (Illinois IDES), Smartronix (WV), C1 Gov (NYC DSS), Maximus. When a platform pitches, ask who delivers; when an integrator pitches, ask which platform — the accountability split is where deployments fail. **Layer 3 — startups:** govtech-native (Polimorphic, Citibot) with named local-gov customers, versus commercial AI-agent startups (Sierra, Decagon, Parloa, PolyAI, Replicant) with **no publicly verified U.S. SLG customers as of Aug 2026** — "government-proven" from this cohort is unverified until they name an agency you can call.

### Established vendors
| Vendor | Tier | One-liner + evidence |
|---|---|---|
| AWS Amazon Connect | platform | Consumption-priced CCaaS; deepest SLG roster (KY Transportation, SC DSS, NM HSD, Atlanta 311, Tamarac FL, AZ MVD, Workforce WV) — https://aws.amazon.com/products/connect/customer/slg/ |
| Google Cloud Customer Engagement Suite | platform | Gemini-based virtual agents; Illinois IDES (https://cloud.google.com/customers/state-of-illinois), Minnesota DVS, Colorado CDLE |
| Genesys Cloud CX | platform | FedRAMP Moderate (https://www.genesys.com/company/newsroom/announcements/122908); large legacy gov base; public list pricing useful for quote benchmarking (https://www.genesys.com/pricing) |
| NICE CXone | platform | San Diego County access center, NYC DSS via C1 Gov (https://www.nice.com/industries/government) [vendor-reported metrics] |
| Five9 | platform | NJ 211 statewide network (https://www.five9.com/resources/case-study-nj-2-1-1); 50-seat minimum |
| Talkdesk | platform | Full FedRAMP authorization (https://www.talkdesk.com/news-and-press/press-releases/fedramp-authorization/); fewer named SLG references |
| Salesforce Agentforce | platform | City of Kyle, TX — resolution time 4.37→2.41 days across 12,000+ requests (https://statetechmagazine.com/article/2025/08/kyle-texas-uses-ai-expedite-citizen-service-delivery) |
| ServiceNow | platform | Missouri DSS (Route Fifty, May 21, 2026); ID.me/Servos benefits-modernization partnership (PR Newswire, Jun 23, 2026) |
| Deloitte / Accenture / Maximus / C1 Gov / Smartronix / Quantiphi | integrator | Delivery layer for most state deployments (sources in landscape above) |
| Polimorphic | startup-verified | Local-gov AI chat + phone agents; $18.6M Series A; Pacifica CA, Tooele County UT, Polk County NC, Palm Beach FL (https://www.govtech.com/biz/polimorphic-raises-18-6m-as-it-beefs-up-public-sector-ai) |
| Verint / SoundHound (Amelia) | specialist | Coral Springs FL; USCIS "Emma" lineage (Federal Times, Nov 16, 2015) |

### Failure modes
1. **Hallucinated benefit/legal guidance on an official line** — NYC MyCity told businesses to break the law (https://themarkup.org/artificial-intelligence/2024/03/29/nycs-ai-chatbot-tells-businesses-to-break-the-law); Air Canada was held liable for its bot's invented policy — the org owns everything its bot says (https://www.cbsnews.com/news/aircanada-chatbot-discount-customer/); even Cursor's own support bot invented policy (Ars Technica, Apr 17, 2025).
2. **Missing/buried human escalation** — Klarna publicly reversed its "AI replaced 700 agents" posture and rehired humans (Forbes, May 18, 2025). For crisis/LEP/low-digital-literacy callers, a no-exit bot is a due-process problem.
3. **Containment inflation via definition games** — abandons, IVR menu completions, and "caller didn't reply" counted as "contained." Gartner's own bullish case is 80% of *common* issues by *2029* (https://www.gartner.com/en/newsroom/press-releases/2025-03-05-gartner-predicts-agentic-ai-will-autonomously-resolve-80-percent-of-common-customer-service-issues-without-human-intervention-by-2029).
4. **Per-resolution pricing games** — Intercom's $0.99 "outcome" includes a customer who simply goes silent (https://www.intercom.com/pricing); Gartner predicts GenAI cost-per-resolution exceeds offshore human cost by 2030 (Gartner PR, Jan 26, 2026); pricing-model churn (Salesforce Jun 2026, HubSpot Apr 2026) means no multi-year per-resolution commitment without a resolution-definition audit right.
5. **Language-access failures shipped without native-speaker QA** — Washington state removed an AI voice after Spanish callers got Spanish-accented *English* (StateScoop, Feb 27, 2026).
6. **Voice cloning/disclosure exposure** — FCC 24-17: AI voices are "artificial" under TCPA; outbound use needs prior express consent (https://docs.fcc.gov/public/attachments/FCC-24-17A1.pdf); FBI warnings on official-voice cloning (NPR, Jul 9, 2025).
7. **Platform swap ≠ program fix** — California's billion-dollar EDDNext hasn't resolved fraud/debt problems (KQED, Dec 4, 2024).

### Skepticism triggers (claim → threshold → why)
- **Containment/deflection claim ≥80%** (voice: ≥40–50% is already suspect) → Gartner's optimistic forecast is 80% of *common* issues by 2029; documented gov reality: Tamarac 20% full self-service (https://aws.amazon.com/blogs/publicsector/how-the-city-of-tamarac-transformed-resident-experience-with-amazon-connect/); WV's ~90% came from a narrow scripted FAQ surge line.
- **"99%+ accuracy" / "never hallucinates"** → any accuracy claim without a test-set methodology; NYC and Cursor show well-resourced deployers still ship wrong-answer bots.
- **"Replaces N agents" or named dollar savings** → Illinois's "$100M/yr savings" was an initial vendor-story estimate, not audited; Klarna reversed.
- **"Deploy in days" + "integrated"** → contradiction. Days is true only for scripted FAQ bots (TWC Larry: 5 days; WV: 72 hours, both 2020 surge). Claim-status/eligibility integration takes months.
- **Per-resolution price <$1 or undefined "resolution"** → silence billing (Intercom); demand contractual resolution definition + audit right.
- **"FedRAMP/StateRAMP compliant"** → "compliant" ≠ "authorized"; verify the *product* at https://marketplace.fedramp.gov/ and the GovRAMP APL; a vendor still saying "StateRAMP" doesn't know it became GovRAMP in Feb 2025.
- **"Supports 75+ languages"** → MT coverage ≠ language access; ask which languages have native-speaker QA (Minnesota's 4-language community-informed model is the honest benchmark).
- **"No integration required"** → means FAQ-only; cannot answer "where's my payment," which is most benefits-line volume.
- **"Indistinguishable from a human voice"** → a liability (FCC 24-17, state bot-disclosure laws, Colorado AI Act effective Jun 30, 2026), not a feature.
- **"Government-proven" with no named agency** → applies with force to Sierra/Decagon/Parloa/PolyAI/Replicant-class pitches.

### Diligence questions (send verbatim)
1. **Metric definition:** "Show the exact formula for the containment/resolution rate you quoted. Do abandons, IVR completions, transfers, or 7-day callbacks count? Give the same metric for your three most comparable government clients at 90 days and 12 months."
2. **Callable references:** "Name three government agencies of comparable volume and program type in production today, with contacts who will confirm your deck's metrics." (Refusal is disqualifying — every credible vendor here has named references.)
3. **Escalation:** "Every path to a human: what happens when a caller says 'agent' on turn one? After two failed answers? At 2 a.m.? Is transfer warm — does the agent see transcript and collected data?"
4. **Grounding:** "Is the system restricted to content we approve, with source cited per answer? What does it do when the answer isn't there — guess, refuse, or escalate? What's the measured wrong-answer rate on a benefits test set, and can we run our own before award?"
5. **Liability:** "If the bot gives a claimant wrong information, what does the contract say? Correction SLAs and indemnification?" (Air Canada: the agency owns what its bot says.)
6. **Language access:** "Which languages, which channels, what human review? Is spoken Spanish actual Spanish QA'd by native speakers? Show the interpreter-handoff flow." (Cite Washington's Feb 2026 removal.)
7. **Integration:** "Have you integrated with our exact stack [IVR + CRM/eligibility system]? Name the client. Fixed-price? What does the bot read vs. write?"
8. **Authorization by product:** "Which FedRAMP or GovRAMP authorization does *this product* hold? Where are recordings/transcripts stored, retained how long, and is any of our data used to train models — yours or a subprocessor's?"
9. **Model transparency:** "Which LLM/ASR vendors are under the hood, hosted where? When the underlying model updates, how do you regression-test our flows before residents see the change?"
10. **Disclosure/consent:** "Does it disclose it's automated at the start? For outbound: how do you comply with FCC 24-17 (AI voices = artificial voices under TCPA)? State bot-disclosure laws and the Colorado AI Act (effective Jun 30, 2026)?"
11. **Pricing decomposition:** "Break the price into platform, per-minute/message usage, telco passthrough, AI metering, integration, support. What happens to our bill in a 10x claims surge? Minimums and overage rates?"
12. **Our data, our audits:** "Raw transcripts + dashboard covering containment, escalation, abandonment, wait time, per-intent accuracy? Can staff review any interaction? What's exported at contract end, format, cost?"
13. **Graceful failure:** "When your AI is down, what does a caller hear — a queue or a dead line? Uptime SLA and your last two incident postmortems."
14. **Agent-assist only:** "Can we buy after-call summarization alone, without a resident-facing bot? What accuracy review exists for auto-summaries written into our CRM?" (Lowest-risk entry point.)
15. **Staffing claims:** "If you project FTE savings, name the client where it happened and what happened to their quality metrics afterward." (Klarna.)

### Elevated-scrutiny rules
- Pitch claims the phone AI determines eligibility, changes claims, or flags fraud → apply `eligibility-case-mgmt` overlay (Part 3.4).
- Pitch proposes outbound AI-voice calling → mandatory TCPA/FCC 24-17 legal block.
- Pitch proposes synthetic human-like voice without disclosure → caution band floor raised one level.
- Sender is a commercial AI-agent startup (no SLG reference verifiable) claiming government traction → "could not verify" language required in output.

### Reference deployments (cite these back to vendors)
- **Illinois IDES** — Google CCAI via Quantiphi/Presidio on Cisco; 140K+ inquiries/day at peak; "$100M savings" is an unaudited initial estimate [vendor-reported] (https://cloud.google.com/customers/state-of-illinois)
- **Colorado CDLE** — phased Google virtual agent: FAQs first, then authenticated claim status; explicitly "cannot change your claim" — the design benchmark (https://cdle.colorado.gov/virtual-assistant-tips)
- **Texas TWC "Larry"** — Accenture+AWS, 5-day surge FAQ bot, 21M+ questions (https://www.dallasnews.com/business/jobs/2020/04/01/texas-launches-chatbot-named-larry-to-help-with-surge-in-unemployment-claims/)
- **Workforce West Virginia** — Amazon Connect via Smartronix in 72 hours; ~90% resolution on a narrow scripted surge line [vendor-reported] (https://aws.amazon.com/blogs/publicsector/accelerating-response-west-virginia-workforces-needs-cloud)
- **South Carolina DSS** — 19 contact centers on Amazon Connect [vendor-reported] (https://aws.amazon.com/blogs/publicsector/how-south-carolina-dss-modernized-19-contact-centers-to-improve-benefits-delivery-with-amazon-connect/)
- **NJ 211** — Five9, 110 multilingual agents (https://www.five9.com/resources/case-study-nj-2-1-1) [vendor-reported]
- **City of Tamarac, FL** — 20% of residents fully self-serve — the honest self-service anchor, from the vendor's own case study (https://aws.amazon.com/blogs/publicsector/how-the-city-of-tamarac-transformed-resident-experience-with-amazon-connect/)
- **Minnesota DVS** — Dialogflow chatbot in English/Spanish/Hmong/Somali, 87,813 conversations in 2023; languages chosen from caller demographics (https://statetechmagazine.com/article/2024/03/state-governments-deploy-contact-center-ai-bolster-customer-service)
- **Kentucky Transportation Cabinet** — 900K+ chatbot interactions/month [vendor-reported] (https://aws.amazon.com/solutions/case-studies/kentucky-transportation-case-study/)
- **City of Kyle, TX** — Agentforce; 12K+ requests, 4.37→2.41 days (independent press: https://statetechmagazine.com/article/2025/08/kyle-texas-uses-ai-expedite-citizen-service-delivery)
- **IRS voice bots** — federal design benchmark: "taxpayers can always speak with an English- or Spanish-speaking IRS telephone representative if needed" (https://www.irs.gov/newsroom/irs-expands-voice-bot-options-for-faster-service-less-wait-time)
- **Amarillo TX "Emma"; NYC DSS (NICE/C1 Gov); Atlanta 311; Coral Springs FL (Amelia)** — sources in landscape section.

### Registries to check
FedRAMP Marketplace (product-level), GovRAMP APL (https://govramp.org/), TX-RAMP, SAM.gov, NASPO ValuePoint, Carahsoft listings, GovAI Trellis registry, Pavilion AI Contract Hub, Procurated.

### Legal context
FCC 24-17 (AI voice = artificial voice, TCPA consent); California B.O.T. Act (SB 1001); Utah AI Policy Act disclosure; Colorado AI Act — access-to-government-services AI is high-risk — effective Jun 30, 2026 `[verify_before_citing]`; EO 14224 does not erase Title VI language-access obligations — a vendor citing it to skimp on language QA is a red flag; post-EO enforcement posture is unsettled.

### Realistic pricing
Per-seat CCaaS: Genesys $75–240/user/mo, Five9 from $119–159 (50-seat min), Talkdesk $85–225 (live pricing pages linked). Consumption: Amazon Connect $0.038/voice-min, $0.010/chat message (https://aws.amazon.com/connect/pricing/). Rule of thumb: at ~$0.04–0.10/min all-in, a 500K-call/yr line at 5 min/call ≈ $100K–250K/yr platform consumption before integration and telco — **a 10x quote means asking what layer the money is in.** Per-resolution: viable for digital FAQ traffic only, with contractual definition. Govtech startups: annual jurisdiction-tier subscriptions, commonly low five figures for small jurisdictions (uncertain; negotiate per-jurisdiction).

### Known gaps
Google Conversational Agents current pricing unfetched (confirm at quote time); Citibot customer list unverified (site blocks fetch); AWS/NICE/Five9/Polimorphic metrics are vendor-published; Title VI post-EO-14224 enforcement unsettled.

---

## PACK 2: `document-processing` — Document Processing & Intake (IDP)

**scrutiny_tier:** standard (with overlay rules)
**refresh_cadence:** quarterly · **last_updated:** 2026-08-28

### Definition
AI that classifies, extracts data from, redacts, or routes documents: mailroom automation, form/handwriting extraction, verification-document processing, and records redaction. **Not** this pack: systems that make eligibility decisions from extracted data (→ `eligibility-case-mgmt` overlay) or general document *drafting* (→ `staff-productivity`).

### Inclusion test
1. Does the pitch mention OCR, document extraction/classification, IDP, "digital mailroom," forms processing, or handwriting recognition?
2. Does it target document backlogs, verification documents, scanned mail/faxes, or records digitization?
3. Does it offer redaction of PII from records (court, land, personnel)?
4. Does it claim "automation rate," "straight-through processing," or per-page/per-document pricing?

### Incumbent landscape
Mature category being disrupted by LLM-native extraction. Gartner's first-ever IDP Magic Quadrant (Sep 3, 2025) covers a market of **100+ vendors** with five Leaders: **ABBYY, Hyperscience, Infrrd, Tungsten Automation, UiPath** (https://www.gartner.com/en/documents/6912666). Five tiers: (1) hyperscaler APIs — AWS Textract, Azure AI Document Intelligence, Google Document AI — usually arriving inside an integrator's pitch; (2) enterprise IDP platforms (the Leaders above, plus WorkFusion, IBM Datacap, OpenText Captiva, Grooper); (3) government redaction specialists (Extract Systems, CSI Intellidact); (4) ECM incumbents with AI add-ons (Laserfiche, Hyland OnBase, Tyler) — **check whether your existing ECM contract already includes capture/IDP before engaging a new vendor; many cold pitches duplicate owned capability**; (5) LLM-native startups (Extend, Reducto, Sensible, Instabase, LandingAI, Nanonets, Docsumo) — most inbound cold email comes from this tier, and few hold FedRAMP/GovRAMP authorizations or named U.S. state references. Core triage insight: many pitches are thin wrappers over the same three hyperscaler APIs — **ask what engine is actually under the hood.**

### Established vendors
| Vendor | Tier | One-liner + evidence |
|---|---|---|
| Hyperscience | platform | Gartner MQ Leader; FedRAMP High/IL5 claimed; SSA ($81M award), VA, Colorado HCPF, Missouri DSS; sells "Hypercell for SNAP" (https://www.hyperscience.ai/blog/united-states-social-security-administration-adopts-hyperscience/) — also the pack's exhibit for sole-source-coaching red flags |
| ABBYY | platform | 7x Everest Leader; California DMV digital mailroom, 65–70% automation (https://statetechmagazine.com/article/2025/04/state-and-local-agencies-deploy-artificial-intelligence-document-processing) |
| Tungsten Automation (ex-Kofax) | platform | FedRAMP High + GovRAMP Authorized (TotalAgility Cloud); claims 350+ U.S. agency customers (https://www.carahsoft.com/tungsten-automation) [vendor-reported count] |
| UiPath / Infrrd / WorkFusion / HCLTech | platform | Analyst-ranked Leaders (Gartner MQ / Everest PEAK 2025) |
| AWS Textract | platform-API | Per-page extraction in GovCloud; Covered-workloads caveat: service-improvement data use requires org-level opt-out (https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_ai-opt-out.html) |
| Microsoft Azure AI Document Intelligence | platform-API | 24-hour deletion, no training on inputs (https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/document-intelligence/data-privacy-security) |
| Google Document AI | platform-API | FedRAMP High, HIPAA, no training on customer content (https://docs.cloud.google.com/document-ai/docs/data-usage); Covered California, Hawaii Safe Travels |
| Extract Systems (ID Shield) | specialist | County recorder/court redaction; Pierce County WA (36M+ images), Hamilton County OH (https://www.extractsystems.com/gov-resources) [vendor-reported] |
| CSI Intellidact | specialist | Statewide Arkansas Judiciary redaction contract (https://arcourts.gov/administration/acap/redactioncontract) [government contract page] |

### Failure modes
1. **Benchmark-vs-production accuracy gap** — buyers report a 15–25pp drop from vendor benchmark to production on their own document mix; character accuracy presented as field accuracy (99% character can equal ~80% field) (https://airparser.com/blog/ai-document-extraction-accuracy-benchmarks/). Compounding math: 97% per-field on a 20-field doc → only ~55% of documents error-free. Real oversight datapoint: VA OIG found **27% of reviewed automation-assisted claims had inaccurate determinations** [oversight] (https://www.vaoig.gov/reports/review/improvements-needed-vbas-claims-automation-project).
2. **STP/automation-rate inflation** — vendors blur automation rate, STP rate, and accuracy. Independent government results run 65–84% (CA DMV, Covered California) — and those are *good* (https://statetechmagazine.com/article/2025/04/state-and-local-agencies-deploy-artificial-intelligence-document-processing).
3. **Per-page pricing surprises** — feature stacking: Textract Forms+Tables+Queries = $0.070/page, ~47x plain OCR (https://aws.amazon.com/textract/pricing/); Google Form Parser/Custom Extractor 20x plain OCR (https://cloud.google.com/document-ai/pricing). Watch page-per-side counting, reprocessing billed again, undisclosed minimums.
4. **Hidden human-review costs** — at an honest 80% STP on 1M pages/yr, 200K exception pages ≈ 3+ FTEs of review labor, plus per-review fees (AWS A2I $0.03/page — https://aws.amazon.com/augmented-ai/pricing/). Best practice budgets review permanently: King County's "no production without a human reviewer" (StateTech, Apr 2025).
5. **PII handling/retention divergence** — AWS default allows service-improvement use absent opt-out; Azure deletes in 24h; Google doesn't train. A startup wrapper calling a commercial LLM adds an unvetted second processor. Benefits documents implicate IRS Pub 1075, HIPAA, SNAP confidentiality.
6. **Redaction's asymmetric risk** — a missed SSN is a disclosure incident; recall must be reported separately from precision (King County's 96% still implies human QA on the residual).
7. **Procurement-pressure red flags** — Hyperscience's SNAP 4-pager coaches agencies on sole-source justification ("unique, non-substitutable") in a 100+-vendor field (https://aphsa.org/wp-content/uploads/2026/04/251029-Hyperscience-SNAP_4-Pager.pdf); TIGTA flagged non-competitive IRS Zero Paper awards [oversight] (https://www.tigta.gov/sites/default/files/reports/2026-02/2026408003fr.pdf).

### Skepticism triggers
- **Accuracy ≥98% without field-level definition + document mix** → benchmark-production gap; character/field conflation.
- **STP promise >90% before a pilot on your documents** → real gov results 65–84%; 70–90% is the clean-docs ceiling.
- **"No human review required" / "fully autonomous"** → any such claim, at any accuracy; mature agencies mandate review.
- **Handwriting claim ≥97% without stated character-error rate** → 3–5% CER is *good* for handwriting (https://www.llamaindex.ai/blog/ocr-accuracy).
- **"Only solution on the market" / sole-source coaching** → 100+ vendors, 5 Gartner Leaders; even market leaders make this claim in writing.
- **Simple per-page rate with no feature/review/minimum breakdown** → full extraction is 20–47x plain OCR; review adds fees + FTEs.
- **ROI multiples (615%, 167%) without your volumes and baseline labor cost** → sourced to vendor-commissioned studies (IDC for Hyperscience).
- **"Deployed in 45 days" for eligibility-system integration (<90 days)** → vendor's own FAQ concedes timelines vary; IRS missed a multi-year digitization goal [oversight].
- **Redaction "success rate" as one number** → demand separate recall (miss rate).
- **No written data-retention/no-training commitment** → provider defaults differ sharply; verify GovRAMP/FedRAMP listing independently.
- **All-federal or logos-only references** → named state/local references exist across this category; their absence is diagnostic.

### Diligence questions
1. **"What field-level accuracy do you achieve on documents like ours — and will you demonstrate it in a pilot on 250–1,000 of our real documents, including faxes, phone photos, and handwriting?"** Red flag: one blended "99%" or public-benchmark scores.
2. **"Is that character, field, or document accuracy? Define the denominator."**
3. **"What STP rate do your government customers achieve in production, and how do you define STP?"** Anchors: Covered California 84%, CA DMV 65–70%.
4. **"Show the human review workflow: how do confidence scores route low-confidence fields, who staffs the queue, and what does that labor cost at our volume?"** Red flag: "no human review needed."
5. **"If we sample 100 fields you marked ≥90% confidence, how many will be wrong?"** >10 signals miscalibration.
6. **"All-in price per 1,000 pages at our real volume — API/license, feature add-ons, review tooling, integration, reprocessing — and what counts as a 'page'?"**
7. **"Where is our data processed and stored, is it used to train your or any third party's models, and what is the deletion timeline? In writing."** Anchors: Azure 24h/no-training; Google no-training; AWS requires explicit opt-out.
8. **"Which underlying OCR/extraction engine or foundation model do you use, and which subprocessors touch our documents?"** Separates platforms from wrappers.
9. **"Which authorizations do you hold — FedRAMP (level), GovRAMP, SOC 2 Type II — and can you support IRS Pub 1075 / HIPAA / SNAP confidentiality as applicable?"** Verify on the marketplaces, not the vendor's word.
10. **"For redaction: precision AND recall separately. What percentage of PII do you miss, and what QA catches misses before records go public?"**
11. **"Three government references at agencies our size, in production 12+ months — including one where rollout was hard."** "References are confidential" is a red flag; SSA, VA, Colorado HCPF, Missouri DSS, CA DMV, Covered California, King County, Arkansas courts all exist.
12. **"What per-document audit trail exists — model version, confidence, every human touch — exportable for QC and IG staff? What happens when document formats drift?"** (GAO-26-109137 names opacity as the accountability risk [oversight].)
13. **"Exit terms: can we export our trained models, templates, and labeled data at contract end, at what cost?"**
14. **"Which languages do you support, as a named list matched to our LEP population — not an adjective?"**

### Elevated-scrutiny rules
- Extracted data feeds an eligibility/benefit determination or fraud flag → `eligibility-case-mgmt` overlay.
- Pitch involves redaction of records for public release → require recall-reporting question (Q10) in output; raise caution if vendor gives a single "success rate."
- Pitch coaches sole-source/bid-waiver justification → flag prominently regardless of vendor size.
- Documents contain FTI/HIPAA/immigration data → data-handling questions (Q7, Q9) become mandatory-answer items.

### Reference deployments
- **SSA + Hyperscience/Accenture Federal** — $81M award, ~250M docs/yr (contract award is public record) (https://www.hyperscience.ai/blog/united-states-social-security-administration-adopts-hyperscience/)
- **VA VBA + Hyperscience** — claim sorting ~10 days → ~half a day (GAO-corroborated [oversight]: https://www.gao.gov/products/gao-26-109137); the same program's hypertension-claims automation had 27% error rate per VA OIG — cite both halves together
- **Colorado HCPF + Hyperscience** — SNAP/MAGI renewal surge (700–1,000% image-volume growth); 99.2%/99.4% figures [vendor-reported]; ACT-IAC award is third-party corroboration (https://www.hyperscience.ai/resource/state-department-of-healthcare-policy-financing-automates-snap-and-magi-documents/)
- **Missouri DSS + Hyperscience** — SNAP/MAGI docs [vendor-reported] (https://aphsa.org/wp-content/uploads/2026/04/251029-Hyperscience-SNAP_4-Pager.pdf)
- **California DMV + ABBYY** — 65–70% automation (independent press: https://statetechmagazine.com/article/2025/04/state-and-local-agencies-deploy-artificial-intelligence-document-processing)
- **Covered California + Google Document AI** — 84% verification rate, ~10,000 people-hours freed year one (independent press, same URL)
- **King County, WA + Textract** — redaction 96% success, 30 min → <5 sec/doc, with explicit no-production-without-reviewer policy (same URL)
- **Hawaii + Google Document AI** — 25,000+ docs/day, Safe Travels (https://cloud.google.com/blog/topics/public-sector/document-ai-government-makes-it-easier-process-documents-and-deliver-better-constituent-services) [vendor blog, named official]
- **Arkansas Judiciary + CSI Intellidact** — statewide court redaction (https://arcourts.gov/administration/acap/redactioncontract)
- **IRS Paperless Processing** — cautionary: missed 2025 goal, in-house system stopped, non-competitive award concerns [oversight] (https://www.tigta.gov/sites/default/files/reports/2026-02/2026408003fr.pdf)

### Registries / Legal / Pricing / Gaps
Registries: GovRAMP APL, FedRAMP Marketplace, GovAI Trellis, Pavilion. Legal: IRS Pub 1075 (FTI), HIPAA, SNAP confidentiality (7 CFR), state breach laws; Title VI for LEP document handling. Pricing anchors: plain OCR ~$1.50/1,000 pages at every hyperscaler; full extraction $30–70/1,000; A2I review $30/1,000 reviewed + labor; 1M pages/yr at full-feature Textract ≈ $70K/yr API fees before SI markup — link live pricing pages (Azure list prices conflicted across sources; do not hard-code). Gaps: Instabase/Reducto/Extend gov-reference claims unverified; Azure exact list prices uncertain.

---

## PACK 3: `eligibility-case-mgmt` — Eligibility, Benefits Processing & Case Management ⚠️ ELEVATED SCRUTINY

**scrutiny_tier:** ELEVATED (also functions as an overlay on all other packs — Part 3.4)
**refresh_cadence:** monthly · **last_updated:** 2026-08-28

### Definition
AI that touches who gets benefits or what happens to their case: eligibility screening/determination, renewals, verification, fraud detection/identity-proofing, case-management copilots, benefit-notice generation, and work-requirement compliance tooling. This is the only pack where a software error is, by legal definition, a **deprivation of a constitutionally protected property interest** (*Goldberg v. Kelly*, 397 U.S. 254 — https://www.law.cornell.edu/supremecourt/text/397/254). **Not** this pack alone: pure document extraction (→ `document-processing`, unless output feeds determinations) or applicant-side benefit screeners that only widen access (different risk class; note in output).

### Inclusion test
1. Does the pitch mention eligibility, determinations, enrollment, renewals/recertification, benefits processing, or case management for Medicaid/SNAP/TANF/UI/child care/child welfare?
2. Does it mention fraud detection, program integrity, identity verification, or "payment accuracy" for a benefits program?
3. Does it mention work-requirement / community-engagement verification or exemption screening (2026 OBBBA build-out wave)?
4. Does it offer caseworker copilots, case summarization, or benefit-notice drafting?
5. Does ANY other-pack pitch describe outputs that could deny, reduce, terminate, or flag a person's benefits? (→ overlay trigger)

### Why elevated (drop-in copy, rendered atop every output in this pack)
> **Why this category is different.** When AI touches who gets Medicaid, SNAP, unemployment, or child care assistance, errors are not inconveniences — they are unlawful deprivations. Courts have already ruled against automated benefits systems in Michigan ($20M false-fraud settlement; auto-adjudicated fraud findings wrong more than 90% of the time), Tennessee (due process + ADA violations), Arkansas and Idaho (invalidated care-cutting algorithms), and Australia's Robodebt collapsed into a royal commission. Federal policy (OMB M-25-21) presumes AI used in benefits adjudication and fraud detection is "high-impact," requiring testing, human oversight, and appeals — and several states now require meaningful human review by law. This tool therefore applies its strictest evidence bar here: any vendor claiming to automate or accelerate adverse decisions (denials, reductions, terminations, fraud flags) is flagged for enhanced review regardless of company size or references. AI that helps staff read documents, summarize cases, and draft communications — with a named human making every decision, appeal-ready explanations, and audit trails — can be evaluated on its merits. **AI that decides is not a product category this tool will ever mark low-risk.**

### Incumbent landscape
**Integrators/COTS:** Deloitte dominates integrated eligibility (25+ states, $5B+ contracts, ~53M Medicaid enrollees — https://kffhealthnews.org/news/article/medicaid-deloitte-run-eligibility-systems-plagued-by-errors/); Accenture, Gainwell, Conduent, Optum in the MMIS ecosystem; Maximus as dominant eligibility-support BPO now marketing AI; Merative Cúram (ex-IBM) as the social-program COTS; Salesforce/ServiceNow pushing case-management-on-platform; RedMane, Diona, Northwoods in human-services-specific tooling. **Critical context:** the incumbents' *deterministic* systems — before any generative AI — produced wrong notices, impossible deadlines, 25,000 erroneous Kentucky terminations, and 2026 Michigan disability miscoverage (https://www.npr.org/2026/07/20/nx-s1-5896359/medicaid-disabled-patients-denied-deloitte-michigan); Deloitte's defense ("they're not Deloitte systems") shows accountability allocation is contested even among the biggest incumbents. **The legitimate near-term AI layer:** document/intake automation (Hyperscience in CO/MO; PA legibility scanning, NJ document validation, NC summarization per Code for America — https://codeforamerica.org/explore/government-ai-landscape-assessment/). **The 2025–26 copilot wave:** Nava PBC (most methodologically transparent: open-source Caseworker Empowerment Toolkit, published guardrails — https://www.navapbc.com/insights), Maryland+Anthropic navigation agent, Augintel, and frontier-lab GSA OneGov seats putting near-free LLMs inside agencies — AI increasingly arrives through staff tooling, not procurement. **Highest-risk adjacent lane:** fraud/identity vendors (SAS and FAST Enterprises in the MiDAS era; Pondera/Thomson Reuters; LexisNexis; ID.me) — treat any "AI fraud detection" pitch as an adverse-action system, full stop.

### Established vendors
Deloitte, Accenture, Gainwell, Conduent, Optum, Maximus, Merative Cúram, Salesforce, ServiceNow, RedMane, Northwoods, Hyperscience, Nava PBC (sources above). **Listing here is emphatically not a safety signal in this pack** — the incumbents ARE the cautionary tales; the pack renders the KFF/NPR record beside any incumbent match.

### Failure modes (the adjudicated record)
1. **Michigan MiDAS** — auto-adjudicated UI fraud with no human review; state audit: wrong **>90%** of the time; ~40K accusations, garnishments, bankruptcies; $20M settlement; vendor-liability claims proceeded against SAS/FAST in *Cahoo* (https://www.michigan.gov/ag/news/press-releases/2022/10/20/som-settlement-of-civil-rights-class-action-alleging-false-accusations-of-unemployment-fraud; https://www.btah.org/case-study/michigan-unemployment-insurance-false-fraud-determinations.html)
2. **Australia Robodebt** — A$1.76B unlawfully raised against ~433K people; Royal Commission (https://clcs.org.au/robodebt-royal-commission-report-unravels-systemic-injustice-and-recommends-urgent-reform/)
3. **Arkansas ARChoices** — algorithm replaced nurse discretion, slashed home-care hours, ignored cerebral palsy in its logic; permanently enjoined (https://arktimes.com/news/arkansas-reporter/2018/05/31/archoices-rule-blocked)
4. **Idaho *K.W. v. Armstrong*** — "trade secret" budget formula struck down as effectively arbitrary; 2025 contempt finding for delays (https://www.acluidaho.org/en/cases/kw-v-armstrong)
5. **Tennessee TEDS / *A.M.C. v. Smith*** — Deloitte-built $400M system; ~250K children lost coverage; federal court found Medicaid Act, Due Process, **and ADA** violations (https://healthlaw.org/resource/case-explainer-amc-v-smith/)
6. **Medicaid unwinding ex parte errors (2023)** — ~30 states ran renewals at household level; CMS forced reinstatement of ~500K people, mostly children `[verify_before_citing: primary CMS doc not re-fetched]`
7. **NYC MyCity** — confident hallucination of program rules on an official channel, contradictory answers to identical questions, left running for years (https://themarkup.org/artificial-intelligence/2024/03/29/nycs-ai-chatbot-tells-businesses-to-break-the-law)
8. **LLM-specific:** post-hoc rationalization ≠ appeal-safe explanation (a generated "reason" cannot honestly populate a 42 CFR 431.210 notice unless the decision logic is deterministic and cited); automation bias/rubber-stamping (nominal "human in the loop" at MiDAS/Robodebt scale); extraction errors propagating silently into denials; sycophancy toward caseworker fraud hypotheses; multilingual/disability performance gaps; rules-to-code translation errors (Beeck Center experiments: promising but error-prone — https://digitalgovernmenthub.org/library/ai-powered-rules-as-code-experiments-with-public-benefits-policy/).

### Skepticism triggers
- **"Fully automated eligibility determination" / "touchless processing"** → presumptively disqualifying for adverse actions (MiDAS/Robodebt pattern). Maps to the tool's strongest caution band regardless of vendor pedigree.
- **"Reduces fraud by X%"** → demand false-positive rate and what happens to flagged people while "under review"; MiDAS was >90% wrong.
- **"99%+ accuracy"** without state-specific eval, denominator, or breakouts by field/case, language, disability.
- **"Unbiased / bias-free AI"** → unfalsifiable; honest form is "here is our disparate-performance testing and results."
- **"Explainable AI" meaning a chatbot paragraph** → not a 42 CFR 431.210 notice; ask to see actual notice text.
- **"Proprietary — can't share how it works"** → *K.W. v. Armstrong*: due process outranks trade secrets.
- **"Deploy in weeks" touching the eligibility system** → ignores APD/CMS/FNS approval gates (45 CFR 95.611); Kentucky's single defect took 10 months and $522K to fix.
- **"Human in the loop" without numbers** → ask items-per-reviewer-per-day and override rates; near-zero overrides = rubber stamp.
- **"FedRAMP/StateRAMP compliant" vs. authorized; SOC 2 Type I passed off as Type II.**
- **"Trusted by [state]"** where reality is an unpaid pilot or a constituent-services chatbot rebranded as eligibility tech.
- **"AI will clear your backlog"** during unwinding/work-requirement crunches → speed pressure on adverse actions is precisely how Tennessee and Michigan happened.
- **"We handle appeals too"** → vendor adjudicating its own system's appeals is a due-process conflict.
- **Free pilots contingent on broad data access** → data-acquisition play; M-25-21 tells federal agencies to bar vendor training on government data.

### Diligence questions (13)
1. **"Does your system ever deny, reduce, terminate, or flag-for-fraud on its own — or does a named human make every adverse decision?"** Pass: unambiguous, with UI proof. Fail: "configurable," "auto-adjudication," hedging.
2. **"Show the exact notice a person receives after an AI-influenced denial. Does it state the specific factual reasons and the regulation relied on?"** Test against 42 CFR 431.210 / 7 CFR 273.13.
3. **"On appeal, can you produce the complete record — inputs, extractions, model version, what the human saw and did — and will you commit in contract that nothing is withheld as trade secret?"**
4. **"What is your measured accuracy on OUR state's rules — evaluated against our policy manual and historically adjudicated cases — and what's the denominator?"**
5. **"Break error rates out by language, disability status, age, and (where lawful) race/ethnicity. What disparate-performance testing exists, and will you support our own pre-deployment and annual testing?"**
6. **"What happens when the model is wrong but confident?"** Confidence-threshold design, share routed to humans, and sampling audits of *high-confidence* outputs.
7. **"Who updates the system when our state plan, waivers, or verification rules change — how fast, and how is the change tested?"** (NYC's bot stayed wrong for two years.)
8. **"Where does our data go? Is applicant data used to train models or shared with third parties? GovRAMP/FedRAMP, SOC 2 Type II, IRS Pub 1075/HIPAA compliance?"** Verify at https://marketplace.fedramp.gov/ and https://govramp.org/ — "in process" is not "authorized."
9. **"Does this require an APD amendment or CMS/FNS sign-off, and have you done that in other states?"** (45 CFR 95.611.) A vendor who has never heard of an APD has never really deployed here.
10. **"Name three comparable agencies in production — not pilots — we can call. What independent evaluations exist?"** Cross-check CCF AI Knowledge Hub and Code for America's landscape assessment.
11. **"What is the caseworker's realistic review burden — items per worker per day, and your own override-rate data?"**
12. **"What's your rollback plan? If we find a systematic error, how fast can we identify every affected case, notify people, and reinstate benefits?"** No answer = no deployment.
13. **"Who bears liability for wrongful denials caused by system error — and will you accept indemnification and audit-rights clauses?"** (Deloitte's "not our systems" posture shows why this must be contractual.)

### Elevated-scrutiny rules
- ANY match on this pack → output floor is the "enhanced review" band; "established vendor — proceed to demo" band unavailable without human-decides-adverse-actions confirmation.
- Claim of automated adverse action → strongest caution band, period.
- Fraud/identity pitch → classified as adverse-action system regardless of framing.
- Work-requirement/exemption-screening pitch (2026 wave) → highest caution band + OBBBA overload context (https://www.tpr.org/news/2026-07-21/deloitte-run-systems-denied-medicaid-to-disabled-people-new-laws-could-make-it-worse)
- Copilot/summarization-only pitch with named-human decision-making → may be evaluated on standard merits, with this pack's questions 1–3, 11 still included.
- **Overlay behavior:** when triggered from another pack, prepend the "Why this category is different" block and add questions 1, 2, 3, 12 to that pack's question list.

### Reference deployments (what responsible looks like)
- **Nava PBC** — caseworker-assist pilots with published guardrails (transparency, oversight prompts, intervention controls, plain-language explanations); open-source Caseworker Empowerment Toolkit, Apr 2026 (https://www.navapbc.com/insights)
- **Pennsylvania** — document legibility scanning at intake, scaled (https://codeforamerica.org/news/code-for-america-unveils-second-annual-government-ai-landscape-assessment/)
- **Maryland + Anthropic; New Jersey; Utah** — applicant navigation/assistant pilots (Code for America 2026 assessment)
- **Colorado HCPF + Hyperscience; Missouri DSS + Hyperscience** — intake automation with confidence-threshold human routing [vendor-reported] (see `document-processing`)
- **CCF Public Benefit Innovation Fund awardees (Dec 2025)** — APHSA/Nava multi-state SNAP-Medicaid work verification, MD DOL, NJ cross-program eligibility, MS SNAP, NM/OR benefit notices, plus a Vals AI SNAP GenAI benchmark (https://www.centerforcivicfutures.org/resources/center-for-civic-futures-and-partners-commit-8-5m-for-ai-solutions-that-improve-safety-net-program-delivery) — cite as the funded, evaluated alternative to cold-pitch adoption

### Legal context (rendered in full for this pack)
*Goldberg v. Kelly* / *Mathews v. Eldridge* (constitutional floor); 42 CFR 431.210 and 7 CFR 273.13 (notice content); *K.W. v. Armstrong* (no trade-secret shield); *A.M.C. v. Smith* (ADA liability); OMB M-25-21 (benefits adjudication, continued-eligibility determination, fraud detection = presumptively high-impact; mandatory pre-deployment testing, impact assessment, monitoring, trained human oversight with fail-safe, remedies/appeals — https://www.whitehouse.gov/wp-content/uploads/2025/02/M-25-21-Accelerating-Federal-Use-of-AI-through-Innovation-Governance-and-Public-Trust.pdf); NY LOADinG Act ("continued, operational and meaningful human review"); NY NYS-P24-001 ("Automated final decision systems are not permitted"); Texas TRAIGA (effective Jan 1, 2026) `[verify_before_citing]`; Colorado AI Act (delayed to Jun 30, 2026) `[verify_before_citing]`; 45 CFR 95.611 (APD approval gates); California SIMM 150 rates "service eligibility assessments for housing or income assistance" at least Moderate risk.

### Pricing / Gaps
No published price anchors exist for determination-adjacent AI; the honest guidance is that any pricing conversation is premature until questions 1–3 pass. Gaps: *Cahoo* final disposition not re-verified; ex parte CMS numbers not re-fetched; current fraud-vendor product claims not re-verified; Colorado AI Act 2026 amendment status uncertain.

---

## PACK 4: `public-comms` — Public Communications, Websites & Chatbots

**scrutiny_tier:** standard (with overlay rules)
**refresh_cadence:** quarterly · **last_updated:** 2026-08-28

### Definition
Resident-facing digital communications AI: website chatbots and AI search, notification/email platforms with AI features, real-time meeting interpretation, and machine translation of public content. **Not** this pack: phone/contact-center AI (→ `call-center`), or chatbots answering benefits-eligibility questions (→ overlay).

### Inclusion test
1. Does the pitch offer a website chatbot, AI site search, or "digital assistant" for residents?
2. Does it offer translation/interpretation of public content or meetings?
3. Does it offer resident notification, email, or engagement tooling with AI features?
4. Is the primary interface the agency's website or public meetings rather than the phone?

### Incumbent landscape
A crowded small-to-mid vendor field sells chatbots and AI search to cities and counties — K12 Insight, Apptegy, Element451, Citibot, Polimorphic, Tyler Technologies, Verint, with contract pricing spanning ~$5,600 basic to $759K+ enterprise (https://blogs.civiciq.com/2025/12/02/government-ai-chatbots-311-rfps-vendor-pricing-guide-2025/). **Granicus** is the communications incumbent (govDelivery: claimed 300M+ subscriber network [vendor-reported] plus a "Government Experience Agent" — https://granicus.com/products/govdelivery/). State-portal chatbots have a decade of history: Mississippi "Missi" (Tyler, 2017), Georgia DOL "George A.I." (Cisco; 2.5M+ users, agency-claimed 97% accuracy [unverified]), Massachusetts "Ask MA" (NeuroSoph; ~1.2M monthly users), Texas (Capgemini), Atlanta "Ava" (Zammo.ai), Vermont "ChatVT" with annual performance reviews (https://statescoop.com/government-ai-chatbots-state-local-websites-2024/). Translation: **Wordly** for live meeting interpretation (Santa Barbara CA, North Las Vegas NV — https://www.wordly.ai/city-council-translation); **New Jersey DOL + U.S. Digital Response** as the standout responsible MT deployment (https://www.usdigitalresponse.org/resources/how-new-jersey-is-using-generative-ai-to-scale-their-human-centered-approach-to-language-access).

### Established vendors
Granicus (incumbent comms platform), Tyler Technologies, Polimorphic (footnoted answers, gov-controlled sources [vendor claims]), Citibot (Cuyahoga County OH), Verint, Wordly (meeting interpretation), NeuroSoph (Ask MA), Zammo.ai (ATL311) — sources above.

### Failure modes
1. **Hallucinated official answers — NYC MyCity** — told businesses to break the law; "beta" disclaimer non-fix; ran ~2.5 years; shut down Feb 4, 2026 as "functionally unusable" after ~$600K build + ~$500K/yr maintenance (https://themarkup.org/artificial-intelligence/2026/01/30/mamdani-to-kill-the-nyc-ai-chatbot-we-caught-telling-businesses-to-break-the-law). Lesson: disclaimers don't fix illegal advice, and sunk cost keeps broken bots alive.
2. **The government is liable for its bot** — *Moffatt v. Air Canada*: a chatbot is not "a separate legal entity" (https://www.americanbar.org/groups/business_law/resources/business-law-today/2024-february/bc-tribunal-confirms-companies-remain-liable-information-provided-ai-chatbot/).
3. **MT quality collapse on exactly the languages LEP communities speak** — NCSC documents gender-bias errors, legal-terminology misinterpretation, hallucination, and sharp degradation on low-resource languages; recommends mandatory human review for anything with legal consequences (https://www.ncsc.org/sites/default/files/media/document/NCSC%20Machine%20Translation%20Guide_0.pdf). The Jul 2025 DOJ memo pushing AI translation raises the swap-out risk (https://www.nextgov.com/digital-government/2025/07/justice-pushes-agencies-use-ai-assisted-translations-when-offering-them-all/406776/).
4. **Scripted bots that can't answer** — Illinois "Dotty" answering a license-renewal question with irrelevant statistics; self-reported "accuracy" claims are undefined (accuracy on what test set, judged by whom?).
5. **Chat transcripts are public records with PII** — WA State Archives: prompts and outputs can both be public records (https://www.sos.wa.gov/sites/default/files/2025-02/advice-sheet-are-generative-ai-interactions-public-records-(june-2024).pdf).
6. **Hardening disclosure norms** — Utah SB 452, Maine LD 1727, California SB 243; 14+ new state chatbot laws in 2026 (https://fpf.org/blog/understanding-the-new-wave-of-chatbot-legislation-california-sb-243-and-beyond/).

### Skepticism triggers
- **Any accuracy claim without a defined test set and judge** (Georgia's "97%" is the archetype of undefined agency/vendor-reported accuracy).
- **"75+ languages"** → coverage ≠ quality; demand per-language measured quality and human review for legal/benefits/health content; NJ's honest benchmark is ONE language (Spanish, 95% of demand) at ~90% claimed accuracy with human review and plain-language-first.
- **"Answers any question about your city"** → unbounded scope is the MyCity failure; good bots are corpus-restricted with refusal behavior.
- **"Disclaimer covers you"** → it didn't cover NYC, and Air Canada's disclaimer argument lost.
- **Enterprise pricing >$100K for a corpus-bounded FAQ bot** → the documented market spans ~$5,600 to $759K+; demand the itemization for anything at the high end.
- **"Set and forget" content ingestion** → no stale-content SLA = wrong answers after every ordinance change.
- **No exportable transcripts** → public-records non-starter (WA archivist position).

### Diligence questions
1. **Grounding:** "Is every answer generated only from content we control? Show what the bot says when the answer isn't in that corpus — refuse and hand off, or improvise?" (MyCity improvised.)
2. **Citations:** "Does each answer link to the specific official source page?"
3. **Pre-launch adversarial testing:** "Will you run and share results on our top 100 real resident questions — including legally consequential ones (tenant rights, wages, deadlines) — before go-live? Who signs off on the answer key, our counsel or yours?"
4. **Freshness:** "When council changes an ordinance or fee, what is the update pipeline and SLA? Who is responsible for stale answers?"
5. **Liability:** "Given Moffatt v. Air Canada, what does your contract say about indemnification when the bot causes harm with wrong information?"
6. **Human handoff:** "At what point (topic, confidence, frustration, request) does the bot transfer to a person — and during what hours does that person exist?"
7. **Language quality:** "Which languages, with what *measured* quality per language? Human review for benefits/legal/health content? How do you handle low-resource languages where MT degrades?"
8. **Records:** "Are transcripts fully exportable for public-records compliance? What resident PII do you retain, for how long, and is any used for training?"
9. **Disclosure/accessibility:** "Does the bot clearly disclose it is AI (Utah SB 452 / Maine LD 1727 pattern; TRAIGA for Texas)? WCAG 2.1 AA?"
10. **Production metrics:** "What accuracy/containment metrics will you report monthly, how is 'accurate' defined and audited, and can we sample real transcripts?"
11. **Kill switch:** "How fast can we take down a wrong answer — or the whole bot — and what's the fallback experience?"
12. **References + churn:** "Three government customers our size, one live 12+ months — and has any government customer decommissioned the product, and why?"

### Elevated-scrutiny rules
- Bot will answer benefits/eligibility questions → `eligibility-case-mgmt` overlay (California SIMM 150 rates resident-facing chatbots at least Moderate risk).
- Bot delivers legally consequential content (tenant rights, wages, deadlines, permits) → require Q3 with counsel sign-off; raise caution one band.
- Translation of legal/benefits/health content without human review → NCSC mandatory-review flag.

### Reference deployments
Massachusetts "Ask MA" (~3.46M messages/mo across 22 services); Vermont "ChatVT" (annual performance reviews — the accountability model); NJ DOL + USDR translation (plain-language first, one language, human review, published training materials for state reuse); Wordly in Santa Barbara/North Las Vegas; Mississippi "Missi"; Maryland benefits-navigation agent (with overlay caveat). Cautionary: NYC MyCity (full arc above); Illinois "Dotty." Sources inline above.

### Registries / Legal / Pricing / Gaps
Registries: GovAI Trellis, Pavilion, Procurated, state AI inventories (CT statutory, NY §103-e). Legal: state chatbot-disclosure wave (UT/ME/CA), TRAIGA, WA archivist records position, WCAG/ADA, Title VI. Pricing: documented contract range ~$5,600–$759K+ (CivicIQ guide). Gaps: vendor accuracy figures all self-reported; Citibot claims unverified (fetch-blocked).

---

## PACK 5: `staff-productivity` — Staff Productivity & Back-Office AI

**scrutiny_tier:** standard
**refresh_cadence:** quarterly · **last_updated:** 2026-08-28

### Definition
AI that helps government staff work: writing/drafting assistants, enterprise copilots, meeting transcription/notetakers, internal search and summarization, and back-office workflow automation. **Not** this pack: anything resident-facing (→ `public-comms`/`call-center`) or feeding case decisions (→ `eligibility-case-mgmt` overlay).

### Inclusion test
1. Does the pitch offer drafting, summarization, email, or "productivity" assistance for staff?
2. Does it offer meeting recording, transcription, or AI notetaking?
3. Does it offer internal knowledge search or workflow automation for back-office functions (HR, finance, records)?
4. Is the user the employee, not the resident?

### Incumbent landscape — the near-free baseline
This pack's defining fact: **the incumbents are nearly free.** Microsoft 365 Copilot reached GCC (Dec 2024) and GCC High (Dec 3, 2025), with a GSA OneGov deal giving Copilot at no added cost for up to 12 months with M365 G5 (https://www.nextgov.com/acquisition/2025/12/microsoft-makes-copilot-available-secure-cloud-customers/409912/). GSA's Gemini OneGov agreement priced the Google bundle at $0.47/agency through Sep 30, 2026 (https://www.gsa.gov/about-gsa/newsroom/news-releases/gsa-google-announce-gemini-onegov-agreement-08212025); similar ~$1 offers exist for ChatGPT and Claude. (Uncertain whether SLG can ride OneGov terms — coverage is federal — but the pricing signal shapes the whole market.) Best-documented state deployment: **Pennsylvania's ChatGPT Enterprise pilot** (175 employees → 3,000+; ~95 min/day self-reported time savings — https://digitalgovernmenthub.org/library/lessons-from-pennsylvanias-generative-ai-pilot-with-chatgpt/); PA's approved-tool model (ChatGPT Enterprise + Copilot approved centrally, others case-by-case) is itself a triage pattern. Notetakers: Teams/Zoom/Meet bundled defaults vs. Otter.ai, Fireflies, Rev, Verbit standalones. **The triage question for any startup in this pack: what does this do that the Copilot/Gemini the jurisdiction already (nearly) owns does not — at a price that beats near-zero?**

### Established vendors
Microsoft (365 Copilot — GCC/GCC High tiers), Google (Gemini for Government/Workspace), OpenAI (ChatGPT Enterprise/Gov), Anthropic (Claude via GSA OneGov), Zoom/Otter.ai/Fireflies/Rev/Verbit (transcription). Cloud-tier map: commercial M365 for low-sensitivity, GCC for regulated state data, GCC High for CJIS-touching workloads (https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-licensing-gcc).

### Failure modes
1. **Public records & retention** — WA State Archivist: GenAI outputs used in government work are public records, prompts likely too; retention follows content/function; MRSC notes Copilot's activity history appears non-disableable and recommends contract terms requiring prompt/output export (https://mrsc.org/stay-informed/mrsc-insight/july-2024/public-records-and-ai).
2. **Notetaker consent litigation** — *Brewer v. Otter.ai* (four consolidated federal cases): bot recording without all-party consent; "the bot was visible" is not consent in all-party-consent states (CA, FL, IL, MD, MA, MT, NV, NH, PA, WA) (https://natlawreview.com/article/ai-notetaking-tools-under-fire-lessons-otterai-class-action-complaint). Government aggravators: closed/executive sessions, attorney-client, HR, juvenile/health matters.
3. **Shadow AI** — 69% of orgs suspect prohibited GenAI use (Gartner 2025); concrete incident: NSW contractor uploaded 12,000+ rows of flood-victim PII to a public AI tool (https://www.secondtalent.com/resources/shadow-ai-statistics/). A sanctioned tool is partly a defense — but only if its data terms are actually better.
4. **Oversharing via permission sprawl** — copilots surface everything the user technically can access; "the AI showed me the layoff spreadsheet" is an access-control failure the AI exposed. A readiness question, not just a vendor question.
5. **Cloud-tier mismatch** — commercial-cloud AI on CJIS/FTI-touching workloads is a compliance failure regardless of tool quality.

### Skepticism triggers
- **Any pitch that doesn't name what it beats in the (near-free) incumbent** → the beat-the-incumbent question is Q1 and is disqualifying if unanswered.
- **Self-reported time-savings ROI presented as measured** → PA's 95 min/day is participant-self-reported; demand methodology.
- **"FOIA-proof" or "records-exempt" claims** → WA archivist position: content/function governs; no tool makes records exempt.
- **Notetaker with no affirmative-consent mechanism** → *Brewer* litigation; all-party-consent states.
- **No verifiable-deletion or export path** → public-records and offboarding non-starter.
- **Per-seat pricing above incumbent-bundle cost without a named differentiator** → the incumbent baseline is ~$0–30/seat effective.

### Diligence questions
1. **Beat the incumbent:** "We already license (or can nearly-freely add) M365 Copilot / Gemini. What specifically does your product do that they don't — and what happens to that gap when their next wave ships?"
2. **Records export:** "Can our records officers search, retrieve, export, and verifiably delete every prompt, output, transcript, and summary you hold, in usable format, for a public-records request?"
3. **Retention controls:** "Can retention be set to match our schedules — and is there any content (chat history, telemetry, backups) we cannot control?"
4. **Training on our data:** "Contractually: is our data used to train your or any third party's models? Where does it reside? What happens at contract end?"
5. **Consent (notetakers):** "How does the tool obtain affirmative consent from every participant, including non-users and the public, in all-party-consent states? What's your exposure to Otter.ai-style litigation?"
6. **Session controls (notetakers):** "Can we technically block the tool from closed sessions, attorney-client calls, HR meetings, juvenile/health matters — or does it rely on staff remembering?"
7. **Compliance tier:** "FedRAMP level, GovRAMP, SOC 2 Type II, CJIS-compatibility — and in which cloud does our tenant run?"
8. **Accuracy accountability:** "Measured error rate for summaries/drafts, and what does the UI do to force human review (source-linking) before content becomes an official record?"
9. **Admin visibility:** "What usage logs do we get, and can we audit misuse without creating a workforce-surveillance problem?"
10. **ROI methodology:** "Are your time-savings claims self-reported user estimates (like PA's 95 min/day) or independently measured? Show the methodology."
11. **Offboarding:** "On termination, how do we get every record out, and how do you certify deletion?"
12. **References:** "Which government customers at our scale have completed a public-records request or litigation hold involving your product's outputs? What broke?"

### Elevated-scrutiny rules
- Tool will draft or summarize case files feeding benefit decisions → `eligibility-case-mgmt` overlay.
- Notetaker pitched for public/board meetings → consent + closed-session questions become mandatory; note Brewer litigation.
- Workload touches CJIS/FTI/HIPAA data → cloud-tier questions become pass/fail.

### Reference deployments
Pennsylvania ChatGPT Enterprise pilot (175→3,000+ staff; independent lessons-learned writeup — https://digitalgovernmenthub.org/library/lessons-from-pennsylvanias-generative-ai-pilot-with-chatgpt/); PA IDP: 80% reduction in illegible submissions, 700+ staff hours (Code for America); North Carolina staff summarization (Code for America); federal Copilot GCC High availability; NJ's state-approved AI Assistant model (Sensitive PII only in state-approved tools — https://nj.gov/it/docs/ps/25-OIT-001-State-of-New-Jersey-Guidance-on-Responsible-Use-of-Generative-AI.pdf).

### Registries / Legal / Pricing / Gaps
Legal: state public-records law (WA archivist advice sheets as the cleanest citable guidance), all-party-consent wiretap statutes, open-meetings acts, NJ 25-OIT-001, PA ITP, NY NYS-G25-002. Pricing: incumbent baseline near-zero via OneGov-era deals; startups must price against it. Gaps: SLG applicability of OneGov terms uncertain; no citable public-sector oversharing incident; House Copilot restriction and CA GenAI contract awards excluded as unverified.

---

## PACK 6: `data-analytics` — Data Analytics & Decision Support

**scrutiny_tier:** standard, **with the lowest overlay threshold of any pack** — this category's cautionary record is the deepest and most adjudicated in government AI
**refresh_cadence:** quarterly · **last_updated:** 2026-08-28

### Definition
AI/analytics that inform government decisions: dashboards and BI with AI layers, "ask your data" LLM interfaces, predictive analytics, risk scoring, fraud/program-integrity analytics, and assessment algorithms. The pack's first question is the fork: **decoration or decision?** A dashboard that describes is standard scrutiny; a score or flag that can trigger action against a person is an adverse-action system (→ overlay).

### Inclusion test
1. Does the pitch offer dashboards, BI, "insights," or an AI layer over agency data?
2. Does it offer predictive analytics, risk scores, prioritization, or "program integrity"/fraud analytics?
3. Does it offer assessment/allocation algorithms (care hours, screening scores, caseload prioritization)?
4. Does it offer an LLM "chat with your data" interface?

### Incumbent landscape
**BI/dashboards:** Power BI, Tableau, Esri/ArcGIS ubiquitous; government-specific: Tyler Data & Insights (ex-Socrata, FedRAMP-listed; NYC, Chicago, SF, LA, NY/IL/TX states — https://www.fedramp.gov/marketplace/products/SOCRATA/), OpenGov (AI budgeting/performance, Mar 2024), Polco "Polly," Zencity 360. **Fraud/integrity analytics:** LexisNexis Risk Solutions (UI, tax refund investigation), Thomson Reuters Pondera (FraudCaster for Medicaid/SNAP/UI/WIC/TANF — EPIC maintains a critical spotlight: https://epic.org/pondera-surveillance/), SAS (state UI fraud). **Assessment algorithms:** RUGs, SIS, Optum ARIA allocate care hours — the sub-category with the worst documented track record. The wizard should link the Benefits Tech Advocacy Hub case library (https://www.btah.org/case-studies.html) and the AI Incident Database (https://incidentdatabase.ai/) as the reference shelves for "has this category hurt people before."

### Established vendors
Tyler Data & Insights, OpenGov, Polco, Zencity (dashboards/engagement); Microsoft, Salesforce/Tableau, Esri (general BI); LexisNexis Risk, Thomson Reuters Pondera, SAS (integrity analytics — presence here signals "known quantity," and this pack renders their litigation-adjacent record beside any match).

### Failure modes
1. **Black-box scores driving decisions** — *K.W. v. Armstrong* (Idaho's "trade secret" formula collapsed in court, 2025 contempt finding); Arkansas RUGs invalidated; *State v. Loomis* cautions on trade-secret scores in consequential decisions (https://harvardlawreview.org/print/vol-130/state-v-loomis/). Ask on day one: what will the adverse-action notice say?
2. **Base rates and false positives** — fraud is rare, so even "accurate" models mostly flag innocents: IRS non-IDT fraud filters ran an **81% false-positive rate** and delayed ~$20B in legitimate refunds while protecting $7.6B [oversight] (https://www.taxpayeradvocate.irs.gov/wp-content/uploads/2020/07/ARC18_Volume1_MSP_05_FalsePositiveRates.pdf); MiDAS 93% wrong per state Auditor General; Florida FIRRE flagged trivial discrepancies, 600%+ flag surge, $92.4M rebuild (https://www.btah.org/case-studies.html).
3. **Decision-support becoming the de facto decision-maker** — a heat map or score quietly becomes the decision with no appeal path; Michigan's Zynda settlement now *requires* human review of automated determinations.
4. **Garbage in, scored anyway** — Idaho's unreliable historical data; Missouri's algorithm with literal syntax errors; Michigan's SNAP felony match auto-terminating ~19,000 people, struck down 2015 (https://www.btah.org/case-studies.html). LLM layers add a hallucination surface on top of every data defect.
5. **Bias under federal scrutiny** — Allegheny Family Screening Tool drew DOJ civil-rights attention over disability discrimination; Oregon dropped its analog (https://www.pbs.org/newshour/nation/ap-report-doj-examining-ai-screening-tool-used-by-pa-child-welfare-agency).

### Skepticism triggers
- **"Accuracy" without precision/recall at the operating threshold and your base rate** → at fraud-level base rates, high "accuracy" coexists with 80–90%+ false-positive flags (IRS 81% benchmark).
- **Any proprietary score with a trade-secret disclosure posture** → Idaho precedent; constitutional exposure, not a licensing preference.
- **"Predicts fraud/risk" with no false-positive rate, review-queue staffing model, or affected-person notice** → MiDAS/FIRRE pattern.
- **"Identifies savings of $X"** → protected-vs-delayed framing: IRS "protected $7.6B" while delaying $20B legitimate.
- **LLM "ask your data" with no query/row provenance** → hallucinated numbers in official decisions; demand every generated claim link to the underlying query and rows.
- **"Bias-free"** → unfalsifiable; demand disparate-impact testing methodology and results.
- **Scores executed without mandatory human sign-off** → maps to strongest caution band via overlay.

### Diligence questions
1. **Decision or decoration:** "What decisions will outputs feed, and can a score or flag by itself trigger an adverse action against a person (benefit cut, fraud hold, investigation)? If yes — this is a high-risk system needing a different review track."
2. **Explainability for the affected person:** "Show the exact notice text an affected resident would receive. Can a caseworker explain in plain language why this specific person was flagged?"
3. **No trade-secret shield:** "Will you contractually commit to disclosing model logic, features, and weights to us, our auditors, and a court if litigated?"
4. **Performance at our base rate:** "Not 'accuracy' — precision and recall at your recommended threshold, validated on data like ours. At our prevalence, how many flags per 100 are false positives, and what staffing does the review queue require?" (IRS: 81% FP.)
5. **Enforced human review:** "Where exactly is human review mandatory — as a designed control? Can the system technically execute an adverse action with no human sign-off?"
6. **Disparate impact:** "What testing across race, disability, age, and language, on which population — and will you share results? Has any customer, regulator, or DOJ inquiry examined this product?"
7. **Data quality gates:** "When our input data is wrong, stale, or missing — does the system flag uncertainty or silently score anyway?"
8. **Ongoing audit:** "What drift monitoring and revalidation exist, who sees results, and what triggers suspension of the model?"
9. **Remediation:** "When we discover a wrong score, what's the process to correct it, find everyone else affected by the same defect, and make them whole?"
10. **LLM insight layers:** "How do you prevent hallucinated numbers, and does every generated claim link to the underlying query and rows?"
11. **Track record:** "List government deployments of this specific model/product, including any challenged, audited, or decommissioned." (Tool auto-cross-checks vendor name against BTAH and the AI Incident Database.)
12. **Cost of being wrong:** "Warranty, indemnification, and insurance terms when system errors trigger litigation?" (Michigan: $20M + rebuild; Florida: $92.4M rebuild.)

### Elevated-scrutiny rules
- Score/flag can trigger action against a person → `eligibility-case-mgmt` overlay + strongest caution band for auto-executed adverse actions.
- Child-welfare/justice screening pitch → Allegheny/Loomis context rendered; disparate-impact question mandatory.
- Pure descriptive dashboard/open-data pitch → standard track; incumbent-duplication check (does existing Tyler/Power BI/Tableau contract already cover this?).

### Reference deployments
Tyler Data & Insights across major cities/states (FedRAMP-listed); OpenGov budgeting analytics; Polco/Zencity engagement analytics. Cautionary set (render alongside any integrity-analytics match): MiDAS, Idaho K.W., Arkansas RUGs/ARIA, Florida FIRRE, Michigan SNAP match, Allegheny FST, COMPAS/Loomis — all sourced above; BTAH library as the standing reference shelf.

### Registries / Legal / Pricing / Gaps
Registries: FedRAMP/GovRAMP, BTAH case library (negative registry), AI Incident Database, EPIC screening-and-scoring spotlights. Legal: due-process line of cases (K.W., Loomis, Goldberg-derived), M-25-21 high-impact presumption for fraud detection, state ADS laws. Pricing: no reliable public anchors for integrity analytics — treat pricing as secondary to the decision-or-decoration fork. Gaps: current Pondera/LexisNexis/SAS product claims not re-verified; ID.me pandemic record excluded as unverified this cycle.

---

# Part 3 — Matching Logic

### 3.1 Pipeline
1. **Extract** — normalize the pitch artifact (email text, PDF, scraped URL, or bare vendor name) into: vendor name(s), product name(s), claimed capabilities, claimed customers/metrics, and use-case language. For a bare vendor name, the wizard's research step supplies the capability text from the vendor's site before classification.
2. **Classify** — run each pack's `inclusion_test` via an LLM classifier constrained to yes/no per question, with a keyword/regex pre-pass (each inclusion question ships with a signal lexicon, e.g. `call-center`: "IVR," "containment," "deflection," "hold time," "Amazon Connect"; `eligibility`: "eligibility," "redeterminations," "program integrity," "payment accuracy," "work requirements"). A pack matches when the classifier answers yes to ANY of its inclusion questions with confidence ≥0.7; 0.4–0.7 renders as "possibly relevant" with the pack's headline triggers only.
3. **Multi-match is normal, not exceptional.** Vendor pitches deliberately span categories ("AI for your entire benefits operation"). All matched packs contribute; the output is organized by the **primary pack** (highest classifier score) with secondary packs' skepticism triggers and top-3 questions merged in, deduplicated. Cap rendered questions at ~18 total, prioritized: overlay-mandated → primary pack → secondary packs.
4. **Trigger scan** — run all matched packs' `skepticism_triggers` patterns against the pitch text itself (e.g., "99% accuracy," "fully automated," "no human review," "deploy in days," "FedRAMP compliant," "75+ languages"). Each hit is quoted back to the user with the threshold and evidence.
5. **Registry checks** — fire the union of matched packs' `registries_to_check` (FedRAMP Marketplace product search, GovRAMP APL, GovAI Trellis FactSheet lookup, Pavilion Contract Hub, Procurated, SAM.gov/Secretary-of-State existence, CT/NY public AI inventories, CCF AI Knowledge Hub, cross-reference `established_vendors` and BTAH/AI Incident Database). Results feed the legitimacy band, not the pack match.

### 3.2 Pack precedence and boundaries
- `call-center` vs `public-comms`: phone/contact-center signals win for primary; a web-only chatbot is `public-comms` even if the vendor also sells voice.
- `document-processing` vs `staff-productivity`: structured extraction from inbound documents is IDP; drafting/summarizing for staff is productivity.
- `eligibility-case-mgmt` **always attaches when matched, and is always listed first** in the output regardless of classifier score ordering.

### 3.3 Fallback when no pack matches
The wizard still runs. Output uses the **generic diligence core**: the ~30-question master list distilled from GovAI FactSheet / OMB M-25-21/22 / M-26-04 / CA / WA / NY frameworks (procurement-frameworks report §13), the universal registry checks, and universal skepticism triggers (unverifiable references, "compliant"-vs-authorized, uniqueness claims, urgency framing, free pilots for data access). The output states plainly: "This pitch doesn't fit a category this tool has researched in depth; here is the general-purpose evaluation." Every no-match pitch is logged (category text only, no user data) to a `pack-gap` telemetry file that feeds the refresh process — three or more similar no-matches in a quarter is the signal to draft a new pack (public safety/surveillance and permitting/licensing are the anticipated next two).

### 3.4 The elevated-scrutiny overlay (core safety mechanism)
`eligibility-case-mgmt` is both a pack and an **overlay**. Overlay fires when any matched pack's `elevated_scrutiny_rules` detect adverse-action potential — a call-center bot that "verifies eligibility," a document pipeline that "auto-approves renewals," a dashboard that "flags likely fraud." Overlay effects: (1) prepend the "Why this category is different" block; (2) add eligibility questions 1, 2, 3, and 12 to the question list; (3) raise the recommendation floor to "enhanced review" — the "established vendor — proceed to demo with these questions" band becomes unavailable until the human-decides-adverse-actions question is answered; (4) cite OMB M-25-21's high-impact presumption and the NY "no automated final decisions" rule as the diligence benchmark. This mirrors the procurement-frameworks finding that a wizard detecting high-impact use should automatically escalate from the office-productivity question tier to the high-impact tier.

---

# Part 4 — Refresh Process

### 4.1 Cadence
- **Quarterly review** (default) for all packs; **monthly** for `eligibility-case-mgmt` (fast-moving litigation, state ADS laws, OBBBA implementation). Each review re-verifies: every URL resolves (CI link-checker runs weekly regardless), every `verify_before_citing` item, pricing anchors against live pages, and registry names/status.
- CI enforces staleness: a pack whose `last_updated` exceeds 2× its cadence fails the build until reviewed or explicitly waived with a dated note. Every rendered output shows "guidance last reviewed {date}" — honesty about staleness is itself a trust feature.

### 4.2 Event triggers (update out-of-cycle)
Any of the following opens a maintainer issue within a week:
1. **Litigation/oversight event** — new court ruling, IG/GAO/TIGTA report, or settlement involving a named vendor or category (add to failure modes; annotate `established_vendors`).
2. **Law/policy effective date or change** — state AI acts taking effect (Colorado Jun 30, 2026 is already queued), new OMB memos, FCC/DOJ actions, registry renames (the StateRAMP→GovRAMP rename is the canonical example of why names must be re-verified — vendors still using the old name is itself a pack trigger).
3. **Vendor lifecycle event** — acquisition, shutdown (CivStart-style), major funding, product rename (Google CCAI→Customer Engagement Suite), pricing-model change (the 2026 per-resolution churn), FedRAMP/GovRAMP authorization granted or revoked.
4. **Prominent deployment outcome** — a new named government deployment with public metrics, or a public decommissioning (NYC MyCity shutdown-class events must land in packs within one week; they are the tool's most persuasive content).
5. **Pack-gap telemetry** — ≥3 similar no-match pitches in a quarter → draft-pack proposal.
6. **User/partner flag** — an in-tool "report outdated info" link that files a pre-templated GitHub issue.

### 4.3 Community contributions (open-source repo)
- **Everything contributable via PR** against the pack YAML files. `CONTRIBUTING.md` requires: every factual change carries a URL; metrics labeled by `metric_source_type`; vendor-reported figures never promoted to fact; no recommendation language (linted).
- **Two-lane review.** Lane 1 (fast): link fixes, date-stamps, new sourced reference deployments — one maintainer approval. Lane 2 (slow): changes to `established_vendors`, `skepticism_triggers`, `diligence_questions`, `scrutiny_tier`, or anything in `eligibility-case-mgmt` — two maintainers, one from a partner org (CODEOWNERS: 17A + New Practice Lab + CCF).
- **Conflict-of-interest rule:** contributors must disclose vendor affiliation in the PR; vendor-affiliated PRs may correct factual errors about their own product (with sources) but may not add their product to `established_vendors` — that requires an independently verifiable government deployment (press, government page, or contract record; a vendor case study alone is insufficient) confirmed by a maintainer.
- **Issue templates:** "New failure mode / incident," "New reference deployment," "Vendor status change," "Stale claim," "New pack proposal."
- **Partner channels as intake:** GovAI Coalition committees, CCF's AI Readiness state network, and Code for America's landscape team are the natural upstream sources for incident reports and new deployments; each quarterly review includes a sweep of GovAI registry additions, GovRAMP APL changes, BTAH case-library additions, AI Incident Database entries, and StateScoop/GovTech/The Markup coverage.
- **Versioning:** packs are semver'd (`schema_version` + per-pack content version); the wizard pins a pack-set release so outputs are reproducible ("evaluated against pack release 2026.Q3"), and a changelog per pack lets an agency see what changed since they last checked a vendor.

### 4.4 Known-gap discipline
Each pack's `known_gaps` field is the standing to-do list for the next refresh (Google pricing, Citibot roster, Azure list prices, Cahoo disposition, OneGov SLG applicability, Colorado AI Act status, the unpublished April–May 2026 New America survey — which all packs currently cite as internal partner context, softened in public copy to "a 2026 New America survey of state benefits agencies (forthcoming)" until publication is confirmed). Gaps that persist two consecutive reviews get either resolved or the dependent claim removed.