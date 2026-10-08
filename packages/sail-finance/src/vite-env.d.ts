/// <reference types="vite-plus/client" />

interface ImportMetaEnv {
  /** Desktop Agent FDC3 wire target. Default `3.0`. */
  readonly VITE_FDC3_VERSION?: "2.2" | "3.0"
  /**
   * Override the conformance App Directory URL.
   * Default depends on {@link VITE_FDC3_VERSION}:
   * - 3.0 → hosted fdc3.finos.org toolbox directory
   * - 2.2 → `http://localhost:3001/directories/localhost-conformance.json`
   */
  readonly VITE_CONFORMANCE_DIRECTORY_URL?: string
  /** When `1`, resolve intents programmatically (no modal) for CI. */
  readonly VITE_CONFORMANCE_AUTO_RESOLVE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
