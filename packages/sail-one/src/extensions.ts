import { readExtensionUrls } from "@finos/sail-extension"

/** Extensions loaded when `SAIL_EXTENSION_URLS` is unset. */
export const DEFAULT_EXTENSION_URLS: string[] = ["http://localhost:9100/src/index.ts"]

/** Extensions to load: `SAIL_EXTENSION_URLS` as set at build time by vite.config.ts, else the defaults. */
export const EXTENSION_URLS: string[] = readExtensionUrls(
  __SAIL_EXTENSION_URLS__,
  DEFAULT_EXTENSION_URLS,
)
