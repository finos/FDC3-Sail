/**
 * Shared Vite `ImportMetaEnv` keys for Sail Desktop Agent hosts.
 * Host packages: `/// <reference types="@finos/sail-env/vite" />`
 */
interface ImportMetaEnv {
  /** Sole App Directory URL when set (CI / deep-link). */
  readonly VITE_FDC3_DIRECTORY_URL?: string
  /** `"1"` → programmatic intent resolution (no UI). */
  readonly VITE_AUTO_RESOLVE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
