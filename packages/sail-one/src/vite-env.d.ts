/// <reference types="vite-plus/client" />
/// <reference types="@finos/sail-env/vite" />

interface ImportMetaEnv {
  /**
   * Override `hostManifests.sail.forceNewWindow`:
   * `"false"` → Frame only; `"true"` → always Tab; unset → honor catalog.
   */
  readonly VITE_FORCE_NEW_WINDOW?: "true" | "false"
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
