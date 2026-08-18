/**
 * Test Setup Configuration
 *
 * Global test setup for the sail-desktop-agent package tests.
 * Configures testing environment and shared utilities.
 */

// Global test configuration
globalThis.console.log = (...args: unknown[]) => {
  // Suppress console.log during tests unless VERBOSE_TESTS is set
  if (process.env.VERBOSE_TESTS) {
    console.info(...args)
  }
}

// Setup complete
console.info("Desktop Agent test setup complete")
