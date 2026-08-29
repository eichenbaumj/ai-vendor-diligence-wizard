/*
  Four complete sample reports for FICTIONAL vendors. These fixtures power
  the sample-pitch feature and mock mode, and they are the design reference
  for the report page. Every company, person, URL path, and number is
  invented. Copy follows the legal-safe language rules in
  docs/research/methodology.md section 5.
*/
import type { Report } from "@shared/schemas.ts";
import { TIER_LABELS } from "@shared/schemas.ts";
import type { SampleId } from "@/lib/sample-pitches";

const GENERATED_AT = "2026-08-28T14:05:00Z";
const EXPIRES_AT = "2026-09-27T14:05:00Z";
const RETRIEVED = "2026-08-28T14:03:00Z";

/* ------------------------------------------------------------- Meridian (T4) */

const meridianReport: Report = {
  verdict: {
    tier: 4,
    label: TIER_LABELS[4],
    summary:
      "Public records corroborate this vendor's core claims. We found an active corporate registration, a federal registration with payment history, the cooperative contract the pitch names, and a current GovRAMP authorization. The remaining diligence is substantive, not existential: before a demo, send the questions below and ask for the documents we could not check from public sources.",
    checks_met: { met: 7, total: 7 },
    rationale: [
      "Convergent verified evidence across 4 dimensions (D1, D2, D3, D4) with no unresolved high-severity findings.",
      "Identity resolved on two independent identifiers: Delaware corporate registration and SAM.gov entity record (UEI).",
      "The claimed Sourcewell cooperative contract appears in Sourcewell's published contract holder list.",
      "The claimed GovRAMP authorization appears in GovRAMP's program participants list.",
    ],
  },
  ledger: [
    {
      id: "mer-L1",
      dimension: "D1",
      claim_quote: null,
      what_checked: "Corporate registration under the vendor's legal name",
      result: "OFFICIAL_RECORD_FOUND",
      evidence_tier: "T1",
      severity: null,
      sources: [
        {
          url: "https://opencorporates.com/companies/us_de/7913412-sample",
          title: "OpenCorporates: Meridian Call AI, Inc. (Delaware)",
          retrieved_at: RETRIEVED,
        },
      ],
      note: "Meridian Call AI, Inc. appears as an active Delaware corporation, incorporated February 2019, with a registered agent on file. The registration predates every customer claim in the pitch.",
      methodology_ref: "d1-1",
    },
    {
      id: "mer-L2",
      dimension: "D1",
      claim_quote: null,
      what_checked: "Federal registration (SAM.gov entity record and exclusions)",
      result: "OFFICIAL_RECORD_FOUND",
      evidence_tier: "T1",
      severity: null,
      sources: [
        {
          url: "https://sam.gov/entity/MER1SAMPLE9Q4",
          title: "SAM.gov entity record (sample)",
          retrieved_at: RETRIEVED,
        },
      ],
      note: "SAM.gov shows an active entity registration with a UEI matching the Delaware legal name. The exclusions database returned no match for the entity or its listed officers on an exact-identity search.",
      methodology_ref: "d1-2",
    },
    {
      id: "mer-L3",
      dimension: "D1",
      claim_quote: "We have been serving government contact centers since 2019.",
      what_checked: "Domain registration date against the claimed track record",
      result: "VERIFIED",
      evidence_tier: "T1",
      severity: null,
      sources: [
        {
          url: "https://rdap.org/domain/meridiancall.ai",
          title: "RDAP registration record for meridiancall.ai",
          retrieved_at: RETRIEVED,
        },
        {
          url: "https://web.archive.org/web/2019*/meridiancall.ai",
          title: "Wayback Machine capture history",
          retrieved_at: RETRIEVED,
        },
      ],
      note: "Domain registered March 2019 (RDAP). Wayback Machine captures show a government call-center product page from late 2019 onward. The domain history is consistent with the claimed timeline.",
      methodology_ref: "d1-4",
    },
    {
      id: "mer-L4",
      dimension: "D2",
      claim_quote:
        "We hold an active Sourcewell cooperative contract (#031522-MCA).",
      what_checked:
        "Sourcewell's published contract holder list for the claimed contract number",
      result: "VERIFIED",
      evidence_tier: "T1",
      severity: null,
      sources: [
        {
          url: "https://www.sourcewell-mn.gov/contract-search",
          title: "Sourcewell contract search (sample entry)",
          retrieved_at: RETRIEVED,
        },
      ],
      note: "The contract number in the pitch appears in Sourcewell's published contract holder list under the vendor's legal name, with a current term. Cooperative claims that match the cooperative's own records are a strong signal.",
      methodology_ref: "d2-2",
    },
    {
      id: "mer-L5",
      dimension: "D2",
      claim_quote:
        "our platform is used by state agencies in Ohio and Colorado plus about thirty county and city governments",
      what_checked: "Federal and state payment records; public .gov traces",
      result: "OFFICIAL_RECORD_FOUND",
      evidence_tier: "T1",
      severity: null,
      sources: [
        {
          url: "https://www.usaspending.gov/search/?keyword=meridian-call-sample",
          title: "USAspending award search (sample)",
          retrieved_at: RETRIEVED,
        },
        {
          url: "https://tax.ohio.gov/newsroom/sample-modernization-update",
          title: "Ohio Department of Taxation newsroom (sample)",
          retrieved_at: RETRIEVED,
        },
      ],
      note: "USAspending shows two small federal awards to the vendor since 2022. An Ohio Department of Taxation page names the vendor in a 2025 phone-system modernization update. We did not attempt to verify the count of thirty local governments; the question pack asks for a customer list.",
      methodology_ref: "d2-4",
    },
    {
      id: "mer-L6",
      dimension: "D3",
      claim_quote: "we are GovRAMP Authorized",
      what_checked: "GovRAMP program participants list",
      result: "VERIFIED",
      evidence_tier: "T1",
      severity: null,
      sources: [
        {
          url: "https://govramp.org/program-participants/",
          title: "GovRAMP program participants (sample entry)",
          retrieved_at: RETRIEVED,
        },
      ],
      note: "The vendor appears on GovRAMP's participants list with an Authorized status for the pitched product. The status level matters: Authorized is the full security review, not the entry-level Snapshot.",
      methodology_ref: "d3-2",
    },
    {
      id: "mer-L7",
      dimension: "D3",
      claim_quote: "Happy to send our SOC 2 report under NDA",
      what_checked: "SOC 2 attestation (no public registry exists for SOC 2)",
      result: "COULD_NOT_VERIFY",
      evidence_tier: "T4",
      severity: null,
      sources: [],
      note: "There is no public registry of SOC 2 reports, so we could not check this from public sources. The vendor's offer to share the report under NDA is the right posture. When you receive it, check the type (Type II covers a period, Type I a single date), the covered period, and that the scope includes the pitched product.",
      methodology_ref: "d3-6",
    },
    {
      id: "mer-L8",
      dimension: "D4",
      claim_quote:
        "it runs on commercial foundation models with our own routing, redaction, and escalation layer on top, and we publish our subprocessor list",
      what_checked:
        "The vendor's published architecture and subprocessor documentation",
      result: "VERIFIED",
      evidence_tier: "T2",
      severity: null,
      sources: [
        {
          url: "https://meridiancall.ai/trust/subprocessors",
          title: "Vendor subprocessor list (vendor-published, sample)",
          retrieved_at: RETRIEVED,
        },
      ],
      note: "According to the vendor's own trust page, the product runs on named commercial models and the subprocessor list names the model providers. This is the vendor's statement about itself, so we grade it as vendor-published evidence. The pitch and the documentation say the same thing, which is what honest disclosure looks like.",
      methodology_ref: "d4-1",
    },
    {
      id: "mer-L9",
      dimension: "D5",
      claim_quote: "Dana Whitfield, VP Public Sector",
      what_checked:
        "Whether the named contact exists in public records independent of the vendor's site",
      result: "VERIFIED",
      evidence_tier: "T3",
      severity: null,
      sources: [
        {
          url: "https://www.govtech.com/sample/contact-center-panel-2025",
          title: "Government Technology conference panel listing (sample)",
          retrieved_at: RETRIEVED,
        },
      ],
      note: "A 2025 conference program lists a Dana Whitfield of Meridian Call AI on a contact-center panel, matching the title in the pitch. This is third-party coverage, not an official record, and we matched on name and company only.",
      methodology_ref: "d5-1",
    },
    {
      id: "mer-L10",
      dimension: "D6",
      claim_quote:
        "kept average phone wait under four minutes during their peak week",
      what_checked:
        "Public sources for the specific performance figure in the pitch",
      result: "COULD_NOT_VERIFY",
      evidence_tier: "T4",
      severity: null,
      sources: [],
      note: "We searched news coverage and Ohio agency pages on Aug 28, 2026 and did not find a public source for this figure. That is common for operational metrics and is not proof the claim is false. The question pack asks the vendor for the measurement method and a contact at the agency.",
      methodology_ref: "d6-1",
    },
  ],
  green_flags: [
    "Active Delaware registration (2019) matches the company's claimed age.",
    "SAM.gov entity record with UEI; no exclusions match for the entity or officers.",
    "The claimed Sourcewell contract number appears in Sourcewell's own list.",
    "GovRAMP Authorized status confirmed on the program participants list.",
    "Federal payment history on USAspending since 2022.",
    "A named state agency customer leaves a public .gov trace.",
    "The vendor discloses its model providers and publishes a subprocessor list.",
    "No urgency language or procurement pressure anywhere in the pitch.",
  ],
  adv_findings: [],
  honesty_panel: [
    {
      check_id: "sos_registration",
      label: "State corporate registration",
      status: "pass",
      reason: null,
    },
    {
      check_id: "sam_entity",
      label: "SAM.gov entity registration",
      status: "pass",
      reason: null,
    },
    {
      check_id: "sam_exclusions",
      label: "Federal debarment and exclusions",
      status: "pass",
      reason: null,
    },
    {
      check_id: "rdap_domain_age",
      label: "Domain age vs. claimed track record",
      status: "pass",
      reason: null,
    },
    {
      check_id: "wayback_history",
      label: "Web operating history (Wayback Machine)",
      status: "pass",
      reason: null,
    },
    {
      check_id: "dns_mx",
      label: "Email sent from the corporate domain",
      status: "pass",
      reason: null,
    },
    {
      check_id: "usaspending",
      label: "Federal payment records",
      status: "pass",
      reason: null,
    },
    {
      check_id: "sourcewell",
      label: "Sourcewell cooperative contract list",
      status: "pass",
      reason: null,
    },
    {
      check_id: "fedramp_feed",
      label: "FedRAMP Marketplace",
      status: "not_applicable",
      reason: "The pitch makes no FedRAMP claim.",
    },
    {
      check_id: "govramp_list",
      label: "GovRAMP program participants",
      status: "pass",
      reason: null,
    },
    {
      check_id: "soc2_report",
      label: "SOC 2 attestation",
      status: "could_not_check",
      reason:
        "No public registry of SOC 2 reports exists. Ask for the report under NDA; the question pack covers what to look for.",
    },
    {
      check_id: "state_checkbook",
      label: "State payment records for named customers",
      status: "could_not_check",
      reason:
        "Ohio's checkbook portal requires a manual search. Official search link included in your manual checks.",
    },
    {
      check_id: "ai_inventory",
      label: "Public state AI inventories",
      status: "pass",
      reason: null,
    },
    {
      check_id: "linkedin_headcount",
      label: "Staff footprint vs. claims",
      status: "could_not_check",
      reason:
        "LinkedIn does not permit automated checks. A 60-second manual check card is included below.",
    },
    {
      check_id: "github_org",
      label: "Public engineering footprint",
      status: "could_not_check",
      reason:
        "No public GitHub organization found. Common for government vendors and not counted against anyone.",
    },
    {
      check_id: "urgency_language",
      label: "Urgency or pressure language",
      status: "pass",
      reason: null,
    },
  ],
  questions: [
    {
      id: "mer-q1",
      text: "Please share your most recent SOC 2 Type II report under NDA, including the covered period, the named CPA firm, and confirmation that the system scope covers the call-center product in this pitch.",
      why: "SOC 2 has no public registry, so the report itself is the only evidence.",
      source: "gap",
    },
    {
      id: "perf-mer-c9",
      text: 'Your materials state: "kept average phone wait under four minutes during their peak week". Which deployment produced this figure, measured how, over what period, and may we contact that organization?',
      why: "Performance numbers need a methodology and a named reference before they can inform a decision.",
      source: "claim",
    },
    {
      id: "call-center-q01",
      text: "Show the exact formula for the containment or resolution rate you quoted. Do abandons, IVR completions, transfers, or 7-day callbacks count? Give the same metric for your three most comparable government clients at 90 days and 12 months.",
      why: "A standard question for Call Center & Phone AI vendors. A credible answer: A written formula with numerator and denominator, exclusions named, and the same metric reported for named government clients at both time points.",
      source: "pack",
      red_flag:
        "A single marketing number with no formula, or a definition that counts abandons and menu completions as contained.",
    },
    {
      id: "call-center-q02",
      text: "Name three government agencies of comparable volume and program type in production today, with contacts who will confirm your deck's metrics.",
      why: "A standard question for Call Center & Phone AI vendors. A credible answer: Three named agencies with contact information, and metrics that match the deck's claims.",
      source: "pack",
      red_flag:
        'Refusal is disqualifying. Every credible vendor in this category has named references; "our customer list is confidential" is not an acceptable answer here.',
    },
    {
      id: "call-center-q03",
      text: 'Walk us through every path to a human: what happens when a caller says "agent" on turn one? After two failed answers? At 2 a.m.? Is the transfer warm, meaning the agent sees the transcript and the collected data?',
      why: "A standard question for Call Center & Phone AI vendors. A credible answer: Immediate escalation on request, automatic escalation after failures, a clear after-hours path, and warm transfer with full context.",
      source: "pack",
      red_flag:
        "Escalation requires fighting through the bot, has no after-hours path, or drops the caller's context at transfer.",
    },
    {
      id: "call-center-q04",
      text: "Is the system restricted to content we approve, with the source cited for each answer? What does it do when the answer is not there: guess, refuse, or escalate? What is the measured wrong-answer rate on a benefits test set, and can we run our own test before award?",
      why: "A standard question for Call Center & Phone AI vendors. A credible answer: Corpus-restricted generation with per-answer citations, explicit refusal or escalation when the answer is absent, a measured wrong-answer rate with methodology, and yes to a pre-award test.",
      source: "pack",
      red_flag:
        "Open-ended generation, no citations, no measured wrong-answer rate, or resistance to pre-award testing.",
    },
    {
      id: "call-center-q05",
      text: "If the bot gives a claimant wrong information, what does the contract say? What are the correction SLAs and the indemnification terms?",
      why: "A standard question for Call Center & Phone AI vendors. A credible answer: Specific contract language on correction timelines and indemnification for bot-caused harm.",
      source: "pack",
      red_flag:
        '"That has never happened" or a disclaimer-only answer. A tribunal held Air Canada liable for its bot\'s invented policy; the agency owns what its bot says.',
    },
    {
      id: "gap-governance",
      text: "Do you maintain an AI governance program aligned to the NIST AI Risk Management Framework or ISO/IEC 42001? Please share the artifact that shows it, such as a certificate, an audit letter, or the policy document itself.",
      why: "A governance baseline is the fastest way to see how a vendor manages model risk.",
      source: "core",
    },
    {
      id: "core-data-training",
      text: "Will you sign a contract clause permanently prohibiting the use of our data to train any model, yours or a subprocessor's, absent our written consent?",
      why: "The single most common gap in government AI contracts.",
      source: "core",
    },
    {
      id: "core-export",
      text: "At contract end, what do we get back? Confirm no-cost machine-readable export of all our data and configurations, and name the format.",
      why: "Protects you from lock-in before it starts.",
      source: "core",
    },
    {
      id: "core-references",
      text: "Which government agencies use this product today? Are you listed in the GovAI Coalition registry, a state AI inventory, or a cooperative contract we can check?",
      why: "Verifiable references are the fastest path from pitch to informed conversation.",
      source: "core",
    },
    {
      id: "core-breach",
      text: "Define a reportable incident under our contract, your notification timeline, and who pays for breach response.",
      why: "Incident terms are cheapest to fix before signature.",
      source: "core",
    },
    {
      id: "core-pricing",
      text: "Provide the complete pricing structure: platform, usage, integration, support, and every trigger that changes our bill, including a surge scenario.",
      why: "Surprise overage economics are a recurring failure mode in AI contracts.",
      source: "core",
    },
  ],
  manual_checks: [
    {
      id: "mer-m1",
      label: "LinkedIn headcount check (60 seconds)",
      instructions:
        "Search LinkedIn for people who list Meridian Call AI as their current employer. A company serving thirty-plus governments should show a real team: engineers, support staff, and the people named in the pitch.",
      link: "https://www.linkedin.com/search/results/people/?keywords=Meridian%20Call%20AI",
      what_bad_looks_like:
        "Only one or two profiles, profiles created recently, or no one in engineering or support roles.",
    },
    {
      id: "mer-m2",
      label: "Call the named customer",
      instructions:
        "The pitch names the Ohio Department of Taxation. Call the agency's main line, ask for the contact center manager, and ask two questions: is the vendor's system live today, and would they buy it again?",
      link: "https://tax.ohio.gov/contact",
      what_bad_looks_like:
        "The agency does not recognize the vendor, or describes a pilot that ended rather than a live system.",
    },
    {
      id: "mer-m3",
      label: "Ohio checkbook search",
      instructions:
        "Search Ohio's public spending portal for payments to Meridian Call AI. Payment records are the strongest customer evidence there is.",
      link: "https://checkbook.ohio.gov/",
      what_bad_looks_like:
        "No payments to the vendor from any of the agencies the pitch names.",
    },
  ],
  next_steps: [
    "Send the question pack before scheduling a demo. An established vendor will answer most of it in one pass.",
    "Request the SOC 2 report under NDA and the two references now; both were offered in the pitch.",
    "Run the three manual checks. They take about five minutes total.",
    "At the demo, ask for a hands-on sandbox with your own sample calls, not a video.",
    "Re-run this check before contract signature. Reports expire because records change.",
  ],
  sector: {
    pack_ids: ["call-center"],
    elevated: false,
    overlay_reason: null,
    state_items: [
      "Colorado: the Colorado AI Act (effective June 30, 2026) treats AI affecting access to government services as high risk. Confirm the vendor's compliance plan in writing.",
    ],
    decision_impact: "advisory",
  },
  sources: [
    {
      url: "https://opencorporates.com/companies/us_de/7913412-sample",
      title: "OpenCorporates: Meridian Call AI, Inc.",
      retrieved_at: RETRIEVED,
    },
    {
      url: "https://sam.gov/entity/MER1SAMPLE9Q4",
      title: "SAM.gov entity record",
      retrieved_at: RETRIEVED,
    },
    {
      url: "https://rdap.org/domain/meridiancall.ai",
      title: "RDAP registration record",
      retrieved_at: RETRIEVED,
    },
    {
      url: "https://web.archive.org/web/2019*/meridiancall.ai",
      title: "Wayback Machine capture history",
      retrieved_at: RETRIEVED,
    },
    {
      url: "https://www.sourcewell-mn.gov/contract-search",
      title: "Sourcewell contract search",
      retrieved_at: RETRIEVED,
    },
    {
      url: "https://www.usaspending.gov/search/?keyword=meridian-call-sample",
      title: "USAspending award search",
      retrieved_at: RETRIEVED,
    },
    {
      url: "https://tax.ohio.gov/newsroom/sample-modernization-update",
      title: "Ohio Department of Taxation newsroom",
      retrieved_at: RETRIEVED,
    },
    {
      url: "https://govramp.org/program-participants/",
      title: "GovRAMP program participants",
      retrieved_at: RETRIEVED,
    },
    {
      url: "https://meridiancall.ai/trust/subprocessors",
      title: "Vendor subprocessor list (vendor-published)",
      retrieved_at: RETRIEVED,
    },
    {
      url: "https://www.govtech.com/sample/contact-center-panel-2025",
      title: "Government Technology panel listing",
      retrieved_at: RETRIEVED,
    },
  ],
  review: {
    reviewed: true,
    model: "claude-haiku-4-5",
    adjustments: [
      "Rewrote one ledger note to attribute a vendor trust-page statement instead of stating it as established fact.",
    ],
  },
  meta: {
    generated_at: GENERATED_AT,
    expires_at: EXPIRES_AT,
    methodology_version: "1.0",
    pack_release: "2026.08",
    vendor_key: "meridiancall.ai",
    vendor_display_name: "Meridian Call AI (sample, fictional)",
    research_partial: false,
    input_kind: "paste",
  },
};

/* ------------------------------------------------------------- SwiftGov (T1) */

const swiftgovReport: Report = {
  verdict: {
    tier: 1,
    label: TIER_LABELS[1],
    summary:
      "We could not verify basic legitimacy signals for this vendor from public sources, and two claims in the pitch are contradicted by the records that would normally support them. Our recommendation is about your time, not the vendor's character: do not invest staff time until the vendor provides its registered legal entity name and state, its Sourcewell contract number, and two named government references you may contact. The vendor can dispute or correct any item here through the report-an-error link.",
    checks_met: { met: 0, total: 7 },
    rationale: [
      "Deterministic trigger [cooperative_contract_contradiction] from check sourcewell: the pitch claims a Sourcewell cooperative contract; we searched Sourcewell's published contract holder list on Aug 28, 2026 and did not find the vendor under any name variant we tried.",
      "Deterministic trigger [domain_age_contradiction_no_customers] from check rdap_domain_age: swiftgov-ai.com was registered in March 2026 (five months before this pitch); the pitch states the company has served state governments since 2016, and none of the claimed government customers could be verified in public records.",
      "Public-source searches did not converge on a registered legal entity for this vendor.",
    ],
  },
  ledger: [
    {
      id: "swg-L1",
      dimension: "D2",
      claim_quote:
        "Because we hold a Sourcewell cooperative contract, your team can skip the RFP entirely",
      what_checked:
        "Sourcewell's published contract holder list, under the vendor name, the product name, and common resellers",
      result: "CONTRADICTED",
      evidence_tier: "T1",
      severity: "CRITICAL",
      sources: [
        {
          url: "https://www.sourcewell-mn.gov/contract-search",
          title: "Sourcewell contract search",
          retrieved_at: RETRIEVED,
        },
      ],
      note: "We searched Sourcewell's published contract holder list on Aug 28, 2026 for SwiftGov AI, GovAssist, and common reseller names, and did not find a matching contract. Sourcewell publishes the authoritative list of its own contract holders, so this claim is contradicted by the record that would normally support it. The vendor can resolve this instantly by providing a contract number. Also note: a cooperative contract does not by itself let an agency skip its procurement rules; check with your purchasing office.",
      methodology_ref: "d2-2",
    },
    {
      id: "swg-L2",
      dimension: "D1",
      claim_quote: "SwiftGov AI has been serving state governments since 2016",
      what_checked:
        "Domain registration date and web history against the claimed ten-year track record",
      result: "CONTRADICTED",
      evidence_tier: "T1",
      severity: "HIGH",
      sources: [
        {
          url: "https://rdap.org/domain/swiftgov-ai.com",
          title: "RDAP registration record for swiftgov-ai.com",
          retrieved_at: RETRIEVED,
        },
        {
          url: "https://web.archive.org/cdx/search/cdx?url=swiftgov-ai.com",
          title: "Wayback Machine capture index",
          retrieved_at: RETRIEVED,
        },
      ],
      note: "The domain swiftgov-ai.com was registered in March 2026 (RDAP), and the Wayback Machine's first capture of the site is from May 2026. A company can be older than its current domain, but we found no earlier domain, entity, or press record either. The registration date is a public record that sits against the claim of a decade of state government work.",
      methodology_ref: "d1-4",
    },
    {
      id: "swg-L3",
      dimension: "D1",
      claim_quote: null,
      what_checked:
        "Corporate registration under the names SwiftGov AI and GovAssist in searchable state registries",
      result: "COULD_NOT_VERIFY",
      evidence_tier: "T4",
      severity: null,
      sources: [],
      note: "We searched the state corporate registries our tools can reach on Aug 28, 2026 and did not find a registration matching SwiftGov AI. Not every state's registry is freely searchable, so absence from these sources is not proof the company is unregistered. The pitch does not name a legal entity or state of incorporation, which the vendor could provide in one sentence.",
      methodology_ref: "d1-1",
    },
    {
      id: "swg-L4",
      dimension: "D3",
      claim_quote:
        "the only AI platform that is FedRAMP certified, HIPAA certified, and CJIS certified out of the box",
      what_checked:
        "The FedRAMP Marketplace feed, and the claim's wording against how these programs actually work",
      result: "COULD_NOT_VERIFY",
      evidence_tier: "T1",
      severity: "HIGH",
      sources: [
        {
          url: "https://marketplace.fedramp.gov/",
          title: "FedRAMP Marketplace",
          retrieved_at: RETRIEVED,
        },
      ],
      note: "FedRAMP's recognized statuses are Ready, In Process, and Authorized; 'FedRAMP certified' is not one of them, and we did not find the vendor in the FedRAMP Marketplace on Aug 28, 2026. Separately, no body issues a 'HIPAA certification' or a 'CJIS certification'; those regimes work through signed agreements and audits, not certificates. Ask the vendor which specific authorization, agreement, or audit sits behind each claim.",
      methodology_ref: "d3-5",
    },
    {
      id: "swg-L5",
      dimension: "D2",
      claim_quote:
        "our GovAssist platform now powers resident services for 14 states and over 200 agencies",
      what_checked:
        "Federal spending records, state AI inventories, .gov site mentions, and news coverage for any of the claimed deployments",
      result: "COULD_NOT_VERIFY",
      evidence_tier: "T4",
      severity: null,
      sources: [],
      note: "We searched USAspending, public state AI inventories, .gov sites, and news coverage on Aug 28, 2026 and did not find a government deployment of GovAssist or SwiftGov AI. Fourteen state deployments would normally leave many public traces: contracts, board agendas, press coverage. Absence from these sources is not proof the claim is false; it does mean none of it could be confirmed.",
      methodology_ref: "d2-4",
    },
    {
      id: "swg-L6",
      dimension: "D6",
      claim_quote:
        "Agencies using GovAssist have cut call center costs by 60 percent, guaranteed",
      what_checked:
        "Any published methodology, named deployment, or independent source behind the savings figure",
      result: "COULD_NOT_VERIFY",
      evidence_tier: "T4",
      severity: "HIGH",
      sources: [],
      note: "A savings figure with no named agency, no measurement method, and no time period cannot be evaluated, and we found no public source for it. Promises of specific future savings are a claim class that has drawn federal enforcement attention when unsupported. If the vendor responds, ask which deployment produced the figure and how it was measured.",
      methodology_ref: "d6-2",
    },
    {
      id: "swg-L7",
      dimension: "D2",
      claim_quote: "One state saved $11M in the first year alone.",
      what_checked:
        "News coverage and state budget documents for the claimed savings",
      result: "COULD_NOT_VERIFY",
      evidence_tier: "T4",
      severity: null,
      sources: [],
      note: "We searched news coverage and public budget documents on Aug 28, 2026 and did not find a state reporting these savings from this vendor. A verified figure of this size would normally be citable to a named state and document.",
      methodology_ref: "d2-7",
    },
    {
      id: "swg-L8",
      dimension: "D5",
      claim_quote: "Blake Morrow, Chief Growth Officer",
      what_checked:
        "Public records for the named executive independent of the vendor's own site",
      result: "COULD_NOT_VERIFY",
      evidence_tier: "T4",
      severity: null,
      sources: [],
      note: "We searched news archives and conference programs on Aug 28, 2026 and could not verify the named executive in any source independent of the vendor. People early in their careers can have thin public footprints, so this is logged as could-not-verify, nothing more.",
      methodology_ref: "d5-1",
    },
    {
      id: "swg-L9",
      dimension: "D6",
      claim_quote:
        "federal AI modernization funds must be obligated by the end of this quarter, and we are limiting onboarding to five more agencies this cycle",
      what_checked:
        "The deadline claim, and the pressure pattern in the pitch",
      result: "COULD_NOT_VERIFY",
      evidence_tier: "T4",
      severity: "MEDIUM",
      sources: [],
      note: "We did not find a federal funding program matching the deadline described. Deadline pressure, scarcity ('five more agencies'), and a request to sign before a demo are patterns to slow down on. Public procurement has no reason to move at vendor speed.",
      methodology_ref: "d6-4",
    },
  ],
  green_flags: [],
  adv_findings: [],
  honesty_panel: [
    {
      check_id: "sos_registration",
      label: "State corporate registration",
      status: "could_not_check",
      reason:
        "No legal entity name or state given in the pitch; searchable registries returned no match. Ask the vendor for both.",
    },
    {
      check_id: "sam_entity",
      label: "SAM.gov entity registration",
      status: "could_not_check",
      reason: "No match found; without a legal name a definitive search is not possible.",
    },
    {
      check_id: "sam_exclusions",
      label: "Federal debarment and exclusions",
      status: "could_not_check",
      reason:
        "Exclusion checks require a confirmed legal identity; none was established.",
    },
    {
      check_id: "rdap_domain_age",
      label: "Domain age vs. claimed track record",
      status: "flag",
      reason: null,
    },
    {
      check_id: "wayback_history",
      label: "Web operating history (Wayback Machine)",
      status: "flag",
      reason: null,
    },
    {
      check_id: "dns_mx",
      label: "Email sent from the corporate domain",
      status: "pass",
      reason: null,
    },
    {
      check_id: "usaspending",
      label: "Federal payment records",
      status: "not_applicable",
      reason: "No federal customers claimed; the search ran and returned nothing.",
    },
    {
      check_id: "sourcewell",
      label: "Sourcewell cooperative contract list",
      status: "flag",
      reason: null,
    },
    {
      check_id: "fedramp_feed",
      label: "FedRAMP Marketplace",
      status: "flag",
      reason: null,
    },
    {
      check_id: "govramp_list",
      label: "GovRAMP program participants",
      status: "not_applicable",
      reason: "No GovRAMP claim made.",
    },
    {
      check_id: "cert_vocabulary",
      label: "Certification claims that match real programs",
      status: "flag",
      reason: null,
    },
    {
      check_id: "state_checkbook",
      label: "State payment records for named customers",
      status: "could_not_check",
      reason:
        "The pitch names no specific agency, so there is nothing to search a checkbook for.",
    },
    {
      check_id: "ai_inventory",
      label: "Public state AI inventories",
      status: "flag",
      reason: null,
    },
    {
      check_id: "linkedin_headcount",
      label: "Staff footprint vs. claims",
      status: "could_not_check",
      reason:
        "LinkedIn does not permit automated checks. A 60-second manual check card is included below.",
    },
    {
      check_id: "urgency_language",
      label: "Urgency or pressure language",
      status: "flag",
      reason: null,
    },
    {
      check_id: "github_org",
      label: "Public engineering footprint",
      status: "could_not_check",
      reason: "No public engineering artifacts found under the vendor or product name.",
    },
  ],
  questions: [
    {
      id: "gap-sourcewell",
      text: "Please provide your cooperative contract number and a link to the cooperative's own listing for it, so we can confirm the contract in the cooperative's published holder list.",
      why: "The cooperative contract described in the pitch was absent from the cooperative's own published list when we checked.",
      source: "gap",
    },
    {
      id: "gap-domain-age",
      text: "Your materials describe a multi-year track record. Please list the legal entity name and founding year, any prior company names, and two customers from that earlier period we may contact.",
      why: "The company's web presence is much newer than the history described.",
      source: "gap",
    },
    {
      id: "gap-fedramp_marketplace",
      text: "Please provide the exact authorization your product holds: the program (FedRAMP or GovRAMP), the status level, the package or listing ID, and the sponsoring agency, so we can confirm it in the public marketplace.",
      why: "The authorization described in the pitch did not match the public feed when we checked.",
      source: "gap",
    },
    {
      id: "perf-swg-c6",
      text: 'Your materials state: "Agencies using GovAssist have cut call center costs by 60 percent, guaranteed". Which deployment produced this figure, measured how, over what period, and may we contact that organization?',
      why: "Performance numbers need a methodology and a named reference before they can inform a decision.",
      source: "claim",
    },
    {
      id: "gap-cert-vocab",
      text: "For each certification your materials name, please provide the issuing body, the audit or certification date, and the exact product covered.",
      why: "The pitch uses certification language we could not match to a recognized program.",
      source: "gap",
    },
    {
      id: "t4-d5",
      text: "For each person your materials name, please share one independent public reference we can check.",
      why: "We searched public sources and could not corroborate items in this area. Documents from you close the gap fastest.",
      source: "gap",
    },
    {
      id: "core-data-training",
      text: "Will you sign a contract clause permanently prohibiting the use of our data to train any model, yours or a subprocessor's, absent our written consent?",
      why: "The single most common gap in government AI contracts.",
      source: "core",
    },
    {
      id: "core-export",
      text: "At contract end, what do we get back? Confirm no-cost machine-readable export of all our data and configurations, and name the format.",
      why: "Protects you from lock-in before it starts.",
      source: "core",
    },
    {
      id: "core-references",
      text: "Which government agencies use this product today? Are you listed in the GovAI Coalition registry, a state AI inventory, or a cooperative contract we can check?",
      why: "Verifiable references are the fastest path from pitch to informed conversation.",
      source: "core",
    },
    {
      id: "core-breach",
      text: "Define a reportable incident under our contract, your notification timeline, and who pays for breach response.",
      why: "Incident terms are cheapest to fix before signature.",
      source: "core",
    },
    {
      id: "core-pricing",
      text: "Provide the complete pricing structure: platform, usage, integration, support, and every trigger that changes our bill, including a surge scenario.",
      why: "Surprise overage economics are a recurring failure mode in AI contracts.",
      source: "core",
    },
  ],
  manual_checks: [
    {
      id: "swg-m1",
      label: "Search Sourcewell yourself (60 seconds)",
      instructions:
        "Open Sourcewell's contract search and type the vendor name and the product name. This is the same search we ran, and it is the fastest way to test the pitch's central procurement claim.",
      link: "https://www.sourcewell-mn.gov/contract-search",
      what_bad_looks_like:
        "No results for the vendor or product, or the vendor cannot produce a contract number when asked.",
    },
    {
      id: "swg-m2",
      label: "Search your state's business registry",
      instructions:
        "Open your Secretary of State's business search and look for SwiftGov AI. If the vendor gives you a legal entity name, search that exact name and check the status and formation date.",
      link: "https://www.nass.org/business-services/corporate-registration",
      what_bad_looks_like:
        "No registration anywhere the vendor claims to operate, or a formation date that contradicts the company story.",
    },
    {
      id: "swg-m3",
      label: "Check the FedRAMP Marketplace",
      instructions:
        "Search the FedRAMP Marketplace for the vendor and product. Every authorized cloud product appears there with its status and sponsoring agency.",
      link: "https://marketplace.fedramp.gov/",
      what_bad_looks_like:
        "The product is absent, or the vendor keeps using the word 'certified' instead of naming a real status.",
    },
  ],
  next_steps: [
    "Do not schedule the demo yet, and do not sign the letter of intent. Nothing in public procurement requires a decision this week.",
    "Reply with the first three questions in the pack: legal entity, Sourcewell contract number, and two named references. Each takes the vendor one sentence to answer.",
    "If the vendor provides documents, re-run this check with the new information. Reports can change when the record does.",
    "If the vendor believes this report is wrong, the report-an-error link goes to a review with a five-business-day turnaround.",
    "Forward this report to your procurement office before any further contact.",
  ],
  sector: {
    pack_ids: ["call-center"],
    elevated: false,
    overlay_reason: null,
    state_items: [],
  },
  sources: [
    {
      url: "https://www.sourcewell-mn.gov/contract-search",
      title: "Sourcewell contract search",
      retrieved_at: RETRIEVED,
    },
    {
      url: "https://rdap.org/domain/swiftgov-ai.com",
      title: "RDAP registration record",
      retrieved_at: RETRIEVED,
    },
    {
      url: "https://web.archive.org/cdx/search/cdx?url=swiftgov-ai.com",
      title: "Wayback Machine capture index",
      retrieved_at: RETRIEVED,
    },
    {
      url: "https://marketplace.fedramp.gov/",
      title: "FedRAMP Marketplace",
      retrieved_at: RETRIEVED,
    },
    {
      url: "https://www.usaspending.gov/search/?keyword=swiftgov-sample",
      title: "USAspending award search",
      retrieved_at: RETRIEVED,
    },
  ],
  review: {
    reviewed: true,
    model: "claude-haiku-4-5",
    adjustments: [
      "Softened two ledger notes to absence-of-evidence phrasing.",
      "Added the dispute-channel sentence to the verdict summary.",
    ],
  },
  meta: {
    generated_at: GENERATED_AT,
    expires_at: EXPIRES_AT,
    methodology_version: "1.0",
    pack_release: "2026.08",
    vendor_key: "swiftgov-ai.com",
    vendor_display_name: "SwiftGov AI (sample, fictional)",
    research_partial: false,
    input_kind: "paste",
  },
};

/* ------------------------------------------------------------ ClaraDocs (T3) */

const claradocsReport: Report = {
  verdict: {
    tier: 3,
    label: TIER_LABELS[3],
    summary:
      "A young vendor whose claims are consistent with public records. The Colorado registration, the SEC filing, and the domain history all match the story the pitch tells, and the pitch avoids the inflated claims we screen for. Early-stage is not a defect: the checklist below is calibrated to what a nine-person company should be able to produce, not to what a ten-year platform vendor would have.",
    checks_met: { met: 4, total: 7 },
    rationale: [
      "Identity verified on two independent identifiers: Colorado Secretary of State registration and an SEC Form D filing.",
      "No high-severity findings; every checked claim was either verified or is normal for a company at this stage.",
      "The vendor meets the startup calibration bar: a completed SOC 2 Type I, a named auditor engaged for Type II, and one government pilot offered as a reference.",
    ],
  },
  ledger: [
    {
      id: "cla-L1",
      dimension: "D1",
      claim_quote: "we incorporated in Colorado in 2024",
      what_checked: "Colorado Secretary of State business registry",
      result: "VERIFIED",
      evidence_tier: "T1",
      severity: null,
      sources: [
        {
          url: "https://www.sos.state.co.us/biz/BusinessEntityDetail-sample",
          title: "Colorado SoS: ClaraDocs, Inc. (sample entry)",
          retrieved_at: RETRIEVED,
        },
      ],
      note: "The Colorado Secretary of State shows ClaraDocs, Inc. in good standing, formed May 2024, with a Denver principal address. The registration matches the incorporation claim in the pitch exactly.",
      methodology_ref: "d1-1",
    },
    {
      id: "cla-L2",
      dimension: "D1",
      claim_quote:
        "we closed a seed round last fall (our SEC Form D is on file if you want to look)",
      what_checked: "SEC EDGAR full-text search for the vendor's filings",
      result: "VERIFIED",
      evidence_tier: "T1",
      severity: null,
      sources: [
        {
          url: "https://efts.sec.gov/LATEST/search-index?q=%22ClaraDocs%22-sample",
          title: "SEC EDGAR: Form D, ClaraDocs Inc. (sample entry)",
          retrieved_at: RETRIEVED,
        },
      ],
      note: "SEC EDGAR shows a Form D filed October 2025 for ClaraDocs, Inc., Colorado, reporting an exempt securities offering consistent with a seed round. The filing's officer names match the pitch.",
      methodology_ref: "d1-1",
    },
    {
      id: "cla-L3",
      dimension: "D1",
      claim_quote: null,
      what_checked: "Domain registration date and site history",
      result: "OFFICIAL_RECORD_FOUND",
      evidence_tier: "T1",
      severity: null,
      sources: [
        {
          url: "https://rdap.org/domain/claradocs.io",
          title: "RDAP registration record for claradocs.io",
          retrieved_at: RETRIEVED,
        },
      ],
      note: "claradocs.io was registered in June 2024, shortly after incorporation. A young domain at a young company is exactly what it should be; the pitch makes no claim the domain age would contradict.",
      methodology_ref: "d1-4",
    },
    {
      id: "cla-L4",
      dimension: "D2",
      claim_quote:
        "We are running a paid pilot with a Colorado county clerk's office and can connect you with them directly",
      what_checked:
        "Public traces of the claimed pilot: county sites, meeting agendas, news",
      result: "COULD_NOT_VERIFY",
      evidence_tier: "T4",
      severity: null,
      sources: [],
      note: "We searched Colorado county sites, meeting agendas, and news coverage on Aug 28, 2026 and did not find a public record of this pilot. Small pilots often leave no public trace, so this is normal, not adverse. The vendor offered a direct reference; the manual checks below take them up on it.",
      methodology_ref: "d2-4",
    },
    {
      id: "cla-L5",
      dimension: "D3",
      claim_quote:
        "We finished our SOC 2 Type I in June and our Type II audit window is underway with Ridgeline Assurance CPAs",
      what_checked:
        "SOC 2 status (no public registry exists) and the named auditor",
      result: "COULD_NOT_VERIFY",
      evidence_tier: "T4",
      severity: null,
      sources: [],
      note: "There is no public registry of SOC 2 reports, so the claim cannot be checked from public sources. Naming the audit firm and the Type II window is the honest version of this claim, and both parts are easy to confirm: ask for the Type I letter and verify the CPA firm in the NASBA registry (link in your manual checks).",
      methodology_ref: "d3-6",
    },
    {
      id: "cla-L6",
      dimension: "D4",
      claim_quote:
        "we build on commercial language models, we add the government-records layer, and we show our work on every extraction",
      what_checked:
        "The vendor's published product documentation against the pitch's architecture description",
      result: "VERIFIED",
      evidence_tier: "T2",
      severity: null,
      sources: [
        {
          url: "https://claradocs.io/docs/how-it-works",
          title: "Vendor product documentation (vendor-published, sample)",
          retrieved_at: RETRIEVED,
        },
      ],
      note: "According to the vendor's own documentation, the product runs on named commercial models with a review interface that shows source passages for each extracted field. This is the vendor describing itself, graded as vendor-published evidence, and it matches the pitch. Vendors that overstate usually claim a proprietary model; this one does the opposite.",
      methodology_ref: "d4-1",
    },
    {
      id: "cla-L7",
      dimension: "D4",
      claim_quote: "Nothing goes out the door without a person signing off.",
      what_checked:
        "Whether the human-review claim is reflected in the product's documented workflow",
      result: "VERIFIED",
      evidence_tier: "T2",
      severity: null,
      sources: [
        {
          url: "https://claradocs.io/docs/review-workflow",
          title: "Vendor review-workflow documentation (sample)",
          retrieved_at: RETRIEVED,
        },
      ],
      note: "The vendor's documentation describes a mandatory human approval step for redactions and outbound documents. For records work this is the design you want; the demo should show what happens when a reviewer rejects an extraction.",
      methodology_ref: "d4-3",
    },
    {
      id: "cla-L8",
      dimension: "D5",
      claim_quote: "Priya Raman, Co-founder",
      what_checked:
        "Public records for the named co-founder independent of the vendor's site",
      result: "VERIFIED",
      evidence_tier: "T3",
      severity: null,
      sources: [
        {
          url: "https://www.statescoop.com/sample/records-automation-panel-2026",
          title: "StateScoop event coverage naming the co-founder (sample)",
          retrieved_at: RETRIEVED,
        },
      ],
      note: "The co-founder appears in independent event coverage from March 2026 and is listed as an officer on the Form D filing, giving two independent identifiers. Matched on name plus company.",
      methodology_ref: "d5-1",
    },
    {
      id: "cla-L9",
      dimension: "D6",
      claim_quote: null,
      what_checked:
        "The pitch's claims hygiene: accuracy numbers, savings promises, urgency language",
      result: "VERIFIED",
      evidence_tier: "T1",
      severity: null,
      sources: [],
      note: "The pitch contains no unqualified accuracy figures, no savings promises, and no deadline pressure, and it volunteers its own limitations. Claims hygiene this clean is itself a finding worth recording.",
      methodology_ref: "d6-1",
    },
  ],
  green_flags: [
    "Colorado registration (May 2024) matches the incorporation claim exactly.",
    "SEC Form D on file for the claimed seed round, with matching officer names.",
    "Domain history consistent with the company's age; nothing to contradict.",
    "The pitch describes its architecture honestly, including what it builds on.",
    "Mandatory human review is documented in the product, not just claimed.",
    "The co-founder verifies on two independent identifiers.",
    "No accuracy numbers, savings promises, or urgency language anywhere in the pitch.",
    "The vendor volunteers a named auditor and a reference before being asked.",
  ],
  adv_findings: [],
  honesty_panel: [
    {
      check_id: "sos_registration",
      label: "State corporate registration",
      status: "pass",
      reason: null,
    },
    {
      check_id: "edgar_form_d",
      label: "SEC EDGAR filings",
      status: "pass",
      reason: null,
    },
    {
      check_id: "sam_entity",
      label: "SAM.gov entity registration",
      status: "not_applicable",
      reason:
        "No SAM record found. Normal for a vendor that has not pursued federal work; not counted against anyone.",
    },
    {
      check_id: "sam_exclusions",
      label: "Federal debarment and exclusions",
      status: "pass",
      reason: null,
    },
    {
      check_id: "rdap_domain_age",
      label: "Domain age vs. claimed track record",
      status: "pass",
      reason: null,
    },
    {
      check_id: "wayback_history",
      label: "Web operating history (Wayback Machine)",
      status: "pass",
      reason: null,
    },
    {
      check_id: "dns_mx",
      label: "Email sent from the corporate domain",
      status: "pass",
      reason: null,
    },
    {
      check_id: "usaspending",
      label: "Federal payment records",
      status: "not_applicable",
      reason: "No federal customers claimed; absence is expected and neutral.",
    },
    {
      check_id: "sourcewell",
      label: "Cooperative contract lists",
      status: "not_applicable",
      reason: "No cooperative contract claimed.",
    },
    {
      check_id: "fedramp_feed",
      label: "FedRAMP Marketplace",
      status: "not_applicable",
      reason: "No FedRAMP claim made, and none expected at this stage.",
    },
    {
      check_id: "govramp_list",
      label: "GovRAMP program participants",
      status: "could_not_check",
      reason:
        "Not on the list, and the vendor did not claim to be. The next steps suggest asking about GovRAMP's low-cost Snapshot program.",
    },
    {
      check_id: "soc2_report",
      label: "SOC 2 attestation",
      status: "could_not_check",
      reason:
        "No public registry of SOC 2 reports exists. Ask for the Type I letter; verify the auditor via the NASBA registry link below.",
    },
    {
      check_id: "state_checkbook",
      label: "County payment records for the claimed pilot",
      status: "could_not_check",
      reason:
        "The county was not named in the pitch, and most Colorado county checkbooks require a manual search. Ask which county, then search its spending portal.",
    },
    {
      check_id: "linkedin_headcount",
      label: "Staff footprint vs. claims",
      status: "could_not_check",
      reason:
        "LinkedIn does not permit automated checks. A 60-second manual check card is included below.",
    },
    {
      check_id: "github_org",
      label: "Public engineering footprint",
      status: "pass",
      reason: null,
    },
    {
      check_id: "urgency_language",
      label: "Urgency or pressure language",
      status: "pass",
      reason: null,
    },
  ],
  questions: [
    {
      id: "document-processing-q01",
      text: "What field-level accuracy do you achieve on documents like ours, and will you demonstrate it in a pilot on 250–1,000 of our real documents, including faxes, phone photos, and handwriting?",
      why: "A standard question for Document Processing & Intake (IDP) vendors. A credible answer: A field-level number with methodology, and an unhesitating yes to a pilot on your real document mix.",
      source: "pack",
      red_flag:
        'One blended "99%" figure, or benchmark scores from public datasets instead of your documents.',
    },
    {
      id: "document-processing-q02",
      text: "Is that character, field, or document accuracy? Define the denominator.",
      why: "A standard question for Document Processing & Intake (IDP) vendors. A credible answer: A precise definition. 99% character accuracy can mean roughly 80% field accuracy and far lower document-level accuracy.",
      source: "pack",
      red_flag: "The vendor cannot or will not say what the denominator is.",
    },
    {
      id: "document-processing-q03",
      text: "What straight-through-processing rate do your government customers achieve in production, and how do you define STP?",
      why: "A standard question for Document Processing & Intake (IDP) vendors. A credible answer: Production numbers in the 65–84% range with a clear definition. Covered California reports 84%; California DMV reports 65–70%.",
      source: "pack",
      red_flag: "Claims above 90% before any pilot on your documents.",
    },
    {
      id: "document-processing-q04",
      text: "Show the human review workflow: how do confidence scores route low-confidence fields, who staffs the queue, and what does that labor cost at our volume?",
      why: "A standard question for Document Processing & Intake (IDP) vendors. A credible answer: A concrete routing design, a staffing model, and a cost estimate at your volume.",
      source: "pack",
      red_flag:
        '"No human review needed." Mature agencies mandate review at any accuracy level.',
    },
    {
      id: "document-processing-q05",
      text: "If we sample 100 fields you marked at 90% confidence or higher, how many will be wrong?",
      why: "A standard question for Document Processing & Intake (IDP) vendors. A credible answer: A direct number backed by calibration data. Ten or fewer is consistent with the stated confidence.",
      source: "pack",
      red_flag:
        "More than 10 wrong signals miscalibrated confidence scores; no answer signals it has never been measured.",
    },
    {
      id: "gap-governance",
      text: "Do you maintain an AI governance program aligned to the NIST AI Risk Management Framework or ISO/IEC 42001? Please share the artifact that shows it, such as a certificate, an audit letter, or the policy document itself.",
      why: "A governance baseline is the fastest way to see how a vendor manages model risk.",
      source: "core",
    },
    {
      id: "t4-d2",
      text: "For the government customers your materials describe, please provide two references we may contact, including each contract administrator.",
      why: "We searched public sources and could not corroborate items in this area. Documents from you close the gap fastest.",
      source: "gap",
    },
    {
      id: "t4-d3",
      text: "Please share your current security documents directly: the SOC 2 report under NDA, your latest penetration test summary, or the equivalent evidence for the frameworks you claim.",
      why: "We searched public sources and could not corroborate items in this area. Documents from you close the gap fastest.",
      source: "gap",
    },
    {
      id: "core-data-training",
      text: "Will you sign a contract clause permanently prohibiting the use of our data to train any model, yours or a subprocessor's, absent our written consent?",
      why: "The single most common gap in government AI contracts.",
      source: "core",
    },
    {
      id: "core-export",
      text: "At contract end, what do we get back? Confirm no-cost machine-readable export of all our data and configurations, and name the format.",
      why: "Protects you from lock-in before it starts.",
      source: "core",
    },
    {
      id: "core-references",
      text: "Which government agencies use this product today? Are you listed in the GovAI Coalition registry, a state AI inventory, or a cooperative contract we can check?",
      why: "Verifiable references are the fastest path from pitch to informed conversation.",
      source: "core",
    },
    {
      id: "core-breach",
      text: "Define a reportable incident under our contract, your notification timeline, and who pays for breach response.",
      why: "Incident terms are cheapest to fix before signature.",
      source: "core",
    },
    {
      id: "core-pricing",
      text: "Provide the complete pricing structure: platform, usage, integration, support, and every trigger that changes our bill, including a surge scenario.",
      why: "Surprise overage economics are a recurring failure mode in AI contracts.",
      source: "core",
    },
  ],
  manual_checks: [
    {
      id: "cla-m1",
      label: "LinkedIn team check (60 seconds)",
      instructions:
        "Search LinkedIn for people listing ClaraDocs as their employer. The pitch says nine people; you should see most of them, including both co-founders.",
      link: "https://www.linkedin.com/search/results/people/?keywords=ClaraDocs",
      what_bad_looks_like:
        "Far fewer profiles than the claimed team size, or no engineers at a company selling software.",
    },
    {
      id: "cla-m2",
      label: "Verify the audit firm",
      instructions:
        "Search the NASBA Accountancy Licensee Database for Ridgeline Assurance CPAs to confirm the named SOC 2 auditor is a licensed CPA firm.",
      link: "https://ald.nasba.org/search/cpa",
      what_bad_looks_like:
        "The firm does not appear in any state's licensee records, or the vendor will not name its auditor.",
    },
    {
      id: "cla-m3",
      label: "Call the pilot county",
      instructions:
        "Once the vendor names the county, call the clerk's office and ask: is the pilot live, what does it handle, and would they expand it?",
      link: null,
      what_bad_looks_like:
        "The county does not recognize the vendor, or describes a demo rather than a paid pilot.",
    },
  ],
  next_steps: [
    "A demo is reasonable here. Send the question pack first so the vendor can bring answers.",
    "Structure any pilot in writing: flat price, defined batch, exit clause, data deletion with written attestation, and no training on your data.",
    "Run the three manual checks; the auditor and reference checks are the two that matter most.",
    "Loop in your records counsel on the redaction workflow before production use.",
    "Re-run this check before moving from pilot to contract. Young companies change fast, in both directions.",
  ],
  sector: {
    pack_ids: ["document-processing"],
    elevated: false,
    overlay_reason: null,
    state_items: [],
    decision_impact: "advisory",
  },
  sources: [
    {
      url: "https://www.sos.state.co.us/biz/BusinessEntityDetail-sample",
      title: "Colorado Secretary of State business registry",
      retrieved_at: RETRIEVED,
    },
    {
      url: "https://efts.sec.gov/LATEST/search-index?q=%22ClaraDocs%22-sample",
      title: "SEC EDGAR full-text search",
      retrieved_at: RETRIEVED,
    },
    {
      url: "https://rdap.org/domain/claradocs.io",
      title: "RDAP registration record",
      retrieved_at: RETRIEVED,
    },
    {
      url: "https://claradocs.io/docs/how-it-works",
      title: "Vendor product documentation (vendor-published)",
      retrieved_at: RETRIEVED,
    },
    {
      url: "https://claradocs.io/docs/review-workflow",
      title: "Vendor review-workflow documentation (vendor-published)",
      retrieved_at: RETRIEVED,
    },
    {
      url: "https://www.statescoop.com/sample/records-automation-panel-2026",
      title: "StateScoop event coverage",
      retrieved_at: RETRIEVED,
    },
  ],
  review: {
    reviewed: true,
    model: "claude-haiku-4-5",
    adjustments: [
      "Reframed the pilot ledger row from a gap to a neutral could-not-verify with the reference path.",
    ],
  },
  meta: {
    generated_at: GENERATED_AT,
    expires_at: EXPIRES_AT,
    methodology_version: "1.0",
    pack_release: "2026.08",
    vendor_key: "claradocs.io",
    vendor_display_name: "ClaraDocs (sample, fictional)",
    research_partial: false,
    input_kind: "paste",
  },
};

/* -------------------------------------------------------------- Kestrel (T2) */

const kestrelReport: Report = {
  verdict: {
    tier: 2,
    label: TIER_LABELS[2],
    summary:
      "This vendor is a registered, active Ohio corporation, and one named customer is confirmed in that city's own published council minutes. Two things stand between this pitch and a demo. First, the pitch describes cities using Kestrel since 2018, while the domain was registered in February 2024 and the corporation was formed in June 2024; we found no earlier entity or product. Second, the largest numbers in the pitch have no public source we could find. The questions below resolve both, and a company with the claimed footprint can answer them in a day.",
    checks_met: { met: 3, total: 7 },
    rationale: [
      "Unresolved HIGH finding in D1: the pitch describes cities running permit reviews on Kestrel since 2018, but the domain kestrelpermit.ai was registered in February 2024 (RDAP, checked Aug 28, 2026) and the Ohio corporation was formed in June 2024.",
      "Unresolved HIGH finding in D6: an absolute performance claim (93 percent of routine permits approved automatically with zero errors) has no published methodology or named deployment behind it.",
      "Identity resolved on two independent identifiers: an active Ohio corporate registration and the company's operating domain.",
      "One dimension carries verified green evidence: the City of Fairview Heights pilot appears in the city's own published council minutes (retrieved Aug 28, 2026).",
    ],
  },
  ledger: [
    {
      id: "kes-L1",
      dimension: "D1",
      claim_quote: null,
      what_checked: "Corporate registration under the vendor's legal name",
      result: "OFFICIAL_RECORD_FOUND",
      evidence_tier: "T1",
      severity: null,
      sources: [
        {
          url: "https://businesssearch.ohiosos.gov/?sample",
          title: "Ohio Secretary of State business search",
          retrieved_at: RETRIEVED,
        },
      ],
      note: "The Ohio Secretary of State shows Kestrel Permit AI, Inc. as an active corporation, formed June 2024, with a Columbus registered agent. The company is real and in good standing. The formation date matters for the track-record claim tested below.",
      methodology_ref: "d1-1",
    },
    {
      id: "kes-L2",
      dimension: "D2",
      claim_quote:
        "the City of Fairview Heights, Ohio approved a Kestrel pilot this spring",
      what_checked:
        "Whether the named customer's own public records confirm the relationship",
      result: "VERIFIED",
      evidence_tier: "T1",
      severity: null,
      sources: [
        {
          url: "https://www.fairviewheights.oh.gov/council/minutes/2026-03-17-sample",
          title: "City of Fairview Heights council minutes",
          retrieved_at: RETRIEVED,
        },
      ],
      note: "The March 17, 2026 minutes of the Fairview Heights city council, published on the city's own site, approve a six-month permit-review pilot with Kestrel Permit AI. A customer confirmed in that customer's own public record is strong evidence, and it is the pitch's one named customer.",
      methodology_ref: "d2-4",
    },
    {
      id: "kes-L3",
      dimension: "D1",
      claim_quote:
        "Cities have been running permit reviews on Kestrel since 2018",
      what_checked:
        "Domain registration date and web history against the claimed track record",
      result: "CONTRADICTED",
      evidence_tier: "T1",
      severity: "HIGH",
      sources: [
        {
          url: "https://rdap.org/domain/kestrelpermit.ai",
          title: "RDAP registration record for kestrelpermit.ai",
          retrieved_at: RETRIEVED,
        },
        {
          url: "https://web.archive.org/cdx/search/cdx?url=kestrelpermit.ai",
          title: "Wayback Machine capture index",
          retrieved_at: RETRIEVED,
        },
      ],
      note: "The domain kestrelpermit.ai was registered in February 2024 (RDAP), the Wayback Machine's first capture of the site is from April 2024, and the Ohio corporation was formed in June 2024. A company can be older than its current domain, but we found no earlier domain, entity, or press record, and these dates sit against the claim that cities have run permit reviews on Kestrel since 2018. The vendor can resolve this by naming the earlier entity and two customers from that period.",
      methodology_ref: "d1-4",
    },
    {
      id: "kes-L4",
      dimension: "D6",
      claim_quote:
        "93 percent of routine permits are approved automatically with zero errors",
      what_checked:
        "Whether a published methodology or independent evaluation supports this number",
      result: "COULD_NOT_VERIFY",
      evidence_tier: "T4",
      severity: "HIGH",
      sources: [],
      note: "We searched news coverage, city sites, and the vendor's own materials on Aug 28, 2026 and found no published methodology, named deployment, or independent evaluation behind this figure. The claim includes an error rate of exactly zero, and the pitch names no measurement method that could support that at any volume. Absence of a public source is not proof the figure is wrong; it does mean the figure cannot inform a decision yet.",
      methodology_ref: "d6-1",
    },
    {
      id: "kes-L5",
      dimension: "D2",
      claim_quote: "processing 40,000 permits a month across 12 states",
      what_checked:
        "Public traces of the claimed footprint: council agendas, procurement awards, budget documents, news coverage",
      result: "COULD_NOT_VERIFY",
      evidence_tier: "T4",
      severity: null,
      sources: [],
      note: "A footprint of 40,000 permits a month across 12 states would normally leave many public traces: council agendas, procurement awards, budget lines, news coverage. We searched these sources on Aug 28, 2026 and confirmed one city, the Fairview Heights pilot approved in March 2026. Absence from public sources is not proof the claim is false; it does mean the footprint beyond that one pilot could not be confirmed.",
      methodology_ref: "d2-4",
    },
    {
      id: "kes-L6",
      dimension: "D3",
      claim_quote: "We are SOC 2 Type II audited",
      what_checked: "SOC 2 attestation (no public registry exists for SOC 2)",
      result: "COULD_NOT_VERIFY",
      evidence_tier: "T4",
      severity: null,
      sources: [],
      note: "There is no public registry of SOC 2 reports, so this cannot be checked from public sources, and that is true for every vendor. Ask for the report under NDA and check three things: the type (Type II covers a period, Type I a single date), the covered period, and whether the scope includes the permitting product.",
      methodology_ref: "d3-6",
    },
    {
      id: "kes-L7",
      dimension: "D5",
      claim_quote:
        "Our CEO, Rachel Odom, spent nine years running a city permitting counter",
      what_checked:
        "Public records for the named CEO independent of the vendor's site",
      result: "COULD_NOT_VERIFY",
      evidence_tier: "T4",
      severity: null,
      sources: [],
      note: "We searched news archives and conference programs on Aug 28, 2026 and did not find the named CEO in sources independent of the vendor. People can have thin public footprints, so this is logged as could-not-verify and nothing more. A nine-year permitting career should be easy for the vendor to document; the question pack asks which city and what role.",
      methodology_ref: "d5-1",
    },
    {
      id: "kes-L8",
      dimension: "D4",
      claim_quote:
        "Kestrel runs on our own permitting model, trained on millions of municipal permit decisions",
      what_checked:
        "Public documentation of the claimed proprietary permitting model",
      result: "COULD_NOT_VERIFY",
      evidence_tier: "T4",
      severity: null,
      sources: [],
      note: "The vendor's site describes the product but publishes no technical documentation of a proprietary model, and we found no engineering posts or research elsewhere on Aug 28, 2026. Training a model from scratch is a large undertaking for a company formed in 2024. Ask whether this is a model trained from scratch, a tuned commercial model, or a rules layer on top of one. All three can work well; the answer changes your security review and your data-path questions.",
      methodology_ref: "d4-1",
    },
  ],
  green_flags: [
    "An active Ohio corporate registration is on file for the exact company name in the pitch.",
    "The Fairview Heights pilot is confirmed in the city's own published council minutes.",
    "The pitch was sent from the company's own domain, which has working mail infrastructure.",
  ],
  adv_findings: [],
  honesty_panel: [
    {
      check_id: "sos_registration",
      label: "State corporate registration",
      status: "pass",
      reason: null,
    },
    {
      check_id: "sam_entity",
      label: "SAM.gov entity registration",
      status: "not_applicable",
      reason:
        "No SAM record found. Normal for a vendor that has not pursued federal work; not counted against anyone.",
    },
    {
      check_id: "sam_exclusions",
      label: "Federal debarment and exclusions",
      status: "pass",
      reason: null,
    },
    {
      check_id: "rdap_domain_age",
      label: "Domain age vs. claimed track record",
      status: "flag",
      reason: null,
    },
    {
      check_id: "wayback_history",
      label: "Web operating history (Wayback Machine)",
      status: "flag",
      reason: null,
    },
    {
      check_id: "dns_mx",
      label: "Email sent from the corporate domain",
      status: "pass",
      reason: null,
    },
    {
      check_id: "usaspending",
      label: "Federal payment records",
      status: "not_applicable",
      reason: "No federal customers claimed; the search ran and returned nothing.",
    },
    {
      check_id: "sourcewell",
      label: "Cooperative contract lists",
      status: "not_applicable",
      reason: "No cooperative contract claimed.",
    },
    {
      check_id: "fedramp_feed",
      label: "FedRAMP Marketplace",
      status: "not_applicable",
      reason: "The pitch makes no FedRAMP claim.",
    },
    {
      check_id: "govramp_list",
      label: "GovRAMP program participants",
      status: "not_applicable",
      reason: "No GovRAMP claim made.",
    },
    {
      check_id: "soc2_report",
      label: "SOC 2 attestation",
      status: "could_not_check",
      reason:
        "No public registry of SOC 2 reports exists. Ask for the report under NDA; the question pack covers what to look for.",
    },
    {
      check_id: "state_checkbook",
      label: "State and local payment records",
      status: "could_not_check",
      reason:
        "Ohio's checkbook portal requires a manual search, and most city check registers are posted as PDFs. A manual check card is included below.",
    },
    {
      check_id: "ai_inventory",
      label: "Public state AI inventories",
      status: "could_not_check",
      reason:
        "No Kestrel deployment appears in the public state AI inventories we can read. Inventories are incomplete, so this is recorded as unavailable; the question pack asks for the customer list instead.",
    },
    {
      check_id: "linkedin_headcount",
      label: "Staff footprint vs. claims",
      status: "could_not_check",
      reason:
        "LinkedIn does not permit automated checks. A 60-second manual check card is included below.",
    },
    {
      check_id: "github_org",
      label: "Public engineering footprint",
      status: "could_not_check",
      reason:
        "No public engineering artifacts found under the vendor or product name. Common for government vendors and not counted against anyone.",
    },
    {
      check_id: "urgency_language",
      label: "Urgency or pressure language",
      status: "pass",
      reason: null,
    },
  ],
  questions: [
    {
      id: "gap-domain-age",
      text: "Your materials describe a multi-year track record. Please list the legal entity name and founding year, any prior company names, and two customers from that earlier period we may contact.",
      why: "The company's web presence is much newer than the history described.",
      source: "gap",
    },
    {
      id: "perf-kes-c6",
      text: 'Your materials state: "93 percent of routine permits are approved automatically with zero errors". Which deployment produced this figure, measured how, over what period, and may we contact that organization?',
      why: "Performance numbers need a methodology and a named reference before they can inform a decision.",
      source: "claim",
    },
    {
      id: "gap-customers",
      text: "Your materials describe processing 40,000 permits a month across 12 states. Please name at least five of the cities or counties behind that figure, with the contract administrator's contact so we may verify.",
      why: "Beyond the one confirmed pilot, the claimed footprint left no public trace we could find.",
      source: "gap",
    },
    {
      id: "document-processing-q01",
      text: "What field-level accuracy do you achieve on documents like ours, and will you demonstrate it in a pilot on 250–1,000 of our real documents, including faxes, phone photos, and handwriting?",
      why: "A standard question for Document Processing & Intake (IDP) vendors. A credible answer: A field-level number with methodology, and an unhesitating yes to a pilot on your real document mix.",
      source: "pack",
      red_flag:
        'One blended "99%" figure, or benchmark scores from public datasets instead of your documents.',
    },
    {
      id: "document-processing-q02",
      text: "Is that character, field, or document accuracy? Define the denominator.",
      why: "A standard question for Document Processing & Intake (IDP) vendors. A credible answer: A precise definition. 99% character accuracy can mean roughly 80% field accuracy and far lower document-level accuracy.",
      source: "pack",
      red_flag: "The vendor cannot or will not say what the denominator is.",
    },
    {
      id: "document-processing-q03",
      text: "What straight-through-processing rate do your government customers achieve in production, and how do you define STP?",
      why: "A standard question for Document Processing & Intake (IDP) vendors. A credible answer: Production numbers in the 65–84% range with a clear definition. Covered California reports 84%; California DMV reports 65–70%.",
      source: "pack",
      red_flag: "Claims above 90% before any pilot on your documents.",
    },
    {
      id: "document-processing-q04",
      text: "Show the human review workflow: how do confidence scores route low-confidence fields, who staffs the queue, and what does that labor cost at our volume?",
      why: "A standard question for Document Processing & Intake (IDP) vendors. A credible answer: A concrete routing design, a staffing model, and a cost estimate at your volume.",
      source: "pack",
      red_flag:
        '"No human review needed." Mature agencies mandate review at any accuracy level.',
    },
    {
      id: "document-processing-q05",
      text: "If we sample 100 fields you marked at 90% confidence or higher, how many will be wrong?",
      why: "A standard question for Document Processing & Intake (IDP) vendors. A credible answer: A direct number backed by calibration data. Ten or fewer is consistent with the stated confidence.",
      source: "pack",
      red_flag:
        "More than 10 wrong signals miscalibrated confidence scores; no answer signals it has never been measured.",
    },
    {
      id: "gap-governance",
      text: "Do you maintain an AI governance program aligned to the NIST AI Risk Management Framework or ISO/IEC 42001? Please share the artifact that shows it, such as a certificate, an audit letter, or the policy document itself.",
      why: "A governance baseline is the fastest way to see how a vendor manages model risk.",
      source: "core",
    },
    {
      id: "t4-d3",
      text: "Please share your current security documents directly: the SOC 2 report under NDA, your latest penetration test summary, or the equivalent evidence for the frameworks you claim.",
      why: "We searched public sources and could not corroborate items in this area. Documents from you close the gap fastest.",
      source: "gap",
    },
    {
      id: "core-data-training",
      text: "Will you sign a contract clause permanently prohibiting the use of our data to train any model, yours or a subprocessor's, absent our written consent?",
      why: "The single most common gap in government AI contracts.",
      source: "core",
    },
    {
      id: "core-export",
      text: "At contract end, what do we get back? Confirm no-cost machine-readable export of all our data and configurations, and name the format.",
      why: "Protects you from lock-in before it starts.",
      source: "core",
    },
    {
      id: "core-references",
      text: "Which government agencies use this product today? Are you listed in the GovAI Coalition registry, a state AI inventory, or a cooperative contract we can check?",
      why: "Verifiable references are the fastest path from pitch to informed conversation.",
      source: "core",
    },
    {
      id: "core-breach",
      text: "Define a reportable incident under our contract, your notification timeline, and who pays for breach response.",
      why: "Incident terms are cheapest to fix before signature.",
      source: "core",
    },
    {
      id: "core-pricing",
      text: "Provide the complete pricing structure: platform, usage, integration, support, and every trigger that changes our bill, including a surge scenario.",
      why: "Surprise overage economics are a recurring failure mode in AI contracts.",
      source: "core",
    },
  ],
  manual_checks: [
    {
      id: "kes-m1",
      label: "Read the council minutes yourself",
      instructions:
        "Open the March 17, 2026 Fairview Heights council minutes and find the Kestrel agenda item. Check what the council actually approved: a six-month pilot for the building department. Then compare that scope to how the pitch describes the relationship.",
      link: "https://www.fairviewheights.oh.gov/council/minutes/2026-03-17-sample",
      what_bad_looks_like:
        "The vendor describes the pilot as a long-running production deployment, or the minutes cover a smaller scope than the pitch suggests.",
    },
    {
      id: "kes-m2",
      label: "LinkedIn headcount check (60 seconds)",
      instructions:
        "Search LinkedIn for people who list Kestrel Permit AI as their current employer. An operation processing 40,000 permits a month across 12 states should show a real team: engineers, support staff, and the CEO named in the pitch.",
      link: "https://www.linkedin.com/search/results/people/?keywords=Kestrel%20Permit%20AI",
      what_bad_looks_like:
        "Only a handful of profiles, profiles created recently, or no one in engineering or support roles.",
    },
    {
      id: "kes-m3",
      label: "Check the formation date yourself",
      instructions:
        "Search the Ohio Secretary of State's business search for Kestrel Permit AI. Compare the formation date on the record (June 2024) with the history the vendor tells you in conversation.",
      link: "https://businesssearch.ohiosos.gov/",
      what_bad_looks_like:
        "The vendor keeps describing years of deployments without naming any entity or product that existed before 2024.",
    },
  ],
  next_steps: [
    "Send the first two questions in the pack (track record and customer list) before scheduling a demo. A company with the claimed footprint can answer both in a day.",
    "Call the Fairview Heights building department and ask what the pilot covers, when it went live, and how it is going. This is the one customer the public record confirms.",
    "Set the 93 percent figure aside until the vendor names the deployment, the measurement method, and the period behind it.",
    "If the vendor documents its pre-2024 history, or corrects the claim, re-run this check with the new information. Reports change when the record does.",
    "If the vendor believes this report is wrong, the report-an-error link goes to a review with a five-business-day turnaround.",
  ],
  sector: {
    pack_ids: ["document-processing"],
    elevated: false,
    overlay_reason: null,
    state_items: [],
    decision_impact: "advisory",
  },
  sources: [
    {
      url: "https://businesssearch.ohiosos.gov/?sample",
      title: "Ohio Secretary of State business search",
      retrieved_at: RETRIEVED,
    },
    {
      url: "https://www.fairviewheights.oh.gov/council/minutes/2026-03-17-sample",
      title: "City of Fairview Heights council minutes",
      retrieved_at: RETRIEVED,
    },
    {
      url: "https://rdap.org/domain/kestrelpermit.ai",
      title: "RDAP registration record",
      retrieved_at: RETRIEVED,
    },
    {
      url: "https://web.archive.org/cdx/search/cdx?url=kestrelpermit.ai",
      title: "Wayback Machine capture index",
      retrieved_at: RETRIEVED,
    },
    {
      url: "https://www.usaspending.gov/search/?keyword=kestrel-permit-sample",
      title: "USAspending award search",
      retrieved_at: RETRIEVED,
    },
  ],
  review: {
    reviewed: true,
    model: "claude-haiku-4-5",
    adjustments: [
      "Rewrote the domain-age note to state the recorded dates and place them next to the claim, without characterizing intent.",
      "Moved the confirmed-pilot reference call to the top of the next steps.",
    ],
  },
  meta: {
    generated_at: GENERATED_AT,
    expires_at: EXPIRES_AT,
    methodology_version: "1.0",
    pack_release: "2026.08",
    vendor_key: "kestrel-permit-ai",
    vendor_display_name: "Kestrel Permit AI (sample, fictional)",
    research_partial: false,
    input_kind: "paste",
  },
};

export const SAMPLE_REPORTS: Record<SampleId, Report> = {
  meridian: meridianReport,
  swiftgov: swiftgovReport,
  claradocs: claradocsReport,
  kestrel: kestrelReport,
};

export function getSampleReport(id: SampleId): Report {
  return SAMPLE_REPORTS[id];
}
