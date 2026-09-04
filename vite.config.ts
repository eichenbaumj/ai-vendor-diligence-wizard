import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

/* The page title carries "(beta)" while the beta notice is on. The notice
   itself is BETA_NOTICE in src/lib/config.ts (VITE_BETA !== "0"); the same
   variable is read here because index.html is static, and the title is what
   tabs, bookmarks, and link previews show. Leaves with the notice at
   general release. (Kept as a plugin so this file still exports a plain
   object: vitest.config.ts merges it with mergeConfig, which refuses the
   callback form.) */
function betaTitle(): Plugin {
  let enabled = true;
  return {
    name: "beta-title",
    configResolved(config) {
      enabled = config.env.VITE_BETA !== "0";
    },
    transformIndexHtml(html) {
      return enabled
        ? html.replace(
            "<title>AI Vendor Diligence Wizard</title>",
            "<title>AI Vendor Diligence Wizard (beta)</title>",
          )
        : html;
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), betaTitle()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@shared": fileURLToPath(
        new URL("./supabase/functions/_shared", import.meta.url),
      ),
    },
  },
  build: {
    target: "esnext",
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
  },
  server: {
    port: Number(process.env.PORT) || 8080,
    watch: {
      /* Agent worktrees live under .claude/worktrees and the private QA
         and docs trees under private/; without this, edits there force
         full page reloads of the dev server. */
      ignored: ["**/.claude/**", "**/private/**"],
    },
  },
});
