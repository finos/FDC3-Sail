import { defineConfig } from "vite-plus"

export default defineConfig({
  test: {
    exclude: ["**/tests/**", "**/tests/e2e/**", "**/node_modules/**", "**/dist/**"],
    projects: [
      "packages/sail-desktop-agent/vitest.config.ts",
      "packages/sail-platform/vitest.config.ts",
      "packages/sail-finance/vitest.config.ts",
      "packages/sail-conformance-harness/vitest.config.ts",
      "packages/sail-one/vitest.config.ts",
    ],
  },
})
