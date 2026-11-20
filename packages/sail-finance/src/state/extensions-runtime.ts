import {
  SailExtensionRegistry,
  loadActiveExtensionManifestUrls,
  pickSailExtensionUIs,
  resolveExtensionModuleUrl,
  type SailExtensionManifest,
} from "@finos/sail-extension"
import type { SailExtensionUI } from "@finos/sail-extension/ui"
import {
  SAIL_PLATFORM_BUS,
  SAIL_PLATFORM_CATALOG,
  SAIL_PLATFORM_SESSION,
  SAIL_PLATFORM_STORAGE,
  SAIL_UI_APP_BAR,
  SAIL_UI_CONFIG,
  SAIL_UI_HIDDEN,
  createLocalUserStorage,
  createSailPlatformBus,
  createSailPlatformCatalog,
  createSessionService,
  type SailUserStorage,
} from "@finos/sail-platform"

import { createSailFinanceExtensionStorage } from "./extension-storage"

const UI_CONTRIBUTION_POINTS = [SAIL_UI_CONFIG, SAIL_UI_HIDDEN, SAIL_UI_APP_BAR] as const

type PlatformCaps = {
  sessions: ReturnType<typeof createSessionService>
  bus: ReturnType<typeof createSailPlatformBus>
  catalog: ReturnType<typeof createSailPlatformCatalog>
  storage: SailUserStorage
}

let uis: SailExtensionUI[] | null = null
let registry: SailExtensionRegistry | null = null
let platformCaps: PlatformCaps | null = null

function ensurePlatformCaps(): PlatformCaps {
  if (platformCaps) {
    return platformCaps
  }
  const sessions = createSessionService()
  const bus = createSailPlatformBus()
  const catalog = createSailPlatformCatalog()
  const storage = createLocalUserStorage({ keyPrefix: "sail_finance_" })
  platformCaps = { sessions, bus, catalog, storage }
  return platformCaps
}

export function getPlatformCaps() {
  return ensurePlatformCaps()
}

export async function loadExtensionUIs(): Promise<SailExtensionUI[]> {
  if (uis) {
    return uis
  }
  const loaded: SailExtensionUI[] = []
  const manifestUrls = await loadActiveExtensionManifestUrls()
  for (const manifestUrl of manifestUrls) {
    try {
      const manifest = (await fetch(manifestUrl).then(r => r.json())) as SailExtensionManifest
      for (const point of UI_CONTRIBUTION_POINTS) {
        for (const c of manifest.contributes?.[point] ?? []) {
          const uiUrl = resolveExtensionModuleUrl(manifestUrl, c.module)
          const uiMod: unknown = await import(/* @vite-ignore */ uiUrl)
          loaded.push(...pickSailExtensionUIs(uiMod))
        }
      }
    } catch (error) {
      console.warn(`[Sail Finance] Failed to load extension UI from ${manifestUrl}`, error)
    }
  }
  uis = loaded
  return loaded
}

export function getLoadedExtensionUIs(type?: string): SailExtensionUI[] {
  const all = uis ?? []
  return type ? all.filter(ui => ui.type === type) : all
}

export async function loadRegistry(): Promise<SailExtensionRegistry> {
  if (registry) {
    return registry
  }
  const caps = ensurePlatformCaps()
  registry = new SailExtensionRegistry({
    platformExports: {
      [SAIL_PLATFORM_SESSION]: caps.sessions,
      [SAIL_PLATFORM_BUS]: caps.bus,
      [SAIL_PLATFORM_CATALOG]: caps.catalog,
      [SAIL_PLATFORM_STORAGE]: caps.storage,
    },
    createStorage: createSailFinanceExtensionStorage,
  })
  try {
    await registry.load(await loadActiveExtensionManifestUrls())
  } catch (error) {
    console.warn("[Sail Finance] Extension load failed", error)
  }
  return registry
}

export function getExtensionExport<T = unknown>(capabilityId: string): T | undefined {
  return registry?.getExport<T>(capabilityId)
}
