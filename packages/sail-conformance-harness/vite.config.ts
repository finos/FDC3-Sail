import { defineConfig, lazyPlugins } from "vite-plus"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: lazyPlugins(() => [react()]),
  optimizeDeps: {
    exclude: ["@finos/sail-desktop-agent"],
  },
  // Vendored FDC3 2.2 toolbox build, served at the harness origin so `/apps/...`,
  // `/lib/...` and `/directories/...` match the URLs baked into
  // 2.2-conformance-tests/directories/local-conformance.json.
  //
  // This build (unlike the hosted FINOS toolbox) carries the headless patch that
  // makes `?suite=` run unattended — see HEADLESS.md. Serving it here also puts the
  // toolbox same-origin with the harness, which WCP host-instance adoption needs.
  publicDir: "2.2-conformance-tests",
  server: {
    port: 3001,
    // Headless/CI runs have no browser to open.
    open: !process.env.CI && !process.env.HARNESS_NO_OPEN,
    // Reload when @finos/sail-desktop-agent dist changes (package resolves to dist/, not src/)
    watch: {
      ignored: [
        "**/node_modules/**",
        "**/.git/**",
        "!**/node_modules/@finos/sail-desktop-agent/**",
      ],
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
})
