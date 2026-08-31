import { defineConfig, mergeConfig, configDefaults } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      /* Agent worktrees live under .claude/worktrees; without this, the
         suite runs every test file twice (once per tree). */
      exclude: [...configDefaults.exclude, "**/.claude/**"],
    },
  }),
);
