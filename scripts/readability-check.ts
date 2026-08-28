/*
  Readability + house-style gate for user-facing prose.

  Checks docs/*.md (excluding docs/research/) and fails on:
  - em dashes (house style: rewrite the sentence)
  - Flesch-Kincaid grade above 12 (target is 9; 9-12 warns)
  The research docs are internal working papers and are exempt.
*/
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

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

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/\|[^\n]*\|/g, " ") // tables
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_-]/g, " ")
    .replace(/https?:\/\/\S+/g, " ");
}

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  const m = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "")
    .match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
}

function fleschKincaid(text: string): number {
  const sentences = text.split(/[.!?]+\s/).filter((s) => s.trim().length > 8);
  const words = text.split(/\s+/).filter((w) => /[a-zA-Z]/.test(w));
  if (sentences.length === 0 || words.length === 0) return 0;
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  return (
    0.39 * (words.length / sentences.length) +
    11.8 * (syllables / words.length) -
    15.59
  );
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
