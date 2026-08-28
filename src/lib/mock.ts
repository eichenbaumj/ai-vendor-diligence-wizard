/*
  Mock evaluation driver. Active when IS_MOCK: replays a realistic staged
  event timeline over ~45 seconds and ends with a full sample report. This is
  what powers the sample-pitch feature and local development with no backend.
*/
import type { EvalEvent, Report } from "@shared/schemas.ts";
import type { GetEvaluationResponse, StoredEvent } from "@/lib/types";
import { SAMPLE_PITCHES, type SampleId } from "@/lib/sample-pitches";
import { getSampleReport } from "@/lib/sample-reports";

interface TimelineEntry {
  at: number; // ms after start
  event: EvalEvent;
}

interface MockRun {
  id: string;
  sampleId: SampleId;
  startedAt: number;
}

const runs = new Map<string, MockRun>();
const STORAGE_KEY = "vdw_mock_runs";

function persistRuns(): void {
  try {
    const plain: Record<string, { sampleId: SampleId; startedAt: number }> = {};
    for (const [id, run] of runs) {
      plain[id] = { sampleId: run.sampleId, startedAt: run.startedAt };
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(plain));
  } catch {
    /* storage unavailable: in-memory only */
  }
}

function restoreRuns(): void {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const plain = JSON.parse(raw) as Record<
      string,
      { sampleId: SampleId; startedAt: number }
    >;
    for (const [id, r] of Object.entries(plain)) {
      if (!runs.has(id)) {
        runs.set(id, { id, sampleId: r.sampleId, startedAt: r.startedAt });
      }
    }
  } catch {
    /* ignore malformed storage */
  }
}

function ev(
  stage: EvalEvent["stage"],
  kind: EvalEvent["kind"],
  label: string,
  status: string | null = null,
  check_id: string | null = null,
  evidence_url: string | null = null,
): EvalEvent {
  return { stage, kind, label, status, check_id, evidence_url };
}

/* Timeline builders. Statuses drive the feed glyphs:
   hit -> check mark, searching/info -> dot, flag -> warning. */

function meridianTimeline(): TimelineEntry[] {
  return [
    { at: 400, event: ev("parse", "stage_start", "Reading the pitch") },
    {
      at: 2200,
      event: ev("parse", "micro_finding", "Vendor identified: Meridian Call AI (meridiancall.ai)", "hit"),
    },
    {
      at: 3600,
      event: ev("parse", "micro_finding", "10 checkable claims extracted from the pitch", "info"),
    },
    { at: 5200, event: ev("registry", "stage_start", "Checking registries and records") },
    {
      at: 7000,
      event: ev("registry", "check_result", "Domain registered March 2019 (RDAP)", "hit", "rdap_domain_age", "https://rdap.org/domain/meridiancall.ai"),
    },
    {
      at: 9200,
      event: ev("registry", "check_result", "Delaware registration on file, active since 2019", "hit", "sos_registration", "https://opencorporates.com/companies/us_de/7913412-sample"),
    },
    {
      at: 11400,
      event: ev("registry", "check_result", "SAM.gov: active entity record with UEI", "hit", "sam_entity", "https://sam.gov/entity/MER1SAMPLE9Q4"),
    },
    {
      at: 13000,
      event: ev("registry", "check_result", "No debarment or exclusion match", "hit", "sam_exclusions"),
    },
    {
      at: 15200,
      event: ev("registry", "check_result", "Sourcewell list: contract #031522-MCA confirmed", "hit", "sourcewell", "https://www.sourcewell-mn.gov/contract-search"),
    },
    {
      at: 17400,
      event: ev("registry", "check_result", "GovRAMP participants list: Authorized status confirmed", "hit", "govramp_list", "https://govramp.org/program-participants/"),
    },
    {
      at: 19000,
      event: ev("registry", "check_result", "USAspending: federal payment history since 2022", "hit", "usaspending"),
    },
    { at: 21000, event: ev("research", "stage_start", "Searching for delivery evidence") },
    {
      at: 23000,
      event: ev("research", "micro_finding", "Searching state contract and payment records…", "searching"),
    },
    {
      at: 26500,
      event: ev("research", "check_result", "Ohio Department of Taxation names the vendor on a .gov page", "hit", "gov_trace", "https://tax.ohio.gov/newsroom/sample-modernization-update"),
    },
    {
      at: 29500,
      event: ev("research", "micro_finding", "Checking the named contact against conference and press records…", "searching"),
    },
    {
      at: 32000,
      event: ev("research", "check_result", "Named contact appears in independent conference coverage", "hit", "leadership"),
    },
    {
      at: 34000,
      event: ev("research", "check_result", "Peak-week wait-time figure: no public source found; converted to a question", "info", "case_study"),
    },
    { at: 36000, event: ev("packs", "stage_start", "Matching sector guidance") },
    {
      at: 37200,
      event: ev("packs", "micro_finding", "Call-center pack selected; standard scrutiny tier", "info"),
    },
    { at: 38500, event: ev("synthesis", "stage_start", "Writing your report") },
    {
      at: 41000,
      event: ev("synthesis", "micro_finding", "Building the verification ledger and question pack…", "searching"),
    },
    { at: 43000, event: ev("review", "stage_start", "Reviewing the language") },
    {
      at: 44500,
      event: ev("review", "micro_finding", "Language check passed: plain, sourced, and dated", "hit"),
    },
    { at: 45500, event: ev("review", "done", "Report ready") },
  ];
}

function swiftgovTimeline(): TimelineEntry[] {
  return [
    { at: 400, event: ev("parse", "stage_start", "Reading the pitch") },
    {
      at: 2200,
      event: ev("parse", "micro_finding", "Vendor identified: SwiftGov AI (swiftgov-ai.com)", "hit"),
    },
    {
      at: 3600,
      event: ev("parse", "micro_finding", "9 checkable claims extracted, including 3 certification claims", "info"),
    },
    {
      at: 4800,
      event: ev("parse", "micro_finding", "Deadline and scarcity language noted for review", "flag"),
    },
    { at: 6000, event: ev("registry", "stage_start", "Checking registries and records") },
    {
      at: 8000,
      event: ev("registry", "check_result", "Domain registered March 2026 (RDAP), five months ago", "flag", "rdap_domain_age", "https://rdap.org/domain/swiftgov-ai.com"),
    },
    {
      at: 10500,
      event: ev("registry", "check_result", "First site capture May 2026 (Wayback Machine)", "flag", "wayback_history"),
    },
    {
      at: 13000,
      event: ev("registry", "check_result", "Searchable state registries: no registration found under disclosed names", "info", "sos_registration"),
    },
    {
      at: 15500,
      event: ev("registry", "check_result", "Sourcewell list: claimed contract not found", "flag", "sourcewell", "https://www.sourcewell-mn.gov/contract-search"),
    },
    {
      at: 18000,
      event: ev("registry", "check_result", "FedRAMP Marketplace: vendor not listed", "flag", "fedramp_feed", "https://marketplace.fedramp.gov/"),
    },
    {
      at: 20000,
      event: ev("registry", "check_result", "Note: no program issues 'HIPAA certified' or 'CJIS certified'", "flag", "cert_vocabulary"),
    },
    { at: 22000, event: ev("research", "stage_start", "Searching for delivery evidence") },
    {
      at: 24000,
      event: ev("research", "micro_finding", "Searching for any of the 14 claimed state deployments…", "searching"),
    },
    {
      at: 28000,
      event: ev("research", "check_result", "State AI inventories and .gov sites: no deployments found", "info", "ai_inventory"),
    },
    {
      at: 31000,
      event: ev("research", "check_result", "The $11M savings figure: no public source found", "info", "case_study"),
    },
    {
      at: 33500,
      event: ev("research", "check_result", "Named executive: no independent public record found", "info", "leadership"),
    },
    { at: 36000, event: ev("packs", "stage_start", "Matching sector guidance") },
    {
      at: 37200,
      event: ev("packs", "micro_finding", "Call-center pack selected", "info"),
    },
    { at: 38500, event: ev("synthesis", "stage_start", "Writing your report") },
    {
      at: 41000,
      event: ev("synthesis", "micro_finding", "Two deterministic registry contradictions logged; applying tier rules…", "searching"),
    },
    { at: 43000, event: ev("review", "stage_start", "Reviewing the language") },
    {
      at: 44500,
      event: ev("review", "micro_finding", "Language check passed: findings framed as could-not-verify, never accusation", "hit"),
    },
    { at: 45500, event: ev("review", "done", "Report ready") },
  ];
}

function claradocsTimeline(): TimelineEntry[] {
  return [
    { at: 400, event: ev("parse", "stage_start", "Reading the pitch") },
    {
      at: 2200,
      event: ev("parse", "micro_finding", "Vendor identified: ClaraDocs (claradocs.io)", "hit"),
    },
    {
      at: 3600,
      event: ev("parse", "micro_finding", "8 checkable claims extracted; no performance numbers claimed", "info"),
    },
    { at: 5200, event: ev("registry", "stage_start", "Checking registries and records") },
    {
      at: 7200,
      event: ev("registry", "check_result", "Colorado SoS: ClaraDocs, Inc. in good standing, formed May 2024", "hit", "sos_registration", "https://www.sos.state.co.us/biz/BusinessEntityDetail-sample"),
    },
    {
      at: 9800,
      event: ev("registry", "check_result", "SEC EDGAR: Form D on file, October 2025 seed round", "hit", "edgar_form_d", "https://efts.sec.gov/LATEST/search-index?q=%22ClaraDocs%22-sample"),
    },
    {
      at: 12000,
      event: ev("registry", "check_result", "Domain registered June 2024 (RDAP), consistent with company age", "hit", "rdap_domain_age", "https://rdap.org/domain/claradocs.io"),
    },
    {
      at: 14000,
      event: ev("registry", "check_result", "No debarment or exclusion match", "hit", "sam_exclusions"),
    },
    {
      at: 16000,
      event: ev("registry", "check_result", "GovRAMP list: not present (not claimed; Snapshot suggested in next steps)", "info", "govramp_list"),
    },
    { at: 18500, event: ev("research", "stage_start", "Searching for delivery evidence") },
    {
      at: 20500,
      event: ev("research", "micro_finding", "Searching Colorado county records for the claimed pilot…", "searching"),
    },
    {
      at: 24500,
      event: ev("research", "check_result", "Pilot leaves no public trace yet; normal at this size, reference offered", "info", "gov_trace"),
    },
    {
      at: 27500,
      event: ev("research", "check_result", "Co-founder verified in independent event coverage plus the Form D", "hit", "leadership"),
    },
    {
      at: 30500,
      event: ev("research", "check_result", "Product docs match the pitch's architecture description", "hit", "product_docs"),
    },
    {
      at: 33000,
      event: ev("research", "check_result", "Claims hygiene clean: no accuracy numbers, no urgency language", "hit", "claims_hygiene"),
    },
    { at: 36000, event: ev("packs", "stage_start", "Matching sector guidance") },
    {
      at: 37200,
      event: ev("packs", "micro_finding", "Document-processing pack selected; startup calibration bar applied", "info"),
    },
    { at: 38500, event: ev("synthesis", "stage_start", "Writing your report") },
    {
      at: 41000,
      event: ev("synthesis", "micro_finding", "Building the startup-calibrated question pack…", "searching"),
    },
    { at: 43000, event: ev("review", "stage_start", "Reviewing the language") },
    {
      at: 44500,
      event: ev("review", "micro_finding", "Language check passed", "hit"),
    },
    { at: 45500, event: ev("review", "done", "Report ready") },
  ];
}

const TIMELINES: Record<SampleId, () => TimelineEntry[]> = {
  meridian: meridianTimeline,
  swiftgov: swiftgovTimeline,
  claradocs: claradocsTimeline,
};

const COMPLETE_AT = 45500;

function pickSample(content: string): { id: SampleId; matched: boolean } {
  const trimmed = content.trim();
  for (const pitch of SAMPLE_PITCHES) {
    if (trimmed === pitch.text.trim()) return { id: pitch.id, matched: true };
  }
  const lower = trimmed.toLowerCase();
  if (lower.includes("swiftgov")) return { id: "swiftgov", matched: true };
  if (lower.includes("claradocs")) return { id: "claradocs", matched: true };
  if (lower.includes("meridian")) return { id: "meridian", matched: true };
  /* Unrecognized custom input in mock mode: the live engine is not connected,
     so we replay the established-vendor sample AND flag the run so the UI
     says plainly that the user's own pitch was not evaluated. */
  return { id: "meridian", matched: false };
}

export function startMockEvaluation(opts: {
  sampleId?: SampleId;
  content: string;
}): string {
  restoreRuns();
  const picked = opts.sampleId
    ? { id: opts.sampleId, matched: true }
    : pickSample(opts.content);
  const custom = !picked.matched;
  const id = `mock-${picked.id}-${custom ? "custom-" : ""}${crypto.randomUUID()}`;
  runs.set(id, { id, sampleId: picked.id, startedAt: Date.now() });
  persistRuns();
  return id;
}

function statusForElapsed(
  elapsed: number,
  visible: TimelineEntry[],
): GetEvaluationResponse["status"] {
  if (elapsed >= COMPLETE_AT) return "complete";
  let latestStage: string = "queued";
  for (const entry of visible) {
    if (entry.event.kind === "stage_start") latestStage = entry.event.stage;
  }
  switch (latestStage) {
    case "parse":
      return "parsing";
    case "registry":
      return "registry";
    case "research":
    case "packs":
      return "research";
    case "synthesis":
    case "review":
      return "synthesis";
    default:
      return "queued";
  }
}

export function getMockEvaluation(id: string): GetEvaluationResponse | null {
  restoreRuns();
  const run = runs.get(id);
  if (!run) return null;

  const elapsed = Date.now() - run.startedAt;
  const timeline = TIMELINES[run.sampleId]();
  const visible = timeline.filter((entry) => entry.at <= elapsed);

  const events: StoredEvent[] = visible.map((entry, i) => ({
    id: i + 1,
    stage: entry.event.stage,
    kind: entry.event.kind,
    payload: entry.event,
  }));

  const status = statusForElapsed(elapsed, visible);
  const report: Report | null =
    status === "complete" ? getSampleReport(run.sampleId) : null;

  return {
    status,
    events,
    report,
    disputed: false,
    mock_custom: id.includes("-custom-"),
  };
}

export function isMockEvaluationId(id: string): boolean {
  return id.startsWith("mock-");
}
