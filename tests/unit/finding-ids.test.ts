/*
  Tests for the finding-id vocabulary (finding-ids.ts) and the source-scan
  guarantee behind it: every literal id that assemble.ts pushes into the
  findings array must be declared in FINDING_IDS or match a declared prefix,
  so pack YAML select.finding_ids metadata and code cannot drift apart.
*/
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  FINDING_IDS,
  FINDING_PREFIXES,
  findingSelectorMatches,
  isKnownFindingId,
  isValidFindingSelector,
} from "@shared/finding-ids.ts";

/* ----------------------------------------------- source scan of assemble.ts */

const ASSEMBLE_PATH = fileURLToPath(
  new URL("../../supabase/functions/_shared/assemble.ts", import.meta.url),
);

/*
  Extract the id of every findings.push({ ... }) site. Robust to formatting:
  finds each push call, balances braces to isolate the object literal (the
  braces inside template literals like `perf-${claim.id}` are themselves
  balanced, so counting stays correct), then reads the first id property.
*/
interface PushSite {
  raw: string | null; // null: the block had no parseable id literal
  template: boolean;
  excerpt: string;
}

function scanFindingPushIds(source: string): PushSite[] {
  const out: PushSite[] = [];
  const re = /findings\.push\s*\(\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const start = source.indexOf("{", m.index);
    let depth = 0;
    let end = start;
    for (let i = start; i < source.length; i++) {
      if (source[i] === "{") depth += 1;
      else if (source[i] === "}") {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    const block = source.slice(start, end + 1);
    const excerpt = block.slice(0, 200);
    const idMatch = block.match(/\bid:\s*(?:"([^"]*)"|`([^`]*)`)/);
    if (!idMatch) out.push({ raw: null, template: false, excerpt });
    else if (idMatch[1] !== undefined)
      out.push({ raw: idMatch[1], template: false, excerpt });
    else out.push({ raw: idMatch[2] ?? null, template: true, excerpt });
  }
  return out;
}

describe("assemble.ts findings.push ids stay inside the declared vocabulary", () => {
  const source = readFileSync(ASSEMBLE_PATH, "utf8");
  const pushed = scanFindingPushIds(source);

  it("the scan finds the finding-push sites (guard against parser rot)", () => {
    /* assemble.ts pushes 13 findings today; a rewrite that drops below 10
       more likely broke this parser than deleted a quarter of the checks. */
    expect(pushed.length).toBeGreaterThanOrEqual(10);
  });

  it("every push site carries a parseable string or template id literal", () => {
    for (const p of pushed) {
      expect(
        p.raw,
        `findings.push site has no parseable id literal:\n${p.excerpt}`,
      ).not.toBeNull();
    }
  });

  const literalIds = pushed
    .filter((x) => !x.template)
    .map((x) => x.raw)
    .filter((r): r is string => r !== null);
  const templatedIds = pushed
    .filter((x) => x.template)
    .map((x) => x.raw)
    .filter((r): r is string => r !== null);

  it("every literal id is declared in FINDING_IDS", () => {
    for (const raw of literalIds) {
      expect(
        (FINDING_IDS as readonly string[]).includes(raw),
        `assemble.ts pushes finding id "${raw}" which is not in FINDING_IDS (finding-ids.ts)`,
      ).toBe(true);
    }
  });

  it("every templated id starts with a declared prefix", () => {
    expect(templatedIds.length).toBeGreaterThanOrEqual(1); // perf-${claim.id}
    for (const raw of templatedIds) {
      const staticPrefix = raw.split("${")[0];
      expect(
        FINDING_PREFIXES.some((prefix) => staticPrefix.startsWith(prefix)),
        `assemble.ts pushes templated finding id \`${raw}\` whose static prefix "${staticPrefix}" matches no FINDING_PREFIXES entry`,
      ).toBe(true);
    }
  });

  it("every declared FINDING_ID is actually pushed somewhere (no dead vocabulary)", () => {
    const literals = new Set(literalIds);
    for (const id of FINDING_IDS) {
      expect(literals.has(id), `FINDING_IDS declares "${id}" but assemble.ts never pushes it`).toBe(true);
    }
  });
});

/* ----------------------------------------------------------- pure helpers */

describe("isValidFindingSelector", () => {
  it("accepts every declared exact id", () => {
    for (const id of FINDING_IDS) expect(isValidFindingSelector(id)).toBe(true);
  });

  it("accepts the declared prefix form", () => {
    expect(isValidFindingSelector("perf-*")).toBe(true);
  });

  it("rejects unknown ids and undeclared prefix forms", () => {
    expect(isValidFindingSelector("nonexistent-id")).toBe(false);
    expect(isValidFindingSelector("excl*")).toBe(false);
    expect(isValidFindingSelector("*")).toBe(false);
    expect(isValidFindingSelector("perf-")).toBe(false);
    expect(isValidFindingSelector("")).toBe(false);
  });
});

describe("findingSelectorMatches", () => {
  it("exact selectors match only their own id", () => {
    expect(findingSelectorMatches("excl", "excl")).toBe(true);
    expect(findingSelectorMatches("excl", "excl-2")).toBe(false);
    expect(findingSelectorMatches("excl", "domain-age")).toBe(false);
  });

  it("prefix selectors match ids sharing the prefix", () => {
    expect(findingSelectorMatches("perf-*", "perf-c1")).toBe(true);
    expect(findingSelectorMatches("perf-*", "perf-")).toBe(true);
    expect(findingSelectorMatches("perf-*", "performance")).toBe(false);
    expect(findingSelectorMatches("perf-*", "excl")).toBe(false);
  });
});

describe("isKnownFindingId", () => {
  it("recognizes exact ids and prefixed ids, rejects strangers", () => {
    expect(isKnownFindingId("excl")).toBe(true);
    expect(isKnownFindingId("perf-anything")).toBe(true);
    expect(isKnownFindingId("mystery")).toBe(false);
  });
});
