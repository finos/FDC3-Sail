/// <reference types="vite-plus/client" />

interface ImportMetaEnv {
  /** Max FDC3 wire version for sail-one Desktop Agent (default 3.0). */
  readonly VITE_FDC3_VERSION?: "2.2" | "3.0"
  /**
   * Override `hostManifests.sail.forceNewWindow`:
   * `"false"` → Frame only; `"true"` → always Tab; unset → honor catalog.
   */
  readonly VITE_FORCE_NEW_WINDOW?: "true" | "false"
  /**
   * Conformance App Directory URL. Default depends on {@link VITE_FDC3_VERSION}:
   * - 3.0 → hosted fdc3.finos.org
   * - 2.2 → local `:3001` toolbox
   */
  readonly VITE_CONFORMANCE_DIRECTORY_URL?: string
  /** When `1`, resolve intents programmatically (no modal) for CI. */
  readonly VITE_CONFORMANCE_AUTO_RESOLVE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
