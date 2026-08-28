/*
  Registry barrel: every deterministic check function, identity resolution,
  and the manifest the honesty panel renders ("what we check, always").

  Explicit named re-exports (no `export *`) so shared helper names in the
  individual modules cannot collide. Several modules declare a structurally
  identical RegistryCtx; the canonical type is re-exported once, from sam.ts.
*/

export type { RegistryCtx, CompanyMatch, Confidence } from "./sam.ts";
export { checkDomainAge } from "./rdap.ts";
export { checkEdgarCompany, checkEdgarFts } from "./edgar.ts";
export { checkSubdomains } from "./crtsh.ts";
export { checkWebHistory } from "./wayback.ts";
export { checkGithubOrg } from "./github.ts";
export { checkEmailHygiene } from "./dns.ts";
export {
  checkSamEntity,
  checkSamExclusions,
  dedupeNames,
  isInvestmentVehicleMismatch,
  matchCompanyName,
  normalizeCompanyName,
  normalizePersonName,
} from "./sam.ts";
export { checkFederalAwards } from "./usaspending.ts";
export { checkFedramp } from "./fedramp.ts";
export type { RampFeedRow, SourcewellFeedRow } from "./feeds.ts";
export { checkGovRamp, checkSourcewell, checkTxRamp } from "./feeds.ts";
export { checkSosSweep, resolveIdentity } from "./sos-sweep.ts";

/* One row per check the pipeline can run, for the honesty panel. Labels are
   plain language; dimension ids follow methodology.md (D1 identity,
   D2 track record, D3 security and compliance, D4 technical substance). */
export const REGISTRY_MANIFEST: Array<{
  check_id: string;
  label: string;
  dimension: string;
}> = [
  {
    check_id: "rdap_domain_age",
    label: "Website domain age (RDAP registration record)",
    dimension: "D1",
  },
  {
    check_id: "wayback_history",
    label: "Web operating history (Internet Archive)",
    dimension: "D1",
  },
  {
    check_id: "crtsh_subdomains",
    label: "Product infrastructure (certificate transparency logs)",
    dimension: "D1",
  },
  {
    check_id: "dns_email_hygiene",
    label: "Email security records (DNS)",
    dimension: "D1",
  },
  {
    check_id: "edgar_fts",
    label: "SEC EDGAR filings (full-text search)",
    dimension: "D1",
  },
  {
    check_id: "edgar_company",
    label: "SEC EDGAR company database",
    dimension: "D1",
  },
  {
    check_id: "sos_ny",
    label: "New York business registry (open data)",
    dimension: "D1",
  },
  {
    check_id: "sos_co",
    label: "Colorado business registry (open data)",
    dimension: "D1",
  },
  {
    check_id: "sos_ct",
    label: "Connecticut business registry (open data)",
    dimension: "D1",
  },
  {
    check_id: "sos_tx",
    label: "Texas franchise taxpayer registry (Comptroller open data)",
    dimension: "D1",
  },
  {
    check_id: "sos_or",
    label: "Oregon business registry (open data)",
    dimension: "D1",
  },
  {
    check_id: "sos_fl",
    label: "Florida business registry (bulk file; manual link when not loaded)",
    dimension: "D1",
  },
  {
    check_id: "sam_entity",
    label: "SAM.gov federal contractor registration",
    dimension: "D1",
  },
  {
    check_id: "sam_exclusions",
    label: "Federal exclusions and debarment list (SAM.gov)",
    dimension: "D1",
  },
  {
    check_id: "usaspending_awards",
    label: "Federal spending records (USAspending.gov)",
    dimension: "D2",
  },
  {
    check_id: "sourcewell",
    label: "Sourcewell cooperative contract holders",
    dimension: "D2",
  },
  {
    check_id: "fedramp_marketplace",
    label: "FedRAMP Marketplace feed",
    dimension: "D3",
  },
  {
    check_id: "govramp",
    label: "GovRAMP program participants",
    dimension: "D3",
  },
  {
    check_id: "txramp",
    label: "TX-RAMP certified cloud products",
    dimension: "D3",
  },
  {
    check_id: "github_org",
    label: "Public engineering footprint (GitHub organization)",
    dimension: "D4",
  },
];
