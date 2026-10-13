/// <reference types="vite-plus/client" />

interface ImportMetaEnv {
  /** Load only this App Directory (conformance runs). See `readSailHostParams`. */
  readonly VITE_FDC3_DIRECTORY_URL?: string
  /** `"1"`: resolve intents with no UI. */
  readonly VITE_AUTO_RESOLVE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
