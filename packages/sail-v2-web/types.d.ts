declare module "*.css" {
  const styles: { [className: string]: string }
  export default styles
}

interface ImportMetaEnv {
  readonly VITE_FDC3_VERSION?: "2.2" | "3.0"
  readonly VITE_CONFORMANCE_DIRECTORY_URL?: string
  readonly VITE_CONFORMANCE_AUTO_RESOLVE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
