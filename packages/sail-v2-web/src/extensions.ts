/**
 * Extensions loaded when `SAIL_EXTENSION_URLS` is unset. Shared by every user session.
 * Browser UI and the Node factory both read `SAIL_EXTENSION_URLS` over these defaults and
 * load each URL with the same `import(url)` call (Node uses `http-esm-extension-loader.mjs`).
 */
export const DEFAULT_SAIL_EXTENSION_URLS: string[] = [
  "http://localhost:9100/src/index.ts",
  "http://localhost:9101/src/index.ts",
]
