import { join } from "node:path"
import { defineConfig, lazyPlugins } from "vite-plus"
import react from "@vitejs/plugin-react"
import { resolveConformanceFdc3Version, resolveToolboxRoot, TOOLBOX_PORT } from "./e2e/toolbox"

// The chosen toolbox site (CONFORMANCE_FDC3_VERSION, CONFORMANCE_TOOLBOX — see e2e/toolbox.ts),
// served at the harness origin so `/apps/...`, `/lib/...` and `/directories/...` match the
// localhost:3001 URLs baked into its App Directory. Same-origin also lets WCP read the app
// frames' `window.name` for host-instance adoption.
const fdc3Version = resolveConformanceFdc3Version()
const toolboxSite = join(resolveToolboxRoot(fdc3Version), "dist")

export default defineConfig({
  plugins: lazyPlugins(() => [react()]),
  define: {
    "import.meta.env.VITE_CONFORMANCE_FDC3_VERSION": JSON.stringify(fdc3Version),
  },
  resolve: {
    alias: { "@conformance-toolbox": toolboxSite },
  },
  optimizeDeps: {
    exclude: ["@finos/sail-desktop-agent"],
  },
  publicDir: toolboxSite,
  server: {
    port: TOOLBOX_PORT,
    // Fail instead of drifting to 3002+: the App Directory URLs assume 3001.
    strictPort: true,
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
