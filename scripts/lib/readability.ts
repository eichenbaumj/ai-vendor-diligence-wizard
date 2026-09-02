/*
  Readability helpers shared by the docs gate (scripts/readability-check.ts)
  and the How it works copy test (tests/unit/how-it-works-model.test.ts):
  one Flesch-Kincaid implementation, so a page and the docs are held to the
  same measure.
*/

export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/\|[^\n]*\|/g, " ") // tables
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_-]/g, " ")
    .replace(/https?:\/\/\S+/g, " ");
}

export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  const m = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "")
    .match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
}

export function fleschKincaid(text: string): number {
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
