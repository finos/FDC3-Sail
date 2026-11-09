/// <reference types="@finos/sail-env/vite" />

declare module "*.css" {
  const styles: { [className: string]: string }
  export default styles
}

/** Raw `SAIL_EXTENSION_URLS` value injected by vite.config.ts `define` (empty when unset). */
declare const __SAIL_EXTENSION_URLS__: string

interface ImportMeta {
  readonly env: ImportMetaEnv
}
