/*
  Readability + house-style gate for user-facing prose.

  Checks docs/*.md (excluding docs/research/) and fails on:
  - em dashes (house style: rewrite the sentence)
  - Flesch-Kincaid grade above 12 (target is 9; 9-12 warns)
  The research docs are internal working papers and are exempt.
*/
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fleschKincaid, stripMarkdown } from "./lib/readability.ts";

const ROOTS = ["docs"];
const EXCLUDE = new Set(["research"]);

function collect(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (!EXCLUDE.has(name)) out.push(...collect(p));
    } else if (name.endsWith(".md")) {
      out.push(p);
    }
  }
  return out;
}

let failed = false;
for (const root of ROOTS) {
  for (const file of collect(root)) {
    const raw = readFileSync(file, "utf8");
    const emDashes = (raw.match(/—/g) ?? []).length;
    if (emDashes > 0) {
      console.error(`FAIL ${file}: ${emDashes} em dash(es)`);
      failed = true;
    }
    const grade = fleschKincaid(stripMarkdown(raw));
    if (grade > 12) {
      console.error(`FAIL ${file}: Flesch-Kincaid grade ${grade.toFixed(1)} (max 12)`);
      failed = true;
    } else if (grade > 9.5) {
      console.warn(`warn ${file}: grade ${grade.toFixed(1)} (target 9)`);
    } else {
      console.log(`ok   ${file}: grade ${grade.toFixed(1)}`);
    }
  }
}
process.exit(failed ? 1 : 0);
