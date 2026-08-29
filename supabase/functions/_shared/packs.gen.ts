/*
  GENERATED FILE — do not edit.
  Source of truth: packs/*.yaml, compiled by scripts/build-packs.ts.
  Regenerate with: npx tsx scripts/build-packs.ts
*/
import type { SectorPack } from "./packs-types.ts";

export const PACK_RELEASE = "2026-08-29";

export const PACKS: Record<string, SectorPack> = {
  "call-center": {
    "definition": "AI that answers, routes, or assists resident phone and chat contact: virtual agents and IVR bots, voice AI, agent-assist and after-call summarization, and the cloud contact-center (CCaaS) platforms they run on. This pack does not cover website-only chatbots with no contact-center function (see the public-comms pack) or anything that determines eligibility or flags fraud from a call (that adds the eligibility-case-mgmt overlay).",
    "diligence_questions": [
      {
        "good_answer": "A written formula with numerator and denominator, exclusions named, and the same metric reported for named government clients at both time points.",
        "id": "call-center-q01",
        "question": "Show the exact formula for the containment or resolution rate you quoted. Do abandons, IVR completions, transfers, or 7-day callbacks count? Give the same metric for your three most comparable government clients at 90 days and 12 months.",
        "red_flag": "A single marketing number with no formula, or a definition that counts abandons and menu completions as contained.",
        "select": {
          "claim_types": [
            "performance"
          ],
          "finding_ids": [
            "perf-*"
          ],
          "weight": 5
        },
        "source_url": null
      },
      {
        "good_answer": "Three named agencies with contact information, and metrics that match the deck's claims.",
        "id": "call-center-q02",
        "question": "Name three government agencies of comparable volume and program type in production today, with contacts who will confirm your deck's metrics.",
        "red_flag": "Refusal is disqualifying. Every credible vendor in this category has named references; \"our customer list is confidential\" is not an acceptable answer here.",
        "select": {
          "claim_types": [
            "customer"
          ],
          "finding_ids": [
            "customers"
          ],
          "weight": 4
        },
        "source_url": null
      },
      {
        "good_answer": "Immediate escalation on request, automatic escalation after failures, a clear after-hours path, and warm transfer with full context.",
        "id": "call-center-q03",
        "question": "Walk us through every path to a human: what happens when a caller says \"agent\" on turn one? After two failed answers? At 2 a.m.? Is the transfer warm, meaning the agent sees the transcript and the collected data?",
        "red_flag": "Escalation requires fighting through the bot, has no after-hours path, or drops the caller's context at transfer.",
        "select": {
          "base": true
        },
        "source_url": null
      },
      {
        "good_answer": "Corpus-restricted generation with per-answer citations, explicit refusal or escalation when the answer is absent, a measured wrong-answer rate with methodology, and yes to a pre-award test.",
        "id": "call-center-q04",
        "question": "Is the system restricted to content we approve, with the source cited for each answer? What does it do when the answer is not there: guess, refuse, or escalate? What is the measured wrong-answer rate on a benefits test set, and can we run our own test before award?",
        "red_flag": "Open-ended generation, no citations, no measured wrong-answer rate, or resistance to pre-award testing.",
        "select": {
          "base": true
        },
        "source_url": null
      },
      {
        "good_answer": "Specific contract language on correction timelines and indemnification for bot-caused harm.",
        "id": "call-center-q05",
        "question": "If the bot gives a claimant wrong information, what does the contract say? What are the correction SLAs and the indemnification terms?",
        "red_flag": "\"That has never happened\" or a disclaimer-only answer. A tribunal held Air Canada liable for its bot's invented policy; the agency owns what its bot says.",
        "select": {
          "base": true,
          "tiers": [
            3,
            4
          ]
        },
        "source_url": "https://www.cbsnews.com/news/aircanada-chatbot-discount-customer/"
      },
      {
        "good_answer": "A named language list matched to caller demographics, native-speaker QA, and a working interpreter handoff.",
        "id": "call-center-q06",
        "question": "Which languages do you support, on which channels, with what human review? Is spoken Spanish actual Spanish reviewed by native speakers? Show us the interpreter-handoff flow.",
        "red_flag": "A large language count with no QA process. Washington state removed an AI voice in February 2026 after Spanish callers got Spanish-accented English.",
        "select": {
          "elevated": true
        },
        "source_url": "https://statetechmagazine.com/article/2024/03/state-governments-deploy-contact-center-ai-bolster-customer-service"
      },
      {
        "good_answer": "A named client on the same stack, fixed-price integration, and a precise read/write scope.",
        "id": "call-center-q07",
        "question": "Have you integrated with our exact stack (our IVR plus our CRM or eligibility system)? Name the client. Is the integration fixed-price? What does the bot read, and what does it write?",
        "red_flag": "\"Our API can integrate with anything\" with no named client on your stack, or open-ended integration billing.",
        "select": {
          "claim_types": [
            "customer"
          ]
        },
        "source_url": null
      },
      {
        "good_answer": "A product-level authorization you can verify on the marketplace, a named storage location and retention period, and a written no-training commitment.",
        "id": "call-center-q08",
        "question": "Which FedRAMP or GovRAMP authorization does this specific product hold? Where are recordings and transcripts stored, how long are they retained, and is any of our data used to train models, yours or a subprocessor's?",
        "red_flag": "\"Compliant\" instead of \"authorized,\" company-level claims for a product-level question, or vague data-use terms.",
        "select": {
          "base": true
        },
        "source_url": "https://marketplace.fedramp.gov/"
      },
      {
        "good_answer": "Named model providers and hosting, plus a described regression-test process tied to model updates.",
        "id": "call-center-q09",
        "question": "Which LLM and speech-recognition vendors are under the hood, and where are they hosted? When the underlying model updates, how do you regression-test our flows before residents see the change?",
        "red_flag": "Refusal to name subprocessors, or no regression-testing process at all.",
        "select": {
          "finding_ids": [
            "model-transparency"
          ]
        },
        "source_url": null
      },
      {
        "good_answer": "Disclosure on by default, prior-express-consent handling for outbound calls, and specific answers on state laws.",
        "id": "call-center-q10",
        "question": "Does the system disclose that it is automated at the start of each interaction? For outbound calls: how do you comply with FCC ruling 24-17, which treats AI voices as artificial voices under the TCPA? How do you handle state bot-disclosure laws and the Colorado AI Act (effective Jun 30, 2026)?",
        "red_flag": "Disclosure treated as optional or configurable off, or unfamiliarity with FCC 24-17.",
        "select": {
          "base": true
        },
        "source_url": "https://docs.fcc.gov/public/attachments/FCC-24-17A1.pdf"
      },
      {
        "good_answer": "A line-item decomposition with surge modeling and stated minimums.",
        "id": "call-center-q11",
        "question": "Break the price into platform, per-minute or per-message usage, telecom passthrough, AI metering, integration, and support. What happens to our bill in a 10x claims surge? What are the minimums and the overage rates?",
        "red_flag": "One bundled number, no surge answer, or minimums that only appear in the contract draft.",
        "select": {
          "claim_types": [
            "pricing"
          ]
        },
        "source_url": "https://aws.amazon.com/connect/pricing/"
      },
      {
        "good_answer": "Full transcript access, per-intent reporting, staff review rights, and a no-cost or low-cost export commitment in a usable format.",
        "id": "call-center-q12",
        "question": "Do we get raw transcripts plus a dashboard covering containment, escalation, abandonment, wait time, and per-intent accuracy? Can our staff review any interaction? What is exported at contract end, in what format, and at what cost?",
        "red_flag": "Vendor-controlled reporting only, sampled transcripts, or export treated as a paid professional service.",
        "select": {
          "base": true
        },
        "source_url": null
      },
      {
        "good_answer": "Automatic failover to the human queue, a specific uptime SLA, and real postmortems shared.",
        "id": "call-center-q13",
        "question": "When your AI is down, what does a caller hear: a queue or a dead line? What is your uptime SLA, and can we see your last two incident postmortems?",
        "red_flag": "No failover story, or refusal to share incident history.",
        "select": {
          "claim_types": [
            "availability"
          ]
        },
        "source_url": null
      },
      {
        "good_answer": "Yes, agent-assist can be bought alone (the lowest-risk entry point), with a described human review step for summaries that become records.",
        "id": "call-center-q14",
        "question": "Can we buy after-call summarization alone, without a resident-facing bot? What accuracy review exists for auto-summaries written into our CRM?",
        "red_flag": "Bundling that forces a resident-facing bot, or summaries written to the CRM with no review.",
        "select": {
          "elevated": true
        },
        "source_url": null
      },
      {
        "good_answer": "A named client, with before-and-after quality metrics alongside the staffing change.",
        "id": "call-center-q15",
        "question": "If you project staffing savings, name the client where that happened and tell us what happened to their quality metrics afterward.",
        "red_flag": "Projected savings with no named client. Klarna reversed its agent-replacement strategy after quality suffered.",
        "select": {
          "claim_types": [
            "performance"
          ],
          "finding_ids": [
            "automation"
          ],
          "weight": 2
        },
        "source_url": null
      }
    ],
    "elevated_scrutiny_rules": [
      {
        "action": "Apply the eligibility-case-mgmt overlay.",
        "condition": "The pitch claims the phone AI determines eligibility, changes claims, or flags fraud"
      },
      {
        "action": "Add the mandatory TCPA / FCC 24-17 legal block to the output.",
        "condition": "The pitch proposes outbound AI-voice calling"
      },
      {
        "action": "Raise the caution band floor one level.",
        "condition": "The pitch proposes a synthetic human-like voice without disclosure"
      },
      {
        "action": "Use \"we could not verify a named government customer in public sources\" language in the output.",
        "condition": "The sender is a commercial AI-agent startup claiming government traction with no verifiable state or local reference"
      }
    ],
    "established_vendors": [
      {
        "gov_evidence_url": "https://aws.amazon.com/products/connect/customer/slg/",
        "name": "AWS Amazon Connect",
        "one_liner": "Consumption-priced CCaaS with the deepest state and local roster (Kentucky Transportation, South Carolina DSS, New Mexico HSD, Atlanta 311, Tamarac FL, Arizona MVD, Workforce West Virginia).",
        "tier": "platform"
      },
      {
        "gov_evidence_url": "https://cloud.google.com/customers/state-of-illinois",
        "name": "Google Cloud Customer Engagement Suite",
        "one_liner": "Gemini-based virtual agents; Illinois IDES, Minnesota DVS, Colorado CDLE.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": "https://www.genesys.com/company/newsroom/announcements/122908",
        "name": "Genesys Cloud CX",
        "one_liner": "FedRAMP Moderate; large legacy government base; public list pricing is useful for quote benchmarking (https://www.genesys.com/pricing).",
        "tier": "platform"
      },
      {
        "gov_evidence_url": "https://www.nice.com/industries/government",
        "name": "NICE CXone",
        "one_liner": "San Diego County access center; NYC DSS via C1 Gov (metrics are vendor-reported).",
        "tier": "platform"
      },
      {
        "gov_evidence_url": "https://www.five9.com/resources/case-study-nj-2-1-1",
        "name": "Five9",
        "one_liner": "NJ 211 statewide network; 50-seat minimum.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": "https://www.talkdesk.com/news-and-press/press-releases/fedramp-authorization/",
        "name": "Talkdesk",
        "one_liner": "Full FedRAMP authorization; fewer named state and local references.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": "https://statetechmagazine.com/article/2025/08/kyle-texas-uses-ai-expedite-citizen-service-delivery",
        "name": "Salesforce Agentforce",
        "one_liner": "City of Kyle, TX: resolution time cut from 4.37 to 2.41 days across 12,000+ requests.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": null,
        "name": "ServiceNow",
        "one_liner": "Missouri DSS (Route Fifty, May 21, 2026); ID.me/Servos benefits-modernization partnership (PR Newswire, Jun 23, 2026).",
        "tier": "platform"
      },
      {
        "gov_evidence_url": null,
        "name": "Deloitte / Accenture / Maximus / C1 Gov / Smartronix / Quantiphi",
        "one_liner": "The delivery layer for most state contact-center deployments; named projects appear in the landscape summary above.",
        "tier": "integrator"
      },
      {
        "gov_evidence_url": "https://www.govtech.com/biz/polimorphic-raises-18-6m-as-it-beefs-up-public-sector-ai",
        "name": "Polimorphic",
        "one_liner": "Local-government AI chat and phone agents; $18.6M Series A; Pacifica CA, Tooele County UT, Polk County NC, Palm Beach FL.",
        "tier": "startup-verified"
      },
      {
        "gov_evidence_url": null,
        "name": "Verint / SoundHound (Amelia)",
        "one_liner": "Coral Springs FL; USCIS \"Emma\" lineage (Federal Times, Nov 16, 2015).",
        "tier": "specialist"
      }
    ],
    "failure_modes": [
      {
        "description": "A bot on an official government line invents policy and residents rely on it. The organization owns everything its bot says: a Canadian tribunal held Air Canada liable for its chatbot's invented refund policy (https://www.cbsnews.com/news/aircanada-chatbot-discount-customer/), and even Cursor, an AI company, saw its own support bot invent a policy that did not exist (Ars Technica, Apr 17, 2025).",
        "named_incident": "NYC's MyCity chatbot told businesses to break the law (The Markup, Mar 29, 2024)",
        "source_url": "https://themarkup.org/artificial-intelligence/2024/03/29/nycs-ai-chatbot-tells-businesses-to-break-the-law",
        "title": "Hallucinated benefit or legal guidance on an official line"
      },
      {
        "description": "Klarna publicly reversed its \"AI replaced 700 agents\" posture and rehired humans (Forbes, May 18, 2025; direct article URL pending re-capture, see known gaps). For callers in crisis, callers with limited English, and callers with low digital literacy, a bot with no exit to a person is a due-process problem. The IRS voice-bot rollout is the design benchmark: taxpayers can always reach an English- or Spanish-speaking representative.",
        "named_incident": "Klarna reversed its AI-only support strategy and rehired human agents (Forbes, May 18, 2025)",
        "source_url": "https://www.irs.gov/newsroom/irs-expands-voice-bot-options-for-faster-service-less-wait-time",
        "title": "Missing or buried human escalation"
      },
      {
        "description": "Vendors count abandons, IVR menu completions, and \"caller did not reply\" as \"contained.\" Gartner's own bullish forecast is 80% of common issues resolved without a human by 2029 (https://www.gartner.com/en/newsroom/press-releases/2025-03-05-gartner-predicts-agentic-ai-will-autonomously-resolve-80-percent-of-common-customer-service-issues-without-human-intervention-by-2029), so a higher present-tense claim deserves the metric-definition question below.",
        "named_incident": "Documented government reality: Tamarac, FL reached 20% full self-service, and West Virginia's roughly 90% came from a narrow scripted FAQ surge line",
        "source_url": "https://aws.amazon.com/blogs/publicsector/how-the-city-of-tamarac-transformed-resident-experience-with-amazon-connect/",
        "title": "Containment inflation through definition games"
      },
      {
        "description": "Intercom's $0.99 \"outcome\" pricing includes a customer who simply goes silent. Gartner predicts generative-AI cost-per-resolution will exceed offshore human cost by 2030 (Gartner press release, Jan 26, 2026), and pricing-model churn (Salesforce, Jun 2026; HubSpot, Apr 2026) makes a multi-year per-resolution commitment unsafe without a contractual resolution definition and an audit right.",
        "named_incident": "Intercom's published per-resolution pricing counts a customer who goes silent as a resolved outcome",
        "source_url": "https://www.intercom.com/pricing",
        "title": "Per-resolution pricing games"
      },
      {
        "description": "Washington state removed an AI voice after Spanish-speaking callers got Spanish-accented English instead of Spanish (StateScoop, Feb 27, 2026; direct article URL pending re-capture, see known gaps). The contrast benchmark is Minnesota's community-informed four-language model, with languages chosen from caller demographics.",
        "named_incident": "Washington state removed an AI voice over failed Spanish support (StateScoop, Feb 27, 2026)",
        "source_url": "https://statetechmagazine.com/article/2024/03/state-governments-deploy-contact-center-ai-bolster-customer-service",
        "title": "Language-access failures shipped without native-speaker QA"
      },
      {
        "description": "FCC ruling 24-17 classifies AI-generated voices as \"artificial\" under the TCPA, so outbound use requires prior express consent. The FBI has warned about cloning of official voices (NPR, Jul 9, 2025). A synthetic voice marketed as indistinguishable from a human is a liability, not a feature.",
        "named_incident": "FCC declaratory ruling 24-17 on AI voices under the TCPA (Feb 2024)",
        "source_url": "https://docs.fcc.gov/public/attachments/FCC-24-17A1.pdf",
        "title": "Voice cloning and disclosure exposure"
      }
    ],
    "inclusion_test": [
      "Does the pitch mention phone calls, IVR, voice agents, hold times, call deflection or containment, or contact-center agents?",
      "Does it target 311, benefits hotlines, unemployment lines, DMV lines, or \"resident support\"?",
      "Does it offer agent-assist, call summarization, or transcription for call-center staff?",
      "Does it name a CCaaS platform (Amazon Connect, Genesys, NICE, Five9, Talkdesk) as its base?"
    ],
    "incumbent_landscape": "Three layers, and the first triage step is establishing which layer the sender occupies. Layer 1, platforms: AWS (Amazon Connect), Google Cloud (Customer Engagement Suite, formerly \"Contact Center AI\"), Genesys, NICE, Five9, Talkdesk, Salesforce Agentforce, ServiceNow, and Verint/SoundHound, all with real, named state and local deployments. Layer 2, the integrators and BPOs who deliver most state deployments: Deloitte (TrueServe on AWS), Accenture (Texas TWC \"Larry\"), Quantiphi/Presidio/Cisco (Illinois IDES), Smartronix (West Virginia), C1 Gov (NYC DSS), and Maximus. When a platform pitches, ask who delivers. When an integrator pitches, ask which platform. The accountability split between the two is where deployments fail. Layer 3, startups: govtech-native companies (Polimorphic, Citibot) with named local-government customers, versus commercial AI-agent startups (Sierra, Decagon, Parloa, PolyAI, Replicant). We could not verify any U.S. state or local government customer for that second group in public sources as of August 2026, so a \"government-proven\" claim from that cohort is unverified until the vendor names an agency you can call.",
    "known_gaps": "- Google Conversational Agents pricing was not fetched this cycle; confirm\n  at quote time.\n- Citibot's customer list is unverified; the vendor site blocked automated\n  fetch.\n- AWS, NICE, Five9, and Polimorphic metrics are vendor-published and not\n  independently verified.\n- Title VI enforcement posture after EO 14224 is unsettled.\n- Direct article URLs for the Klarna reversal (Forbes, May 18, 2025), the\n  Washington AI-voice removal (StateScoop, Feb 27, 2026), and the EDDNext\n  caution (KQED, Dec 4, 2024) were not captured this cycle; those items are\n  retained with citations by outlet and date.\n- Amarillo TX \"Emma,\" Atlanta 311, and Coral Springs FL (Amelia) are named\n  deployments in the research record but lacked direct source URLs this\n  cycle, so they are omitted from reference deployments.\n- TX-RAMP program page and GovAI Coalition Trellis registry URLs were not\n  confirmed this cycle, so those registries are cited by name only.",
    "last_updated": "2026-08-29",
    "legal_context": "- FCC declaratory ruling 24-17 (Feb 2024): AI-generated voices are\n  \"artificial voices\" under the TCPA; outbound use requires prior express\n  consent (https://docs.fcc.gov/public/attachments/FCC-24-17A1.pdf).\n- California B.O.T. Act (SB 1001, effective 2019): bots that try to\n  influence a purchase or a vote must disclose that they are bots.\n- Utah AI Policy Act (2024): disclosure requirements for generative AI in\n  consumer interactions.\n- Colorado AI Act (effective Jun 30, 2026): AI affecting access to\n  government services is treated as high-risk. Verify current status before\n  citing; the effective date has shifted once already.\n- Executive Order 14224 (2025) does not erase Title VI language-access\n  obligations. A vendor citing it as a reason to cut language QA is a red\n  flag. Enforcement posture after the EO is unsettled; treat as uncertain.",
    "pack_id": "call-center",
    "pack_name": "Call Center & Phone AI",
    "realistic_pricing": "Per-seat CCaaS list prices: Genesys $75–240 per user per month\n(https://www.genesys.com/pricing), Five9 from $119–159 with a 50-seat\nminimum, Talkdesk $85–225. Consumption pricing: Amazon Connect $0.038 per\nvoice minute and $0.010 per chat message\n(https://aws.amazon.com/connect/pricing/). Rule of thumb: at roughly\n$0.04–0.10 per minute all-in, a 500,000-call-per-year line at 5 minutes per\ncall runs about $100K–250K per year in platform consumption before\nintegration and telecom. A quote at 10x that level means asking which layer\nthe money is in. Per-resolution pricing is workable for digital FAQ traffic\nonly, and only with a contractual definition of \"resolution.\" Govtech\nstartups typically sell annual jurisdiction-tier subscriptions, commonly low\nfive figures for small jurisdictions; that figure is uncertain, so negotiate\nper jurisdiction.",
    "reference_deployments": [
      {
        "agency": "Illinois IDES",
        "metric": "140,000+ inquiries per day at peak; the widely quoted \"$100M savings\" is an initial, unaudited estimate",
        "metric_source_type": "vendor-reported",
        "source_url": "https://cloud.google.com/customers/state-of-illinois",
        "vendor_stack": "Google Contact Center AI via Quantiphi/Presidio on Cisco",
        "what": "Unemployment virtual agent stood up during the pandemic surge"
      },
      {
        "agency": "Colorado CDLE",
        "metric": "The design benchmark for scope restraint rather than a volume claim",
        "metric_source_type": "government-page",
        "source_url": "https://cdle.colorado.gov/virtual-assistant-tips",
        "vendor_stack": "Google virtual agent, phased rollout",
        "what": "FAQs first, then authenticated claim status; the assistant explicitly \"cannot change your claim\""
      },
      {
        "agency": "Texas Workforce Commission (\"Larry\")",
        "metric": "21 million+ questions handled",
        "metric_source_type": "independent-press",
        "source_url": "https://www.dallasnews.com/business/jobs/2020/04/01/texas-launches-chatbot-named-larry-to-help-with-surge-in-unemployment-claims/",
        "vendor_stack": "Accenture + AWS",
        "what": "Surge FAQ bot stood up in 5 days during the 2020 unemployment spike"
      },
      {
        "agency": "Workforce West Virginia",
        "metric": "Roughly 90% resolution, on a narrow scripted FAQ surge line",
        "metric_source_type": "vendor-reported",
        "source_url": "https://aws.amazon.com/blogs/publicsector/accelerating-response-west-virginia-workforces-needs-cloud",
        "vendor_stack": "Amazon Connect via Smartronix",
        "what": "Surge line stood up in 72 hours in 2020"
      },
      {
        "agency": "South Carolina DSS",
        "metric": "Named statewide modernization; metrics are vendor-reported",
        "metric_source_type": "vendor-reported",
        "source_url": "https://aws.amazon.com/blogs/publicsector/how-south-carolina-dss-modernized-19-contact-centers-to-improve-benefits-delivery-with-amazon-connect/",
        "vendor_stack": "Amazon Connect",
        "what": "19 contact centers modernized for benefits delivery"
      },
      {
        "agency": "NJ 211",
        "metric": "110 multilingual agents; metrics are vendor-reported",
        "metric_source_type": "vendor-reported",
        "source_url": "https://www.five9.com/resources/case-study-nj-2-1-1",
        "vendor_stack": "Five9",
        "what": "Statewide 211 network"
      },
      {
        "agency": "City of Tamarac, FL",
        "metric": "20% of residents fully self-serve, the honest self-service anchor, from the vendor's own case study",
        "metric_source_type": "vendor-reported",
        "source_url": "https://aws.amazon.com/blogs/publicsector/how-the-city-of-tamarac-transformed-resident-experience-with-amazon-connect/",
        "vendor_stack": "Amazon Connect",
        "what": "Resident service line with self-service options"
      },
      {
        "agency": "Minnesota DVS",
        "metric": "87,813 conversations in 2023",
        "metric_source_type": "independent-press",
        "source_url": "https://statetechmagazine.com/article/2024/03/state-governments-deploy-contact-center-ai-bolster-customer-service",
        "vendor_stack": "Google Dialogflow chatbot",
        "what": "Chatbot in English, Spanish, Hmong, and Somali, with languages chosen from caller demographics"
      },
      {
        "agency": "Kentucky Transportation Cabinet",
        "metric": "900,000+ chatbot interactions per month",
        "metric_source_type": "vendor-reported",
        "source_url": "https://aws.amazon.com/solutions/case-studies/kentucky-transportation-case-study/",
        "vendor_stack": "Amazon Connect",
        "what": "Transportation services chatbot"
      },
      {
        "agency": "City of Kyle, TX",
        "metric": "Resolution time cut from 4.37 to 2.41 days across 12,000+ requests",
        "metric_source_type": "independent-press",
        "source_url": "https://statetechmagazine.com/article/2025/08/kyle-texas-uses-ai-expedite-citizen-service-delivery",
        "vendor_stack": "Salesforce Agentforce",
        "what": "Resident service request handling"
      },
      {
        "agency": "IRS",
        "metric": "Callers can always reach an English- or Spanish-speaking representative if needed",
        "metric_source_type": "government-page",
        "source_url": "https://www.irs.gov/newsroom/irs-expands-voice-bot-options-for-faster-service-less-wait-time",
        "vendor_stack": "Voice bots on the main service lines",
        "what": "Federal design benchmark for escalation"
      },
      {
        "agency": "NYC DSS",
        "metric": "Named deployment; metrics are vendor-reported",
        "metric_source_type": "vendor-reported",
        "source_url": "https://www.nice.com/industries/government",
        "vendor_stack": "NICE CXone via C1 Gov",
        "what": "Benefits contact center"
      }
    ],
    "refresh_cadence": "quarterly",
    "registries_to_check": [
      {
        "name": "FedRAMP Marketplace",
        "url": "https://marketplace.fedramp.gov/",
        "what_it_proves": "Whether this specific product holds a federal cloud authorization, and at what level. Verify the product, not the company."
      },
      {
        "name": "GovRAMP Authorized Product List",
        "url": "https://govramp.org/",
        "what_it_proves": "State-oriented cloud security verification. Formerly StateRAMP; the name changed in February 2025."
      },
      {
        "name": "SAM.gov",
        "url": "https://sam.gov/",
        "what_it_proves": "The company exists as a registered federal contractor."
      },
      {
        "name": "NASPO ValuePoint",
        "url": "https://www.naspovaluepoint.org/",
        "what_it_proves": "Whether the vendor sells through established cooperative state purchasing agreements."
      },
      {
        "name": "Carahsoft",
        "url": "https://www.carahsoft.com/",
        "what_it_proves": "Whether the vendor is distributed through the main government IT reseller channel."
      },
      {
        "name": "Pavilion Contract Hub",
        "url": "https://www.withpavilion.com/",
        "what_it_proves": "Existing public contracts you may be able to piggyback on; confirms other governments have bought the product."
      },
      {
        "name": "Procurated",
        "url": "https://www.procurated.com/",
        "what_it_proves": "Peer reviews of suppliers from other government buyers."
      }
    ],
    "scrutiny_tier": "standard",
    "signal_lexicon": [
      "call center",
      "contact center",
      "ivr",
      "voice agent",
      "voice ai",
      "call deflection",
      "containment rate",
      "hold time",
      "agent assist",
      "after-call",
      "call volume",
      "ccaas",
      "benefits hotline",
      "311"
    ],
    "skepticism_triggers": [
      {
        "claim_pattern": "A containment or deflection rate of 80% or more (for voice, 40% or more)",
        "source_url": "https://aws.amazon.com/blogs/publicsector/how-the-city-of-tamarac-transformed-resident-experience-with-amazon-connect/",
        "threshold": "Text containment at or above 80%; voice containment at or above 40–50%",
        "why": "Gartner's optimistic forecast is 80% of common issues by 2029. Documented government reality: Tamarac reached 20% full self-service, and West Virginia's roughly 90% came from a narrow scripted FAQ surge line."
      },
      {
        "claim_pattern": "\"99%+ accuracy\" or \"never hallucinates\"",
        "source_url": "https://themarkup.org/artificial-intelligence/2024/03/29/nycs-ai-chatbot-tells-businesses-to-break-the-law",
        "threshold": "Any accuracy claim without a test-set methodology",
        "why": "NYC and Cursor show that well-resourced deployers still ship wrong-answer bots. An accuracy number with no test set, denominator, or judge is a marketing number."
      },
      {
        "claim_pattern": "\"Replaces N agents\" or a named dollar-savings figure",
        "source_url": "https://cloud.google.com/customers/state-of-illinois",
        "threshold": "Any named FTE or dollar savings without an audited source",
        "why": "Illinois's \"$100M per year savings\" was an initial vendor-story estimate, not an audited figure, and Klarna reversed its agent-replacement strategy."
      },
      {
        "claim_pattern": "\"Deploy in days\" combined with \"integrated\"",
        "source_url": "https://www.dallasnews.com/business/jobs/2020/04/01/texas-launches-chatbot-named-larry-to-help-with-surge-in-unemployment-claims/",
        "threshold": "A deployment promise under 30 days alongside claims of system integration",
        "why": "The two claims contradict each other. Days is true only for scripted FAQ bots (Texas TWC's \"Larry\": 5 days; West Virginia: 72 hours, both 2020 surge lines). Claim-status or eligibility integration takes months."
      },
      {
        "claim_pattern": "Per-resolution price under $1, or an undefined \"resolution\"",
        "source_url": "https://www.intercom.com/pricing",
        "threshold": "Under $1 per resolution, or no contractual definition",
        "why": "Intercom's $0.99 outcome pricing counts a customer who goes silent. Demand a contractual resolution definition plus an audit right."
      },
      {
        "claim_pattern": "\"FedRAMP compliant\" or \"StateRAMP compliant\"",
        "source_url": "https://marketplace.fedramp.gov/",
        "threshold": "The word \"compliant\" instead of \"authorized\"",
        "why": "\"Compliant\" is not \"authorized.\" Verify the specific product at the FedRAMP Marketplace and on the GovRAMP authorized product list. A vendor still saying \"StateRAMP\" does not know the program became GovRAMP in February 2025."
      },
      {
        "claim_pattern": "\"Supports 75+ languages\"",
        "source_url": "https://statetechmagazine.com/article/2024/03/state-governments-deploy-contact-center-ai-bolster-customer-service",
        "threshold": "A language count above the number of languages with native-speaker QA",
        "why": "Machine-translation coverage is not language access. Ask which languages have native-speaker QA. Minnesota's four-language community-informed model is the honest benchmark."
      },
      {
        "claim_pattern": "\"No integration required\"",
        "source_url": null,
        "threshold": "Any claim that useful answers need no system integration",
        "why": "It means FAQ-only. The bot cannot answer \"where is my payment,\" which is most benefits-line volume."
      },
      {
        "claim_pattern": "\"Indistinguishable from a human voice\"",
        "source_url": "https://docs.fcc.gov/public/attachments/FCC-24-17A1.pdf",
        "threshold": "Any pitch marketing voice realism without disclosure",
        "why": "FCC 24-17 treats AI voices as artificial under the TCPA, several states require bot disclosure, and the Colorado AI Act takes effect Jun 30, 2026. Realism without disclosure is a liability."
      },
      {
        "claim_pattern": "\"Government-proven\" with no named agency",
        "source_url": null,
        "threshold": "Zero named, callable government customers",
        "why": "This applies with force to commercial AI-agent startups (the Sierra, Decagon, Parloa, PolyAI, Replicant cohort). We could not verify any U.S. state or local government customer for that cohort in public sources as of August 2026."
      },
      {
        "claim_pattern": "A new platform pitched as the fix for a struggling program",
        "source_url": null,
        "threshold": "Replatforming presented as the remedy for backlogs, improper payments, or debt problems",
        "why": "California's billion-dollar EDDNext replatforming had not resolved the underlying fraud and debt problems (KQED, Dec 4, 2024; direct article URL pending re-capture, see known gaps). Process problems follow the program onto the new platform."
      }
    ]
  },
  "data-analytics": {
    "definition": "AI and analytics that inform government decisions: dashboards and BI with AI layers, \"ask your data\" LLM interfaces, predictive analytics, risk scoring, fraud and program-integrity analytics, and assessment algorithms. The first question in this pack is the fork: decoration or decision? A dashboard that describes gets standard scrutiny. A score or flag that can trigger action against a person is an adverse-action system and adds the eligibility-case-mgmt overlay.",
    "diligence_questions": [
      {
        "good_answer": "A clear scope statement. If adverse actions are possible, the vendor accepts the high-impact review track without argument.",
        "id": "data-analytics-q01",
        "question": "What decisions will these outputs feed, and can a score or flag by itself trigger an adverse action against a person (a benefit cut, a fraud hold, an investigation)? If yes, we will treat this as a high-impact system that needs a different review track.",
        "red_flag": "\"That depends on how you configure it,\" without engaging the consequences.",
        "select": {
          "base": true
        },
        "source_url": null
      },
      {
        "good_answer": "Real notice text with specific reasons a caseworker can explain.",
        "id": "data-analytics-q02",
        "question": "Show the exact notice text an affected resident would receive. Can a caseworker explain in plain language why this specific person was flagged?",
        "red_flag": "No notice exists because \"the score is advisory.\"",
        "select": {
          "elevated": true
        },
        "source_url": null
      },
      {
        "good_answer": "Yes, in contract. Idaho's K.W. v. Armstrong shows trade-secret postures fail in court.",
        "id": "data-analytics-q03",
        "question": "Will you contractually commit to disclosing model logic, features, and weights to us, our auditors, and a court if litigated?",
        "red_flag": "Trade-secret carve-outs over decision logic.",
        "select": {
          "elevated": true
        },
        "source_url": "https://www.acluidaho.org/en/cases/kw-v-armstrong"
      },
      {
        "good_answer": "Threshold-level precision and recall plus a staffing model. The IRS benchmark shows 81% false positives is what \"working\" can look like at low base rates.",
        "id": "data-analytics-q04",
        "question": "Not \"accuracy\": what are precision and recall at your recommended threshold, validated on data like ours? At our prevalence, how many flags per 100 are false positives, and what staffing does the review queue require?",
        "red_flag": "A single accuracy number.",
        "select": {
          "claim_types": [
            "performance"
          ],
          "finding_ids": [
            "perf-*"
          ],
          "weight": 4
        },
        "source_url": "https://www.taxpayeradvocate.irs.gov/wp-content/uploads/2020/07/ARC18_Volume1_MSP_05_FalsePositiveRates.pdf"
      },
      {
        "good_answer": "Human sign-off enforced in the system design, not just in policy.",
        "id": "data-analytics-q05",
        "question": "Where exactly is human review mandatory, as a designed control? Can the system technically execute an adverse action with no human sign-off?",
        "red_flag": "Auto-execution is possible and \"most customers add review.\"",
        "select": {
          "elevated": true,
          "finding_ids": [
            "automation"
          ],
          "weight": 5
        },
        "source_url": null
      },
      {
        "good_answer": "Shared testing results and a straight answer on regulatory attention.",
        "id": "data-analytics-q06",
        "question": "What testing across race, disability, age, and language has been done, on which population, and will you share the results? Has any customer, regulator, or DOJ inquiry examined this product?",
        "red_flag": "\"Bias-free\" claims, or evasion about known inquiries.",
        "select": {
          "elevated": true
        },
        "source_url": "https://www.pbs.org/newshour/nation/ap-report-doj-examining-ai-screening-tool-used-by-pa-child-welfare-agency"
      },
      {
        "good_answer": "Explicit data-quality gates and uncertainty flags.",
        "id": "data-analytics-q07",
        "question": "When our input data is wrong, stale, or missing, does the system flag uncertainty or silently score anyway?",
        "red_flag": "Silent scoring. Idaho scored unreliable data; Missouri's algorithm shipped with syntax errors.",
        "select": {
          "base": true
        },
        "source_url": "https://www.btah.org/case-studies.html"
      },
      {
        "good_answer": "A monitoring regime with named owners and suspension triggers.",
        "id": "data-analytics-q08",
        "question": "What drift monitoring and revalidation exist, who sees the results, and what triggers suspension of the model?",
        "red_flag": "No revalidation after go-live.",
        "select": {
          "base": true
        },
        "source_url": null
      },
      {
        "good_answer": "A defect-to-remediation workflow that can enumerate all affected people.",
        "id": "data-analytics-q09",
        "question": "When we discover a wrong score, what is the process to correct it, find everyone else affected by the same defect, and make them whole?",
        "red_flag": "Correction handled case by case with no systematic lookback.",
        "select": {
          "elevated": true
        },
        "source_url": null
      },
      {
        "good_answer": "Full provenance: every claim links to the query and rows behind it.",
        "id": "data-analytics-q10",
        "question": "For LLM insight layers: how do you prevent hallucinated numbers, and does every generated claim link to the underlying query and rows?",
        "red_flag": "Generated narratives with no provenance.",
        "select": {
          "base": true
        },
        "source_url": null
      },
      {
        "good_answer": "A complete list including the hard cases. This tool cross-checks vendor names against the BTAH case library and the AI Incident Database.",
        "id": "data-analytics-q11",
        "question": "List the government deployments of this specific model or product, including any that were challenged, audited, or decommissioned.",
        "red_flag": "Logos-only marketing, or omission of documented challenges.",
        "select": {
          "claim_types": [
            "customer"
          ],
          "finding_ids": [
            "customers"
          ],
          "weight": 3
        },
        "source_url": "https://www.btah.org/case-studies.html"
      },
      {
        "good_answer": "Concrete terms sized to the documented downside (Michigan: $20M plus a rebuild; Florida: a $92.4M rebuild).",
        "id": "data-analytics-q12",
        "question": "What warranty, indemnification, and insurance terms apply when system errors trigger litigation?",
        "red_flag": "Liability capped at fees paid.",
        "select": {
          "base": true,
          "tiers": [
            3,
            4
          ]
        },
        "source_url": "https://www.btah.org/case-studies.html"
      }
    ],
    "elevated_scrutiny_rules": [
      {
        "action": "Apply the eligibility-case-mgmt overlay, and use the strongest caution band for auto-executed adverse actions.",
        "condition": "A score or flag can trigger action against a person"
      },
      {
        "action": "Render the Allegheny and Loomis context; make the disparate-impact question (q06) mandatory.",
        "condition": "A child-welfare or justice screening pitch"
      },
      {
        "action": "Standard track, plus an incumbent-duplication check: does an existing Tyler, Power BI, or Tableau contract already cover this?",
        "condition": "A purely descriptive dashboard or open-data pitch"
      }
    ],
    "established_vendors": [
      {
        "gov_evidence_url": "https://www.fedramp.gov/marketplace/products/SOCRATA/",
        "name": "Tyler Data & Insights",
        "one_liner": "Formerly Socrata; FedRAMP-listed; open-data and analytics for NYC, Chicago, San Francisco, Los Angeles, and several states.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": null,
        "name": "OpenGov",
        "one_liner": "Budgeting and performance analytics for local government; AI features announced Mar 2024.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": null,
        "name": "Polco",
        "one_liner": "Community-survey and engagement analytics (\"Polly\").",
        "tier": "specialist"
      },
      {
        "gov_evidence_url": null,
        "name": "Zencity",
        "one_liner": "Resident-sentiment and engagement analytics (Zencity 360).",
        "tier": "specialist"
      },
      {
        "gov_evidence_url": null,
        "name": "Microsoft (Power BI)",
        "one_liner": "Ubiquitous general BI stack in government.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": null,
        "name": "Salesforce (Tableau)",
        "one_liner": "Ubiquitous general BI stack in government.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": null,
        "name": "Esri (ArcGIS)",
        "one_liner": "Ubiquitous geospatial analytics stack in government.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": null,
        "name": "LexisNexis Risk Solutions",
        "one_liner": "Integrity analytics for UI and tax refund investigation. This pack renders the integrity-analytics cautionary record beside any match; presence here signals \"known quantity,\" not safety.",
        "tier": "specialist"
      },
      {
        "gov_evidence_url": "https://epic.org/pondera-surveillance/",
        "name": "Thomson Reuters Pondera",
        "one_liner": "FraudCaster integrity analytics for Medicaid, SNAP, UI, WIC, and TANF; EPIC maintains a critical spotlight on the product line.",
        "tier": "specialist"
      },
      {
        "gov_evidence_url": null,
        "name": "SAS",
        "one_liner": "State UI integrity analytics, including in the MiDAS era; the cautionary record is rendered beside any match.",
        "tier": "specialist"
      }
    ],
    "failure_modes": [
      {
        "description": "Idaho's \"trade secret\" budget formula collapsed in court (with a 2025 contempt finding), Arkansas's RUGs-based algorithm was invalidated, and State v. Loomis cautions on trade-secret scores in consequential decisions (https://harvardlawreview.org/print/vol-130/state-v-loomis/). Ask on day one: what will the adverse-action notice say?",
        "named_incident": "K.W. v. Armstrong (Idaho) and the Arkansas ARChoices injunction",
        "source_url": "https://www.acluidaho.org/en/cases/kw-v-armstrong",
        "title": "Black-box scores driving consequential decisions"
      },
      {
        "description": "Fraud is rare, so even a statistically strong model mostly flags innocent people. The IRS's non-identity-theft fraud filters ran an 81% false-positive rate and delayed about $20 billion in legitimate refunds while protecting $7.6 billion (oversight finding). Michigan's MiDAS was 93% wrong per the state Auditor General. Florida's FIRRE flagged trivial discrepancies, produced a 600%+ flag surge, and ended in a $92.4M rebuild (https://www.btah.org/case-studies.html).",
        "named_incident": "IRS fraud filters at an 81% false-positive rate (Taxpayer Advocate, oversight)",
        "source_url": "https://www.taxpayeradvocate.irs.gov/wp-content/uploads/2020/07/ARC18_Volume1_MSP_05_FalsePositiveRates.pdf",
        "title": "Base rates make \"accurate\" models mostly wrong about people"
      },
      {
        "description": "A heat map or a score becomes the de facto decision with no appeal path. Michigan's Zynda settlement now requires human review of automated determinations.",
        "named_incident": "Michigan Zynda settlement requiring human review of automated determinations",
        "source_url": "https://www.btah.org/case-studies.html",
        "title": "Decision support quietly becoming the decision-maker"
      },
      {
        "description": "Idaho ran its formula on unreliable historical data; Missouri's algorithm shipped with literal syntax errors; Michigan's SNAP felony match auto-terminated roughly 19,000 people before being struck down in 2015. An LLM layer adds a hallucination surface on top of every data defect.",
        "named_incident": "Michigan SNAP felony-match auto-terminations, struck down in 2015",
        "source_url": "https://www.btah.org/case-studies.html",
        "title": "Garbage in, scored anyway"
      },
      {
        "description": "The Allegheny Family Screening Tool drew DOJ civil-rights attention over disability discrimination, and Oregon dropped its analogous tool.",
        "named_incident": "DOJ examination of the Allegheny Family Screening Tool",
        "source_url": "https://www.pbs.org/newshour/nation/ap-report-doj-examining-ai-screening-tool-used-by-pa-child-welfare-agency",
        "title": "Bias under federal scrutiny"
      },
      {
        "description": "\"Identifies savings of $X\" framing counts what was blocked, not what was delayed or wrongly denied. The IRS \"protected $7.6B\" while delaying about $20B in legitimate refunds. Demand both sides of the ledger before accepting a savings number.",
        "named_incident": "IRS refund-fraud filters: $7.6B protected versus about $20B in legitimate refunds delayed (oversight)",
        "source_url": "https://www.taxpayeradvocate.irs.gov/wp-content/uploads/2020/07/ARC18_Volume1_MSP_05_FalsePositiveRates.pdf",
        "title": "Savings claims that hide the harm side of the ledger"
      }
    ],
    "inclusion_test": [
      "Does the pitch offer dashboards, BI, \"insights,\" or an AI layer over agency data?",
      "Does it offer predictive analytics, risk scores, prioritization, or \"program integrity\" and fraud analytics?",
      "Does it offer assessment or allocation algorithms (care hours, screening scores, caseload prioritization)?",
      "Does it offer an LLM \"chat with your data\" interface?"
    ],
    "incumbent_landscape": "For BI and dashboards, Power BI, Tableau, and Esri/ArcGIS are ubiquitous. Government-specific players include Tyler Data & Insights (formerly Socrata, FedRAMP-listed; NYC, Chicago, San Francisco, Los Angeles, and the states of New York, Illinois, and Texas; https://www.fedramp.gov/marketplace/products/SOCRATA/), OpenGov (AI budgeting and performance features, Mar 2024), Polco \"Polly,\" and Zencity 360. For fraud and integrity analytics: LexisNexis Risk Solutions (unemployment insurance, tax refund investigation), Thomson Reuters Pondera (FraudCaster for Medicaid, SNAP, UI, WIC, and TANF; EPIC maintains a critical spotlight at https://epic.org/pondera-surveillance/), and SAS (state UI work). Assessment algorithms (RUGs, SIS, Optum ARIA) allocate care hours and form the sub-category with the worst documented track record in government AI. Two standing reference shelves answer \"has this category hurt people before\": the Benefits Tech Advocacy Hub case library (https://www.btah.org/case-studies.html) and the AI Incident Database (https://incidentdatabase.ai/).",
    "known_gaps": "- Current Pondera, LexisNexis, and SAS product claims were not re-verified\n  this cycle.\n- ID.me's pandemic-era record was excluded as unverified this cycle.\n- OpenGov, Polco, and Zencity deployment metrics are vendor-reported, and\n  no independent source URL was captured for them.\n- The Zynda settlement's primary court documents are not directly linked;\n  it is cited through the BTAH case library.",
    "last_updated": "2026-08-29",
    "legal_context": "- The due-process line of cases, Goldberg v. Kelly (1970) through K.W. v.\n  Armstrong (D. Idaho; 2025 contempt finding): scores that affect people\n  must be explainable and contestable\n  (https://www.acluidaho.org/en/cases/kw-v-armstrong).\n- State v. Loomis (Wis. 2016): judicial caution on trade-secret risk\n  scores in consequential decisions\n  (https://harvardlawreview.org/print/vol-130/state-v-loomis/).\n- OMB M-25-21 (2025): fraud detection is presumptively high-impact AI,\n  with required testing, human oversight, and appeals.\n- State automated-decision-system laws: New York's LOADinG Act\n  (meaningful human review) and California SIMM 150 risk ratings for\n  decision systems.",
    "pack_id": "data-analytics",
    "pack_name": "Data Analytics & Decision Support",
    "realistic_pricing": "No reliable public price anchors exist for integrity analytics. General\nBI (Power BI, Tableau) is commodity-priced per seat and often already\nlicensed. Treat pricing as secondary to the decoration-or-decision fork:\nuntil questions q01 through q05 have good answers, the price of an\nadverse-action scoring system is not the issue.",
    "reference_deployments": [
      {
        "agency": "NYC, Chicago, San Francisco, Los Angeles, and several states",
        "metric": "FedRAMP-listed platform with major-city and state deployments",
        "metric_source_type": "government-page",
        "source_url": "https://www.fedramp.gov/marketplace/products/SOCRATA/",
        "vendor_stack": "Tyler Data & Insights (formerly Socrata)",
        "what": "Open-data and internal analytics platform"
      },
      {
        "agency": "IRS (cautionary)",
        "metric": "81% false-positive rate; about $20B in legitimate refunds delayed while $7.6B was protected",
        "metric_source_type": "oversight",
        "source_url": "https://www.taxpayeradvocate.irs.gov/wp-content/uploads/2020/07/ARC18_Volume1_MSP_05_FalsePositiveRates.pdf",
        "vendor_stack": "Non-identity-theft refund fraud filters",
        "what": "Refund fraud screening"
      },
      {
        "agency": "Michigan (cautionary)",
        "metric": "Wrong more than 90% of the time per state audit; $20M settlement",
        "metric_source_type": "oversight",
        "source_url": "https://www.michigan.gov/ag/news/press-releases/2022/10/20/som-settlement-of-civil-rights-class-action-alleging-false-accusations-of-unemployment-fraud",
        "vendor_stack": "MiDAS (SAS and FAST Enterprises era)",
        "what": "Automated UI fraud adjudication"
      },
      {
        "agency": "Allegheny County, PA (cautionary)",
        "metric": "Drew DOJ civil-rights attention over disability discrimination; Oregon dropped its analogous tool",
        "metric_source_type": "independent-press",
        "source_url": "https://www.pbs.org/newshour/nation/ap-report-doj-examining-ai-screening-tool-used-by-pa-child-welfare-agency",
        "vendor_stack": "Allegheny Family Screening Tool",
        "what": "Child-welfare call screening"
      }
    ],
    "refresh_cadence": "quarterly",
    "registries_to_check": [
      {
        "name": "FedRAMP Marketplace",
        "url": "https://marketplace.fedramp.gov/",
        "what_it_proves": "Whether this specific product holds a federal cloud authorization, and at what level."
      },
      {
        "name": "GovRAMP Authorized Product List",
        "url": "https://govramp.org/",
        "what_it_proves": "State-oriented cloud security verification. Formerly StateRAMP; the name changed in February 2025."
      },
      {
        "name": "Benefits Tech Advocacy Hub case library",
        "url": "https://www.btah.org/case-studies.html",
        "what_it_proves": "A negative registry: documented cases where benefits technology harmed people. Check whether the vendor or the category appears."
      },
      {
        "name": "AI Incident Database",
        "url": "https://incidentdatabase.ai/",
        "what_it_proves": "A public log of AI system failures. Search the vendor and product name."
      },
      {
        "name": "EPIC screening-and-scoring spotlights",
        "url": "https://epic.org/pondera-surveillance/",
        "what_it_proves": "Independent critical documentation of integrity-analytics products, including Pondera FraudCaster."
      }
    ],
    "scrutiny_tier": "standard",
    "signal_lexicon": [
      "dashboard",
      "business intelligence",
      "predictive analytics",
      "risk score",
      "risk scoring",
      "data warehouse",
      "ask your data",
      "natural language query",
      "fraud analytics",
      "data visualization",
      "anomaly detection",
      "decision support",
      "forecasting"
    ],
    "skepticism_triggers": [
      {
        "claim_pattern": "\"Accuracy\" quoted without precision and recall at the operating threshold and your base rate",
        "source_url": "https://www.taxpayeradvocate.irs.gov/wp-content/uploads/2020/07/ARC18_Volume1_MSP_05_FalsePositiveRates.pdf",
        "threshold": "Any bare accuracy number",
        "why": "At fraud-level base rates, high \"accuracy\" coexists with false-positive rates of 80–90%+ among flags. The IRS 81% figure is the benchmark."
      },
      {
        "claim_pattern": "A proprietary score with a trade-secret disclosure posture",
        "source_url": "https://www.acluidaho.org/en/cases/kw-v-armstrong",
        "threshold": "Any refusal to disclose model logic",
        "why": "The Idaho precedent makes this constitutional exposure, not a licensing preference."
      },
      {
        "claim_pattern": "\"Predicts fraud\" or \"predicts risk\" with no false-positive rate, review-queue staffing model, or affected-person notice",
        "source_url": "https://www.btah.org/case-studies.html",
        "threshold": "Absence of all three",
        "why": "The MiDAS and FIRRE pattern."
      },
      {
        "claim_pattern": "\"Identifies savings of $X\"",
        "source_url": "https://www.taxpayeradvocate.irs.gov/wp-content/uploads/2020/07/ARC18_Volume1_MSP_05_FalsePositiveRates.pdf",
        "threshold": "Any savings figure without the delayed-or-denied side",
        "why": "Protected-versus-delayed framing matters: the IRS \"protected $7.6B\" while delaying about $20B in legitimate refunds."
      },
      {
        "claim_pattern": "An LLM \"ask your data\" interface with no query or row provenance",
        "source_url": null,
        "threshold": "Generated numbers that do not link to the underlying query and rows",
        "why": "Hallucinated numbers end up in official decisions. Demand that every generated claim link to the query and rows behind it."
      },
      {
        "claim_pattern": "\"Bias-free\"",
        "source_url": null,
        "threshold": "Any such claim",
        "why": "Unfalsifiable. Demand the disparate-impact testing methodology and the results."
      },
      {
        "claim_pattern": "Scores executed without mandatory human sign-off",
        "source_url": "https://www.btah.org/case-studies.html",
        "threshold": "Any auto-executed adverse action",
        "why": "Maps to the strongest caution band through the eligibility-case-mgmt overlay."
      }
    ]
  },
  "document-processing": {
    "definition": "AI that classifies, extracts data from, redacts, or routes documents: mailroom automation, form and handwriting extraction, verification-document processing, and records redaction. This pack does not cover systems that make eligibility decisions from extracted data (that adds the eligibility-case-mgmt overlay) or general document drafting for staff (see the staff-productivity pack).",
    "diligence_questions": [
      {
        "good_answer": "A field-level number with methodology, and an unhesitating yes to a pilot on your real document mix.",
        "id": "document-processing-q01",
        "question": "What field-level accuracy do you achieve on documents like ours, and will you demonstrate it in a pilot on 250–1,000 of our real documents, including faxes, phone photos, and handwriting?",
        "red_flag": "One blended \"99%\" figure, or benchmark scores from public datasets instead of your documents.",
        "select": {
          "claim_types": [
            "performance"
          ],
          "elevated": true,
          "finding_ids": [
            "perf-*"
          ],
          "weight": 5
        },
        "source_url": "https://airparser.com/blog/ai-document-extraction-accuracy-benchmarks/"
      },
      {
        "good_answer": "A precise definition. 99% character accuracy can mean roughly 80% field accuracy and far lower document-level accuracy.",
        "id": "document-processing-q02",
        "question": "Is that character, field, or document accuracy? Define the denominator.",
        "red_flag": "The vendor cannot or will not say what the denominator is.",
        "select": {
          "claim_types": [
            "performance"
          ],
          "finding_ids": [
            "perf-*"
          ],
          "weight": 4
        },
        "source_url": "https://airparser.com/blog/ai-document-extraction-accuracy-benchmarks/"
      },
      {
        "good_answer": "Production numbers in the 65–84% range with a clear definition. Covered California reports 84%; California DMV reports 65–70%.",
        "id": "document-processing-q03",
        "question": "What straight-through-processing rate do your government customers achieve in production, and how do you define STP?",
        "red_flag": "Claims above 90% before any pilot on your documents.",
        "select": {
          "claim_types": [
            "performance"
          ],
          "finding_ids": [
            "automation"
          ],
          "weight": 3
        },
        "source_url": "https://statetechmagazine.com/article/2025/04/state-and-local-agencies-deploy-artificial-intelligence-document-processing"
      },
      {
        "good_answer": "A concrete routing design, a staffing model, and a cost estimate at your volume.",
        "id": "document-processing-q04",
        "question": "Show the human review workflow: how do confidence scores route low-confidence fields, who staffs the queue, and what does that labor cost at our volume?",
        "red_flag": "\"No human review needed.\" Mature agencies mandate review at any accuracy level.",
        "select": {
          "base": true
        },
        "source_url": null
      },
      {
        "good_answer": "A direct number backed by calibration data. Ten or fewer is consistent with the stated confidence.",
        "id": "document-processing-q05",
        "question": "If we sample 100 fields you marked at 90% confidence or higher, how many will be wrong?",
        "red_flag": "More than 10 wrong signals miscalibrated confidence scores; no answer signals it has never been measured.",
        "select": {
          "claim_types": [
            "performance"
          ]
        },
        "source_url": null
      },
      {
        "good_answer": "A line-item price at your volume with a written definition of a page.",
        "id": "document-processing-q06",
        "question": "What is the all-in price per 1,000 pages at our real volume: API or license fees, feature add-ons, review tooling, integration, and reprocessing? And what counts as a \"page\"?",
        "red_flag": "A single per-page teaser rate. Full extraction runs 20–47x plain OCR once features stack.",
        "select": {
          "claim_types": [
            "pricing"
          ]
        },
        "source_url": "https://aws.amazon.com/textract/pricing/"
      },
      {
        "good_answer": "Written terms. Anchors: Azure deletes in 24 hours and does not train; Google does not train; AWS requires an explicit organization-level opt-out.",
        "id": "document-processing-q07",
        "question": "Where is our data processed and stored, is it used to train your models or any third party's, and what is the deletion timeline? We need this in writing.",
        "red_flag": "Verbal assurances, or terms that defer to an upstream provider's defaults.",
        "select": {
          "base": true
        },
        "source_url": "https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_ai-opt-out.html"
      },
      {
        "good_answer": "Named engines and a subprocessor list. This separates platforms from wrappers.",
        "id": "document-processing-q08",
        "question": "Which underlying OCR or extraction engine or foundation model do you use, and which subprocessors touch our documents?",
        "red_flag": "\"Proprietary\" used as a reason not to name the engines the pitch depends on.",
        "select": {
          "finding_ids": [
            "model-transparency"
          ]
        },
        "source_url": null
      },
      {
        "good_answer": "Product-level authorizations you can verify yourself on the FedRAMP Marketplace and the GovRAMP list.",
        "id": "document-processing-q09",
        "question": "Which authorizations do you hold: FedRAMP (at what level), GovRAMP, SOC 2 Type II? Can you support IRS Pub 1075, HIPAA, or SNAP confidentiality requirements as applicable?",
        "red_flag": "\"Compliant\" language, a SOC 2 Type I passed off as Type II, or authorizations that exist only company-wide.",
        "select": {
          "claim_types": [
            "compliance"
          ],
          "finding_ids": [
            "cert-vocab",
            "fedramp_marketplace",
            "govramp",
            "txramp"
          ],
          "weight": 2
        },
        "source_url": "https://marketplace.fedramp.gov/"
      },
      {
        "good_answer": "Both numbers reported separately, plus a described QA step on the residual.",
        "id": "document-processing-q10",
        "question": "For redaction: give us precision and recall separately. What percentage of PII do you miss, and what QA catches misses before records go public?",
        "red_flag": "One blended \"success rate.\" A missed SSN is a disclosure incident.",
        "select": {
          "claim_types": [
            "performance"
          ]
        },
        "source_url": "https://statetechmagazine.com/article/2025/04/state-and-local-agencies-deploy-artificial-intelligence-document-processing"
      },
      {
        "good_answer": "Named references. SSA, VA, Colorado HCPF, Missouri DSS, California DMV, Covered California, King County, and the Arkansas courts all exist in this category.",
        "id": "document-processing-q11",
        "question": "Name three government references at agencies our size, in production 12 or more months, including one where the rollout was hard.",
        "red_flag": "\"References are confidential.\"",
        "select": {
          "claim_types": [
            "customer"
          ],
          "finding_ids": [
            "customers"
          ],
          "weight": 3
        },
        "source_url": null
      },
      {
        "good_answer": "A complete exportable audit trail and a drift-monitoring process.",
        "id": "document-processing-q12",
        "question": "What per-document audit trail exists (model version, confidence score, every human touch), exportable for QC and inspector-general staff? What happens when document formats drift?",
        "red_flag": "No per-document trail. GAO names opacity as the accountability risk in this category (GAO-26-109137).",
        "select": {
          "base": true
        },
        "source_url": "https://www.gao.gov/products/gao-26-109137"
      },
      {
        "good_answer": "A written export commitment with format and cost.",
        "id": "document-processing-q13",
        "question": "What are the exit terms: can we export our trained models, templates, and labeled data at contract end, and at what cost?",
        "red_flag": "Export treated as a change order, or trained artifacts owned by the vendor.",
        "select": {
          "base": true,
          "tiers": [
            3,
            4
          ]
        },
        "source_url": null
      },
      {
        "good_answer": "A named language list with measured quality per language.",
        "id": "document-processing-q14",
        "question": "Which languages do you support, as a named list matched to our limited-English-proficiency population, not an adjective?",
        "red_flag": "\"Multilingual\" with no list and no measurements.",
        "select": {
          "elevated": true
        },
        "source_url": null
      }
    ],
    "elevated_scrutiny_rules": [
      {
        "action": "Apply the eligibility-case-mgmt overlay.",
        "condition": "Extracted data feeds an eligibility or benefit determination, or a fraud flag"
      },
      {
        "action": "Require the recall-reporting question (q10) in the output; raise caution if the vendor gives a single \"success rate.\"",
        "condition": "The pitch involves redaction of records for public release"
      },
      {
        "action": "Flag prominently regardless of vendor size.",
        "condition": "The pitch coaches sole-source or bid-waiver justification"
      },
      {
        "action": "Make the data-handling questions (q07, q09) mandatory-answer items.",
        "condition": "The documents contain federal tax information, HIPAA data, or immigration data"
      }
    ],
    "established_vendors": [
      {
        "gov_evidence_url": "https://www.hyperscience.ai/blog/united-states-social-security-administration-adopts-hyperscience/",
        "name": "Hyperscience",
        "one_liner": "Gartner MQ Leader; FedRAMP High and IL5 claimed; SSA ($81M award), VA, Colorado HCPF, Missouri DSS; sells \"Hypercell for SNAP.\" Also this pack's exhibit for sole-source-coaching red flags (see failure modes).",
        "tier": "platform"
      },
      {
        "gov_evidence_url": "https://statetechmagazine.com/article/2025/04/state-and-local-agencies-deploy-artificial-intelligence-document-processing",
        "name": "ABBYY",
        "one_liner": "Seven-time Everest Leader; California DMV digital mailroom at 65–70% automation.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": "https://www.carahsoft.com/tungsten-automation",
        "name": "Tungsten Automation (formerly Kofax)",
        "one_liner": "FedRAMP High and GovRAMP Authorized (TotalAgility Cloud); claims 350+ U.S. agency customers (vendor-reported count).",
        "tier": "platform"
      },
      {
        "gov_evidence_url": "https://www.gartner.com/en/documents/6912666",
        "name": "UiPath / Infrrd / WorkFusion / HCLTech",
        "one_liner": "Analyst-ranked leaders (Gartner Magic Quadrant and Everest PEAK 2025).",
        "tier": "platform"
      },
      {
        "gov_evidence_url": "https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_ai-opt-out.html",
        "name": "AWS Textract",
        "one_liner": "Hyperscaler extraction API, available in GovCloud. Caveat: by default, AWS may use content for service improvement unless the organization opts out at the org level.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": "https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/document-intelligence/data-privacy-security",
        "name": "Microsoft Azure AI Document Intelligence",
        "one_liner": "Hyperscaler extraction API; deletes input data within 24 hours and does not train on inputs.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": "https://docs.cloud.google.com/document-ai/docs/data-usage",
        "name": "Google Document AI",
        "one_liner": "Hyperscaler extraction API; FedRAMP High, HIPAA support, no training on customer content; Covered California, Hawaii Safe Travels.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": "https://www.extractsystems.com/gov-resources",
        "name": "Extract Systems (ID Shield)",
        "one_liner": "County recorder and court redaction; Pierce County WA (36M+ images), Hamilton County OH (vendor-reported).",
        "tier": "specialist"
      },
      {
        "gov_evidence_url": "https://arcourts.gov/administration/acap/redactioncontract",
        "name": "CSI Intellidact",
        "one_liner": "Statewide Arkansas Judiciary redaction contract (government contract page).",
        "tier": "specialist"
      }
    ],
    "failure_modes": [
      {
        "description": "Buyers report a 15–25 point drop from vendor benchmark to production on their own document mix, and character accuracy is often presented as field accuracy: 99% character accuracy can equal roughly 80% field accuracy (https://airparser.com/blog/ai-document-extraction-accuracy-benchmarks/). The compounding math matters too: 97% per-field accuracy on a 20-field document means only about 55% of documents come through error-free.",
        "named_incident": "VA OIG found 27% of reviewed automation-assisted claims had inaccurate determinations (oversight finding)",
        "source_url": "https://www.vaoig.gov/reports/review/improvements-needed-vbas-claims-automation-project",
        "title": "Benchmark-to-production accuracy gap"
      },
      {
        "description": "Vendors blur automation rate, straight-through-processing (STP) rate, and accuracy. Independently reported government results run 65–84% (California DMV, Covered California), and those are good outcomes.",
        "named_incident": "California DMV (65–70% automation) and Covered California (84%) set the documented ceiling for clean deployments",
        "source_url": "https://statetechmagazine.com/article/2025/04/state-and-local-agencies-deploy-artificial-intelligence-document-processing",
        "title": "Automation-rate and straight-through-processing inflation"
      },
      {
        "description": "Feature stacking changes the price by more than an order of magnitude: Textract with Forms, Tables, and Queries costs $0.070 per page, roughly 47x plain OCR (https://aws.amazon.com/textract/pricing/), and Google's Form Parser and Custom Extractor run about 20x plain OCR (https://cloud.google.com/document-ai/pricing). Watch for page-per-side counting, reprocessing billed again, and undisclosed minimums.",
        "named_incident": "Published hyperscaler price sheets show 20–47x spreads between plain OCR and full extraction",
        "source_url": "https://aws.amazon.com/textract/pricing/",
        "title": "Per-page pricing surprises"
      },
      {
        "description": "At an honest 80% STP rate on 1 million pages per year, the 200,000 exception pages equal roughly three or more FTEs of review labor, plus per-review tooling fees (AWS A2I lists $0.03 per reviewed page, https://aws.amazon.com/augmented-ai/pricing/). Mature agencies budget review permanently.",
        "named_incident": "King County, WA runs a \"no production without a human reviewer\" policy on its redaction pipeline (StateTech, Apr 2025)",
        "source_url": "https://statetechmagazine.com/article/2025/04/state-and-local-agencies-deploy-artificial-intelligence-document-processing",
        "title": "Hidden human-review costs"
      },
      {
        "description": "Provider defaults differ sharply. AWS allows service-improvement use of content unless the organization opts out (https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_ai-opt-out.html), Azure deletes inputs within 24 hours (https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/document-intelligence/data-privacy-security), and Google does not train on customer content (https://docs.cloud.google.com/document-ai/docs/data-usage). A startup wrapper calling a commercial LLM adds an unvetted second processor. Benefits documents implicate IRS Pub 1075, HIPAA, and SNAP confidentiality rules.",
        "named_incident": "Divergent published data-use defaults across AWS, Azure, and Google (documented on each provider's own pages)",
        "source_url": "https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_ai-opt-out.html",
        "title": "PII handling and retention divergence"
      },
      {
        "description": "A missed SSN in a published record is a disclosure incident. Recall (the miss rate) must be reported separately from precision; a single \"success rate\" number hides the misses. King County's 96% still implies human QA on the residual.",
        "named_incident": "King County, WA redaction: 96% success, 30 minutes down to under 5 seconds per document, with mandatory human review",
        "source_url": "https://statetechmagazine.com/article/2025/04/state-and-local-agencies-deploy-artificial-intelligence-document-processing",
        "title": "Redaction's asymmetric risk"
      },
      {
        "description": "Hyperscience's SNAP four-pager coaches agencies on sole-source justification (\"unique, non-substitutable\") in a field with 100+ vendors and five analyst-ranked Leaders (https://aphsa.org/wp-content/uploads/2026/04/251029-Hyperscience-SNAP_4-Pager.pdf). Oversight has flagged the same pattern federally.",
        "named_incident": "TIGTA flagged non-competitive IRS \"Zero Paper\" awards (oversight finding, Feb 2026)",
        "source_url": "https://www.tigta.gov/sites/default/files/reports/2026-02/2026408003fr.pdf",
        "title": "Procurement-pressure red flags"
      }
    ],
    "inclusion_test": [
      "Does the pitch mention OCR, document extraction or classification, IDP, \"digital mailroom,\" forms processing, or handwriting recognition?",
      "Does it target document backlogs, verification documents, scanned mail or faxes, or records digitization?",
      "Does it offer redaction of PII from records (court, land, personnel)?",
      "Does it claim an \"automation rate\" or \"straight-through processing,\" or use per-page or per-document pricing?"
    ],
    "incumbent_landscape": "A mature category being disrupted by LLM-native extraction. Gartner's first IDP Magic Quadrant (Sep 3, 2025) covers a market of 100+ vendors with five Leaders: ABBYY, Hyperscience, Infrrd, Tungsten Automation, and UiPath (https://www.gartner.com/en/documents/6912666). Five tiers: (1) hyperscaler APIs (AWS Textract, Azure AI Document Intelligence, Google Document AI), usually arriving inside an integrator's pitch; (2) enterprise IDP platforms (the Leaders above, plus WorkFusion, IBM Datacap, OpenText Captiva, Grooper); (3) government redaction specialists (Extract Systems, CSI Intellidact); (4) ECM incumbents with AI add-ons (Laserfiche, Hyland OnBase, Tyler). Check whether your existing ECM contract already includes capture or IDP before engaging a new vendor; many cold pitches duplicate capability you already own. (5) LLM-native startups (Extend, Reducto, Sensible, Instabase, LandingAI, Nanonets, Docsumo). Most inbound cold email comes from this tier, and few of these hold FedRAMP or GovRAMP authorizations or named U.S. state references. The core triage insight: many pitches are thin wrappers over the same three hyperscaler APIs. Ask what engine is actually under the hood.",
    "known_gaps": "- Government-reference claims by Instabase, Reducto, and Extend could not be\n  verified in public sources this cycle.\n- Azure Document Intelligence exact list prices conflicted across sources;\n  confirm on the live pricing page.\n- Extract Systems image counts and Tungsten's agency-customer count are\n  vendor-reported.\n- GovAI Coalition Trellis registry URL was not confirmed this cycle, so it\n  is cited by name only.",
    "last_updated": "2026-08-29",
    "legal_context": "- IRS Publication 1075 (federal tax information safeguards) applies when\n  processed documents contain FTI. Standing requirement as of Aug 28, 2026.\n- HIPAA applies to health documents; a business associate agreement is\n  required.\n- SNAP confidentiality rules (7 CFR 272.1) restrict use and disclosure of\n  applicant information.\n- State breach-notification laws apply to processing failures that expose\n  PII.\n- Title VI language-access obligations extend to how documents from\n  limited-English-proficiency residents are handled.",
    "pack_id": "document-processing",
    "pack_name": "Document Processing & Intake (IDP)",
    "realistic_pricing": "Plain OCR runs about $1.50 per 1,000 pages at every hyperscaler. Full\nextraction (forms, tables, queries) runs $30–70 per 1,000 pages\n(https://aws.amazon.com/textract/pricing/,\nhttps://cloud.google.com/document-ai/pricing). Human review adds about $30\nper 1,000 reviewed pages in tooling fees (AWS A2I,\nhttps://aws.amazon.com/augmented-ai/pricing/) plus the review labor itself.\nA 1-million-page-per-year program at full-feature Textract rates is roughly\n$70K per year in API fees before any integrator markup. Azure list prices\nconflicted across sources this cycle; check the live pricing page rather\nthan a quoted number.",
    "reference_deployments": [
      {
        "agency": "Social Security Administration",
        "metric": "$81M award, roughly 250 million documents per year (the contract award is public record; the metric appears on the vendor's page)",
        "metric_source_type": "vendor-reported",
        "source_url": "https://www.hyperscience.ai/blog/united-states-social-security-administration-adopts-hyperscience/",
        "vendor_stack": "Hyperscience with Accenture Federal",
        "what": "Document processing at national scale"
      },
      {
        "agency": "VA Veterans Benefits Administration",
        "metric": "Sorting time cut from about 10 days to about half a day (GAO-corroborated). The same program's hypertension-claims automation had a 27% error rate per VA OIG; cite both halves together.",
        "metric_source_type": "oversight",
        "source_url": "https://www.gao.gov/products/gao-26-109137",
        "vendor_stack": "Hyperscience",
        "what": "Claims document sorting"
      },
      {
        "agency": "Colorado HCPF",
        "metric": "Absorbed 700–1,000% image-volume growth; 99.2%/99.4% accuracy figures are vendor-reported; an ACT-IAC award provides third-party corroboration",
        "metric_source_type": "vendor-reported",
        "source_url": "https://www.hyperscience.ai/resource/state-department-of-healthcare-policy-financing-automates-snap-and-magi-documents/",
        "vendor_stack": "Hyperscience",
        "what": "SNAP and MAGI renewal-surge document automation"
      },
      {
        "agency": "Missouri DSS",
        "metric": "Named deployment; metrics are vendor-reported",
        "metric_source_type": "vendor-reported",
        "source_url": "https://aphsa.org/wp-content/uploads/2026/04/251029-Hyperscience-SNAP_4-Pager.pdf",
        "vendor_stack": "Hyperscience",
        "what": "SNAP and MAGI document processing"
      },
      {
        "agency": "California DMV",
        "metric": "65–70% automation",
        "metric_source_type": "independent-press",
        "source_url": "https://statetechmagazine.com/article/2025/04/state-and-local-agencies-deploy-artificial-intelligence-document-processing",
        "vendor_stack": "ABBYY",
        "what": "Digital mailroom"
      },
      {
        "agency": "Covered California",
        "metric": "84% verification rate; roughly 10,000 people-hours freed in year one",
        "metric_source_type": "independent-press",
        "source_url": "https://statetechmagazine.com/article/2025/04/state-and-local-agencies-deploy-artificial-intelligence-document-processing",
        "vendor_stack": "Google Document AI",
        "what": "Verification-document processing"
      },
      {
        "agency": "King County, WA",
        "metric": "96% redaction success; 30 minutes down to under 5 seconds per document; explicit no-production-without-reviewer policy",
        "metric_source_type": "independent-press",
        "source_url": "https://statetechmagazine.com/article/2025/04/state-and-local-agencies-deploy-artificial-intelligence-document-processing",
        "vendor_stack": "AWS Textract",
        "what": "Records redaction with mandatory human review"
      },
      {
        "agency": "State of Hawaii",
        "metric": "25,000+ documents per day (vendor blog with a named state official)",
        "metric_source_type": "vendor-reported",
        "source_url": "https://cloud.google.com/blog/topics/public-sector/document-ai-government-makes-it-easier-process-documents-and-deliver-better-constituent-services",
        "vendor_stack": "Google Document AI",
        "what": "Safe Travels document processing"
      },
      {
        "agency": "Arkansas Judiciary",
        "metric": "Statewide contract (government contract page)",
        "metric_source_type": "government-page",
        "source_url": "https://arcourts.gov/administration/acap/redactioncontract",
        "vendor_stack": "CSI Intellidact",
        "what": "Statewide court records redaction"
      },
      {
        "agency": "IRS Paperless Processing (cautionary)",
        "metric": "Missed its 2025 goal; non-competitive award concerns flagged by TIGTA",
        "metric_source_type": "oversight",
        "source_url": "https://www.tigta.gov/sites/default/files/reports/2026-02/2026408003fr.pdf",
        "vendor_stack": "Multiple, including an in-house system that was stopped",
        "what": "Paper digitization initiative"
      }
    ],
    "refresh_cadence": "quarterly",
    "registries_to_check": [
      {
        "name": "FedRAMP Marketplace",
        "url": "https://marketplace.fedramp.gov/",
        "what_it_proves": "Whether this specific product holds a federal cloud authorization, and at what level."
      },
      {
        "name": "GovRAMP Authorized Product List",
        "url": "https://govramp.org/",
        "what_it_proves": "State-oriented cloud security verification. Formerly StateRAMP; the name changed in February 2025."
      },
      {
        "name": "Pavilion Contract Hub",
        "url": "https://www.withpavilion.com/",
        "what_it_proves": "Existing public contracts you may be able to piggyback on; confirms other governments have bought the product."
      },
      {
        "name": "SAM.gov",
        "url": "https://sam.gov/",
        "what_it_proves": "The company exists as a registered federal contractor."
      }
    ],
    "scrutiny_tier": "standard",
    "signal_lexicon": [
      "document processing",
      "intelligent document",
      "ocr",
      "data extraction",
      "document extraction",
      "handwriting",
      "redaction",
      "mailroom",
      "document classification",
      "straight-through",
      "form processing",
      "scanned documents",
      "document intake"
    ],
    "skepticism_triggers": [
      {
        "claim_pattern": "Accuracy of 98% or higher without a field-level definition and a document mix",
        "source_url": "https://airparser.com/blog/ai-document-extraction-accuracy-benchmarks/",
        "threshold": "Accuracy claims at or above 98% with no denominator",
        "why": "The benchmark-to-production gap runs 15–25 points, and character accuracy is routinely conflated with field accuracy."
      },
      {
        "claim_pattern": "A straight-through-processing promise above 90% before a pilot on your documents",
        "source_url": "https://statetechmagazine.com/article/2025/04/state-and-local-agencies-deploy-artificial-intelligence-document-processing",
        "threshold": "STP above 90% pre-pilot",
        "why": "Real government results run 65–84%; 70–90% is the ceiling for clean documents."
      },
      {
        "claim_pattern": "\"No human review required\" or \"fully autonomous\"",
        "source_url": "https://www.vaoig.gov/reports/review/improvements-needed-vbas-claims-automation-project",
        "threshold": "Any such claim, at any accuracy level",
        "why": "Mature agencies mandate review. VA OIG found 27% of reviewed automation-assisted claims had inaccurate determinations."
      },
      {
        "claim_pattern": "A handwriting accuracy claim of 97% or higher without a stated character-error rate",
        "source_url": "https://www.llamaindex.ai/blog/ocr-accuracy",
        "threshold": "Handwriting claims at or above 97%",
        "why": "A 3–5% character error rate is a good result for handwriting."
      },
      {
        "claim_pattern": "\"Only solution on the market\" or sole-source coaching",
        "source_url": "https://aphsa.org/wp-content/uploads/2026/04/251029-Hyperscience-SNAP_4-Pager.pdf",
        "threshold": "Any uniqueness claim or bid-waiver coaching",
        "why": "100+ vendors and five Gartner Leaders exist in this category; even market leaders make this claim in writing."
      },
      {
        "claim_pattern": "A simple per-page rate with no feature, review, or minimum breakdown",
        "source_url": "https://aws.amazon.com/textract/pricing/",
        "threshold": "A single blended per-page rate",
        "why": "Full extraction is 20–47x plain OCR once features stack, and review adds fees plus staff time."
      },
      {
        "claim_pattern": "ROI multiples (615%, 167%) without your volumes and baseline labor cost",
        "source_url": null,
        "threshold": "Any ROI multiple presented without your inputs",
        "why": "These figures trace to vendor-commissioned studies (IDC for Hyperscience), not to your operation."
      },
      {
        "claim_pattern": "\"Deployed in 45 days\" for work that touches an eligibility system",
        "source_url": "https://www.tigta.gov/sites/default/files/reports/2026-02/2026408003fr.pdf",
        "threshold": "Any promise under 90 days for eligibility-system integration",
        "why": "The vendor's own FAQ concedes timelines vary, and the IRS missed a multi-year digitization goal (oversight finding)."
      },
      {
        "claim_pattern": "A redaction \"success rate\" quoted as one number",
        "source_url": "https://statetechmagazine.com/article/2025/04/state-and-local-agencies-deploy-artificial-intelligence-document-processing",
        "threshold": "A single blended redaction metric",
        "why": "Demand recall (the miss rate) reported separately. A missed SSN is a disclosure incident."
      },
      {
        "claim_pattern": "No written data-retention or no-training commitment",
        "source_url": "https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_ai-opt-out.html",
        "threshold": "Absence of written terms",
        "why": "Provider defaults differ sharply; verify GovRAMP and FedRAMP listings independently rather than taking the pitch's word."
      },
      {
        "claim_pattern": "All-federal or logos-only references",
        "source_url": null,
        "threshold": "Zero named state or local references",
        "why": "Named state and local references exist across this category; their absence is diagnostic."
      }
    ]
  },
  "eligibility-case-mgmt": {
    "definition": "AI that touches who gets benefits or what happens to their case: eligibility screening and determination, renewals, verification, fraud detection and identity-proofing, case-management copilots, benefit-notice generation, and work-requirement compliance tooling. This is the only pack where a software error is, by legal definition, a deprivation of a constitutionally protected property interest (Goldberg v. Kelly, 397 U.S. 254). Not this pack alone: pure document extraction (see document-processing, unless the output feeds determinations) and applicant-side benefit screeners that only widen access, which sit in a different risk class.",
    "diligence_questions": [
      {
        "good_answer": "An unambiguous \"a named human makes every adverse decision,\" with UI evidence showing how.",
        "id": "eligibility-case-mgmt-q01",
        "question": "Does your system ever deny, reduce, terminate, or flag-for-fraud on its own, or does a named human make every adverse decision?",
        "red_flag": "\"Configurable,\" \"auto-adjudication,\" or any hedging. This question has no acceptable middle answer.",
        "select": {
          "base": true,
          "overlay_core": true
        },
        "source_url": null
      },
      {
        "good_answer": "Actual notice text that satisfies 42 CFR 431.210 (Medicaid) or 7 CFR 273.13 (SNAP): specific reasons, specific regulation.",
        "id": "eligibility-case-mgmt-q02",
        "question": "Show the exact notice a person receives after an AI-influenced denial. Does it state the specific factual reasons and the regulation relied on?",
        "red_flag": "A generic template, or a generated paragraph offered as the \"explanation.\"",
        "select": {
          "base": true,
          "overlay_core": true
        },
        "source_url": null
      },
      {
        "good_answer": "Yes to both, in writing. Idaho's K.W. v. Armstrong establishes that due process outranks trade secrets.",
        "id": "eligibility-case-mgmt-q03",
        "question": "On appeal, can you produce the complete record (inputs, extractions, model version, what the human saw and did), and will you commit in contract that nothing is withheld as a trade secret?",
        "red_flag": "Any trade-secret carve-out over decision logic.",
        "select": {
          "base": true,
          "overlay_core": true
        },
        "source_url": "https://www.acluidaho.org/en/cases/kw-v-armstrong"
      },
      {
        "good_answer": "State-specific evaluation results with a defined denominator, or an honest \"we have not measured that yet.\"",
        "id": "eligibility-case-mgmt-q04",
        "question": "What is your measured accuracy on OUR state's rules, evaluated against our policy manual and historically adjudicated cases, and what is the denominator?",
        "red_flag": "A generic accuracy number from another state or from a demo corpus.",
        "select": {
          "claim_types": [
            "performance"
          ],
          "finding_ids": [
            "perf-*"
          ],
          "weight": 4
        },
        "source_url": null
      },
      {
        "good_answer": "Published or shareable breakouts, plus support for independent testing.",
        "id": "eligibility-case-mgmt-q05",
        "question": "Break error rates out by language, disability status, age, and, where lawful, race and ethnicity. What disparate-performance testing exists, and will you support our own pre-deployment and annual testing?",
        "red_flag": "\"Our AI is unbiased\" with no data behind it.",
        "select": {
          "elevated": true,
          "weight": 3
        },
        "source_url": null
      },
      {
        "good_answer": "A confidence-threshold design, the share of items routed to humans, and sampling audits of high-confidence outputs.",
        "id": "eligibility-case-mgmt-q06",
        "question": "What happens when the model is wrong but confident?",
        "red_flag": "No sampling of high-confidence outputs; those are exactly the errors that reach residents.",
        "select": {
          "elevated": true
        },
        "source_url": null
      },
      {
        "good_answer": "A named process with a turnaround commitment and regression testing.",
        "id": "eligibility-case-mgmt-q07",
        "question": "Who updates the system when our state plan, waivers, or verification rules change, how fast, and how is the change tested?",
        "red_flag": "No update pipeline. NYC's chatbot stayed wrong for roughly two years.",
        "select": {
          "base": true
        },
        "source_url": "https://themarkup.org/artificial-intelligence/2024/03/29/nycs-ai-chatbot-tells-businesses-to-break-the-law"
      },
      {
        "good_answer": "Written no-training terms and authorizations you can verify at https://marketplace.fedramp.gov/ and https://govramp.org/. \"In process\" is not \"authorized.\"",
        "id": "eligibility-case-mgmt-q08",
        "question": "Where does our data go? Is applicant data used to train models or shared with third parties? Which of these do you hold: GovRAMP or FedRAMP authorization, SOC 2 Type II, IRS Pub 1075 and HIPAA compliance?",
        "red_flag": "Verbal assurances, or \"compliant\" phrasing.",
        "select": {
          "base": true
        },
        "source_url": "https://marketplace.fedramp.gov/"
      },
      {
        "good_answer": "A knowledgeable answer about 45 CFR 95.611 and named states where the vendor navigated it.",
        "id": "eligibility-case-mgmt-q09",
        "question": "Does this require an APD amendment or CMS/FNS sign-off, and have you been through that process in other states?",
        "red_flag": "A vendor who has never heard of an APD has never really deployed in this space.",
        "select": {
          "elevated": true
        },
        "source_url": null
      },
      {
        "good_answer": "Named production references plus any independent evaluation. Cross-check the CCF AI Knowledge Hub and Code for America's landscape assessment.",
        "id": "eligibility-case-mgmt-q10",
        "question": "Name three comparable agencies in production, not pilots, that we can call. What independent evaluations of your product exist?",
        "red_flag": "Pilots presented as production, or logos with no callable contact.",
        "select": {
          "claim_types": [
            "customer"
          ],
          "finding_ids": [
            "customers"
          ],
          "weight": 3
        },
        "source_url": "https://codeforamerica.org/explore/government-ai-landscape-assessment/"
      },
      {
        "good_answer": "Real numbers: a plausible per-item review time and a nonzero override rate.",
        "id": "eligibility-case-mgmt-q11",
        "question": "What is the caseworker's realistic review burden: items per worker per day, and your own override-rate data?",
        "red_flag": "No override data, or volumes that make real review impossible. Near-zero overrides means rubber-stamping.",
        "select": {
          "elevated": true,
          "finding_ids": [
            "automation"
          ],
          "weight": 2
        },
        "source_url": null
      },
      {
        "good_answer": "A concrete plan: affected-case query capability, notification templates, a reinstatement workflow, and timelines.",
        "id": "eligibility-case-mgmt-q12",
        "question": "What is your rollback plan? If we find a systematic error, how fast can we identify every affected case, notify people, and reinstate benefits?",
        "red_flag": "No answer here means no deployment.",
        "select": {
          "base": true,
          "overlay_core": true
        },
        "source_url": null
      },
      {
        "good_answer": "Contractual acceptance of indemnification and audit rights.",
        "id": "eligibility-case-mgmt-q13",
        "question": "Who bears liability for wrongful denials caused by system error, and will you accept indemnification and audit-rights clauses?",
        "red_flag": "Liability pushed entirely onto the agency. Deloitte's \"not our systems\" posture shows why this must be contractual.",
        "select": {
          "elevated": true,
          "tiers": [
            3,
            4
          ]
        },
        "source_url": "https://kffhealthnews.org/news/article/medicaid-deloitte-run-eligibility-systems-plagued-by-errors/"
      }
    ],
    "elevated_scrutiny_rules": [
      {
        "action": "The output floor is the \"enhanced review\" band. The \"established vendor, proceed to demo\" band is unavailable until the human-decides-adverse-actions question (q01) is answered.",
        "condition": "Any match on this pack"
      },
      {
        "action": "Strongest caution band, always.",
        "condition": "A claim of automated adverse action"
      },
      {
        "action": "Classify as an adverse-action system regardless of framing.",
        "condition": "A fraud-detection or identity-verification pitch"
      },
      {
        "action": "Highest caution band, plus OBBBA implementation-overload context (https://www.tpr.org/news/2026-07-21/deloitte-run-systems-denied-medicaid-to-disabled-people-new-laws-could-make-it-worse).",
        "condition": "A work-requirement or exemption-screening pitch (the 2026 build-out wave)"
      },
      {
        "action": "May be evaluated on standard merits, with this pack's questions q01, q02, q03, and q11 still included.",
        "condition": "A copilot or summarization-only pitch with named-human decision-making"
      },
      {
        "action": "Prepend the \"Why this category is different\" block (the top of this pack's legal_context) and add questions q01, q02, q03, and q12 to that pack's question list.",
        "condition": "This pack is triggered as an overlay from another pack"
      }
    ],
    "established_vendors": [
      {
        "gov_evidence_url": "https://kffhealthnews.org/news/article/medicaid-deloitte-run-eligibility-systems-plagued-by-errors/",
        "name": "Deloitte",
        "one_liner": "Dominant integrated-eligibility integrator (25+ states). Its systems' documented error record is rendered beside any match; a listing here is not a safety signal.",
        "tier": "integrator"
      },
      {
        "gov_evidence_url": null,
        "name": "Accenture",
        "one_liner": "Major eligibility and Medicaid systems integrator.",
        "tier": "integrator"
      },
      {
        "gov_evidence_url": null,
        "name": "Gainwell",
        "one_liner": "Medicaid Management Information Systems ecosystem vendor.",
        "tier": "integrator"
      },
      {
        "gov_evidence_url": null,
        "name": "Conduent",
        "one_liner": "Medicaid systems and payments integrator.",
        "tier": "integrator"
      },
      {
        "gov_evidence_url": null,
        "name": "Optum",
        "one_liner": "Health and human services systems and analytics vendor.",
        "tier": "integrator"
      },
      {
        "gov_evidence_url": null,
        "name": "Maximus",
        "one_liner": "Dominant eligibility-support BPO, now marketing AI capabilities.",
        "tier": "integrator"
      },
      {
        "gov_evidence_url": null,
        "name": "Merative Curam",
        "one_liner": "Social-program COTS platform (formerly IBM Curam).",
        "tier": "platform"
      },
      {
        "gov_evidence_url": null,
        "name": "Salesforce",
        "one_liner": "Case-management-on-platform offering for human services.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": null,
        "name": "ServiceNow",
        "one_liner": "Case-management-on-platform offering for human services.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": null,
        "name": "RedMane",
        "one_liner": "Human-services-specific case management tooling.",
        "tier": "specialist"
      },
      {
        "gov_evidence_url": null,
        "name": "Northwoods",
        "one_liner": "Human-services-specific document and case tooling.",
        "tier": "specialist"
      },
      {
        "gov_evidence_url": "https://www.hyperscience.ai/resource/state-department-of-healthcare-policy-financing-automates-snap-and-magi-documents/",
        "name": "Hyperscience",
        "one_liner": "Benefits document and intake automation (Colorado HCPF, Missouri DSS); see the document-processing pack for the full record.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": "https://www.navapbc.com/insights",
        "name": "Nava PBC",
        "one_liner": "Caseworker-assist pilots with published guardrails and an open-source toolkit; the methodological transparency benchmark.",
        "tier": "specialist"
      }
    ],
    "failure_modes": [
      {
        "description": "Michigan's MiDAS system auto-adjudicated unemployment-insurance fraud with no human review. A state audit found its determinations were wrong more than 90% of the time. Roughly 40,000 people were accused, with wage garnishments and bankruptcies that followed. The state paid a $20 million settlement, and vendor-liability claims proceeded against SAS and FAST Enterprises in Cahoo (https://www.btah.org/case-study/michigan-unemployment-insurance-false-fraud-determinations.html).",
        "named_incident": "Michigan MiDAS false fraud determinations; $20M civil-rights settlement (2022)",
        "source_url": "https://www.michigan.gov/ag/news/press-releases/2022/10/20/som-settlement-of-civil-rights-class-action-alleging-false-accusations-of-unemployment-fraud",
        "title": "Automated fraud adjudication without human review (Michigan MiDAS)"
      },
      {
        "description": "Australia's Robodebt scheme unlawfully raised A$1.76 billion in debts against roughly 433,000 people through automated income averaging. It ended in a Royal Commission.",
        "named_incident": "Australia Robodebt Royal Commission (2023)",
        "source_url": "https://clcs.org.au/robodebt-royal-commission-report-unravels-systemic-injustice-and-recommends-urgent-reform/",
        "title": "Automated debt raising at national scale (Robodebt)"
      },
      {
        "description": "Arkansas replaced nurse judgment with an algorithm that cut home-care hours and failed to account for cerebral palsy in its logic. A court permanently enjoined its use.",
        "named_incident": "Arkansas ARChoices care-hour algorithm permanently enjoined (2018)",
        "source_url": "https://arktimes.com/news/arkansas-reporter/2018/05/31/archoices-rule-blocked",
        "title": "An algorithm replacing professional discretion (Arkansas ARChoices)"
      },
      {
        "description": "Idaho's \"trade secret\" budget formula for disability services was struck down as effectively arbitrary, and in 2025 the court found the state in contempt over delays. Due process outranks trade secrets.",
        "named_incident": "K.W. v. Armstrong (Idaho); 2025 contempt finding",
        "source_url": "https://www.acluidaho.org/en/cases/kw-v-armstrong",
        "title": "Trade-secret formulas struck down (Idaho, K.W. v. Armstrong)"
      },
      {
        "description": "Tennessee's Deloitte-built $400 million eligibility system contributed to roughly 250,000 children losing coverage. A federal court found Medicaid Act, due process, and ADA violations in A.M.C. v. Smith.",
        "named_incident": "A.M.C. v. Smith (Tennessee TEDS), federal court ruling",
        "source_url": "https://healthlaw.org/resource/case-explainer-amc-v-smith/",
        "title": "Modernization that cut children off coverage (Tennessee TEDS)"
      },
      {
        "description": "NYC's MyCity chatbot confidently invented program rules on an official government channel, gave contradictory answers to identical questions, and stayed running for years afterward.",
        "named_incident": "NYC MyCity chatbot (The Markup, Mar 29, 2024)",
        "source_url": "https://themarkup.org/artificial-intelligence/2024/03/29/nycs-ai-chatbot-tells-businesses-to-break-the-law",
        "title": "Confident hallucination on an official channel (NYC MyCity)"
      },
      {
        "description": "Documented and near-term patterns specific to language models: a post-hoc rationalization is not an appeal-safe explanation (a generated \"reason\" cannot honestly populate a 42 CFR 431.210 notice unless the decision logic is deterministic and cited); automation bias turns a nominal \"human in the loop\" into rubber-stamping at MiDAS and Robodebt scale; extraction errors propagate silently into denials; models can be sycophantic toward a caseworker's fraud hypothesis; performance gaps hit multilingual users and people with disabilities; and rules-to-code translation is promising but error-prone in practice.",
        "named_incident": "Beeck Center rules-as-code experiments with public-benefits policy found translation errors",
        "source_url": "https://digitalgovernmenthub.org/library/ai-powered-rules-as-code-experiments-with-public-benefits-policy/",
        "title": "LLM-specific failure patterns in benefits work"
      }
    ],
    "inclusion_test": [
      "Does the pitch mention eligibility, determinations, enrollment, renewals or recertification, benefits processing, or case management for Medicaid, SNAP, TANF, unemployment insurance, child care, or child welfare?",
      "Does it mention fraud detection, program integrity, identity verification, or \"payment accuracy\" for a benefits program?",
      "Does it mention work-requirement or community-engagement verification or exemption screening (the 2026 OBBBA build-out wave)?",
      "Does it offer caseworker copilots, case summarization, or benefit-notice drafting?",
      "Does any other pack's pitch describe outputs that could deny, reduce, terminate, or flag a person's benefits? (This is the overlay trigger.)"
    ],
    "incumbent_landscape": "Integrators and COTS: Deloitte dominates integrated eligibility (25+ states, $5B+ in contracts, roughly 53 million Medicaid enrollees on its systems, per KFF Health News: https://kffhealthnews.org/news/article/medicaid-deloitte-run-eligibility-systems-plagued-by-errors/). Accenture, Gainwell, Conduent, and Optum populate the Medicaid systems ecosystem; Maximus is the dominant eligibility-support BPO now marketing AI; Merative Curam (formerly IBM) is the social-program COTS; Salesforce and ServiceNow push case-management-on-platform; RedMane, Diona, and Northwoods sell human-services-specific tooling. Critical context: the incumbents' deterministic systems, before any generative AI, produced wrong notices, impossible deadlines, 25,000 erroneous Kentucky terminations, and 2026 Michigan disability miscoverage (https://www.npr.org/2026/07/20/nx-s1-5896359/medicaid-disabled-patients-denied-deloitte-michigan). Deloitte's defense (\"they're not Deloitte systems\") shows accountability allocation is contested even among the biggest incumbents, so a listing in this pack is emphatically not a safety signal. The legitimate near-term AI layer is document and intake automation (Hyperscience in Colorado and Missouri; Pennsylvania legibility scanning; New Jersey document validation; North Carolina summarization, per Code for America: https://codeforamerica.org/explore/government-ai-landscape-assessment/). The 2025–26 copilot wave: Nava PBC (the most methodologically transparent, with an open-source Caseworker Empowerment Toolkit and published guardrails), the Maryland and Anthropic navigation agent, Augintel, and frontier-lab GSA OneGov seats putting near-free LLMs inside agencies. AI increasingly arrives through staff tooling, not procurement. The highest-risk adjacent lane is fraud and identity vendors (SAS and FAST Enterprises in the MiDAS era; Pondera, now Thomson Reuters; LexisNexis; ID.me). Treat any \"AI fraud detection\" pitch as an adverse-action system, full stop.",
    "known_gaps": "- The final disposition of Cahoo (vendor-liability claims from MiDAS) was\n  not re-verified this cycle.\n- The 2023 Medicaid unwinding ex parte error event (roughly 30 states ran\n  renewals at the household level; CMS forced reinstatement of about\n  500,000 people, mostly children) is excluded from failure modes until\n  the primary CMS document is re-fetched.\n- Current product claims by fraud and identity vendors (Pondera,\n  LexisNexis, ID.me) were not re-verified this cycle.\n- Colorado AI Act 2026 amendment status is uncertain; verify before\n  citing.",
    "last_updated": "2026-08-29",
    "legal_context": "## Why this category is different\n\nWhen AI touches who gets Medicaid, SNAP, unemployment, or child care\nassistance, errors are not inconveniences. They are unlawful deprivations.\nCourts have already ruled against automated benefits systems in Michigan\n(a $20M settlement over false fraud accusations; auto-adjudicated fraud\nfindings wrong more than 90% of the time), Tennessee (due process and ADA\nviolations), and Arkansas and Idaho (invalidated care-cutting algorithms),\nand Australia's Robodebt collapsed into a royal commission. Federal policy\n(OMB M-25-21) presumes AI used in benefits adjudication and fraud\ndetection is \"high-impact,\" requiring testing, human oversight, and\nappeals, and several states now require meaningful human review by law.\nThis tool therefore applies its strictest evidence bar here: any vendor\nclaiming to automate or accelerate adverse decisions (denials, reductions,\nterminations, fraud flags) is flagged for enhanced review regardless of\ncompany size or references. AI that helps staff read documents, summarize\ncases, and draft communications, with a named human making every decision,\nappeal-ready explanations, and audit trails, can be evaluated on its\nmerits. AI that decides is not a product category this tool will ever mark\nlow-risk.\n\n## Controlling law and policy\n\n- Goldberg v. Kelly, 397 U.S. 254 (1970) and Mathews v. Eldridge (1976):\n  the constitutional floor for process before benefits are taken away\n  (https://www.law.cornell.edu/supremecourt/text/397/254).\n- 42 CFR 431.210 (Medicaid) and 7 CFR 273.13 (SNAP): what a legally\n  sufficient adverse-action notice must contain.\n- K.W. v. Armstrong (D. Idaho): no trade-secret shield over decision\n  logic; 2025 contempt finding\n  (https://www.acluidaho.org/en/cases/kw-v-armstrong).\n- A.M.C. v. Smith (M.D. Tenn.): ADA liability attaches to\n  eligibility-system failures\n  (https://healthlaw.org/resource/case-explainer-amc-v-smith/).\n- OMB M-25-21 (2025): benefits adjudication, continued-eligibility\n  determination, and fraud detection are presumptively high-impact, with\n  mandatory pre-deployment testing, impact assessment, monitoring, trained\n  human oversight with a fail-safe, and remedies and appeals\n  (https://www.whitehouse.gov/wp-content/uploads/2025/02/M-25-21-Accelerating-Federal-Use-of-AI-through-Innovation-Governance-and-Public-Trust.pdf).\n- New York LOADinG Act: requires \"continued, operational and meaningful\n  human review.\" New York NYS-P24-001: \"Automated final decision systems\n  are not permitted.\"\n- Texas TRAIGA (effective Jan 1, 2026). Verify current status before\n  citing.\n- Colorado AI Act (delayed to Jun 30, 2026). Verify current status before\n  citing.\n- 45 CFR 95.611: APD approval gates for changes to federally funded\n  eligibility systems.\n- California SIMM 150: rates \"service eligibility assessments for housing\n  or income assistance\" at least Moderate risk.",
    "pack_id": "eligibility-case-mgmt",
    "pack_name": "Eligibility, Benefits Processing & Case Management",
    "realistic_pricing": "No published price anchors exist for determination-adjacent AI in public\nbenefits. The honest guidance: any pricing conversation is premature until\ndiligence questions q01 through q03 pass. For the document-automation\nslice, use the document-processing pack's anchors.",
    "reference_deployments": [
      {
        "agency": "Multiple state agencies (Nava PBC pilots)",
        "metric": "Open-source Caseworker Empowerment Toolkit published Apr 2026",
        "metric_source_type": "vendor-reported",
        "source_url": "https://www.navapbc.com/insights",
        "vendor_stack": "Nava PBC",
        "what": "Caseworker-assist pilots with published guardrails (transparency, oversight prompts, intervention controls, plain-language explanations)"
      },
      {
        "agency": "Pennsylvania",
        "metric": "Cited as a scaled, lower-risk intake use in Code for America's second annual landscape assessment",
        "metric_source_type": "independent-press",
        "source_url": "https://codeforamerica.org/news/code-for-america-unveils-second-annual-government-ai-landscape-assessment/",
        "vendor_stack": "Document legibility scanning at intake",
        "what": "Legibility scanning at intake, scaled"
      },
      {
        "agency": "Maryland, New Jersey, and Utah",
        "metric": "Documented as pilots, not production determinations",
        "metric_source_type": "independent-press",
        "source_url": "https://codeforamerica.org/explore/government-ai-landscape-assessment/",
        "vendor_stack": "Applicant navigation and assistant pilots (Maryland with Anthropic)",
        "what": "Benefits navigation and applicant-assistant pilots"
      },
      {
        "agency": "Colorado HCPF and Missouri DSS",
        "metric": "Colorado absorbed 700–1,000% image-volume growth during the renewal surge",
        "metric_source_type": "vendor-reported",
        "source_url": "https://www.hyperscience.ai/resource/state-department-of-healthcare-policy-financing-automates-snap-and-magi-documents/",
        "vendor_stack": "Hyperscience",
        "what": "Intake automation with confidence-threshold human routing"
      },
      {
        "agency": "CCF Public Benefit Innovation Fund awardees (multi-state)",
        "metric": "$8.5M committed in Dec 2025",
        "metric_source_type": "independent-press",
        "source_url": "https://www.centerforcivicfutures.org/resources/center-for-civic-futures-and-partners-commit-8-5m-for-ai-solutions-that-improve-safety-net-program-delivery",
        "vendor_stack": "APHSA/Nava multi-state SNAP-Medicaid work verification; Maryland DOL; New Jersey cross-program eligibility; Mississippi SNAP; New Mexico and Oregon benefit notices; a Vals AI SNAP GenAI benchmark",
        "what": "Funded, evaluated safety-net AI projects, the alternative to cold-pitch adoption"
      }
    ],
    "refresh_cadence": "monthly",
    "registries_to_check": [
      {
        "name": "FedRAMP Marketplace",
        "url": "https://marketplace.fedramp.gov/",
        "what_it_proves": "Whether this specific product holds a federal cloud authorization, and at what level. \"In process\" is not \"authorized.\""
      },
      {
        "name": "GovRAMP Authorized Product List",
        "url": "https://govramp.org/",
        "what_it_proves": "State-oriented cloud security verification. Formerly StateRAMP; the name changed in February 2025."
      },
      {
        "name": "Benefits Tech Advocacy Hub case library",
        "url": "https://www.btah.org/case-studies.html",
        "what_it_proves": "A negative registry: documented cases where benefits technology harmed people. Check whether the vendor or the category appears."
      },
      {
        "name": "AI Incident Database",
        "url": "https://incidentdatabase.ai/",
        "what_it_proves": "A public log of AI system failures. Search the vendor and product name."
      },
      {
        "name": "Center for Civic Futures AI Knowledge Hub",
        "url": "https://www.centerforcivicfutures.org/",
        "what_it_proves": "Partner-maintained record of government AI projects and evaluations, including funded safety-net work."
      }
    ],
    "scrutiny_tier": "elevated",
    "signal_lexicon": [
      "eligibility",
      "case management",
      "benefits determination",
      "snap",
      "medicaid",
      "tanf",
      "caseworker",
      "adjudication",
      "recertification",
      "program integrity",
      "fraud detection",
      "improper payments",
      "public benefits",
      "benefits application",
      "unemployment claims"
    ],
    "skepticism_triggers": [
      {
        "claim_pattern": "\"Fully automated eligibility determination\" or \"touchless processing\"",
        "source_url": "https://www.btah.org/case-study/michigan-unemployment-insurance-false-fraud-determinations.html",
        "threshold": "Any such claim applied to adverse actions",
        "why": "Presumptively disqualifying. This is the MiDAS and Robodebt pattern, and it maps to the tool's strongest caution band regardless of vendor pedigree."
      },
      {
        "claim_pattern": "\"Reduces fraud by X%\"",
        "source_url": "https://www.michigan.gov/ag/news/press-releases/2022/10/20/som-settlement-of-civil-rights-class-action-alleging-false-accusations-of-unemployment-fraud",
        "threshold": "Any fraud-reduction percentage",
        "why": "Demand the false-positive rate and what happens to flagged people while \"under review.\" MiDAS was wrong more than 90% of the time."
      },
      {
        "claim_pattern": "\"99%+ accuracy\"",
        "source_url": null,
        "threshold": "Any accuracy claim without state-specific evaluation, a denominator, and breakouts by field, case type, language, and disability",
        "why": "Blended accuracy hides exactly the errors that become wrongful denials."
      },
      {
        "claim_pattern": "\"Unbiased AI\" or \"bias-free AI\"",
        "source_url": null,
        "threshold": "Any such claim",
        "why": "Unfalsifiable. The honest form is \"here is our disparate-performance testing and here are the results.\""
      },
      {
        "claim_pattern": "\"Explainable AI\" meaning a chatbot paragraph",
        "source_url": null,
        "threshold": "An explanation that is not a legally sufficient notice",
        "why": "A generated paragraph is not a 42 CFR 431.210 notice. Ask to see actual notice text."
      },
      {
        "claim_pattern": "\"Proprietary; we cannot share how it works\"",
        "source_url": "https://www.acluidaho.org/en/cases/kw-v-armstrong",
        "threshold": "Any trade-secret posture over decision logic",
        "why": "K.W. v. Armstrong establishes that due process outranks trade secrets."
      },
      {
        "claim_pattern": "\"Deploy in weeks\" for anything touching the eligibility system",
        "source_url": null,
        "threshold": "A deployment promise under 90 days",
        "why": "It ignores APD and CMS/FNS approval gates (45 CFR 95.611). Kentucky's single defect took 10 months and $522K to fix."
      },
      {
        "claim_pattern": "\"Human in the loop\" without numbers",
        "source_url": null,
        "threshold": "No items-per-reviewer-per-day or override-rate data",
        "why": "Near-zero overrides means the human is a rubber stamp."
      },
      {
        "claim_pattern": "\"FedRAMP compliant\" or \"StateRAMP compliant\"; a SOC 2 Type I passed off as Type II",
        "source_url": "https://marketplace.fedramp.gov/",
        "threshold": "The word \"compliant\" instead of \"authorized\"",
        "why": "Verify authorization status on the marketplaces directly. \"In process\" is not \"authorized.\""
      },
      {
        "claim_pattern": "\"Trusted by [state]\"",
        "source_url": null,
        "threshold": "A reference that turns out to be an unpaid pilot or a constituent-services chatbot rebranded as eligibility tech",
        "why": "Call the named agency and ask what is actually in production."
      },
      {
        "claim_pattern": "\"AI will clear your backlog\"",
        "source_url": "https://healthlaw.org/resource/case-explainer-amc-v-smith/",
        "threshold": "Backlog-clearing claims during unwinding or work-requirement crunches",
        "why": "Speed pressure on adverse actions is precisely how Tennessee and Michigan happened."
      },
      {
        "claim_pattern": "\"We handle appeals too\"",
        "source_url": null,
        "threshold": "The vendor adjudicating appeals of its own system's decisions",
        "why": "A due-process conflict of interest."
      },
      {
        "claim_pattern": "Free pilots contingent on broad data access",
        "source_url": "https://www.whitehouse.gov/wp-content/uploads/2025/02/M-25-21-Accelerating-Federal-Use-of-AI-through-Innovation-Governance-and-Public-Trust.pdf",
        "threshold": "Any free pilot conditioned on access to applicant data",
        "why": "A data-acquisition play. OMB M-25-21 tells federal agencies to bar vendor training on government data."
      }
    ]
  },
  "permitting-licensing": {
    "definition": "AI sold to building departments, planning and development services, code enforcement, and business or professional licensing programs: automated plan review and code-compliance pre-checks, permit intake triage and completeness screening, permitting and licensing chatbots, inspection scheduling and routing, and detection tools that scan imagery or rental listings for violations. Not this pack alone: general document extraction (see document-processing), constituent chatbots with no permit or license function (see public-comms), and any pitch whose outputs could deny, reduce, or flag a person's public benefits, which triggers the eligibility-case-mgmt overlay.",
    "diligence_questions": [
      {
        "good_answer": "A clear statement that outputs are advisory and named staff take every final action, shown in the product. Automated issuance is credible only for narrow prescriptive types with express statutory backing, like California SB 379 solar permits.",
        "id": "permitting-licensing-q01",
        "question": "Does your system ever approve or deny a permit or license, or issue a violation notice, on its own? If anything is issued automatically, which statute authorizes that, and for which project types?",
        "red_flag": "\"Configurable auto-approval,\" \"touchless,\" or hedging. No named US city deployment gives AI final decision authority on plan review.",
        "select": {
          "base": true,
          "weight": 10
        },
        "source_url": "https://www.route-fifty.com/artificial-intelligence/2026/08/cities-turn-ai-speed-housing-permitting/415564/"
      },
      {
        "good_answer": "A named encoding and update process with a turnaround commitment and regression testing, demonstrated on one of your actual local amendments during the demo.",
        "id": "permitting-licensing-q02",
        "question": "Our codes include local amendments to the model codes. Which exact code editions and local amendments does your system check against today? Who updates it when our council changes the rules, how fast, and how is the change tested?",
        "red_flag": "Trained on model IBC/IRC text only, or no update pipeline. Rules that drift out of date produce confident wrong answers.",
        "select": {
          "base": true,
          "weight": 9
        },
        "source_url": null
      },
      {
        "good_answer": "Task-level numbers with a defined denominator, like Seattle's published 87% completeness and 92% design-compliance accuracy, or an honest \"we have not measured that in your jurisdiction yet.\"",
        "id": "permitting-licensing-q03",
        "question": "What are your measured false-pass and false-fail rates on our permit types, checked against decisions our own reviewers made? What was the sample size?",
        "red_flag": "A single blended accuracy number from another market or a demo corpus, or no false-fail data at all.",
        "select": {
          "claim_types": [
            "performance"
          ],
          "finding_ids": [
            "perf-*"
          ],
          "weight": 8
        },
        "source_url": "https://www.route-fifty.com/artificial-intelligence/2026/08/cities-turn-ai-speed-housing-permitting/415564/"
      },
      {
        "good_answer": "A precise denominator. Honest vendors distinguish staff time from calendar time and disclose small samples, the way Honolulu's early Priority Review numbers rested on 19 completed applications.",
        "id": "permitting-licensing-q04",
        "question": "When you say the tool cuts review time, what exactly is measured: staff review hours or calendar days? Which permit types, and how many completed applications are behind the number?",
        "red_flag": "A percentage with no permit mix, no sample size, and no distinction between staff time and end-to-end time.",
        "select": {
          "claim_types": [
            "performance"
          ],
          "finding_ids": [
            "perf-*"
          ],
          "weight": 7
        },
        "source_url": "https://www.govtech.com/artificial-intelligence/honolulu-launches-ai-assisted-fast-track-permit-review"
      },
      {
        "good_answer": "A visible override or appeal path to a human reviewer, tracked false-flag rates, and a commitment that tool errors do not burn the applicant's paid review cycles.",
        "id": "permitting-licensing-q05",
        "question": "When your tool wrongly flags a compliant plan, what does the applicant see, and what is their path around it? Do you measure how often that happens, and does a wrong flag cost the applicant a resubmission fee or a review cycle?",
        "red_flag": "No path except resubmitting, or no measurement of false flags. The cost of tool errors then lands on residents and small builders.",
        "select": {
          "base": true,
          "weight": 8
        },
        "source_url": null
      },
      {
        "good_answer": "Named agencies with callable contacts and honest staging. The public record (Austin, Honolulu, Los Angeles, Seattle) shows what real references look like in this market.",
        "id": "permitting-licensing-q06",
        "question": "Name three comparable jurisdictions using this in production, and tell us the stage in each: pilot, voluntary, mandatory, or full production. Who can we call?",
        "red_flag": "Logos without contacts, pilots presented as production, or references that turn out to be unpaid trials.",
        "select": {
          "base": true,
          "claim_types": [
            "identity",
            "customer"
          ],
          "finding_ids": [
            "customers",
            "domain-age",
            "email",
            "leadership",
            "excl"
          ],
          "weight": 8
        },
        "source_url": "https://www.constructiondive.com/news/austin-honolulu-los-angeles-permit-ai/751085/"
      },
      {
        "good_answer": "Per-answer citations to the adopted code, a designed refusal path, logged answers, and routine sampling of answers for accuracy.",
        "id": "permitting-licensing-q07",
        "question": "If the product answers code or licensing questions in plain language: does every answer cite the specific code section it relied on, and what does it do when it does not know? Show us your wrong-answer monitoring.",
        "red_flag": "No citations and no refusal design. NYC's MyCity chatbot answered business-rule questions wrongly on an official channel and stayed online afterward.",
        "select": {
          "claim_types": [
            "performance",
            "availability"
          ],
          "weight": 8
        },
        "source_url": "https://themarkup.org/artificial-intelligence/2024/03/29/nycs-ai-chatbot-tells-businesses-to-break-the-law"
      },
      {
        "good_answer": "Written no-training terms and authorizations you can confirm yourself at the FedRAMP Marketplace, GovRAMP, and TX-RAMP lists. \"In process\" is not \"authorized.\"",
        "id": "permitting-licensing-q08",
        "question": "Where do our plan files and applicant data go? Are they used to train your models or shared with third parties? Which of these do you hold, verifiable on the public lists: FedRAMP or GovRAMP authorization, TX-RAMP certification, SOC 2 Type II?",
        "red_flag": "Verbal assurances, \"compliant\" phrasing, or training rights buried in the terms of service.",
        "select": {
          "base": true,
          "claim_types": [
            "compliance"
          ],
          "finding_ids": [
            "fedramp_marketplace",
            "govramp",
            "txramp",
            "cert-vocab"
          ],
          "weight": 8
        },
        "source_url": "https://marketplace.fedramp.gov/"
      },
      {
        "good_answer": "Immutable, exportable timestamps for receipt and completeness, plus an acknowledgment that completeness determinations carry legal weight under statutes like Texas HB 14 (2023), which lets applicants hire third-party reviewers when deadlines are missed.",
        "id": "permitting-licensing-q09",
        "question": "Our state has deadlines for permit decisions. How does your tool record when an application was received and when it was deemed complete, and can we audit those timestamps? What happens if the tool mislabels a complete application as incomplete?",
        "red_flag": "No audit trail for the clock, or a vendor unaware that completeness triage interacts with statutory deadlines at all.",
        "select": {
          "elevated": true,
          "tiers": [
            3,
            4
          ],
          "weight": 7
        },
        "source_url": "https://capitol.texas.gov/tlodocs/88R/analysis/html/HB00014E.htm"
      },
      {
        "good_answer": "A named, tested integration with the official record staying in the system of record, and a defined reconciliation path for conflicts.",
        "id": "permitting-licensing-q10",
        "question": "How does this integrate with our permitting system of record (Accela, Tyler, Clariti, OpenGov, or other)? Which system holds the official record, and what happens when the two disagree?",
        "red_flag": "A side system holding its own copy of permit records, or \"we can build that integration.\"",
        "select": {
          "tiers": [
            3,
            4
          ],
          "weight": 6
        },
        "source_url": null
      },
      {
        "good_answer": "A measured false-positive rate with geographic breakouts, mandatory human verification before any enforcement action, and a stated policy against detection aimed at occupied property such as encampments or lived-in vehicles.",
        "id": "permitting-licensing-q11",
        "question": "If the product detects possible violations from imagery, cameras, or scraped listings: what is the measured false-positive rate, broken out by neighborhood, and does a person verify every detection before any notice or fine goes out?",
        "red_flag": "No error data, notices generated from raw detections, or occupancy detection features. France's pool AI ran near a 30 percent error rate in early reporting, and San Jose removed encampment and graffiti detection from its camera pilot amid privacy concerns.",
        "select": {
          "claim_types": [
            "performance"
          ],
          "elevated": true,
          "weight": 9
        },
        "source_url": "https://www.theregister.com/2022/08/30/frances_tax_department_used_ai/"
      },
      {
        "good_answer": "A direct answer in writing, E&O coverage for any review the vendor performs, and clarity on whether their reviews carry legal weight under your state's third-party review law.",
        "id": "permitting-licensing-q12",
        "question": "If AI-assisted review passes a plan that later fails inspection or is built with a code violation, who is responsible? Will you accept that allocation in the contract, and do you carry errors-and-omissions coverage for review work?",
        "red_flag": "Liability pushed entirely onto the jurisdiction while the marketing claims the tool \"ensures compliance.\"",
        "select": {
          "tiers": [
            3,
            4
          ],
          "weight": 7
        },
        "source_url": null
      },
      {
        "good_answer": "Real override rates and per-application time data, plus honesty about adoption friction. Honolulu's system launch drew almost universally negative staff feedback in an anonymous survey; a vendor who has never seen resistance has not deployed at scale.",
        "id": "permitting-licensing-q13",
        "question": "What did this change for the staff who use it in your reference cities: how often do reviewers override the tool, and how much review time does it actually save per application? What did staff say in surveys?",
        "red_flag": "No override telemetry, or a claim that staff love it everywhere with nothing to show.",
        "select": {
          "elevated": true,
          "weight": 6
        },
        "source_url": "https://www.civilbeat.org/2025/10/complete-failure-honolulu-permit-workers-say-tech-upgrade-is-a-bust/"
      },
      {
        "good_answer": "A full five-year number against public anchors: Austin pays up to $6 million over five years for citywide residential AI plan review; Los Angeles City and County received Archistar free through a state-philanthropic arrangement. Applicant-funded models should be disclosed up front.",
        "id": "permitting-licensing-q14",
        "question": "What is the total five-year cost for our volume, including implementation, configuration of our local codes, integration, and support? Is pricing per permit, per seat, or flat, and who pays: the city or the applicant?",
        "red_flag": "A low headline subscription with implementation, code configuration, and integration sold separately later, the classic overrun pattern.",
        "select": {
          "claim_types": [
            "pricing"
          ],
          "finding_ids": [
            "sourcewell"
          ],
          "tiers": [
            3,
            4
          ],
          "weight": 6
        },
        "source_url": "https://www.kut.org/housing/2024-10-11/austin-tx-artificial-intelligence-building-applications-permits-construction"
      },
      {
        "good_answer": "Full export in documented open formats, AI outputs treated as records the jurisdiction owns and can produce for records requests, and a written exit plan with data migration support.",
        "id": "permitting-licensing-q15",
        "question": "Permit records and review logs are public records in our state. Can we export every record, AI report, and decision log in an open format at any time, and what is the transition plan when the contract ends?",
        "red_flag": "Proprietary formats, export fees, or silence on records-law obligations. Cities replacing decades-old permit systems are living with the cost of lock-in right now.",
        "select": {
          "tiers": [
            3,
            4
          ],
          "weight": 7
        },
        "source_url": null
      }
    ],
    "elevated_scrutiny_rules": [
      {
        "action": "Floor the output at the enhanced review band and require q01 to be answered before any lower band is available.",
        "condition": "Any claim that the system takes final action on a permit, license, or violation on its own, without express statutory authorization for that project type"
      },
      {
        "action": "Treat as an adverse-action system regardless of framing: strongest caution band, and add q01, q05, and q11 to the question slate.",
        "condition": "Detection-driven enforcement (imagery, cameras, scraped listings) that can generate violation notices, fines, or enforcement referrals"
      },
      {
        "action": "Floor at enhanced review. License holders have due process rights before suspension (Bell v. Burson; Barry v. Barchi), so ask q01, q05, and q09, and route counsel to the legal context block.",
        "condition": "AI influencing denial, suspension, or revocation of a business or professional license"
      },
      {
        "action": "Add q07 to the slate and cite the NYC MyCity record in the output.",
        "condition": "A chatbot answering code, permit, or licensing questions on an official government channel"
      },
      {
        "action": "Strongest caution band, plus the San Jose pilot record (https://www.governing.com/urban/san-jose-is-using-ai-to-detect-homeless-camps-will-it-work) rendered in the output.",
        "condition": "Detection aimed at occupied property or people: encampments, lived-in vehicles, occupancy inference"
      },
      {
        "action": "Trigger the eligibility-case-mgmt overlay per that pack's rules.",
        "condition": "Any output that could deny, reduce, or flag a person's public benefits (for example, licensing status feeding a benefits system)"
      }
    ],
    "established_vendors": [
      {
        "gov_evidence_url": null,
        "name": "Accela",
        "one_liner": "Major permitting and licensing system of record for US state and local governments.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": "https://www.govtech.com/biz/tylers-new-ai-acquisition-focuses-on-government-field-work",
        "name": "Tyler Technologies",
        "one_liner": "Enterprise Permitting and Licensing platform (formerly EnerGov); acquired ARInspect, an AI field-inspection product, in October 2023.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": null,
        "name": "OpenGov",
        "one_liner": "Permitting and licensing suite widely sold to US local governments.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": "https://www.hawaiipublicradio.org/local-news/2024-03-28/honolulu-permitting-department-entering-digital-age-new-software-suite-clariti",
        "name": "Clariti",
        "one_liner": "Salesforce-based permitting and licensing platform (acquired Camino in 2023); Honolulu's HNL Build runs on it, and the launch record there was contested (see failure modes).",
        "tier": "platform"
      },
      {
        "gov_evidence_url": null,
        "name": "CentralSquare",
        "one_liner": "Community development permitting suite for local governments.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": null,
        "name": "Granicus",
        "one_liner": "Government service platform whose Host Compliance product monitors short-term rental listings for local enforcement programs.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": "https://www.gov.ca.gov/2025/04/30/governor-newsom-announces-launch-of-new-ai-tool-to-supercharge-the-approval-of-building-permits-and-speed-recovery-from-los-angeles-fires/",
        "name": "Archistar",
        "one_liner": "AI plan-review pre-check (AI PreCheck, formerly eCheck) used by Austin, Los Angeles City and County, Vancouver, and Surrey; advisory reports, with staff decisions retained.",
        "tier": "specialist"
      },
      {
        "gov_evidence_url": "https://www.govtech.com/artificial-intelligence/honolulu-launches-ai-assisted-fast-track-permit-review",
        "name": "CivCheck",
        "one_liner": "AI pre-application code screening used by Honolulu (mandatory for residential intake starting September 1, 2026) and piloted in Seattle and Denver; reported in August 2026 as part of Clariti.",
        "tier": "startup-verified"
      },
      {
        "gov_evidence_url": "https://www.canarymedia.com/articles/solar/ai-powered-permitting-is-speeding-up-solar-deployments-in-california",
        "name": "Symbium",
        "one_liner": "Automated instant permitting for prescriptive project types (solar, storage, EV chargers) under California SB 379; used by cities including Santa Clarita and Bakersfield.",
        "tier": "startup-verified"
      }
    ],
    "failure_modes": [
      {
        "description": "New York City's MyCity chatbot, built to answer business owners' questions about licenses and regulations, told businesses on an official city channel that unlawful practices were allowed (for example, that employers could take workers' tips) and gave contradictory answers to identical questions. The city's technology office characterized it as a pilot that would improve and kept it online after the errors were reported. This is the canonical record for any permitting or licensing chatbot pitch.",
        "named_incident": "NYC MyCity chatbot (The Markup, Mar 29, 2024)",
        "source_url": "https://themarkup.org/artificial-intelligence/2024/03/29/nycs-ai-chatbot-tells-businesses-to-break-the-law",
        "title": "Official licensing chatbot invented rules (NYC MyCity)"
      },
      {
        "description": "Clearly labeled context, not an AI failure: Honolulu's $7.3 million HNL Build system (Clariti platform, Speridian implementation) replaced the 1990s-era POSSE system in August 2025. In an anonymous survey of more than 150 employees weeks after launch, staff feedback was almost universally negative, one engineer called it a complete failure, and reporters documented that staff could bypass certain reviews and that permit version history was hard to audit, in a department where a bribery scandal had sent six people to prison. The base rate for permitting modernization projects is the context any AI add-on pitch sits inside.",
        "named_incident": "Honolulu HNL Build launch backlash (Honolulu Civil Beat, Oct 2025)",
        "source_url": "https://www.civilbeat.org/2025/10/complete-failure-honolulu-permit-workers-say-tech-upgrade-is-a-bust/",
        "title": "Permitting system replacement that slowed permits at launch (Honolulu HNL Build; conventional IT, not AI)"
      },
      {
        "description": "Clearly labeled context, not an AI failure: Portland's Information Technology Advancement Project to digitize permitting was budgeted at $8.2 million in 2012, was re-estimated at $11.8 million by 2014 as its oversight committee flagged faulty planning assumptions and contractor turnover (14 of 15 contractor staff replaced), and the city later cut ties with the contractor and halted the project on a consultant's recommendation before finishing it years later as a new effort.",
        "named_incident": "Portland ITAP permitting project overruns and halt (AGC Oregon-Columbia / Technology Oversight Committee record, 2014-2017)",
        "source_url": "https://www.agc-oregon.org/government-affairs/costs-run-high-for-portlands-digital-permitting-efforts/",
        "title": "Permitting modernization project halted after overruns (Portland ITAP; conventional IT, not AI)"
      },
      {
        "description": "France's tax authority used aerial imagery AI (built with Google and Capgemini) to find undeclared swimming pools, identifying 20,356 of them; earlier reporting put the software's error rate around 30 percent, including solar panels mistaken for pools. The program shows both that imagery-based detection can find real violations at scale and that raw detection outputs carry error rates far too high to send notices without human verification.",
        "named_incident": "French tax authority AI pool detection, 20,356 pools found, roughly 30% error rate reported in earlier testing (2022)",
        "source_url": "https://www.theregister.com/2022/08/30/frances_tax_department_used_ai/",
        "title": "Detection error rates in automated enforcement (French pool tax AI)"
      },
      {
        "description": "San Jose piloted vehicle-mounted AI cameras to detect potholes, illegal dumping, graffiti, and lived-in vehicles, in what was reported as a first-of-its-kind program. Reported accuracy was about 70 percent for lived-in RVs and only 10 to 15 percent for lived-in cars, and advocates warned detections could drive sweeps and towing of vehicles people live in. The city's own pilot memo later removed encampment and graffiti detection, citing capacity limitations and privacy concerns. Detection aimed at occupied property is where code-enforcement AI acquires surveillance and civil-liberties stakes.",
        "named_incident": "San Jose vehicle-mounted AI detection pilot; encampment and graffiti detection later removed (San Jose Spotlight via Governing, 2024; city council memo)",
        "source_url": "https://www.governing.com/urban/san-jose-is-using-ai-to-detect-homeless-camps-will-it-work",
        "title": "Code-enforcement camera pilot scaled back over privacy (San Jose)"
      }
    ],
    "inclusion_test": [
      "Does the pitch mention plan review, plan check, permit approvals, permit intake, or code compliance for a building, planning, or development services department?",
      "Does it mention business licensing, professional licensing, or license applications and renewals for a city, county, or state board?",
      "Does it mention code enforcement, violation detection, or scanning imagery, rental listings, or street video to find unpermitted work, short-term rentals, or blight?",
      "Does it mention inspection scheduling, inspection routing, or field inspection automation?",
      "Does it offer a chatbot or assistant that answers zoning, building code, or licensing questions for applicants?"
    ],
    "incumbent_landscape": "Layer one is the permitting and licensing system of record: Accela, Tyler Technologies (Enterprise Permitting and Licensing, formerly EnerGov), OpenGov, Clariti (Salesforce-based), CentralSquare, and Granicus. Most cities buy AI as an add-on to one of these, and the costliest documented failures in this market are conventional replacements of these systems, before any AI: Portland's ITAP project was halted after years of overruns, and Honolulu's 2025 HNL Build launch drew almost universally negative staff feedback. Layer two is the AI plan-review and pre-check specialists: Archistar (Austin, Los Angeles, Vancouver, Surrey), CivCheck (Honolulu, Seattle, Denver; reported by Stateline in August 2026 as now part of Clariti), Symbium (statutory instant solar permitting in California under SB 379), and Govstream.ai. GreenLite sells AI-assisted private plan review, in which third-party reviewers act in place of city review where state law allows; we could not verify a named government deployment for it in public sources. Layer three is detection-driven enforcement: Deckard Technologies (Rentalscape) and Granicus (Host Compliance) monitor short-term rental listings, with jurisdiction counts that are vendor-reported, and San Jose piloted vehicle-mounted cameras for blight detection, then dropped encampment and graffiti detection over privacy concerns. Layer four is hyperscalers and free public tools: Microsoft behind Kelowna's grant-funded permit assistant, and NREL's free SolarAPP+ for instant residential solar permits. In every documented deployment, final permit decisions stay with staff. A listing here is a market-map signal and carries no endorsement.",
    "known_gaps": "- Honolulu's CivCheck contract value was not found in public sources this\n  cycle; the HNL Build figures above cover the Clariti/Speridian system,\n  not CivCheck.\n- The CivCheck-Clariti relationship (\"now part of Clariti Software\") is\n  reported by Stateline/Route Fifty (Aug 2026); deal terms and current\n  corporate status were not independently confirmed.\n- Deckard Technologies' and Granicus Host Compliance's jurisdiction counts\n  are vendor-reported; we could not verify a specific named controversy or\n  a specific named deployment for Deckard in independent sources this\n  cycle, so it appears only in landscape prose.\n- GreenLite (AI-assisted private plan review) shows significant venture\n  funding but no independently verifiable government deployment in public\n  sources; it is excluded from established_vendors.\n- Vancouver's Archistar pilot metrics are vendor-published only; no\n  independent evaluation was found.\n- Kelowna's assistant was verified from 2023 coverage; current status was\n  not re-verified. The $350,000 grant figure is reported by Business in\n  Vancouver and Western Investor; those pages block automated fetchers,\n  so it was confirmed from search metadata across both outlets.\n- San Jose's removal of encampment and graffiti detection is documented\n  in a city council memo (sanjoseca.gov document 119937) that blocks\n  automated fetchers; the removal language was confirmed from the memo\n  snippet and matching coverage.\n- Honolulu commercial permit wait trend figures were removed in\n  verification; the cited Civil Beat launch story does not carry them.\n- Colorado SB 26-189's reenacted requirements were not reviewed in full;\n  the legal_context note is a pointer, not a summary.\n- Accela, OpenGov, and CentralSquare AI product claims were not\n  individually verified this cycle; their entries are market-map only.\n- No US court ruling on AI-assisted permit or license adjudication was\n  located; the due process items are the pre-AI baseline, applied by\n  analogy.",
    "last_updated": "2026-08-29",
    "legal_context": "## What the law already says here\n\n- Due process attaches to licenses. Bell v. Burson, 402 U.S. 535 (1971)\n  held a driver's license cannot be suspended without due process, and\n  Barry v. Barchi, 443 U.S. 55 (1979) applied similar limits to an\n  occupational license\n  (https://www.law.cornell.edu/supremecourt/text/402/535;\n  https://www.law.cornell.edu/supremecourt/text/443/55). AI-influenced\n  denials, suspensions, or revocations of business and professional\n  licenses inherit these obligations. No court ruling on AI in permit or\n  license adjudication was found in public sources as of this review.\n- Permit shot clocks are statutory. California's Permit Streamlining Act\n  (Gov. Code section 65920 and following, 1977) sets decision deadlines\n  for development permits. Texas HB 14 (effective Sept 1, 2023) lets\n  applicants engage third-party reviewers when a regulatory authority\n  misses review deadlines\n  (https://capitol.texas.gov/tlodocs/88R/analysis/html/HB00014E.htm). A\n  tool's completeness determinations and timestamps carry legal weight\n  inside these frameworks.\n- Automated issuance is legal where statute says so. California SB 379\n  (2022) requires most cities and counties to run online platforms that\n  verify code compliance and issue residential solar permits in real time,\n  tracked on a state dashboard\n  (https://www.energy.ca.gov/programs-and-topics/programs/residential-solar-permit-reporting-program-sb-379/residential-solar).\n  This is the template for what legislatively authorized automation looks\n  like: prescriptive project types, defined scope, public reporting.\n- Colorado's AI law (SB 24-205) treated access to essential government\n  services as a consequential decision. SB 26-189, signed May 2026,\n  repealed and reenacted those provisions with new automated\n  decision-making requirements effective January 1, 2027; verify current\n  text and applicability before citing (https://coag.gov/ai/).\n- The International Code Council announced a strategic collaboration\n  making it a reseller of Archistar's eCheck compliance tool, a signal\n  that model-code institutions are engaging with automated review\n  (https://www.iccsafe.org/about/periodicals-and-newsroom/international-code-council-collaborates-with-archistar-to-modernize-permitting-and-accelerate-housing-development/).\n- Permit files, AI reports, and review logs are generally public records\n  under state records laws; ask your records counsel how AI outputs will\n  be retained and produced.",
    "pack_id": "permitting-licensing",
    "pack_name": "Permitting, Licensing & Code Enforcement AI",
    "realistic_pricing": "Public anchors exist in this category, unusually for government AI:\n\n- Austin pays Archistar $3.5 million over three years, up to $6 million\n  over five, for citywide residential AI plan-review pre-checks\n  (https://www.kut.org/housing/2024-10-11/austin-tx-artificial-intelligence-building-applications-permits-construction).\n- Los Angeles City and County received the same vendor's tool free through\n  a state and philanthropic arrangement after the 2025 fires\n  (https://www.gov.ca.gov/2025/04/30/governor-newsom-announces-launch-of-new-ai-tool-to-supercharge-the-approval-of-building-permits-and-speed-recovery-from-los-angeles-fires/).\n- Kelowna, BC built its permit assistant with Microsoft on a $350,000\n  provincial grant\n  (https://www.biv.com/news/real-estate/kelowna-turns-artificial-intelligence-help-housing-backlog-8294907).\n- SolarAPP+ is free to jurisdictions for instant residential solar\n  permitting, developed by NREL, with California grant funding available\n  for implementation\n  (https://www.energy.ca.gov/programs-and-topics/programs/residential-solar-permit-reporting-program-sb-379/residential-solar).\n- For scale on full system replacements (not AI): Honolulu's HNL Build\n  cost $7.3 million across platform and implementation, on a Clariti\n  software selection of $5.6 million\n  (https://www.hawaiipublicradio.org/local-news/2024-03-28/honolulu-permitting-department-entering-digital-age-new-software-suite-clariti),\n  and Portland's ITAP grew from $8.2 million to $11.8 million before\n  being halted.\n\nIf a quote for pre-check software lands at several times Austin's\nper-year rate for a similar population, ask what accounts for the\ndifference. We could not find published per-permit or small-city SaaS\nprice lists in public sources; treat any figure a vendor quotes for\n\"typical\" small-city pricing as unverified until it is in your contract.",
    "reference_deployments": [
      {
        "agency": "City of Austin Development Services",
        "metric": "Contract of $3.5 million over three years, with a renewal option taking it to $6 million over five; city staff said the pilot flagged inconsistencies with roughly 75% accuracy, with tree and flood rules the hardest cases",
        "metric_source_type": "independent-press",
        "source_url": "https://www.kut.org/housing/2024-10-11/austin-tx-artificial-intelligence-building-applications-permits-construction",
        "vendor_stack": "Archistar (AI PreCheck / eCheck)",
        "what": "Citywide AI pre-check for residential building plan review; council approved the contract in August 2024 and the city adopted the tool in October 2024 after a three-month pilot"
      },
      {
        "agency": "Los Angeles City and County (fire rebuild)",
        "metric": "State reported average staff review time down 54% for like-for-like rebuilds in LA County, and more than 36% for other rebuilds (Dec 2025)",
        "metric_source_type": "government-page",
        "source_url": "https://www.gov.ca.gov/2025/12/23/governor-and-la-rises-announce-new-online-resource-to-further-help-la-fire-survivors-navigate-rebuilding/",
        "vendor_stack": "Archistar, funded free via LA Rises and Steadfast LA with Autodesk and Amazon",
        "what": "Free AI pre-check for Eaton and Palisades fire rebuild permits, launched April 30, 2025"
      },
      {
        "agency": "City and County of Honolulu DPP",
        "metric": "Average review time 73 days down to 32.5, review cycles 3.4 down to 1.4, based on 19 completed applications at announcement",
        "metric_source_type": "independent-press",
        "source_url": "https://www.govtech.com/artificial-intelligence/honolulu-launches-ai-assisted-fast-track-permit-review",
        "vendor_stack": "CivCheck (with Clariti HNL Build as system of record)",
        "what": "AI pre-application screening, launched December 2025; Priority Review fast track July 2026; mandatory for residential intake starting September 1, 2026 (announced August 2026)"
      },
      {
        "agency": "City of Seattle (pilot)",
        "metric": "87% accuracy on completeness checks, 92% on design-compliance checks, 50% reduction in intake review days, 35% fewer correction cycles",
        "metric_source_type": "independent-press",
        "source_url": "https://www.route-fifty.com/artificial-intelligence/2026/08/cities-turn-ai-speed-housing-permitting/415564/",
        "vendor_stack": "CivCheck",
        "what": "AI completeness and design-compliance pre-checks in a pilot"
      },
      {
        "agency": "City of Bakersfield",
        "metric": "More than 500 permits processed in six months of piloting, with the city manager saying a full permit takes 10 to 15 minutes (city figures, via local press)",
        "metric_source_type": "independent-press",
        "source_url": "https://www.turnto23.com/news/in-your-neighborhood/bakersfield/no-lines-no-paperwork-bakersfield-permits-go-digital",
        "vendor_stack": "Symbium",
        "what": "Automated instant permitting for solar, EV chargers, reroofs, and HVAC under California's SB 379 framework"
      },
      {
        "agency": "City of Kelowna, British Columbia",
        "metric": "$350,000 provincial Local Government Development Approvals grant",
        "metric_source_type": "independent-press",
        "source_url": "https://www.biv.com/news/real-estate/kelowna-turns-artificial-intelligence-help-housing-backlog-8294907",
        "vendor_stack": "Microsoft Azure OpenAI",
        "what": "AI permit assistant answering zoning and permit-application questions, built with a provincial grant"
      },
      {
        "agency": "City and County of Honolulu DPP (cautionary: system replacement, not AI)",
        "metric": "$7.3 million in federal and city funds across platform and implementation; an anonymous survey of more than 150 staff weeks after launch was almost universally negative",
        "metric_source_type": "independent-press",
        "source_url": "https://www.civilbeat.org/2025/10/complete-failure-honolulu-permit-workers-say-tech-upgrade-is-a-bust/",
        "vendor_stack": "Clariti on Salesforce, implemented by Speridian",
        "what": "HNL Build system-of-record replacement, August 2025: the documented base rate for permitting modernization that any AI add-on rides on"
      }
    ],
    "refresh_cadence": "quarterly",
    "registries_to_check": [
      {
        "name": "FedRAMP Marketplace",
        "url": "https://marketplace.fedramp.gov/",
        "what_it_proves": "Whether this specific product holds a federal cloud authorization, and at what level. \"In process\" is not \"authorized.\""
      },
      {
        "name": "GovRAMP Authorized Product List",
        "url": "https://govramp.org/",
        "what_it_proves": "State-oriented cloud security verification. Formerly StateRAMP; the organization renamed in 2025."
      },
      {
        "name": "TX-RAMP (Texas DIR)",
        "url": "https://dir.texas.gov/information-security/texas-risk-and-authorization-management-program-tx-ramp",
        "what_it_proves": "Whether a cloud product is certified to handle Texas state agency data; many local Texas buyers also key off this list."
      },
      {
        "name": "AI Incident Database",
        "url": "https://incidentdatabase.ai/",
        "what_it_proves": "A public log of AI system failures. Search the vendor and product name before any demo."
      },
      {
        "name": "California Residential Solar Permit Dashboard (SB 379)",
        "url": "https://www.energy.ca.gov/programs-and-topics/programs/residential-solar-permit-reporting-program-sb-379/residential-solar",
        "what_it_proves": "Which California jurisdictions actually run compliant automated solar permitting, a check on any \"instant permitting\" claim in that lane."
      }
    ],
    "scrutiny_tier": "standard",
    "signal_lexicon": [
      "plan review",
      "plan check",
      "permit intake",
      "building permit",
      "zoning compliance",
      "code enforcement",
      "business license",
      "professional license",
      "inspection scheduling",
      "certificate of occupancy",
      "completeness check",
      "prescreen",
      "accessory dwelling unit",
      "solar permit",
      "shot clock"
    ],
    "skepticism_triggers": [
      {
        "claim_pattern": "\"Instant permits\" or \"same-day approval\" for any review type",
        "source_url": "https://www.energy.ca.gov/programs-and-topics/programs/residential-solar-permit-reporting-program-sb-379/residential-solar",
        "threshold": "Any instant or automatic issuance claim beyond narrow prescriptive project types that a statute expressly authorizes",
        "why": "Lawful automated issuance in the US is anchored to statutes like California SB 379, which requires real-time online permitting for residential solar in most cities and counties. Structural, discretionary, and land-use reviews have no such authorization, and every documented city deployment keeps staff decisions. Ask which statute authorizes automated issuance here."
      },
      {
        "claim_pattern": "\"Cuts review time by X%\"",
        "source_url": "https://www.govtech.com/artificial-intelligence/honolulu-launches-ai-assisted-fast-track-permit-review",
        "threshold": "Any speed claim without the denominator: staff review time or calendar days, which permit types, and how many completed applications",
        "why": "Honolulu's widely cited 73-day-to-32.5-day improvement was based on 19 completed applications when announced. Real numbers exist in this market; insist on the sample size and permit mix behind them."
      },
      {
        "claim_pattern": "Accuracy percentages for plan review or completeness checks",
        "source_url": "https://www.route-fifty.com/artificial-intelligence/2026/08/cities-turn-ai-speed-housing-permitting/415564/",
        "threshold": "Any accuracy figure not measured against your jurisdiction's adopted codes and local amendments",
        "why": "Seattle's pilot published task-level numbers (87% on completeness, 92% on design compliance), so jurisdiction-specific measurement is an achievable ask, and model-code accuracy does not transfer to local amendments."
      },
      {
        "claim_pattern": "\"The AI approves plans\" or \"touchless permitting\"",
        "source_url": "https://www.route-fifty.com/artificial-intelligence/2026/08/cities-turn-ai-speed-housing-permitting/415564/",
        "threshold": "Any claim that the system takes final action on its own",
        "why": "Documented US deployments (Austin, Los Angeles, Honolulu, Seattle, Louisville, Denver) all describe the AI as a pre-check or support tool with staff making final decisions. A vendor claiming otherwise is claiming something no named peer jurisdiction has accepted."
      },
      {
        "claim_pattern": "A chatbot that answers code or licensing questions",
        "source_url": "https://themarkup.org/artificial-intelligence/2024/03/29/nycs-ai-chatbot-tells-businesses-to-break-the-law",
        "threshold": "No per-answer citation to the code section relied on, and no designed refusal path for questions it cannot answer",
        "why": "NYC's MyCity chatbot answered business-regulation questions wrongly on an official channel and stayed online afterward. Citation and refusal design are the difference between a lookup tool and a liability."
      },
      {
        "claim_pattern": "Violation detection from aerial imagery, street cameras, or scraped listings",
        "source_url": "https://www.theregister.com/2022/08/30/frances_tax_department_used_ai/",
        "threshold": "Any detection claim without a measured false-positive rate and a human verification step before any notice or fine",
        "why": "France's pool-detection AI found 20,356 real violations, and earlier reporting put its error rate near 30 percent, with solar panels read as pools. Treat detection output as a lead that a person verifies before any notice goes out."
      },
      {
        "claim_pattern": "\"Replaces plan reviewers\" or headcount-savings framing",
        "source_url": "https://www.route-fifty.com/artificial-intelligence/2026/08/cities-turn-ai-speed-housing-permitting/415564/",
        "threshold": "Any staffing-reduction promise",
        "why": "Named deployments describe support tools that clear intake noise so reviewers can work complex cases, and planning-association reviewers caution that AI does not replicate judgment on community context. Staff adoption also decides these rollouts: Honolulu's system launch showed how quickly negative staff sentiment can define one."
      },
      {
        "claim_pattern": "\"Used by hundreds of jurisdictions\"",
        "source_url": "https://www.constructiondive.com/news/austin-honolulu-los-angeles-permit-ai/751085/",
        "threshold": "Any jurisdiction count without a named, callable list and the stage of each deployment (pilot, voluntary, mandatory, production)",
        "why": "Jurisdiction counts in this market are usually vendor-reported and mix free pilots with production use. Honolulu moved from voluntary to mandatory in stages; stage matters to what a reference can tell you."
      },
      {
        "claim_pattern": "\"Trained on your local codes\"",
        "source_url": "https://themarkup.org/artificial-intelligence/2024/03/29/nycs-ai-chatbot-tells-businesses-to-break-the-law",
        "threshold": "No named process, turnaround, and regression test for when your council amends the code",
        "why": "Codes and local amendments change constantly. A tool with no update pipeline drifts wrong quietly, the failure pattern documented on NYC's official chatbot."
      },
      {
        "claim_pattern": "\"FedRAMP compliant,\" \"StateRAMP compliant,\" or certification vocabulary without the word \"authorized\"",
        "source_url": "https://marketplace.fedramp.gov/",
        "threshold": "The word \"compliant\" standing in for a verifiable authorization",
        "why": "Verify status directly on the FedRAMP Marketplace, GovRAMP, and TX-RAMP lists. \"In process\" is not \"authorized.\""
      },
      {
        "claim_pattern": "A low fixed price for a full system replacement",
        "source_url": "https://www.civilbeat.org/2025/10/complete-failure-honolulu-permit-workers-say-tech-upgrade-is-a-bust/",
        "threshold": "A quote far below the documented range for permitting system work, or an implementation timeline under six months for a system of record",
        "why": "Honolulu's system replacement cost $7.3 million between platform and implementation, and Portland's ITAP grew from $8.2 million to $11.8 million before it was halted. Implementation, configuration, and data migration are where permitting projects fail, with or without AI."
      }
    ]
  },
  "public-comms": {
    "definition": "Resident-facing digital communications AI: website chatbots and AI search, notification and email platforms with AI features, real-time meeting interpretation, and machine translation of public content. This pack does not cover phone and contact-center AI (see the call-center pack) or chatbots that answer benefits-eligibility questions (that adds the eligibility-case-mgmt overlay).",
    "diligence_questions": [
      {
        "good_answer": "Corpus-restricted generation with demonstrated refusal behavior.",
        "id": "public-comms-q01",
        "question": "Is every answer generated only from content we control? Show us what the bot says when the answer is not in that corpus: does it refuse and hand off, or improvise?",
        "red_flag": "Open-web answering or hedged \"mostly grounded\" language. MyCity improvised.",
        "select": {
          "base": true
        },
        "source_url": "https://themarkup.org/artificial-intelligence/2026/01/30/mamdani-to-kill-the-nyc-ai-chatbot-we-caught-telling-businesses-to-break-the-law"
      },
      {
        "good_answer": "Yes, with per-answer citations to your own pages.",
        "id": "public-comms-q02",
        "question": "Does each answer link to the specific official source page?",
        "red_flag": "No citations. You cannot audit what you cannot trace.",
        "select": {
          "elevated": true
        },
        "source_url": null
      },
      {
        "good_answer": "Yes, with your counsel approving the answer key before launch.",
        "id": "public-comms-q03",
        "question": "Will you run and share results on our top 100 real resident questions, including legally consequential ones (tenant rights, wages, deadlines), before go-live? Who signs off on the answer key, our counsel or yours?",
        "red_flag": "Testing after launch, or vendor-graded results only.",
        "select": {
          "elevated": true,
          "weight": 3
        },
        "source_url": null
      },
      {
        "good_answer": "A named pipeline, a turnaround commitment, and clear responsibility.",
        "id": "public-comms-q04",
        "question": "When the council changes an ordinance or a fee, what is the update pipeline and SLA? Who is responsible for stale answers?",
        "red_flag": "\"The bot re-crawls periodically\" with no SLA.",
        "select": {
          "base": true
        },
        "source_url": null
      },
      {
        "good_answer": "Specific indemnification language in the contract.",
        "id": "public-comms-q05",
        "question": "Given Moffatt v. Air Canada, what does your contract say about indemnification when the bot causes harm with wrong information?",
        "red_flag": "A disclaimer offered instead of contract terms; that argument already lost.",
        "select": {
          "base": true,
          "tiers": [
            3,
            4
          ]
        },
        "source_url": "https://www.americanbar.org/groups/business_law/resources/business-law-today/2024-february/bc-tribunal-confirms-companies-remain-liable-information-provided-ai-chatbot/"
      },
      {
        "good_answer": "Defined handoff triggers and real staffed hours.",
        "id": "public-comms-q06",
        "question": "At what point (topic, confidence, frustration, or a direct request) does the bot transfer to a person, and during what hours does that person exist?",
        "red_flag": "A bot with no human behind it.",
        "select": {
          "base": true
        },
        "source_url": null
      },
      {
        "good_answer": "Per-language quality measurements and human review for consequential content, in line with NCSC guidance.",
        "id": "public-comms-q07",
        "question": "Which languages do you support, with what measured quality per language? Is there human review for benefits, legal, and health content? How do you handle low-resource languages where machine translation degrades?",
        "red_flag": "A language count with no measurements.",
        "select": {
          "elevated": true,
          "weight": 2
        },
        "source_url": "https://www.ncsc.org/sites/default/files/media/document/NCSC%20Machine%20Translation%20Guide_0.pdf"
      },
      {
        "good_answer": "Full export, a stated retention schedule, and written no-training terms.",
        "id": "public-comms-q08",
        "question": "Are transcripts fully exportable for public-records compliance? What resident PII do you retain, for how long, and is any of it used for training?",
        "red_flag": "No export path, or \"anonymized\" training use with no definition.",
        "select": {
          "base": true
        },
        "source_url": "https://www.sos.wa.gov/sites/default/files/2025-02/advice-sheet-are-generative-ai-interactions-public-records-(june-2024).pdf"
      },
      {
        "good_answer": "Disclosure on by default and an accessibility conformance report.",
        "id": "public-comms-q09",
        "question": "Does the bot clearly disclose that it is AI (the Utah SB 452 and Maine LD 1727 pattern; TRAIGA for Texas)? Does it meet WCAG 2.1 AA accessibility?",
        "red_flag": "Disclosure as a configurable option, or no accessibility testing.",
        "select": {
          "base": true
        },
        "source_url": "https://fpf.org/blog/understanding-the-new-wave-of-chatbot-legislation-california-sb-243-and-beyond/"
      },
      {
        "good_answer": "Defined metrics, a named audit method, and transcript sampling rights.",
        "id": "public-comms-q10",
        "question": "What accuracy and containment metrics will you report monthly, how is \"accurate\" defined and audited, and can we sample real transcripts?",
        "red_flag": "Self-graded accuracy with no sampling rights.",
        "select": {
          "claim_types": [
            "performance"
          ],
          "finding_ids": [
            "perf-*"
          ],
          "weight": 3
        },
        "source_url": null
      },
      {
        "good_answer": "A same-day correction path, a kill switch, and a graceful fallback page.",
        "id": "public-comms-q11",
        "question": "How fast can we take down a wrong answer, or the whole bot, and what is the fallback experience?",
        "red_flag": "Correction requests routed through a support queue with no SLA.",
        "select": {
          "elevated": true
        },
        "source_url": null
      },
      {
        "good_answer": "Named references plus a straight answer on decommissions.",
        "id": "public-comms-q12",
        "question": "Name three government customers our size, with one live for 12 or more months. Has any government customer decommissioned the product, and why?",
        "red_flag": "No references at your scale, or evasion about churn. NYC decommissioned a high-profile bot in 2026; the question is fair.",
        "select": {
          "claim_types": [
            "customer"
          ],
          "finding_ids": [
            "customers"
          ],
          "weight": 4
        },
        "source_url": "https://themarkup.org/artificial-intelligence/2026/01/30/mamdani-to-kill-the-nyc-ai-chatbot-we-caught-telling-businesses-to-break-the-law"
      }
    ],
    "elevated_scrutiny_rules": [
      {
        "action": "Apply the eligibility-case-mgmt overlay. California SIMM 150 rates resident-facing chatbots at least Moderate risk.",
        "condition": "The bot will answer benefits or eligibility questions"
      },
      {
        "action": "Require q03 with counsel sign-off; raise caution one band.",
        "condition": "The bot delivers legally consequential content (tenant rights, wages, deadlines, permits)"
      },
      {
        "action": "Add the NCSC mandatory-human-review flag.",
        "condition": "Translation of legal, benefits, or health content without human review"
      }
    ],
    "established_vendors": [
      {
        "gov_evidence_url": "https://granicus.com/products/govdelivery/",
        "name": "Granicus",
        "one_liner": "The government communications incumbent (govDelivery); claims a 300M+ subscriber network (vendor-reported).",
        "tier": "platform"
      },
      {
        "gov_evidence_url": "https://statescoop.com/government-ai-chatbots-state-local-websites-2024/",
        "name": "Tyler Technologies",
        "one_liner": "Long-running state portal chatbots, including Mississippi \"Missi\" (2017).",
        "tier": "platform"
      },
      {
        "gov_evidence_url": "https://www.govtech.com/biz/polimorphic-raises-18-6m-as-it-beefs-up-public-sector-ai",
        "name": "Polimorphic",
        "one_liner": "Local-government chat with footnoted answers from government-controlled sources (vendor claims); named local-government customers.",
        "tier": "startup-verified"
      },
      {
        "gov_evidence_url": null,
        "name": "Citibot",
        "one_liner": "Local-government chat (Cuyahoga County OH); customer claims could not be verified this cycle because the vendor site blocked automated fetch.",
        "tier": "startup-verified"
      },
      {
        "gov_evidence_url": null,
        "name": "Verint",
        "one_liner": "Government chatbot and engagement tooling.",
        "tier": "specialist"
      },
      {
        "gov_evidence_url": "https://www.wordly.ai/city-council-translation",
        "name": "Wordly",
        "one_liner": "Live meeting interpretation (Santa Barbara CA, North Las Vegas NV).",
        "tier": "specialist"
      },
      {
        "gov_evidence_url": "https://statescoop.com/government-ai-chatbots-state-local-websites-2024/",
        "name": "NeuroSoph",
        "one_liner": "Massachusetts \"Ask MA\" statewide portal assistant.",
        "tier": "specialist"
      },
      {
        "gov_evidence_url": "https://statescoop.com/government-ai-chatbots-state-local-websites-2024/",
        "name": "Zammo.ai",
        "one_liner": "Atlanta \"Ava\" / ATL311 chatbot.",
        "tier": "startup-verified"
      }
    ],
    "failure_modes": [
      {
        "description": "NYC's MyCity chatbot told businesses to break the law. A \"beta\" disclaimer did not fix it. It ran roughly 2.5 years and was shut down Feb 4, 2026 as \"functionally unusable,\" after about $600K to build and about $500K per year to maintain. The lessons: disclaimers do not fix illegal advice, and sunk cost keeps broken bots alive.",
        "named_incident": "NYC MyCity chatbot shutdown (The Markup, Jan 30, 2026)",
        "source_url": "https://themarkup.org/artificial-intelligence/2026/01/30/mamdani-to-kill-the-nyc-ai-chatbot-we-caught-telling-businesses-to-break-the-law",
        "title": "Hallucinated official answers, kept alive by sunk cost (NYC MyCity)"
      },
      {
        "description": "A British Columbia tribunal held that a chatbot is not \"a separate legal entity\" and the organization answers for what it says. The same logic reaches an agency website bot.",
        "named_incident": "Moffatt v. Air Canada (2024)",
        "source_url": "https://www.americanbar.org/groups/business_law/resources/business-law-today/2024-february/bc-tribunal-confirms-companies-remain-liable-information-provided-ai-chatbot/",
        "title": "The government is liable for its bot"
      },
      {
        "description": "The National Center for State Courts documents gender-bias errors, legal-terminology misinterpretation, hallucination, and sharp degradation on low-resource languages, and recommends mandatory human review for anything with legal consequences. The July 2025 DOJ memo pushing AI-assisted translation raises the risk of quiet swap-outs of human interpretation (https://www.nextgov.com/digital-government/2025/07/justice-pushes-agencies-use-ai-assisted-translations-when-offering-them-all/406776/).",
        "named_incident": "NCSC machine-translation guidance documenting failure classes in court contexts",
        "source_url": "https://www.ncsc.org/sites/default/files/media/document/NCSC%20Machine%20Translation%20Guide_0.pdf",
        "title": "Machine-translation quality collapse on the languages LEP communities speak"
      },
      {
        "description": "Illinois's \"Dotty\" answered a license-renewal question with irrelevant statistics. Self-reported \"accuracy\" claims are undefined: accuracy on what test set, judged by whom?",
        "named_incident": "Illinois \"Dotty\" (StateScoop survey of state chatbots, 2024)",
        "source_url": "https://statescoop.com/government-ai-chatbots-state-local-websites-2024/",
        "title": "Scripted bots that cannot answer"
      },
      {
        "description": "Washington's State Archives advises that prompts and outputs can both be public records. A chatbot with no export path is a public-records problem on day one.",
        "named_incident": "Washington State Archives advice sheet on generative-AI interactions as public records (Jun 2024)",
        "source_url": "https://www.sos.wa.gov/sites/default/files/2025-02/advice-sheet-are-generative-ai-interactions-public-records-(june-2024).pdf",
        "title": "Chat transcripts are public records with PII in them"
      },
      {
        "description": "Utah SB 452, Maine LD 1727, and California SB 243 typify a wave of 14+ new state chatbot laws in 2026. A bot that does not disclose it is automated is out of step with where the law is heading.",
        "named_incident": "The 2026 wave of state chatbot-disclosure legislation (Future of Privacy Forum analysis)",
        "source_url": "https://fpf.org/blog/understanding-the-new-wave-of-chatbot-legislation-california-sb-243-and-beyond/",
        "title": "Hardening disclosure norms"
      }
    ],
    "inclusion_test": [
      "Does the pitch offer a website chatbot, AI site search, or a \"digital assistant\" for residents?",
      "Does it offer translation or interpretation of public content or meetings?",
      "Does it offer resident notification, email, or engagement tooling with AI features?",
      "Is the primary interface the agency's website or public meetings rather than the phone?"
    ],
    "incumbent_landscape": "A crowded small-to-mid vendor field sells chatbots and AI search to cities and counties: K12 Insight, Apptegy, Element451, Citibot, Polimorphic, Tyler Technologies, and Verint, with documented contract pricing spanning roughly $5,600 basic to $759K+ enterprise (https://blogs.civiciq.com/2025/12/02/government-ai-chatbots-311-rfps-vendor-pricing-guide-2025/). Granicus is the communications incumbent: govDelivery claims a 300M+ subscriber network (vendor-reported) plus a \"Government Experience Agent\" (https://granicus.com/products/govdelivery/). State-portal chatbots have a decade of history: Mississippi \"Missi\" (Tyler, 2017), Georgia DOL \"George A.I.\" (Cisco; 2.5 million+ users and an agency-claimed 97% accuracy we could not verify in public sources), Massachusetts \"Ask MA\" (NeuroSoph; roughly 1.2 million monthly users), Texas (Capgemini), Atlanta \"Ava\" (Zammo.ai), and Vermont \"ChatVT,\" which gets annual performance reviews (https://statescoop.com/government-ai-chatbots-state-local-websites-2024/). For translation: Wordly for live meeting interpretation (Santa Barbara CA, North Las Vegas NV; https://www.wordly.ai/city-council-translation), and New Jersey DOL with U.S. Digital Response as the standout responsible machine-translation deployment (https://www.usdigitalresponse.org/resources/how-new-jersey-is-using-generative-ai-to-scale-their-human-centered-approach-to-language-access).",
    "known_gaps": "- Vendor and agency accuracy figures in this category are self-reported\n  (Georgia's 97%, Ask MA volumes); no independent audit was found in\n  public sources.\n- Citibot's customer claims are unverified; the vendor site blocked\n  automated fetch.\n- The underlying technology stack of NYC's MyCity bot was not re-verified\n  this cycle, so its deployment row names no vendor.\n- GovAI Coalition Trellis registry and state AI inventory URLs (the\n  Connecticut statutory inventory, New York's Section 103-e disclosures)\n  were not confirmed this cycle, so they are cited by name only.",
    "last_updated": "2026-08-29",
    "legal_context": "- State chatbot-disclosure wave: Utah SB 452 (2025), Maine LD 1727, and\n  California SB 243, with 14+ new state chatbot laws in 2026\n  (https://fpf.org/blog/understanding-the-new-wave-of-chatbot-legislation-california-sb-243-and-beyond/).\n- Texas TRAIGA (effective Jan 1, 2026). Verify current status before\n  citing.\n- Washington State Archives position (Jun 2024): generative-AI prompts and\n  outputs can be public records\n  (https://www.sos.wa.gov/sites/default/files/2025-02/advice-sheet-are-generative-ai-interactions-public-records-(june-2024).pdf).\n- ADA Title II digital accessibility rule (2024) and WCAG 2.1 AA:\n  public-facing digital services must be accessible.\n- Title VI: language-access obligations for limited-English-proficiency\n  residents; NCSC recommends mandatory human review for machine\n  translation with legal consequences.",
    "pack_id": "public-comms",
    "pack_name": "Public Communications, Websites & Chatbots",
    "realistic_pricing": "The documented contract range runs roughly $5,600 basic to $759K+\nenterprise (CivicIQ 2025 vendor pricing guide,\nhttps://blogs.civiciq.com/2025/12/02/government-ai-chatbots-311-rfps-vendor-pricing-guide-2025/).\nA corpus-bounded FAQ bot priced above $100K deserves a written itemization\nof what the money buys.",
    "reference_deployments": [
      {
        "agency": "Massachusetts (\"Ask MA\")",
        "metric": "Roughly 3.46 million messages per month across 22 services",
        "metric_source_type": "independent-press",
        "source_url": "https://statescoop.com/government-ai-chatbots-state-local-websites-2024/",
        "vendor_stack": "NeuroSoph",
        "what": "Statewide portal assistant"
      },
      {
        "agency": "Vermont (\"ChatVT\")",
        "metric": "The accountability model; reviewed on a published annual cycle",
        "metric_source_type": "independent-press",
        "source_url": "https://statescoop.com/government-ai-chatbots-state-local-websites-2024/",
        "vendor_stack": "State portal chatbot",
        "what": "State chatbot with annual performance reviews"
      },
      {
        "agency": "New Jersey DOL",
        "metric": "One language (Spanish, 95% of demand) at roughly 90% claimed accuracy with human review",
        "metric_source_type": "independent-press",
        "source_url": "https://www.usdigitalresponse.org/resources/how-new-jersey-is-using-generative-ai-to-scale-their-human-centered-approach-to-language-access",
        "vendor_stack": "Machine translation with U.S. Digital Response",
        "what": "Plain-language-first Spanish translation with human review and published training materials for state reuse"
      },
      {
        "agency": "Santa Barbara, CA and North Las Vegas, NV",
        "metric": "Named deployments; metrics are vendor-reported",
        "metric_source_type": "vendor-reported",
        "source_url": "https://www.wordly.ai/city-council-translation",
        "vendor_stack": "Wordly",
        "what": "Live council-meeting interpretation"
      },
      {
        "agency": "Mississippi (\"Missi\")",
        "metric": "A longevity datapoint rather than a performance claim",
        "metric_source_type": "independent-press",
        "source_url": "https://statescoop.com/government-ai-chatbots-state-local-websites-2024/",
        "vendor_stack": "Tyler Technologies",
        "what": "One of the longest-running state portal chatbots (2017)"
      },
      {
        "agency": "Maryland benefits-navigation agent",
        "metric": "Documented as a pilot, not production determinations",
        "metric_source_type": "independent-press",
        "source_url": "https://codeforamerica.org/explore/government-ai-landscape-assessment/",
        "vendor_stack": "Anthropic",
        "what": "Benefits navigation assistant (the eligibility-case-mgmt overlay applies)"
      },
      {
        "agency": "NYC (\"MyCity\", cautionary)",
        "metric": "About $600K to build and about $500K per year to maintain, and it still told businesses to break the law",
        "metric_source_type": "independent-press",
        "source_url": "https://themarkup.org/artificial-intelligence/2026/01/30/mamdani-to-kill-the-nyc-ai-chatbot-we-caught-telling-businesses-to-break-the-law",
        "vendor_stack": "City portal chatbot",
        "what": "Decommissioned Feb 4, 2026 as \"functionally unusable\""
      }
    ],
    "refresh_cadence": "quarterly",
    "registries_to_check": [
      {
        "name": "Pavilion Contract Hub",
        "url": "https://www.withpavilion.com/",
        "what_it_proves": "Existing public contracts you may be able to piggyback on; confirms other governments have bought the product."
      },
      {
        "name": "Procurated",
        "url": "https://www.procurated.com/",
        "what_it_proves": "Peer reviews of suppliers from other government buyers."
      },
      {
        "name": "AI Incident Database",
        "url": "https://incidentdatabase.ai/",
        "what_it_proves": "A public log of AI system failures. Search the vendor and product name."
      }
    ],
    "scrutiny_tier": "standard",
    "signal_lexicon": [
      "chatbot",
      "web chat",
      "virtual assistant",
      "resident engagement",
      "machine translation",
      "language access",
      "meeting interpretation",
      "ai search",
      "mass notification",
      "constituent communication",
      "multilingual",
      "faq bot"
    ],
    "skepticism_triggers": [
      {
        "claim_pattern": "Any accuracy claim without a defined test set and judge",
        "source_url": "https://statescoop.com/government-ai-chatbots-state-local-websites-2024/",
        "threshold": "An accuracy number with no stated test set or grader",
        "why": "Georgia's \"97%\" is the archetype of undefined agency- or vendor-reported accuracy. Accuracy on what questions, judged by whom?"
      },
      {
        "claim_pattern": "\"75+ languages\"",
        "source_url": "https://www.usdigitalresponse.org/resources/how-new-jersey-is-using-generative-ai-to-scale-their-human-centered-approach-to-language-access",
        "threshold": "A language count above the number of languages with measured quality",
        "why": "Coverage is not quality. Demand per-language measured quality and human review for legal, benefits, and health content. New Jersey's honest benchmark is one language (Spanish, 95% of demand) at roughly 90% claimed accuracy, with human review and plain-language-first writing."
      },
      {
        "claim_pattern": "\"Answers any question about your city\"",
        "source_url": "https://themarkup.org/artificial-intelligence/2026/01/30/mamdani-to-kill-the-nyc-ai-chatbot-we-caught-telling-businesses-to-break-the-law",
        "threshold": "Unbounded scope",
        "why": "Unbounded scope is the MyCity failure. Good bots are corpus-restricted with refusal behavior."
      },
      {
        "claim_pattern": "\"The disclaimer covers you\"",
        "source_url": "https://www.americanbar.org/groups/business_law/resources/business-law-today/2024-february/bc-tribunal-confirms-companies-remain-liable-information-provided-ai-chatbot/",
        "threshold": "A disclaimer offered as the main risk mitigation",
        "why": "It did not cover NYC, and Air Canada's disclaimer argument lost."
      },
      {
        "claim_pattern": "Enterprise pricing above $100K for a corpus-bounded FAQ bot",
        "source_url": "https://blogs.civiciq.com/2025/12/02/government-ai-chatbots-311-rfps-vendor-pricing-guide-2025/",
        "threshold": "Above $100K for bounded FAQ functionality",
        "why": "The documented market spans roughly $5,600 to $759K+. Demand the itemization for anything at the high end."
      },
      {
        "claim_pattern": "\"Set and forget\" content ingestion",
        "source_url": null,
        "threshold": "No stale-content SLA",
        "why": "No stale-content SLA means wrong answers after every ordinance change."
      },
      {
        "claim_pattern": "No exportable transcripts",
        "source_url": "https://www.sos.wa.gov/sites/default/files/2025-02/advice-sheet-are-generative-ai-interactions-public-records-(june-2024).pdf",
        "threshold": "Any product without a transcript export path",
        "why": "A public-records non-starter under the Washington archivist position."
      }
    ]
  },
  "public-safety-policing": {
    "definition": "AI sold to police departments, sheriffs' offices, prosecutors, courts, corrections agencies, and emergency management: gunshot detection, facial recognition and other biometric identification, automated license plate readers, predictive policing and crime analytics, real-time crime centers and video analytics, report-drafting assistants, and risk scores used in bail, sentencing, supervision, or custody decisions. Outputs here can lead to stops, arrests, charges, and custody decisions, so every claim gets the strictest evidence bar. Not this pack alone: 911 phone automation (see call-center), records digitization that never feeds enforcement decisions (see document-processing), and population-level dashboards with no person or place targeting (see data-analytics).",
    "diligence_questions": [
      {
        "good_answer": "A clear statement that every output is an investigative lead requiring independent corroboration, with product screens and model policy language that enforce it. Detroit's settlement terms (no arrest from a face match alone, and no photo lineup from a face match without independent evidence linking the suspect to the crime) are the reference standard.",
        "id": "public-safety-policing-q01",
        "question": "Can any alert, match, score, or output from your system, on its own, be the reason for a stop, an arrest, or a charge? Show us the product screens and the written policy language that require independent corroboration first.",
        "red_flag": "Hedging, \"configurable,\" or field examples where an alert alone drove enforcement action.",
        "select": {
          "base": true,
          "weight": 10
        },
        "source_url": "https://www.aclu.org/press-releases/civil-rights-advocates-achieve-the-nations-strongest-police-department-policy-on-facial-recognition-technology"
      },
      {
        "good_answer": "Named independent evaluations with defined denominators, and NIST FRTE entries under the company's own name at operational gallery sizes.",
        "id": "public-safety-policing-q02",
        "question": "What independent testing of your system exists under field conditions, and what are the denominators? For face or biometric systems: which NIST FRTE submissions are yours, at what gallery size, and with what demographic breakouts?",
        "red_flag": "Lab or marketing accuracy numbers with no field validation. Chicago's OIG found 9.1% of responses to gunshot alerts produced evidence of a gun-related offense.",
        "select": {
          "base": true,
          "claim_types": [
            "performance"
          ],
          "finding_ids": [
            "perf-*"
          ],
          "weight": 9
        },
        "source_url": "https://pages.nist.gov/frvt/html/frvt11.html"
      },
      {
        "good_answer": "Yes in the contract, plus a named case where the materials were actually produced.",
        "id": "public-safety-policing-q03",
        "question": "If your output ends up in a court case, exactly what can you produce for discovery: raw sensor data, model version, confidence values, human review steps, and change logs? Will you commit in writing never to assert trade secrets against a defense subpoena or court order?",
        "red_flag": "Trade-secret carve-outs over evidence. In Chicago, prosecutors dismissed a murder case rather than defend the sensor evidence in court, and the city later paid $500,000 (Williams v. City of Chicago).",
        "select": {
          "base": true,
          "elevated": true,
          "weight": 9
        },
        "source_url": "https://www.macarthurjustice.org/case/williams-v-city-of-chicago/"
      },
      {
        "good_answer": "Specific architecture answers, signed addenda and passed audits in named states, and honest wording about alignment with the CJIS Security Policy.",
        "id": "public-safety-policing-q04",
        "question": "Where is our CJIS-covered data stored and processed, who at your company can access it, and which agreements (CJIS Security Addendum, state audits) have you completed in other states? If your materials say \"CJIS certified,\" what do you mean, given that the FBI does not certify vendors?",
        "red_flag": "The phrase \"CJIS certified\" offered as a credential. No federal CJIS certification exists.",
        "select": {
          "base": true,
          "claim_types": [
            "compliance"
          ],
          "finding_ids": [
            "cert-vocab"
          ],
          "weight": 8
        },
        "source_url": "https://le.fbi.gov/cjis-division/cjis-security-policy-resource-center"
      },
      {
        "good_answer": "Sharing off by default, granular controls, exportable audit logs, and written limits on federal and out-of-state access.",
        "id": "public-safety-policing-q05",
        "question": "Who outside our agency can search, receive, or get alerts from data our deployment collects? Show us the default sharing settings, the opt-out process, and a sample audit log of outside searches.",
        "red_flag": "Default-on national sharing with no audit review. Records from one Illinois town showed more than 4,000 outside lookups tied to immigration purposes in under a year, and one 2025 Texas search reached more than 83,000 cameras across state lines.",
        "select": {
          "base": true,
          "weight": 8
        },
        "source_url": "https://www.404media.co/ice-taps-into-nationwide-ai-enabled-camera-network-data-shows/"
      },
      {
        "good_answer": "Named independent or peer-reviewed evaluations, including any with null results, and honest framing of what the tool can and cannot do.",
        "id": "public-safety-policing-q06",
        "question": "Your materials say the system reduces crime or improves outcomes. Which independent studies support that, in which cities, and what did they find?",
        "red_flag": "Only vendor case studies. In Plainfield, NJ, 0.6% of robbery and assault predictions and 0.1% of burglary predictions matched a later reported crime (The Markup, Oct 2023).",
        "select": {
          "claim_types": [
            "performance"
          ],
          "finding_ids": [
            "perf-*"
          ],
          "weight": 8
        },
        "source_url": "https://themarkup.org/prediction-bias/2023/10/02/predictive-policing-software-terrible-at-predicting-crimes"
      },
      {
        "good_answer": "Published breakouts (for face recognition, NIST demographic results) plus support for independent local testing before go-live.",
        "id": "public-safety-policing-q07",
        "question": "What are your false positive rates broken out by race, sex, and age at our expected image quality and gallery size, and will you support our own pre-deployment testing on our data?",
        "red_flag": "A \"bias-free AI\" claim with no data. NIST's 2019 study of 189 algorithms found false positive rates 10 to 100 times higher for some demographic groups.",
        "select": {
          "claim_types": [
            "performance"
          ],
          "elevated": true,
          "weight": 8
        },
        "source_url": "https://www.nist.gov/news-events/news/2019/12/nist-study-evaluates-effects-race-age-sex-face-recognition-software"
      },
      {
        "good_answer": "Callable references plus a candid list of departures. Chicago ended gunshot detection in 2024 and Santa Cruz banned predictive policing in 2020, so ended deployments are a normal part of this market's record.",
        "id": "public-safety-policing-q08",
        "question": "Give us three agencies of our size that have run this product in production for two years or more, with named contacts we can call. Also name agencies that ended or did not renew deployments, and tell us why.",
        "red_flag": "Logo lists with no callable contact, or no acknowledgment of any ended deployment.",
        "select": {
          "claim_types": [
            "customer"
          ],
          "finding_ids": [
            "customers"
          ],
          "tiers": [
            3
          ],
          "weight": 6
        },
        "source_url": "https://abc7chicago.com/post/chicago-shotspotter-contract-ends-sunday-city-begin-dismantling-gunshot-detection-technology-monday/15341343/"
      },
      {
        "good_answer": "Exact statuses that match the marketplace listings. \"Authorized\" only when the listing says authorized.",
        "id": "public-safety-policing-q09",
        "question": "Which of these do you hold, under which exact product name: FedRAMP authorization, GovRAMP status, TX-RAMP, SOC 2 Type II? We will verify each on the official marketplace.",
        "red_flag": "\"Compliant\" used in place of \"authorized,\" or statuses that do not appear on the marketplace.",
        "select": {
          "claim_types": [
            "compliance"
          ],
          "finding_ids": [
            "fedramp_marketplace",
            "govramp",
            "txramp",
            "cert-vocab"
          ],
          "weight": 6
        },
        "source_url": "https://marketplace.fedramp.gov/"
      },
      {
        "good_answer": "Draft retention on by default, complete edit history, per-report disclosure, and a written compliance mapping for state AI report laws.",
        "id": "public-safety-policing-q10",
        "question": "For report-drafting AI: is the original AI draft retained, along with every edit and the audit log? Does every generated report carry a disclosure, and how do you meet Utah SB 180 and California SB 524 where they apply?",
        "red_flag": "Drafts deleted by design. EFF documented in July 2025 that one major product does not retain original drafts, and King County, WA prosecutors said in 2024 they would not accept AI-assisted narratives.",
        "select": {
          "elevated": true,
          "tiers": [
            3,
            4
          ],
          "weight": 9
        },
        "source_url": "https://www.eff.org/deeplinks/2025/07/axons-draft-one-designed-defy-transparency"
      },
      {
        "good_answer": "Documented provenance and written no-training terms for agency data.",
        "id": "public-safety-policing-q11",
        "question": "What data trained the models we would use, do you have documented rights to that data, and is any of our data used to train models for other customers?",
        "red_flag": "Scraped-at-scale training data with unresolved legal exposure. Clearview AI settled Illinois BIPA litigation in 2022 with nationwide limits on private sales of its database.",
        "select": {
          "claim_types": [
            "identity",
            "compliance"
          ],
          "weight": 7
        },
        "source_url": "https://www.aclu-il.org/cases/aclu-v-clearview-ai/"
      },
      {
        "good_answer": "A current, state-specific legal mapping and demonstrated experience with public approval processes (Washington's SB 6280 regime is a useful test case).",
        "id": "public-safety-policing-q12",
        "question": "List every statute, ordinance, and policy that applies to this deployment in our jurisdiction: state biometric or facial recognition laws, surveillance-oversight ordinances, retention rules, and any council approval we need. Provide your statute map for our state.",
        "red_flag": "\"Legal compliance is the agency's responsibility,\" with no mapping offered.",
        "select": {
          "tiers": [
            3,
            4
          ],
          "weight": 7
        },
        "source_url": "https://app.leg.wa.gov/billsummary?BillNumber=6280&Year=2019"
      },
      {
        "good_answer": "Contractual exit terms with deletion certification and no-cost evidence export. Chicago's 2024 wind-down ran on a 60-day decommissioning clock; ask for your own equivalent.",
        "id": "public-safety-policing-q13",
        "question": "If we end this contract, what happens? Walk us through data return and deletion with certification, hardware removal, evidence export in open formats, and the timeline, and put all of it in the contract.",
        "red_flag": "Silence on exit, export fees, or evidence locked in proprietary formats.",
        "select": {
          "tiers": [
            3,
            4
          ],
          "weight": 6
        },
        "source_url": "https://abc7chicago.com/post/chicago-police-longer-using-shotspotter-gunshot-detection-technology-mayor-brandon-johnson-exploring-other-options/15342988/"
      },
      {
        "good_answer": "Negotiated indemnification, audit rights, and evidence of insurance.",
        "id": "public-safety-policing-q14",
        "question": "If our agency is sued over an action taken from your system's output, what liability do you accept, and will you agree to indemnification and audit-rights clauses in the contract?",
        "red_flag": "All liability left on the agency. Cities have paid the settlements tied to these tools: Detroit paid $300,000 (2024) and Chicago paid $500,000 (2026).",
        "select": {
          "tiers": [
            4
          ],
          "weight": 7
        },
        "source_url": "https://news.wttw.com/2026/03/04/chicago-man-was-charged-murder-based-shotspotter-alert-now-city-will-pay-him-500k"
      },
      {
        "good_answer": "Full input and factor transparency, local validation studies, and written acknowledgment of the Loomis cautions (a score may inform a sentence and may never determine it).",
        "id": "public-safety-policing-q15",
        "question": "If your product scores people for bail, sentencing, supervision, or custody decisions: can the person, their lawyer, and the court see the inputs and factor weights, and what validation exists on our population?",
        "red_flag": "Proprietary factors withheld from courts, or one national validation offered for every population. ProPublica's 2016 analysis found higher false positive rates for Black defendants on one widely used tool; the vendor disputed the methodology.",
        "select": {
          "elevated": true,
          "weight": 8
        },
        "source_url": "https://www.wicourts.gov/sc/opinion/DisplayDocument.pdf?content=pdf&seqNo=171690"
      }
    ],
    "elevated_scrutiny_rules": [
      {
        "action": "The output floor is the \"enhanced review\" band. The lightest band is unavailable until the corroboration question (q01) is answered with product and policy evidence.",
        "condition": "Any match on this pack"
      },
      {
        "action": "Strongest caution band, always.",
        "condition": "Any claim that an output alone can support a stop, arrest, charge, or use-of-force decision"
      },
      {
        "action": "Require NIST FRTE participation evidence (q02, q07) before any demo stage, and surface the state biometric and facial recognition law items from legal_context.",
        "condition": "A face recognition or other biometric identification pitch"
      },
      {
        "action": "Treat as an adverse-action system: add the eligibility-case-mgmt overlay (its questions q01, q02, q03 and its \"Why this category is different\" block) alongside this pack's q15.",
        "condition": "A risk-scoring pitch for bail, sentencing, supervision, or custody decisions"
      },
      {
        "action": "Question q10 (draft retention and disclosure) must be answered in writing before any pilot. Surface the King County prosecutor guidance and the Utah and California statutes.",
        "condition": "A report-drafting or narrative-generation pitch"
      },
      {
        "action": "Question q05 (outside access and audit logs) must be answered with a real audit log sample before contract signature.",
        "condition": "A shared-network camera or sensor pitch"
      }
    ],
    "established_vendors": [
      {
        "gov_evidence_url": "https://www.eff.org/deeplinks/2025/07/axons-draft-one-designed-defy-transparency",
        "name": "Axon",
        "one_liner": "Body cameras, digital evidence, conducted energy weapons, and the Draft One report-drafting assistant; acquired real-time crime center vendor Fusus in early 2024. EFF documented agency use of Draft One in July 2025.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": null,
        "name": "Motorola Solutions",
        "one_liner": "Dispatch, records management, video, and the Vigilant license plate reader ecosystem, sold across state and local government.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": null,
        "name": "NEC",
        "one_liner": "Large-scale biometric matching vendor and long-standing participant in NIST face recognition evaluations.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": null,
        "name": "Idemia",
        "one_liner": "Biometrics supplier to state identification and driver-license systems; NIST evaluation participant.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": "https://igchicago.org/2021/08/24/oig-finds-that-shotspotter-alerts-rarely-lead-to-evidence-of-a-gun-related-crime-and-that-presence-of-the-technology-changes-police-behavior/",
        "name": "SoundThinking",
        "one_liner": "ShotSpotter gunshot detection (about 250 agencies, vendor-reported). Chicago's OIG reviewed the deployment in 2021 and the city ended the contract in September 2024; the company also acquired Geolitica assets in 2023.",
        "tier": "specialist"
      },
      {
        "gov_evidence_url": "https://www.courthousenews.com/judge-holds-norfolks-license-plate-reader-use-constitutional/",
        "name": "Flock Safety",
        "one_liner": "Subscription license plate reader networks with cross-agency search; the Norfolk, VA deployment is the subject of active Fourth Amendment litigation.",
        "tier": "specialist"
      },
      {
        "gov_evidence_url": "https://www.aclu-il.org/cases/aclu-v-clearview-ai/",
        "name": "Clearview AI",
        "one_liner": "Face search built on billions of scraped web images, sold to law enforcement; operates under the May 2022 Illinois BIPA settlement's nationwide restrictions.",
        "tier": "specialist"
      },
      {
        "gov_evidence_url": "https://clearinghouse.net/case/44401/",
        "name": "DataWorks Plus",
        "one_liner": "Face recognition interface used by Michigan State Police and Detroit; the Williams v. City of Detroit wrongful-arrest case ran through this system.",
        "tier": "specialist"
      },
      {
        "gov_evidence_url": "https://www.wicourts.gov/sc/opinion/DisplayDocument.pdf?content=pdf&seqNo=171690",
        "name": "equivant",
        "one_liner": "Court, pretrial, and corrections software; its COMPAS assessment was the tool at issue in State v. Loomis (2016) and the 2016 ProPublica analysis, both of which the vendor has contested.",
        "tier": "specialist"
      }
    ],
    "failure_modes": [
      {
        "description": "Chicago's Office of Inspector General analyzed 50,176 confirmed ShotSpotter alerts (Jan 2020 to May 2021) and found 9.1% of police responses produced evidence of a gun-related offense. The OIG also found the technology changed how officers interacted with residents, including stops justified by aggregate alert frequency. The city's contract expired on September 22, 2024, and the department stopped using the system the next morning.",
        "named_incident": "Chicago OIG ShotSpotter analysis (Aug 24, 2021); contract expired Sept 22, 2024",
        "source_url": "https://igchicago.org/2021/08/24/oig-finds-that-shotspotter-alerts-rarely-lead-to-evidence-of-a-gun-related-crime-and-that-presence-of-the-technology-changes-police-behavior/",
        "title": "Alerts that rarely produce evidence (Chicago ShotSpotter)"
      },
      {
        "description": "The Markup analyzed 23,631 Geolitica (PredPol) predictions for Plainfield, NJ in 2018: 0.6% of robbery and aggravated assault predictions and 0.1% of burglary predictions matched a crime later reported in the predicted window. The department stopped using it, and Geolitica ceased operations at the end of 2023.",
        "named_incident": "The Markup analysis of Geolitica predictions in Plainfield, NJ (Oct 2, 2023)",
        "source_url": "https://themarkup.org/prediction-bias/2023/10/02/predictive-policing-software-terrible-at-predicting-crimes",
        "title": "Predictions that almost never matched crimes (Geolitica, Plainfield NJ)"
      },
      {
        "description": "Chicago's Strategic Subject List and successor model scored more than 300,000 people, disproportionately people of color, for likelihood of involvement in violence. The OIG's January 2020 advisory documented unreliable scores, poorly trained personnel, weak access controls, and consequences attached to arrests that never led to convictions. CPD decommissioned the program on November 1, 2019.",
        "named_incident": "Chicago OIG advisory on CPD predictive risk models (Jan 23, 2020)",
        "source_url": "https://igchicago.org/2020/01/23/advisory-concerning-the-chicago-police-departments-predictive-risk-models/",
        "title": "Person-based risk scores decommissioned after oversight (Chicago SSL)"
      },
      {
        "description": "Robert Williams was arrested after a face recognition search wrongly identified him; department policy already called matches investigative leads. The June 28, 2024 settlement paid $300,000 and bound Detroit to the strictest big-city rules in the country: no arrest and no photo lineup from a face match alone, plus officer training on the technology's risks and an audit of every case since 2017 in which a face search helped obtain an arrest warrant.",
        "named_incident": "Williams v. City of Detroit settlement (June 28, 2024)",
        "source_url": "https://www.aclu.org/press-releases/civil-rights-advocates-achieve-the-nations-strongest-police-department-policy-on-facial-recognition-technology",
        "title": "Wrongful arrest from a face recognition lead (Williams v. Detroit)"
      },
      {
        "description": "Clearview AI built its face search on scraped web images without consent. The May 2022 settlement of ACLU v. Clearview AI under the Illinois Biometric Information Privacy Act permanently barred sales of the faceprint database to most private entities nationwide and restricted access in Illinois for five years.",
        "named_incident": "ACLU v. Clearview AI settlement (May 2022)",
        "source_url": "https://www.aclu-il.org/cases/aclu-v-clearview-ai/",
        "title": "Biometric data collected without consent (Clearview AI, Illinois BIPA)"
      },
      {
        "description": "ProPublica's May 2016 analysis of COMPAS scores in Broward County, FL found Black defendants who did not reoffend were labeled higher risk at nearly twice the rate of white defendants; the vendor disputed the methodology. Weeks later, the Wisconsin Supreme Court in State v. Loomis (July 13, 2016) allowed sentencing use only with written cautions, including that the score may inform a sentence and may never determine it, and noted no Wisconsin cross-validation study existed.",
        "named_incident": "ProPublica COMPAS analysis (May 23, 2016) and State v. Loomis, 2016 WI 68",
        "source_url": "https://www.propublica.org/article/machine-bias-risk-assessments-in-criminal-sentencing",
        "title": "Risk scores at sentencing with contested validity (COMPAS, Loomis)"
      },
      {
        "description": "EFF's July 2025 review found Draft One does not retain the original AI-generated draft, by design, so no one can later show which parts of a report the model wrote. In September 2024, King County, WA prosecutors told police they would not accept AI-assisted narratives, citing an example report that referenced an officer who was not at the scene (memo: https://pceinc.org/wp-content/uploads/2025/01/20240920-Email-to-Police-Chiefs-re-Axon-Draft-One-King-County-Prosecuting-Attorney-Dan-Clark.pdf).",
        "named_incident": "EFF Draft One investigation (July 10, 2025); King County prosecutor memo (Sept 2024)",
        "source_url": "https://www.eff.org/deeplinks/2025/07/axons-draft-one-designed-defy-transparency",
        "title": "AI-drafted reports without an audit trail (Axon Draft One)"
      },
      {
        "description": "Two 404 Media reports in May 2025 documented the reach of shared camera networks: audit data from Danville, IL showed more than 4,000 lookups tied to immigration purposes performed for federal authorities through local accounts, and a Texas officer searched more than 83,000 cameras nationwide for a woman who had an abortion (https://www.404media.co/a-texas-cop-searched-license-plate-cameras-nationwide-for-a-woman-who-got-an-abortion/). The network effect means one town's cameras answer other jurisdictions' queries.",
        "named_incident": "404 Media reporting on nationwide Flock lookups (May 2025)",
        "source_url": "https://www.404media.co/ice-taps-into-nationwide-ai-enabled-camera-network-data-shows/",
        "title": "Shared camera networks searched beyond the local purpose (Flock)"
      },
      {
        "description": "Michael Williams spent nearly a year in Cook County jail on a 2020 murder charge that rested on a ShotSpotter alert. Prosecutors dismissed the case rather than defend the evidence, telling the court they had insufficient evidence to proceed. Chicago settled his federal suit for $500,000 in March 2026.",
        "named_incident": "Williams v. City of Chicago; $500K settlement (Mar 2026)",
        "source_url": "https://www.macarthurjustice.org/case/williams-v-city-of-chicago/",
        "title": "A prosecution built on sensor evidence that collapsed (Michael Williams)"
      },
      {
        "description": "Pasco County, FL's intelligence-led policing program generated repeated home visits and code-enforcement pressure on people its models flagged. In a December 2024 settlement of an Institute for Justice suit, the sheriff's office acknowledged the program interfered with residents' First, Fourth, and Fourteenth Amendment rights, paid $105,000, and agreed never to restart it.",
        "named_incident": "Pasco County intelligence-led policing settlement (Dec 2024)",
        "source_url": "https://ij.org/press-release/case-closed-pasco-sheriff-admits-predictive-policing-program-violated-constitution/",
        "title": "Targeting programs ended by settlement (Pasco County ILP)"
      }
    ],
    "inclusion_test": [
      "Does the pitch offer detection, identification, prediction, scoring, or monitoring aimed at people or places for policing, prosecution, courts, corrections, or community supervision (gunshot detection, face or plate recognition, predictive policing, risk scores)?",
      "Does it offer to draft, summarize, or auto-fill police reports, warrant applications, incident narratives, or other records that could enter a court case?",
      "Does it sell cameras, sensors, or analytics whose data is shared across agencies or through a vendor-operated network?",
      "Does it offer real-time crime center, video analytics, or emergency-call triage capability to a public safety agency?",
      "Does any other pack's pitch describe outputs that could feed decisions about stops, arrests, charges, bail, sentencing, supervision, or custody? (This is the overlay trigger.)"
    ],
    "incumbent_landscape": "Platforms: Axon dominates body cameras, digital evidence, and conducted energy weapons, and now sells the Draft One report-drafting assistant and real-time crime center tooling (it acquired Fusus in early 2024; terms were not disclosed at announcement, and Axon's annual filing later put the price near $241 million: https://www.prnewswire.com/news-releases/axon-accelerates-real-time-operations-solution-with-strategic-acquisition-of-fusus-302050184.html). Motorola Solutions sells dispatch, records, video, and the Vigilant license plate ecosystem. NEC and Idemia supply large-scale biometric matching. Palantir sells investigative data integration. Specialists: SoundThinking sells ShotSpotter gunshot detection (about 250 agencies, vendor-reported) and absorbed staff and patents from Geolitica, the PredPol maker that ceased operations at the end of 2023 (Techdirt, Oct 2, 2023: https://www.techdirt.com/2023/10/02/shotspotter-looking-to-compound-bad-cop-tech-ideas-by-acquiring-predictive-policing-software-company/). Flock Safety sells subscription license plate cameras with a shared national search network; one documented 2025 search reached more than 83,000 cameras across state lines (404 Media, May 29, 2025). Clearview AI sells face search built on scraped web images and operates under 2022 settlement restrictions from Illinois BIPA litigation. DataWorks Plus supplies the face recognition interface used by Michigan agencies in the Detroit wrongful-arrest litigation. equivant (formerly Northpointe) sells the COMPAS assessment contested in State v. Loomis; the nonprofit-supported PSA is the main alternative pretrial instrument (https://advancingpretrial.org/psa/about/). Context that matters for buyers: flagship products in this market have been retired by their own government customers after oversight review. Chicago ended ShotSpotter in September 2024 and decommissioned its person-based risk scores in 2019 after an OIG advisory; Santa Cruz banned predictive policing in 2020; Pasco County ended its intelligence-led policing program in a 2024 settlement. A vendor's appearance here is a market-map fact and never a safety signal. AI also arrives inside incumbent bundles (report drafting inside the body-camera contract, analytics inside the camera subscription), so a routine renewal can carry a new AI system that never went through procurement review.",
    "known_gaps": "- The lint's banned list includes the first word of the CJIS acronym's\n  expansion, so this pack refers to the FBI policy only as the CJIS\n  Security Policy and rewrites around that word family throughout. A\n  carve-out similar to the existing bare-noun program-integrity rule may\n  be needed for this sector's ordinary vocabulary.\n- SoundThinking's agency count (about 250) is vendor-reported and was not\n  independently verified this cycle.\n- The AP's August 2021 investigation of ShotSpotter evidence in courts\n  could not be fetched directly (host blocks retrieval); the Michael\n  Williams facts are sourced through the MacArthur Justice Center case\n  page and WTTW instead.\n- State facial recognition statutes beyond Illinois and Washington\n  (Maine's 2021 law, Massachusetts, Virginia, Montana, Vermont) were not\n  re-verified this cycle and are omitted from legal_context.\n- Clearview AI's later enforcement history (the 2025 class-action\n  settlement structure, UK ICO litigation) was not verified this cycle\n  and is omitted.\n- Schmidt v. City of Norfolk is fast-moving: the district court ruled for\n  the city in 2026 and an appeal was announced. Verify before citing.\n- LAPD Operation LASER, the NYPD gang database, and other person-based\n  program retirements are omitted pending URL capture.\n- Axon Draft One has no public list price; no pricing anchor exists for\n  report-drafting AI.\n- Emergency-management and 911-triage AI (Carbyne, Prepared, RapidSOS)\n  is in scope by definition but has no named incident in this draft;\n  candidates should be researched next cycle.",
    "last_updated": "2026-08-29",
    "legal_context": "## Why this category is different\n\nOutputs in this category feed decisions about stops, arrests, charges,\nbail, sentencing, and custody. When they are wrong, the documented results\ninclude wrongful arrests (Detroit; $300,000 settlement, June 2024),\nnearly a year in jail on a case prosecutors later dismissed (Chicago;\n$500,000 settlement, March 2026), and targeting programs a sheriff agreed to end\nunder court supervision (Pasco County, December 2024). Discovery\nobligations run to the agency and the prosecution, so a vendor's\ntrade-secret posture becomes the agency's courtroom problem. This pack\ntherefore floors its output at enhanced review, and treats any claim that\nan output alone can justify enforcement action as the strongest caution\nband.\n\n## Controlling law and policy\n\n- Brady v. Maryland, 373 U.S. 83 (1963): the prosecution's disclosure\n  obligations reach material evidence, which is why question q03 asks for\n  written discovery commitments up front.\n- State v. Loomis, 2016 WI 68 (Wis., July 13, 2016): risk scores may be\n  used at sentencing only with written cautions, and may never be the\n  determinative factor\n  (https://www.wicourts.gov/sc/opinion/DisplayDocument.pdf?content=pdf&seqNo=171690).\n- Illinois Biometric Information Privacy Act (740 ILCS 14, enacted 2008):\n  written consent before collecting biometric identifiers; basis of the\n  May 2022 Clearview AI settlement\n  (https://www.aclu-il.org/cases/aclu-v-clearview-ai/).\n- Washington SB 6280 (signed Mar 31, 2020 with partial veto; effective\n  Jul 1, 2021): regulates state and local government use of facial\n  recognition services\n  (https://app.leg.wa.gov/billsummary?BillNumber=6280&Year=2019).\n- Utah SB 180 (signed Mar 25, 2025; effective May 7, 2025): law\n  enforcement agencies must adopt generative-AI policies; AI-assisted\n  reports must carry a disclaimer and an author accuracy certification\n  (https://le.utah.gov/~2025/bills/static/SB0180.html).\n- California SB 524 (signed Oct 10, 2025; effective Jan 1, 2026):\n  AI-assisted police reports must carry disclosures; agencies must retain\n  first drafts and audit trails; vendors are barred from selling or\n  sharing the data agencies provide to the AI\n  (https://www.eff.org/deeplinks/2025/10/victory-california-requires-transparency-ai-police-reports).\n- FBI CJIS Security Policy: binding on access to CJIS systems through\n  signed agreements, addenda, and state audits; there is no federal\n  vendor certification\n  (https://le.fbi.gov/cjis-division/cjis-security-policy-resource-center).\n- Fourth Amendment litigation over camera networks: Schmidt v. City of\n  Norfolk (filed Oct 2024; summary judgment for the city in early 2026;\n  appeal filed with the Fourth Circuit). Verify current status before\n  citing\n  (https://www.courthousenews.com/judge-holds-norfolks-license-plate-reader-use-constitutional/).\n- Williams v. City of Detroit settlement (June 28, 2024): binding\n  face recognition limits enforceable for four years; the current\n  strictest big-city standard\n  (https://www.aclu.org/press-releases/civil-rights-advocates-achieve-the-nations-strongest-police-department-policy-on-facial-recognition-technology).\n- Local surveillance-oversight ordinances: many cities require council\n  approval and annual reporting before new surveillance technology is\n  acquired. Check your own municipal code before any pilot.",
    "pack_id": "public-safety-policing",
    "pack_name": "Public Safety & Policing AI",
    "realistic_pricing": "Published anchors exist for the two most commoditized product lines:\n\n- Gunshot detection: about $65,000 to $90,000 per square mile per year in\n  direct cost (Manhattan Institute brief, Robert VerBruggen, October 2025:\n  https://media4.manhattan-institute.org/wp-content/uploads/thinking-through-the-shotspotter-debate.pdf).\n  Multiply by coverage area before the demo; a mid-size city covering 10\n  square miles is agreeing to roughly $650K to $900K per year.\n- License plate readers: Flock publishes no list price and quotes bundled\n  subscriptions (https://www.flocksafety.com/pricing). Public city\n  contracts commonly land near $3,000 per camera per year plus a one-time\n  installation fee (practitioner estimate from published municipal\n  contracts; verify against your own quote).\n- Place-based prediction software has sold for as little as $20,500 per\n  year (Plainfield, NJ's Geolitica subscription, per The Markup, Oct\n  2023), a reminder that a low price does not settle the evidence\n  questions.\n- Report-drafting AI: no public list price; it is typically sold inside\n  body-camera and digital-evidence bundles. Ask for line-item pricing so\n  the AI component can be declined at renewal without losing the rest of\n  the bundle.\n\nHeuristic: per-unit subscription pricing compounds quietly. Ask for the\nfive-year total cost of ownership, including installation, network\ncharges, and every bundled AI feature, and compare it against the anchors\nabove. If a quote is several times these anchors, ask what specifically\njustifies the difference.",
    "reference_deployments": [
      {
        "agency": "City of Chicago (cautionary)",
        "metric": "9.1% of police responses to 50,176 alerts (Jan 2020 to May 2021) produced evidence of a gun-related offense; contract expired Sept 22, 2024",
        "metric_source_type": "oversight",
        "source_url": "https://igchicago.org/2021/08/24/oig-finds-that-shotspotter-alerts-rarely-lead-to-evidence-of-a-gun-related-crime-and-that-presence-of-the-technology-changes-police-behavior/",
        "vendor_stack": "SoundThinking ShotSpotter",
        "what": "Citywide gunshot detection, reviewed by the Office of Inspector General and ended by the city in 2024"
      },
      {
        "agency": "Plainfield, NJ Police Division (cautionary)",
        "metric": "0.6% of robbery and aggravated assault predictions and 0.1% of burglary predictions matched a later reported crime, across 23,631 predictions in 2018",
        "metric_source_type": "independent-press",
        "source_url": "https://themarkup.org/prediction-bias/2023/10/02/predictive-policing-software-terrible-at-predicting-crimes",
        "vendor_stack": "Geolitica (PredPol)",
        "what": "Place-based crime prediction subscription, later discontinued"
      },
      {
        "agency": "Detroit Police Department (cautionary, now under settlement policy)",
        "metric": "$300,000 settlement (June 28, 2024) plus rules: no arrest and no photo lineup from a face match alone, with an audit of past cases and four years of court oversight",
        "metric_source_type": "independent-press",
        "source_url": "https://www.aclu.org/press-releases/civil-rights-advocates-achieve-the-nations-strongest-police-department-policy-on-facial-recognition-technology",
        "vendor_stack": "DataWorks Plus face recognition",
        "what": "Face recognition investigative searches, now governed by the Williams settlement's binding limits"
      },
      {
        "agency": "City of Norfolk, VA (contested in litigation)",
        "metric": "Court filings showed one plaintiff's vehicle logged 526 times in about four months; the district court granted summary judgment for the city in early 2026 and the residents appealed to the Fourth Circuit",
        "metric_source_type": "independent-press",
        "source_url": "https://www.courthousenews.com/judge-holds-norfolks-license-plate-reader-use-constitutional/",
        "vendor_stack": "Flock Safety license plate readers",
        "what": "Citywide network of about 176 cameras, challenged under the Fourth Amendment in Schmidt v. City of Norfolk"
      },
      {
        "agency": "Pasco County, FL Sheriff's Office (cautionary)",
        "metric": "$105,000 paid (Dec 2024); the office acknowledged interference with residents' First, Fourth, and Fourteenth Amendment rights and agreed never to restart the program",
        "metric_source_type": "independent-press",
        "source_url": "https://ij.org/press-release/case-closed-pasco-sheriff-admits-predictive-policing-program-violated-constitution/",
        "vendor_stack": "In-house intelligence-led policing models",
        "what": "Person-based targeting program ended by a federal settlement"
      }
    ],
    "refresh_cadence": "monthly",
    "registries_to_check": [
      {
        "name": "NIST Face Recognition Technology Evaluation (FRTE)",
        "url": "https://pages.nist.gov/frvt/html/frvt11.html",
        "what_it_proves": "Whether a face recognition vendor submits its algorithms for public federal testing, under its own name, and how accuracy and demographic differentials compare across vendors. Absence from FRTE is a fair question to ask about."
      },
      {
        "name": "FBI CJIS Security Policy Resource Center",
        "url": "https://le.fbi.gov/cjis-division/cjis-security-policy-resource-center",
        "what_it_proves": "The actual policy text vendors must align with. Note what it does not prove: the FBI does not certify vendors, so \"CJIS certified\" is marketing vocabulary."
      },
      {
        "name": "FedRAMP Marketplace",
        "url": "https://marketplace.fedramp.gov/",
        "what_it_proves": "Whether a specific product holds a federal cloud authorization, and at what level. \"In process\" is different from \"authorized.\""
      },
      {
        "name": "GovRAMP Authorized Product List",
        "url": "https://govramp.org/",
        "what_it_proves": "State-oriented cloud security verification. Formerly StateRAMP; the name changed in February 2025."
      },
      {
        "name": "Atlas of Surveillance (EFF)",
        "url": "https://atlasofsurveillance.org/",
        "what_it_proves": "Which agencies already use which surveillance technologies, by vendor and type. Useful for finding real reference agencies to call, including ones the vendor did not offer."
      },
      {
        "name": "AI Incident Database",
        "url": "https://incidentdatabase.ai/",
        "what_it_proves": "A public log of AI system failures. Search the vendor and product name before any demo."
      }
    ],
    "scrutiny_tier": "elevated",
    "signal_lexicon": [
      "gunshot detection",
      "shotspotter",
      "license plate reader",
      "alpr",
      "facial recognition",
      "biometric identification",
      "predictive policing",
      "crime analytics",
      "real-time crime center",
      "body-worn camera",
      "risk score",
      "pretrial assessment",
      "report writing",
      "video analytics",
      "computer-aided dispatch"
    ],
    "skepticism_triggers": [
      {
        "claim_pattern": "\"Detects over 90% of gunfire\" or similar detection-accuracy claims",
        "source_url": "https://igchicago.org/2021/08/24/oig-finds-that-shotspotter-alerts-rarely-lead-to-evidence-of-a-gun-related-crime-and-that-presence-of-the-technology-changes-police-behavior/",
        "threshold": "Any detection-accuracy claim offered without a field evidence rate from an independent review",
        "why": "Detection accuracy and street outcomes are different numbers. Chicago's OIG found 9.1% of police responses to alerts produced evidence of a gun-related offense."
      },
      {
        "claim_pattern": "\"Reduces crime by X%\" or \"prevents crime before it happens\"",
        "source_url": "https://themarkup.org/prediction-bias/2023/10/02/predictive-policing-software-terrible-at-predicting-crimes",
        "threshold": "Any percentage crime-reduction claim",
        "why": "Independent evaluations in this category have repeatedly failed to find the claimed effects. In Plainfield, NJ, prediction match rates were 0.6% and 0.1%."
      },
      {
        "claim_pattern": "\"CJIS certified\"",
        "source_url": "https://gbi.georgia.gov/services/cjis-vendor-compliance-program",
        "threshold": "Any use of the phrase as a credential",
        "why": "The FBI does not certify vendors, and state vendor programs state plainly that no certification is conferred. The honest phrasing describes alignment with the CJIS Security Policy plus named state audits and signed addenda."
      },
      {
        "claim_pattern": "\"99%+ accurate\" face or biometric matching",
        "source_url": "https://www.nist.gov/news-events/news/2019/12/nist-study-evaluates-effects-race-age-sex-face-recognition-software",
        "threshold": "Any accuracy claim without NIST FRTE results under the vendor's own name, at an operational gallery size, with demographic breakouts",
        "why": "NIST's 2019 study of 189 algorithms found false positive rates 10 to 100 times higher for some demographic groups, and the gap varies widely by vendor."
      },
      {
        "claim_pattern": "\"It is only an investigative lead\"",
        "source_url": "https://www.aclu.org/press-releases/civil-rights-advocates-achieve-the-nations-strongest-police-department-policy-on-facial-recognition-technology",
        "threshold": "Lead-only framing paired with real-time alerts pushed to patrol officers or booking workflows",
        "why": "The documented wrongful arrests happened in agencies whose policies already said lead-only. Ask what product controls prevent an arrest from a match alone; Detroit's settlement shows what enforceable controls look like."
      },
      {
        "claim_pattern": "\"Officers save X hours per report\"",
        "source_url": "https://www.eff.org/deeplinks/2024/10/prosecutors-washington-state-warn-police-dont-use-gen-ai-write-reports",
        "threshold": "Time-savings claims for report drafting without draft retention, edit history, and per-report disclosure",
        "why": "Time saved is only measurable against the review burden. King County, WA prosecutors declined AI-assisted narratives in 2024 over accuracy concerns."
      },
      {
        "claim_pattern": "\"Your data always belongs to you\"",
        "source_url": "https://www.404media.co/ice-taps-into-nationwide-ai-enabled-camera-network-data-shows/",
        "threshold": "Data-ownership claims from a vendor operating a cross-agency search network",
        "why": "Ownership language says little about who can search the data. Audit logs from one Illinois town showed more than 4,000 outside lookups tied to immigration purposes in under a year."
      },
      {
        "claim_pattern": "\"Trusted by thousands of agencies\"",
        "source_url": "https://themarkup.org/prediction-bias/2023/10/02/predictive-policing-software-terrible-at-predicting-crimes",
        "threshold": "Customer counts offered in place of named, callable references",
        "why": "Adoption breadth has not predicted survival or performance in this market. PredPol's maker had customers across the country and ceased operations at the end of 2023."
      },
      {
        "claim_pattern": "Free pilot, grant-financed trial, or hardware at no cost",
        "source_url": null,
        "threshold": "Any free or grant-financed pilot with auto-renewal terms or data-sharing conditions",
        "why": "The subscription and network model makes departure costly later. Get exit terms, deletion certification, and data-sharing defaults in writing before the pilot starts."
      },
      {
        "claim_pattern": "\"Deploy in weeks\"",
        "source_url": null,
        "threshold": "Deployment promises under 90 days in a jurisdiction with a surveillance-oversight ordinance or council-approval requirement",
        "why": "Community approval processes and CJIS agreements take longer than that. A speed pitch can mean the approval step is being skipped."
      }
    ]
  },
  "staff-productivity": {
    "definition": "AI that helps government staff do their work: writing and drafting assistants, enterprise copilots, meeting transcription and AI notetakers, internal search and summarization, and back-office workflow automation. This pack does not cover anything resident-facing (see the public-comms and call-center packs) or anything feeding case decisions (that adds the eligibility-case-mgmt overlay).",
    "diligence_questions": [
      {
        "good_answer": "A concrete, named differentiator and a defensible answer about the roadmap gap.",
        "id": "staff-productivity-q01",
        "question": "We already license (or can nearly freely add) Microsoft 365 Copilot or Gemini. What specifically does your product do that they do not, and what happens to that gap when their next release ships?",
        "red_flag": "Generic productivity claims that the bundled incumbent already covers.",
        "select": {
          "base": true
        },
        "source_url": null
      },
      {
        "good_answer": "Yes across all content types, in usable formats, demonstrated live.",
        "id": "staff-productivity-q02",
        "question": "Can our records officers search, retrieve, export, and verifiably delete every prompt, output, transcript, and summary you hold, in a usable format, for a public-records request?",
        "red_flag": "Export gaps for any content type, or export sold as a professional-services engagement.",
        "select": {
          "base": true
        },
        "source_url": "https://mrsc.org/stay-informed/mrsc-insight/july-2024/public-records-and-ai"
      },
      {
        "good_answer": "Retention configurable to your schedules, with no uncontrollable content stores.",
        "id": "staff-productivity-q03",
        "question": "Can retention be set to match our schedules, and is there any content (chat history, telemetry, backups) we cannot control?",
        "red_flag": "Telemetry, chat history, or backups your records officers cannot control.",
        "select": {
          "base": true
        },
        "source_url": null
      },
      {
        "good_answer": "Written no-training terms, named data residency, and a deletion-at-exit commitment.",
        "id": "staff-productivity-q04",
        "question": "Contractually: is our data used to train your models or any third party's? Where does it reside? What happens at contract end?",
        "red_flag": "Silence on subprocessors, or \"we may use data to improve services.\"",
        "select": {
          "base": true
        },
        "source_url": null
      },
      {
        "good_answer": "An affirmative-consent flow for every participant, including the public.",
        "id": "staff-productivity-q05",
        "question": "How does the tool obtain affirmative consent from every participant, including non-users and the public, in all-party-consent states? What is your exposure to Otter.ai-style litigation?",
        "red_flag": "Consent inferred from a bot being visible; that theory is being litigated in Brewer v. Otter.ai.",
        "select": {
          "base": true
        },
        "source_url": "https://natlawreview.com/article/ai-notetaking-tools-under-fire-lessons-otterai-class-action-complaint"
      },
      {
        "good_answer": "Technical blocklists for closed sessions and sensitive meeting types.",
        "id": "staff-productivity-q06",
        "question": "Can we technically block the tool from closed sessions, attorney-client calls, HR meetings, and juvenile or health matters, or does it rely on staff remembering?",
        "red_flag": "Reliance on staff remembering to turn it off.",
        "select": {
          "elevated": true
        },
        "source_url": null
      },
      {
        "good_answer": "Named authorization levels and the specific cloud tier; CJIS-touching work runs in GCC High or the equivalent.",
        "id": "staff-productivity-q07",
        "question": "What FedRAMP level, GovRAMP status, and SOC 2 Type II do you hold, is the tool CJIS-compatible, and in which cloud does our tenant run?",
        "red_flag": "Commercial cloud offered for CJIS or FTI workloads.",
        "select": {
          "claim_types": [
            "compliance"
          ],
          "finding_ids": [
            "cert-vocab",
            "fedramp_marketplace",
            "govramp",
            "txramp"
          ],
          "weight": 3
        },
        "source_url": "https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-licensing-gcc"
      },
      {
        "good_answer": "A measured error rate and UI that requires review before content becomes a record.",
        "id": "staff-productivity-q08",
        "question": "What is the measured error rate for summaries and drafts, and what does the UI do to force human review (such as source-linking) before content becomes an official record?",
        "red_flag": "No error measurement; summaries flowing into official records unreviewed.",
        "select": {
          "claim_types": [
            "performance"
          ],
          "elevated": true,
          "finding_ids": [
            "perf-*"
          ],
          "weight": 2
        },
        "source_url": null
      },
      {
        "good_answer": "Usage logs adequate for audit without keystroke-level surveillance.",
        "id": "staff-productivity-q09",
        "question": "What usage logs do we get, and can we audit misuse without creating a workforce-surveillance problem?",
        "red_flag": "Either no logs at all, or workforce surveillance by default.",
        "select": {
          "base": true
        },
        "source_url": null
      },
      {
        "good_answer": "Honest labeling of self-reported versus measured, with the methodology shared.",
        "id": "staff-productivity-q10",
        "question": "Are your time-savings claims self-reported user estimates (like Pennsylvania's 95 minutes per day) or independently measured? Show the methodology.",
        "red_flag": "Self-reported figures presented as measured savings.",
        "select": {
          "claim_types": [
            "performance"
          ],
          "finding_ids": [
            "perf-*"
          ],
          "weight": 4
        },
        "source_url": "https://digitalgovernmenthub.org/library/lessons-from-pennsylvanias-generative-ai-pilot-with-chatgpt/"
      },
      {
        "good_answer": "A documented export process and certified deletion at termination.",
        "id": "staff-productivity-q11",
        "question": "On termination, how do we get every record out, and how do you certify deletion?",
        "red_flag": "No deletion certification.",
        "select": {
          "tiers": [
            3,
            4
          ]
        },
        "source_url": null
      },
      {
        "good_answer": "A named customer that has been through it, and what they learned.",
        "id": "staff-productivity-q12",
        "question": "Which government customers at our scale have completed a public-records request or a litigation hold involving your product's outputs? What broke?",
        "red_flag": "No customer has ever tested the records path; you would be first.",
        "select": {
          "claim_types": [
            "customer"
          ],
          "finding_ids": [
            "customers"
          ],
          "weight": 3
        },
        "source_url": null
      }
    ],
    "elevated_scrutiny_rules": [
      {
        "action": "Apply the eligibility-case-mgmt overlay.",
        "condition": "The tool will draft or summarize case files that feed benefit decisions"
      },
      {
        "action": "Make the consent and closed-session questions (q05, q06) mandatory; note the Brewer v. Otter.ai litigation.",
        "condition": "A notetaker is pitched for public or board meetings"
      },
      {
        "action": "Treat the cloud-tier question (q07) as pass/fail.",
        "condition": "The workload touches CJIS, FTI, or HIPAA data"
      }
    ],
    "established_vendors": [
      {
        "gov_evidence_url": "https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-licensing-gcc",
        "name": "Microsoft (365 Copilot)",
        "one_liner": "Bundled enterprise copilot; GCC and GCC High tiers map to regulated state data and CJIS-touching workloads.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": "https://www.gsa.gov/about-gsa/newsroom/news-releases/gsa-google-announce-gemini-onegov-agreement-08212025",
        "name": "Google (Gemini for Government / Workspace)",
        "one_liner": "OneGov agreement priced the federal bundle at $0.47 per agency through Sep 30, 2026.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": "https://digitalgovernmenthub.org/library/lessons-from-pennsylvanias-generative-ai-pilot-with-chatgpt/",
        "name": "OpenAI (ChatGPT Enterprise / Gov)",
        "one_liner": "Pennsylvania's ChatGPT Enterprise pilot is the best-documented state deployment in this category.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": null,
        "name": "Anthropic (Claude)",
        "one_liner": "Available to federal agencies through a GSA OneGov agreement; state and local applicability of those terms is uncertain.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": null,
        "name": "Zoom / Otter.ai / Fireflies / Rev / Verbit",
        "one_liner": "Transcription and notetaker standalones, versus the bundled defaults in Teams, Zoom, and Meet. See the consent litigation in failure modes.",
        "tier": "specialist"
      }
    ],
    "failure_modes": [
      {
        "description": "Washington's State Archivist advises that generative-AI outputs used in government work are public records and prompts likely are too, with retention following content and function. MRSC notes Microsoft Copilot's activity history appears non-disableable and recommends contract terms requiring prompt and output export.",
        "named_incident": "MRSC and Washington State Archivist guidance on AI records (Jul 2024)",
        "source_url": "https://mrsc.org/stay-informed/mrsc-insight/july-2024/public-records-and-ai",
        "title": "Public-records and retention gaps"
      },
      {
        "description": "Brewer v. Otter.ai (four consolidated federal cases) alleges bot recording without all-party consent. \"The bot was visible in the meeting\" is not consent in all-party-consent states (CA, FL, IL, MD, MA, MT, NV, NH, PA, WA). Government aggravators: closed and executive sessions, attorney-client communications, HR matters, and juvenile and health information.",
        "named_incident": "Brewer v. Otter.ai consolidated litigation",
        "source_url": "https://natlawreview.com/article/ai-notetaking-tools-under-fire-lessons-otterai-class-action-complaint",
        "title": "Notetaker consent litigation"
      },
      {
        "description": "69% of organizations suspect prohibited generative-AI use (Gartner, 2025). Concrete incident: a New South Wales contractor uploaded 12,000+ rows of flood-victim PII to a public AI tool. A sanctioned tool is part of the defense, but only if its data terms are actually better.",
        "named_incident": "NSW contractor uploaded flood-victim PII to a public AI tool",
        "source_url": "https://www.secondtalent.com/resources/shadow-ai-statistics/",
        "title": "Shadow AI use with real data"
      }
    ],
    "inclusion_test": [
      "Does the pitch offer drafting, summarization, email, or \"productivity\" assistance for staff?",
      "Does it offer meeting recording, transcription, or AI notetaking?",
      "Does it offer internal knowledge search or workflow automation for back-office functions (HR, finance, records)?",
      "Is the user the employee, not the resident?"
    ],
    "incumbent_landscape": "This pack's defining fact: the incumbents are nearly free. Microsoft 365 Copilot reached GCC (Dec 2024) and GCC High (Dec 3, 2025), with a GSA OneGov deal giving Copilot at no added cost for up to 12 months with M365 G5 (https://www.nextgov.com/acquisition/2025/12/microsoft-makes-copilot-available-secure-cloud-customers/409912/). GSA's Gemini OneGov agreement priced the Google bundle at $0.47 per agency through Sep 30, 2026 (https://www.gsa.gov/about-gsa/newsroom/news-releases/gsa-google-announce-gemini-onegov-agreement-08212025), and similar roughly $1 offers exist for ChatGPT and Claude. It is uncertain whether state and local governments can ride OneGov terms (coverage is federal), but the pricing signal shapes the whole market. The best-documented state deployment is Pennsylvania's ChatGPT Enterprise pilot (175 employees, then 3,000+; roughly 95 minutes per day of self-reported time savings; https://digitalgovernmenthub.org/library/lessons-from-pennsylvanias-generative-ai-pilot-with-chatgpt/). Pennsylvania's approved-tool model (ChatGPT Enterprise and Copilot approved centrally, others case by case) is itself a useful triage pattern. Notetakers split between bundled defaults (Teams, Zoom, Meet) and standalones (Otter.ai, Fireflies, Rev, Verbit). The triage question for any startup in this pack: what does this do that the Copilot or Gemini the jurisdiction already (nearly) owns does not, at a price that beats near-zero?",
    "known_gaps": "- Whether state and local governments can use OneGov terms is uncertain;\n  coverage is federal.\n- No citable public-sector incident of copilot permission-sprawl\n  oversharing was found in public sources; the risk is retained as a\n  trigger with that caveat.\n- The reported U.S. House Copilot restriction and California GenAI\n  contract awards were excluded as unverified this cycle.\n- The Gartner shadow-AI figure (69%) is a survey statistic reached\n  through a secondary source.",
    "last_updated": "2026-08-29",
    "legal_context": "- State public-records law: Washington's archivist advice sheets (Jun\n  2024) are the cleanest citable guidance that AI outputs, and likely\n  prompts, are records\n  (https://www.sos.wa.gov/sites/default/files/2025-02/advice-sheet-are-generative-ai-interactions-public-records-(june-2024).pdf).\n- All-party-consent wiretap statutes (CA, FL, IL, MD, MA, MT, NV, NH, PA,\n  WA) govern meeting recording by notetakers.\n- Open-meetings acts govern recording and minutes of public bodies,\n  including closed and executive sessions.\n- New Jersey 25-OIT-001 (2025): sensitive PII only in state-approved AI\n  tools\n  (https://nj.gov/it/docs/ps/25-OIT-001-State-of-New-Jersey-Guidance-on-Responsible-Use-of-Generative-AI.pdf).\n- Pennsylvania's ITP and New York NYS-G25-002 are the state AI-use policy\n  models to check against.\n- Cloud-tier compliance: CJIS, FTI (IRS Pub 1075), and HIPAA workloads\n  must run in the matching government cloud tier (GCC or GCC High, or the\n  equivalent). Commercial-cloud AI on those workloads is a compliance\n  failure regardless of tool quality\n  (https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-licensing-gcc).",
    "pack_id": "staff-productivity",
    "pack_name": "Staff Productivity & Back-Office AI",
    "realistic_pricing": "The incumbent baseline is near zero: OneGov-era deals put Copilot at no\nadded cost for up to 12 months with M365 G5, and the Gemini federal\nbundle at $0.47 per agency through Sep 30, 2026 (federal terms; state and\nlocal applicability is uncertain). Bundled copilots run roughly $0–30 per\nseat per month effective. A standalone tool priced above that baseline\nneeds a named differentiator to justify the difference.",
    "reference_deployments": [
      {
        "agency": "Pennsylvania Office of Administration",
        "metric": "Roughly 95 minutes per day of time savings, self-reported by participants",
        "metric_source_type": "independent-press",
        "source_url": "https://digitalgovernmenthub.org/library/lessons-from-pennsylvanias-generative-ai-pilot-with-chatgpt/",
        "vendor_stack": "OpenAI ChatGPT Enterprise",
        "what": "Statewide productivity pilot, 175 employees expanding to 3,000+"
      },
      {
        "agency": "Pennsylvania (document intake)",
        "metric": "80% reduction in illegible submissions; 700+ staff hours saved (per Code for America's landscape assessment)",
        "metric_source_type": "independent-press",
        "source_url": "https://codeforamerica.org/news/code-for-america-unveils-second-annual-government-ai-landscape-assessment/",
        "vendor_stack": "Document legibility scanning",
        "what": "Cutting illegible submissions at intake"
      },
      {
        "agency": "North Carolina",
        "metric": "Documented as a staff-facing use in Code for America's landscape assessment",
        "metric_source_type": "independent-press",
        "source_url": "https://codeforamerica.org/explore/government-ai-landscape-assessment/",
        "vendor_stack": "Staff summarization tooling",
        "what": "Staff-facing summarization"
      },
      {
        "agency": "Federal agencies (context for the market)",
        "metric": "GCC High availability (Dec 3, 2025) plus a OneGov no-added-cost window",
        "metric_source_type": "independent-press",
        "source_url": "https://www.nextgov.com/acquisition/2025/12/microsoft-makes-copilot-available-secure-cloud-customers/409912/",
        "vendor_stack": "Microsoft 365 Copilot in GCC High",
        "what": "Availability milestone shaping state expectations"
      },
      {
        "agency": "New Jersey",
        "metric": "Published state guidance (25-OIT-001)",
        "metric_source_type": "government-page",
        "source_url": "https://nj.gov/it/docs/ps/25-OIT-001-State-of-New-Jersey-Guidance-on-Responsible-Use-of-Generative-AI.pdf",
        "vendor_stack": "State-approved AI assistant model",
        "what": "Statewide policy: sensitive PII only in state-approved AI tools"
      }
    ],
    "refresh_cadence": "quarterly",
    "registries_to_check": [
      {
        "name": "FedRAMP Marketplace",
        "url": "https://marketplace.fedramp.gov/",
        "what_it_proves": "Whether this specific product holds a federal cloud authorization, and at what level."
      },
      {
        "name": "GovRAMP Authorized Product List",
        "url": "https://govramp.org/",
        "what_it_proves": "State-oriented cloud security verification. Formerly StateRAMP; the name changed in February 2025."
      }
    ],
    "scrutiny_tier": "standard",
    "signal_lexicon": [
      "copilot",
      "meeting transcription",
      "meeting notes",
      "notetaker",
      "drafting assistant",
      "writing assistant",
      "internal search",
      "enterprise search",
      "knowledge management",
      "email drafting",
      "workflow automation",
      "staff productivity"
    ],
    "skepticism_triggers": [
      {
        "claim_pattern": "A pitch that does not name what it beats in the near-free incumbent",
        "source_url": "https://www.nextgov.com/acquisition/2025/12/microsoft-makes-copilot-available-secure-cloud-customers/409912/",
        "threshold": "No named differentiator versus Copilot or Gemini",
        "why": "The beat-the-incumbent question is q01, and an unanswered q01 means the pitch fails triage."
      },
      {
        "claim_pattern": "Self-reported time savings presented as measured ROI",
        "source_url": "https://digitalgovernmenthub.org/library/lessons-from-pennsylvanias-generative-ai-pilot-with-chatgpt/",
        "threshold": "Any productivity statistic without a methodology",
        "why": "Pennsylvania's widely quoted 95 minutes per day is participant-self-reported, not independently measured."
      },
      {
        "claim_pattern": "\"FOIA-proof\" or \"records-exempt\" claims",
        "source_url": "https://mrsc.org/stay-informed/mrsc-insight/july-2024/public-records-and-ai",
        "threshold": "Any such claim",
        "why": "Content and function govern record status. No tool makes records exempt."
      },
      {
        "claim_pattern": "A notetaker with no affirmative-consent mechanism",
        "source_url": "https://natlawreview.com/article/ai-notetaking-tools-under-fire-lessons-otterai-class-action-complaint",
        "threshold": "Consent inferred from bot visibility alone",
        "why": "The Brewer litigation tests exactly that theory, and all-party-consent states require more."
      },
      {
        "claim_pattern": "No verifiable deletion or export path",
        "source_url": "https://mrsc.org/stay-informed/mrsc-insight/july-2024/public-records-and-ai",
        "threshold": "Absence of either",
        "why": "A public-records and offboarding non-starter."
      },
      {
        "claim_pattern": "Per-seat pricing above the incumbent bundle without a named differentiator",
        "source_url": "https://www.gsa.gov/about-gsa/newsroom/news-releases/gsa-google-announce-gemini-onegov-agreement-08212025",
        "threshold": "Above the roughly $0–30 per seat effective incumbent baseline",
        "why": "The incumbent baseline is near zero in the OneGov era. Price above it needs a reason."
      },
      {
        "claim_pattern": "\"It respects your existing permissions\" offered as the whole security story",
        "source_url": null,
        "threshold": "Any pitch treating current file permissions as sufficient preparation",
        "why": "Copilots surface everything a user technically can access, so permission sprawl becomes visible on day one. This is an agency readiness issue the pitch should acknowledge. We could not find a citable public-sector incident in public sources yet."
      }
    ]
  },
  "tax-revenue": {
    "definition": "AI sold to tax assessors, collectors, treasurers, and revenue departments: mass-appraisal and automated valuation models, reassessment support, appeals triage, exemption auditing, collections prioritization, delinquency prediction, refund and return screening, audit selection, and taxpayer-facing chatbots. Outputs here change what residents owe, whether a refund arrives, and whether a lien or garnishment follows, so most of this pack is adverse-action territory. Not this pack alone: benefits eligibility and program-integrity systems (eligibility-case-mgmt, which this pack triggers as an overlay for any fraud or refund screening pitch), pure document extraction (document-processing), and general-purpose dashboards (data-analytics).",
    "diligence_questions": [
      {
        "good_answer": "An unambiguous \"a named human makes every adverse decision,\" with UI evidence showing where the human acts and what they see.",
        "id": "tax-revenue-q01",
        "question": "Does your system ever finalize an assessed value, deny a refund, file a lien, garnish wages, remove an exemption, or flag a taxpayer for fraud on its own, or does a named human make every adverse decision?",
        "red_flag": "\"Configurable,\" \"auto-finalize,\" \"straight-through processing,\" or any hedging. This question has no acceptable middle answer.",
        "select": {
          "base": true,
          "elevated": true,
          "weight": 10
        },
        "source_url": "https://www.michigan.gov/ag/news/press-releases/2022/10/20/som-settlement-of-civil-rights-class-action-alleging-false-accusations-of-unemployment-fraud"
      },
      {
        "good_answer": "A measured false-positive rate with a denominator and time-to-release data for flagged refunds, or an honest \"we have not measured that.\"",
        "id": "tax-revenue-q02",
        "question": "For fraud, refund, or audit screening: what is your false-positive rate at our volumes and our fraud prevalence, how was it measured, and what happens to a taxpayer's money while they are flagged?",
        "red_flag": "An accuracy percentage with no false-positive rate. The IRS's own filters ran 81% false positives in 2018; a vendor who has not measured theirs has not confronted the base-rate problem.",
        "select": {
          "base": true,
          "claim_types": [
            "performance"
          ],
          "weight": 9
        },
        "source_url": "https://www.taxpayeradvocate.irs.gov/wp-content/uploads/2020/07/ARC18_Volume1_MSP_05_FalsePositiveRates.pdf"
      },
      {
        "good_answer": "IAAO-standard statistics broken out by tier and geography, plus a yes on the independent pre-deployment study.",
        "id": "tax-revenue-q03",
        "question": "For valuation models: show ratio-study results (COD, PRD or PRB) by neighborhood and price tier from a jurisdiction like ours, and will you support an independent ratio study on our parcels before any value you produce reaches a tax bill?",
        "red_flag": "County-wide averages only, or no ratio statistics at all. Cook County's $2.2 billion shift hid inside averages.",
        "select": {
          "base": true,
          "claim_types": [
            "performance"
          ],
          "weight": 9
        },
        "source_url": "https://www.iaao.org/wp-content/uploads/Standard_on_Ratio_Studies.pdf"
      },
      {
        "good_answer": "A written commitment that model factors, inputs, and the specific basis for the individual decision are disclosable, with an example appeal packet. Cook County publishes its whole model; that is the benchmark.",
        "id": "tax-revenue-q04",
        "question": "When a resident appeals a value or contests a flag, exactly what will you disclose about how the number was produced, to us, to the appellant, and in a public-records request? Is anything withheld as a trade secret?",
        "red_flag": "Any trade-secret carve-out over decision logic. Courts struck down SyRI for opacity, and secret formulas do not survive appeals.",
        "select": {
          "base": true,
          "elevated": true,
          "weight": 9
        },
        "source_url": "https://github.com/ccao-data/model-res-avm"
      },
      {
        "good_answer": "A complete input list, an explanation of proxy handling, and shareable disparate-performance results, plus support for our own testing. The Dutch tax authority scored nationality; that is the failure to rule out.",
        "id": "tax-revenue-q05",
        "question": "What data sources feed your model, and which resident characteristics, or stand-ins for them like neighborhood, are used as inputs? What testing exists for uneven error rates across price tiers, neighborhoods, and, where lawful, race and ethnicity?",
        "red_flag": "\"Our AI is bias-free\" with no data, or refusal to enumerate inputs.",
        "select": {
          "elevated": true,
          "weight": 8
        },
        "source_url": "https://www.amnesty.org/en/documents/eur35/4686/2021/en/"
      },
      {
        "good_answer": "A documented notice-and-cure workflow with real timelines, plain language templates, and a no-cost correction path, shown in the product.",
        "id": "tax-revenue-q06",
        "question": "Before any lien, exemption removal, or assessment increase your system drives, what notice does the resident get, in what languages, and how do they fix an error without hiring a lawyer or an appraiser?",
        "red_flag": "Notice happens \"through your existing process\" with no vendor support, or cure requires a formal appeal for every error.",
        "select": {
          "base": true,
          "weight": 8
        },
        "source_url": null
      },
      {
        "good_answer": "Flat or volume-based pricing with a published schedule, and a clear no on contingency fees for adverse actions.",
        "id": "tax-revenue-q07",
        "question": "How are you paid? Is any part of your fee contingent on added assessed value, removed exemptions, denied refunds, or collected debt, and will you show us the full fee schedule?",
        "red_flag": "Percentage-of-recovery pricing. It pays the vendor to over-flag and leaves residents carrying the appeal burden for every error.",
        "select": {
          "claim_types": [
            "pricing"
          ],
          "weight": 7
        },
        "source_url": null
      },
      {
        "good_answer": "Named production references with callable contacts, plus any independent evaluation or oversight review.",
        "id": "tax-revenue-q08",
        "question": "Name three tax or revenue agencies of our size where this is in production rather than a pilot, that we can call. What independent evaluations of the product exist?",
        "red_flag": "Logo walls, pilots presented as production, or \"references under NDA.\" EPIC could not verify one major vendor's claimed footprint even through public-records requests.",
        "select": {
          "claim_types": [
            "customer",
            "identity"
          ],
          "finding_ids": [
            "customers"
          ],
          "weight": 7
        },
        "source_url": "https://epic.org/pondera-surveillance/"
      },
      {
        "good_answer": "Written no-training terms, a Pub 1075 answer that names controls and audits, and authorizations you can verify at https://marketplace.fedramp.gov/ and https://govramp.org/. \"In process\" is not \"authorized.\"",
        "id": "tax-revenue-q09",
        "question": "Where does taxpayer data live, who can see it, and is any of it used to train models or shared with affiliates? If the system touches federal tax information, how do you meet IRS Publication 1075, and which of FedRAMP, GovRAMP, or a state RAMP authorization do you actually hold?",
        "red_flag": "\"Compliant\" phrasing, verbal assurances, or a vendor who has never heard of Pub 1075 asking for return data.",
        "select": {
          "claim_types": [
            "compliance"
          ],
          "finding_ids": [
            "fedramp_marketplace",
            "govramp",
            "txramp",
            "cert-vocab"
          ],
          "weight": 8
        },
        "source_url": "https://www.irs.gov/pub/irs-pdf/p1075.pdf"
      },
      {
        "good_answer": "State-specific evaluation results with a defined denominator, or an honest \"we have not measured that yet.\"",
        "id": "tax-revenue-q10",
        "question": "What is your measured accuracy on OUR state's tax rules and forms, evaluated against our statutes and historically adjudicated appeals or audits, and what is the denominator?",
        "red_flag": "A generic number from another state or a demo corpus. Tax rules, exemption criteria, and assessment cycles differ by state; accuracy does not transfer.",
        "select": {
          "claim_types": [
            "performance"
          ],
          "finding_ids": [
            "perf-*"
          ],
          "weight": 7
        },
        "source_url": null
      },
      {
        "good_answer": "Real numbers: plausible per-item review time and a nonzero override rate from a named deployment.",
        "id": "tax-revenue-q11",
        "question": "What is the realistic review burden for our staff: items per reviewer per day, and what override rates do you see in production?",
        "red_flag": "No override data, or flag volumes that make genuine review impossible. Near-zero overrides means the human is a rubber stamp, which is how MiDAS-scale harm happens under a nominal review layer.",
        "select": {
          "elevated": true,
          "weight": 7
        },
        "source_url": "https://www.btah.org/case-study/michigan-unemployment-insurance-false-fraud-determinations.html"
      },
      {
        "good_answer": "A concrete plan: affected-record queries, correction and refund workflows, notification templates, and committed timelines. Detroit shows what unremediated assessment error costs residents.",
        "id": "tax-revenue-q12",
        "question": "If we discover a systematic error, wrong values in one neighborhood, a filter flagging a group of taxpayers, how fast can you identify every affected parcel or account, and how do you support corrected notices, refunds, and interest?",
        "red_flag": "No answer here means no deployment. \"That would be a change order\" is a no.",
        "select": {
          "elevated": true,
          "tiers": [
            3,
            4
          ],
          "weight": 8
        },
        "source_url": "https://crcmich.org/understanding-how-detroits-property-tax-assessment-process-contributed-to-the-600-million-over-assessment"
      },
      {
        "good_answer": "Contractual acceptance of indemnification and audit rights, in writing.",
        "id": "tax-revenue-q13",
        "question": "Who bears the cost when a system error produces a wrongful lien, denied refund, or inflated bill, and will you accept indemnification and audit-rights clauses in the contract?",
        "red_flag": "Liability pushed entirely onto the agency. Vendor accountability was contested all the way through the MiDAS litigation; settle it in the contract rather than in court.",
        "select": {
          "tiers": [
            3,
            4
          ],
          "weight": 7
        },
        "source_url": "https://www.btah.org/case-study/michigan-unemployment-insurance-false-fraud-determinations.html"
      },
      {
        "good_answer": "Retrieval grounded in your published sources with citations shown to the user, a measured accuracy number on a tax-question test set, an escalation path to staff, and a same-week correction process.",
        "id": "tax-revenue-q14",
        "question": "For taxpayer chatbots: how is every answer grounded in our current statutes, forms, and deadlines; how do you measure answer accuracy; and what is the correction pipeline when it gets one wrong?",
        "red_flag": "\"It's trained on tax data\" with no grounding, no measurement, and no correction pipeline. NYC's chatbot invented rules on an official channel.",
        "select": {
          "tiers": [
            3,
            4
          ],
          "weight": 6
        },
        "source_url": "https://themarkup.org/artificial-intelligence/2024/03/29/nycs-ai-chatbot-tells-businesses-to-break-the-law"
      },
      {
        "good_answer": "A named update process with turnaround commitments and regression testing against prior-year outcomes.",
        "id": "tax-revenue-q15",
        "question": "Who updates the system when our statutes, rates, exemption criteria, or assessment calendar change, how fast, and how is each change tested before it touches values or bills?",
        "red_flag": "No update pipeline, or updates only at annual release. Tax law changes mid-cycle; a model scoring against last year's rules produces wrong bills quietly.",
        "select": {
          "tiers": [
            3,
            4
          ],
          "weight": 6
        },
        "source_url": null
      }
    ],
    "elevated_scrutiny_rules": [
      {
        "action": "The output floor is the \"enhanced review\" band. The \"established vendor, proceed to demo\" band is unavailable until the human-decides-adverse-actions question (q01) is answered.",
        "condition": "Any match on this pack"
      },
      {
        "action": "Classify as an adverse-action system regardless of framing, and trigger the eligibility-case-mgmt overlay: prepend its \"Why this category is different\" block and add its q01, q02, q03, and q12. MiDAS and the Dutch childcare scandal were both revenue-side systems.",
        "condition": "A fraud-detection, refund-screening, audit-selection, or delinquency-scoring pitch"
      },
      {
        "action": "Strongest caution band, always.",
        "condition": "A claim of automated liens, garnishments, offsets, exemption removals, or assessment finalization"
      },
      {
        "action": "Raise to enhanced review and require q03 and q04 answers before any demo-stage evaluation; regressivity is invisible in averages.",
        "condition": "A valuation-model pitch with no ratio-study statistics by price tier"
      },
      {
        "action": "May be evaluated on standard merits, with q01, q04, q14, and q15 still included.",
        "condition": "A taxpayer chatbot or staff copilot with a named human making every decision and no adverse-action output"
      }
    ],
    "established_vendors": [
      {
        "gov_evidence_url": "https://www.govtech.com/computing/tax-system-upgrades-increase-speed-efficiency-for-residents",
        "name": "Fast Enterprises",
        "one_liner": "GenTax integrated tax system, in production in Wisconsin, New Hampshire, and Idaho (Government Technology) and Indiana ($77.7M contract, 2018, IBJ). Sued alongside SAS in the MiDAS-era Cahoo litigation; a listing here is no safety signal.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": "https://www.prnewswire.com/news-releases/revenue-solutions-inc-and-the-state-of-rhode-island-division-of-taxation-partner-to-implement-a-commercial-off-the-shelf-cots-integrated-tax-system-its-220379091.html",
        "name": "RSI (Revenue Solutions, Inc.)",
        "one_liner": "Government Premier (formerly Revenue Premier) integrated tax platform; state contracts include Rhode Island's integrated tax system.",
        "tier": "platform"
      },
      {
        "gov_evidence_url": null,
        "name": "Tyler Technologies",
        "one_liner": "iasWorld / Enterprise Assessment & Tax, the largest CAMA and appraisal-tax suite; conducted Delaware's court-ordered statewide reassessment (Businesswire, Oct 21, 2021).",
        "tier": "platform"
      },
      {
        "gov_evidence_url": "https://epic.org/pondera-surveillance/",
        "name": "Thomson Reuters (Pondera)",
        "one_liner": "FraudCaster risk scoring for tax and benefits programs, acquired 2020. EPIC found the true scope of its government use hard to verify through public-records requests; treat any scoring pitch as an adverse-action system.",
        "tier": "specialist"
      },
      {
        "gov_evidence_url": "https://www.btah.org/case-study/michigan-unemployment-insurance-false-fraud-determinations.html",
        "name": "SAS",
        "one_liner": "Analytics platform sold to revenue and integrity programs; a MiDAS-era vendor sued in the Cahoo litigation (see BTAH case study).",
        "tier": "platform"
      },
      {
        "gov_evidence_url": "https://www.govtech.com/biz/Startup-Aims-to-Modernize-the-Property-Tax-Exemption-Audit.html",
        "name": "TrueRoll",
        "one_liner": "Homestead-exemption monitoring for county tax offices; customers in Texas, Florida, Illinois, and Washington (Government Technology, Jun 2020). Vendor-reported footprint claims are larger; verify.",
        "tier": "startup-verified"
      }
    ],
    "failure_modes": [
      {
        "description": "The Chicago Tribune and ProPublica Illinois \"Tax Divide\" investigation, with a University of Chicago study, found Cook County's residential assessments overvalued low-priced homes and undervalued high-priced ones, shifting at least $2.2 billion in property taxes onto lower-value homeowners between 2011 and 2015. The assessor's office was not running the standard statistical checks that would have caught it. Any vendor valuation model can reproduce this failure if nobody checks ratio statistics by price tier.",
        "named_incident": "Cook County \"Tax Divide\" investigation; $2.2 billion property tax shift, 2011-2015 (Pulitzer finalist, 2018)",
        "source_url": "https://www.propublica.org/article/cook-county-property-tax-shift-regressive-assessments",
        "title": "Regressive mass appraisal that shifted the tax burden (Cook County)"
      },
      {
        "description": "A 2020 Detroit News investigation found Detroit overtaxed homeowners by at least $600 million between roughly 2010 and 2016, assessing many properties far above Michigan's constitutional cap of 50 percent of market value. The Citizens Research Council's 2021 analysis ties the failure to mass-appraisal practice: values were not brought down as the market fell, and the lowest-value homes bore the worst errors, feeding tax foreclosures. Assessment error at this scale takes homes.",
        "named_incident": "Detroit $600 million over-assessment, 2010-2016 (Detroit News, Jan 2020; CRC of Michigan analysis, Nov 2021)",
        "source_url": "https://crcmich.org/understanding-how-detroits-property-tax-assessment-process-contributed-to-the-600-million-over-assessment",
        "title": "Over-assessment at scale with foreclosure consequences (Detroit)"
      },
      {
        "description": "Michigan's MiDAS system auto-adjudicated unemployment-insurance fraud with no human review. A state review found its determinations were wrong more than 90 percent of the time; roughly 40,000 people were accused, with garnishments and bankruptcies that followed, and the state paid a $20 million settlement in 2022. The vendors, SAS and Fast Enterprises, were sued alongside the state in the Cahoo litigation (https://www.btah.org/case-study/michigan-unemployment-insurance-false-fraud-determinations.html). MiDAS is the canonical revenue-side automation failure.",
        "named_incident": "Michigan MiDAS false fraud determinations; $20M civil-rights settlement (2022)",
        "source_url": "https://www.michigan.gov/ag/news/press-releases/2022/10/20/som-settlement-of-civil-rights-class-action-alleging-false-accusations-of-unemployment-fraud",
        "title": "Automated fraud adjudication without human review (Michigan MiDAS)"
      },
      {
        "description": "The National Taxpayer Advocate's 2018 Annual Report to Congress found the false-positive rate of the IRS's non-identity-theft refund fraud filters was 81 percent (63 percent for identity-theft filters) between January and October 2018. The filters protected about $7.6 billion in revenue while delaying almost $20 billion in legitimate refunds. This is the base-rate problem every refund-screening pitch must answer: at low fraud prevalence, even a good model flags mostly innocent people.",
        "named_incident": "IRS refund fraud filters, 81% false-positive rate (National Taxpayer Advocate, 2018 Annual Report, MSP #5)",
        "source_url": "https://www.taxpayeradvocate.irs.gov/wp-content/uploads/2020/07/ARC18_Volume1_MSP_05_FalsePositiveRates.pdf",
        "title": "Refund screening that flags mostly legitimate taxpayers (IRS)"
      },
      {
        "description": "The Dutch tax administration's risk-classification model for childcare benefit claims used nationality as a risk factor. Tens of thousands of parents were wrongly accused of fraud and ordered to repay large sums; families went bankrupt and the Dutch cabinet resigned over the scandal in January 2021. Amnesty International's \"Xenophobic Machines\" report (Oct 25, 2021) documents the model's design and the discrimination that resulted.",
        "named_incident": "Dutch childcare benefits scandal (toeslagenaffaire); cabinet resignation, Jan 2021",
        "source_url": "https://www.amnesty.org/en/documents/eur35/4686/2021/en/",
        "title": "A tax authority's risk model that scored nationality (Netherlands)"
      },
      {
        "description": "The District Court of The Hague ruled on February 5, 2020 that the Netherlands' SyRI system, which combined agency data to flag people for benefits and tax fraud risk, violated Article 8 of the European Convention on Human Rights. The court's core findings were opacity (no insight into the risk indicators or model) and disproportionate data collection. It is the clearest judicial statement that secret government risk scoring fails legal scrutiny.",
        "named_incident": "NJCM et al. v. the Netherlands (SyRI), Hague District Court, Feb 5, 2020",
        "source_url": "https://www.escr-net.org/caselaw/2020/nederlands-juristen-comite-voor-mensenrechten-et-al-v-netherlands-eclinlrbdha20201878/",
        "title": "Opaque cross-agency risk profiling struck down in court (SyRI)"
      },
      {
        "description": "Australia's Robodebt scheme used automated income averaging to raise unlawful welfare debts at national scale; the class-action settlement was valued at about A$1.8 billion, covering roughly 430,000 wrongly raised debts, and a 2023 Royal Commission found the scheme neither fair nor legal. It is the collections-side cautionary case: an automated formula generated debts, the burden of disproof fell on residents, and the human review layer never really existed.",
        "named_incident": "Australia Robodebt Royal Commission (2023)",
        "source_url": "https://clcs.org.au/robodebt-royal-commission-report-unravels-systemic-injustice-and-recommends-urgent-reform/",
        "title": "Automated debt raising at national scale (Robodebt)"
      },
      {
        "description": "NYC's MyCity chatbot, an official city channel for business owners, confidently invented rules and told users to break the law (The Markup, Mar 29, 2024). A taxpayer chatbot that misstates a filing deadline or a penalty rule creates real liabilities for residents who reasonably relied on an official government answer.",
        "named_incident": "NYC MyCity chatbot (The Markup, Mar 29, 2024)",
        "source_url": "https://themarkup.org/artificial-intelligence/2024/03/29/nycs-ai-chatbot-tells-businesses-to-break-the-law",
        "title": "An official chatbot that invented the rules (NYC MyCity)"
      },
      {
        "description": "Near-term patterns specific to language models in revenue offices: a generated paragraph is not a legally sufficient assessment notice or deficiency explanation; automation bias turns \"an appraiser reviews every value\" into rubber-stamping at Detroit scale; extraction errors from deeds, renditions, and returns propagate silently into values and bills; and models are sycophantic toward an auditor's hypothesis about a taxpayer. The IRS's own rules-plus-models screening history (NTA 2018) shows how layered filters compound false positives.",
        "named_incident": "IRS DDb/RRP layered screening, 81% false-positive rate (NTA 2018 Annual Report, MSP #5)",
        "source_url": "https://www.taxpayeradvocate.irs.gov/wp-content/uploads/2020/07/ARC18_Volume1_MSP_05_FalsePositiveRates.pdf",
        "title": "LLM-specific failure patterns in tax work"
      }
    ],
    "inclusion_test": [
      "Does the pitch mention property assessment, mass appraisal, CAMA, automated valuation models, or reassessment for an assessor or appraisal district?",
      "Does it mention tax collections, delinquency prediction, revenue recovery, payment-plan targeting, or lien and garnishment workflows?",
      "Does it mention refund screening, return scoring, audit selection, or fraud detection for a tax or revenue agency?",
      "Does it mention exemption auditing (homestead, senior, veteran) or appeals triage for a tax office?",
      "Does it offer a taxpayer-facing chatbot or virtual assistant for a revenue department, collector, or treasurer?"
    ],
    "incumbent_landscape": "The core systems are decades-old COTS suites. Fast Enterprises' GenTax runs state integrated tax systems in Wisconsin, New Hampshire, Idaho, and other states (Government Technology: https://www.govtech.com/computing/tax-system-upgrades-increase-speed-efficiency-for-residents); Indiana signed a 10-year, $77.7 million GenTax contract in 2018 (Indianapolis Business Journal). RSI's Government Premier (formerly Revenue Premier) holds state integrated-tax contracts, including Rhode Island's. On the property side, Tyler Technologies' iasWorld / Enterprise Assessment & Tax is the largest CAMA and tax-billing suite (clients in 26 states per Tyler's own materials; Tyler also ran Delaware's court-ordered statewide reassessment, Businesswire, Oct 21, 2021). Fraud-analytics is a distinct lane: Thomson Reuters acquired Pondera (FraudCaster) in 2020, and EPIC's public-records project found the actual scope of Pondera's government footprint hard to establish even through records requests (https://epic.org/pondera-surveillance/). SAS and Fast Enterprises were the MiDAS-era vendors and were sued alongside the state in the Cahoo litigation, so incumbency is no safety signal here. The AI-native newcomers sell narrow wedges: TrueRoll monitors homestead-exemption eligibility for county tax offices (customers in Texas, Florida, Illinois, and Washington, per Government Technology). Critical context for any transparency claim: Cook County's assessor has published its residential valuation model code and data since 2019 (https://github.com/ccao-data/model-res-avm), which means \"our model must stay secret\" is a vendor choice, and the public sector's own benchmark says otherwise. Expect general-purpose LLM chatbots rebranded as \"taxpayer assistants\" to arrive through the same channel as every other sector.",
    "known_gaps": "- The City of Detroit's own memo confirming the $600M over-taxation\n  (detroitmi.gov) is bot-blocked to automated fetches (HTTP 403); the\n  figure is carried on the Citizens Research Council analysis instead.\n  Re-verify the primary memo manually next cycle.\n- The Library of Congress summary of the SyRI ruling returns 403 to\n  automated fetches; the ESCR-Net case page is used instead.\n- Tyler Technologies' Delaware statewide reassessment (Businesswire, Oct\n  21, 2021) could not be re-fetched (403); the citation is retained by\n  outlet and date, and the contract value was not verified. Tyler's\n  \"clients in 26 states\" figure comes from Tyler's own product page and\n  is not independently verified.\n- TrueRoll's 2026 claim of \"150+ government offices in 10+ states\" is\n  vendor-reported (Apr 2026 press release) and was not independently\n  verified; the pack carries only the 2020 Government Technology\n  reporting.\n- The current production scope of Thomson Reuters Pondera in state tax\n  agencies specifically (as opposed to unemployment and benefits\n  programs) could not be established; EPIC's records project is cited\n  for the opacity itself.\n- Cahoo vendor claims had mixed outcomes: the district court granted\n  SAS Institute's motion to dismiss (2018), and the 2023 Sixth Circuit\n  opinion notes claims against two private defendants were then still\n  pending. The pack therefore says the vendors were \"sued,\" and does not\n  claim liability was established. Verify final disposition next cycle.\n- No public price anchor was captured for county CAMA contracts or\n  AI bolt-on subscriptions; those lines are labeled practitioner\n  estimates.\n- Colorado AI Act and Texas TRAIGA status not re-verified beyond the\n  eligibility pack's Aug 2026 review; verify before citing.\n- Robodebt totals vary by source (A$1.73-1.76B raised; 433,000-526,000\n  people depending on counting method); the pack carries only the\n  settlement-anchored figures (about A$1.8 billion, roughly 430,000\n  debts) that its cited source and the class-action record support.\n- An RSI Pennsylvania desk-enforcement contract claim was cut in\n  verification: no public source found. Only Rhode Island is carried.",
    "last_updated": "2026-08-29",
    "legal_context": "- 26 U.S.C. 6103 (current): tax returns and return information are\n  confidential, with penalties for unauthorized disclosure. Any vendor\n  architecture that moves return data must be evaluated against it\n  (https://www.law.cornell.edu/uscode/text/26/6103).\n- IRS Publication 1075 (current edition): safeguarding requirements for\n  federal tax information held by state and local agencies and their\n  contractors, including cloud and contractor-access rules\n  (https://www.irs.gov/pub/irs-pdf/p1075.pdf).\n- IAAO Standard on Ratio Studies: the professional standard for\n  assessment level and uniformity statistics (COD, PRD, PRB). Many\n  states embed these thresholds in equalization law; a valuation model\n  that cannot produce them cannot show it treats price tiers evenly\n  (https://www.iaao.org/wp-content/uploads/Standard_on_Ratio_Studies.pdf).\n- State constitutional and statutory assessment limits: Michigan's\n  constitution caps assessments at 50 percent of market value, the cap\n  Detroit's 2010-2016 assessments exceeded (CRC of Michigan, Nov 2021:\n  https://crcmich.org/understanding-how-detroits-property-tax-assessment-process-contributed-to-the-600-million-over-assessment).\n  Check your own state's uniformity clause and appeal deadlines.\n- Michigan MiDAS settlement (Oct 2022) and the Cahoo litigation:\n  automated adverse determinations without meaningful review produced a\n  $20M settlement, and the MiDAS contractors were sued alongside the\n  state\n  (https://www.btah.org/case-study/michigan-unemployment-insurance-false-fraud-determinations.html).\n- NJCM v. the Netherlands (SyRI), Hague District Court, Feb 5, 2020:\n  opaque government risk profiling for benefits and tax enforcement\n  violated ECHR Article 8\n  (https://www.escr-net.org/caselaw/2020/nederlands-juristen-comite-voor-mensenrechten-et-al-v-netherlands-eclinlrbdha20201878/).\n- OMB M-25-21 (2025): fraud detection and adjudication uses of AI are\n  presumptively high-impact for federal agencies, requiring testing,\n  human oversight, and remedies; a useful bar to hold state-level\n  vendors to\n  (https://www.whitehouse.gov/wp-content/uploads/2025/02/M-25-21-Accelerating-Federal-Use-of-AI-through-Innovation-Governance-and-Public-Trust.pdf).\n- Taxpayer Bill of Rights, IRC 7803(a)(3): the right to be informed, to\n  quality service, and to a fair and just tax system framed the National\n  Taxpayer Advocate's false-positive findings; state taxpayer-rights\n  statutes commonly mirror it.\n- Colorado AI Act (delayed to Jun 30, 2026) and Texas TRAIGA (effective\n  Jan 1, 2026) reach consequential government decisions. Verify current\n  status before citing.",
    "pack_id": "tax-revenue",
    "pack_name": "Tax, Assessment & Revenue AI",
    "realistic_pricing": "Published anchors are thin in this category; treat labeled items as\npractitioner estimates rather than quotes.\n\n- Statewide integrated tax systems are eight-figure, multi-year\n  programs: Indiana signed a 10-year, $77.7 million contract with Fast\n  Enterprises in 2018 (Indianapolis Business Journal:\n  https://www.ibj.com/articles/70354-state-signs-77m-contract-to-upgrade-tax-administration-technology).\n  An \"AI module\" quoted anywhere near ITS scale for a bolt-on tool\n  deserves the question \"what exactly are we buying?\"\n- County CAMA replacements and reassessment services typically run six\n  to seven figures depending on parcel count (practitioner estimate; no\n  reliable public anchor captured this cycle).\n- Narrow AI wedges (exemption monitoring, scoring add-ons) are rarely\n  priced publicly; comparable SaaS runs five to low six figures per\n  year at county scale (practitioner estimate). Decline\n  percentage-of-recovery structures regardless of the sticker price;\n  the incentive problem is the cost.\n- Any pricing conversation for fraud, refund, or delinquency scoring is\n  premature until questions q01, q02, and q04 pass.",
    "reference_deployments": [
      {
        "agency": "Cook County Assessor's Office (IL)",
        "metric": "Model code and data public since 2019",
        "metric_source_type": "government-page",
        "source_url": "https://github.com/ccao-data/model-res-avm",
        "vendor_stack": "In-house open-source residential AVM (ccao-data)",
        "what": "Publishes its residential valuation model code and data publicly; initial assessed values generated by a documented, replicable model"
      },
      {
        "agency": "Wisconsin Department of Revenue",
        "metric": "Averages 1 million transactions per day across about 100 tax account types, as reported by Government Technology",
        "metric_source_type": "independent-press",
        "source_url": "https://www.govtech.com/computing/tax-system-upgrades-increase-speed-efficiency-for-residents",
        "vendor_stack": "Fast Enterprises GenTax",
        "what": "Integrated tax system consolidating 35+ legacy systems"
      },
      {
        "agency": "Indiana Department of Revenue",
        "metric": "$77.7 million, 10-year contract signed 2018 (Indianapolis Business Journal)",
        "metric_source_type": "independent-press",
        "source_url": "https://www.ibj.com/articles/70354-state-signs-77m-contract-to-upgrade-tax-administration-technology",
        "vendor_stack": "Fast Enterprises",
        "what": "Statewide tax administration modernization"
      },
      {
        "agency": "St. Johns County, FL (exemption audits; note the flag-to-collection gap)",
        "metric": "Phase one: questionnaires to 5,500 properties, almost $800K in liens placed, just over $200K collected (Government Technology, Jun 2020)",
        "metric_source_type": "independent-press",
        "source_url": "https://www.govtech.com/biz/Startup-Aims-to-Modernize-the-Property-Tax-Exemption-Audit.html",
        "vendor_stack": "TrueRoll",
        "what": "Machine-learning homestead-exemption eligibility monitoring"
      },
      {
        "agency": "Michigan UIA (cautionary: MiDAS)",
        "metric": "Roughly 40,000 people accused; $20M settlement (Michigan AG, Oct 2022)",
        "metric_source_type": "oversight",
        "source_url": "https://www.michigan.gov/ag/news/press-releases/2022/10/20/som-settlement-of-civil-rights-class-action-alleging-false-accusations-of-unemployment-fraud",
        "vendor_stack": "MiDAS-era stack (SAS, Fast Enterprises)",
        "what": "Auto-adjudicated unemployment fraud determinations, later found wrong more than 90% of the time"
      }
    ],
    "refresh_cadence": "quarterly",
    "registries_to_check": [
      {
        "name": "FedRAMP Marketplace",
        "url": "https://marketplace.fedramp.gov/",
        "what_it_proves": "Whether this specific product holds a federal cloud authorization, and at what level. \"In process\" is not \"authorized.\""
      },
      {
        "name": "GovRAMP Authorized Product List",
        "url": "https://govramp.org/",
        "what_it_proves": "State-oriented cloud security verification. Formerly StateRAMP; the name changed in February 2025."
      },
      {
        "name": "AI Incident Database",
        "url": "https://incidentdatabase.ai/",
        "what_it_proves": "A public log of AI system failures. Search the vendor and product name."
      },
      {
        "name": "Benefits Tech Advocacy Hub case library",
        "url": "https://www.btah.org/case-studies.html",
        "what_it_proves": "A negative registry of documented harms from automated government systems, including the MiDAS record that anchors this pack."
      },
      {
        "name": "Cook County Assessor open model repositories",
        "url": "https://github.com/ccao-data",
        "what_it_proves": "What full valuation-model transparency looks like in production government use. A useful benchmark against any \"must stay proprietary\" claim."
      },
      {
        "name": "IAAO Standard on Ratio Studies",
        "url": "https://www.iaao.org/wp-content/uploads/Standard_on_Ratio_Studies.pdf",
        "what_it_proves": "The professional standard for measuring assessment accuracy and uniformity (COD, PRD, PRB). The statistics a credible valuation vendor should already report, by price tier and geography."
      }
    ],
    "scrutiny_tier": "elevated",
    "signal_lexicon": [
      "mass appraisal",
      "cama",
      "avm",
      "assessment roll",
      "ratio study",
      "reassessment",
      "homestead exemption",
      "appeals triage",
      "collections prioritization",
      "delinquency prediction",
      "refund screening",
      "audit selection",
      "integrated tax system",
      "revenue recovery",
      "tax gap"
    ],
    "skepticism_triggers": [
      {
        "claim_pattern": "\"Recovers $X million\" / \"found revenue\" / \"uncovers unpaid taxes\"",
        "source_url": "https://www.govtech.com/biz/Startup-Aims-to-Modernize-the-Property-Tax-Exemption-Audit.html",
        "threshold": "Any recovery figure without the matching false-positive rate, appeal-overturn rate, and the share actually collected",
        "why": "Recovery claims count flags rather than sustained outcomes. St. Johns County's exemption audit placed almost $800K in liens but had collected about $200K (Government Technology, 2020), and MiDAS \"recoveries\" were repaid with a $20M settlement on top."
      },
      {
        "claim_pattern": "Contingency or percentage-of-recovery pricing",
        "source_url": null,
        "threshold": "Any fee tied to added assessed value, denied refunds, removed exemptions, or collected debt",
        "why": "The fee structure pays the vendor to over-flag, and residents bear the appeal burden for every error. Ask for flat pricing or walk the claim back to a pilot with independent error measurement."
      },
      {
        "claim_pattern": "\"99% accuracy\" for fraud, refund, or audit screening",
        "source_url": "https://www.taxpayeradvocate.irs.gov/wp-content/uploads/2020/07/ARC18_Volume1_MSP_05_FalsePositiveRates.pdf",
        "threshold": "Any accuracy claim without a false-positive rate at your fraud prevalence and volumes",
        "why": "At low prevalence, high accuracy still means most flagged taxpayers are innocent. The IRS's own filters ran an 81% false-positive rate in 2018 while \"protecting revenue.\""
      },
      {
        "claim_pattern": "\"Fully automated\" or \"touchless\" determinations, liens, offsets, or garnishments",
        "source_url": "https://www.michigan.gov/ag/news/press-releases/2022/10/20/som-settlement-of-civil-rights-class-action-alleging-false-accusations-of-unemployment-fraud",
        "threshold": "Any such claim applied to an adverse action",
        "why": "Presumptively disqualifying. This is the MiDAS and Robodebt pattern: auto-adjudication was wrong more than 90 percent of the time in Michigan."
      },
      {
        "claim_pattern": "\"Proprietary model; we cannot disclose the factors\"",
        "source_url": "https://github.com/ccao-data/model-res-avm",
        "threshold": "Any trade-secret posture over valuation or scoring logic that faces an appeal or public-records request",
        "why": "The Hague court struck down SyRI for exactly this opacity, and Cook County publishes its own valuation model code, so secrecy is a vendor choice, and the public sector's own benchmark refutes the claim that it is necessary."
      },
      {
        "claim_pattern": "\"Defensible values\" or \"fewer appeals\" for assessment models",
        "source_url": "https://www.iaao.org/wp-content/uploads/Standard_on_Ratio_Studies.pdf",
        "threshold": "No ratio-study statistics (COD, PRD/PRB) broken out by neighborhood and price tier",
        "why": "Cook County's regressivity hid inside county-wide averages. IAAO ratio standards exist precisely so uniformity is checked by tier; a vendor who will not produce them has not measured equity."
      },
      {
        "claim_pattern": "\"AI identifies improper exemptions\" or \"finds delinquents\" for collections targeting",
        "source_url": null,
        "threshold": "No documented notice-and-cure process and no published error rate before liens or removals issue",
        "why": "A false flag here becomes a lien on a qualified homeowner, often elderly or disabled (homestead and senior exemptions are the ones being audited). The process design matters more than the model."
      },
      {
        "claim_pattern": "\"Trusted by X states\" or a long agency logo wall",
        "source_url": "https://epic.org/pondera-surveillance/",
        "threshold": "References that cannot be tied to named, callable production deployments",
        "why": "Even EPIC, using public-records requests, could not establish the true scope of Pondera's government footprint. Call the named agencies and ask what is actually in production."
      },
      {
        "claim_pattern": "\"FedRAMP/GovRAMP compliant\" or vague \"IRS-grade security\" for systems touching federal tax information",
        "source_url": "https://marketplace.fedramp.gov/",
        "threshold": "The word \"compliant\" instead of \"authorized,\" or no answer on IRS Publication 1075",
        "why": "Verify authorization on the marketplaces directly; \"in process\" is not \"authorized.\" Any system touching federal tax information must meet Pub 1075 safeguarding requirements, and 26 U.S.C. 6103 attaches serious statutory penalties to unauthorized disclosure."
      },
      {
        "claim_pattern": "A taxpayer chatbot that answers legal or filing questions",
        "source_url": "https://themarkup.org/artificial-intelligence/2024/03/29/nycs-ai-chatbot-tells-businesses-to-break-the-law",
        "threshold": "No grounding in your statutes and forms, no accuracy measurement, and no correction pipeline",
        "why": "NYC's MyCity chatbot invented rules on an official channel and told businesses to break the law. Wrong deadline or penalty answers create liabilities for residents who relied on them."
      }
    ]
  }
};
