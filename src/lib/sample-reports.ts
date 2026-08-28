/*
  Three complete sample reports for FICTIONAL vendors. These fixtures power
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
      id: "mer-q2",
      text: "The pitch says the Ohio Department of Taxation kept average phone wait under four minutes during peak week. How was that measured, over what period, and may we contact the contract administrator there?",
      why: "Performance figures need a named measurement method and a reference you can call.",
      source: "claim",
    },
    {
      id: "mer-q3",
      text: "Will you sign a contract clause permanently prohibiting the use of our data, including call recordings and transcripts, to train any model without our written consent?",
      why: "Standard protective clause for government AI purchases. Refusal is informative.",
      source: "core",
    },
    {
      id: "mer-q4",
      text: "Which foundation models (name, version, provider) does the product use today, under what agreements, and how will you notify us before a model change that could affect behavior?",
      why: "You are also buying the vendor's upstream model choices. Change control matters.",
      source: "pack",
    },
    {
      id: "mer-q5",
      text: "What happens when the AI cannot handle a call? Walk us through the hand-off to a human, what the resident hears, and what your data shows about how often that happens.",
      why: "Escalation behavior is the difference between a helpful line and a frustrating one.",
      source: "pack",
    },
    {
      id: "mer-q6",
      text: "How does the system tell residents they are talking to an AI, and can we configure that disclosure to match our state's requirements?",
      why: "Several states now require AI interaction disclosure for government services.",
      source: "pack",
    },
    {
      id: "mer-q7",
      text: "What is your measured performance in languages other than English, and which languages are supported for both voice and text?",
      why: "Multilingual performance often lags English and matters for equitable service.",
      source: "pack",
    },
    {
      id: "mer-q8",
      text: "What monitoring can our own staff run without you: call transcripts, containment and escalation rates, error reports? Show us the dashboard an agency administrator sees.",
      why: "You should be able to watch the system yourself, not wait for vendor reports.",
      source: "pack",
    },
    {
      id: "mer-q9",
      text: "How are call recordings and transcripts retained, where, for how long, and how is consent to recording handled in two-party-consent states?",
      why: "Retention and consent are legal obligations that land on the agency, not the vendor.",
      source: "pack",
    },
    {
      id: "mer-q10",
      text: "Please share your complete pricing structure, including what triggers overage charges and what the per-resident-served bands look like at our population size.",
      why: "Flat-sounding pricing often has volume triggers. Get the full table in writing.",
      source: "core",
    },
    {
      id: "mer-q11",
      text: "If we end the contract, what do we get back, in what formats, at what cost, and how quickly is our data deleted from your systems and your subprocessors?",
      why: "Exit terms are easiest to negotiate before you sign, not after.",
      source: "core",
    },
    {
      id: "mer-q12",
      text: "Please provide two current government references at agencies of similar size, including the contract administrator's contact information.",
      why: "The pitch offered references. Take the vendor up on it before the demo.",
      source: "gap",
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
    state_items: [],
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
      id: "swg-q1",
      text: "What is your registered legal entity name, state of incorporation, and UEI if you have one?",
      why: "One sentence from the vendor resolves the biggest open item in this report.",
      source: "gap",
    },
    {
      id: "swg-q2",
      text: "What is your Sourcewell contract number? We will confirm it in Sourcewell's public contract search before our next conversation.",
      why: "The claimed contract did not appear in Sourcewell's published list.",
      source: "gap",
    },
    {
      id: "swg-q3",
      text: "Please name two current state or local government customers and their contract administrators, with permission for us to contact them.",
      why: "None of the claimed 14 states or 200 agencies could be found in public records.",
      source: "gap",
    },
    {
      id: "swg-q4",
      text: "For the FedRAMP claim: what is the exact status (Ready, In Process, or Authorized), the package ID, and the sponsoring agency?",
      why: "The vendor does not appear in the FedRAMP Marketplace, and 'certified' is not a FedRAMP status.",
      source: "claim",
    },
    {
      id: "swg-q5",
      text: "For the HIPAA and CJIS claims: what specific artifacts sit behind them? For HIPAA, a signed BAA and an independent security assessment; for CJIS, a signed CJIS Security Addendum and the state audits you have passed.",
      why: "Neither program issues certificates. The real artifacts are documents the vendor either has or does not.",
      source: "claim",
    },
    {
      id: "swg-q6",
      text: "Which agency produced the 60 percent cost reduction figure, how was it measured, over what period, and may we contact them?",
      why: "A savings figure with no named source and no method cannot be relied on.",
      source: "claim",
    },
    {
      id: "swg-q7",
      text: "Which state saved $11M in the first year, and in what public document is that reported?",
      why: "Savings of this size by a state would normally appear in public records.",
      source: "claim",
    },
    {
      id: "swg-q8",
      text: "When was the company founded, under what name, and what websites or products did it operate before swiftgov-ai.com was registered in March 2026?",
      why: "The domain's age sits against the claim of serving states since 2016.",
      source: "claim",
    },
    {
      id: "swg-q9",
      text: "Which federal funding program with an end-of-quarter obligation deadline are you referring to? Please cite the program and deadline document.",
      why: "We could not find the deadline described, and real deadlines are citable.",
      source: "claim",
    },
    {
      id: "swg-q10",
      text: "Which foundation models does GovAssist run on, where is inference hosted, and do those providers' terms permit resident data?",
      why: "Standard architecture question for any government AI product.",
      source: "core",
    },
    {
      id: "swg-q11",
      text: "Will you provide a hands-on sandbox demo with our sample data, rather than a video or a slide deck?",
      why: "A working product can always be shown working.",
      source: "core",
    },
    {
      id: "swg-q12",
      text: "Who are your leadership team, and where can we see their professional backgrounds independent of your own website?",
      why: "We could not verify the named executive in independent sources.",
      source: "gap",
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
      id: "cla-q1",
      text: "Please share your SOC 2 Type I report or the auditor's completion letter, and tell us the Type II audit window and expected report date.",
      why: "The pitch names both; a startup that has them can produce them in a day.",
      source: "gap",
    },
    {
      id: "cla-q2",
      text: "May we speak with the Colorado county clerk's office running your pilot? Please share the contact and what the pilot covers.",
      why: "One real reference outweighs any amount of marketing.",
      source: "gap",
    },
    {
      id: "cla-q3",
      text: "Which commercial language models does the product use, where is inference hosted, and do those providers' terms permit government records that contain personal information?",
      why: "The data path matters more than the model name for records work.",
      source: "pack",
    },
    {
      id: "cla-q4",
      text: "How do you measure extraction accuracy, and will you run a two-week pilot on a batch of our own documents with the error rate reported by field type?",
      why: "Accuracy on your documents is the only number that matters.",
      source: "pack",
    },
    {
      id: "cla-q5",
      text: "Walk us through a redaction miss: what happens when the system fails to flag something exempt from disclosure, and how does the reviewer catch it?",
      why: "For records requests, a missed redaction is the highest-consequence error.",
      source: "pack",
    },
    {
      id: "cla-q6",
      text: "Will you sign a clause permanently prohibiting use of our documents and data to train any model without our written consent?",
      why: "Standard protective clause; the pitch already says nothing trains on your data, so signing should be easy.",
      source: "core",
    },
    {
      id: "cla-q7",
      text: "At the end of the pilot, how is our data deleted, who attests to it in writing, and what do we get back in what formats?",
      why: "The pitch promises deletion and an exit clause; get both in the pilot agreement.",
      source: "claim",
    },
    {
      id: "cla-q8",
      text: "Do you have a penetration test letter from a named firm, and a subprocessor list we can review?",
      why: "Both are reasonable asks at seed stage, and both were part of the calibration bar for this report.",
      source: "gap",
    },
    {
      id: "cla-q9",
      text: "Will you sign our state's standard data privacy agreement, and a BAA if any documents contain health information?",
      why: "Willingness to sign is a fast test of how ready a young vendor is for government work.",
      source: "core",
    },
    {
      id: "cla-q10",
      text: "Have you looked at GovRAMP's Snapshot program for early-stage vendors? If not, would you enroll during our pilot?",
      why: "A low-cost security baseline exists for companies exactly this size.",
      source: "pack",
    },
    {
      id: "cla-q11",
      text: "What is the flat pilot price, what does it include, and what would year-one production pricing look like at our document volume?",
      why: "Get the full pricing path in writing before the pilot starts.",
      source: "core",
    },
    {
      id: "cla-q12",
      text: "What insurance do you carry (cyber liability and errors-and-omissions), and at what limits?",
      why: "A standard procurement requirement that young vendors sometimes have not set up yet.",
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

export const SAMPLE_REPORTS: Record<SampleId, Report> = {
  meridian: meridianReport,
  swiftgov: swiftgovReport,
  claradocs: claradocsReport,
};

export function getSampleReport(id: SampleId): Report {
  return SAMPLE_REPORTS[id];
}
