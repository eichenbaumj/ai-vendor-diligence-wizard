/*
  The private/ directory holds real-vendor QA expectations and operational
  session docs. docs/testing.md promises those files never enter the
  public repository; this test makes the promise structural. It fails the
  suite if the gitignore rule disappears or if any file under private/
  ever becomes tracked (someone force-added one).

  On CI checkouts private/ simply does not exist, and both checks pass.
*/
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("private/ never enters the public repository", () => {
  it(".gitignore carries the private/ rule", () => {
    const gitignore = readFileSync(join(ROOT, ".gitignore"), "utf-8");
    expect(gitignore.split("\n")).toContain("private/");
  });

  it("no file under private/ is tracked by git", () => {
    const tracked = execSync("git ls-files private", {
      cwd: ROOT,
      encoding: "utf-8",
    }).trim();
    expect(tracked).toBe("");
  });
});
