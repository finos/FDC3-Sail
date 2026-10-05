import { defineConfig } from "vite-plus"

export default defineConfig({
  test: {
    exclude: ["**/tests/**", "**/tests/e2e/**", "**/node_modules/**", "**/dist/**"],
    projects: [
      "packages/sail-browser-agent/vitest.config.ts",
      "packages/sail-platform/vitest.config.ts",
      "packages/sail-finance/vitest.config.ts",
      "packages/sail-one/vitest.config.ts",
    ],
  },
})
