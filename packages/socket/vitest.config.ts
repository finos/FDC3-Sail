import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Different timeouts for different test types
    testTimeout: 15000, // Default timeout increased for integration tests
    hookTimeout: 30000, // Longer timeout for setup/teardown hooks
    setupFiles: ["./src/__tests__/setup/setupTests.ts"],
    reporters: ["default", "html"],
    // Retry configuration for flaky tests
    retry: {
      // Retry integration tests that might have timing issues
      "**/*integration*": 2,
      // Retry socket tests once due to async nature
      "**/*socket*": 1,
    },
    // Test isolation improvements
    isolate: true,
    // Pool configuration for better test isolation
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true, // Use single fork for better isolation in socket tests
      },
    },
  },
})
