import {
  loadExtensionCoreUrls,
  pickSailExtension,
  pickSailExtensionUIs,
} from "@finos/sail-extension"
import type { SailExtensionUI } from "@finos/sail-extension/ui"

import { SAIL_EXTENSION_URLS } from "../extensions"

let loaded: SailExtensionUI[] | null = null
const listeners = new Set<() => void>()

function notify(): void {
  listeners.forEach(listener => {
    listener()
  })
}

export function subscribeExtensionUIs(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export async function loadExtensionUIs(): Promise<SailExtensionUI[]> {
  if (loaded) {
    return loaded
  }

  const { urls } = await loadExtensionCoreUrls(SAIL_EXTENSION_URLS)
  const uis: SailExtensionUI[] = []
  for (const url of urls) {
    try {
      const coreMod: unknown = await import(/* @vite-ignore */ url)
      const core = pickSailExtension(coreMod)
      if (!core) {
        console.warn(`[Sail] Extension at ${url} did not export a SailExtension`)
        continue
      }
      const seen = new Set<string>()
      for (const { url: uiUrl } of core.getUIExtensions()) {
        if (seen.has(uiUrl)) {
          continue
        }
        seen.add(uiUrl)
        const uiMod: unknown = await import(/* @vite-ignore */ uiUrl)
        const found = pickSailExtensionUIs(uiMod)
        if (found.length === 0) {
          console.warn(`[Sail] Extension UI at ${uiUrl} did not export a SailExtensionUI`)
        }
        uis.push(...found)
      }
    } catch (error) {
      console.warn(`[Sail] Failed to load extension UI from ${url}`, error)
    }
  }
  loaded = uis
  notify()
  return uis
}

export function getLoadedExtensionUIs(type?: string): SailExtensionUI[] {
  const all = loaded ?? []
  return type ? all.filter(ui => ui.type === type) : all
}
