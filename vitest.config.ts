import { defineConfig } from "vite-plus"

export default defineConfig({
  test: {
    exclude: ["**/tests/**", "**/tests/e2e/**", "**/node_modules/**", "**/dist/**"],
    // Off by default to keep local runs fast; CI runs `npm test -- --run --coverage`.
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/__tests__/**",
        "**/*.d.ts",
        // Tested by Cucumber, which this Vitest report can't see.
        "packages/sail-headless-agent/**",
        // A test suite itself, not product code.
        "packages/sail-conformance-harness/**",
      ],
      reporter: ["text-summary", "lcov"],
      // Floor at today's overall coverage so it can't drop. Raise it as coverage grows.
      // New code is held to 80% separately by the Codecov patch check (codecov.yml).
      thresholds: { statements: 15, branches: 12, functions: 13, lines: 14 },
    },
    projects: [
      "packages/sail-env/vitest.config.ts",
      "packages/sail-browser-agent/vitest.config.ts",
      "packages/sail-platform/vitest.config.ts",
      "packages/sail-finance/vitest.config.ts",
      "packages/sail-one/vitest.config.ts",
    ],
  },
})
