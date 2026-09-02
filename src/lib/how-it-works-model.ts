/*
  The How it works model: every sentence, label, fixture, and function the
  /how-it-works page renders, in pure typed code. The page's JSX holds no
  copy of its own, for the same reason the report's load-bearing sentences
  are code-templated everywhere else: this page describes what the tool
  does, so every claim on it must be deterministic, unit-tested, linted for
  banned and jargon words, and pinned to the methodology version.

  Ground truth: docs/methodology.md (version HOW_IT_WORKS_METHODOLOGY_VERSION)
  and the shared pure modules the labs call directly. The three labs do not
  re-encode the rules; they call the real functions:
    - the credit lab calls attributionFor (identity-ties.ts),
    - the tier lab calls computeTier and isCeilingAdvFinding (tier.ts),
    - the source chooser calls classifyDomain and canVerify (domain-classes.ts).
  A model-side whichRule mirrors attributionFor only to NAME the rule that
  decided a case; the unit test sweeps every control combination to prove
  the two agree.

  Every vendor named here is one of the app's fictional samples. Record
  details are illustrative. Never import pipeline-tail.ts or the registry
  barrel here: they pull the Supabase client into the page bundle.
*/
import {
  attributionFor,
  type AttributionGuard,
  type RecordTieFacts,
} from "@shared/identity-ties.ts";
import {
  CEILING_ADV_CODES,
  computeTier,
  isCeilingAdvFinding,
  type Finding,
  type T1Trigger,
  type TierDecision,
  type TierInputs,
} from "@shared/tier.ts";
import {
  TIER_LABELS,
  type AdvFinding,
  type Dimension,
  type EvidenceTier,
  type LedgerResult,
  type TieEvidence,
  type VerdictTier,
} from "@shared/schemas.ts";
import {
  canVerify,
  classifyDomain,
  type DomainClass,
} from "@shared/domain-classes.ts";
import { HONESTY_GROUPS } from "@shared/honesty-groups.ts";
import { RESULT_LABELS } from "@/components/report/VerificationLedger";
import { SAMPLE_REPORTS } from "@/lib/sample-reports";
import { METHODOLOGY_VERSION } from "@shared/version.ts";

export const HOW_IT_WORKS_METHODOLOGY_VERSION = METHODOLOGY_VERSION;

/* The fictional sample followed through every stage. */
const CLARA = SAMPLE_REPORTS.claradocs;
const VENDOR = "ClaraDocs";
const VENDOR_FULL = "ClaraDocs (sample, fictional)";

/* ------------------------------------------------------------------ hero */

export const HERO = {
  eyebrow: "How it works",
  title: "How a check runs",
  rule: "Code decides every result. The AI models read and write. Nothing they write can raise the verdict, set a row's result, or word a question.",
  intro:
    "This page follows one check from start to finish. A check reads a vendor's pitch and tests its claims against public records. The report has three parts. The verdict tier says how much could be confirmed and what to do with your time next. The ledger has one row per claim: what was checked, what was found, and a link. The question pack lists questions to send the vendor. The page shows where an AI model does the work, where only code decides, and the rules you can try yourself.",
  fiction: "Every vendor named on this page is one of the app's fictional samples.",
  sampleLink: { label: "See a finished sample report", to: "/check?sample=claradocs" },
  lanes: [
    {
      id: "ai",
      title: "What an AI model may do",
      items: [
        "Read the pitch and pull out facts into set fields.",
        "Read the vendor's website.",
        "Search the web and cite pages.",
        "Sort the product into a sector.",
        "Phrase the summary and the next steps, after every decision is made.",
      ],
    },
    {
      id: "code",
      title: "What only code decides",
      items: [
        "Which checks run.",
        "Which records count as the vendor's.",
        "Every result: the verdict, each ledger row, each green flag (a fact a public record or independent page confirmed), and each question.",
        "Which words are allowed.",
      ],
    },
    {
      id: "you",
      title: "What you decide",
      items: [
        "Where records and claims disagree, both are shown with links and dates, and you draw the conclusion.",
        "Manual check cards hand you a link and say what a bad answer looks like.",
        "The honesty panel lists every check the tool tried and how each one ended. A check that could not run never counts against the vendor.",
        "When a pitch names a government customer, only that agency can confirm it; the report tells you to ask.",
        "The tool does not judge character or tell you whether to buy.",
      ],
    },
  ],
  wall: {
    title: "The wall between AI and code",
    lead: "AI output reaches the code side through three doors and no other way.",
    doors: [
      {
        id: "facts",
        label: "A limited list of facts, in set fields",
        text: "The reading model pulls out names, domains, addresses, people, and customers, and copies each claim as a short exact quote. Code drops any quote, customer, or address that is not in the pitch word for word.",
      },
      {
        id: "sentences",
        label: "Screened sentences",
        text: "Every sentence a model writes must pass two screens. It may name no company except the vendor and the legal names on records credited to it, and it may use no word on the banned list. A draft that fails either screen is redrafted once. If the second draft fails too, stock wording replaces everything the model wrote.",
      },
      {
        id: "pages",
        label: "Cited pages, graded by code",
        text: "Every web page the research step cites is graded by code from its address alone. The four classes are official record, independent press, the vendor speaking or unknown, and press wire. Only the first two classes can verify a claim.",
      },
    ],
    neverTitle: "Never crosses",
    /* Noun phrases, so no terminal periods. */
    never: [
      "A verdict",
      "A score",
      "A green flag",
      "A question",
      "A row result",
      "The class of any web page it cites",
      "Removing a hidden-text finding",
    ],
    exception:
      "An AI model can add one thing here, a flag for text aimed at AI, and it cannot remove a flag. The flag can only lower the verdict, capping it at Tier 2 on a scale of 0 to 4.",
  },
} as const;

/* ---------------------------------------------------------------- stages */

export type StageId =
  | "inputs"
  | "ingest"
  | "pitch-reader"
  | "vendor-site"
  | "registry"
  | "ties"
  | "research"
  | "packs"
  | "assembly"
  | "verdict"
  | "writer"
  | "review"
  | "lint"
  | "report";

export type Lane = "ai" | "code" | "both" | "you";
export type WhoChip = "Code" | "An AI model" | "Both" | "You";
export type GateId = "A" | "B" | "C" | "D";

export const WHO_CHIP: Record<Lane, WhoChip> = {
  ai: "An AI model",
  code: "Code",
  both: "Both",
  you: "You",
};

export const LANE_LEGEND: Record<Lane, string> = {
  ai: "An AI model works here",
  code: "Plain code decides here",
  both: "Both, with the wall between them",
  you: "You",
};

export interface Stage {
  id: StageId;
  n: number;
  lane: Lane;
  /* Two short lines, pre-split so the diagram never wraps mid-word. */
  label: [string, string];
  who: WhoChip;
  title: string;
  plain: string;
  inputs: string;
  outputs: string;
  inThisCheck: string;
  never: string;
  /* Set on the stage whose output crosses the wall at this gate. */
  gate?: GateId;
  methodologyRef: string;
  anchors: string[];
}

/* Code anchors (path:lines and a short note), transcribed from the ground
   truth for the collapsed "Where this lives in the code" block. */
const STAGE_ANCHORS: Record<StageId, string[]> = {
  "inputs": [
    "supabase/functions/evaluate/index.ts:183-186 (the four kinds)",
    "supabase/functions/evaluate/index.ts:187-216 (length limits per kind; 6 MB PDF at 209-213)",
    "supabase/functions/evaluate/index.ts:193-208 (web address typed beside a name, validated only)",
    "supabase/functions/evaluate/index.ts:220-223 (state)",
    "supabase/functions/evaluate/index.ts:364-367 (PDF binaries are never stored)",
    "supabase/functions/_shared/ingest-url.ts:63-86 (https only, no ports, blocked hosts)",
    "supabase/functions/_shared/ingest-url.ts:50-58 (hostBlocked: numeric, localhost, single-label, .local)",
    "supabase/functions/_shared/ingest-url.ts:96-101 (submittedHostOf)",
    "supabase/functions/_shared/ingest-pdf.ts:20 (PDF_MAX_PAGES = 25)",
    "docs/methodology.md:13 (\u00a71 What you get: four input kinds)",
    "docs/methodology.md:483 (Name-only submissions: address beside name; invalid address stops the check)",
    "docs/methodology.md:499 (ADV-01: how the input kind changes what caps)",
  ],
  "ingest": [
    "supabase/functions/evaluate/index.ts:378-410 (PDF ingest and hidden-text analysis)",
    "supabase/functions/evaluate/index.ts:411-458 (web address fetch; hidden-text gate; stripped page goes to the reader)",
    "supabase/functions/evaluate/index.ts:460-463 (runForensics; ingest findings only add)",
    "supabase/functions/_shared/ingest-pdf.ts:6-15 (text layer only; tiny and off-page text flagged; hidden runs kept as evidence)",
    "supabase/functions/_shared/ingest-pdf.ts:105-130 (analyzePdfItems: under 4 points, negative coordinates, 40-character floor)",
    "supabase/functions/_shared/ingest-url.ts:109-191 (fetchSubmittedUrl: 3 redirect hops, 2 MB, 8 seconds, html only)",
    "supabase/functions/_shared/forensics.ts:1-16 (three jobs; findings un-suppressible)",
    "supabase/functions/_shared/forensics.ts:45-49 (payload classes fire on one character; common classes fire at a run of 8 or 20 total)",
    "supabase/functions/_shared/forensics.ts:54-64 (AI-addressed pattern list)",
    "supabase/functions/_shared/forensics.ts:66-69,111-115 (SSN-shaped scrub)",
    "supabase/functions/_shared/forensics.ts:71-123 (runForensics)",
    "supabase/functions/_shared/forensics.ts:133-139,238-263 (hidden HTML patterns and detection)",
    "supabase/functions/_shared/forensics.ts:192-236 (classifyHiddenSpans: the web-address gate; informational finding never caps)",
    "docs/methodology.md:493 (Adversarial-content checks: deterministic screens before any AI model; findings can never be removed)",
    "docs/methodology.md:497-499 (ADV-01 Hidden text, and the input-kind rule)",
    "docs/methodology.md:503 (ADV-02)",
    "docs/methodology.md:507 (ADV-03 thresholds)",
    "docs/architecture.md:38 (trust map: ingest forensics findings cannot be cleared downstream)",
  ],
  "pitch-reader": [
    "supabase/functions/_shared/prompts/s1-extract.ts:1-7 (no tools; schema-validated; instructions have nothing to act on)",
    "supabase/functions/_shared/prompts/s1-extract.ts:9-31 (system prompt; line 14 untrusted data; line 22 counts are not customers)",
    "supabase/functions/_shared/anthropic.ts:232-259 (buildExtractRequest: fixed output form, temperature 0)",
    "supabase/functions/_shared/anthropic.ts:21-28",
    "supabase/functions/evaluate/index.ts:578-582 (source labels per input kind)",
    "supabase/functions/evaluate/index.ts:644-665 (name-only check skips the reader)",
    "supabase/functions/evaluate/index.ts:674-694 (two attempts, output validated against the typed form)",
    "supabase/functions/evaluate/index.ts:706-733 (verbatim guards on customers, quotes, basis spans, addresses)",
    "supabase/functions/evaluate/index.ts:770-782 (model injection screen only adds a finding)",
    "supabase/functions/_shared/schemas.ts:59-75 (field caps)",
    "docs/architecture.md:23 (stage 1 parse: no tools, strict output, temperature 0)",
    "docs/architecture.md:39 (trust map: nothing else it emits is used)",
    "docs/methodology.md:503 (ADV-02: an AI screen can add a detection but never clear one)",
    "docs/security.md:23-24 (raw pitch text is quarantined)",
  ],
  "vendor-site": [
    "supabase/functions/_shared/ingest-site.ts:1-20 (attacker-authored; hidden text stripped before extraction; nav-level pages only; same-domain pinned)",
    "supabase/functions/_shared/ingest-site.ts:31-34 (5 pages, 10,000 characters per page, 40,000 total, 22-second deadline)",
    "supabase/functions/_shared/ingest-site.ts:37-56 (high-value page segments)",
    "supabase/functions/_shared/ingest-site.ts:115-142 (one full-pass retry; a pass that returned pages never re-runs)",
    "supabase/functions/_shared/ingest-site.ts:196-214,218-228 (hidden text stripped per page; off-domain redirects rejected)",
    "supabase/functions/_shared/discovery.ts:1-36 (name-only discovery: one retry; domain picked by code)",
    "supabase/functions/_shared/discovery.ts:79-135 (discoverVendorSite)",
    "supabase/functions/_shared/anthropic.ts:375-415 (buildDiscoveryRequest: max two searches; refined retry)",
    "supabase/functions/_shared/domain-inference.ts:1-22,39-84 (inferPrimaryDomain rules; never counts toward identity)",
    "supabase/functions/evaluate/index.ts:844-853 (S1b overview)",
    "supabase/functions/evaluate/index.ts:885-939 (which address the site pass uses)",
    "supabase/functions/evaluate/index.ts:950-954 (site findings never join the ceiling-bearing set)",
    "supabase/functions/evaluate/index.ts:966-1031 (site extract retry, verbatim guards, name-match confirmation, merge)",
    "supabase/functions/evaluate/index.ts:1017-1024 (discovered domain counts only when the site's own name matches)",
    "supabase/functions/evaluate/index.ts:1061-1084,1205-1217 (site-step failure disclosure)",
    "supabase/functions/_shared/extract-merge.ts:1-21 (merge rules: never identity, never query names, never absence findings, never ADV ceiling, never performance marketing)",
    "supabase/functions/_shared/extract-merge.ts:48 (only identity, customer, compliance, team claims cross)",
    "supabase/functions/_shared/extract-merge.ts:66-136 (mergeExtracts; 120-123 names and domains stay pitch-only)",
    "supabase/functions/_shared/forensics.ts:146-164 (stripHiddenHtml: no ADV finding for auto-fetched site pages)",
    "supabase/functions/_shared/site-degradation.ts:1-40 (honesty-panel row for a failed website step)",
    "supabase/functions/_shared/registry/sos-sweep.ts:800-807 (discovered domain is only ever the second identifier)",
    "docs/methodology.md:473-479 (The vendor's website: what it can and cannot do)",
    "docs/methodology.md:483-489 (Name-only submissions: discovery, retry, disclosure)",
    "docs/architecture.md:23 (S1b in the pipeline table)",
    "docs/security.md:3 (site text cannot raise confidence or lower the tier)",
  ],
  "registry": [
    "supabase/functions/evaluate/index.ts:1087-1218 (S2 fan-out, all checks in parallel)",
    "supabase/functions/evaluate/index.ts:1096-1102 (contradictions arm only on affirmative present-status claims)",
    "supabase/functions/evaluate/index.ts:818-842 (compound names split; single-token fragments never queried on the exclusion list)",
    "supabase/functions/evaluate/index.ts:1161-1204 (domain lanes; discovered-domain lanes annotated)",
    "supabase/functions/_shared/registry/index.ts:42-147 (REGISTRY_MANIFEST: every check and its source)",
    "supabase/functions/_shared/registry/sos-sweep.ts:1-28 (five automated state lanes; Florida manual link; a miss is never adverse)",
    "supabase/functions/_shared/registry/edgar.ts:1-25 (two EDGAR lanes; filing entity must match)",
    "supabase/functions/_shared/registry/sam.ts:1-16 (registration; exclusions exact-match only, similar names suppressed)",
    "supabase/functions/_shared/registry/feeds.ts:1-21 (GovRAMP, TX-RAMP, Sourcewell copied lists; stale feed is coverage limited)",
    "supabase/functions/_shared/registry/feeds.ts:203-217 (TX-RAMP not applicable unless claimed or Texas)",
    "supabase/functions/_shared/registry/fedramp.ts:1-16 (contradiction, not absence, is the signal)",
    "supabase/functions/_shared/registry/rdap.ts:1-10 (domain registration date)",
    "supabase/functions/_shared/registry/usaspending.ts:1-13 (federal payment records)",
    "supabase/functions/_shared/registry/wayback.ts:1-13 (archived web history; none is never adverse)",
    "supabase/functions/_shared/registry/crtsh.ts:1-13 (certificate logs; timeout is coverage limited)",
    "supabase/functions/_shared/registry/dns.ts:1-11 (mail records)",
    "supabase/functions/_shared/registry/github.ts:1-11 (public code footprint; absence is neutral)",
    "supabase/functions/_shared/claim-status.ts:1-60 (affirmsProgram: pending wording never arms)",
    "docs/architecture.md:24 (stage 2 registry: plain code)",
    "docs/architecture.md:40 (trust map: no AI model anywhere in the stage)",
    "docs/methodology.md:35 (a source we could not reach counts for nothing)",
    "docs/methodology.md:52-53 (D1.1 sources and matching rules; short names exact only)",
    "docs/methodology.md:181 (D3.1: contradiction arms only on a current-status claim)",
    "docs/methodology.md:585-626 (\u00a75 the source registry)",
    "docs/methodology.md:697-698 (\u00a710: five of 51 jurisdictions automated; Delaware never)",
  ],
  "ties": [
    "supabase/functions/_shared/identity-ties.ts:1-37 (attribution rule; monotone-add; denials inert; strong vs weak ties)",
    "supabase/functions/_shared/identity-ties.ts:226 (AGE_VETO_YEARS = 5)",
    "supabase/functions/_shared/identity-ties.ts:202-212,246-268 (submitted root check; domainRootCoversName)",
    "supabase/functions/_shared/identity-ties.ts:417-618 (computeTies: officer, address, domain, feed product, full legal name strong; state weak; age veto)",
    "supabase/functions/_shared/identity-ties.ts:771-862 (attributionFor: the credit rules)",
    "supabase/functions/_shared/identity-ties.ts:871-925 (live exact-name census)",
    "supabase/functions/_shared/identity-ties.ts:934-976 (namesakeCensus for the collision notice)",
    "supabase/functions/_shared/identity-ties.ts:1002-1013 (adjudicateChecks)",
    "supabase/functions/_shared/identity-ties.ts:1068-1146 (research-to-registry name bridge: registry-grade official pages only)",
    "supabase/functions/_shared/domain-classes.ts:220-246 (REGISTRY_GRADE_HOSTS)",
    "supabase/functions/_shared/registry/sos-sweep.ts:767-865 (resolveIdentity: two identifiers; discovered domain second only; mail or certificate stand-in when the lookup was unavailable)",
    "supabase/functions/evaluate/index.ts:1221-1244 (provisional pass after registry)",
    "supabase/functions/_shared/pipeline-tail.ts:282-303 (authoritative pass with research coverage; ties only add)",
    "supabase/functions/_shared/pipeline-tail.ts:305-379 (name bridge re-run; a bridge miss never worsens the sweep)",
    "supabase/functions/_shared/pipeline-tail.ts:381-424 (mail-record retry; identity recomputed)",
    "supabase/functions/_shared/pipeline-tail.ts:426-482 (exclusion list re-searched under credited legal names only)",
    "supabase/functions/_shared/name-collision.ts:1-67 (collision notice: informational, never enters tier inputs)",
    "supabase/functions/_shared/schemas.ts:148-158 (attribution field: candidate never counts for or against)",
    "docs/methodology.md:55 (the research-to-registry name bridge)",
    "docs/methodology.md:57 (Attribution: when a record counts as this vendor's)",
    "docs/methodology.md:79 (D1.4 stand-in when the lookup is unreachable)",
    "docs/methodology.md:479 (what a submitted web address can do)",
    "docs/methodology.md:485 (name collision notice)",
    "docs/methodology.md:487 (a company with nothing but a website can never resolve identity)",
    "docs/methodology.md:531 (\u00a73 attribution gates credit in both directions)",
    "docs/methodology.md:539 (\u00a74 identifiers count only on credited records)",
    "docs/methodology.md:706 (\u00a710 bare-name checks and namesakes)",
  ],
  "research": [
    "supabase/functions/_shared/prompts/s3-research.ts:9-48 (objectives; cite everything; fetched pages untrusted; no verdicts or scores)",
    "supabase/functions/_shared/anthropic.ts:273-277 (researchBudget: 12/6 or 20/8)",
    "supabase/functions/_shared/anthropic.ts:288-304 (search and fetch tools; press wires blocked from search; 15,000 content tokens)",
    "supabase/functions/_shared/anthropic.ts:312-337 (DEEP_MODE: four lanes, 15 searches and 6 fetches each)",
    "supabase/functions/_shared/anthropic.ts:21-28",
    "supabase/functions/evaluate/index.ts:1316-1382 (S3 call; typed input only; dynamic deadline)",
    "supabase/functions/_shared/anthropic-client.ts:305-364 (bounded cycles; completed cycles survive a deadline; partial flag)",
    "supabase/functions/_shared/harvest.ts:1-64 (two channels; cap 40; class assigned by code; a vendor cannot promote its own links)",
    "supabase/functions/_shared/domain-classes.ts:1-11 (the four classes)",
    "supabase/functions/_shared/domain-classes.ts:13-43 (.gov and .mil; .us only in the government naming pattern)",
    "supabase/functions/_shared/domain-classes.ts:193-218 (classifyDomain; vendor domains always class 3; only class 1 and 2 verify)",
    "supabase/functions/_shared/domain-classes.ts:249-261 (press wires and content farms kept out of search)",
    "supabase/functions/_shared/adv-corroboration.ts:1-38 (ADV-04: eight-word run on two or more unrelated sites; never moves the tier)",
    "supabase/functions/_shared/pipeline-tail.ts:233-243 (ADV-04 scan only adds)",
    "supabase/functions/deep-research/index.ts:1-15,175-233 (four lanes merged; same tail)",
    "docs/architecture.md:25 (stage 3 research)",
    "docs/architecture.md:41 (trust map: citations mandatory; authority classified by code)",
    "docs/methodology.md:40 (AI-assisted web research: code grades each source)",
    "docs/methodology.md:138 (D2.4: search budget and the deep check)",
    "docs/methodology.md:532 (\u00a73 source authority assigned by code; the .us rule)",
    "docs/methodology.md:511 (ADV-04)",
    "docs/methodology.md:628 (\u00a75 how web research sources are collected; cap of 40)",
    "docs/methodology.md:705 (\u00a710 research incomplete is stated)",
  ],
  "packs": [
    "supabase/functions/_shared/prompts/s4-classify.ts:1-24 (classifier prompt; up to 3 packs; overlay rule)",
    "supabase/functions/_shared/anthropic.ts:432-444 (buildClassifyRequest; fixed output form)",
    "supabase/functions/_shared/anthropic.ts:21-28",
    "supabase/functions/_shared/pipeline-tail.ts:484-579 (S4; lexicon fallback at 533-554; eligibility safety net at 555-571; nothing can remove scrutiny at 525-528)",
    "supabase/functions/_shared/sector-lexicon.ts:1-61 (code fallback; can only add scrutiny)",
    "supabase/functions/_shared/state-items.ts (state obligation items)",
    "packs/ (nine pack files: call-center, data-analytics, document-processing, eligibility-case-mgmt, permitting-licensing, public-comms, public-safety-policing, staff-productivity, tax-revenue)",
    "supabase/functions/_shared/questions.ts:1-31 (every question selected by code)",
    "docs/architecture.md:26 (stage 4 packs)",
    "docs/architecture.md:42 (trust map: enum-constrained classification)",
    "docs/methodology.md:401 (D7: nothing in this dimension can create an adverse flag)",
    "docs/methodology.md:405-408 (D7.1 nine categories; published inclusion tests)",
    "docs/methodology.md:412-415 (D7.2 high-impact escalation)",
    "docs/methodology.md:419-422 (D7.3 state obligations, not legal advice)",
    "docs/methodology.md:433-435 (no AI model chooses, writes, or reorders a question)",
  ],
  "assembly": [
    "supabase/functions/_shared/assemble.ts:1-13 (pure code, no AI; results decided here)",
    "supabase/functions/_shared/assemble.ts:83-97 (skeleton contents; every class 1-2 citation accounted for)",
    "supabase/functions/_shared/assemble.ts:245-357 (identity row and green flag from the credited record; note is a code template)",
    "supabase/functions/_shared/assemble.ts:358-420 (identity miss row; no-registration trigger needs a definitive search)",
    "supabase/functions/_shared/assemble.ts:423-541 (ended registrations: credited records arm, candidates do not)",
    "supabase/functions/_shared/assemble.ts:543-567 (untied hits render as labeled candidate rows)",
    "supabase/functions/_shared/assemble.ts:569-597 (exclusion match: exact only)",
    "supabase/functions/_shared/assemble.ts:599-638 (domain age row; code-templated note)",
    "supabase/functions/_shared/assemble.ts:673-745 (federal awards credit: exact, distinctive, at least one award, root covered)",
    "supabase/functions/_shared/assemble.ts:747-851 (customer traces: verify rule at 764-770; unread official link becomes a lead and a manual card at 795-829; pitch-only aggregate at 832-851)",
    "supabase/functions/_shared/assemble.ts:855-933 (compliance feed credit rules; candidate rows)",
    "supabase/functions/_shared/assemble.ts:935-1075 (FedRAMP and GovRAMP: contradiction, verified, candidate, or could not verify)",
    "supabase/functions/_shared/assemble.ts:1252-1284 (certifications that do not exist)",
    "supabase/functions/_shared/assemble.ts:1288-1306 (D4 green flags from certificate logs and code footprint)",
    "supabase/functions/_shared/assemble.ts:1310-1424 (leaders: up to six; corroboration by name plus vendor in retrieved content; aggregate needs complete research)",
    "supabase/functions/_shared/assemble.ts:1428-1459 (performance claims; arithmetic note)",
    "supabase/functions/_shared/assemble.ts:1520-1531 (domain-age trigger needs zero verified customers)",
    "supabase/functions/_shared/assemble.ts:1535-1555 (row weight can never outrank the findings)",
    "supabase/functions/_shared/assemble.ts:1557-1574 (startup bar; tier inputs)",
    "supabase/functions/_shared/assemble.ts:1576-1598 (question selection by code)",
    "supabase/functions/_shared/assemble.ts:1600-1714 (honesty panel and manual cards; groups)",
    "supabase/functions/_shared/assemble.ts:1716-1787 (leads, cap 8, no press wires; unassessed sources, cap 12)",
    "supabase/functions/_shared/questions.ts:1-31 (composition order; 15 with 5 core reserved)",
    "supabase/functions/_shared/honesty-groups.ts:12-18 (the five group labels)",
    "supabase/functions/_shared/plausibility.ts:1-29 (arithmetic note: never a finding, never moves the tier)",
    "supabase/functions/_shared/pipeline-tail.ts:930-936 (green flags rendered from code facts)",
    "supabase/functions/_shared/pipeline-tail.ts:1161-1166 (collision notice rides the honesty panel; never touches the tier)",
    "src/components/report/LeadsList.tsx:25 ('Found during research, not yet confirmed')",
    "src/components/report/SourcesList.tsx:55 ('Retrieved but not assessed')",
    "docs/architecture.md:27 (stage 5: ledger rows composed by code; questions by code)",
    "docs/methodology.md:43 (green flags written by code)",
    "docs/methodology.md:139 (D2.4 what counts as verified; leads list)",
    "docs/methodology.md:300-301 (D5.1 corroboration rule; aggregate needs complete research)",
    "docs/methodology.md:349 (D6.1 arithmetic note never changes weight or tier)",
    "docs/methodology.md:433-458 (how the question pack is assembled)",
    "docs/methodology.md:477 (absence findings count only what the pitch named)",
    "docs/methodology.md:533 (every class 1-2 page is accounted for; rows reconcile against findings)",
    "docs/methodology.md:543 (what code writes)",
  ],
  "verdict": [
    "supabase/functions/_shared/tier.ts:1-19 (no AI output reaches this module; the rules)",
    "supabase/functions/_shared/tier.ts:23-35 (the five trigger kinds, built only by pipeline code)",
    "supabase/functions/_shared/tier.ts:72-96 (ADV ceiling at Tier 2; only ADV-01, 02, 03; informational findings never cap)",
    "supabase/functions/_shared/tier.ts:98-109 (the seven points)",
    "supabase/functions/_shared/tier.ts:113-152 (Tier 0, 1, 2, 4, 3 rules in order)",
    "supabase/functions/_shared/tier.ts:154-167 (ceiling applied last, can only lower)",
    "supabase/functions/_shared/schemas.ts:330-336 (tier labels)",
    "supabase/functions/_shared/pipeline-tail.ts:601 (tier computed before the writer runs)",
    "docs/architecture.md:45 (trust map: pure function over code-produced inputs)",
    "docs/architecture.md:48 (the invariant: no vendor text changes checks or tier; manipulation can only lower)",
    "docs/methodology.md:539-543 (\u00a74 the seven points; no AI assigns or raises the tier)",
    "docs/methodology.md:547-577 (Tier 0 through Tier 4 criteria)",
    "docs/methodology.md:561 (an AI judgment can never assign Tier 1)",
    "docs/methodology.md:566 (ADV cap at Tier 2)",
    "docs/methodology.md:643 (\u00a76 not enough data beats a bad grade)",
    "docs/methodology.md:720-727 (\u00a712 never a score, never buy or not buy)",
  ],
  "writer": [
    "supabase/functions/_shared/prompts/s5-structure.ts:1-14 (phrases decisions already made; never decides)",
    "supabase/functions/_shared/prompts/s5-structure.ts:16-54 (system prompt; rule 11 company names; 48-49 green flags written by code)",
    "supabase/functions/_shared/prompts/s5-structure.ts:56-80 (the decided skeleton it receives)",
    "supabase/functions/_shared/anthropic.ts:446-454 (buildStructureRequest; fixed output form)",
    "supabase/functions/_shared/anthropic.ts:21-28",
    "supabase/functions/_shared/pipeline-tail.ts:581-650 (writer input; guard built from credited names)",
    "supabase/functions/_shared/pipeline-tail.ts:944-982 (one retry on banned word or uncredited name)",
    "supabase/functions/_shared/pipeline-tail.ts:1092-1139 (code-templated rows keep their notes; model notes guarded; template fallback)",
    "supabase/functions/_shared/pipeline-tail.ts:1150-1159 (summary and next steps guarded; template fallback)",
    "supabase/functions/_shared/pipeline-tail.ts:1220-1283 (fallback note, default summary, default next steps)",
    "supabase/functions/_shared/synthesis-guard.ts:1-24 (every name in model prose must be a credited name)",
    "supabase/functions/_shared/synthesis-guard.ts:132-202 (allowed and denied names)",
    "supabase/functions/_shared/synthesis-guard.ts:212-248 (violations; 239-246 a searched state must have run)",
    "supabase/functions/_shared/synthesis-guard.ts:262-276 (drop violating sentences; null falls back to template)",
    "docs/architecture.md:27 (stage 5 synthesis constraints)",
    "docs/architecture.md:43 (trust map: tier computed before the model runs)",
    "docs/methodology.md:543 (what the AI writes and what code writes)",
    "docs/methodology.md:58 (the identity miss note is written by code, not the AI)",
  ],
  "review": [
    "supabase/functions/_shared/prompts/s5-review.ts:1-9 (can only tighten; anything that would raise the verdict is ignored)",
    "supabase/functions/_shared/prompts/s5-review.ts:11-24 (the five fronts; cannot change the tier or add adverse claims)",
    "supabase/functions/_shared/anthropic.ts:456-473 (buildReviewRequest)",
    "supabase/functions/_shared/anthropic.ts:21-28",
    "supabase/functions/_shared/pipeline-tail.ts:695-723 (when the review runs; timeout; apply)",
    "supabase/functions/_shared/pipeline-tail.ts:91-95 (time allowance from remaining budget)",
    "supabase/functions/_shared/pipeline-tail.ts:97-128 (what the review reads)",
    "supabase/functions/_shared/pipeline-tail.ts:995-1004 (rows it may never remove)",
    "supabase/functions/_shared/pipeline-tail.ts:1006-1015 (only model-authored surfaces may be reworded)",
    "supabase/functions/_shared/pipeline-tail.ts:1017-1057 (applyReview: replacement text accepted whole or not at all; fixed adjustment labels)",
    "docs/architecture.md:28 (stage 6 review)",
    "docs/architecture.md:44 (trust map: adjustments logged; tier and ledger immutable)",
    "docs/methodology.md:543 (a second model reviews wording; may only tighten; a review that does not complete changes nothing)",
  ],
  "lint": [
    "supabase/functions/_shared/lint.ts:1-13 (every piece of generated narrative passes through; never ships a violation)",
    "supabase/functions/_shared/lint.ts:15-42 (banned words about a named company or person)",
    "supabase/functions/_shared/lint.ts:46-57 (words the tool never uses about itself; AI-tell words; em dash)",
    "supabase/functions/_shared/lint.ts:65-88 (lintText)",
    "supabase/functions/_shared/lint.ts:95-109 (evaluative adjectives banned on the arithmetic note)",
    "supabase/functions/_shared/lint.ts:113-130 (lintObject: whole report; urls and ids skipped)",
    "supabase/functions/_shared/lint.ts:142-167 (em dashes rewritten; prose trimmed to whole sentences)",
    "supabase/functions/_shared/pipeline-tail.ts:725-755 (final screen: notes, summary, and questions fall back or drop)",
    "supabase/functions/_shared/pipeline-tail.ts:757-767 (arithmetic note guard)",
    "supabase/functions/_shared/pipeline-tail.ts:968-976 (the writer is retried on a banned word)",
    "supabase/functions/_shared/pipeline-tail.ts:1039-1043,1047-1052 (review replacements gated by the same screen)",
    "docs/methodology.md:650-658 (\u00a77 language policy: enforced by an automated check; banned lists; the absence template)",
    "docs/architecture.md:27 (every model sentence passes the language lint)",
  ],
  "report": [
    "supabase/functions/_shared/pipeline-tail.ts:769-791 (fixed-form check; failure ends the run with a re-run message)",
    "supabase/functions/_shared/pipeline-tail.ts:793-814 (persist the validated report)",
    "supabase/functions/_shared/pipeline-tail.ts:1168-1203 (the report object: verdict, ledger, green flags, findings, honesty panel, questions, manual checks, leads, unassessed sources, next steps, sources, meta with assessed domain and its source)",
    "supabase/functions/_shared/schemas.ts:390-443 (Report form; input kind; assessed domain and its source)",
    "supabase/functions/evaluate/index.ts:115 (RESULT_CACHE_DAYS = 30)",
    "supabase/functions/evaluate/index.ts:784-805 (a cached report is reused only when no adversarial-content finding exists)",
    "docs/methodology.md:13-24 (\u00a71 what you get and the limits, including no score and the employment, credit, insurance, housing rule)",
    "docs/methodology.md:539 (every verdict states meets N of 7)",
    "docs/methodology.md:579 (on every report: generation date, every source, expiry date, disclaimer, dispute link)",
    "docs/methodology.md:483,489 (the report states which address it checked and where it came from)",
    "docs/methodology.md:666 (\u00a77 reuse for up to 30 days; adversarial-content findings always run fresh)",
    "docs/methodology.md:686 (\u00a79 methodology version and pack release recorded)",
    "docs/methodology.md:720-729 (\u00a712 what this tool never does)",
  ],
};

const STAGE_TEXT: Omit<Stage, "n" | "who" | "anchors">[] = [
  {
    id: "inputs",
    lane: "you",
    label: ["You start", "the check"],
    title: "Four ways to start a check",
    plain:
      "You can paste a pitch, upload a PDF, give a web address, or type only a company name. If you type a name, you can add the vendor's web address beside it. You may also pick your state.",
    inputs:
      "A pasted pitch, a PDF, a secure web address, or a company name with an optional web address beside it. Your state goes in too, if you chose one.",
    outputs:
      "One submission tagged with its kind, plus your state, and the kind decides how hidden text is treated later. Hidden text in a pasted document or PDF always counts against the verdict. Hidden text on a public web page counts only when it is aimed at AI or carries a figure the visible page does not.",
    inThisCheck: `${VENDOR} starts as a pasted email from its co-founder. It names the company, its web address, a Colorado registration, a securities filing with the SEC, and a county pilot.`,
    never:
      "The tool never accepts a web address that does not start with https, an address made only of numbers, or a name that only works inside an office network. It keeps only the text it read from a PDF and never stores the file itself. A name-plus-address check with an address that is not a valid secure site stops with a message.",
    methodologyRef: "1-what-you-get",
  },
  {
    id: "ingest",
    lane: "code",
    label: ["Read and", "screen"],
    title: "Reading the file and catching hidden text",
    plain:
      "Code turns your file or page into text before any AI model sees it. It looks for text a person would not see: hidden web styling, tiny or off-page PDF text, invisible characters, and lines written to AI systems. What it finds is recorded as a finding that no later step can erase.",
    inputs: "The raw PDF, the raw web page from the address you gave, or the pasted text.",
    outputs:
      "Clean text, with invisible characters removed and anything shaped like a Social Security number blanked out. It also passes on any findings about hidden text, text aimed at AI systems, or invisible characters. The report calls these adversarial-content findings.",
    inThisCheck:
      "The pasted email contains none of the three kinds of hidden content, so no adversarial-content finding is made.",
    never:
      "A finding made here can never be removed by a later step. On a web address, ordinary hidden page parts such as menus and screen-reader labels are reported as information and do not lower the verdict. A stray invisible character or two is removed silently and does not count.",
    gate: "A",
    methodologyRef: "adversarial-content-checks-adv",
  },
  {
    id: "pitch-reader",
    lane: "ai",
    label: ["AI reads", "the pitch"],
    title: "An AI model reads the pitch",
    plain:
      "A small AI model reads the cleaned text and pulls out facts into set fields. It lists company names, web domains, people, named customers, and each claim as a short exact quote. It has no tools and no web access. The pitch reaches it labeled as untrusted data, so instructions hidden in the pitch have nothing to act on.",
    inputs:
      "The cleaned pitch text and a label saying how it arrived. On a name-only check this step is skipped and the typed name is used as is.",
    outputs:
      "A list of limited length, in set fields, of names, domains, addresses, people, named customers, and claims quoted from the pitch. It also returns a one-line description of the use case and a flag if any text seemed aimed at an AI. Code then throws out any quote, customer, or address that does not appear word for word in the pitch.",
    inThisCheck: `The model pulls out the name ${VENDOR}, the domain claradocs.io, the co-founder Priya Raman, and claims such as "we incorporated in Colorado in 2024".`,
    never:
      "This model cannot search the web, cannot see the registry results, and plays no part in the verdict. Code reads only its set fields and discards the rest. Its flag for text aimed at AI can add a finding but cannot clear one. A count like 'more than 50 cities' is not treated as a customer name, and the full pitch text does not travel past this step.",
    gate: "B",
    methodologyRef: "adv-02",
  },
  {
    id: "vendor-site",
    lane: "both",
    label: ["Vendor's", "website"],
    title: "Reading the vendor's own website",
    plain:
      "For every kind of check, the tool reads the vendor's public website, meaning the homepage plus up to four pages it links, such as about, customers, and security. On a name-only check, an AI model runs a short web search to find the site, but code picks the address. The same AI reader pulls facts from the pages, and code merges them with the pitch under strict rules.",
    inputs:
      "The site address from the pitch, from the web address you gave, or found by a name search. Pages are fetched with size and time limits, stay on the vendor's own domain, and have hidden text removed before anything reads them.",
    outputs:
      "The site adds more things to check. It can add leaders, named customers, addresses, and identity, customer, compliance, and team claims, each marked as coming from the website. The report says when a quoted claim came from the site rather than the pitch.",
    inThisCheck:
      "The tool reads claradocs.io. Its product pages later stand as the vendor's own statements about how the product works, graded as the vendor speaking.",
    never:
      "Site text cannot add names to the registry searches, prove identity on its own, or cap the verdict for adversarial content. It also cannot create a finding from absence. The finding 'none of the named customers could be verified' counts only the customers the pitch named. A site found by search can count toward identity only alongside a registry record, and only when the site itself names the vendor. If the site cannot be found or read on a name check, the honesty panel says so, and it does not count against the vendor.",
    methodologyRef: "the-vendors-website",
  },
  {
    id: "registry",
    lane: "code",
    label: ["Public", "registries"],
    title: "Code checks the public registries",
    plain:
      "Code queries official public sources directly, all at the same time. No AI model is involved in any result. Each check logs what it asked, when, what came back, and a link to the evidence.",
    inputs:
      "The company names from the pitch, split so a product name is never searched as if it were the company. The vendor's domain when one is known, the sender's email domain, a founding year if the pitch states one, and your state.",
    outputs:
      "One logged result per source: found, definitively not found, could not check, or not applicable. The sources are listed below.",
    inThisCheck:
      "Code finds a Colorado registration, a securities filing with the SEC, and the vendor's domain registration. The registration was formed May 2024, the filing dates from October 2025, and the domain was registered June 2024. SAM.gov, the federal contractor registration, has no record, which is normal and neutral.",
    never:
      "A source the tool could not reach does not count against the vendor, and a missing registration in any one place is not adverse by itself. A compliance contradiction, meaning a program status the pitch claims that the program's own list does not support, is logged only when the claim is stated as current. 'In process' or 'pending' wording does not log one. Names under four characters are accepted only on an exact match. Text from the pitch or the website cannot stop a check, and it cannot add a company name to the registry searches. The checks that need a web address run only when one is known, and the TX-RAMP lookup runs only for a Texas buyer or a stated TX-RAMP claim.",
    methodologyRef: "d1-1",
  },
  {
    id: "ties",
    lane: "code",
    label: ["Credit the", "records"],
    title: "Deciding which records belong to this vendor",
    plain:
      "A name match alone makes a record a candidate. Code credits it to the vendor when a second detail ties them together. A strong tie is an officer or agent named in the vendor's materials or in independent coverage. A shared address, the vendor's web domain, the compliance program's own product entry, or the full legal name you typed also count as strong. A matching state is a weak tie, which supports credit but cannot, by itself, produce a warning (an adverse finding) in the report. Identity counts as resolved only when two independent records agree.",
    inputs:
      "Each registry hit brings its own facts (officers, addresses, state, domain, and formation year). The vendor side brings the facts that already passed the boundaries (the pitch and site facts, plus pages from official or independent sources). This runs once right after the registry checks and again after web research, when coverage can add ties.",
    outputs:
      "Each record comes out marked credited or candidate. A candidate row carries that label in the report, and a credited ended-registration row names the detail that tied it. The full list of ties goes to the run log rather than the report. Identity comes out resolved or not, with the identifying records named. A count of same-name records that could not be tied drives the name-collision notice on name-only checks.",
    inThisCheck:
      "Identity resolves because two independent records, the Colorado registration and the SEC filing, agree on the company. The SEC filing lists the co-founder named in the pitch, a strong tie linking that record to the vendor. The Colorado record's state matches the company's Denver address, a weak tie that still supports credit.",
    never:
      "Vendor text can only add details to compare; nothing a pitch says can remove a tie, so denials are ignored. A record formed more than five years before the vendor's earliest known year stays a candidate unless a strong detail ties it. When you gave a web address, its root name must cover the record's name. A candidate record cannot prove identity, earn a green flag, or produce a warning, and a website alone cannot resolve identity.",
    methodologyRef: "d1-1",
  },
  {
    id: "research",
    lane: "both",
    label: ["Web", "research"],
    title: "An AI model searches the open\u00a0web",
    plain:
      "A larger AI model with web search and page reading looks for the traces a real vendor leaves. It looks for customer mentions on government sites and meeting agendas, independent coverage of named leaders, case studies outside the vendor's site, and company footprint. It must cite a link for everything. Code then sorts each link into a class: official source, independent press, vendor or unknown site, or press wire. No AI model takes part in that sorting.",
    inputs:
      "The facts pulled from the pitch (names, domains, people, named customers, claims with quotes) and a short summary of the registry results. It is not given the raw pitch. The search is limited in time and scope. A deep check is a box you can choose on the start page, when it is offered. It replaces this single pass with four focused passes (customers, claims, leadership, company footprint), each on its own clock, with more searches in total. If the deep check cannot start, the run continues as a standard check. The verdict rules do not change.",
    outputs:
      "A findings write-up and a list of up to 40 cited sources, each stamped with a source class by code. Pages the model read carry the page title and the exact passage. Links it only mentioned carry nothing and are treated as unread leads. A code scan also flags the same eight-word phrase repeated across unrelated sites.",
    inThisCheck:
      "The model finds independent event coverage that names the co-founder and the company. It finds no public trace of the county pilot, so that row reads 'could not verify', which is normal for a small pilot.",
    never:
      "The model does not see the raw pitch. Pages it reads are untrusted data, so instructions in them are not followed. Only official and independent sources can verify a claim. Vendor pages and press wires cannot, and adding more of them does not change that. The model writes no verdict and no score. If time runs out, the report says research was incomplete. The repeated-phrase finding is reported but does not change the verdict.",
    methodologyRef: "3-evidence-tiers-how-we-grade-what-we-find",
  },
  {
    id: "packs",
    lane: "both",
    label: ["Sector", "match"],
    title: "Matching the product to a sector",
    plain:
      "The sector match uses a small AI model. It sorts the pitch into up to three of nine sector question packs, using each pack's published test for what belongs in it. A pack is the set of questions written for one kind of product, such as document processing. The model also flags when the product touches decisions about individual residents, such as benefits eligibility. That adds questions on pre-deployment testing, impact assessment, human oversight, and appeals, which the report calls elevated scrutiny. If the model fails or returns nothing, a code word-list fallback keeps the sector match alive. A code check for eligibility wording runs on every report and can only add scrutiny.",
    inputs:
      "The one-line use-case description, the claims with quotes, and the list of packs with their published tests. Your state also goes in, for the state obligation items.",
    outputs:
      "The matched packs, whether elevated scrutiny applies and why, and the 'your state will require' items.",
    inThisCheck:
      "The pitch is sorted into the document-processing pack. The product drafts work for a person to approve, so no elevated scrutiny applies.",
    never:
      "Nothing here can create an adverse finding or change the verdict. The model can raise scrutiny, but neither it nor the fallback can lower it. The model does not write or pick a question, because code selects every question from published templates and pack files.",
    methodologyRef: "d7-1",
  },
  {
    id: "assembly",
    lane: "code",
    label: ["Build the", "report"],
    title: "Code builds the finished decisions",
    plain:
      "Code builds the report's bones from the recorded check results. It decides every ledger row's result, lists findings with their weights, and writes green flags from checked records. It picks the questions from published templates and builds the honesty panel. Research pages that fit no row are set aside as leads, or as retrieved but not assessed.",
    inputs:
      "The merged pitch and site facts, the credited registry results, the classified research sources, the adversarial-content findings, and the sector match.",
    outputs:
      "Ledger rows, each with a result, an evidence grade, and a weight. Verified means a public record or independent page confirms the claim. A row reads could not verify when the tool searched and found nothing, which is not proof the claim is false. Official record found means a record exists, and what it shows is the finding. A contradicted row means an official list disagrees with the pitch, and coverage limited means the source could not be checked this run. The evidence grade runs from T1 (a public record the tool fetched, with a link and date) to T4 (searched and could not confirm). The weight is Critical, High, Medium, Low, or Info. This step also produces the finding list, the logged contradictions, and the green-flag facts with the areas they cover. Code selects the question pack here, up to 15, with the five universal questions always reserved. The manual check cards and the honesty panel are built here too, and the panel lists every check tried under the five headings below. Leads, unassessed sources, and the name-collision notice, when it applies, are set aside at the same time.",
    inThisCheck: `Code writes ${CLARA.ledger.length} ledger rows and ${CLARA.green_flags.length} green flags. The vendor meets the startup bar, the least a young company can fairly be asked to show. Here the SEC filing credited to the vendor meets it. Code cannot read a SOC 2 report, so that claim's row reads could not verify and the question pack asks for the document.`,
    never:
      "No AI model decides a row result, a weight, a green flag, or a question. A customer is marked verified only when an official or independent page names both the customer and the vendor in text the tool read. A link alone does not verify. 'None of the named customers' and 'none of the named leaders' count only what the pitch named. A row can never carry a higher weight than the findings the verdict reads. Official or independent pages are not silently dropped. The arithmetic note on a performance number states only the division and does not change a weight or the verdict.",
    methodologyRef: "4-the-verdict-tiers",
  },
  {
    id: "verdict",
    lane: "code",
    label: ["Set the", "tier"],
    title: "Code computes the verdict tier",
    plain:
      "A short piece of code sets the tier from recorded check results. It counts seven points. Identity resolved on two records is 2 points. Each area with a verified green flag is 1 point, up to 4. No High or Critical finding still open (unresolved) is 1 point. There are five tiers, from 0, not enough to evaluate, to 4, established vendor. No AI model touches this step.",
    inputs:
      "Code reads whether the submission could be researched and whether identity resolved. It also reads the contradictions logged by registry checks; the report calls them trigger events, and only the five kinds listed below exist. Last come the findings, the green areas, the startup bar, and the adversarial-content findings.",
    outputs:
      "The tier, its label, the 'meets N of 7' count, and a rationale in set wording that says which rule set the tier. At Tier 1 each line names one logged contradiction and the check that logged it, and the evidence link sits on that check's ledger row.",
    inThisCheck: `Identity resolved on two records counts 2 points, and each area (a group of related checks) with a verified green flag counts 1 more. Two areas qualify here, identity and team, the team point coming from the co-founder's independent press coverage. No High or Critical finding is left open, meaning unresolved, which counts the last 1. That is ${CLARA.verdict.checks_met.met} of the ${CLARA.verdict.checks_met.total} verification checks, which the report prints as meets ${CLARA.verdict.checks_met.met} of ${CLARA.verdict.checks_met.total}. The result is Tier ${CLARA.verdict.tier}, emerging vendor.`,
    never:
      "Tier 1 needs two or more logged contradictions. One is not enough, and a source the tool could not reach cannot produce one. Too little information goes to Tier 0. Hidden text, text aimed at AI, or invisible characters in what you submitted cap the tier at 2. The repeated-phrase web finding does not move it. No AI model assigns the tier, and none can raise it.",
    gate: "C",
    methodologyRef: "4-the-verdict-tiers",
  },
  {
    id: "writer",
    lane: "ai",
    label: ["AI writes", "the notes"],
    title: "An AI model writes the plain-language notes",
    plain:
      "After every decision is made, a small AI model writes the verdict summary, a short note for some ledger rows, and the next steps. It works from the finished decisions, into set fields. Code checks each sentence it writes. A sentence that names any company other than the vendor and its credited legal names is dropped. A part of the report with nothing left falls back to stock wording.",
    inputs:
      "The tier and its rationale, the ledger rows with their results, sources, and dates, the green-flag facts for context only, the sector match, and whether research was cut short. It is not given the raw pitch or the research write-up.",
    outputs:
      "A verdict summary, one note for each row it is asked to phrase, and three to six next steps. Green flags are written by code. The identity sentence, registry status rows, candidate rows, and coverage notes keep their code-written text. Could-not-verify notes on other rows, such as customers, leaders, and performance figures, are the model's, written to a set shape that names the sources searched and the date.",
    inThisCheck: `The model writes the summary, which calls ${VENDOR} a young vendor whose claims match public records. Code screens each sentence; it may name only ${VENDOR} and its credited legal name.`,
    never:
      "It cannot change or soften a decision, and it cannot add a finding. No field exists for it to write a green flag, and neither the tier nor any row result can move. A summary sentence that says a state was searched must name a state whose registry ran. One retry follows a banned word or an uncredited company name, and if the second draft fails too, stock wording replaces everything the model wrote.",
    methodologyRef: "4-the-verdict-tiers",
  },
  {
    id: "review",
    lane: "ai",
    label: ["AI reviews", "wording"],
    title: "A second AI model reviews the wording",
    plain:
      "On reports at Tier 2 or below, with any contradicted row, or with any adversarial-content finding, a stronger AI model reads the assembled report. It looks for overclaims, misread evidence, banned words, unfair treatment of small vendors, and missed contradictions. It may only tighten wording. Each change is logged with a set label.",
    inputs:
      "A trimmed copy of the report: verdict, ledger rows, green flags, adversarial-content findings, honesty panel, and next steps. It does not see the sources, leads, or questions.",
    outputs:
      "Optional tighter text for row notes the writing model wrote and for the summary, or a request to drop an unsupported row. The stored report data records that a review ran, which model ran it, and one of three set labels for each change. The report page does not display that log.",
    inThisCheck: `${VENDOR} sits at Tier ${CLARA.verdict.tier} with no contradicted row and no adversarial-content finding, so this review does not run and the report is unchanged.`,
    never:
      "It cannot change the tier, add an adverse claim, or remove a High or Critical row, a contradicted row, an official-record row, or the identity row. It can reword only text the writing model produced; code-written sentences stay as written. Its replacement text must pass the same banned-word and company-name screens, accepted whole or rejected. A review that does not finish in its time allowance changes nothing.",
    gate: "D",
    methodologyRef: "4-the-verdict-tiers",
  },
  {
    id: "lint",
    lane: "code",
    label: ["Word", "screen"],
    title: "A word screen runs before anything ships",
    plain:
      "Code checks every sentence in the report against a published list of words the tool never uses about a named company or person. Code rewrites em dashes, and the writing rules bar the words the tool never uses about itself. Any row note, summary, or question that fails is replaced by neutral stock wording or dropped.",
    inputs:
      "Every text field in the finished report, including the notes the AI models wrote, the questions, and the arithmetic notes.",
    outputs:
      "A report with none of the barred words. Model prose is trimmed to whole sentences, and em dashes are rewritten.",
    inThisCheck: `Every sentence in the ${VENDOR} report passes the screen, so no wording is replaced.`,
    never:
      "A report that fails the screen does not ship as written. Links and ids are not prose and are skipped. The arithmetic note has a stricter rule still, which bars judging words such as 'inflated' or 'reasonable'. Rather than softening a failing note, the screen replaces it with stock wording or drops it.",
    methodologyRef: "7-language-policy",
  },
  {
    id: "report",
    lane: "code",
    label: ["Your", "report"],
    title: "The report you receive",
    plain:
      "The finished report is checked against its required form and saved. The report shows the verdict tier with 'meets N of 7 verification checks', the ledger, green flags, and any adversarial-content findings. The honesty panel, the question pack, manual check cards, leads, unassessed sources, next steps, and every source with a date follow. Each report also carries the generation date, an expiry date, the methodology version, the pack release, and the vendor dispute link.",
    inputs: "The reviewed and screened report.",
    outputs:
      "A stored report you can read and copy questions from. Its saved data records which web address the site checks used and where that address came from. On a name-only check, the honesty panel says whether the site was matched by research, found but unreadable, or not found.",
    inThisCheck: `The ${VENDOR} report shows Tier ${CLARA.verdict.tier} with ${CLARA.ledger.length} ledger rows, ${CLARA.green_flags.length} green flags, ${CLARA.questions.length} questions, and ${CLARA.manual_checks.length} manual check cards. Under the tier it prints meets ${CLARA.verdict.checks_met.met} of ${CLARA.verdict.checks_met.total}.`,
    never:
      "A report that fails the form check is not published; the run ends with a request to re-run. A finished report may be reused for the same vendor for up to 30 days, but not when an adversarial-content finding is present. The report gives no numeric score and no buy-or-not recommendation, and it must not be used for decisions about any person's employment, credit, insurance, or housing.",
    methodologyRef: "1-what-you-get",
  },
];

export const STAGES: Stage[] = STAGE_TEXT.map((s, i) => ({
  ...s,
  n: i + 1,
  who: WHO_CHIP[s.lane],
  anchors: STAGE_ANCHORS[s.id],
}));

export const STAGE_FIELD_LABELS = {
  rule: "The rule, in plain words",
  inputs: "What goes in",
  outputs: "What comes out",
  inThisCheck: `In this check: ${VENDOR}`,
  never: "What never happens here",
  gate: "Across the wall",
  method: "Read this part of the method",
  code: "Where this lives in the code",
  sources: "The sources code checks",
  tryRule: "Try this rule",
  honestyGroups: "The honesty panel's five headings",
  triggerKinds: "The five kinds of logged contradiction",
} as const;

/* The five Tier 1 trigger kinds (methodology section 4, Tier 1 list), in
   plain words. The verdict card lists them; the tier lab counts them. */
export const TRIGGER_KINDS: string[] = [
  "A definitive registration search ran, the pitch claims a U.S. company, and nothing was found.",
  "The vendor's exact name is on the federal exclusion list.",
  "A FedRAMP or GovRAMP status is claimed as current but absent from the program's own list.",
  "A cooperative contract is claimed but absent from the cooperative's own list.",
  "The web domain is younger than the history the pitch claims, and no customer could be verified.",
];

/* The worked example visible without a click: six stages whose
   'In this check' lines tell the ClaraDocs story end to end. Each line is
   a button that opens that stage's card. */
export const WORKED_EXAMPLE_STAGES: StageId[] = [
  "inputs",
  "registry",
  "ties",
  "research",
  "verdict",
  "report",
];

/* The one sentence of a worked-example line the hub shows without a press;
   the full paragraph waits in the stage card. */
export function workedLead(s: Stage): string {
  return s.inThisCheck.split(/(?<=[.!?])\s+/)[0];
}

/* The two words inside a split (AI above, code below) diagram node. */
export const DIAGRAM_LABELS = { ai: "AI", code: "Code" } as const;

/* -------------------------------------------------------------- the wall */

export interface WallGate {
  id: GateId;
  from: StageId;
  to: StageId;
  label: string;
  detail: string;
}

export const WALL_GATES: WallGate[] = [
  {
    id: "A",
    from: "ingest",
    to: "pitch-reader",
    label: "Cleaned text, marked untrusted",
    detail:
      "The cleaned text crosses, with a label saying how it arrived. The raw file stays behind, and any hidden-text finding stays on the code side.",
  },
  {
    id: "B",
    from: "pitch-reader",
    to: "vendor-site",
    label: "A limited list of facts back to code",
    detail:
      "Names, domains, addresses, people, customers, and claims quoted from the pitch cross back to code in set fields. Code keeps a customer, address, or claim quote only when it appears in the pitch word for word, then merges the website's facts under strict rules.",
  },
  {
    id: "C",
    from: "verdict",
    to: "writer",
    label: "The finished decisions",
    detail:
      "The tier, its rationale, and every row's result, source, and date cross to the writer. The writer puts them into sentences and cannot move any of them.",
  },
  {
    id: "D",
    from: "review",
    to: "lint",
    label: "Suggested rewording, accepted whole or rejected",
    detail:
      "Replacement text for notes the writer wrote crosses back, and it is accepted only when every sentence passes the same screens. A request to drop an unsupported row can also cross. Code refuses it for a High or Critical row, a contradicted row, an official-record row, or the identity row. The tier, code-written text, and every remaining row's result stay where they are.",
  },
];

export const TIER_SET_HERE = ["Tier set here,", "by code"] as const;

/* ---------------------------------------------------------- report parts */

export type PartWho = "code" | "ai" | "both";

export interface ReportPart {
  id: string;
  label: string;
  who: PartWho;
  rule: string;
}

export const PART_LEADS: Record<PartWho, string> = {
  code: "Code writes it.",
  ai: "An AI model drafts it. Code screens it.",
  both: "Code writes the parts the verdict rests on. An AI model phrases the rest, and code screens it.",
};

/* One definition of the screens, stated in the hero's second door and
   repeated under every AI-drafted part. */
export const PART_SCREEN: string = HERO.wall.doors[1].text;

/* In the order the parts appear on a report, top to bottom (Evaluation.tsx:
   DisclaimerHeader, VerdictHero with its summary, meets line and rationale,
   ReportOverview, then GreenFlags, AdvFindingCard, VerificationLedger,
   HonestyPanel, QuestionPack, ManualCheckCards, LeadsList, NextSteps,
   SourcesList). */
export const REPORT_PARTS: ReportPart[] = [
  {
    id: "date-band",
    label: "The date band",
    who: "code",
    rule: "A thin strip shows when the report was made and when it expires, and names the methodology version. The wording never changes per vendor.",
  },
  {
    id: "verdict-tier",
    label: "The verdict tier",
    who: "code",
    rule: "Code picks one of five tiers from recorded check results. No AI model can assign or raise it. There is no numeric score.",
  },
  {
    id: "summary",
    label: "The summary paragraph",
    who: "ai",
    rule: "The model drafts one paragraph from the decided verdict and ledger. It may name only the vendor and its credited legal names, and it cannot say a state was searched unless that state's registry ran. If the draft fails the screens, stock wording for that tier appears instead.",
  },
  {
    id: "meets-n-of-7",
    label: "Meets N of 7 checks",
    who: "code",
    rule: "Code counts the seven verification checks as points, and only records credited to the vendor count.",
  },
  {
    id: "rationale",
    label: "How this verdict was reached",
    who: "code",
    rule: "Each line under the verdict is set wording chosen by code. A Tier 1 or Tier 2 line also names the logged check or finding behind it. If adversarial content capped the tier, a line starting 'Verdict capped' says so. No line is written by an AI model.",
  },
  {
    id: "overview",
    label: "The report at a glance",
    who: "code",
    rule: "Code counts the claims, sources, checks, questions, and cards the report has already decided and draws them as one card. Its notices repeat facts the report already records. It adds no fact of its own.",
  },
  {
    id: "green-flags",
    label: "Green flags",
    who: "code",
    rule: "Each line is a template filled from a checked record or an official or independent page, with the source and the check date. The model has no field to write one. A source the tool could not reach never produces one.",
  },
  {
    id: "adv-card",
    label: "The adversarial-content card",
    who: "code",
    rule: "The amber card appears only when the submitted material carried hidden text, text aimed at AI, invisible characters, or the same phrasing repeated on other sites. Code screens for hidden text, text aimed at AI, and invisible characters before any model reads the pitch. The reading model can add the aimed-at-AI flag but never clear one. The repeated-phrasing finding comes from a code scan of the web pages the research step cited. No later step can remove any of these findings.",
  },
  {
    id: "row-notes",
    label: "Ledger row notes",
    who: "both",
    rule: "Code writes the identity row's sentence, the registry status rows, the candidate rows, the coverage notes, and the identity row's note when no registration was found. The model phrases the notes on the remaining rows, including most could-not-verify rows, and its rules tell it to name the sources searched and the date. If its draft fails the screens, stock wording appears instead. Only code decides a row's result.",
  },
  {
    id: "honesty-panel",
    label: "The honesty panel",
    who: "code",
    rule: "Code lists every check it tried, marked pass, flag, could not check, or not applicable, in five groups. A could-not-check row explains why and never counts against the vendor.",
  },
  {
    id: "question-pack",
    label: "The question pack",
    who: "code",
    rule: "Code picks every question from published templates and sector packs, in a set order, up to 15. The five universal questions are always present. No AI model chooses, writes, or reorders one.",
  },
  {
    id: "manual-cards",
    label: "Manual check cards",
    who: "code",
    rule: "Code adds a card when a source cannot be checked by automation. The card gives a link, what to look for, and what a bad answer looks like. A card never counts against the vendor on its own.",
  },
  {
    id: "leads",
    label: "Leads",
    who: "code",
    rule: "Code lists research pages that fit no row, up to eight, and each note says whether the page was read or only found. A lead is a follow-up for you and never counts as evidence. The section appears only when research found one, so the ClaraDocs sample has none.",
  },
  {
    id: "next-steps",
    label: "Next steps",
    who: "ai",
    rule: "The model drafts the steps from the decided report. Code screens them, and stock steps for the tier appear if the draft fails. A step can never name a company the run did not credit.",
  },
  {
    id: "sources",
    label: "Sources",
    who: "code",
    rule: "Every source the run saw, with the date it looked. Code filters the list against the run's own citations and check links, so a page the run never saw cannot appear.",
  },
];

/* --------------------------------------------------------------- controls */

export interface ControlOption {
  value: string;
  label: string;
}

export interface Control<S extends object> {
  key: keyof S & string;
  label: string;
  caption?: string;
  /* Lives in the collapsed "Rare cases" block. */
  rare?: boolean;
  options: ControlOption[];
}

/* ------------------------------------------------------------ credit lab */

export interface CreditScenario {
  match: "exact" | "contains" | "inside" | "similar";
  status: "live" | "ended";
  tie: "strong" | "state" | "none";
  age: "fits" | "old";
  root: "none" | "covers" | "nocover";
  competitor: "none" | "one";
  short: "no" | "yes";
  bridge: "no" | "yes";
  /* Not a control: only the truth table's compliance-program row sets it.
     State registries, the SEC, and SAM.gov take the symmetric rules; a
     compliance program's listing keeps the plain exact verdict here and its
     own listing rules decide its credit. */
  record?: "registry" | "program";
}

export const CREDIT_CONTROLS: Control<CreditScenario>[] = [
  {
    key: "match",
    label: "How the name matches",
    options: [
      { value: "exact", label: "Exactly" },
      { value: "contains", label: "The record's longer name contains the vendor's" },
      { value: "inside", label: "The record's shorter name sits inside the vendor's" },
      { value: "similar", label: "Similar only" },
    ],
  },
  {
    key: "status",
    label: "Registration",
    options: [
      { value: "live", label: "Live" },
      { value: "ended", label: "Ended" },
    ],
    caption: "Ended means dissolved, revoked, or forfeited.",
  },
  {
    key: "tie",
    label: "Strongest detail tying the record to the vendor",
    options: [
      { value: "strong", label: "An officer, address, or web domain" },
      { value: "state", label: "Only the same state" },
      { value: "none", label: "Nothing" },
    ],
    caption:
      "Strong means an officer or agent named in the vendor's materials or in independent coverage. An address the vendor uses, the vendor's web domain, a compliance program's own product entry, or the complete legal name you typed is strong too.",
  },
  {
    key: "age",
    label: "Record much older than the vendor",
    options: [
      { value: "fits", label: "No" },
      { value: "old", label: "Yes, more than five years" },
    ],
    caption:
      "Age is measured against the vendor's earliest known year, which is the founding year the pitch states or the year its own domain was registered.",
  },
  {
    key: "root",
    label: "Web address you typed",
    options: [
      { value: "none", label: "None" },
      { value: "covers", label: "Covers the record's name" },
      { value: "nocover", label: "Does not cover it" },
    ],
    caption:
      "This checks the name for consistency and is not a tie. A web address the tool found by search does not act as this check.",
  },
  {
    key: "competitor",
    label: "Another live record that matches the vendor's name under a different legal name",
    options: [
      { value: "none", label: "None" },
      { value: "one", label: "One, at least as well supported" },
    ],
    caption: "This rule is used only when an exact-name record has no tie at all. When two records are equally supported, both stay candidates.",
  },
  {
    key: "short",
    label: "Very short one-word name",
    rare: true,
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes, under four characters" },
    ],
    caption: "Names that short collide everywhere, even inside one state.",
  },
  {
    key: "bridge",
    label: "Found through the name bridge",
    rare: true,
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
    ],
    caption:
      "The bridge finds a fuller legal name on an official registry page during research. Such a record skips the web-address check, because the bridge exists to find a name the brand hides.",
  },
];

export const CREDIT_RARE_TITLE = "Rare cases";

export const CREDIT_DEFAULT: CreditScenario = {
  match: "exact",
  status: "live",
  tie: "strong",
  age: "fits",
  root: "covers",
  competitor: "none",
  short: "no",
  bridge: "no",
};

export interface CreditPreset {
  id: string;
  label: string;
  scenario?: CreditScenario;
  /* The preset that bypasses the credit rule: the registry could not be
     reached, so there is no record to judge. */
  coverageLimited?: true;
}

export const CREDIT_PRESETS: CreditPreset[] = [
  { id: "own", label: `${VENDOR}'s own record`, scenario: CREDIT_DEFAULT },
  {
    id: "old-namesake",
    label: "An old namesake in another state",
    scenario: { ...CREDIT_DEFAULT, tie: "none", age: "old", root: "none" },
  },
  {
    id: "ended-untied",
    label: "An ended record nothing ties",
    scenario: { ...CREDIT_DEFAULT, status: "ended", tie: "none", root: "none" },
  },
  {
    id: "longer-name-state",
    label: "A longer legal name with only a state match",
    scenario: { ...CREDIT_DEFAULT, match: "contains", tie: "state", root: "none" },
  },
  {
    id: "bare-name",
    label: "A bare-name check with one untied record",
    scenario: { ...CREDIT_DEFAULT, tie: "none", root: "none" },
  },
  {
    id: "two-equal",
    label: "Two equally supported matching records",
    scenario: { ...CREDIT_DEFAULT, tie: "none", root: "none", competitor: "one" },
  },
  { id: "unreachable", label: "The registry could not be reached", coverageLimited: true },
];

export type Attribution = "attributed" | "candidate";

export type RuleId =
  | "gate-ended"
  | "gate-short"
  | "exact-1"
  | "exact-2"
  | "exact-3"
  | "exact-4"
  | "exact-5"
  | "contains-1"
  | "contains-2"
  | "contains-3"
  | "contains-4"
  | "inside-1"
  | "inside-2"
  | "else";

export interface TruthRow {
  id: RuleId;
  group: string;
  situation: string;
  rule: string;
  /* The result column, worded for both outcomes where a row has two. */
  result: string;
  /* The outcome for `example`. */
  outcome: Attribution;
  example: CreditScenario;
}

const BASE: CreditScenario = { ...CREDIT_DEFAULT, root: "none" };

export const TRUTH_TABLE_GROUPS = {
  gates: "Two checks run first",
  exact: "Exact name, live record",
  contains: "The record's longer name contains the vendor's",
  inside: "The record's shorter name sits inside the vendor's",
  other: "Everything else",
} as const;

export const TRUTH_TABLE: TruthRow[] = [
  {
    id: "gate-ended",
    group: TRUTH_TABLE_GROUPS.gates,
    situation: "Registration ended",
    rule: "The record needs a strong tie. Without one, it stays a candidate with a one-line question to the vendor.",
    result: "With a strong tie the record goes on to the rules below. Without one, it is a candidate.",
    outcome: "candidate",
    example: { ...BASE, status: "ended", tie: "none" },
  },
  {
    id: "gate-short",
    group: TRUTH_TABLE_GROUPS.gates,
    situation: "One-word name under four characters",
    rule: "Names that short collide everywhere. Credited only with a strong tie, whatever else the record offers.",
    result: "With a strong tie the record is credited. Without one, it is a candidate.",
    outcome: "candidate",
    example: { ...BASE, tie: "state", short: "yes" },
  },
  {
    id: "exact-1",
    group: TRUTH_TABLE_GROUPS.exact,
    situation: "Strong tie",
    rule: "A strong tie is always enough. It also overrides both blocks in the next row.",
    result: "Credited",
    outcome: "attributed",
    example: { ...BASE, tie: "strong" },
  },
  {
    id: "exact-2",
    group: TRUTH_TABLE_GROUPS.exact,
    situation: "No strong tie, and a block applies",
    rule: "One of two blocks applies. Either the record is much older than the vendor, or the web address you typed does not cover its name.",
    result: "Candidate",
    outcome: "candidate",
    example: { ...BASE, tie: "state", age: "old" },
  },
  {
    id: "exact-3",
    group: TRUTH_TABLE_GROUPS.exact,
    situation: "Any tie, even only the state",
    rule: "A matching state is enough to support credit. It cannot produce a warning.",
    result: "Credited",
    outcome: "attributed",
    example: { ...BASE, tie: "state" },
  },
  {
    id: "exact-4",
    group: TRUTH_TABLE_GROUPS.exact,
    situation: "A compliance program's own listing",
    rule: "A compliance program's own listing is credited here, and the program's listing rules decide its credit.",
    result: "Credited",
    outcome: "attributed",
    example: { ...BASE, tie: "none", record: "program" },
  },
  {
    id: "exact-5",
    group: TRUTH_TABLE_GROUPS.exact,
    situation: "No tie at all",
    rule: "Code counts every live record with that exact name across the registries it searched.",
    result: "If it is the only live record with that name, or the one held by more registries, it is credited. If another record is held by as many registries, it is a candidate.",
    outcome: "attributed",
    example: { ...BASE, tie: "none" },
  },
  {
    id: "contains-1",
    group: TRUTH_TABLE_GROUPS.contains,
    situation: "Strong tie",
    rule: "The record is treated as the vendor's own.",
    result: "Credited",
    outcome: "attributed",
    example: { ...BASE, match: "contains", tie: "strong" },
  },
  {
    id: "contains-2",
    group: TRUTH_TABLE_GROUPS.contains,
    situation: "No strong tie, and a block applies",
    rule: "The age block or the web-address block applies.",
    result: "Candidate",
    outcome: "candidate",
    example: { ...BASE, match: "contains", tie: "state", age: "old" },
  },
  {
    id: "contains-3",
    group: TRUTH_TABLE_GROUPS.contains,
    situation: "Any tie",
    rule: "The record is treated as the vendor's own.",
    result: "Credited",
    outcome: "attributed",
    example: { ...BASE, match: "contains", tie: "state" },
  },
  {
    id: "contains-4",
    group: TRUTH_TABLE_GROUPS.contains,
    situation: "No tie",
    rule: "It is not credited, even when nothing competes.",
    result: "Candidate",
    outcome: "candidate",
    example: { ...BASE, match: "contains", tie: "none" },
  },
  {
    id: "inside-1",
    group: TRUTH_TABLE_GROUPS.inside,
    situation: "Strong tie",
    rule: "A shared officer or address is a strong tie for a shorter-named record.",
    result: "Credited",
    outcome: "attributed",
    example: { ...BASE, match: "inside", tie: "strong" },
  },
  {
    id: "inside-2",
    group: TRUTH_TABLE_GROUPS.inside,
    situation: "Only the state, or no tie",
    rule: "A shared state does not support credit for a shorter-named record.",
    result: "Candidate",
    outcome: "candidate",
    example: { ...BASE, match: "inside", tie: "state" },
  },
  {
    id: "else",
    group: TRUTH_TABLE_GROUPS.other,
    situation: "Similar name, neither contains the other",
    rule: "The record is shown with its link and label and stays a candidate.",
    result: "Candidate",
    outcome: "candidate",
    example: { ...BASE, match: "similar", tie: "none" },
  },
];

export const TRUTH_TABLE_HEADERS = {
  situation: "Situation",
  rule: "Rule",
  result: "Result",
  live: "applies",
} as const;

/* Illustrative record names. Nothing here is a real company. */
const RECORD_NAMES: Record<CreditScenario["match"], string> = {
  exact: "CLARADOCS, INC.",
  contains: "CLARADOCS TECHNOLOGIES US, INC.",
  inside: "CLARA, LLC",
  similar: "CLARADOX, INC.",
};
const SHORT_RECORD = "ZUQ, INC.";
const SHORT_VENDOR = "Zuq";
const RECORD_YEAR_FITS = 2024;
const RECORD_YEAR_OLD = 2012;

export function creditScenarioToInputs(s: CreditScenario): {
  facts: RecordTieFacts;
  tie: TieEvidence;
  guard: Partial<AttributionGuard>;
} {
  const facts: RecordTieFacts = {
    legal_name: s.short === "yes" ? SHORT_RECORD : RECORD_NAMES[s.match],
    registration_state: "CO",
    jurisdiction: "CO",
    formation_year: s.age === "old" ? RECORD_YEAR_OLD : RECORD_YEAR_FITS,
    ...(s.match === "exact"
      ? { match_confidence: "exact" as const }
      : { match_confidence: "name_similarity" as const }),
    ...(s.match === "contains" ? { containment: "query_in_record" as const } : {}),
    ...(s.match === "inside" ? { containment: "record_in_query" as const } : {}),
    ...(s.status === "ended" ? { dissolved: true } : {}),
  };
  const tie: TieEvidence = {
    tied: s.tie !== "none",
    strong: s.tie === "strong",
    checkable: true,
    signals: [],
    ...(s.age === "old" ? { age_contradicted: true } : {}),
  };
  const guard: Partial<AttributionGuard> = {
    symmetric: s.record !== "program",
    rootCovered: s.root === "none" ? null : s.root === "covers",
    bridged: s.bridge === "yes",
    anchor: s.competitor === "none",
  };
  return { facts, tie, guard };
}

/* Names the rule that decides a case, walking attributionFor's order: the
   two gates, then the exact rows, the contains rows, the inside rows, else. */
export function whichRule(s: CreditScenario): { ruleId: RuleId; outcome: Attribution } {
  const strong = s.tie === "strong";
  const tied = s.tie !== "none";
  const symmetric = s.record !== "program";
  const rootCovered = s.root === "none" ? null : s.root === "covers";
  const bridged = s.bridge === "yes";
  const anchor = s.competitor === "none";
  if (s.status === "ended" && !strong) return { ruleId: "gate-ended", outcome: "candidate" };
  if (s.short === "yes") {
    return { ruleId: "gate-short", outcome: strong ? "attributed" : "candidate" };
  }
  const vetoed =
    symmetric && !strong && (s.age === "old" || (rootCovered === false && !bridged));
  if (s.match === "exact") {
    if (strong) return { ruleId: "exact-1", outcome: "attributed" };
    if (vetoed) return { ruleId: "exact-2", outcome: "candidate" };
    if (tied) return { ruleId: "exact-3", outcome: "attributed" };
    if (!symmetric) return { ruleId: "exact-4", outcome: "attributed" };
    return { ruleId: "exact-5", outcome: anchor ? "attributed" : "candidate" };
  }
  if (s.match === "contains") {
    if (strong) return { ruleId: "contains-1", outcome: "attributed" };
    if (vetoed) return { ruleId: "contains-2", outcome: "candidate" };
    return tied
      ? { ruleId: "contains-3", outcome: "attributed" }
      : { ruleId: "contains-4", outcome: "candidate" };
  }
  if (s.match === "inside") {
    return strong
      ? { ruleId: "inside-1", outcome: "attributed" }
      : { ruleId: "inside-2", outcome: "candidate" };
  }
  return { ruleId: "else", outcome: "candidate" };
}

/* Controls that cannot change the current result: shown as "no effect
   here" so a reader can tell which switches matter for the case at hand. */
export function inertCreditControls(s: CreditScenario): Set<keyof CreditScenario> {
  const base = whichRule(s);
  const inert = new Set<keyof CreditScenario>();
  for (const c of CREDIT_CONTROLS) {
    const moves = c.options.some((o) => {
      if (o.value === s[c.key]) return false;
      const r = whichRule({ ...s, [c.key]: o.value } as CreditScenario);
      return r.ruleId !== base.ruleId || r.outcome !== base.outcome;
    });
    if (!moves) inert.add(c.key);
  }
  return inert;
}

export const CREDIT_STAMPS: Record<Attribution, string> = {
  attributed: "Credited to this vendor",
  candidate: "Candidate record",
};

export interface EffectTile {
  question: string;
  answer: "Yes" | "No" | "Only with a strong tie";
  /* The tile's color follows the meaning, never the answer's text: a
     warning that can fire is a warn tone even when the answer is Yes. */
  tone: "good" | "warn" | "muted";
  detail: string;
}

export interface CreditResult {
  verdict: Attribution;
  ruleId: RuleId;
  row: TruthRow;
  stamp: string;
  effects: EffectTile[];
  sentence: string;
  ledger: {
    result: LedgerResult;
    resultLabel: string;
    evidenceTier: EvidenceTier;
    candidate: boolean;
    severity: "Critical" | null;
    caption: string;
  };
  knownGap: string | null;
  collision: string | null;
}

export const KNOWN_GAP_NOTE =
  "This is a known gap. On a bare-name check the tool may have no vendor-side fact to tell two same-name companies apart. If the only live record under that exact name belongs to a different company, the tool can credit it. Typing the vendor's web address beside the name closes most of this gap.";

export const COLLISION_NOTE =
  "Two or more live records share this exact name and nothing ties either to the vendor. The honesty panel carries a name-collision notice under Needs your attention. It does not change the verdict.";

export const EFFECT_QUESTIONS = {
  identity: "Counts toward identity?",
  green: "Can earn a green flag?",
  warning: "Can produce a warning?",
} as const;

/* The two chips the page hardcoded before the rewrite, so the lint sees
   them, and the one-line key that reads the chip row for a newcomer. */
export const LEDGER_CHIP_LABELS = { dimension: "D1", candidate: "Candidate record" } as const;

export const CHIP_KEY =
  "The chips read left to right. The first is the row's result. The second is its evidence grade, from T1 (a public record the tool fetched) to T4 (searched and could not confirm). The third is the area of the check, and D1 means identity and registration.";

/* The full key behind the chip-key fold. The evidence grades follow the
   ledger's own badge titles (VerificationLedger.tsx TIER_TITLES) and the
   methodology's section 3 table; the areas are the methodology's seven
   dimension headings, word for word, so the anchors the report links to
   and the names here can never drift. A test holds both. */
export const CHIP_KEY_TIERS: { code: EvidenceTier; text: string }[] = [
  {
    code: "T1",
    text: "T1 is a verified public record, such as a government registry or official feed, that the tool fetched and logged with a link and date.",
  },
  {
    code: "T2",
    text: "T2 is vendor-published, meaning the vendor's own site or documents, and the report always says the vendor is the one speaking.",
  },
  {
    code: "T3",
    text: "T3 is third-party coverage, such as press or conference programs, named and dated in the note.",
  },
  {
    code: "T4",
    text: "T4 means the tool searched public sources and could not corroborate the claim, which is not proof it is false.",
  },
];

export const CHIP_KEY_DIMENSIONS: { code: Dimension; name: string }[] = [
  { code: "D1", name: "Identity and registration" },
  { code: "D2", name: "Government track record" },
  { code: "D3", name: "Security and compliance posture" },
  { code: "D4", name: "Technical substance" },
  { code: "D5", name: "Team credibility" },
  { code: "D6", name: "Claims hygiene" },
  { code: "D7", name: "Sector fit and risk tier" },
];

export const LEDGER_CAPTIONS = {
  credited: "This becomes the identity row once a second independent record agrees.",
  ended: "The record row, written by code.",
  candidate: "The candidate row, written by code.",
} as const;

function tieSentence(s: CreditScenario, vendor: string): string {
  if (s.tie === "strong") {
    return "The record lists an officer named in the pitch, a strong tie.";
  }
  if (s.tie === "state") {
    return "The record's state matches the state in the pitch. That is the only tie, and it is weak.";
  }
  return `Nothing on the record ties it to ${vendor}.`;
}

export function runCredit(s: CreditScenario): CreditResult {
  const { facts, tie, guard } = creditScenarioToInputs(s);
  const verdict = attributionFor(facts, tie, guard);
  const { ruleId } = whichRule(s);
  const row = TRUTH_TABLE.find((r) => r.id === ruleId)!;
  const credited = verdict === "attributed";
  const ended = s.status === "ended";
  const strong = s.tie === "strong";
  const vendor = s.short === "yes" ? `${SHORT_VENDOR} (invented)` : VENDOR;
  const where =
    s.record === "program"
      ? "A compliance program's own list"
      : "The Colorado business registry";

  const parts: string[] = [];
  parts.push(`${where} lists ${facts.legal_name} (illustrative record).`);
  parts.push(
    ended
      ? "The registration has ended: Voluntarily Dissolved."
      : `The registration is live, formed ${facts.formation_year}.`,
  );
  parts.push(tieSentence(s, vendor));
  if (s.age === "old") {
    parts.push(
      `The record was formed in ${RECORD_YEAR_OLD}, more than five years before the vendor's earliest known year, ${RECORD_YEAR_FITS}.`,
    );
  }
  if (s.root === "covers") {
    parts.push("You typed the vendor's web address beside the name; its root name covers the record's name.");
  } else if (s.root === "nocover") {
    parts.push(
      s.bridge === "yes"
        ? "You typed a web address whose root name does not cover the record's name, but the record came through the name bridge, so that check does not apply."
        : "You typed a web address whose root name does not cover the record's name.",
    );
  }
  if (ruleId === "exact-5") {
    parts.push(
      s.competitor === "one"
        ? "Another live record, CLARADOCS, LLC, also matches the vendor's name under a different legal name, and it is held by at least as many registries as this one."
        : "No other live record matching the vendor's name competes.",
    );
  }
  if (credited && !ended) {
    parts.push(
      `It is credited to ${vendor}. It can stand as one of the two records identity needs. Once a second record agrees, code writes its green flag.`,
    );
  } else if (credited && ended) {
    parts.push(
      `It is credited to ${vendor}. The record proves the company existed; the ended status is the finding. The report asks which legal entity would sign a contract today.`,
    );
  } else if (ended) {
    parts.push(
      "It is a candidate record. The report adds a one-line question to the vendor rather than a finding, and the record earns no credit and drives no warning.",
    );
  } else {
    parts.push(
      "The record is shown for your review, with its link. It earns no credit and drives no warning. The report asks the vendor for its legal entity name and state of registration.",
    );
  }

  const effects: EffectTile[] = [
    {
      question: EFFECT_QUESTIONS.identity,
      answer: credited ? "Yes" : "No",
      tone: credited ? "good" : "muted",
      detail: credited
        ? ended
          ? "A credited record counts, even an ended one. The ended status becomes the finding."
          : "It counts as one of the two independent records identity needs."
        : "A candidate does not count toward identity.",
    },
    {
      question: EFFECT_QUESTIONS.green,
      answer: credited && !ended ? "Yes" : "No",
      tone: credited && !ended ? "good" : "muted",
      detail:
        credited && !ended
          ? "Once a second independent record agrees, code writes it from this record, with the source and the check date."
          : credited
            ? "The record proves the company existed, and the ended status is the finding, so no green flag is written."
            : "It is shown for your review only.",
    },
    {
      question: EFFECT_QUESTIONS.warning,
      answer: !credited ? "No" : ended && strong ? "Yes" : "Only with a strong tie",
      tone: !credited ? "muted" : "warn",
      detail: !credited
        ? "A candidate cannot produce a warning."
        : ended && strong
          ? "A credited ended registration is a finding that names the tying detail: Critical in the home state, High elsewhere."
          : strong
            ? "This record has a strong tie, and nothing on it is adverse here."
            : "A state match alone cannot produce a warning. An ended registration produces one only with a strong tie.",
    },
  ];

  const ledgerResult: LedgerResult =
    credited && !ended ? "VERIFIED" : ended ? "OFFICIAL_RECORD_FOUND" : "COULD_NOT_VERIFY";

  return {
    verdict,
    ruleId,
    row,
    stamp: CREDIT_STAMPS[verdict],
    effects,
    sentence: parts.join(" "),
    ledger: {
      result: ledgerResult,
      resultLabel: RESULT_LABELS[ledgerResult],
      evidenceTier: ledgerResult === "COULD_NOT_VERIFY" ? "T4" : "T1",
      candidate: !credited,
      severity: credited && ended ? "Critical" : null,
      caption:
        credited && !ended
          ? LEDGER_CAPTIONS.credited
          : ended && credited
            ? LEDGER_CAPTIONS.ended
            : LEDGER_CAPTIONS.candidate,
    },
    knownGap: ruleId === "exact-5" && credited && s.root === "none" ? KNOWN_GAP_NOTE : null,
    collision: ruleId === "exact-5" && !credited && s.root === "none" ? COLLISION_NOTE : null,
  };
}

/* The registry could not be reached: no record to judge, so the credit
   rule never runs. Mirrors what the report shows in that case. */
export const COVERAGE_LIMITED_CARD = {
  title: "The registry could not be reached",
  lead: `Suppose the Colorado business registry was down during the ${VENDOR} check, and no other registry held its record.`,
  row: {
    result: "COVERAGE_LIMITED" as LedgerResult,
    resultLabel: RESULT_LABELS.COVERAGE_LIMITED,
    evidenceTier: "T4" as EvidenceTier,
    whatCheckedLabel: "What we checked:",
    whatChecked: "Whether a registered legal entity exists under any name the pitch uses",
    note: "The Colorado business registry could not be checked this run; the honesty panel says why. Absence here is not proof the company does not exist. Ask the vendor for its state of registration and search that state's official registry directly; it takes about a minute.",
  },
  honesty: {
    group: HONESTY_GROUPS.find((g) => g.id === "needs_you")!.label,
    label: "Colorado business registry",
    status: "Could not check",
    reason:
      "The Colorado business registry could not be reached during this run. This says nothing about the vendor. You can search Colorado's official site directly at the link; it takes about a minute.",
    groupNote: `This row sits under ${HONESTY_GROUPS.find((g) => g.id === "needs_you")!.label} because the report carries a manual card for it. Without a card it sits under ${HONESTY_GROUPS.find((g) => g.id === "unavailable")!.label}.`,
  },
  manual: {
    label: "State business registry search",
    instructions: `Search the state registry yourself. Look up "${VENDOR}" in the company's home state. The link opens the official search page.`,
    whatBadLabel: "What bad looks like:",
    whatBad:
      "No registration under any name the vendor uses, or a registration only weeks old for a company claiming years of work.",
  },
  rule: "Nothing here counts for or against the vendor. It cannot produce a logged contradiction or lower a verdict.",
} as const;

/* -------------------------------------------------------------- tier lab */

export interface TierScenario {
  resolvable: "yes" | "no";
  contradictions: "0" | "1" | "2";
  identity: "yes" | "no";
  openHigh: "none" | "one";
  green: "0" | "1" | "2" | "3" | "4" | "5";
  startup: "yes" | "no";
  adv: "none" | "caps" | "info" | "web";
  /* Not a control: which open finding the FedRAMP scenario carries. */
  finding?: "customer" | "fedramp";
}

export const TIER_CONTROLS: Control<TierScenario>[] = [
  {
    key: "resolvable",
    label: "Anything to research?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
    caption: "Yes means a company name or website that resolves to a company the tool can look up.",
  },
  {
    key: "contradictions",
    label: "Logged contradictions from registry checks",
    options: [
      { value: "0", label: "0" },
      { value: "1", label: "1" },
      { value: "2", label: "2 or more" },
    ],
    caption:
      "A contradiction is a claim in the pitch that an official list, checked this run, does not support. One example is 'FedRAMP Authorized' when the FedRAMP marketplace does not list the vendor. Only a search that ran can count.",
  },
  {
    key: "identity",
    label: "Identity resolved on two records?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
    caption:
      "Identity is resolved when two independent public records agree that a registered company stands behind the pitch. At least one is a registry record credited to the vendor under the rule in section 02. The other may be a second credited record or the registration record of the vendor's own web domain. When that domain lookup was down, the domain's working mail records or certificate logs can stand in.",
  },
  {
    key: "openHigh",
    label: "Open High or Critical finding?",
    options: [
      { value: "none", label: "None" },
      { value: "one", label: "One" },
    ],
    caption:
      "Every adverse finding carries a weight: Critical, High, Medium, Low, or Info. A finding is open when later evidence did not resolve it.",
  },
  {
    key: "green",
    label: "Areas with a verified green flag",
    options: ["0", "1", "2", "3", "4", "5"].map((v) => ({ value: v, label: v })),
    caption:
      "An area is one of the seven groups of checks. Only five can carry a verified green flag: identity, government track record, security and compliance, technical substance, and team. The claims and sector fit checks produce findings, context, and questions, but no green flag. Up to four count toward the seven points.",
  },
  {
    key: "startup",
    label: "Startup bar met?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
    caption:
      "The startup bar is what a young company can fairly be asked to show. Code marks it met on any one of four things. Those are a GovRAMP listing at any level, a verified named customer, a federal award record, or an SEC filing, and each record must be credited to this vendor. A SOC 2 report or a signed data agreement has no public registry, so neither counts here, and the question pack asks for the SOC 2 report instead. Meeting the bar changes one sentence of the Tier 3 wording.",
  },
  {
    key: "adv",
    label: "Anything in what you submitted aimed at a machine?",
    options: [
      { value: "none", label: "Nothing" },
      { value: "caps", label: "Hidden text, text aimed at AI, or invisible characters" },
      { value: "info", label: "An ordinary hidden web-page part, noted only" },
      { value: "web", label: "The same phrasing repeated on other sites" },
    ],
    caption:
      "The first kind caps the verdict at Tier 2. The other two are reported and do not move the tier.",
  },
];

export interface TierPreset {
  id: string;
  label: string;
  scenario: TierScenario;
  tier: VerdictTier;
  met: number;
  /* The sample report this preset reproduces, when there is one. */
  sample?: keyof typeof SAMPLE_REPORTS;
  footnote?: string;
}

const CLEAN: TierScenario = {
  resolvable: "yes",
  contradictions: "0",
  identity: "yes",
  openHigh: "none",
  green: "4",
  startup: "yes",
  adv: "none",
};

export const TIER_PRESETS: TierPreset[] = [
  {
    id: "meridian",
    label: "Meridian Call AI (sample, fictional)",
    scenario: CLEAN,
    tier: 4,
    met: 7,
    sample: "meridian",
  },
  {
    id: "claradocs",
    label: VENDOR_FULL,
    scenario: { ...CLEAN, green: "2" },
    tier: 3,
    met: 5,
    sample: "claradocs",
  },
  {
    id: "kestrel",
    label: "Kestrel Permit AI (sample, fictional)",
    scenario: { ...CLEAN, green: "1", openHigh: "one" },
    tier: 2,
    met: 3,
    sample: "kestrel",
  },
  {
    id: "swiftgov",
    label: "SwiftGov AI (sample, fictional)",
    scenario: {
      ...CLEAN,
      contradictions: "2",
      identity: "no",
      openHigh: "one",
      green: "0",
      startup: "no",
    },
    tier: 1,
    met: 0,
    sample: "swiftgov",
  },
  {
    id: "nothing",
    label: "Nothing to research",
    scenario: {
      ...CLEAN,
      resolvable: "no",
      identity: "no",
      green: "0",
      startup: "no",
    },
    tier: 0,
    met: 1,
    footnote:
      "Meets 1 of 7 because the no-open-finding point still counts. Nothing was found, so nothing is open.",
  },
];

export const TIER_DEFAULT: TierScenario = TIER_PRESETS[1].scenario;

export interface FedrampScenario {
  id: string;
  label: string;
  scenario: TierScenario;
  tier: VerdictTier;
  note: string;
}

export const FEDRAMP_TITLE = "One claim, three ways: FedRAMP";
export const FEDRAMP_LEAD = `Start from ${VENDOR} and change one sentence in the pitch.`;
export const FEDRAMP_PICK = "Pick the claim";

export const FEDRAMP_SCENARIOS: FedrampScenario[] = [
  {
    id: "none",
    label: "No FedRAMP claim",
    scenario: TIER_DEFAULT,
    tier: 3,
    note: "Having no FedRAMP status is neutral for a vendor selling to state and local government.",
  },
  {
    id: "authorized",
    label: '"FedRAMP Authorized", but not on the program\'s own list',
    scenario: { ...TIER_DEFAULT, contradictions: "1", openHigh: "one", finding: "fedramp" },
    tier: 2,
    note: "A current-status claim absent from the official feed is a logged contradiction and a Critical finding. One contradiction is not enough for Tier 1.",
  },
  {
    id: "in-process",
    label: '"FedRAMP in process"',
    scenario: TIER_DEFAULT,
    tier: 3,
    note: "Pending wording does not log a contradiction. It becomes a question to the vendor.",
  },
];

const TRIGGER_DETAILS = {
  fedramp:
    'the pitch states "FedRAMP Authorized" as a current status; the FedRAMP marketplace feed, checked this run, does not list the vendor',
  govramp:
    "the pitch states GovRAMP Authorized as a current status; the GovRAMP participant list, checked this run, does not list the vendor",
};

const FINDING_DETAILS = {
  customer:
    "the pitch names a state agency as a customer, and a full search found no public trace of that agency using the product",
  fedramp:
    'the pitch states "FedRAMP Authorized" as a current status; the program\'s own marketplace feed does not list the vendor',
};

const ADV_DETAILS = {
  caps: "the submitted material carried text addressed to automated readers rather than to you",
  info: "the submitted web page carried ordinary hidden parts, such as menu labels, that a reader does not see",
  web: "the same marketing phrasing appears on other sites that present as independent",
};

const DIMENSIONS = ["D1", "D2", "D3", "D4", "D5"];

export function tierScenarioToInputs(s: TierScenario): TierInputs {
  const t1_triggers: T1Trigger[] = [];
  const n = Number(s.contradictions);
  if (n >= 1) {
    t1_triggers.push({
      trigger: "compliance_registry_contradiction",
      check_id: "fedramp_marketplace",
      detail: TRIGGER_DETAILS.fedramp,
      evidence_url: null,
    });
  }
  if (n >= 2) {
    t1_triggers.push({
      trigger: "compliance_registry_contradiction",
      check_id: "govramp",
      detail: TRIGGER_DETAILS.govramp,
      evidence_url: null,
    });
  }
  const findings: Finding[] =
    s.openHigh === "one"
      ? [
          s.finding === "fedramp"
            ? {
                id: "fedramp-1",
                dimension: "D3",
                severity: "CRITICAL",
                resolved: false,
                detail: FINDING_DETAILS.fedramp,
              }
            : {
                id: "hw-1",
                dimension: "D2",
                severity: "HIGH",
                resolved: false,
                detail: FINDING_DETAILS.customer,
              },
        ]
      : [];
  const adv_findings: AdvFinding[] =
    s.adv === "caps"
      ? [{ code: "ADV-02", detail: ADV_DETAILS.caps }]
      : s.adv === "info"
        ? [{ code: "ADV-01", detail: ADV_DETAILS.info, informational: true }]
        : s.adv === "web"
          ? [{ code: "ADV-04", detail: ADV_DETAILS.web }]
          : [];
  return {
    resolvable: s.resolvable === "yes",
    identity_resolved: s.identity === "yes",
    t1_triggers,
    findings,
    green_dimensions: DIMENSIONS.slice(0, Number(s.green)),
    startup_bar_met: s.startup === "yes",
    adv_findings,
  };
}

export function runTier(s: TierScenario): { inputs: TierInputs; decision: TierDecision } {
  const inputs = tierScenarioToInputs(s);
  return { inputs, decision: computeTier(inputs) };
}

export type StepOutcome = "Passed" | "Applies" | "Not reached";
export type CapOutcome = "Applies" | "No change" | "Not present";

export interface TierStep {
  id: string;
  question: string;
  rule: string;
  tier: VerdictTier;
}

export const TIER_STEPS: TierStep[] = [
  {
    id: "nothing",
    question: "Anything to research?",
    rule: "If nothing resolves to a company name or website, the verdict is Tier 0. The report records no warning against the vendor.",
    tier: 0,
  },
  {
    id: "triggers",
    question: "Two or more contradictions logged by code?",
    rule: "Two or more logged contradictions set Tier 1. One contradiction is not enough, and a source the tool could not reach cannot produce one.",
    tier: 1,
  },
  {
    id: "identity",
    question: "Identity unresolved?",
    rule: "An unresolved identity sets Tier 0, because public sources did not agree on a registered company. Missing information never reaches Tier 1.",
    tier: 0,
  },
  {
    id: "open",
    question: "Any High or Critical finding still open?",
    rule: "An open High or Critical finding sets Tier 2. Medium, Low, and Info findings never move the tier.",
    tier: 2,
  },
  {
    id: "green",
    question: "Three or more areas with a verified green flag?",
    rule: "Three or more green areas set Tier 4. Only official or independent evidence turns an area green.",
    tier: 4,
  },
  {
    id: "otherwise",
    question: "Otherwise",
    rule: "Everything else lands at Tier 3. Identity is resolved, nothing is open at High or Critical, and fewer than three areas are green.",
    tier: 3,
  },
];

export const TIER_CAP_STEP = {
  question: "Last, the cap",
  rule: "The verdict cannot sit above Tier 2 when what you submitted carried hidden text, text aimed at AI, or invisible characters. The cap can only lower a verdict.",
} as const;

export interface StepOutcomes {
  steps: { id: string; outcome: StepOutcome }[];
  appliedStepId: string;
  cap: CapOutcome;
  /* What the walk says the tier should be; the test holds it against
     decision.tier so the ladder can never disagree with computeTier. */
  expectedTier: VerdictTier;
}

export function stepOutcomes(inputs: TierInputs, decision: TierDecision): StepOutcomes {
  const unresolvedHigh = inputs.findings.filter(
    (f) => !f.resolved && (f.severity === "HIGH" || f.severity === "CRITICAL"),
  ).length;
  const tests: boolean[] = [
    !inputs.resolvable,
    inputs.t1_triggers.length >= 2,
    !inputs.identity_resolved,
    unresolvedHigh > 0,
    inputs.green_dimensions.length >= 3,
    true,
  ];
  let applied = -1;
  const steps = TIER_STEPS.map((step, i) => {
    let outcome: StepOutcome;
    if (applied >= 0) outcome = "Not reached";
    else if (tests[i]) {
      outcome = "Applies";
      applied = i;
    } else outcome = "Passed";
    return { id: step.id, outcome };
  });
  const before = TIER_STEPS[applied].tier;
  const capping = inputs.adv_findings.some(isCeilingAdvFinding);
  const cap: CapOutcome = !capping ? "Not present" : before > 2 ? "Applies" : "No change";
  const expectedTier: VerdictTier = cap === "Applies" ? 2 : before;
  void decision;
  return { steps, appliedStepId: TIER_STEPS[applied].id, cap, expectedTier };
}

export const CAP_EXPLANATIONS = {
  caps: "This finding caps the verdict at Tier 2. It can only lower a verdict.",
  info: "This is noted only and never caps the verdict. An ordinary hidden web-page part is reported as information.",
  web: "This is reported with the sites named, and it never moves the tier.",
  none: "Nothing aimed at a machine was found in what you submitted.",
} as const;

export function capExplanation(findings: AdvFinding[]): string {
  if (findings.some(isCeilingAdvFinding)) return CAP_EXPLANATIONS.caps;
  if (findings.some((f) => CEILING_ADV_CODES.has(f.code) && f.informational === true)) {
    return CAP_EXPLANATIONS.info;
  }
  if (findings.some((f) => f.code === "ADV-04")) return CAP_EXPLANATIONS.web;
  return CAP_EXPLANATIONS.none;
}

export interface Point {
  id: string;
  label: string;
}

export const POINTS: Point[] = [
  { id: "identity-1", label: "Identity, first record" },
  { id: "identity-2", label: "Identity, second record" },
  { id: "green-1", label: "Green area 1" },
  { id: "green-2", label: "Green area 2" },
  { id: "green-3", label: "Green area 3" },
  { id: "green-4", label: "Green area 4" },
  { id: "no-open", label: "No open High or Critical finding" },
];

/* The seven points grouped the way the rule counts them: identity resolved
   is worth two, each verified green area one (up to four), and no open High
   or Critical finding the last. The page draws one pip per point and one
   label per group. */
export interface PointGroup {
  id: string;
  label: string;
  points: Point[];
}

export const POINT_GROUPS: PointGroup[] = [
  { id: "identity", label: "Identity resolved on two records", points: POINTS.slice(0, 2) },
  { id: "green", label: "Areas with a verified green flag", points: POINTS.slice(2, 6) },
  { id: "no-open", label: "No open High or Critical finding", points: POINTS.slice(6) },
];

export function pointsMet(inputs: TierInputs): Record<string, boolean> {
  const unresolvedHigh = inputs.findings.some(
    (f) => !f.resolved && (f.severity === "HIGH" || f.severity === "CRITICAL"),
  );
  const green = Math.min(inputs.green_dimensions.length, 4);
  return {
    "identity-1": inputs.identity_resolved,
    "identity-2": inputs.identity_resolved,
    "green-1": green >= 1,
    "green-2": green >= 2,
    "green-3": green >= 3,
    "green-4": green >= 4,
    "no-open": !unresolvedHigh,
  };
}

export interface Rung {
  tier: VerdictTier;
  label: string;
  short: string;
}

export const TIER_LADDER: Rung[] = ([4, 3, 2, 1, 0] as VerdictTier[]).map((t) => ({
  tier: t,
  label: TIER_LABELS[t],
  short: ["Not enough to evaluate", "Could not verify legitimacy", "Significant gaps", "Emerging vendor", "Established vendor"][t],
}));

export const LADDER_TEXT = {
  here: "you are here",
  cap: "cap: never above Tier 2",
  /* Two lines, so the foot sits in the ladder's label column without
     running past the right rail. */
  foot: ["Only code sets the tier.", "No AI model can raise it."],
  rung: (r: Rung) => `Tier ${r.tier}: ${r.short}`,
  title: "The five tiers as a ladder",
  desc: "Five rungs from Tier 0 at the bottom to Tier 4 at the top. A marker shows where the current inputs land. A dashed line at Tier 2 appears when content in the submitted material caps the verdict.",
} as const;

export const TIER_RESULT_LABELS = {
  meets: (met: number, total: number) => `Meets ${met} of ${total} verification checks`,
  tier: (tier: number) => `Tier ${tier}`,
  plain: "In plain words",
  exact: "The lines the report prints",
  exactNote: "The verdict code writes these lines. In a line about one check or one open finding, the detail after the colon is this page's stand-in for what a real report would print there.",
  /* The bottom jump pill: one line of readout, and its spoken label. */
  readout: (tier: number, met: number, total: number) => `Tier ${tier}, meets ${met} of ${total} verification checks`,
  jump: (readout: string) => `${readout}. Jump to the result.`,
  cap: "Cap",
  steps: "The six steps, in the order code runs them",
  points: "The seven verification checks, as points",
  pointMet: "met",
  pointNotMet: "not met",
} as const;

/* What 'meets N of 7' counts. Rendered under the tier lab's result and
   under the report-part card for the same line. */
export const MEETS_KEY =
  "Identity resolved on two records earns two points. Each area with a verified green flag earns one point, up to four, and no open High or Critical finding earns the last point. The count shows the basis, and the six verdict steps set the tier.";

/* The page's own paraphrase of the decision. Never labeled as code-written. */
export function plainWords(s: TierScenario, inputs: TierInputs, decision: TierDecision): string[] {
  const out = stepOutcomes(inputs, decision);
  const lines: string[] = [];
  switch (out.appliedStepId) {
    case "nothing":
      lines.push(
        "Nothing here could be researched, because no company name or website resolved. The verdict is Tier 0, which means the check could not start and says nothing against the vendor.",
      );
      break;
    case "triggers":
      lines.push(
        "Code logged two or more registry contradictions, each from a search that ran, which sets Tier 1. Each one is listed with the check that logged it, and the evidence link sits on that check's ledger row.",
      );
      break;
    case "identity":
      lines.push(
        "Public sources did not agree on a registered company behind this vendor, and no logged search contradicted the pitch. The check could not be completed, so the verdict is Tier 0, with a request for the vendor's legal name, state, and website.",
      );
      break;
    case "open":
      lines.push(
        "The company is real, but a High or Critical finding is still open. That is Tier 2 until the vendor resolves it in writing.",
      );
      break;
    case "green":
      lines.push(
        `Identity is resolved, nothing is open at High or Critical, and ${inputs.green_dimensions.length} areas carry a verified green flag. That is Tier 4.`,
      );
      break;
    default:
      lines.push(
        "Identity is resolved and no High or Critical finding is open, but fewer than three areas carry a verified green flag, which makes this Tier 3.",
      );
      lines.push(
        inputs.startup_bar_met
          ? "The vendor meets the startup bar, which changes the wording only."
          : "Public evidence of government delivery is thin, so the questions ask for what a young company can produce.",
      );
  }
  if (s.contradictions === "1" && out.appliedStepId !== "nothing") {
    lines.push("One contradiction was logged. Tier 1 needs two.");
  }
  if (out.cap === "Applies") {
    lines.push(
      "Then the cap applies. What you submitted carried hidden text, text aimed at AI, or invisible characters, so the verdict cannot sit above Tier 2.",
    );
  } else if (out.cap === "No change") {
    lines.push(
      "A capping finding is present, but the tier was already at or below 2, so the cap changed nothing. The finding stays on the report.",
    );
  }
  if (s.adv === "info" || s.adv === "web") lines.push(capExplanation(inputs.adv_findings));
  return lines;
}

/* --------------------------------------------------------- source chooser */

export interface SourceClass {
  cls: DomainClass;
  name: string;
  plain: string;
}

export const SOURCE_CLASSES: SourceClass[] = [
  {
    cls: 1,
    name: "Official records",
    plain:
      "Addresses ending in .gov or .mil, government addresses in the .us naming system, and a published list of official registries. These can verify a claim.",
  },
  {
    cls: 2,
    name: "Independent press and archives",
    plain:
      "A published list of independent newsrooms and trade press, and the web archive. These can verify a claim too, when the page ties the claim and the vendor together.",
  },
  {
    cls: 3,
    name: "The vendor speaking, or unknown",
    plain:
      "Any domain that belongs to the vendor, whatever it ends in, plus any address on no list. None of these pages can verify a claim.",
  },
  {
    cls: 4,
    name: "Press wires and content farms",
    plain:
      "Vendors write wire copy themselves, so a wire is treated like the vendor speaking and cannot verify a claim.",
  },
];

export const VENDOR_DOMAINS = ["claradocs.io"];

export interface SourceExample {
  id: string;
  url: string;
  label: string;
  why: string;
  expected: DomainClass;
}

export const SOURCE_EXAMPLES: SourceExample[] = [
  {
    id: "city-gov",
    url: "https://permits.riverbendcity.gov/vendors",
    label: "permits.riverbendcity.gov",
    why: "This is a city's own site. Addresses ending in .gov are government-only by registration rules.",
    expected: 1,
  },
  {
    id: "clerk-us",
    url: "https://clerk.riverbend.co.us/minutes",
    label: "clerk.riverbend.co.us",
    why: "A city clerk at an address that ends in a two-letter state code plus .us (here co.us for Colorado). Only governments get addresses of that form, so it counts as official.",
    expected: 1,
  },
  {
    id: "bare-us",
    url: "https://riverbendcity.us/council",
    label: "riverbendcity.us",
    why: "A locality that chose a bare .us name. Anyone can register an ordinary .us name, so it falls to the default class. The tool accepts that miss rather than false credit.",
    expected: 3,
  },
  {
    id: "vendor-io",
    url: "https://claradocs.io/customers",
    label: "claradocs.io",
    why: "The vendor's own site. Vendor domains are checked first and are always class 3, whatever they end in.",
    expected: 3,
  },
  {
    id: "vendor-us",
    url: "https://claradocs.us/security",
    label: "claradocs.us",
    why: "A .us address outside the government naming system. It reads as the vendor speaking, or as an unknown site, and not as an official source.",
    expected: 3,
  },
  {
    id: "unknown-com",
    url: "https://riverbend-permit-news.com/claradocs",
    label: "riverbend-permit-news.com",
    why: "This address is on no list, so it is class 3, unknown.",
    expected: 3,
  },
];

export const SOURCE_READ_CONTROL: Control<{ read: "yes" | "no" }> = {
  key: "read",
  label: "Did the tool read the page?",
  options: [
    { value: "yes", label: "Yes, it read the page" },
    { value: "no", label: "No, only a link" },
  ],
};

export const SOURCE_VERDICTS = {
  verifies:
    "This page can mark the claim verified, when its title or the passage the tool read ties the claim and the vendor together.",
  linkOnly: "A link alone never verifies. It becomes a lead for you to check.",
  never: "This page cannot verify a claim, however many like it there are. It counts as the vendor's own statement.",
} as const;

export function runSource(
  example: SourceExample,
  read: "yes" | "no",
): { cls: DomainClass; canVerify: boolean; verdict: string; className: string } {
  const cls = classifyDomain(example.url, VENDOR_DOMAINS);
  const ok = canVerify(cls);
  const verdict = !ok
    ? SOURCE_VERDICTS.never
    : read === "yes"
      ? SOURCE_VERDICTS.verifies
      : SOURCE_VERDICTS.linkOnly;
  return { cls, canVerify: ok, verdict, className: SOURCE_CLASSES[cls - 1].name };
}

/* --------------------------------------------------------- shared labels */

export const REGISTRY_LANES: Record<string, string> = {
  rdap_domain_age: "Domain registration records",
  wayback_history: "Archived web history",
  crtsh_subdomains: "Public certificate logs",
  dns_email_hygiene: "Email setup records",
  edgar_fts: "Securities filings with the SEC, full-text search",
  edgar_company: "Securities filings with the SEC, company database",
  sos_ny: "New York business registry",
  sos_co: "Colorado business registry",
  sos_ct: "Connecticut business registry",
  sos_tx: "Texas business registry",
  sos_or: "Oregon business registry",
  sos_fl: "Florida business registry, manual link",
  sam_entity: "SAM.gov, the federal contractor registration",
  sam_exclusions: "The federal exclusion list",
  usaspending_awards: "Federal payment records",
  sourcewell: "A cooperative purchasing agency's own contract list",
  fedramp_marketplace: "The FedRAMP marketplace feed",
  govramp: "The GovRAMP participant list",
  txramp: "The TX-RAMP certified products list",
  github_org: "Public code-hosting footprint",
};

export const HONESTY_GROUP_LABELS: string[] = HONESTY_GROUPS.map((g) => g.label);

export const ROW_RESULT_LABELS: Record<LedgerResult, string> = RESULT_LABELS;

/* --------------------------------------------------------------- fairness */

export const FAIRNESS_LINES: { id: string; text: string }[] = [
  {
    id: "fair-00",
    text: "A missing credential does not count against a vendor. A warning needs a conflict between what the pitch claims and what the public record shows.",
  },
  {
    id: "fair-01",
    text: "Too little information goes to Tier 0. A vendor reaches Tier 1 only when code has logged two or more contradictions.",
  },
  {
    id: "fair-02",
    text: "A young domain or a young company matters only when it contradicts an explicit claim in the pitch.",
  },
  {
    id: "fair-04",
    text: "An audit still in progress counts when the vendor can show something for it, such as an engagement letter or a named auditor. The tool never demands two kinds of audit.",
  },
  {
    id: "fair-05",
    text: "A founder with a thin public footprint produces no warning. The tool weighs only a whole leadership team with no independent trace, and even then the row reads could not verify.",
  },
  {
    id: "fair-06",
    text: "Building on a major AI provider's model is normal architecture and produces no warning. A warning here needs misrepresentation or an unsafe data flow.",
  },
  {
    id: "fair-07",
    text: "A source the tool could not reach counts for nothing, for or against the vendor, and can never produce a logged contradiction.",
  },
  {
    id: "fair-09",
    text: "The dispute channel is free, and a person reviews every dispute. Small vendors are the ones it is meant to help.",
  },
];

/* ---------------------------------------------------------- section copy */

export const SECTIONS = {
  pipeline: {
    kicker: "01",
    eyebrow: "The whole check",
    title: "One check, start to finish",
    intro: "A check runs in fourteen steps.",
    /* The lane sentence follows the layout: lanes stack top and bottom on a
       wide screen and sit side by side on a narrow one. */
    lanesWide: "An AI model works in the top lane, and code decides in the bottom lane.",
    lanesNarrow: "An AI model works in the left lane, and code decides in the right lane.",
    introTail: "Lettered circles mark where something crosses the wall between them.",
    svgTitle: "The fourteen steps of a check, in order",
    legend: "Legend",
    gatesTitle: "What crosses the wall",
    pressHint: "Press a step to read it.",
    openStep: (n: number) => `Open step ${n}`,
    previous: "Previous step",
    next: "Next step",
    showAll: "Show every step",
    showOne: "Show one step at a time",
    close: "Close this step",
    stepOf: (n: number) => `Step ${n} of ${STAGES.length}`,
  },
  parts: {
    eyebrow: "Who wrote it",
    title: "Who wrote each part of the report",
    intro:
      "The parts are listed in the order they appear on a report. Open the ClaraDocs sample report in a new tab to follow along.",
    sampleLink: HERO.sampleLink,
  },
  credit: {
    kicker: "02",
    eyebrow: "The credit rule",
    title: "When a record counts as the vendor's. Try it.",
    intro: `The registry check for ${VENDOR_FULL} finds a Colorado record. A record that only matches by name is a candidate, and code credits it only when a second detail ties it to the vendor. Set the facts of the record and watch which rule decides it. The rule here is the same code the tool runs.`,
    presets: "Try a case",
    ruleTitle: "The rule that decided it",
    sentenceTitle: "What the report would say",
    illustrative: "Illustrative",
    chipKeyTitle: "What the chips mean",
    tableTitle: "Every rule, in the order code runs them",
    tableIntro: "The first rule that applies wins. The row marked applies is the one deciding the case above.",
    readRules: "Read every rule",
    hideRules: "Hide the rules",
    jumpToRule: "See this rule in the table",
    noEffect: "no effect in this case",
  },
  tier: {
    kicker: "03",
    eyebrow: "The verdict rule",
    title: "How the verdict is set. Try it.",
    intro:
      "Code walks six steps in a set order, and the first step that applies wins. One cap is checked last. Set the inputs and watch where the check lands. The rule here is the same code the tool runs.",
    presets: "Start from a sample",
    openReport: "Open the sample report",
  },
  sources: {
    kicker: "04",
    eyebrow: "The source rule",
    title: "Pages that can prove a claim. Try it.",
    intro:
      "Every page the research step cites is sorted by code into one of four classes, by its address alone. Class 1 is official records, and class 2 is independent press and archives. Class 3 is the vendor speaking or an unknown site, and class 4 is press wires and content farms. An AI model never grades a source. Only classes 1 and 2 can verify a claim, and only when the tool read the page rather than citing its link.",
    tryIt: "Try an address",
    hideLab: "Hide the addresses",
    invented: "The addresses here are invented.",
    pick: "Pick an address",
    classTitle: (cls: DomainClass) => `Class ${cls}`,
    classesTitle: "The four classes",
  },
  fairness: {
    kicker: "05",
    eyebrow: "Small vendors",
    title: "Fair to small vendors",
    intro: "Eight rules in the code keep a young company from being marked down for being young.",
    readRules: "Read the eight rules",
    hideRules: "Hide the rules",
    keeps: "Keeps it fair",
  },
} as const;

export const FOOTER = {
  version: `This page describes methodology version ${HOW_IT_WORKS_METHODOLOGY_VERSION}.`,
  claims: "Every rule on this page is taken from the code the tool runs.",
  fiction: "Every vendor named here is one of the app's fictional samples.",
  links: [
    { label: "Read the methodology", to: "/methodology" },
    {
      label: "Read the changelog",
      href: "https://github.com/eichenbaumj/ai-vendor-diligence-wizard/blob/main/docs/changelog.md",
    },
  ],
} as const;

export const CHANGELOG_URL = FOOTER.links[1].href;

/* --------------------------------------------------------- copy flattening */

/* One reader-facing string, with the render block it sits in (a card, a
   list, a paragraph group, in page order with every fold expanded in place,
   which is also the print order) and the export it comes from. The block
   lets a test check that a term is explained before or where it is first
   read; the export lets a test catch the same sentence rendered from two
   places. Code anchors, ids, and links are references, not prose, and are
   left out on purpose. */
export interface CopyEntry {
  block: string;
  exp: string;
  text: string;
}

const SKIP_KEYS = new Set(["id", "url", "href", "to", "key", "value", "tone", "result", "evidenceTier"]);

export function readerCopyEntries(): CopyEntry[] {
  const out: CopyEntry[] = [];
  let block = "";
  const at = (b: string) => {
    block = b;
  };
  const push = (exp: string, v: unknown) => {
    if (typeof v === "string") {
      if (v.length > 0) out.push({ block, exp, text: v });
    } else if (Array.isArray(v)) v.forEach((x) => push(exp, x));
    else if (v && typeof v === "object") {
      for (const [k, val] of Object.entries(v)) {
        if (SKIP_KEYS.has(k) || typeof val === "function") continue;
        push(exp, val);
      }
    }
  };
  const stage = (id: StageId) => STAGES.find((s) => s.id === id)!;
  const F = STAGE_FIELD_LABELS;

  /* Hero. */
  at("hero-head");
  push("HERO", [HERO.eyebrow, HERO.title, HERO.rule, HERO.intro, HERO.fiction, HERO.sampleLink.label]);
  for (const lane of HERO.lanes) {
    at(`hero-lane-${lane.id}`);
    push("HERO", [lane.title, lane.items]);
  }
  at("hero-wall-lead");
  push("HERO", [HERO.wall.title, HERO.wall.lead]);
  for (const door of HERO.wall.doors) {
    at(`hero-door-${door.id}`);
    push("HERO", [door.label, door.text]);
  }
  at("hero-never");
  push("HERO", [HERO.wall.neverTitle, HERO.wall.never, HERO.wall.exception]);

  /* The pipeline hub: intro, diagram, legend, worked example, controls. */
  at("pipeline-head");
  push("SECTIONS", [SECTIONS.pipeline.kicker, SECTIONS.pipeline.eyebrow, SECTIONS.pipeline.title, SECTIONS.pipeline.intro, SECTIONS.pipeline.lanesWide, SECTIONS.pipeline.lanesNarrow, SECTIONS.pipeline.introTail]);
  at("pipeline-diagram");
  push("SECTIONS", [SECTIONS.pipeline.svgTitle, SECTIONS.pipeline.pressHint]);
  push("LANE_LEGEND", [LANE_LEGEND.ai, LANE_LEGEND.code]);
  push("WHO_CHIP", [WHO_CHIP.ai, WHO_CHIP.code]);
  push("DIAGRAM_LABELS", Object.values(DIAGRAM_LABELS));
  push("TIER_SET_HERE", TIER_SET_HERE);
  for (const s of STAGES) push("STAGES", [s.label, `${s.n}. ${s.title}`, `${s.n}. ${s.title} (${s.who})`]);
  at("pipeline-legend");
  push("SECTIONS", SECTIONS.pipeline.legend);
  push("LANE_LEGEND", Object.values(LANE_LEGEND));
  push("SECTIONS", SECTIONS.pipeline.gatesTitle);
  push("WALL_GATES", WALL_GATES.map((g) => g.label));
  at("pipeline-worked");
  push("STAGE_FIELD_LABELS", F.inThisCheck);
  push("SECTIONS", SECTIONS.pipeline.pressHint);
  for (const id of WORKED_EXAMPLE_STAGES) {
    const s = stage(id);
    at(`worked-${id}`);
    push("STAGES", [`${s.n}. ${s.title}`, workedLead(s)]);
    push("SECTIONS", SECTIONS.pipeline.openStep(s.n));
  }
  at("pipeline-worked-pills");
  push("SECTIONS", [SECTIONS.pipeline.showAll, SECTIONS.pipeline.showOne, SECTIONS.parts.title]);
  at("pipeline-controls");
  push("SECTIONS", [SECTIONS.pipeline.previous, SECTIONS.pipeline.next, SECTIONS.pipeline.close, SECTIONS.pipeline.stepOf(1)]);

  /* The fourteen stage cards, each one block, in the order its fields render. */
  for (const s of STAGES) {
    at(`stage-${s.id}`);
    push("WHO_CHIP", s.who);
    push("STAGES", [s.title, s.plain]);
    push("STAGE_FIELD_LABELS", [F.rule, F.inputs]);
    push("STAGES", s.inputs);
    push("STAGE_FIELD_LABELS", F.outputs);
    push("STAGES", s.outputs);
    if (s.id === "registry") {
      push("STAGE_FIELD_LABELS", F.sources);
      push("REGISTRY_LANES", Object.values(REGISTRY_LANES));
    }
    if (s.id === "assembly") {
      push("STAGE_FIELD_LABELS", F.honestyGroups);
      push("HONESTY_GROUP_LABELS", HONESTY_GROUP_LABELS);
    }
    if (s.id === "verdict") {
      push("STAGE_FIELD_LABELS", F.triggerKinds);
      push("TRIGGER_KINDS", TRIGGER_KINDS);
    }
    push("STAGE_FIELD_LABELS", F.inThisCheck);
    push("STAGES", s.inThisCheck);
    push("STAGE_FIELD_LABELS", F.never);
    push("STAGES", s.never);
    const gate = WALL_GATES.find((g) => g.id === s.gate);
    if (gate) {
      push("STAGE_FIELD_LABELS", F.gate);
      push("WALL_GATES", [gate.label, gate.detail]);
    }
    if (s.id === "ties" || s.id === "research" || s.id === "verdict") push("STAGE_FIELD_LABELS", F.tryRule);
    push("STAGE_FIELD_LABELS", [F.method, F.code]);
    if (s.id === "report") {
      push("SECTIONS", [SECTIONS.parts.eyebrow, SECTIONS.parts.title, SECTIONS.parts.intro]);
      push("HERO", HERO.sampleLink.label);
      push("REPORT_PARTS", REPORT_PARTS.map((p) => p.label));
      push("PART_LEADS", Object.values(PART_LEADS));
      push("PART_SCREEN", PART_SCREEN);
      push("REPORT_PARTS", REPORT_PARTS.map((p) => p.rule));
      push("MEETS_KEY", MEETS_KEY);
    }
  }

  /* The credit lab. */
  at("credit-head");
  push("SECTIONS", [SECTIONS.credit.kicker, SECTIONS.credit.eyebrow, SECTIONS.credit.title, SECTIONS.credit.intro]);
  at("credit-presets");
  push("SECTIONS", SECTIONS.credit.presets);
  push("CREDIT_PRESETS", CREDIT_PRESETS.map((p) => p.label));
  for (const c of CREDIT_CONTROLS) {
    at(`credit-control-${c.key}`);
    push("CREDIT_CONTROLS", [c.label, c.options.map((o) => o.label), c.caption ?? ""]);
    push("SECTIONS", SECTIONS.credit.noEffect);
  }
  at("credit-rare");
  push("CREDIT_RARE_TITLE", CREDIT_RARE_TITLE);
  at("credit-result");
  push("CREDIT_STAMPS", Object.values(CREDIT_STAMPS));
  push("SECTIONS", [SECTIONS.credit.ruleTitle, SECTIONS.credit.jumpToRule, SECTIONS.credit.sentenceTitle, SECTIONS.credit.illustrative]);
  push("ROW_RESULT_LABELS", Object.values(ROW_RESULT_LABELS));
  push("LEDGER_CHIP_LABELS", Object.values(LEDGER_CHIP_LABELS));
  push("SECTIONS", SECTIONS.credit.chipKeyTitle);
  push("CHIP_KEY", CHIP_KEY);
  push("CHIP_KEY_TIERS", CHIP_KEY_TIERS.map((t) => t.text));
  push("CHIP_KEY_DIMENSIONS", CHIP_KEY_DIMENSIONS.map((d) => `${d.code} ${d.name}`));
  const creditCases: CreditScenario[] = [
    CREDIT_DEFAULT,
    ...CREDIT_PRESETS.flatMap((p) => (p.scenario ? [p.scenario] : [])),
    ...TRUTH_TABLE.map((r) => r.example),
  ];
  for (const s of creditCases) {
    const r = runCredit(s);
    push("runCredit", [r.sentence, r.ledger.caption]);
    for (const e of r.effects) push("runCredit", [e.question, e.answer, e.detail]);
  }
  push("KNOWN_GAP_NOTE", KNOWN_GAP_NOTE);
  push("COLLISION_NOTE", COLLISION_NOTE);
  at("credit-coverage");
  const c = COVERAGE_LIMITED_CARD;
  push("COVERAGE_LIMITED_CARD", [c.title, c.lead, c.row.resultLabel, c.row.whatCheckedLabel, c.row.whatChecked, c.row.note]);
  push("LEDGER_CHIP_LABELS", LEDGER_CHIP_LABELS.dimension);
  push("SECTIONS", SECTIONS.credit.chipKeyTitle);
  push("CHIP_KEY", CHIP_KEY);
  push("CHIP_KEY_TIERS", CHIP_KEY_TIERS.map((t) => t.text));
  push("CHIP_KEY_DIMENSIONS", CHIP_KEY_DIMENSIONS.map((d) => `${d.code} ${d.name}`));
  push("COVERAGE_LIMITED_CARD", [c.honesty, c.manual, c.rule]);
  at("credit-table");
  push("SECTIONS", [SECTIONS.credit.tableTitle, SECTIONS.credit.tableIntro, SECTIONS.credit.readRules, SECTIONS.credit.hideRules]);
  push("TRUTH_TABLE_HEADERS", Object.values(TRUTH_TABLE_HEADERS));
  push("TRUTH_TABLE_GROUPS", Object.values(TRUTH_TABLE_GROUPS));
  push("TRUTH_TABLE", TRUTH_TABLE.map((r) => [r.situation, r.rule, r.result]));

  /* The tier lab. */
  at("tier-head");
  push("SECTIONS", [SECTIONS.tier.kicker, SECTIONS.tier.eyebrow, SECTIONS.tier.title, SECTIONS.tier.intro]);
  at("tier-presets");
  push("SECTIONS", [SECTIONS.tier.presets, SECTIONS.tier.openReport]);
  push("TIER_PRESETS", TIER_PRESETS.map((p) => [p.label, p.footnote ?? ""]));
  at("tier-fedramp");
  push("FEDRAMP", [FEDRAMP_TITLE, FEDRAMP_LEAD, FEDRAMP_PICK]);
  push("FEDRAMP_SCENARIOS", FEDRAMP_SCENARIOS.map((f) => [f.label, f.note]));
  for (const c of TIER_CONTROLS) {
    at(`tier-control-${c.key}`);
    push("TIER_CONTROLS", [c.label, c.options.map((o) => o.label), c.caption ?? ""]);
  }
  at("tier-result");
  const L = TIER_RESULT_LABELS;
  push("TIER_RESULT_LABELS", [L.cap, L.tier(3), L.meets(4, 7), L.jump(L.readout(3, 4, 7)), L.points, L.pointMet, L.pointNotMet, L.steps, L.plain, L.exact, L.exactNote]);
  push("MEETS_KEY", MEETS_KEY);
  push("POINTS", POINTS.map((p) => p.label));
  push("POINT_GROUPS", POINT_GROUPS.map((g) => g.label));
  push("TIER_STEPS", TIER_STEPS.map((t) => [t.question, t.rule]));
  push("TIER_CAP_STEP", Object.values(TIER_CAP_STEP));
  const tierCases: TierScenario[] = [
    ...TIER_PRESETS.map((p) => p.scenario),
    ...FEDRAMP_SCENARIOS.map((f) => f.scenario),
    ...(["none", "caps", "info", "web"] as const).map((adv) => ({ ...TIER_DEFAULT, adv, green: "4" as const })),
  ];
  for (const s of tierCases) {
    const { inputs, decision } = runTier(s);
    push("plainWords", plainWords(s, inputs, decision));
  }
  push("CAP_EXPLANATIONS", [CAP_EXPLANATIONS.none, CAP_EXPLANATIONS.caps]);
  push("TRIGGER_DETAILS", Object.values(TRIGGER_DETAILS));
  push("FINDING_DETAILS", Object.values(FINDING_DETAILS));
  push("ADV_DETAILS", Object.values(ADV_DETAILS));
  push("LADDER_TEXT", [LADDER_TEXT.title, LADDER_TEXT.desc, LADDER_TEXT.here, LADDER_TEXT.cap, LADDER_TEXT.foot]);
  push("TIER_LADDER", TIER_LADDER.map((r) => [r.label, r.short, LADDER_TEXT.rung(r)]));

  /* The source chooser. */
  at("source-head");
  push("SECTIONS", [SECTIONS.sources.kicker, SECTIONS.sources.eyebrow, SECTIONS.sources.title, SECTIONS.sources.intro, SECTIONS.sources.tryIt, SECTIONS.sources.hideLab]);
  at("source-lab");
  push("SECTIONS", [SECTIONS.sources.invented, SECTIONS.sources.pick]);
  push("SOURCE_EXAMPLES", SOURCE_EXAMPLES.map((e) => [e.label, e.why]));
  push("SOURCE_READ_CONTROL", [SOURCE_READ_CONTROL.label, SOURCE_READ_CONTROL.options.map((o) => o.label)]);
  push("SECTIONS", [SECTIONS.sources.classTitle(1), SECTIONS.sources.classesTitle]);
  push("SOURCE_CLASSES", SOURCE_CLASSES.map((c) => [c.name, c.plain]));
  push("SOURCE_VERDICTS", Object.values(SOURCE_VERDICTS));

  /* Fairness. */
  at("fairness-head");
  push("SECTIONS", [SECTIONS.fairness.kicker, SECTIONS.fairness.eyebrow, SECTIONS.fairness.title, SECTIONS.fairness.intro, SECTIONS.fairness.readRules, SECTIONS.fairness.hideRules]);
  at("fairness-list");
  push("SECTIONS", SECTIONS.fairness.keeps);
  push("FAIRNESS_LINES", FAIRNESS_LINES.map((f) => f.text));

  /* Footer. */
  at("footer");
  push("FOOTER", [FOOTER.version, FOOTER.claims, FOOTER.fiction, FOOTER.links.map((l) => l.label)]);
  return out;
}

/* Every reader-facing string on the page, in render order. */
export function allReaderCopy(): string[] {
  return readerCopyEntries().map((e) => e.text);
}
