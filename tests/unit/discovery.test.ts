/*
  Name-only website discovery with one bounded retry (v1.6).

  The rules under test: an infrastructure-class failure (no narrative, no
  citations) earns exactly one retry while the budget allows; an honest
  miss (the model answered, code picked no domain) is an answer and never
  retried; the domain is picked by code from harvested citations; usage
  aggregates across attempts; the two attempts run under their own
  deadlines.
*/
import { describe, expect, it, vi } from "vitest";
import {
  DISCOVERY_ATTEMPT_1_DEADLINE_MS,
  DISCOVERY_ATTEMPT_2_DEADLINE_MS,
  classifyDiscoveryOutcome,
  discoverVendorSite,
} from "@shared/discovery.ts";
import { DISCOVERY_RETRY_CUTOFF_MS } from "@shared/s1b-budget.ts";
import type { ResearchRunResult, Usage } from "@shared/anthropic-client.ts";

const NAMES = ["Acme AI"];
const NOW = () => new Date("2026-09-01T12:00:00.000Z");

function usage(input: number): Usage {
  return {
    input_tokens: input,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    web_search_requests: 1,
  };
}

function foundRun(): ResearchRunResult {
  return {
    narrative: "The company's own website appears to be acmeai.com.",
    citations: [
      {
        url: "https://acmeai.com/about",
        title: "About Acme AI",
        cited_text: "Acme AI builds tools for cities.",
      },
    ],
    partial: false,
    usage: usage(100),
    continuations: 0,
  };
}

function emptyRun(): ResearchRunResult {
  return {
    narrative: "",
    citations: [],
    partial: true,
    usage: usage(10),
    continuations: 0,
  };
}

function noMatchRun(): ResearchRunResult {
  return {
    narrative:
      "The searches did not make it clear which domain is the company's own website.",
    citations: [],
    partial: false,
    usage: usage(80),
    continuations: 0,
  };
}

describe("classifyDiscoveryOutcome", () => {
  it("domain_found whenever a domain was picked", () => {
    expect(
      classifyDiscoveryOutcome({ domain: "acmeai.com", narrative: "", citationCount: 0 }),
    ).toBe("domain_found");
  });

  it("no_match when the model answered but no domain was picked", () => {
    expect(
      classifyDiscoveryOutcome({ domain: null, narrative: "Unclear.", citationCount: 0 }),
    ).toBe("no_match");
    expect(
      classifyDiscoveryOutcome({ domain: null, narrative: "", citationCount: 2 }),
    ).toBe("no_match");
  });

  it("infra_failure only on empty content: no narrative, no citations", () => {
    expect(
      classifyDiscoveryOutcome({ domain: null, narrative: "", citationCount: 0 }),
    ).toBe("infra_failure");
    expect(
      classifyDiscoveryOutcome({ domain: null, narrative: "   \n", citationCount: 0 }),
    ).toBe("infra_failure");
  });
});

describe("discoverVendorSite", () => {
  it("finds the domain in one attempt and reports it", async () => {
    const runLoop = vi.fn().mockResolvedValue(foundRun());
    const out = await discoverVendorSite(NAMES, NAMES, {
      apiKey: "k",
      elapsedMs: () => 5_000,
      runLoop,
      now: NOW,
    });
    expect(out.domain).toBe("acmeai.com");
    expect(out.outcome).toBe("domain_found");
    expect(out.attempts).toBe(1);
    expect(runLoop).toHaveBeenCalledTimes(1);
    expect(runLoop.mock.calls[0][1]).toMatchObject({
      deadlineMs: DISCOVERY_ATTEMPT_1_DEADLINE_MS,
      maxContinuations: 1,
    });
  });

  it("retries once on an infrastructure failure and uses the second answer", async () => {
    const runLoop = vi
      .fn()
      .mockResolvedValueOnce(emptyRun())
      .mockResolvedValueOnce(foundRun());
    const out = await discoverVendorSite(NAMES, NAMES, {
      apiKey: "k",
      elapsedMs: () => 5_000,
      runLoop,
      now: NOW,
    });
    expect(out.domain).toBe("acmeai.com");
    expect(out.outcome).toBe("domain_found");
    expect(out.attempts).toBe(2);
    expect(runLoop).toHaveBeenCalledTimes(2);
    expect(runLoop.mock.calls[1][1]).toMatchObject({
      deadlineMs: DISCOVERY_ATTEMPT_2_DEADLINE_MS,
    });
    /* Usage aggregates across attempts. */
    expect(out.usage.input_tokens).toBe(110);
    expect(out.usage.web_search_requests).toBe(2);
  });

  it("a miss earns exactly one REFINED retry; a second miss is the answer", async () => {
    const runLoop = vi.fn().mockResolvedValue(noMatchRun());
    const out = await discoverVendorSite(NAMES, NAMES, {
      apiKey: "k",
      elapsedMs: () => 5_000,
      runLoop,
      now: NOW,
    });
    expect(out.domain).toBeNull();
    expect(out.outcome).toBe("no_match");
    expect(out.attempts).toBe(2);
    expect(runLoop).toHaveBeenCalledTimes(2);
    /* The retry uses the refined query variant, never the identical
       request: re-sending a bare short-name search re-fetches the same
       noise. Tools and message stay byte-identical; only the
       code-authored system prompt changes. */
    const [first, second] = [runLoop.mock.calls[0][0], runLoop.mock.calls[1][0]];
    expect(second.system).not.toBe(first.system);
    expect(second.system).toContain("more specific queries");
    expect(second.tools).toEqual(first.tools);
    expect(second.messages).toEqual(first.messages);
  });

  it("a miss found on the refined retry reports the domain", async () => {
    const runLoop = vi
      .fn()
      .mockResolvedValueOnce(noMatchRun())
      .mockResolvedValueOnce(foundRun());
    const out = await discoverVendorSite(NAMES, NAMES, {
      apiKey: "k",
      elapsedMs: () => 5_000,
      runLoop,
      now: NOW,
    });
    expect(out.domain).toBe("acmeai.com");
    expect(out.outcome).toBe("domain_found");
    expect(out.attempts).toBe(2);
  });

  it("a miss past the budget cutoff is not retried", async () => {
    const runLoop = vi.fn().mockResolvedValue(noMatchRun());
    const out = await discoverVendorSite(NAMES, NAMES, {
      apiKey: "k",
      elapsedMs: () => DISCOVERY_RETRY_CUTOFF_MS,
      runLoop,
      now: NOW,
    });
    expect(out.outcome).toBe("no_match");
    expect(out.attempts).toBe(1);
  });

  it("skips the retry once the budget cutoff has passed", async () => {
    const runLoop = vi.fn().mockResolvedValue(emptyRun());
    const out = await discoverVendorSite(NAMES, NAMES, {
      apiKey: "k",
      elapsedMs: () => DISCOVERY_RETRY_CUTOFF_MS,
      runLoop,
      now: NOW,
    });
    expect(out.outcome).toBe("infra_failure");
    expect(out.attempts).toBe(1);
    expect(runLoop).toHaveBeenCalledTimes(1);
  });

  it("an infrastructure retry re-sends the IDENTICAL request", async () => {
    const runLoop = vi
      .fn()
      .mockResolvedValueOnce(emptyRun())
      .mockResolvedValueOnce(noMatchRun());
    const out = await discoverVendorSite(NAMES, NAMES, {
      apiKey: "k",
      elapsedMs: () => 5_000,
      runLoop,
      now: NOW,
    });
    expect(out.domain).toBeNull();
    expect(out.outcome).toBe("no_match");
    expect(out.attempts).toBe(2);
    /* An infra failure says nothing about the query, so the retry
       re-runs the SAME request byte for byte. */
    expect(runLoop.mock.calls[1][0]).toEqual(runLoop.mock.calls[0][0]);
  });

  it("reports infra_failure with no domain when both attempts come back empty", async () => {
    const runLoop = vi.fn().mockResolvedValue(emptyRun());
    const out = await discoverVendorSite(NAMES, NAMES, {
      apiKey: "k",
      elapsedMs: () => 5_000,
      runLoop,
      now: NOW,
    });
    expect(out.domain).toBeNull();
    expect(out.outcome).toBe("infra_failure");
    expect(out.attempts).toBe(2);
    expect(out.usage.input_tokens).toBe(20);
  });
});
