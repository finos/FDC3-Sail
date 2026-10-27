import { fileURLToPath } from "node:url"
import { pickSailExtension, readExtensionUrls, type SailExtension } from "@finos/sail-extension"
// Vite is already loaded at runtime in production too: vite-express (main.ts) imports it to resolve vite.config.ts.
import { loadEnv } from "vite"

import { DEFAULT_SAIL_EXTENSION_URLS } from "../extensions"
import { createLogger } from "./logger"

const log = createLogger("Extensions")

const packageRoot = fileURLToPath(new URL("../..", import.meta.url))

/** Extension URLs from `SAIL_EXTENSION_URLS` (shell, then the package `.env`), else the defaults. */
function serverExtensionUrls(): string[] {
  // Same loader and folder as vite.config.ts, so the server and browser get the same list.
  const env = loadEnv(process.env.NODE_ENV ?? "development", packageRoot, "")
  return readExtensionUrls(env.SAIL_EXTENSION_URLS, DEFAULT_SAIL_EXTENSION_URLS)
}

export async function loadExtensionCores(): Promise<SailExtension[]> {
  const extensions: SailExtension[] = []
  for (const url of serverExtensionUrls()) {
    try {
      const mod: unknown = await import(/* webpackIgnore: true */ url)
      const extension = pickSailExtension(mod)
      if (extension) {
        extensions.push(extension)
        log.info({ url, id: extension.id, title: extension.title }, "Loaded extension core")
      } else {
        log.warn({ url }, "Module did not export a SailExtension")
      }
    } catch (error) {
      log.warn({ url, error }, "Failed to load extension core")
    }
  }
  return extensions
}
