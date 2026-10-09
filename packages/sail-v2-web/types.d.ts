/// <reference types="@finos/sail-env/vite" />

declare module "*.css" {
  const styles: { [className: string]: string }
  export default styles
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
