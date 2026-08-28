/*
  State-specific obligations surfaced in the report's next steps (methodology
  D7.3). Static, dated, and conservative: each line names its instrument so
  the reader can verify. Reviewed with each pack refresh.
*/

export const STATE_ITEMS: Record<string, string[]> = {
  TX: [
    "Texas: the Responsible AI Governance Act (HB 149, effective January 1, 2026) sets disclosure duties for AI systems interacting with residents. Ask the vendor how their product supports the required disclosures.",
    "Texas: cloud products serving state agencies generally need TX-RAMP certification. Ask for the product's TX-RAMP status and certification date.",
  ],
  NY: [
    "New York: state policy NYS-P24-001 does not permit automated final decision systems for consequential determinations. Ask the vendor to show the human-decision workflow.",
    "New York: state agencies maintain a public AI inventory under State Technology Law 103-e. Check whether this vendor already appears in it.",
  ],
  NJ: [
    "New Jersey: circular 25-OIT-001 requires CTO clearance and registration for AI systems used by executive-branch agencies. Factor the clearance timeline into any pilot plan.",
  ],
  WA: [
    "Washington: interim guidance DATA-04 asks vendors to certify an AI governance program consistent with the NIST AI Risk Management Framework. Ask the vendor whether they will sign that certification.",
  ],
  CA: [
    "California: GenAI procurement guidance (SIMM 150 and related policy directives) requires risk classification and specific contract terms for generative AI. Ask the vendor whether they have completed a California GenAI disclosure before.",
  ],
  CO: [
    "Colorado: the Colorado AI Act (effective June 30, 2026) treats AI affecting access to government services as high risk. Confirm the vendor's compliance plan in writing.",
  ],
  CT: [
    "Connecticut: Public Act 23-16 requires an inventory and impact assessments for agency AI systems. Check the state inventory for this vendor and ask how they support the assessment.",
  ],
};
