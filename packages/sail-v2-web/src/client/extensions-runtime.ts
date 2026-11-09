import { pickSailExtension, pickSailExtensionUIs, readExtensionUrls } from "@finos/sail-extension"
import type { SailExtensionUI } from "@finos/sail-extension/ui"

import { DEFAULT_SAIL_EXTENSION_URLS } from "../extensions"

// Set at build time by vite.config.ts from the same SAIL_EXTENSION_URLS the server reads.
const SAIL_EXTENSION_URLS = readExtensionUrls(__SAIL_EXTENSION_URLS__, DEFAULT_SAIL_EXTENSION_URLS)

export type LoadedSailExtensionUI = SailExtensionUI & { coreId: string }

let loaded: LoadedSailExtensionUI[] | null = null
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

export async function loadExtensionUIs(): Promise<LoadedSailExtensionUI[]> {
  if (loaded) {
    return loaded
  }

  const uis: LoadedSailExtensionUI[] = []
  for (const url of SAIL_EXTENSION_URLS) {
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
        uis.push(...found.map(ui => ({ ...ui, coreId: core.id })))
      }
    } catch (error) {
      console.warn(`[Sail] Failed to load extension UI from ${url}`, error)
    }
  }
  loaded = uis
  notify()
  return uis
}

export function getLoadedExtensionUIs(type?: string): LoadedSailExtensionUI[] {
  const all = loaded ?? []
  return type ? all.filter(ui => ui.type === type) : all
}
