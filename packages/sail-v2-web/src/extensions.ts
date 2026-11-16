/**
 * Shared by every user session. Browser UI and the Node factory both import this
 * list with the same `import(url)` call (Node uses `http-esm-extension-loader.mjs`).
 */
export const SAIL_EXTENSION_URLS: string[] = [
  "http://localhost:9100/src/index.ts",
  "http://localhost:9101/src/index.ts",
]
