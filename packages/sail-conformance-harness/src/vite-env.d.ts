/// <reference types="vite-plus/client" />

interface ImportMetaEnv {
  readonly VITE_CONFORMANCE_TOOLBOX?: "hosted" | "local"
  /** Injected by vite.config.ts from `CONFORMANCE_FDC3_VERSION`; unset under vitest. */
  readonly VITE_CONFORMANCE_FDC3_VERSION?: "2.2" | "3.0"
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** The chosen toolbox's App Directory (vite alias, see vite.config.ts). */
declare module "@conformance-toolbox/directories/localhost-conformance.json" {
  const value: { applications: import("@finos/sail-desktop-agent").DirectoryApp[] }
  export default value
}
