/// <reference types="vite-plus/client" />

interface ImportMetaEnv {
  /**
   * Override the FDC3 3.0 conformance App Directory URL.
   * Default: hosted toolbox `…/toolbox/3.0/fdc3-conformance/directories/website-conformance.json`
   * Local: `http://localhost:3001/directories/localhost-conformance.json`
   */
  readonly VITE_CONFORMANCE_DIRECTORY_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
