/// <reference types="vite-plus/client" />

interface ImportMetaEnv {
  readonly VITE_CONFORMANCE_TOOLBOX?: "hosted" | "local"
  readonly VITE_CONFORMANCE_FDC3_VERSION?: "2.2" | "3.0"
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module "@robmoffat/fdc3-conformance-2.2/dist/directories/localhost-conformance.json" {
  const value: {
    applications: unknown[]
    message?: string
  }
  export default value
}

declare module "@robmoffat/fdc3-conformance-3.0/dist/directories/localhost-conformance.json" {
  const value: {
    applications: unknown[]
    message?: string
  }
  export default value
}
