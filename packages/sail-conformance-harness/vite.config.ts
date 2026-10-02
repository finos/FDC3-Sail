import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { defineConfig, lazyPlugins } from "vite-plus"
import react from "@vitejs/plugin-react"

const require = createRequire(import.meta.url)
const conformanceDist = join(
  dirname(require.resolve("@robmoffat/fdc3-conformance/package.json")),
  "dist",
)

export default defineConfig({
  plugins: lazyPlugins(() => [react()]),
  optimizeDeps: {
    exclude: ["@finos/sail-desktop-agent"],
  },
  // Published FDC3 2.2 toolbox (`@robmoffat/fdc3-conformance`), served at the harness
  // origin so `/apps/...`, `/lib/...` and `/directories/...` match the URLs in
  // `directories/localhost-conformance.json`. Same-origin is required for WCP
  // host-instance adoption (`window.name`).
  publicDir: conformanceDist,
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
