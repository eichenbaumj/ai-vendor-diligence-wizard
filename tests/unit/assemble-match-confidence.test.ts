/*
  Tests for the v1.4 match-confidence rules in report assembly (the
  wrong-namesake defect class, 2026-08-29 live reads):

  - Favorable credit requires an EXACT match: a name-similarity USAspending
    recipient produces a labeled candidate row, never a green flag, a green
    dimension, or the startup bar.
  - The identity surfaces name a legal entity only from an exact-confidence
    record.
  - An affirmative end-of-registration designation on an exact SoS match
    becomes a labeled OFFICIAL_RECORD_FOUND row and a finding (domestic =
    CRITICAL), with record-only language.
  - Registry-feed rows carry code-templated notes with the exact status,
    and green-flag facts state the status level.
  - Person titles are attributed, and dated role-change coverage produces a
    code-templated conflict note instead of a re-asserted title.
*/
import { describe, expect, it } from "vitest";
import { assemble, type AssembleInput } from "@shared/assemble.ts";
import { lintText } from "@shared/lint.ts";
import type { Citation, PitchExtract, RegistryCheck } from "@shared/schemas.ts";

const AT = "2026-08-30T00:00:00.000Z";

function baseExtract(over: Partial<PitchExtract> = {}): PitchExtract {
  return {
    vendor_name_candidates: ["17A"],
    domains: [],
    addresses: [],
    sender_email: null,
    people: [],
    named_customers: [],
    claims: [],
    use_case_description: "Consulting for local government.",
    urgency_language: [],
    state_mentioned: null,
    injection_screen: {
      injection_suspected: false,
      addressed_to_ai: false,
      suspicious_spans: [],
    },
    ...over,
  };
}

function check(over: Partial<RegistryCheck> & { check_id: string }): RegistryCheck {
  return {
    source: "Test source",
    status: "hit",
    summary: "Test summary.",
    evidence_url: "https://example.gov/record",
    confidence: "exact",
    retrieved_at: AT,
    data: null,
    ...over,
  };
}

function input(over: Partial<AssembleInput> = {}): AssembleInput {
  return {
    extract: baseExtract(),
    checks: [],
    identity: { identity_resolved: false, identifiers_found: [] },
    citations: [],
    adv_findings: [],
    sector: { pack_ids: [], elevated: false, overlay_reason: null, state_items: [] },
    packs: {},
    resolvable: true,
    research_partial: false,
    generated_at: AT,
    ...over,
  };
}

describe("USAspending favorable credit requires an exact match", () => {
  const similarityUsasp = check({
    check_id: "usaspending_awards",
    source: "USAspending.gov",
    summary:
      "USAspending.gov shows 2 federal contract awards to a recipient named 17A WASHINGTON STREET, LLC in the last five years. The identity check weighs the name match.",
    confidence: "name_similarity",
  });

  it("a similarity recipient is a labeled candidate row, never credit", () => {
    const out = assemble(input({ checks: [similarityUsasp] }));
    const row = out.ledger.find((r) => r.methodology_ref === "d2-1");
    expect(row).toBeDefined();
    expect(row!.result).toBe("COULD_NOT_VERIFY");
    expect(row!.severity).toBeNull();
    expect(row!.match_confidence).toBe("name_similarity");
    /* The candidate-framed check summary is the note, code-templated. */
    expect(row!.note).toContain("17A WASHINGTON STREET, LLC");
    expect(out.tierInputs.green_dimensions).not.toContain("D2");
    expect(out.tierInputs.startup_bar_met).toBe(false);
    expect(out.greenFlagFacts.some((f) => /federal payment/i.test(f.fact))).toBe(false);
  });

  it("an exact recipient on a distinctive name WITH awards earns the verified row and green flag", () => {
    const out = assemble(
      input({
        extract: baseExtract({ vendor_name_candidates: ["Polimorphic"] }),
        checks: [
          {
            ...similarityUsasp,
            confidence: "exact",
            summary:
              "USAspending.gov shows 2 federal contract awards to a recipient named POLIMORPHIC, INC. in the last five years, totaling about $120,000. Federal payment records are strong evidence of real government work when the recipient is the same company; the identity check weighs the name match.",
            data: { recipient_name: "POLIMORPHIC, INC.", award_count: 2, total_amount: 120000 },
          },
        ],
      }),
    );
    const row = out.ledger.find((r) => r.methodology_ref === "d2-1");
    expect(row!.result).toBe("VERIFIED");
    expect(row!.match_confidence).toBe("exact");
    expect(row!.attribution).toBe("attributed");
    /* Methodology 1.7: the note is the lane's own summary, so the "same
       company" caution survives into the row (R2-F2, R2-F11 hedge loss). */
    expect(row!.note).toContain("same company");
    expect(out.tierInputs.green_dimensions).toContain("D2");
    const fact = out.greenFlagFacts.find((f) => /federal award/i.test(f.fact));
    expect(fact!.fact).toContain("2 federal awards");
    expect(fact!.fact).toContain("same company");
  });

  it("an exact recipient ENTRY with zero awards is a candidate row, never credit (methodology 1.7)", () => {
    /* Forerunner and Ironclad, round 2: the lane reported a recipient with
       "did not find contract awards in the last five years" and the run
       still minted a VERIFIED row and a federal track-record green flag. */
    const out = assemble(
      input({
        extract: baseExtract({ vendor_name_candidates: ["Polimorphic"] }),
        checks: [
          {
            ...similarityUsasp,
            confidence: "exact",
            summary:
              "USAspending.gov lists a recipient named POLIMORPHIC, INC., but we did not find contract awards in the last five years. If this is the same company, ask the vendor when it last worked with a federal agency.",
            data: { recipient_name: "POLIMORPHIC, INC.", award_count: 0, total_amount: 0 },
          },
        ],
      }),
    );
    const row = out.ledger.find((r) => r.methodology_ref === "d2-1");
    expect(row!.result).toBe("COULD_NOT_VERIFY");
    expect(row!.attribution).toBe("candidate");
    expect(row!.note).toContain("did not find contract awards");
    expect(row!.note).not.toContain("Names this short");
    expect(out.tierInputs.green_dimensions).not.toContain("D2");
    expect(out.greenFlagFacts.some((f) => /federal award/i.test(f.fact))).toBe(false);
  });

  it("an exact recipient on a degenerate short name stays a candidate (the seventeen-a lock, now in code)", () => {
    const out = assemble(
      input({
        checks: [
          {
            ...similarityUsasp,
            confidence: "exact",
            data: { recipient_name: "17A" },
          },
        ],
      }),
    );
    const row = out.ledger.find((r) => r.methodology_ref === "d2-1");
    expect(row!.result).toBe("COULD_NOT_VERIFY");
    expect(row!.attribution).toBe("candidate");
    expect(row!.note).toContain("earns no credit");
    expect(lintText(row!.note).filter((v) => v.kind === "banned")).toHaveLength(0);
    expect(out.tierInputs.green_dimensions).not.toContain("D2");
    expect(out.tierInputs.startup_bar_met).toBe(false);
  });
});

describe("identity surfaces name entities only from exact records", () => {
  it("a similarity SoS hit never puts a legal name on the green flag", () => {
    const sosSimilarity = check({
      check_id: "sos_ny",
      source: "New York Department of State (public inquiry service)",
      confidence: "name_similarity",
      data: { matches: [{ name: "17A WASHINGTON STREET, LLC" }] },
    });
    /* Identity resolved through other identifiers (e.g. EDGAR + RDAP). */
    const out = assemble(
      input({
        checks: [sosSimilarity],
        identity: {
          identity_resolved: true,
          identifiers_found: ["SEC EDGAR filing", "Domain registration record (RDAP)"],
        },
      }),
    );
    const flag = out.greenFlagFacts.find((f) => /registered legal entity/i.test(f.fact));
    expect(flag).toBeDefined();
    expect(flag!.fact).not.toContain("17A WASHINGTON STREET");
  });
});

describe("dissolution designations (the Citymart class)", () => {
  /* An ATTRIBUTED dissolution: the record carries a strong tie (the CEO
     named in class 1-2 coverage), stamped by adjudication. */
  const strongTie = {
    tied: true,
    strong: true,
    checkable: true,
    signals: [
      {
        kind: "officer" as const,
        strength: "strong" as const,
        value: "SASCHA HASELMAYER",
        vendor_source: "coverage" as const,
      },
    ],
  };
  const dissolvedNy = check({
    check_id: "sos_ny",
    source: "New York Department of State (public inquiry service)",
    confidence: "exact",
    summary:
      'New York business records include an entry under a matching name: CITYMART US INC., registered 2014-08-27, status listed as "Inactive" (Voluntarily Dissolved, effective 2022-12-30). The identity check weighs whether this record belongs to this vendor.',
    tie: strongTie,
    attribution: "attributed",
    data: {
      dissolved: {
        legal_name: "CITYMART US INC.",
        status: "Inactive",
        reason: "Voluntarily Dissolved",
        effective_date: "2022-12-30",
        record_id: "4628074",
        domestic: true,
      },
    },
  });

  it("an attributed domestic dissolution becomes a CRITICAL record row and finding", () => {
    const out = assemble(
      input({
        extract: baseExtract({ vendor_name_candidates: ["Citymart"] }),
        checks: [dissolvedNy],
      }),
    );
    const row = out.ledger.find((r) => r.id.startsWith("dissolved-"));
    expect(row).toBeDefined();
    expect(row!.result).toBe("OFFICIAL_RECORD_FOUND");
    expect(row!.severity).toBe("CRITICAL");
    expect(row!.evidence_tier).toBe("T1");
    expect(row!.match_confidence).toBe("exact");
    expect(row!.attribution).toBe("attributed");
    expect(row!.note).toContain("Voluntarily Dissolved");
    expect(row!.note).toContain("2022-12-30");
    /* The note names the tie that connects the record to the vendor. */
    expect(row!.note).toContain("SASCHA HASELMAYER");
    /* Record-only language: never failure or illegitimacy framing. */
    expect(lintText(row!.note).filter((v) => v.kind === "banned")).toHaveLength(0);
    const finding = out.tierInputs.findings.find((f) => f.id.startsWith("dissolved-"));
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe("CRITICAL");
    /* The gap question asks for the contracting entity. */
    expect(out.questions.some((q) => q.id === "gap-dissolved")).toBe(true);
  });

  it("an attributed non-domestic designation stays HIGH", () => {
    const foreign = {
      ...dissolvedNy,
      data: {
        dissolved: {
          ...(dissolvedNy.data as { dissolved: Record<string, unknown> }).dissolved,
          domestic: false,
        },
      },
    };
    const out = assemble(input({ checks: [foreign] }));
    const finding = out.tierInputs.findings.find((f) => f.id.startsWith("dissolved-"));
    expect(finding!.severity).toBe("HIGH");
  });

  it("an UNTIED dissolution is a candidate row and a question, never a finding (the Polco class)", () => {
    const untied = {
      ...dissolvedNy,
      tie: { tied: false, strong: false, checkable: true, signals: [] },
      attribution: "candidate" as const,
      data: {
        dissolved: {
          legal_name: "POLCO INC.",
          status: "Inactive",
          reason: "Dissolution by Proclamation",
          effective_date: "2011-01-26",
          record_id: "3084913",
          domestic: true,
        },
      },
    };
    const out = assemble(
      input({
        extract: baseExtract({ vendor_name_candidates: ["Polco"] }),
        checks: [untied],
      }),
    );
    const row = out.ledger.find((r) => r.id.startsWith("dissolved-"));
    expect(row).toBeDefined();
    expect(row!.severity).toBeNull();
    expect(row!.attribution).toBe("candidate");
    expect(row!.note).toContain("candidate record");
    expect(row!.note).toContain("earns no credit and drives no warning");
    expect(lintText(row!.note).filter((v) => v.kind === "banned")).toHaveLength(0);
    /* No HIGH/CRITICAL finding: the tier cannot move. */
    expect(
      out.tierInputs.findings.some(
        (f) =>
          f.id.startsWith("dissolved-") &&
          (f.severity === "HIGH" || f.severity === "CRITICAL"),
      ),
    ).toBe(false);
    /* The candidate-record question still reaches the buyer. */
    expect(out.questions.some((q) => q.id === "gap-dissolved-candidate")).toBe(true);
    expect(out.questions.some((q) => q.id === "gap-dissolved")).toBe(false);
  });

  it("an attributed TERMINATED foreign registration is record-only information (the CivicPlus rule)", () => {
    const terminated = {
      ...dissolvedNy,
      data: {
        dissolved: {
          legal_name: "CIVICSIGNAL INC",
          status: "Inactive: Terminated",
          reason: null,
          effective_date: "2019-12-09",
          record_id: "5555555",
          domestic: false,
          designation_class: "withdrawal",
        },
      },
    };
    const out = assemble(
      input({
        extract: baseExtract({ vendor_name_candidates: ["CivicSignal"] }),
        checks: [terminated],
      }),
    );
    const row = out.ledger.find((r) => r.id.startsWith("withdrawn-"));
    expect(row).toBeDefined();
    expect(row!.severity).toBe("INFO");
    expect(row!.note).toContain("routine record-keeping");
    expect(row!.note).toContain("not a dissolution");
    expect(row!.note).toContain("which legal entity would sign a contract today");
    expect(lintText(row!.note).filter((v) => v.kind === "banned")).toHaveLength(0);
    /* No finding of any severity: the tier cannot move. */
    expect(out.tierInputs.findings.some((f) => f.id.startsWith("dissolved"))).toBe(false);
    expect(out.ledger.some((r) => r.id.startsWith("dissolved-"))).toBe(false);
  });

  it("an attributed DOMESTIC withdrawal keeps dissolution-class treatment", () => {
    const domesticTerminated = {
      ...dissolvedNy,
      data: {
        dissolved: {
          legal_name: "CIVICSIGNAL INC",
          status: "Terminated",
          reason: null,
          effective_date: "2019-12-09",
          record_id: "5555555",
          domestic: true,
          designation_class: "withdrawal",
        },
      },
    };
    const out = assemble(input({ checks: [domesticTerminated] }));
    const finding = out.tierInputs.findings.find((f) => f.id.startsWith("dissolved-"));
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe("CRITICAL");
  });

  it("an unadjudicated dissolution (no attribution field) defaults to candidate", () => {
    const { tie: _tie, attribution: _attr, ...bare } = dissolvedNy;
    const out = assemble(
      input({
        extract: baseExtract({ vendor_name_candidates: ["Citymart"] }),
        checks: [bare as typeof dissolvedNy],
      }),
    );
    const row = out.ledger.find((r) => r.id.startsWith("dissolved-"));
    expect(row!.severity).toBeNull();
    expect(row!.attribution).toBe("candidate");
  });
});

describe("registry-feed rows carry exact status in code-templated copy", () => {
  const govrampHit = check({
    check_id: "govramp",
    source: "GovRAMP",
    summary:
      "The GovRAMP participant list includes Tyler Technologies with status Progressing. Note that GovRAMP has several levels; the status shown here is the one that counts, and membership alone is not a security verification.",
    data: {
      matches: [{ provider: "Tyler Technologies", status: "Progressing", confidence: "exact" }],
      claimed: false,
    },
  });

  it("the row note is the check summary and the fact states the status", () => {
    const out = assemble(
      input({
        extract: baseExtract({ vendor_name_candidates: ["Tyler Technologies"] }),
        checks: [govrampHit],
      }),
    );
    const row = out.ledger.find((r) => r.methodology_ref === "d3-2");
    expect(row!.note).toContain("status Progressing");
    const fact = out.greenFlagFacts.find((f) => /GovRAMP/i.test(f.fact));
    expect(fact).toBeDefined();
    expect(fact!.fact).toContain('with status "Progressing"');
  });

  it("a similarity feed match with a product tie keeps labeled credit", () => {
    const similar = {
      ...govrampHit,
      confidence: "name_similarity" as const,
      tie: {
        tied: true,
        strong: true,
        checkable: true,
        signals: [
          {
            kind: "feed_product" as const,
            strength: "strong" as const,
            value: "Accela Civic Platform",
            vendor_source: "pitch" as const,
          },
        ],
      },
      data: {
        matches: [
          {
            provider: "Accela Government Solutions",
            product: "Accela Civic Platform",
            status: "Ready",
            confidence: "name_similarity",
          },
        ],
        claimed: false,
      },
    };
    const out = assemble(
      input({
        extract: baseExtract({ vendor_name_candidates: ["Accela"] }),
        checks: [similar],
      }),
    );
    const fact = out.greenFlagFacts.find((f) => /GovRAMP/i.test(f.fact));
    expect(fact!.fact).toContain("similar name Accela Government Solutions");
    const row = out.ledger.find((r) => r.methodology_ref === "d3-2");
    expect(row!.match_confidence).toBe("name_similarity");
    expect(row!.result).toBe("VERIFIED");
  });

  it("a similarity feed match WITHOUT a product tie is a candidate row, never credit", () => {
    const similar = {
      ...govrampHit,
      confidence: "name_similarity" as const,
      data: {
        matches: [
          { provider: "Accela Government Solutions", status: "Ready", confidence: "name_similarity" },
        ],
        claimed: false,
      },
    };
    const out = assemble(
      input({
        extract: baseExtract({ vendor_name_candidates: ["Accela"] }),
        checks: [similar],
      }),
    );
    expect(out.greenFlagFacts.some((f) => /GovRAMP/i.test(f.fact))).toBe(false);
    expect(out.tierInputs.green_dimensions).not.toContain("D3");
    const row = out.ledger.find((r) => r.methodology_ref === "d3-2");
    expect(row!.result).toBe("COULD_NOT_VERIFY");
    expect(row!.attribution).toBe("candidate");
    expect(row!.note).toContain("candidate record");
    expect(lintText(row!.note).filter((v) => v.kind === "banned")).toHaveLength(0);
  });
});

describe("person titles are attributed; role-change coverage is dated", () => {
  const bookman = { name: "Zac Bookman", title: "CEO" };
  const successionCite: Citation = {
    url: "https://www.govtech.com/opengov-appoints-new-ceo",
    title: "OpenGov Appoints New CEO",
    cited_text:
      "OpenGov announced Thiago Sa Freire will succeed Zac Bookman as chief executive.",
    retrieved_at: AT,
    domain_class: 2,
  };

  it("the conflict note is code-templated and never re-asserts the title", () => {
    const out = assemble(
      input({
        extract: baseExtract({
          vendor_name_candidates: ["OpenGov"],
          people: [bookman],
          claims: [
            { id: "clm-1", type: "team", quote: "CEO Zac Bookman", subject: "Zac Bookman" },
          ],
        }),
        citations: [successionCite],
        pitch_person_count: 1,
      }),
    );
    const row = out.ledger.find((r) => r.methodology_ref === "d5-1");
    expect(row).toBeDefined();
    expect(row!.note).toContain("described in the pitch as CEO");
    expect(row!.note).toContain("discusses a change in the CEO role");
    expect(row!.note).toContain("confirm who holds the title today");
    const flag = out.greenFlagFacts.find((f) => f.fact.startsWith("Zac Bookman"));
    expect(flag).toBeDefined();
    expect(flag!.fact).toContain("described in the pitch as CEO");
    expect(flag!.fact).not.toMatch(/Zac Bookman \(CEO\)/);
  });

  it("no role-change coverage leaves the note to the narrative pass", () => {
    const quietCite: Citation = {
      ...successionCite,
      title: "OpenGov expands Ohio work",
      cited_text: "Zac Bookman of OpenGov discussed the expansion.",
    };
    const out = assemble(
      input({
        extract: baseExtract({
          vendor_name_candidates: ["OpenGov"],
          people: [bookman],
        }),
        citations: [quietCite],
        pitch_person_count: 1,
      }),
    );
    const row = out.ledger.find((r) => r.methodology_ref === "d5-1");
    expect(row!.result).toBe("VERIFIED");
    expect(row!.note).toBe("");
  });
});

describe("feed containment credit (v1.6, the Tyler FedRAMP class)", () => {
  const tylerFedramp = check({
    check_id: "fedramp_marketplace",
    source: "FedRAMP Marketplace",
    confidence: "name_similarity",
    summary:
      "The FedRAMP Marketplace feed lists Tyler Technologies Data & Insights with status Authorized. Confirm at the link that the listed product is the one being pitched to you.",
    data: {
      matches: [
        {
          provider: "Tyler Technologies Data & Insights",
          status: "Authorized",
          confidence: "name_similarity",
          containment: "query_in_record",
          matched_query: "Tyler Technologies",
        },
      ],
      claimed_fedramp: false,
    },
  });

  it("a listed name containing the vendor's full multi-token name earns credit", () => {
    const out = assemble(
      input({
        extract: baseExtract({ vendor_name_candidates: ["Tyler Technologies"] }),
        checks: [tylerFedramp],
      }),
    );
    const row = out.ledger.find((r) => r.methodology_ref === "d3-1");
    expect(row).toBeDefined();
    expect(row!.result).toBe("VERIFIED");
    expect(row!.match_confidence).toBe("name_similarity");
    /* The product-scope caveat stays in the code-templated note. */
    expect(row!.note).toContain("Confirm at the link");
    expect(out.tierInputs.green_dimensions).toContain("D3");
  });

  it("the namesake direction (record_in_query) never credits this way", () => {
    const namesake = {
      ...tylerFedramp,
      data: {
        matches: [
          {
            provider: "Tyler",
            status: "Authorized",
            confidence: "name_similarity",
            containment: "record_in_query",
            matched_query: "Tyler Technologies Data & Insights",
          },
        ],
        claimed_fedramp: false,
      },
    };
    const out = assemble(
      input({
        extract: baseExtract({
          vendor_name_candidates: ["Tyler Technologies Data & Insights"],
        }),
        checks: [namesake],
      }),
    );
    const row = out.ledger.find((r) => r.methodology_ref === "d3-1");
    expect(row!.result).toBe("COULD_NOT_VERIFY");
    expect(row!.attribution).toBe("candidate");
    expect(out.tierInputs.green_dimensions).not.toContain("D3");
  });

  it("a single-token or degenerate contained query never credits", () => {
    const shortQuery = {
      ...tylerFedramp,
      data: {
        matches: [
          {
            provider: "Zip Recruiting Technologies",
            status: "Authorized",
            confidence: "name_similarity",
            containment: "query_in_record",
            matched_query: "Zip",
          },
        ],
        claimed_fedramp: false,
      },
    };
    const out = assemble(
      input({
        extract: baseExtract({ vendor_name_candidates: ["Zip"] }),
        checks: [shortQuery],
      }),
    );
    const row = out.ledger.find((r) => r.methodology_ref === "d3-1");
    expect(row!.result).toBe("COULD_NOT_VERIFY");
    expect(row!.attribution).toBe("candidate");
  });

  it("a stacked-suffix query that strips to a degenerate brand never credits (the Zip Co Ltd class)", () => {
    const stacked = {
      ...tylerFedramp,
      data: {
        matches: [
          {
            provider: "Zip Payments Technologies",
            status: "Authorized",
            confidence: "name_similarity",
            containment: "query_in_record",
            matched_query: "Zip Co Ltd",
          },
        ],
        claimed_fedramp: false,
      },
    };
    const out = assemble(
      input({
        extract: baseExtract({ vendor_name_candidates: ["Zip Co Ltd"] }),
        checks: [stacked],
      }),
    );
    const row = out.ledger.find((r) => r.methodology_ref === "d3-1");
    expect(row!.result).toBe("COULD_NOT_VERIFY");
    expect(row!.attribution).toBe("candidate");
  });

  it("a PRODUCT name from the pitch never earns containment credit, only the vendor's own name", () => {
    /* The feed lanes receive product names from the "X by Y" split; a
       product name matching an unrelated firm's listing must never turn
       into that firm's compliance credit. */
    const productMatch = {
      ...tylerFedramp,
      data: {
        matches: [
          {
            provider: "Civic Sense Technologies",
            status: "Authorized",
            confidence: "name_similarity",
            containment: "query_in_record",
            matched_query: "Civic Sense",
          },
        ],
        claimed_fedramp: false,
      },
    };
    const out = assemble(
      input({
        extract: baseExtract({
          vendor_name_candidates: ["Civic Sense by Acme Labs"],
        }),
        checks: [productMatch],
      }),
    );
    const row = out.ledger.find((r) => r.methodology_ref === "d3-1");
    expect(row!.result).toBe("COULD_NOT_VERIFY");
    expect(row!.attribution).toBe("candidate");
    expect(out.tierInputs.green_dimensions).not.toContain("D3");
  });

  it("a token-subset that is not an ordered prefix never credits (the Alto Networks class)", () => {
    /* "Alto Networks" is a token subset of "Palo Alto Networks" but the
       listing does not BEGIN with it: crediting scrambled subsets would
       let any two-token fragment inherit an unrelated provider's
       authorization. */
    const subset = {
      ...tylerFedramp,
      data: {
        matches: [
          {
            provider: "Palo Alto Networks",
            status: "Authorized",
            confidence: "name_similarity",
            containment: "query_in_record",
            matched_query: "Alto Networks",
          },
        ],
        claimed_fedramp: false,
      },
    };
    const out = assemble(
      input({
        extract: baseExtract({ vendor_name_candidates: ["Alto Networks"] }),
        checks: [subset],
      }),
    );
    const row = out.ledger.find((r) => r.methodology_ref === "d3-1");
    expect(row!.result).toBe("COULD_NOT_VERIFY");
    expect(row!.attribution).toBe("candidate");
    expect(out.tierInputs.green_dimensions).not.toContain("D3");
  });

  it("a similarity match with no containment metadata stays a candidate (older lanes)", () => {
    const bare = {
      ...tylerFedramp,
      data: {
        matches: [
          {
            provider: "Tyler Technologies Data & Insights",
            status: "Authorized",
            confidence: "name_similarity",
          },
        ],
        claimed_fedramp: false,
      },
    };
    const out = assemble(
      input({
        extract: baseExtract({ vendor_name_candidates: ["Tyler Technologies"] }),
        checks: [bare],
      }),
    );
    const row = out.ledger.find((r) => r.methodology_ref === "d3-1");
    expect(row!.result).toBe("COULD_NOT_VERIFY");
  });
});

describe("site_discovery disclosure surfaces in the honesty panel (v1.6)", () => {
  it("renders as could_not_check with the template as reason, grouped unavailable", () => {
    const disclosure = check({
      check_id: "site_discovery",
      source: "Vendor website discovery",
      status: "coverage_limited",
      confidence: null,
      summary:
        "We could not find this vendor's website from its name alone, so the website checks did not run. This does not count against the vendor. To include those checks, run a new check with the vendor's web address pasted in.",
      evidence_url: null,
      data: { failure_kind: "not_found" },
    });
    const out = assemble(input({ checks: [disclosure] }));
    const row = out.honesty.find((h) => h.check_id === "site_discovery");
    expect(row).toBeDefined();
    expect(row!.status).toBe("could_not_check");
    expect(row!.label).toBe("Vendor website discovery");
    expect(row!.reason).toBe(disclosure.summary);
    expect(row!.reason!.length).toBeLessThanOrEqual(300);
    expect(row!.group).toBe("unavailable");
  });
});

describe("domain-age rows on claim-less runs", () => {
  it("the row says no claims existed and the note is the check summary", () => {
    const rdap = check({
      check_id: "rdap_domain_age",
      source: "Domain registration records (RDAP)",
      summary: "The domain govra.com was registered in March 2014.",
      data: {
        registered: true,
        registration_date: "2014-03-01T00:00:00.000Z",
        registered_year: 2014,
        claimed_year: null,
        contradiction: false,
      },
    });
    const out = assemble(input({ checks: [rdap] }));
    const row = out.ledger.find((r) => r.methodology_ref === "d1-4");
    expect(row!.what_checked).toContain("no age or history claims were made");
    expect(row!.note).toBe("The domain govra.com was registered in March 2014.");
  });
});
