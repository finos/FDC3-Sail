import { defineConfig } from "vite-plus"

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Different timeouts for different test types
    testTimeout: 15000, // Default timeout increased for integration tests
    hookTimeout: 30000, // Longer timeout for setup/teardown hooks
    setupFiles: ["./src/__tests__/setup/setup-tests.ts"],
    reporters: ["default"],
    // Retry configuration for flaky tests
    retry: 0,
    // Test isolation improvements
    isolate: true,
    // Pool configuration for better test isolation
    pool: "forks",
  },
})
