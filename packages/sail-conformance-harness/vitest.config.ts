import { defineConfig } from "vite-plus"

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // e2e/ holds Playwright specs, which have their own runner (npm run test:conformance).
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
  },
})
