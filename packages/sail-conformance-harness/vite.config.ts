import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { defineConfig, lazyPlugins, loadEnv } from "vite-plus"
import react from "@vitejs/plugin-react"

const require = createRequire(import.meta.url)

// Vite opens $BROWSER (else the OS default). On macOS that is often Safari; prefer Chrome for WCP/devtools.
if (!process.env.BROWSER && process.platform === "darwin") {
  process.env.BROWSER = "Google Chrome"
}

/** FDC3 conformance toolbox version served as Vite `publicDir` (same-origin with the harness). */
export function resolveConformanceFdc3Version(raw?: string): "2.2" | "3.0" {
  return raw === "3.0" ? "3.0" : "2.2"
}

export function resolveConformanceToolbox(
  raw?: string,
): "hosted" | "local" {
  return raw === "local" ? "local" : "hosted"
}

export default defineConfig(({ mode }) => {
  // Prefer shell/CI env; fall back to mode `.env` (e.g. `.env.toolbox-local`).
  const env = loadEnv(mode, process.cwd(), "")
  const toolbox = resolveConformanceToolbox(
    process.env.CONFORMANCE_TOOLBOX ?? env.CONFORMANCE_TOOLBOX ?? env.VITE_CONFORMANCE_TOOLBOX,
  )
  const fdc3Version = resolveConformanceFdc3Version(
    process.env.CONFORMANCE_FDC3_VERSION ??
      env.CONFORMANCE_FDC3_VERSION ??
      (toolbox === "hosted" ? "3.0" : undefined),
  )
  const conformancePackage =
    fdc3Version === "3.0" ? "@robmoffat/fdc3-conformance-3.0" : "@robmoffat/fdc3-conformance-2.2"
  const conformanceDist = join(dirname(require.resolve(`${conformancePackage}/package.json`)), "dist")

  return {
    plugins: lazyPlugins(() => [react()]),
    // Single source of truth for version/toolbox; bridge into the client bundle.
    define: {
      "import.meta.env.CONFORMANCE_FDC3_VERSION": JSON.stringify(fdc3Version),
      "import.meta.env.CONFORMANCE_TOOLBOX": JSON.stringify(toolbox),
    },
    optimizeDeps: {
      exclude: ["@finos/sail-browser-agent"],
    },
    // Published toolbox (`@robmoffat/fdc3-conformance-{2.2|3.0}`), served at the harness
    // origin so `/apps/...`, `/lib/...` and `/directories/...` match the URLs in
    // `directories/localhost-conformance.json`. Same-origin is required for WCP
    // host-instance adoption (`window.name`). Hosted profile still sets publicDir
    // (unused for app URLs — those point at fdc3.finos.org).
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
  }
})
