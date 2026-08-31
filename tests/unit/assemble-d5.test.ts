/*
  Tests for the D5 person-corroboration rows in report assembly.

  The rule under test: a person the vendor holds out as leadership is
  corroborated only when ONE class 1-2 citation names both the person and
  the vendor in retrieved content (title / cited_text) — the two-identifier
  rule instantiated as name + affiliation. URL strings never corroborate.
  Uncorroborated people are never individually adverse; the only adverse
  path is the aggregate finding (whole-team, complete research, 2+ people).
*/
import { describe, expect, it } from "vitest";
import { assemble, type AssembleInput } from "@shared/assemble.ts";
import { computeTier } from "@shared/tier.ts";
import type { Citation, PitchExtract } from "@shared/schemas.ts";

const AT = "2026-08-28T00:00:00.000Z";

function cite(
  url: string,
  domain_class: 1 | 2 | 3 | 4,
  title: string | null = null,
  cited_text: string | null = null,
): Citation {
  return { url, title, cited_text, retrieved_at: AT, domain_class };
}

function extractWith(people: { name: string; title: string }[]): PitchExtract {
  return {
    vendor_name_candidates: ["Acme AI"],
    domains: ["acmeai.example.com"],
    sender_email: null,
    people,
    named_customers: [],
    claims: people.map((p, i) => ({
      id: `clm-${i}`,
      type: "team" as const,
      quote: `${p.name}, our ${p.title}.`,
      subject: p.name,
    })),
    use_case_description: "Resident service chatbot for local government.",
    urgency_language: [],
    state_mentioned: null,
    injection_screen: {
      injection_suspected: false,
      addressed_to_ai: false,
      suspicious_spans: [],
    },
  };
}

function input(
  people: { name: string; title: string }[],
  citations: Citation[],
  research_partial = false,
): AssembleInput {
  return {
    extract: extractWith(people),
    checks: [],
    identity: { identity_resolved: true, identifiers_found: ["co_sos", "edgar_fts"] },
    citations,
    adv_findings: [],
    sector: { pack_ids: [], elevated: false, overlay_reason: null, state_items: [] },
    packs: {},
    resolvable: true,
    research_partial,
    generated_at: AT,
  };
}

const JANE = { name: "Jane Rivera", title: "CEO" };
const OMAR = { name: "Omar Haddad", title: "CTO" };
const PRIYA = { name: "Priya Nathan", title: "COO" };

function personRows(result: ReturnType<typeof assemble>) {
  return result.ledger.filter((r) => r.methodology_ref === "d5-1");
}

function leadershipFinding(result: ReturnType<typeof assemble>) {
  return result.tierInputs.findings.find((f) => f.id === "leadership");
}

describe("person corroboration: grounded rule", () => {
  it("class 1 citation naming person and vendor in retrieved content corroborates at T1", () => {
    const out = assemble(
      input(
        [JANE],
        [
          cite(
            "https://www.franklincountyohio.gov/news/ai-pilot",
            1,
            "County launches pilot with Acme AI",
            "Jane Rivera of Acme AI presented the pilot to the board.",
          ),
        ],
      ),
    );
    const [row] = personRows(out);
    expect(row.result).toBe("VERIFIED");
    expect(row.evidence_tier).toBe("T1");
    expect(row.severity).toBeNull();
    expect(row.claim_quote).toBe("Jane Rivera, our CEO.");
    expect(row.sources).toHaveLength(1);
    expect(out.tierInputs.green_dimensions).toContain("D5");
    /* Titles are attributed, never asserted as current fact (the OpenGov
       stale-CEO standard, disposition #6). */
    expect(
      out.greenFlagFacts.some((f) =>
        f.fact.startsWith("Jane Rivera, described in the pitch as CEO"),
      ),
    ).toBe(true);
  });

  it("class 2 (independent press) corroborates at T3", () => {
    const out = assemble(
      input(
        [JANE],
        [
          cite(
            "https://www.governing.com/acme-profile",
            2,
            "Acme AI's Jane Rivera on government chatbots",
          ),
        ],
      ),
    );
    const [row] = personRows(out);
    expect(row.result).toBe("VERIFIED");
    expect(row.evidence_tier).toBe("T3");
  });

  it("class 3 (vendor-ish) sources never corroborate, even naming both", () => {
    const out = assemble(
      input(
        [JANE],
        [
          cite(
            "https://acmeai.example.com/team",
            3,
            "Acme AI leadership: Jane Rivera",
            "Jane Rivera leads Acme AI.",
          ),
        ],
      ),
    );
    expect(personRows(out)[0].result).toBe("COULD_NOT_VERIFY");
    expect(out.tierInputs.green_dimensions).not.toContain("D5");
  });

  it("a narrative-harvested URL carrying both names never corroborates", () => {
    const out = assemble(
      input(
        [JANE],
        [cite("https://www.franklincountyohio.gov/jane-rivera-acme-ai-keynote", 1)],
      ),
    );
    expect(personRows(out)[0].result).toBe("COULD_NOT_VERIFY");
  });

  it("citation naming the person but not the vendor does not corroborate", () => {
    const out = assemble(
      input(
        [JANE],
        [
          cite(
            "https://www.govtech.com/conference",
            2,
            "Conference speakers announced",
            "Jane Rivera will keynote this year.",
          ),
        ],
      ),
    );
    expect(personRows(out)[0].result).toBe("COULD_NOT_VERIFY");
  });

  it("uncorroborated rows carry null severity and one person is never a finding", () => {
    const out = assemble(input([JANE], []));
    const [row] = personRows(out);
    expect(row.result).toBe("COULD_NOT_VERIFY");
    expect(row.severity).toBeNull();
    expect(row.evidence_tier).toBe("T4");
    expect(leadershipFinding(out)).toBeUndefined();
  });

  it("name normalization tolerates punctuation in the pitch's spelling", () => {
    const out = assemble(
      input(
        [{ name: "Dr. Jane Rivera", title: "Chief Scientist" }],
        [
          cite(
            "https://www.nist.gov/panel",
            1,
            "Panel: Jane Rivera, Acme AI",
            "Jane Rivera of Acme AI joined the NIST panel.",
          ),
        ],
      ),
    );
    expect(personRows(out)[0].result).toBe("VERIFIED");
  });

  it("caps person rows at six", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({
      name: `Person Number${i}`,
      title: "VP",
    }));
    const out = assemble(input(many, []));
    expect(personRows(out)).toHaveLength(6);
  });
});

describe("leadership aggregate finding: threshold matrix", () => {
  it("three or more people, zero corroborated, complete research: HIGH", () => {
    const out = assemble(input([JANE, OMAR, PRIYA], []));
    const f = leadershipFinding(out);
    expect(f?.severity).toBe("HIGH");
    expect(f?.dimension).toBe("D5");
  });

  it("exactly two people, zero corroborated: MEDIUM", () => {
    const out = assemble(input([JANE, OMAR], []));
    expect(leadershipFinding(out)?.severity).toBe("MEDIUM");
  });

  it("partial research suppresses the aggregate entirely", () => {
    const out = assemble(input([JANE, OMAR, PRIYA], [], true));
    expect(leadershipFinding(out)).toBeUndefined();
  });

  it("one corroborated person suppresses the aggregate", () => {
    const out = assemble(
      input(
        [JANE, OMAR, PRIYA],
        [
          cite(
            "https://www.governing.com/acme-profile",
            2,
            "Acme AI's Jane Rivera on government chatbots",
          ),
        ],
      ),
    );
    expect(leadershipFinding(out)).toBeUndefined();
    expect(out.tierInputs.green_dimensions).toContain("D5");
  });

  it("green-flag facts cap at two even when more people corroborate", () => {
    const cites = [JANE, OMAR, PRIYA].map((p, i) =>
      cite(
        `https://www.governing.com/acme-${i}`,
        2,
        `Acme AI's ${p.name} interviewed`,
      ),
    );
    const out = assemble(input([JANE, OMAR, PRIYA], cites));
    const personFacts = out.greenFlagFacts.filter((f) =>
      f.fact.includes("appears in public sources"),
    );
    expect(personFacts).toHaveLength(2);
  });
});

describe("tier interaction", () => {
  it("an uncorroborated team lowers no tier on its own below the finding path", () => {
    /* Identity resolved + three greens elsewhere; a 3-person HIGH leadership
       finding is one unresolved HIGH — Tier 3 territory, never a T1 rout. */
    const out = assemble(input([JANE, OMAR, PRIYA], []));
    const decision = computeTier({
      ...out.tierInputs,
      green_dimensions: ["D1", "D2", "D3"],
      startup_bar_met: true,
    });
    expect(decision.tier).toBeGreaterThanOrEqual(2);
    expect(out.tierInputs.t1_triggers).toHaveLength(0);
  });
});
