/// <reference types="vite-plus/client" />

interface ImportMetaEnv {
  readonly VITE_CONFORMANCE_TOOLBOX?: "hosted" | "local"
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
