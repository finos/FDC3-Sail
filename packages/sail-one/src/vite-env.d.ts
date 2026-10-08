/// <reference types="vite-plus/client" />

interface ImportMetaEnv {
  /** Max FDC3 wire version for sail-one Desktop Agent (default 3.0). */
  readonly VITE_FDC3_VERSION?: "2.2" | "3.0"
  /**
   * Override `hostManifests.sail.forceNewWindow`:
   * `"false"` → Frame only; `"true"` → always Tab; unset → honor catalog.
   */
  readonly VITE_FORCE_NEW_WINDOW?: "true" | "false"
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
