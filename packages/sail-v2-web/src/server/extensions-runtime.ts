import { pickSailExtension, type SailExtension } from "@finos/sail-extension"

import { SAIL_EXTENSION_URLS } from "../extensions"
import { createLogger } from "./logger"

const log = createLogger("Extensions")

const WORKSPACE_CORE: Record<string, string> = {
  "http://localhost:9100/src/index.ts": "@finos/sail-extension-demo",
  "http://localhost:9101/src/index.ts": "@finos/sail-extension-sail-governance",
}

async function waitForUrl(url: string): Promise<void> {
  for (let attempt = 0; attempt < 25; attempt++) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        return
      }
    } catch {
      // server not up yet
    }
    await new Promise(resolve => setTimeout(resolve, 200))
  }
}

async function importExtensionCore(url: string): Promise<unknown> {
  const workspace = WORKSPACE_CORE[url]
  if (workspace) {
    try {
      return await import(workspace)
    } catch {
      // Not a workspace package of this host.
    }
  }
  await waitForUrl(url)
  return import(url)
}

export async function loadExtensionCores(): Promise<SailExtension[]> {
  const extensions: SailExtension[] = []
  for (const url of SAIL_EXTENSION_URLS) {
    try {
      const mod = await importExtensionCore(url)
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
