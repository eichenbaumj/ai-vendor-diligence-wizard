/*
  Tests for affirmative-status claim arming (methodology D3.1 / section 6).

  The rule under test: registry-contradiction checks arm only when the pitch
  claims the program's own designation as a current status. Vague vocabulary
  and in-progress language never arm — under-arming is the safe direction,
  because the armed path ends in a CRITICAL contradiction.
*/
import { describe, expect, it } from "vitest";
import { PROGRAMS, affirmsProgram } from "@shared/claim-status.ts";

const claims = (...quotes: string[]) => quotes.map((quote) => ({ quote }));

describe("FedRAMP arming", () => {
  it("arms on the designation", () => {
    expect(affirmsProgram(claims("We are FedRAMP Authorized."), PROGRAMS.fedramp)).toBe(true);
    expect(
      affirmsProgram(claims("TrueTax holds a FedRAMP authorization at the Moderate baseline."), PROGRAMS.fedramp),
    ).toBe(true);
  });

  it("vague vocabulary does not arm the contradiction", () => {
    for (const q of [
      "Our platform is FedRAMP compliant.",
      "Built on FedRAMP-equivalent infrastructure.",
      "We follow FedRAMP security standards.",
    ]) {
      expect(affirmsProgram(claims(q), PROGRAMS.fedramp), q).toBe(false);
    }
  });

  it("in-progress language never arms", () => {
    for (const q of [
      "We are pursuing FedRAMP authorization.",
      "FedRAMP authorization in process.",
      "FedRAMP Authorized (pending approval Q2 2026).",
      "We expect FedRAMP authorization later this year.",
    ]) {
      expect(affirmsProgram(claims(q), PROGRAMS.fedramp), q).toBe(false);
    }
  });

  it("a pending footnote split into its own claim suppresses arming across quotes", () => {
    expect(
      affirmsProgram(
        claims("FedRAMP Authorized.", "FedRAMP status: pending approval Q2 2026."),
        PROGRAMS.fedramp,
      ),
    ).toBe(false);
  });

  it("no mention never arms", () => {
    expect(affirmsProgram(claims("SOC 2 Type II certified."), PROGRAMS.fedramp)).toBe(false);
    expect(affirmsProgram([], PROGRAMS.fedramp)).toBe(false);
  });
});

describe("GovRAMP / TX-RAMP / Sourcewell arming", () => {
  it("GovRAMP designations arm; pursuit does not", () => {
    expect(affirmsProgram(claims("We are GovRAMP Ready."), PROGRAMS.govramp)).toBe(true);
    expect(affirmsProgram(claims("StateRAMP Authorized since 2024."), PROGRAMS.govramp)).toBe(true);
    expect(
      affirmsProgram(claims("We are seeking GovRAMP authorization."), PROGRAMS.govramp),
    ).toBe(false);
  });

  it("TX-RAMP certification levels arm; mention alone does not", () => {
    expect(affirmsProgram(claims("TX-RAMP Level 2 certified."), PROGRAMS.txramp)).toBe(true);
    expect(affirmsProgram(claims("TX-RAMP provisional status."), PROGRAMS.txramp)).toBe(true);
    expect(
      affirmsProgram(claims("We are familiar with TX-RAMP requirements."), PROGRAMS.txramp),
    ).toBe(false);
  });

  it("Sourcewell contract-holder wording arms; exploration does not", () => {
    expect(
      affirmsProgram(claims("We hold a Sourcewell cooperative contract."), PROGRAMS.sourcewell),
    ).toBe(true);
    expect(
      affirmsProgram(claims("Available through our Sourcewell awarded contract #123."), PROGRAMS.sourcewell),
    ).toBe(true);
    expect(
      affirmsProgram(
        claims("We are exploring cooperative purchasing options for your state."),
        PROGRAMS.sourcewell,
      ),
    ).toBe(false);
  });
});
