import { join } from "node:path"
import { defineConfig } from "vite-plus"
import { resolveToolboxRoot } from "./e2e/toolbox"

export default defineConfig({
  resolve: {
    alias: { "@conformance-toolbox": join(resolveToolboxRoot("2.2"), "dist") },
  },
  test: {
    environment: "node",
    globals: true,
    // Playwright specs have their own runner (npm run test:browser:*); e2e/*.test.ts are unit tests.
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**/*.spec.ts"],
  },
})
