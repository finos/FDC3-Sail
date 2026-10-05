import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { defineConfig, lazyPlugins } from "vite-plus"
import react from "@vitejs/plugin-react"

const require = createRequire(import.meta.url)

/** FDC3 conformance toolbox version served as Vite `publicDir` (same-origin with the harness). */
export function resolveConformanceFdc3Version(
  raw: string | undefined = process.env.CONFORMANCE_FDC3_VERSION ??
    process.env.VITE_CONFORMANCE_FDC3_VERSION,
): "2.2" | "3.0" {
  return raw === "3.0" ? "3.0" : "2.2"
}

const fdc3Version = resolveConformanceFdc3Version()
const conformancePackage =
  fdc3Version === "3.0" ? "@robmoffat/fdc3-conformance-3.0" : "@robmoffat/fdc3-conformance-2.2"
const conformanceDist = join(dirname(require.resolve(`${conformancePackage}/package.json`)), "dist")

export default defineConfig({
  plugins: lazyPlugins(() => [react()]),
  // Ensure the client bundle sees the same version the publicDir was chosen for.
  define: {
    "import.meta.env.VITE_CONFORMANCE_FDC3_VERSION": JSON.stringify(fdc3Version),
  },
  optimizeDeps: {
    exclude: ["@finos/sail-browser-agent"],
  },
  // Published toolbox (`@robmoffat/fdc3-conformance-{2.2|3.0}`), served at the harness
  // origin so `/apps/...`, `/lib/...` and `/directories/...` match the URLs in
  // `directories/localhost-conformance.json`. Same-origin is required for WCP
  // host-instance adoption (`window.name`).
  publicDir: conformanceDist,
  server: {
    port: 3001,
    // Fail instead of drifting to 3002+ — directory fixtures and Playwright assume 3001.
    strictPort: true,
    // Headless/CI runs have no browser to open.
    open: !process.env.CI && !process.env.HARNESS_NO_OPEN,
    // Reload when @finos/sail-browser-agent dist changes (package resolves to dist/, not src/)
    watch: {
      ignored: [
        "**/node_modules/**",
        "**/.git/**",
        "!**/node_modules/@finos/sail-browser-agent/**",
      ],
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
})
