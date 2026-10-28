import { pickSailExtension, type SailExtension } from "@finos/sail-extension"

import { SAIL_EXTENSION_URLS } from "../extensions"
import { createLogger } from "./logger"

const log = createLogger("Extensions")

export async function loadExtensionCores(): Promise<SailExtension[]> {
  const extensions: SailExtension[] = []
  for (const url of SAIL_EXTENSION_URLS) {
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
