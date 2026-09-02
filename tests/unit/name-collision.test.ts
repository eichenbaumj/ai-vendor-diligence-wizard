/*
  The name collision notice (methodology 1.7): informational, records-only
  wording, sized under the honesty reason cap by construction, and fired
  only on bare-name runs with two or more refused exact-name records.
*/
import { describe, expect, it } from "vitest";
import {
  NAME_COLLISION_CHECK_ID,
  NAME_COLLISION_NOTICE,
  NAME_COLLISION_THRESHOLD,
  nameCollisionApplies,
  nameCollisionItem,
  nameCollisionReason,
} from "@shared/name-collision.ts";
import { HonestyItem } from "@shared/schemas.ts";
import { lintText } from "@shared/lint.ts";
import { namesakeCensus } from "@shared/identity-ties.ts";
import type { RegistryCheck } from "@shared/schemas.ts";

describe("nameCollisionItem", () => {
  it("parses as an honesty item under the flag group with a reason under the cap for any count", () => {
    for (const n of [1, 2, 7, 42, 999, 123456]) {
      const item = nameCollisionItem(n);
      expect(HonestyItem.safeParse(item).success).toBe(true);
      expect(item.check_id).toBe(NAME_COLLISION_CHECK_ID);
      expect(item.status).toBe("flag");
      expect(item.group).toBe("flag");
      expect(item.reason!.length).toBeLessThanOrEqual(300);
      expect(lintText(item.reason!).filter((v) => v.kind === "banned")).toEqual([]);
      expect(item.reason).not.toContain("\u2014");
    }
    expect(nameCollisionReason(2)).toContain("At least 2 registry records");
    expect(nameCollisionReason(2)).toContain("earn no credit and drive no warning");
    expect(nameCollisionReason(2)).not.toMatch(/other compan/i);
  });
  it("the overview notice is records-only and lint-clean", () => {
    expect(lintText(NAME_COLLISION_NOTICE).filter((v) => v.kind === "banned")).toEqual([]);
    expect(NAME_COLLISION_NOTICE).not.toContain("\u2014");
    expect(NAME_COLLISION_NOTICE).not.toMatch(/other compan/i);
  });
});

describe("nameCollisionApplies", () => {
  it("fires only on name runs without a website at the threshold", () => {
    expect(NAME_COLLISION_THRESHOLD).toBe(2);
    expect(nameCollisionApplies({ inputKind: "name", submittedDomain: null, namesakeRecords: 2 })).toBe(true);
    expect(nameCollisionApplies({ inputKind: "name", submittedDomain: null, namesakeRecords: 1 })).toBe(false);
    expect(nameCollisionApplies({ inputKind: "name", submittedDomain: "polco.us", namesakeRecords: 5 })).toBe(false);
    expect(nameCollisionApplies({ inputKind: "url", submittedDomain: "acme.com", namesakeRecords: 5 })).toBe(false);
    expect(nameCollisionApplies({ inputKind: "paste", submittedDomain: null, namesakeRecords: 5 })).toBe(false);
  });
});

describe("namesakeCensus", () => {
  const AT = "2026-09-01T00:00:00.000Z";
  const sos = (id: string, matches: Record<string, unknown>[], attribution?: "attributed" | "candidate"): RegistryCheck => ({
    check_id: id,
    source: id,
    status: "hit",
    summary: "",
    evidence_url: null,
    confidence: matches.some((m) => m.confidence === "exact") ? "exact" : "name_similarity",
    retrieved_at: AT,
    data: { matches, rejected_product_only: ["ACME PRODUCTS LLC"], rejected_investment_vehicles: ["ACME SERIES FUND LP"] },
    ...(attribution ? { attribution } : {}),
  });
  it("counts distinct refused exact names across lanes and skips credited names, similarity noise, and rejected names", () => {
    const checks = [
      sos("sos_tx", [{ name: "ACME, INC.", confidence: "exact", status: "ACTIVE" }], "attributed"),
      sos("sos_ny", [{ name: "ACME INC.", confidence: "exact", status: "Inactive" }], "candidate"),
      sos("sos_co", [{ name: "ACME LLC", confidence: "exact", status: "Good Standing" }], "candidate"),
      sos("sos_ct", [{ name: "ACME LLC", confidence: "exact", status: "Active" }], "candidate"),
      sos("sos_or", [{ name: "ACME FIELD SERVICES LLC", confidence: "name_similarity", status: "Active" }], "candidate"),
    ];
    /* ACME INC. (NY) normalizes to the credited ACME, INC. and is not a
       namesake; ACME LLC appears in two states and counts once. */
    expect(namesakeCensus(checks)).toBe(1);
  });
  it("counts the dissolved exact candidate and an uncredited EDGAR exact entity", () => {
    const checks: RegistryCheck[] = [
      sos("sos_ny", [{ name: "POLCO INC.", confidence: "exact", status: "Inactive" }], "candidate"),
      sos("sos_co", [{ name: "POLCO, INC.", confidence: "name_similarity", status: "Dissolved" }], "candidate"),
      {
        check_id: "edgar_fts",
        source: "SEC EDGAR",
        status: "hit",
        summary: "",
        evidence_url: null,
        confidence: "exact",
        retrieved_at: AT,
        data: { filing_entities: [{ name: "Polco Holdings, Inc.", confidence: "exact" }, { name: "POLCO INC.", confidence: "exact" }] },
        attribution: "candidate",
      },
    ];
    expect(namesakeCensus(checks)).toBe(2);
    expect(namesakeCensus([])).toBe(0);
  });
});
