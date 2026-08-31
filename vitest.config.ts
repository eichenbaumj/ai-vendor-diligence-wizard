import { defineConfig, mergeConfig, configDefaults } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      /* Agent worktrees live under .claude/worktrees (without this, the
         suite runs every test file twice) and the private QA/docs trees
         under private/ (no tests there, but never glob into them). */
      exclude: [...configDefaults.exclude, "**/.claude/**", "**/private/**"],
    },
  }),
);
