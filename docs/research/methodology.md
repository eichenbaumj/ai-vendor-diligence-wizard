# AI Vendor Diligence Wizard — Evaluation Methodology Specification

**Version:** 1.0-draft · **Date:** August 28, 2026 · **Status:** Design-final for build
**Scope:** This is the complete evaluation methodology for the wizard: dimensions and checks, evidence grading, output taxonomy, question generation, legal-safe language, pipeline design, fairness rules, and the public methodology artifact. It is a **triage** methodology. The tool never recommends purchase or rejection; it converts an unvetted pitch into a verified evidence ledger and a set of next steps.

**Design axioms (from the underlying research):**
1. **Contradiction, not absence, is the signal.** No single missing credential drives a negative verdict; the red-flag pattern is contradiction between claims and public records (a young domain + "a decade serving states"; "FedRAMP Authorized" absent from the FedRAMP JSON feed).
2. **Green flags are findings too.** Every report states what *passed*, with sources.
3. **The harshest verdict requires deterministic triggers** — logged registry checks, never LLM holistic judgment (legal-framing Rule 10).
4. **Every claim about a person or company must sit on a disclosed, linked, dated source** (Milkovich disclosed-basis opinion doctrine; fair report privilege).
5. **The tool evaluates the pitch, not the character of the vendor.** Its strongest negative output is "we could not verify X from public sources; ask the vendor for Y before spending staff time."

---

## 1. Evaluation Dimensions

Seven dimensions. Each check specifies **what is checked → evidence source(s) → how it runs → severity weight**. Severity weights (`CRITICAL / HIGH / MEDIUM / LOW / INFO`) express how a *confirmed adverse finding* influences the verdict tier (§3); passing checks accrue as green flags. Run types: **free-API** (deterministic code against a public endpoint), **LLM-web-search** (Claude server-side search/fetch with citations), **heuristic** (deterministic parsing/pattern logic), **manual-flag** (a "60-second manual check card" the user performs — used wherever automation is legally or technically off-limits, e.g., LinkedIn).

### D1. Identity & Registration
*Purpose: does a real legal entity stand behind this pitch? This dimension alone gates the bottom verdict tier.*

| # | Check | Evidence source | How it runs | Severity (adverse) |
|---|---|---|---|---|
| 1.1 | Legal entity exists: name, status (active/dissolved), incorporation date | State SoS registries via OpenCorporates (https://opencorporates.com — apply for public-benefit API access); free fallbacks: NY (https://data.ny.gov/resource/n9v6-gdp6.json), CO (data.colorado.gov SODA), FL Sunbiz bulk files | free-API | No registration under any disclosed name after LLM search of the HQ state's SoS: **CRITICAL** |
| 1.2 | Federal registration: UEI, active SAM record, TIN-validated identity | SAM.gov Entity Management API (https://open.gsa.gov/api/entity-api/, `https://api.sam.gov/entity-information/v1-4/entities`) | free-API | Absence: **LOW** (normal for SLED-only vendors — never penalized alone). Presence: green flag |
| 1.3 | Debarment/exclusion of entity or principals | SAM.gov Exclusions API (https://open.gsa.gov/api/exclusions-api/); no-key mirror: https://www.opensanctions.org/datasets/us_sam_exclusions/ | free-API | Any exclusion match (strict entity match): **CRITICAL** |
| 1.4 | Domain age vs. explicit age/track-record claims | RDAP (`https://rdap.org/domain/{domain}`, parse `events[]` registration) | free-API + heuristic | Young domain alone: **LOW**. Domain materially contradicts explicit claims ("founded 2015," "decade of gov work"): **HIGH** |
| 1.5 | Web operating history; prior life of the domain | Wayback CDX (`https://web.archive.org/cdx/search/cdx?url={domain}&output=json`); crt.sh (`https://crt.sh/?q={domain}&output=json`, with timeout/cache fallback) | free-API | Contradictory history (domain hosted unrelated content last year): **HIGH**. No history: **INFO** |
| 1.6 | Product infrastructure exists (app./api./docs./status. subdomains) | crt.sh subdomain enumeration + HTTP probes | free-API + heuristic | Claimed SaaS with only bare www + no docs/changelog: **MEDIUM** |
| 1.7 | Email/DNS hygiene: pitch sent from corporate domain; MX/SPF/DMARC present | DNS lookups; sender-domain vs. site-domain comparison | heuristic | Free-mail sender or no MX for a claimed company: **MEDIUM-HIGH** |
| 1.8 | HQ address type (operating office vs. registered-agent/virtual suite) | Geocoding place-type + quoted-search of address | heuristic + LLM-web-search | Virtual office presented as operating HQ + no phone + no staff footprint: **HIGH**. Registered agent used for legal mail: **INFO** (universal, innocent) |

### D2. Government Track Record
*Purpose: test the pitch's customer claims against the public records that real government contracts always leave.*

| # | Check | Evidence source | How it runs | Severity |
|---|---|---|---|---|
| 2.1 | Federal payments to vendor | USAspending API (`POST https://api.usaspending.gov/api/v2/search/spending_by_award/`; recipient autocomplete; no key, no auth) | free-API | Claimed federal customers, zero footprint: **HIGH**. Hits: strong green flag |
| 2.2 | Cooperative contract–holder status when claimed | Sourcewell contract XLSX (https://www.sourcewell-mn.gov/contract-search); NASPO ValuePoint (https://www.naspovaluepoint.org/contractors/); OMNIA (https://www.omniapartners.com/what-we-do/suppliers-contracts); PEPPM; Pavilion link-out (https://www.withpavilion.com) | free-API (Sourcewell XLSX) / heuristic scrape | False cooperative claim: **CRITICAL** (registry contradiction). Verified: green flag. Search both vendor and likely resellers (Carahsoft, SHI) |
| 2.3 | State/city payment records for named SLED customers | Checkbook NYC API (https://www.checkbooknyc.com/api-page); CA Cal eProcure/SCPRS (https://caleprocure.ca.gov/pages/public-search.aspx); Ohio Checkbook; Socrata state checkbooks (CT, DE, IA…) — a one-time registry of ~15–25 endpoints | free-API | Hit: green flag. Miss: **neutral** (patchwork coverage — stated explicitly in output) |
| 2.4 | Named agency customers leave `.gov` traces | `site:{agency}.gov "{vendor}"` searches; Legistar/Granicus agenda portals (`{city}.legistar.com`) | LLM-web-search | Specific named customer with zero trace after full ladder: **HIGH**, escalating to **CRITICAL** only on agency confirmation (manual step the report recommends) |
| 2.5 | Presence in public AI registries/inventories | GovAI AI Registry (https://trellis.hortus.ai/); Pavilion AI Contract Hub (https://www.withpavilion.com/associations/gov-ai); CT statutory AI inventory (PA 23-16, open data portal); NY public AI inventory (State Tech Law §103-e) | LLM-web-search / heuristic | Presence: strong green flag (vendor already answered a transparency questionnaire or holds a live gov contract). Absence: **neutral** |
| 2.6 | GSA Schedule holder | GSA eLibrary (https://www.gsaelibrary.gsa.gov, server-rendered scrape) | heuristic | Presence: green flag. Absence: **neutral** |
| 2.7 | Case-study cross-existence | Quoted-search of case-study headline claims ("cut call wait times 40% in {County}") | LLM-web-search | Case study existing nowhere but the vendor's own site: **HIGH** |
| 2.8 | Customer-language parsing ("worked with," "supporting teams at," pilots vs. contracts) | Pitch text | heuristic + LLM | Hedged language: **INFO** → converted into a targeted question (§4) |

### D3. Security & Compliance Posture
*Purpose: classify every compliance claim into its correct bucket — attestation / registry-verified / contract-regime / framework — auto-verify the verifiable, and convert the rest into document requests.*

| # | Check | Evidence source | How it runs | Severity |
|---|---|---|---|---|
| 3.1 | FedRAMP claim vs. authoritative feed | FedRAMP Marketplace JSON (`https://raw.githubusercontent.com/FedRAMP/marketplace-fedramp-gov-data/main/data.json`, daily; changelog for status history) | free-API | "Authorized" claim not in feed: **CRITICAL**. "FedRAMP compliant/equivalent/attested/built-on" vocabulary: **MEDIUM-HIGH** (non-recognized terms per https://www.fedramp.gov/2026/marketplace/). No FedRAMP at all: **neutral** for SLED vendors |
| 3.2 | GovRAMP/StateRAMP status (treat names as same program) | Program Participants list, https://govramp.org/program-participants (daily; Excel export) | free-API (XLSX ingest) | Claimed status absent from list: **CRITICAL**. "Member" presented as security verification: **MEDIUM**. Snapshot/Core/Ready/Provisional/Authorized distinguished in output |
| 3.3 | TX-RAMP certification (when selling into Texas) | https://dir.texas.gov/resource-library-item/tx-ramp-certified-cloud-products (XLSX; publishing lag caveated; fallback txramp@dir.texas.gov) | free-API | False claim: **HIGH** (lag caveat prevents CRITICAL). Provisional ≠ certified noted |
| 3.4 | ISO/IEC 27001 certificate validity + scope | IAF CertSearch (https://www.iafcertsearch.org/) + certification body register | free-API/manual-flag | Cert not found *and* CB register negative: **HIGH**. Scope mismatch (corporate IT only): **MEDIUM**. 2013-edition cert in 2026: **MEDIUM** |
| 3.5 | Nonexistent-certification vocabulary: "HIPAA certified," "CJIS certified," "FERPA certified," "NIST certified" | HHS OCR FAQ (no HIPAA certification exists); FBI CJIS ISO ("no CJIS certification process"); regime structure per security-compliance report | heuristic keyword | **MEDIUM-HIGH** — worded as "this credential does not exist under the regime; ask instead for [BAA / signed CJIS Security Addendum + state CSA audit history / SDPC NDPA / assessment letter]" |
| 3.6 | SOC 2 claim classification (Type I vs II, currency, scope) | No registry exists — output is a document-request card: full report under NDA, unqualified opinion, period end <12 mo + bridge letter, scope covers the pitched product; verify auditor via https://ald.nasba.org/search/cpa and https://peerreview.aicpa.org/public_file_search.html | manual-flag | "SOC 2 certified" wording: **LOW** (common misnomer). Badge with refusal to produce report even under NDA: **HIGH**. Inherited-compliance dodge ("we're SOC 2 because AWS"): **MEDIUM-HIGH** |
| 3.7 | Trust center / security page / subprocessor list exists — incl. **which model providers receive agency data** | Probe `trust.{domain}`, `/security`, `/subprocessors` | heuristic | None of: pen-test letter, trust page, subprocessor list, DPA, IR contact → **HIGH** ("no visible security program") |
| 3.8 | CSA STAR listing | https://cloudsecurityalliance.org/star/registry | free-API | Presence (Level 1 self-assessment or Level 2): green flag; absence neutral |
| 3.9 | PCI (only if payments claimed) | Visa Global Registry (https://www.visa.com/splisting/searchGrsp.do); Mastercard SDP PDF | heuristic | Absence ≠ non-compliance (opt-in registries); "PCI certified" on SAQ only: **MEDIUM** |
| 3.10 | NIST AI RMF / ISO 42001 governance certification willingness | WA DATA-04 §11 one-line certifiable requirement; GovAI Vendor Agreement §3 | manual-flag → question | Not a flag; generates the ask: "Will you certify an AI governance program consistent with NIST AI RMF or ISO/IEC 42001 and provide your Risk Management Plan?" |

### D4. Technical Substance
*Purpose: is there a real AI product behind the marketing — and is its architecture honestly described?*

| # | Check | Evidence source | How it runs | Severity |
|---|---|---|---|---|
| 4.1 | Model transparency: which foundation models (name, version, provider), what the vendor adds (fine-tuning, system prompts, classifiers, filters) | Pitch/site vs. M-26-04 minimum-threshold artifacts (AUP, model/system/data cards); STD-1000-style disclosure fields | LLM-web-search + heuristic | "Proprietary AI/LLM" claims with third-party model evidence (Presto pattern): **HIGH**. No model disclosure anywhere: **MEDIUM** → question |
| 4.2 | Engineering footprint: docs, API reference, changelog, status page, GitHub org | Site probes; `GET https://api.github.com/orgs/{org}` (+repos) | free-API + heuristic | Absence: **LOW** alone (most gov vendors ship no public code); zero engineering artifacts *of any kind* at a claimed platform company: **MEDIUM** |
| 4.3 | Human-in-the-loop honesty (the Nate/Builder.ai check) | Claims parsing: "fully automated," "no human intervention" vs. staffing evidence | heuristic + LLM | Unqualified full-automation claims: **MEDIUM-HIGH** → challenge question ("what fraction of transactions require human completion?") |
| 4.4 | Data-flow safety for the use case | Subprocessor list; model-provider terms; SIMM 150-style delivery-model fields | LLM-web-search + manual-flag | Resident PII routed through consumer-grade API terms: **CRITICAL** finding regardless of company legitimacy — phrased as a fact about documented terms, with links |
| 4.5 | Independent evaluation exists (bias/accuracy/disparate impact study) | GovAI FactSheet field 20; M-25-22 independent-evaluation terms | LLM-web-search | Absence: **neutral** → becomes a demo question. Presence: green flag |
| 4.6 | Anti-lock-in surface: export formats, documented APIs, portability commitments | M-25-22 fn.25 pro-competition criteria | LLM-web-search | Absence: **INFO** → contract-question pack |

### D5. Team Credibility
*Purpose: do the people the vendor holds out as leadership verifiably exist, in the roles claimed? Person-level checks run **only** on individuals the vendor itself presents as leadership or credentials — never on anyone else (FCRA guardrail).*

| # | Check | Evidence source | How it runs | Severity |
|---|---|---|---|---|
| 5.1 | Founders/executives exist independently of the vendor's site | GDELT DOC 2.0 (`https://api.gdeltproject.org/api/v2/doc/doc?query=...&format=json`); conference/press artifacts | free-API + LLM-web-search | Whole leadership team unmatchable to any public record: **HIGH** — phrased strictly as "could not verify" |
| 5.2 | Claimed technical pedigree (publications, patents) | OpenAlex (`https://api.openalex.org/authors?search=`); Semantic Scholar (`/graph/v1/author/search`); PatentsView (https://patentsview.org/apis/api-endpoints/inventors — patent assignee corroborates employment); Google Scholar link-out only | free-API | ≥2 corroborating identifiers required before attributing anything (§5.4 of founder report). Unverified: "publications matching this name" hedge, **INFO** |
| 5.3 | Adverse official records on principals | SEC SALI (https://www.sec.gov/litigations/sec-action-look-up-individuals); EDGAR FTS (`efts.sec.gov`, User-Agent required); CourtListener v4 (`/api/rest/v4/search/?type=r&q=`, cache hard — 125/day cap); SAM exclusions; OFAC | free-API (cached, low-volume) | Confirmed record (strict match): fair-report block, **HIGH-CRITICAL** with "consult procurement counsel" action. Fuzzy match: **suppressed** — show nothing rather than hedge |
| 5.4 | Team-photo authenticity | Reverse-image links (TinEye/Google Lens) as manual cards; detector APIs corroborative only | manual-flag | Stock/AI headshots confirmed by user: **CRITICAL** (reported as the observation — "this image appears on N other sites" — never "fake employees") |
| 5.5 | Headcount vs. claims | LinkedIn **manual check card** (deep links + what-bad-looks-like guidance; never scraped — hiQ/Proxycurl) | manual-flag | User-confirmed gross mismatch ("50 engineers," 3 profiles): **HIGH** |
| 5.6 | Bio drift over time | Wayback CDX diffs of /about and /team | free-API + LLM | Documented title inflation: **MEDIUM** — present both archived artifacts, assert no motive |

### D6. Claims Hygiene & Marketing Honesty
*Purpose: detect the specific claim classes that have triggered FTC/SEC enforcement, and convert each into a substantiation demand.*

| # | Check | Evidence source (precedent anchor) | How it runs | Severity |
|---|---|---|---|---|
| 6.1 | Unqualified accuracy/performance claims ("99% accurate," "detects all," "zero bias," "eliminates errors") with no methodology | Evolv (FTC 2024); Workado (98% claimed vs 53% actual); IntelliVision; ShotSpotter marketing-number history | heuristic keyword + LLM | **HIGH** — output: "an accuracy figure without a published methodology, dataset, and error breakdown is unsubstantiated; suggested question attached" |
| 6.2 | Guaranteed savings/ROI ("cut call-center costs 60%, guaranteed") | Evolv labor-cost-claim ban; Ascend Ecom/Click Profit pattern | heuristic | **HIGH** |
| 6.3 | Premature availability / video-only demos / "coming Q3" sold as live | Holland & Knight Operation AI Comply retrospective (Aug 2026) | LLM + manual-flag | **MEDIUM** → demo question: "hands-on sandbox with our data, or video?" |
| 6.4 | Artificial urgency / sole-source pressure / end-of-quarter pricing | Procurement-integrity heuristics | heuristic phrase detection | **MEDIUM** — "public procurement has no legitimate reason to move at vendor speed" |
| 6.5 | Anonymous/initials-only testimonials; testimonial persons don't exist | FTC 16 CFR Part 465 (fake-review rule; verify cite before publishing) | heuristic + manual-flag | Anonymous: **MEDIUM**. Provably nonexistent person: **CRITICAL** |
| 6.6 | Logo-wall density vs. verifiable substance; boilerplate duplicated across unrelated sites | Quoted-phrase search | LLM-web-search | Zero independently verifiable customers behind a large logo wall: **HIGH**. Boilerplate network: **MEDIUM→HIGH** |
| 6.7 | AI-tell copy density | FSU vocabulary research; detector unreliability caveats | heuristic | **LOW, corroborating only — never surfaced as a standalone finding** (legitimate vendors draft with AI; detectors are unreliable) |
| 6.8 | Privacy policy / ToS forensics: exists, names correct entity, has effective date, addresses actual data flows (call recordings, PII for a call-center product) | Site fetch | heuristic + LLM | Missing/wrong-entity/templated: **MEDIUM** |

### D7. Sector Fit & Risk Tier
*Purpose: classify the pitched use case against the buyer's regulatory reality, and escalate the question set for high-impact uses. This dimension produces context and questions, not adverse flags.*

| # | Check | Evidence source | How it runs | Output |
|---|---|---|---|---|
| 7.1 | Use-case classification (call center / document management / eligibility / fraud detection / translation / office productivity / other) | Pitch text; New America Apr–May 2026 survey taxonomy | LLM classification | Selects the sector pack (§4) |
| 7.2 | High-impact determination | OMB M-25-21 §4 presumed-high-impact list (benefits eligibility, continued-eligibility determination, benefits-access biometrics, fraud detection, decision-informing translation); CA SIMM 150 (resident chatbots & eligibility ≥ Moderate) | heuristic mapping | Escalates from "office productivity" question tier to "high-impact" tier; adds M-25-21 minimum-practices asks (pre-deployment testing, impact assessment, human oversight, appeals) |
| 7.3 | State-specific obligations in the user's state | TRAIGA disclosure duty (TX, eff. 1/1/26); NY NYS-P24-001 ("automated final decision systems are not permitted"); NJ 25-OIT-001 CTO clearance + registration; WA DATA-04 NIST-RMF vendor certification; CA PD 401/402/403 GenAI terms | heuristic (state selected by user) + LLM | Injects "your state will require…" items into next steps |
| 7.4 | Vendor already vetted somewhere | GovAI Trellis registry; CT/NY inventories (see 2.5) | free-API/LLM | Green flag + "contact that agency" next step |

---

## 2. Evidence Tier System

Every finding carries an evidence tier, displayed as a badge and controlling the language template:

| Tier | Name | Definition | Output language pattern |
|---|---|---|---|
| **T1** | Verified public record | Government registry, court record, official feed, statutory inventory, archived page — fetched by the tool, logged with URL + timestamp | Stated plainly and affirmatively, with source-date-link **in the sentence**: "SAM.gov shows an active registration (UEI …, checked Aug 28, 2026, [link])." Adverse T1 items use fair-report framing: attributed, dated, linked, allegations labeled, outcomes noted |
| **T2** | Vendor-published | The vendor's own site, PDFs, filings it authored, trust center | Always attributed: "The vendor states…", "According to the vendor's security page…". Never repeated as established fact |
| **T3** | Third-party claim | News coverage, analyst notes, conference materials, reviews | Attributed with outlet + date; wire-service press-release syndication (PRNewswire/Businesswire) is flagged as self-published and weighted ≈ T2 |
| **T4** | Unverifiable | Claims the tool searched for and could not corroborate in T1–T3 | Only the absence-of-evidence template (§5, Rule 1): "We searched [named sources] on [date] and did not find…; this is not proof the claim is false." Every T4 item auto-generates a question (§4) |

**Tier interaction rules:**
- Verdict tiers (§3) are computed **only from T1 findings and T1-contradiction events**. T2–T4 material shapes questions and narrative, never the verdict.
- A T2 claim corroborated by T1 is promoted and shown as a green flag with both links ("claims → verified").
- A T2 claim *contradicted* by T1 is the highest-severity event class in the system, rendered as a side-by-side: "The pitch states X [T2 link]; [registry] shows Y [T1 link, date]."
- Confidence is first-class: each T1 match is labeled "matched on UEI/exact legal name" (high) or "name-similarity only" (low); low-confidence adverse matches are suppressed entirely (legal-framing Rule 3 — the Wolf River entity-mismatch failure mode).

---

## 3. Output Taxonomy

No numeric score. No buy/do-not-buy. Five named tiers, each a **process recommendation to the reader** about their own time, with attached next actions. (BBB "NR" precedent for Tier 0; Castle Rock disclosed-process protection for the tier mechanic itself; the tier label is always accompanied by "meets N of M verification checks — see ledger.")

### Tier 0 — **Not Enough to Evaluate** (NR)
*Criteria:* The pitch contains too little to research — no domain, no company name resolvable to a candidate entity, or the identity-resolution stage (§6, S1–S2) cannot produce a single candidate with ≥2 identifiers.
*Language:* "We could not complete an evaluation. This is not a negative finding."
*Next actions:* Reply template asking the vendor for legal entity name, state of registration, UEI (if any), and website; re-run when received.

### Tier 1 — **Could Not Verify Basic Legitimacy**
*Criteria (deterministic triggers only — at least two of the following T1 events, all logged):* no corporate registration found under any disclosed name (1.1); SAM exclusion match on strict identity (1.3); registry contradiction on a compliance claim (3.1/3.2); claimed cooperative contract absent from the cooperative's own list (2.2); domain age contradicting explicit track-record claims (1.4) combined with zero verifiable customers (2.1–2.4). An LLM judgment can never assign this tier alone.
*Language (never "illegitimate/fake/scam"):* "We could not verify basic legitimacy signals from public sources. Recommendation: do not invest staff time until the vendor provides (a) registered legal entity name, state, and UEI; (b) two named government references you may contact; (c) documentation for [the specific contradicted claim]."
*Next actions:* the document-request list above; the specific contradiction ledger rows; note that vendor may dispute via the correction channel.

### Tier 2 — **Significant Gaps — Resolve Before Engaging**
*Criteria:* Identity verifies (D1 passes core checks) but ≥1 HIGH finding stands unresolved: unverifiable named customers, nonexistent-certification vocabulary plus no producible artifacts, unsubstantiated accuracy/ROI claims that are central to the pitch, no visible security program (3.7), leadership unverifiable (5.1).
*Language:* "The company exists, but key claims in this pitch could not be corroborated. Resolve the items below in writing before scheduling a demo."
*Next actions:* a written pre-demo letter (generated) demanding the specific artifacts per gap — SOC 2 report under NDA, named references, accuracy methodology, subprocessor list — plus the full question pack.

### Tier 3 — **Emerging Vendor — Proceed With Structured Caution**
*Criteria:* Identity verifies; no HIGH/CRITICAL findings; the vendor is young or thin on track record but meets the **startup calibration bar** (§7): claims are modest and consistent with public records; at least one of {SOC 2 Type I or named-auditor engagement, GovRAMP Snapshot, signed DPAs/BAAs history, one verifiable government pilot or customer}.
*Language:* "A young vendor whose claims are consistent with public records. Early-stage is not a defect; the checklist below is calibrated to what a company this size should be able to produce."
*Next actions:* demo permitted; startup-calibrated question pack (§4); ask for GovRAMP Snapshot if not on file ($1,000 entry program exists, https://govramp.org/providers/small-business/); pilot-structure guidance (data ownership, no-training clause, exit terms).

### Tier 4 — **Established Vendor — Proceed to Informed Conversation**
*Criteria:* Convergent T1 evidence across ≥3 dimensions: verified entity + verified government customers (payments, contracts, or public AI-inventory presence) + verified security posture (registry status or produced attestations) + no unresolved HIGH findings.
*Language:* "Public records corroborate this vendor's core claims. The remaining diligence is substantive, not existential: before a demo, ask the questions below."
*Next actions:* the full pre-demo question set (sector pack + M-26-04 documentation demands + contract-terms preview from GovAI Vendor Agreement / M-25-22 terms A–G); reference-call list of verified customers; reminder that establishment ≠ accuracy (Deloitte Australia, Evolv — both cited in the methodology, not in vendor reports).

**Universal footer on every tier:** generation date, sources queried, expiry ("re-run before relying on this"), triage-not-procurement disclaimer, and the vendor dispute link ("Are you this vendor? Report an error"). Disputed items display "disputed by vendor — under review" until resolved (Chamber Principles #2).

---

## 4. Question Generation Logic

Questions are the wizard's principal product for Tiers 2–4. Composition = **A. gap-driven + B. sector pack + C. claims-specific challenges + D. universal core**, deduplicated, capped at ~12–15, ordered by severity of the gap they close.

**A. Gap-driven (from the ledger).** Every T4/could-not-verify and every MEDIUM+ finding maps to a question template:
- Gap: SOC 2 badge, no registry (3.6) → "Please share your most recent SOC 2 Type II report under NDA, including the covered period and system scope; if only a Type I exists, tell us the Type II audit window and the named CPA firm."
- Gap: "proprietary AI" with wrapper evidence (4.1) → "Which foundation models (name, version, provider) does the product use, under what agreement, and exactly what have you added — fine-tuning, system prompts, classifiers, filters? Where is inference hosted, and do the model provider's terms permit our residents' data?"
- Gap: hedged customer language (2.8) → "You mention 'supporting teams at' three counties. For each: is there an active paid contract, a pilot, or individual users? May we contact the contract administrator?"

**B. Sector packs** (selected by D7.1; escalated when D7.2 fires). Each pack draws from the frameworks corpus:
- **Call center / resident chatbot** (the #1 pitched use case): containment vs. escalation rates with methodology; fail-safe to human on failure (M-25-21 §4(b)(v)); AI-interaction disclosure support (TRAIGA/NY/NJ/CA); multilingual performance evidence (M-26-04 multilingual benchmarks); call-recording retention and consent; monitoring the agency can run itself (GovAI VA #6).
- **Document management**: hallucination/confabulation error modes and conditions (GovAI FactSheet "Poor Conditions"; NIST AI 600-1); human-review workflow; provenance/source-citation features; FTI/PII handling and IRS 1075 Exhibit 7 experience where relevant.
- **Eligibility determination** (always high-impact per M-25-21): "Automated final decisions are prohibited in several states (e.g., NY) — show us the human-decision workflow"; disparate-impact testing methodology and results by group and language; appeal/human-review support for affected residents (M-25-21 remedies); independent evaluation availability (FactSheet field 20); pre-award testing with agency-held data the vendor cannot see (M-25-22 §4(d)(iii)(E)).
- Every high-impact pack appends: "Please complete the GovAI Coalition AI FactSheet (https://www.sanjoseca.gov/home/showpublisheddocument/127535/639034051924570000)" — a standardized ask any non-technical officer can make; refusal is itself informative.

**C. Claims-specific challenges.** Each flagged D6 claim generates a substantiation question quoting the claim verbatim: pitch says "reduces processing time 70%" → "Which deployment produced the 70% figure, measured how, over what period, and may we contact that agency?" (legal-framing Rule 7: unverified claims become questions for the vendor, never falsity findings by the tool).

**D. Universal core (always included, from the ~34-question master list):** the data-training prohibition ("Will you sign a clause permanently prohibiting use of our data to train any model absent written consent?" — M-25-22); data ownership and no-cost machine-readable export (GovAI VA #2–3); breach/incident definition and reporting commitment; complete pricing structure and overage triggers; "Which government agencies use this today, and are you in the GovAI Registry, Pavilion AI Contract Hub, or a state AI inventory?"

---

## 5. Legal-Safe Language Rules (baked into all output templates)

1. **Absence-of-evidence phrasing, always:** "We searched [named sources] on [date] and did not find a record matching '[name]'. Absence from these sources is not proof of illegitimacy." Never "X does not exist / is fake."
2. **Banned vocabulary (hard blocklist, enforced in the structuring pass and by a post-generation lint):** scam, fraud(ulent), fake, sham, shell company, lying/liar, deceptive, misleading, predatory, vaporware, snake oil, grift, illegitimate — for any named company or person. (Budget Van Lines: "grossly misleading" held actionable as fact from a self-styled expert evaluator.)
3. **Source-in-sentence rule:** every negative factual statement carries source + date + link inside the sentence (fair report privilege's three requirements).
4. **Retrieval-only for legal/enforcement history:** never model memory; strict entity match (exact legal name + jurisdiction, UEI/EIN where available) with the matching basis displayed; below threshold, display nothing. "Alleged" for unadjudicated matters; outcomes (dismissed/settled/judgment) always stated.
5. **Characterize the reader's next step, not the vendor's character** (all tier language in §3 is written this way).
6. **Disclosed-criteria composition, never adjectives:** "meets 4 of 7 identity checks (list)" — no "high risk," "untrustworthy."
7. **Asymmetry principle:** positive verification stated affirmatively on light evidence; negative implication requires official records + fair-report framing; absence is always framed as absence.
8. **Per-report contextual disclaimer header** (not TOS boilerplate): what was checked, what cannot be checked, point-in-time, triage-not-procurement, never a finding of wrongdoing.
9. **Person rules:** business capacity only; leadership the vendor holds out, no one else; ≥2 identifiers before attaching any record; "records matching this name (identity not confirmed)" hedge otherwise; common-name auto-downgrade; no persistent dossiers — reports expire and regenerate.
10. **Dispute/correction machinery is part of the language system:** free vendor dispute channel, 5-business-day review SLA, "disputed — under review" notation, corrections propagated to all cached copies (each regeneration is a new publication). Post-notice refusal to correct is the emerging fault theory — the channel is a legal control, not a courtesy.
11. **Never overdescribe the tool:** no "comprehensive," "verified vendors," "unbiased" marketing beyond what the methodology demonstrably does (Florida BBB UDAP exposure).
12. **On-demand reports only** — no browsable public directory of vendor grades.

---

## 6. Pipeline Stages

| Stage | Inputs | Processing | Outputs | Model/tool |
|---|---|---|---|---|
| **S1. Parse pitch** | Pasted email/PDF/URL/vendor name | Extract: vendor name candidates, domain(s), sender address, named people + titles, named customers, compliance claims, accuracy/ROI claims (verbatim quotes), use-case description, urgency language. Pre-check size via `count_tokens` | `pitch_extract` JSON (claims list, each typed: identity/customer/compliance/performance/team) | Haiku 4.5, `output_config` json_schema; web_fetch for URL/PDF pitches |
| **S2. Registry & API checks** | `pitch_extract` identity fields | Deterministic fan-out, all logged with query + timestamp + raw response snapshot: RDAP → crt.sh → Wayback CDX → SAM entity + exclusions → USAspending → FedRAMP JSON diff → GovRAMP XLSX → TX-RAMP XLSX (if TX) → IAF CertSearch → Sourcewell XLSX/co-op lists → checkbook registry → GitHub org → DNS/MX. Each check emits `{check_id, status: pass/fail/absent/error, evidence_url, confidence}` | `registry_ledger` (the T1 substrate; deterministic-trigger inputs for Tier 1) | Plain code in the edge function/worker — **no LLM**. Caching + graceful degradation per endpoint (crt.sh timeouts, TX-RAMP lag caveats) |
| **S3. LLM web research** | `pitch_extract` + `registry_ledger` | Agentic search/fetch pass: customer-trace ladder (site:.gov, Legistar, news), leadership corroboration (GDELT, OpenAlex, PatentsView links), case-study cross-existence, boilerplate quoted-search, AI-inventory presence. Instructed to cite everything; blocked-domain list for content farms; `pause_turn` loop handled | Cited research narrative + citation blocks | Sonnet 5; `web_search_20260318` (max_uses 20) + `web_fetch_20260318` (max_uses 10, citations on, max_content_tokens 30k); methodology system prompt behind `cache_control` |
| **S4. Sector pack match** | `pitch_extract` use-case fields + user's state | Classify use case; apply M-25-21/SIMM-150 high-impact mapping; select sector pack + state-obligation items | `sector_context` (pack id, impact tier, state items) | Heuristic table + Haiku 4.5 classification fallback |
| **S5. Synthesis** | S2 ledger + S3 narrative + S4 context | Compose verification ledger rows (claim → checked → result ∈ {VERIFIED / COULD NOT VERIFY / OFFICIAL RECORD FOUND / CONTRADICTED} → evidence tier → severity); compute verdict tier (deterministic rules first, LLM only for Tier 2/3/4 narrative); generate questions per §4; run banned-vocabulary lint | Strict `report` JSON: verdict enum, ledger[], green_flags[], questions[], next_steps[], sources[], generated_at, expiry | Haiku 4.5 with `output_config` json_schema (two-pass: research narrative → structured report), plus a non-LLM validator for tier rules and blocklist |
| **S6. Report + follow-up** | `report` JSON | Render report UI (citations displayed per Anthropic requirement); manual check cards (LinkedIn, reverse-image, Scholar) as interactive checklist whose confirmations can upgrade/downgrade specific ledger rows; grounded Q&A chat over the report only | Final report page; chat | Haiku 4.5, **no tools**, cached report as system context, max_tokens ~800, session token budget enforced server-side |

Cross-cutting: per-report source snapshots retained for litigation-hold-ready logging (legal-framing Rule 10); workspace spend caps, Turnstile, per-IP limits per the engine report; Batches API reserved for a future bulk re-verification feature.

---

## 7. Small-Vendor Fairness Rules

1. **Absence is never adverse on its own.** SAM, FedRAMP, GSA, ISO 27001, federal awards, GitHub, press coverage: absence renders as "neutral — common for vendors of this profile," in those words.
2. **Two calibration profiles, applied automatically** from verified company age/size: the *startup bar* (SOC 2 Type I or named-auditor Type II underway; pen-test letter; trust page; subprocessor list; will sign BAA/NDPA/CJIS Addendum; GovRAMP Snapshot if courting government) vs. the *established bar* (current Type II with bridge letters; GovRAMP/TX-RAMP where selling; named CISO). The report says which bar was applied and why. Demanding FedRAMP Authorized, HITRUST, or SOC 2 + ISO 27001 both from a seed-stage company is explicitly out of methodology.
3. **SOC 2 Type II and ISO 27001 are substitutable** organizational-maturity signals; never require both.
4. **"In progress" is a legitimate interim state** when backed by an artifact (engagement letter, named auditor, GovRAMP Snapshot on file) — and verifies nothing when not; the question pack asks for the artifact rather than flagging the claim.
5. **Young ≠ suspect.** Domain/company age escalates only when it *contradicts explicit claims*. Tier 3 exists precisely so young-but-consistent vendors get a constructive path, including the $1,000 GovRAMP Snapshot pointer.
6. **Thin founder footprints are real.** Early-career founders can lack public records; the discriminator is *uniform* unverifiability across an entire claimed-senior team, and even that renders as "could not verify," never worse.
7. **Wrapper ≠ fraud.** Building on frontier-model APIs is normal 2026 architecture; only *misrepresentation* ("our proprietary LLM") and unsafe data flows are flagged.
8. **NR beats a bad grade.** Insufficient data routes to Tier 0, never silently to Tier 1 (BBB NR pattern).
9. **Right of reply for everyone:** the dispute channel is free, and small vendors are its intended beneficiaries as much as its risk control.

---

## 8. The Open Methodology Artifact (`methodology.md` in the public repo)

Publishing the methodology strengthens the legal posture on four grounds (opinion doctrine, negligence defense, industry norm, anti-SLAPP) — *provided the tool actually follows it*. The public artifact must contain:

1. **Mission and scope statement:** triage of inbound pitches for public-sector staff; explicitly not a procurement recommender, not a rating directory, not a consumer reporting agency (with the FCRA no-employment-use restriction stated).
2. **The seven dimensions with every check** (§1 tables): what is checked, source URL, run type, severity weight — verbatim from this spec. Secret checks are forbidden; if it isn't in methodology.md, the tool doesn't run it.
3. **Evidence tier definitions and language templates** (§2), including the promotion/contradiction rules.
4. **Verdict tier criteria** (§3), including the deterministic-trigger rule for Tier 1 and the NR tier.
5. **The complete source registry:** every API, registry, and dataset consulted, with URLs and refresh cadences (doubles as the "disclosed basis" for opinion protection and the transparency-by-design privacy disclosure).
6. **Fairness rules** (§7) in full — this is also the public answer to "does this tool disadvantage small businesses?"
7. **Language policy:** the banned-vocabulary list, absence-of-evidence templates, person-level rules, and the asymmetry principle.
8. **Dispute, correction, and appeal process:** channel, SLA, disputed-notation behavior, correction propagation — with an explicit statement of alignment to the U.S. Chamber *Principles for Fair and Accurate Security Ratings* (https://www.uschamber.com/security/cybersecurity/principles-for-fair-and-accurate-security-ratings), the ratings industry's litigation-tested template.
9. **Model governance:** versioned methodology with a changelog; advance notice in the repo of check/weight changes and their expected effect on verdicts (Chamber Principle #4).
10. **Known limitations, honestly stated:** patchwork checkbook coverage; TX-RAMP publishing lag; Delaware registry opacity; no LinkedIn automation and why; state-court litigation blind spot; point-in-time nature of every report; the specific frameworks currency warnings (STD 1000 retired; M-24-10/18 rescinded — cite M-25-21/22/M-26-04; StateRAMP = GovRAMP).
11. **Licensing:** Apache-2.0 for code (patent grant + §6 trademark reservation); CC BY 4.0 for methodology documents; the wizard's name/logo held as trademark and excluded — hostile forks may take the code, not the brand. Self-hosting agencies publish under their own name and become their own publishers.
12. **What the tool never does:** no buy/no-buy, no numeric score, no public vendor directory, no person-search feature, no claims about its own outputs beyond what this document supports.

---

### Appendix: canonical references embedded in the system prompt (not re-fetched per run)
GovAI Coalition FactSheet + Vendor Agreement (the emulation target; https://www.sanjoseca.gov/home/showpublisheddocument/127535/639034051924570000, /118649/638774761928370000); OMB M-25-21 / M-25-22 / M-26-04 (whitehouse.gov PDFs); NIST AI RMF 1.0 + AI 600-1 (https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf); CA SIMM 150; WA DATA-04; NY NYS-P24-001; NJ 25-OIT-001; TRAIGA (HB 149); CT PA 23-16; the ~34-question master list (procurement-frameworks §13); the registry quick-reference table (security-compliance §14); the enforcement-precedent catalog (fraud-signals §§1–3) — used to justify claim-class flags in the methodology document only, never cited against a specific vendor in a report.