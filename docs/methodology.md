# How This Tool Evaluates AI Vendor Pitches

**Methodology version 1.0** · Effective August 28, 2026 · Licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

This document describes every check the AI Vendor Diligence Wizard runs, every source it consults, how it grades evidence, and how it decides what to say. It is the complete basis for every report the tool produces. If a check is not described here, the tool does not run it. Checks marked **planned** are documented for transparency but do not run yet; no report relies on them.

Every report links each of its findings back to a section of this document, so you can always see exactly how a result was produced.

---

## 1. What you get

A free triage tool for state and local government staff. Give it an AI vendor's pitch, as a website address, a pasted email, a PDF, or just a company name. It checks the pitch's claims against public records. Every report has three parts:

1. A **verdict tier**: a plain-language statement about how much of the pitch could be confirmed, and what to do with your time next.
2. A **verification ledger**: a row-by-row record of each claim, what we checked, what we found, and a link to the evidence.
3. A **question pack**: specific questions to send the vendor before you spend an hour in a demo.

**Limits, stated up front.**

- The tool never says buy or do not buy, and it never scores vendors with a number. Its strongest negative output is: "we could not verify this claim in public sources; ask the vendor for this document before spending staff time."
- There is no browsable directory of vendor grades. Reports are generated on demand, one at a time, at your request, and every report expires and must be regenerated to be relied on.
- Reports are not consumer reports under the Fair Credit Reporting Act, and the tool is not a consumer reporting agency. **Do not use this tool or its output to make decisions about any person's employment, hiring, promotion, credit, insurance, or housing.** The tool looks at named individuals only in their business capacity, and only when the vendor itself presents them as its leadership.
- The tool evaluates the pitch in front of you against public records. Where records and claims disagree, it shows you both, with links and dates, and leaves the conclusion to you. It never judges character.

**Who runs it.** The tool is open source. The code, this methodology, and the sector question packs are public. Anyone can read exactly how it works, and anyone can point out where it is wrong.

---

## 2. The seven dimensions, and every check we run

The tool organizes its checks into seven dimensions, D1 through D7. Two principles govern all of them:

- **We flag conflicts between the pitch and the public record.** A company that says "a decade serving states" on a website registered eight months ago, or a "FedRAMP Authorized" claim that is absent from the official FedRAMP feed. That is the signal. A missing credential, on its own, never counts against a vendor; many good vendors are small, young, or new to government.
- **A source we could not reach counts for nothing.** Some public sources block automated searches or require paid access. When we cannot search a source, the report says "coverage limited" and hands you a short manual check card instead. A source we could not reach never counts against a vendor. (Our [state coverage map](./coverage-map.md) lists which registries we can and cannot search automatically, and why.)

Each check below states four things: what we look at, the public source, how it runs, and what an adverse finding means. "How it runs" is one of:

- **Automatic lookup**: our code queries a public data source directly. No AI is involved in the result.
- **AI-assisted web research**: an AI model searches the public web and must cite a source for everything it reports. Our code, not the model, then grades each source's authority (see Section 3).
- **Manual check card**: a step we cannot or will not automate. The report hands you a link, tells you what to look for, and tells you what a bad answer looks like. Most cards take under two minutes.

Adverse findings carry a weight (Critical, High, Medium, Low, or Info) that feeds the verdict tier rules in Section 4. Passing checks are reported too, as green flags with sources.

### Dimension 1: Identity and registration (D1)

Does a real, registered company stand behind this pitch? This dimension gates the bottom verdict tier: the tool's harshest output requires contradictions here, established by code against official registries, never by AI judgment.

### D1.1 Legal entity registration

**What we look at.** Whether a registered legal entity exists under any name the pitch discloses, and its status.
**Public sources.** [SEC EDGAR full-text search](https://efts.sec.gov/LATEST/search-index?q=%22company%22&forms=D) (nearly every venture-funded company has filed a Form D, which names its state of incorporation); plus the five state business registries that offer open data we can query directly: [New York](https://data.ny.gov/resource/n9v6-gdp6.json), [Colorado](https://data.colorado.gov/resource/4ykn-tg5h.json), [Connecticut](https://data.ct.gov/resource/n7gp-d28j.json), [Oregon](https://data.oregon.gov/resource/tckn-sxa6.json), and [Texas (Comptroller)](https://data.texas.gov/resource/9cir-efmm.json). Florida publishes [free bulk data files](https://dos.fl.gov/sunbiz/other-services/data-downloads/); an automated mirror of them is planned, and until it ships Florida gets a manual card with a direct Sunbiz link. Every other state gets a manual check card with a direct link to its official business search.
**How it runs.** Automatic lookup (EDGAR plus a parallel sweep of all five open-data states), with a manual check card for states we cannot search automatically. Compound names are searched under each part: for a pitch styled "Product by Company," the registries are searched under the company name as well as the full phrase, and a record is accepted only when it matches the company, never when it merely shares the product's brand name with an unrelated firm.
**If adverse.** Weight: Critical, but only under a strict rule. "No registration found" can count against a vendor only when a definitive search actually ran and returned empty, in a place where the vendor itself claims to be registered, or when a registry shows the entity as dissolved or terminated. Absence from a registry we could not search is always "coverage limited," never a finding. Routine lapses like "annual report past due" are noted as Info, not treated as alarms; they are common at young companies.

### D1.2 Federal registration (SAM.gov)

**What we look at.** Whether the vendor holds an active federal registration (a Unique Entity ID in SAM.gov).
**Public source.** [SAM.gov Entity Management API](https://open.gsa.gov/api/entity-api/).
**How it runs.** Automatic lookup.
**If adverse.** Absence is weighted Low and is never penalized on its own; most vendors that sell only to state and local government have no reason to register in SAM. Presence is a green flag: it means the entity's identity was validated by the federal government.

### D1.3 Debarment and exclusion lists

**What we look at.** Whether the entity, or a principal the vendor presents as leadership, appears on the federal exclusion (debarment) list.
**Public sources.** [SAM.gov Exclusions API](https://open.gsa.gov/api/exclusions-api/); mirror at [OpenSanctions](https://www.opensanctions.org/datasets/us_sam_exclusions/).
**How it runs.** Automatic lookup.
**If adverse.** Weight: Critical, but only on a strict identity match (exact legal name plus corroborating identifiers). A name that merely resembles a listed name is suppressed entirely rather than hedged; we show nothing rather than risk tarring the wrong company. Short name fragments from a compound name are never searched on their own here; when a registry resolves the vendor's full legal name, the exclusion list is searched again under that resolved name.

### D1.4 Domain age vs. claimed history

**What we look at.** When the vendor's web domain was registered, compared against explicit age claims in the pitch ("founded 2015," "a decade of government work").
**Public source.** [RDAP](https://rdap.org/), the successor to WHOIS, which returns the domain's registration date.
**How it runs.** Automatic lookup.
**If adverse.** A young domain by itself is weighted Low; new companies have new domains, and that is not a defect. The weight rises to High only when the domain's age contradicts an explicit claim in the pitch. This contradiction is also one of the deterministic events that can contribute to the harshest verdict tier, but only when combined with zero verifiable customers (see Section 4).

### D1.5 Web operating history

**What we look at.** Whether the domain has the operating history the pitch implies: archived snapshots over time, and the history of its security certificates.
**Public sources.** [Internet Archive Wayback Machine CDX API](https://web.archive.org/cdx/search/cdx); [crt.sh certificate transparency logs](https://crt.sh/).
**How it runs.** Automatic lookup.
**If adverse.** A contradictory history (for example, the domain hosted an unrelated business last year while the pitch claims years of operation) is weighted High. No archive history at all is Info only; small sites are often not archived.

### D1.6 Product infrastructure

**What we look at.** Whether a claimed software product leaves the normal technical traces: application, API, documentation, or status subdomains.
**Public sources.** [crt.sh](https://crt.sh/) subdomain records, plus direct checks of common subdomains.
**How it runs.** Automatic lookup.
**If adverse.** A claimed software-as-a-service product with nothing but a bare marketing page is weighted Medium. It is a prompt to ask for a live demo environment, nothing more.

### D1.7 Email and DNS hygiene

**What we look at.** Whether the pitch came from the company's own domain, and whether that domain has ordinary business email configuration (MX, SPF, DMARC records).
**Public source.** Standard DNS lookups.
**How it runs.** Automatic lookup.
**If adverse.** A pitch for an enterprise product sent from a free personal email address, or a claimed company domain with no mail configuration at all, is weighted Medium to High. Plenty of legitimate outreach comes from sales tools, so this check corroborates; it never stands alone.

### D1.8 Headquarters address type

**What we look at.** Whether the address the vendor presents as its headquarters is an operating office, a virtual-office suite, or a registered agent's address.
**Public sources.** Public web research on the address itself (what else is registered there, what kind of building it is).
**How it runs.** AI-assisted web research.
**If adverse.** A virtual office presented as an operating headquarters, combined with no phone number and no visible staff footprint, is weighted High. Using a registered agent for legal mail is Info only; nearly every company does this, and it means nothing on its own.

### Dimension 2: Government track record (D2)

Real government contracts leave public traces: payment records, contract lists, meeting agendas, inventories. This dimension tests the pitch's customer claims against those traces.

### D2.1 Federal payment records

**What we look at.** Whether the federal government has ever paid this vendor.
**Public source.** [USAspending.gov API](https://api.usaspending.gov/), the official record of federal awards.
**How it runs.** Automatic lookup.
**If adverse.** Claimed federal customers with zero footprint in the federal payment record is weighted High. No federal footprint with no federal claims is neutral. Verified payments are a strong green flag.

### D2.2 Cooperative contract claims

**What we look at.** When a pitch claims a cooperative purchasing contract ("available on Sourcewell," "NASPO contract holder"), whether the cooperative's own published list includes the vendor or its named reseller.
**Public sources.** [Sourcewell contract search](https://www.sourcewell-mn.gov/contract-search); [NASPO ValuePoint contractor list](https://www.naspovaluepoint.org/contractors/); [OMNIA Partners supplier list](https://www.omniapartners.com/what-we-do/suppliers-contracts).
**How it runs.** Automatic lookup (Sourcewell), AI-assisted web research for the others. We search for the vendor and for common resellers before concluding anything.
**If adverse.** A claimed cooperative contract absent from the cooperative's own list is weighted Critical. This is a registry contradiction: the kind of deterministic event that can contribute to the harshest verdict tier. A verified contract is a green flag.

### D2.3 State and city payment records

**What we look at.** Whether named state or city customers show actual payments to the vendor in open checkbook data.
**Public sources.** [Checkbook NYC](https://www.checkbooknyc.com/api-page), [California eProcure](https://caleprocure.ca.gov/pages/public-search.aspx), [Ohio Checkbook](https://checkbook.ohio.gov/), and other state open-checkbook portals.
**How it runs.** Automatic lookup. **Planned**: this check is not yet live.
**If adverse.** A hit will be a green flag. A miss will always be neutral, because checkbook coverage is a patchwork; the report will say so explicitly.

### D2.4 Traces on government websites

**What we look at.** When the pitch names specific government customers, whether those agencies' own websites, council agendas, or meeting minutes mention the vendor. A count or a description ("more than 50 municipalities", "1,600 governments") is not a named customer: it gets no ledger row and no finding, because a scale claim is not a customer claim.
**Public sources.** Site-restricted searches of the named agencies' .gov websites; public meeting portals such as [Legistar](https://www.legistar.com/) agenda systems.
**How it runs.** AI-assisted web research, with the verdict decided by code over the retrieved evidence. The search budget scales with the pitch: a pitch naming four or more customers gets an extended budget (up to 20 searches instead of 12) so each named customer can be searched individually.
**What counts as verified.** A customer claim is marked VERIFIED only when a class 1 or class 2 source ties the customer and the vendor together in content the tool actually retrieved: the page title or the quoted passage. The customer tie may also come from the page sitting on the customer's own official site, but the vendor tie must always appear in retrieved content. A link alone never verifies: when research surfaces an official page whose address mentions the customer but nothing was retrieved from it, the row stays "could not verify" at Medium weight, the link is attached, and a manual check card asks the reader to open it and look for the vendor's name. Research pages that back no row at all are not discarded: they appear in a "found during research, not yet confirmed" list at the end of the report, labeled by source type, so the reader can follow up. Pages from press-release wires never appear there.
**If adverse.** A specific named customer with no trace anywhere after a full search is weighted High, and the report recommends the decisive manual step: call or email the named agency. Only agency confirmation can settle it. The finding is always phrased as "we could not find," never as an accusation.

### D2.5 Public AI registries

**What we look at.** Whether the vendor already appears in a public government AI registry or a state AI inventory, which would mean it has already answered a transparency questionnaire or holds a live government contract.
**Public sources.** [GovAI Coalition Trellis registry](https://trellis.hortus.ai/); [Pavilion AI Contract Hub](https://www.withpavilion.com/associations/gov-ai); Connecticut's statutory AI inventory (Public Act 23-16, on the [CT open data portal](https://data.ct.gov/)); New York's public AI inventory (State Technology Law 103-e).
**How it runs.** AI-assisted web research.
**If adverse.** Absence is neutral; these registries are young and incomplete. Presence is a strong green flag, and the report suggests contacting the listing agency as a reference.

### D2.6 GSA Schedule status

**What we look at.** Whether the vendor holds a GSA Schedule contract.
**Public source.** [GSA eLibrary](https://www.gsaelibrary.gsa.gov/).
**How it runs.** **Planned**: this check is not yet live.
**If adverse.** Absence will always be neutral. Presence will be a green flag.

### D2.7 Case-study cross-check

**What we look at.** Whether the pitch's case studies exist anywhere other than the vendor's own website. Real government successes usually leave independent traces: local news, agency announcements, conference talks.
**Public sources.** Quoted searches of the case study's specific claims across the public web.
**How it runs.** AI-assisted web research.
**If adverse.** A headline case study that exists nowhere except vendor-controlled pages is weighted High, and generates a direct question for the vendor: which agency, measured how, and may we contact them?

### D2.8 Customer-language parsing

**What we look at.** Hedged customer language: "worked with," "supporting teams at," "trusted by," pilots described as deployments.
**Public source.** The pitch text itself.
**How it runs.** Automatic pattern analysis of the pitch.
**If adverse.** Hedged language is Info only. It is never treated as a violation; it is converted into a precise question: "For each named agency, is there an active paid contract, a pilot, or individual users? May we contact the contract administrator?"

### Dimension 3: Security and compliance posture (D3)

Compliance claims come in different kinds: some can be checked against official registries, some are documents you must request, and some name certifications that do not exist at all. This dimension sorts every claim into its correct bucket, verifies what can be verified, and turns the rest into document requests.

### D3.1 FedRAMP claims

**What we look at.** Any FedRAMP claim, checked against the government's own machine-readable marketplace feed.
**Public source.** [FedRAMP Marketplace data](https://raw.githubusercontent.com/FedRAMP/marketplace-fedramp-gov-data/main/data.json), refreshed daily, published by the FedRAMP program office.
**How it runs.** Automatic lookup.
**If adverse.** "FedRAMP Authorized" claimed but absent from the official feed is weighted Critical and is a registry contradiction (see Section 4). The contradiction arms only when the pitch states the designation as a current status: vague vocabulary like "FedRAMP compliant," "FedRAMP equivalent," or "built on FedRAMP infrastructure" is weighted Medium to High instead, because these are [not recognized designations](https://www.fedramp.gov/), and the report explains the difference. "In process" or "pending" language never arms the contradiction; it becomes a question to the vendor. Having no FedRAMP status at all is neutral for vendors selling to state and local government.

### D3.2 GovRAMP and StateRAMP claims

**What we look at.** Claimed GovRAMP status (the program was formerly named StateRAMP; we treat the names as the same program), checked against the program's published participant list, including the exact status level: Member, Snapshot, Ready, Provisional, or Authorized.
**Public source.** [GovRAMP program participants](https://govramp.org/program-participants/), refreshed daily.
**How it runs.** Automatic lookup.
**If adverse.** A claimed status absent from the list is weighted Critical (registry contradiction). "Member" presented as if it were a security verification is Medium; membership alone verifies nothing, and the report explains what each status actually means.

### D3.3 TX-RAMP claims

**What we look at.** Claimed TX-RAMP certification, when the vendor is selling into Texas.
**Public source.** [Texas DIR TX-RAMP certified products list](https://dir.texas.gov/resource-library-item/tx-ramp-certified-cloud-products).
**How it runs.** Automatic lookup, when the buyer is in Texas or the pitch claims TX-RAMP. For everyone else the check does not apply, and the report says so.
**If adverse.** A claim absent from the list is weighted High rather than Critical, because the published list is known to lag actual certifications; the report says so and gives the DIR contact for confirmation. "Provisional" presented as "certified" is noted.

### D3.4 ISO 27001 certificates

**What we look at.** Whether a claimed ISO/IEC 27001 certificate can be found, is current, and covers the product being pitched rather than just the company's office IT.
**Public source.** [IAF CertSearch](https://www.iafcertsearch.org/), the international accreditation database, plus the issuing certification body's own register.
**How it runs.** Manual check card in the current version (the database is search-form based); automation is planned.
**If adverse.** A certificate that cannot be found in either place is weighted High. A certificate whose scope does not cover the pitched product is Medium. An expired-edition certificate is Medium.

### D3.5 Certifications that do not exist

**What we look at.** Claims of certifications that no authority issues: "HIPAA certified," "CJIS certified," "FERPA certified," "NIST certified."
**Public sources.** [HHS Office for Civil Rights guidance](https://www.hhs.gov/hipaa/for-professionals/faq/) (there is no HIPAA certification); FBI CJIS program guidance (there is no CJIS certification process).
**How it runs.** Automatic pattern analysis of the pitch.
**If adverse.** Weight: Medium to High. The report explains that the named credential does not exist under that regulatory regime, and tells you what to ask for instead: a signed Business Associate Agreement for HIPAA, a signed CJIS Security Addendum and audit history for CJIS, a signed student-data privacy agreement for FERPA.

### D3.6 SOC 2 claims

**What we look at.** SOC 2 claims. There is no public SOC 2 registry, so this check cannot be automated by anyone; it becomes a document request.
**Public sources.** For verifying the named audit firm: [NASBA CPA lookup](https://ald.nasba.org/search/cpa) and [AICPA peer review search](https://peerreview.aicpa.org/public_file_search.html).
**How it runs.** Manual check card: request the full report under NDA, confirm it is Type II, check the covered period is recent, and check the scope covers the product you are buying.
**If adverse.** "SOC 2 certified" wording alone is Low; it is a common harmless misnomer (SOC 2 is an attestation, not a certification). A SOC 2 badge combined with refusal to share the report even under NDA is High. "We are SOC 2 because we run on AWS" is Medium to High; a cloud provider's compliance does not transfer to the software built on it.

### D3.7 Visible security program

**What we look at.** Whether the vendor publishes any of the ordinary artifacts of a real security program: a trust center or security page, a subprocessor list (including which AI model providers receive customer data), a data processing agreement, a way to report incidents.
**Public sources.** The vendor's own website (trust subdomain, /security, /subprocessors pages).
**How it runs.** Automatic lookup.
**If adverse.** A company handling government data with none of these artifacts is weighted High, reported as "no visible security program in public sources." Any one artifact present removes the finding.

### D3.8 CSA STAR listing

**What we look at.** Whether the vendor appears in the Cloud Security Alliance STAR registry.
**Public source.** [CSA STAR registry](https://cloudsecurityalliance.org/star/registry).
**How it runs.** **Planned**: this check is not yet live.
**If adverse.** Absence will always be neutral. Presence will be a green flag.

### D3.9 Payment-card compliance

**What we look at.** PCI status, only when the pitch claims payment processing.
**Public sources.** [Visa Global Registry of Service Providers](https://www.visa.com/splisting/searchGrsp.do); Mastercard's compliant service provider list.
**How it runs.** Manual check card.
**If adverse.** Absence from these registries does not mean non-compliance (listing is optional), and the card says so. "PCI certified" claimed on the basis of a self-assessment questionnaire alone is Medium.

### D3.10 AI governance commitments

**What we look at.** This check only ever produces a question for your pack: whether the vendor will certify an AI governance program consistent with the NIST AI Risk Management Framework or ISO/IEC 42001, and share its risk management plan.
**Public sources.** [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework); the GovAI Coalition vendor agreement template.
**How it runs.** Added to the question pack automatically.
**If adverse.** Not applicable; there is no adverse finding here. Refusal to make the commitment is information for your negotiation, not a flag from this tool.

### Dimension 4: Technical substance (D4)

Is there a real AI product behind the marketing, and is its architecture described honestly?

### D4.1 Model transparency

**What we look at.** Whether the vendor says which foundation models its product uses (name, version, provider), and what the vendor itself adds: fine-tuning, prompts, classifiers, filters. Building on major AI providers' models is normal 2026 architecture and is not a flag; hiding it is the issue.
**Public sources.** The pitch and the vendor's public documentation, compared with any public evidence of the underlying stack.
**How it runs.** AI-assisted web research.
**If adverse.** "Our proprietary AI" claims alongside public evidence that the product runs on a third-party model are weighted High; the concern is candor about what was built. No model disclosure anywhere is Medium and becomes a direct question in the pack.

### D4.2 Engineering footprint

**What we look at.** Public engineering artifacts: documentation, an API reference, a changelog, a status page, a GitHub organization.
**Public sources.** The vendor's site; [GitHub organization API](https://api.github.com/).
**How it runs.** Automatic lookup.
**If adverse.** Absence of any single artifact is Low and never stands alone; most government vendors publish no public code, and that is normal. Zero engineering artifacts of any kind at a self-described platform company is Medium.

### D4.3 Automation honesty

**What we look at.** Unqualified full-automation claims: "fully automated," "no human intervention." Several prominent AI products have turned out to depend heavily on human workers behind the scenes.
**Public source.** The pitch text, compared with staffing evidence in public sources.
**How it runs.** Automatic pattern analysis plus AI-assisted web research.
**If adverse.** Weight: Medium to High, and the pack gains a pointed question: "What fraction of transactions require human completion, and how is that staffed?"

### D4.4 Data-flow safety

**What we look at.** Where your residents' data would actually go: which subprocessors, which model providers, under which terms.
**Public sources.** The vendor's subprocessor list; the model providers' published terms of service.
**How it runs.** AI-assisted web research, plus a manual card for the documents only the vendor can produce.
**If adverse.** Resident personal data routed through consumer-grade AI terms is weighted Critical regardless of how established the company is. The finding is phrased as a fact about documented terms, with links, never as a characterization of intent.

### D4.5 Independent evaluations

**What we look at.** Whether any independent third party has evaluated the product's accuracy, bias, or disparate impact.
**Public sources.** Public evaluation reports, academic studies, government test results.
**How it runs.** AI-assisted web research.
**If adverse.** Absence is neutral and becomes a demo question. Presence is a green flag with a link.

### D4.6 Portability and lock-in

**What we look at.** Whether the vendor commits to data export, documented APIs, and a workable exit.
**Public sources.** The vendor's documentation and contract terms where public.
**How it runs.** AI-assisted web research.
**If adverse.** Absence is Info only; it feeds the contract-terms questions in the pack rather than any flag.

### Dimension 5: Team credibility (D5)

Do the people the vendor presents as its leadership verifiably exist, in the roles claimed? Person-level checks run only on individuals the vendor itself holds out as leadership or credentials, and never on anyone else. The tool has no person-search feature.

### D5.1 Leadership existence

**What we look at.** Whether the named founders and executives appear anywhere independent of the vendor's own website: news coverage, conference programs, professional records.
**Public sources.** [GDELT global news database](https://www.gdeltproject.org/); public conference and press archives.
**How it runs.** AI-assisted web research, with the verdict decided by code over the retrieved evidence. A person counts as corroborated only when one retrieved page from an official or independent-press source names both the person and the vendor in its retrieved text. This is the same two-identifier discipline as D5.2, here as name plus affiliation. A web address alone never counts, and the vendor's own pages never count. Corroboration means the person appears in public sources independent of the vendor's site; it does not confirm their title or employment. The report checks up to six named leaders.
**If adverse.** An entire claimed leadership team with no independent public trace is weighted High, phrased strictly as "we could not verify," never worse. That weight applies only when the research ran to completion and the pitch names three or more leaders, none of whom could be corroborated; a two-person team with no trace is weighted Medium. A single person with a thin footprint is not a finding at all; early-career founders often have little public record, and that is real and normal.

### D5.2 Publications and patents

**What we look at.** Claimed technical pedigree: publications, patents, academic affiliations.
**Public sources.** [OpenAlex](https://openalex.org/) (academic publication database); [PatentsView](https://patentsview.org/) (USPTO patent data); a link-out to Google Scholar on the manual card.
**How it runs.** AI-assisted web research.
**If adverse.** We require at least two matching identifiers (for example, name plus institution, or name plus patent assignee) before attributing any work to a person. Below that bar, the report says only "publications matching this name exist (identity not confirmed)," weighted Info.

### D5.3 Official records about principals

**What we look at.** Adverse official records about the vendor's presented leadership: securities enforcement actions, federal court records, exclusion lists.
**Public sources.** [SEC action lookup](https://www.sec.gov/litigations/sec-action-look-up-individuals); [SEC EDGAR](https://efts.sec.gov/LATEST/search-index?q=); [CourtListener](https://www.courtlistener.com/); SAM exclusions; OFAC sanctions lists.
**How it runs.** AI-assisted retrieval from the named official sources only, with strict identity matching. The tool never reports anything from an AI model's memory; every such statement must come from a retrieved record with a link.
**If adverse.** A confirmed record on a strict match is weighted High to Critical, reported with full fair-report discipline: the record is linked and dated, unproven allegations are labeled as allegations, and outcomes (dismissed, settled, judgment) are always stated. The report's action item is "consult procurement counsel," not a conclusion. A fuzzy or name-only match is suppressed entirely: we show nothing rather than hint.

### D5.4 Team photo authenticity

**What we look at.** Whether team photos are stock images or AI-generated faces.
**Public sources.** Reverse image search ([TinEye](https://tineye.com/), Google Lens), via links we hand you.
**How it runs.** Manual check card.
**If adverse.** If you confirm a team photo appears on many unrelated sites, the finding is weighted Critical and reported exactly as the observation: "this image appears on other unrelated websites." The tool never asserts why.

### D5.5 Headcount claims

**What we look at.** Claimed team size versus visible professional footprint.
**Public sources.** LinkedIn, via a manual check card with direct links. We do not automate LinkedIn searches; its terms of service prohibit automated access, and we honor that (see Section 10).
**How it runs.** Manual check card.
**If adverse.** A gross mismatch you confirm yourself (for example, "50 engineers" claimed and three findable profiles) is weighted High.

### D5.6 Bio changes over time

**What we look at.** Whether leadership bios and titles on the vendor's site have shifted over time in ways that inflate credentials.
**Public source.** [Wayback Machine](https://web.archive.org/) snapshots of the vendor's team pages.
**How it runs.** **Planned**: this check is not yet live.
**If adverse.** Documented title inflation will be weighted Medium, presented as both archived pages side by side, with no motive asserted.

### Dimension 6: Claims hygiene (D6)

Certain classes of marketing claims have repeatedly drawn federal enforcement against AI companies. This dimension detects those claim classes and converts each into a substantiation request. The enforcement history justifies the check design; it is never cited against any specific vendor in a report.

### D6.1 Accuracy claims

**What we look at.** Unqualified accuracy or performance numbers: "99% accurate," "detects all threats," "zero bias," "eliminates errors," with no published methodology.
**Public source.** The pitch text.
**How it runs.** Automatic pattern analysis plus AI-assisted review.
**If adverse.** Weight: High. The report's language is careful: "an accuracy figure without a published methodology, dataset, and error breakdown is unsubstantiated," and the pack gains the question: "Which deployment produced this figure, measured how, over what period, and may we contact that agency?"

### D6.2 Guaranteed savings claims

**What we look at.** Promised or guaranteed cost savings and return on investment: "cut call-center costs 60%, guaranteed."
**Public source.** The pitch text.
**How it runs.** Automatic pattern analysis.
**If adverse.** Weight: High, converted into a substantiation question quoting the claim verbatim.

### D6.3 Availability claims

**What we look at.** Whether what is being sold exists today: products "launching Q3" sold as live, demos that are only videos.
**Public source.** The pitch text and the vendor's public product pages.
**How it runs.** AI-assisted web research plus a manual demo card.
**If adverse.** Weight: Medium, and the pack gains: "Can we have a hands-on sandbox with our own data, or is the demo a video?"

### D6.4 Urgency and pressure tactics

**What we look at.** Artificial urgency: end-of-quarter pricing, "only two pilot slots left," pressure to skip procurement steps.
**Public source.** The pitch text.
**How it runs.** Automatic pattern analysis.
**If adverse.** Weight: Medium. Public procurement has no legitimate reason to move at a vendor's sales-quarter speed, and the report says so.

### D6.5 Testimonials

**What we look at.** Anonymous or initials-only testimonials, and whether quoted people exist in the roles claimed.
**Public sources.** The pitch text; public search for the named individuals.
**How it runs.** Automatic pattern analysis plus a manual card.
**If adverse.** Anonymous testimonials are Medium. A testimonial attributed to a person who cannot be found in the claimed role at the claimed agency is Critical, phrased as "we could not locate this person in this role," with the search shown.

### D6.6 Logo walls

**What we look at.** Large customer logo walls compared against the number of customers that can actually be verified anywhere, and marketing copy duplicated across unrelated websites.
**Public sources.** Quoted-phrase searches across the public web.
**How it runs.** AI-assisted web research.
**If adverse.** A large logo wall with zero independently verifiable customers behind it is weighted High. Identical boilerplate recurring across unrelated low-authority sites is Medium to High and can also trigger an adversarial-content finding (see ADV-04 below).

### D6.7 AI-written copy density

**What we look at.** Heavy density of vocabulary associated with AI-generated text.
**Public source.** The pitch text.
**How it runs.** **Planned**, and deliberately limited: if shipped, this signal will be corroborating only, weighted Low, and never surfaced as a standalone finding. Legitimate vendors draft with AI tools, and AI-text detectors are unreliable. This tool will never flag a vendor for using AI to write.

### D6.8 Privacy policy and terms

**What we look at.** Whether the vendor's privacy policy exists, names the correct legal entity, carries an effective date, and addresses the product's actual data flows (for example, call recordings for a call-center product).
**Public source.** The vendor's own website.
**How it runs.** Automatic lookup plus AI-assisted review.
**If adverse.** A missing, wrong-entity, or template-only policy is weighted Medium.

### Dimension 7: Sector fit and risk tier (D7)

This dimension classifies the pitched use case against your regulatory reality and adjusts the question pack. It produces context and questions; nothing in this dimension can create an adverse flag.

### D7.1 Use-case classification

**What we look at.** Which of six use-case categories the pitch fits: call center and phone AI, document processing, eligibility and case management, public communications, staff productivity, or data analytics.
**Public source.** The pitch text.
**How it runs.** Automatic classification, checked against pack inclusion tests that are published in the open sector-pack files.
**Output.** Selects the sector question pack. Each pack is versioned, dated, and public in the project repository.

### D7.2 High-impact determination

**What we look at.** Whether the use case is presumed high-impact under federal guidance: benefits eligibility, continued-eligibility determination, fraud screening, biometrics for benefits access, or translation that informs decisions.
**Public sources.** [OMB Memorandum M-25-21](https://www.whitehouse.gov/omb/) presumed-high-impact list; California SIMM 150.
**How it runs.** Automatic mapping from the classified use case.
**Output.** Escalates the question pack to its elevated tier, adding pre-deployment testing, impact assessment, human oversight, and appeals questions. The report states plainly when this escalation fired and why.

### D7.3 State-specific obligations

**What we look at.** What your own state already requires for this kind of AI purchase, based on the state you select.
**Public sources.** State AI policies including Texas TRAIGA (HB 149), New York NYS-P24-001, New Jersey 25-OIT-001, Washington DATA-04, California PD 401/402/403, each dated in the sector pack files.
**How it runs.** Automatic mapping from your selected state.
**Output.** "Your state will require" items in the report's next steps. These are informational summaries, not legal advice; confirm with your counsel or state CIO office.

### D7.4 Vetted by another government

**What we look at.** Whether another agency has already put this vendor through a transparency or procurement process you can borrow.
**Public sources.** The registries in check D2.5.
**How it runs.** AI-assisted web research.
**Output.** A green flag plus a concrete next step: contact that agency.

### Name-only submissions

When you give the tool only a company name, there is no website to check, so the site checks (domain age, mail configuration, web history, product infrastructure, engineering footprint) cannot run at first. If the research citations point clearly to the vendor's own website, the tool infers the address and then runs those site checks against it. The inference has strict rules: only pages the research tool actually retrieved can nominate a site, official and press sites never qualify, the address must match the vendor's name, and at least two separately retrieved pages must live on it. The report labels the address as inferred, and the inference never counts toward identity verification. Claim-by-claim rows still require a pitch: with only a name, there are no customer or leadership claims to test.

### Adversarial-content checks (ADV)

Vendor pitches are, by definition, written by the party being evaluated, and some documents now include text aimed at the AI tools that read them. The tool runs deterministic screens for this before any AI model sees the pitch. These findings can never be removed by any later stage, and any one of them caps the verdict tier (see Section 4). The full design is described in plain language in our [security document](./security.md).

### ADV-01 Hidden text

Text present in the submitted material but invisible to a human reader (hidden styling on web pages; hidden text layers in PDFs). Web page detection is live, and PDF detection covers text smaller than 4 points or placed off the page; color-matched text and rendered-page comparison are planned. The finding reports that hidden text exists and quotes it.

### ADV-02 Text addressed to AI systems

Text that speaks to an automated evaluator rather than to a human reader ("ignore previous instructions," "note to AI reviewers"). Detected by a fixed pattern list in code, plus an AI screen that can add a detection but can never clear one.

### ADV-03 Invisible characters

Invisible Unicode characters (zero-width, directional, or tag characters) that can carry concealed content. They are stripped before analysis, counted, and reported.

### ADV-04 Possible planted corroboration

The same marketing phrasing repeated across multiple low-authority websites, a pattern consistent with content placed to be found by AI research tools. The scan is code over retrieved passages: a run of eight or more identical words recurring on at least two unrelated sites that present as independent. Press wires syndicating the same release do not count, and neither does the vendor repeating its own copy on its own properties; both are ordinary marketing. Reported with the matching sites named, phrased strictly as an observation.

---

## 3. Evidence tiers: how we grade what we find

Every ledger row carries an evidence tier badge, T1 through T4. The tier controls the exact language the report is allowed to use.

| Tier | Name | What it means | How the report speaks |
|---|---|---|---|
| **T1** | Verified public record | A government registry, court record, official feed, statutory inventory, or archived page, fetched by the tool and logged with a link and timestamp | Stated plainly, with the source, date, and link inside the sentence: "SAM.gov shows an active registration (checked August 28, 2026, link)." Adverse T1 items are attributed, dated, and linked; allegations are labeled as allegations; outcomes are always stated |
| **T2** | Vendor-published | The vendor's own site, documents, or filings it authored | Always attributed: "The vendor states..." Never repeated as established fact |
| **T3** | Third-party claim | News coverage, analyst notes, conference materials | Attributed with outlet and date. Press-release wire copy is flagged as self-published and treated like T2, because vendors write it themselves |
| **T4** | Unverifiable | A claim we searched for and could not corroborate anywhere in T1 through T3 | Only the absence template: "We searched [named sources] on [date] and did not find X. This is not proof the claim is false." Every T4 item automatically generates a question for the vendor |

Rules that connect the tiers:

- **Verdict tiers are computed only from T1 events.** Vendor statements, news coverage, and unverifiable claims shape the narrative and the questions; they never move the verdict.
- **Promotion.** A vendor claim (T2) corroborated by an official record (T1) becomes a green flag showing both links: claimed, then verified.
- **Contradiction.** A vendor claim contradicted by an official record is the most serious event class in the system, and is always rendered side by side: "The pitch states X (link). The registry shows Y (link, date)."
- **Match confidence is displayed.** Every T1 match is labeled either "exact match" (legal name, identifier) or "name similarity only." Adverse findings on name-similarity matches are suppressed entirely: we show nothing rather than risk attaching a record to the wrong company.
- **Source authority is assigned by code.** Every citation from web research is classified by our code, not by the AI, into one of four classes: official registries (class 1), independent press and archives (class 2), vendor-controlled or unknown sites (class 3), and press-release wires or content farms (class 4). Only classes 1 and 2 can verify a claim. The class lists are public in the repository.

---

## 4. The verdict tiers

The verdict is a recommendation about your time and process. It never advises buying or not buying. There are five tiers. There is no numeric score. Every verdict states "meets N of 7 verification checks" so you can see the basis; the seven points are: identity resolved with at least two independent identifiers (two points), up to four dimensions carrying at least one verified green flag (up to four points), and no unresolved High or Critical findings (one point).

The tier is computed by plain code from typed, logged inputs. No AI model assigns the tier, and no AI model can raise it. The full decision rules follow.

### Tier 0: Not enough to evaluate

**Criteria (exact):** the submission contains too little to research (no company name or website that resolves to a candidate entity), **or** research ran but public sources did not converge on a registered legal entity with at least two independent identifiers, and no definitive registry search contradicted the pitch.
**What the report says:** "We could not complete an evaluation. This is not a negative finding." The next step is a ready-to-send reply asking the vendor for its legal entity name, state of registration, and website, then re-run.
**Why this tier exists:** insufficient information routes here, never to the harshest tier. A vendor is never marked down because we lacked data.

### Tier 1: Could not verify basic legitimacy

**Criteria (exact):** at least **two** deterministic trigger events, each produced by code from a logged registry check. The only events that qualify:

1. A definitive registration search ran (EDGAR plus the open-data state sweep), the vendor affirmatively claims a U.S. entity, and nothing was found (D1.1, under its strict rule).
2. An exclusion-list match on strict identity (D1.3).
3. A compliance claim contradicted by the official registry: FedRAMP or GovRAMP status claimed but absent from the program's own feed (D3.1, D3.2).
4. A claimed cooperative contract absent from the cooperative's own published list (D2.2).
5. Domain age contradicting explicit track-record claims (D1.4) combined with zero verifiable customers (D2.1 through D2.4).

**An AI judgment can never assign this tier.** One trigger alone is not enough. A registry we could not search can never produce a trigger. Every trigger is listed in the report's rationale with its evidence link.
**What the report says:** "We could not verify basic legitimacy signals from public sources," followed by the specific contradictions and a document-request list: registered legal entity name and state, two named government references, and documentation for the contradicted claim. The report never uses words like those on the banned list in Section 7, and it notes that the vendor can dispute any finding through the free correction channel.

### Tier 2: Significant gaps. Resolve before engaging.

**Criteria (exact):** identity verified (the two-identifier bar met), fewer than two Tier 1 triggers, and at least one High or Critical finding that later evidence did not resolve. A pitch containing any adversarial-content finding (ADV-01 through ADV-04) is also capped at this tier, no matter what else checks out.
**What the report says:** "The company exists, but key claims in this pitch could not be corroborated. Resolve the items below in writing before scheduling a demo," with a generated pre-demo letter asking for the specific missing artifacts.

### Tier 3: Emerging vendor. Proceed with structured caution.

**Criteria (exact):** identity verified; no unresolved High or Critical findings; fewer than three dimensions carrying verified green flags. The report also states whether the vendor meets the **startup calibration bar** (Section 6): at least one of a SOC 2 Type I or named-auditor engagement, a GovRAMP Snapshot, a history of signed data protection agreements, or one verifiable government customer or pilot.
**What the report says:** "A young vendor whose claims are consistent with public records. Early-stage is not a defect." The question pack is calibrated to what a company of this size should actually be able to produce.

### Tier 4: Established vendor. Proceed to an informed conversation.

**Criteria (exact):** identity verified; no unresolved High or Critical findings; verified green flags across three or more dimensions (for example: verified entity, verified government customers, verified security posture).
**What the report says:** "Public records corroborate this vendor's core claims. What remains is product and contract diligence; whether the company is real is settled." The pack shifts to contract terms, reference calls with verified customers, and demo structure. The report also reminds you that an established name does not equal an accurate product; that is what the questions are for.

**On every report, at every tier:** the generation date, every source queried, an expiry date ("re-run before relying on this"), the triage disclaimer, and the vendor dispute link.

---

## 5. The source registry

Every external source the tool consults, with its refresh cadence. This table is the complete list; the tool queries nothing else. Copied lists (GovRAMP, TX-RAMP, Sourcewell) refresh daily; if our copy is more than 7 days old, the affected check reports that it did not run rather than using old data.

| Source | What it provides | URL | Cadence | Status |
|---|---|---|---|---|
| SEC EDGAR full-text search | Company existence, incorporation state, filing history | https://efts.sec.gov/LATEST/search-index?q= | Queried live per evaluation | Live |
| New York business registry (open data) | Entity records | https://data.ny.gov/resource/n9v6-gdp6.json | Queried live; state-maintained | Live |
| Colorado business registry (open data) | Entity records | https://data.colorado.gov/resource/4ykn-tg5h.json | Queried live; state-maintained | Live |
| Connecticut business registry (open data) | Entity records | https://data.ct.gov/resource/n7gp-d28j.json | Queried live; state-maintained | Live |
| Oregon business registry (open data) | Entity records | https://data.oregon.gov/resource/tckn-sxa6.json | Queried live; state-maintained | Live |
| Texas Comptroller franchise taxpayers | Entity records with SOS file numbers | https://data.texas.gov/resource/9cir-efmm.json | Queried live; state-maintained | Live |
| Florida Sunbiz bulk data | Entity records | https://dos.fl.gov/sunbiz/other-services/data-downloads/ | Daily bulk files published by the state; automated mirror planned | Planned |
| SAM.gov Entity Management API | Federal registration (UEI) | https://open.gsa.gov/api/entity-api/ | Queried live per evaluation | Live |
| SAM.gov Exclusions API (with OpenSanctions mirror) | Debarment and exclusion records | https://open.gsa.gov/api/exclusions-api/ | Queried live per evaluation | Live |
| USAspending API | Federal award and payment records | https://api.usaspending.gov/ | Queried live per evaluation | Live |
| FedRAMP Marketplace data feed | FedRAMP authorization status | https://raw.githubusercontent.com/FedRAMP/marketplace-fedramp-gov-data/main/data.json | Published daily by FedRAMP | Live |
| GovRAMP program participants | GovRAMP/StateRAMP status levels | https://govramp.org/program-participants/ | Copied daily from the published participants page | Live |
| TX-RAMP certified products list | TX-RAMP status (known publishing lag) | https://dir.texas.gov/resource-library-item/tx-ramp-certified-cloud-products | Copied daily; the current spreadsheet link is found on the DIR page each run | Live |
| Sourcewell contract search | Cooperative contract holders | https://www.sourcewell-mn.gov/contract-search | Copied daily from the spreadsheet Sourcewell publishes nightly | Live |
| RDAP | Domain registration dates | https://rdap.org/ | Queried live per evaluation | Live |
| Internet Archive Wayback CDX | Historical snapshots of vendor sites | https://web.archive.org/cdx/search/cdx | Queried live per evaluation | Live |
| crt.sh certificate transparency | Certificate and subdomain history | https://crt.sh/ | Queried live per evaluation | Live |
| DNS (MX, SPF, DMARC) | Email configuration | Standard DNS | Queried live per evaluation | Live |
| GitHub API | Public engineering footprint | https://api.github.com/ | Queried live per evaluation | Live |
| GDELT DOC API | Independent news coverage of people and companies | https://api.gdeltproject.org/api/v2/doc/doc | Queried live per evaluation | Live |
| OpenAlex | Academic publications | https://api.openalex.org/ | Queried live per evaluation | Live |
| PatentsView | USPTO patent records | https://patentsview.org/ | Queried live per evaluation | Live |
| SEC action lookup (SALI) | Securities enforcement actions | https://www.sec.gov/litigations/sec-action-look-up-individuals | Queried live, strict match only | Live |
| CourtListener | Federal court records | https://www.courtlistener.com/ | Queried live, strict match only | Live |
| OFAC sanctions lists | Sanctions records | https://sanctionssearch.ofac.treas.gov/ | Queried live, strict match only | Live |
| GovAI Coalition Trellis registry | Vendors already vetted by member governments | https://trellis.hortus.ai/ | Via web research per evaluation | Live |
| Pavilion AI Contract Hub | Government AI contracts | https://www.withpavilion.com/associations/gov-ai | Via web research per evaluation | Live |
| CT and NY statutory AI inventories | State AI system inventories | https://data.ct.gov/ and NY open data | Via web research per evaluation | Live |
| NASPO ValuePoint and OMNIA contractor lists | Cooperative contract holders | https://www.naspovaluepoint.org/contractors/ | Via web research per evaluation | Live |
| General web search and fetch | Customer traces, case studies, leadership coverage | Public web, with citations required | Per evaluation | Live |
| State and city open checkbooks | Payment records for named customers | Various (Checkbook NYC, Cal eProcure, Ohio Checkbook) | Planned | Planned |
| GSA eLibrary | GSA Schedule status | https://www.gsaelibrary.gsa.gov/ | Planned | Planned |
| CSA STAR registry | Cloud security self-assessments | https://cloudsecurityalliance.org/star/registry | Planned | Planned |
| IAF CertSearch | ISO 27001 certificate validity | https://www.iafcertsearch.org/ | Manual card today; automation planned | Manual |
| Visa and Mastercard service provider registries | PCI listings | https://www.visa.com/splisting/searchGrsp.do | Manual card | Manual |
| LinkedIn | Headcount and profile checks | Deep links on manual cards only | Never automated (see Section 10) | Manual |
| TinEye / Google Lens | Reverse image search | Links on manual cards only | Manual card | Manual |
| State business registries without open data | Entity records in the other 45 jurisdictions | See the [state coverage map](./coverage-map.md) | Manual cards with deep links | Manual |

**How web research sources are collected.** Sources from the research step arrive on two channels. When the research tool retrieves a page, the tool's platform records the link along with the page title and the exact passage it drew on. The research step also writes links inline in its notes; those links are collected as URL-only references, with nothing retrieved from the page. Both channels are combined, duplicate links are removed, the list is capped at 40 sources per report, and every link's authority class is assigned by code from the public class lists in this repository. The report's source list shows both kinds. A link that appears only in the research notes, with nothing retrieved from the page, is never used to verify a claim; at most it appears as an unconfirmed lead for the reader to check.

---

## 6. Fairness to small vendors

A diligence tool that punishes vendors for being small would be worse than no tool. The tool's code enforces these rules; this page describes what the code does.

1. **Absence is never adverse on its own.** No SAM registration, no FedRAMP status, no GSA Schedule, no ISO certificate, no federal awards, no GitHub presence, no press coverage: each of these renders as "neutral, common for vendors of this profile," in those words.
2. **Two calibration bars, applied automatically.** Based on verified company age and size, the report applies either the *startup bar* (SOC 2 Type I or a named-auditor Type II underway, a penetration test letter, a trust page, a subprocessor list, willingness to sign standard data agreements, a GovRAMP Snapshot if courting government) or the *established bar* (a current SOC 2 Type II with bridge letters, GovRAMP or TX-RAMP where selling, a named security lead). The report states which bar was applied and why. Demanding FedRAMP authorization or multiple simultaneous certifications from a seed-stage company is explicitly outside this methodology.
3. **SOC 2 Type II and ISO 27001 are substitutes.** They are alternative signals of the same organizational maturity. The tool never requires both.
4. **"In progress" is a legitimate state** when backed by an artifact: an engagement letter, a named auditor, a GovRAMP Snapshot on file. The question pack asks for the artifact; the claim itself is not flagged.
5. **Young is not suspect.** Domain and company age matter only when they contradict explicit claims. Tier 3 exists precisely so that young vendors with consistent claims get a constructive path, including a pointer to GovRAMP's low-cost entry program for [small businesses](https://govramp.org/providers/small-business/).
6. **Thin founder footprints are real.** Early-career founders can lack public records. The only discriminating signal is uniform unverifiability across an entire claimed-senior leadership team, and even that renders as "could not verify," never worse.
7. **Building on major AI providers' models is not a flag.** It is normal 2026 architecture. Only misrepresentation ("our proprietary model" when it is not) and unsafe data flows are flagged.
8. **Not enough data beats a bad grade.** Insufficient information always routes to Tier 0, never to Tier 1.
9. **The dispute channel is free**, and small vendors are its intended beneficiaries as much as its risk control.

---

## 7. Language policy

The tool's output language is constrained by rules that are enforced by an automated check on every generated report. A report that violates them is regenerated; it never ships.

**Words the tool never uses about any named company or person:** scam, fraud, fraudulent, fake, sham, shell company, lying, liar, deceptive, misleading, predatory, vaporware, snake oil, grift, illegitimate, bogus, con artist, criminal, dishonest, untrustworthy, and "high-risk vendor" as a label. Where a fact is adverse, the report states the fact, the source, and the date, and stops there.

**Words the tool never uses about itself:** comprehensive, unbiased, guaranteed. This document is the full statement of what the tool does; the tool claims nothing beyond it.

**The absence template.** When a claim cannot be corroborated, the only permitted framing is: "We searched [named sources] on [date] and did not find a record matching [name]. Absence from these sources is not proof the claim is false." Every such item automatically generates a question for the vendor instead of a conclusion.

**The asymmetry principle.** Positive verification is stated affirmatively on modest evidence. Negative implication requires official records with the source, date, and link inside the sentence. Absence is always framed as absence.

**Rules about named individuals.**

- The tool discusses people only in their business capacity, and only people the vendor itself presents as its leadership or credentials. It never researches anyone else, and it has no person-search feature.
- At least two matching identifiers are required before any record is attributed to a person. Below that bar, the tool either says "records matching this name (identity not confirmed)" or, for adverse records, shows nothing at all.
- Common names are automatically held to a stricter matching standard.
- Unadjudicated matters are always labeled as allegations, and case outcomes are always stated.
- The tool keeps no dossiers. Reports expire and are regenerated from sources on demand. To avoid repeat spend on the same vendor, a completed report may be reused for up to 30 days when someone checks the same vendor again; a submission that raises an adversarial-content finding always runs fresh.

---

## 8. Disputes and corrections

If you are a vendor named in a report and believe something is wrong, tell us. The channel is free, and using it is not an admission of anything.

- **How:** every report carries an "Are you this vendor? Report an error" link, which opens a dispute form tied to the specific report and finding.
- **Review:** a human reviews every dispute within **5 business days**.
- **While under review:** the disputed item displays a "disputed by the vendor, under review" notation on any report generated in the meantime.
- **If we were wrong:** the correction applies immediately to all future report generations, and because reports expire and regenerate from sources, corrections propagate rather than lingering in stale copies. We also record what was wrong and why in the public changelog when the error was in the methodology rather than the data.
- **If the source was wrong:** we will point you to the registry or record at issue so you can correct it at the source, and we will note the dispute in the meantime.

This process is designed to align with the U.S. Chamber of Commerce [Principles for Fair and Accurate Security Ratings](https://www.uschamber.com/security/cybersecurity/principles-for-fair-and-accurate-security-ratings): transparency of methodology, a dispute right before or alongside publication, no fee to correct errors, and advance notice of methodology changes.

---

## 9. Versioning

- Every report records the **methodology version** that produced it (this document is version 1.0) and the **sector pack release** it drew questions from.
- Changes to checks, weights, tier criteria, or language rules happen only through a new version of this document, recorded in the repository's public changelog with the date and the expected effect on verdicts.
- Material changes (a new check, a changed weight, a changed tier rule) are announced in the repository before they take effect.
- Sector packs carry their own dates and refresh cadences, printed in every report that uses them.

---

## 10. Known limitations

We would rather you know exactly where this tool is blind.

- **State business registries.** Only 5 of 51 U.S. jurisdictions offer business registry data we can search automatically today (New York, Colorado, Connecticut, Oregon, Texas). Florida publishes free bulk files and is next in line for automation. For the rest, the tool hands you a manual check card with a direct link. Some states prohibit automated searches in their terms of service; we honor those terms and will not search them by automation, ever. The full map, with reasons per state, is in the [state coverage map](./coverage-map.md). SEC EDGAR fills much of this gap for venture-funded companies, because a Form D filing proves existence and names the incorporation state regardless of where the company operates.
- **Delaware.** The incorporation state for most venture-backed companies prohibits automated access to its registry. We can never check Delaware for you; the manual card links its free search, and EDGAR usually corroborates Delaware incorporation federally.
- **TX-RAMP lag.** The published TX-RAMP list is known to lag actual certifications, so an absent listing there is weighted below the level of the FedRAMP and GovRAMP checks, and the report says how to confirm directly with Texas DIR.
- **No LinkedIn automation.** LinkedIn's terms prohibit automated access. Rather than scrape it anyway, the tool gives you deep links and a 60-second manual routine. This means headcount and profile checks depend on you.
- **State court records.** The tool searches federal court records. State-court litigation is a blind spot; a vendor's litigation history in state courts will not appear.
- **Point in time.** Every report reflects sources as of its generation date and carries an expiry date. Registrations, certifications, and inventories change. Re-run the evaluation before relying on it.
- **Checkbook coverage.** State and city payment-record checks are planned, not live, and even when live their coverage will be a patchwork; misses there will always be neutral.
- **Detection limits.** Screens for text aimed at AI evaluators will not catch everything; our [security document](./security.md) explains what is and is not architecturally protected.
- **AI research can miss things.** The web research stage is capped in time and scope. When it runs out of budget before finishing, the report says so ("research incomplete") rather than presenting a partial search as a complete one.

---

## 11. Licensing

- **Code:** [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0). Anyone may use, modify, and self-host it, with the license's patent grant and its trademark reservation.
- **This document and the sector packs:** [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). Reuse them with attribution.
- **The tool's name and logo are reserved** and are not licensed. A fork may take the code; it may not present itself as this tool. An agency or organization that self-hosts a modified version publishes under its own name and is responsible for its own output.

---

## 12. What this tool never does

- It never recommends buying or rejecting a vendor.
- It never produces a numeric score.
- It never publishes a browsable directory of vendor evaluations; reports exist on demand and expire.
- It never offers a person-search feature, and never evaluates anyone except leadership the vendor itself presents.
- It is never to be used for decisions about employment, credit, insurance, or housing.
- It never runs a check that is not described in this document.
- It never treats a source it could not reach as evidence against a vendor.
- It never lets an AI model assign the harshest verdict tier; that requires two independent, logged registry contradictions established by code.
- It never uses the banned vocabulary in Section 7 about any named company or person.
- It never claims more about its own output than this document supports.
