/// <reference types="vite-plus/client" />
/// <reference types="@finos/sail-env/vite" />

interface ImportMetaEnv {
  /**
   * Override `hostManifests.sail.forceNewWindow`:
   * `"false"` → Frame only; `"true"` → always Tab; unset → honor catalog.
   */
  readonly VITE_FORCE_NEW_WINDOW?: "true" | "false"
}

/** Raw `SAIL_EXTENSION_URLS` value injected by vite.config.ts `define` (empty when unset). */
declare const __SAIL_EXTENSION_URLS__: string

interface ImportMeta {
  readonly env: ImportMetaEnv
}
