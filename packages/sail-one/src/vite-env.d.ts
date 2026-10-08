/// <reference types="vite-plus/client" />

interface ImportMetaEnv {
  /** Max FDC3 wire version for sail-one Desktop Agent (default 3.0). */
  readonly VITE_FDC3_VERSION?: "2.2" | "3.0"
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
