import {
  pickSailExtension,
  pickSailExtensionUIs,
  type SailExtension,
  type SailRequestReview,
} from "@finos/sail-extension"
import type { SailExtensionUI } from "@finos/sail-extension/ui"
import type { SailDesktopAgent } from "@finos/sail-browser-agent"

import { EXTENSION_URLS } from "../extensions"
import { createSailOneExtensionStorage } from "./extension-storage"

let cores: SailExtension[] | null = null
let uis: SailExtensionUI[] | null = null
const uiListeners = new Set<() => void>()

function notifyUIs(): void {
  uiListeners.forEach(listener => {
    listener()
  })
}

export function subscribeExtensionUIs(listener: () => void): () => void {
  uiListeners.add(listener)
  return () => {
    uiListeners.delete(listener)
  }
}

export async function loadExtensionCores(): Promise<SailExtension[]> {
  if (cores) {
    return cores
  }

  const loaded: SailExtension[] = []
  for (const url of EXTENSION_URLS) {
    try {
      const mod: unknown = await import(/* @vite-ignore */ url)
      const extension = pickSailExtension(mod)
      if (extension) {
        loaded.push(extension)
      } else {
        console.warn(`[Sail] Extension at ${url} did not export a SailExtension`)
      }
    } catch (error) {
      console.warn(`[Sail] Failed to load extension from ${url}`, error)
    }
  }
  cores = loaded
  return loaded
}

export async function loadExtensionUIs(): Promise<SailExtensionUI[]> {
  if (uis) {
    return uis
  }

  const loaded: SailExtensionUI[] = []
  for (const url of EXTENSION_URLS) {
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
        loaded.push(...found)
      }
    } catch (error) {
      console.warn(`[Sail] Failed to load extension UI from ${url}`, error)
    }
  }
  uis = loaded
  notifyUIs()
  return loaded
}

export function getLoadedExtensionUIs(type?: string): SailExtensionUI[] {
  const all = uis ?? []
  return type ? all.filter(ui => ui.type === type) : all
}

export function wrapWithExtensions(
  instance: SailDesktopAgent,
  requestReview: SailRequestReview,
): SailDesktopAgent {
  return (cores ?? []).reduce((inst, ext) => {
    const storage = createSailOneExtensionStorage(ext.id)
    return (ext.wrapServer?.(inst, { storage, requestReview }) ?? inst) as SailDesktopAgent
  }, instance)
}
