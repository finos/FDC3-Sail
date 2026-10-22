import { pathToFileURL } from "node:url"

import {
  fetchExtensionCatalog,
  mergeExtensionCoreUrls,
  pickSailExtension,
  type SailExtension,
  type SailExtensionCatalogEntry,
} from "@finos/sail-extension"

import { SAIL_EXTENSION_URLS } from "../extensions"
import { createLogger } from "./logger"

const log = createLogger("Extensions")

function localPackageName(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== "localhost" || parsed.port !== "9100") {
      return null
    }
    const id = parsed.pathname.split("/").filter(Boolean)[0]
    return id ? `@finos/sail-extension-${id}` : null
  } catch {
    return null
  }
}

async function importFromUrl(url: string): Promise<unknown> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.status}`)
  }
  const code = await response.text()
  const dataUrl = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
  return import(dataUrl)
}

async function importExtensionCore(url: string, file?: string): Promise<unknown> {
  const local = localPackageName(url)
  if (local) {
    try {
      return await import(local)
    } catch {
      // Not a workspace package — try the scanned file next.
    }
  }
  if (file) {
    return import(pathToFileURL(file).href)
  }
  return importFromUrl(url)
}

async function loadCatalog(): Promise<SailExtensionCatalogEntry[]> {
  for (let attempt = 0; attempt < 25; attempt++) {
    try {
      return await fetchExtensionCatalog()
    } catch {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }
  return []
}

export async function loadExtensionCores(): Promise<SailExtension[]> {
  const catalog = await loadCatalog()
  const files = new Map(catalog.map(entry => [entry.core, entry.file]))
  const extensions: SailExtension[] = []
  for (const url of mergeExtensionCoreUrls(SAIL_EXTENSION_URLS, catalog)) {
    try {
      const mod = await importExtensionCore(url, files.get(url))
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
