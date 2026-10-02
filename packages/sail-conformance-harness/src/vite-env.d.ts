/// <reference types="vite-plus/client" />

interface ImportMetaEnv {
  readonly VITE_CONFORMANCE_TOOLBOX?: "hosted" | "local"
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module "@robmoffat/fdc3-conformance/dist/directories/localhost-conformance.json" {
  const value: {
    applications: unknown[]
    message?: string
  }
  export default value
}
