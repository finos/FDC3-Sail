import {
  SailExtensionRegistry,
  loadActiveExtensionManifestUrls,
  pickSailExtensionUIs,
  resolveExtensionModuleUrl,
  type SailExtensionManifest,
} from "@finos/sail-extension"
import type { SailExtensionUI } from "@finos/sail-extension/ui"
import {
  SAIL_FDC3_APP_CONTRIBUTION,
  SAIL_FDC3_SERVER_FACTORY,
  SailFDC3ServerFactory,
  type CreateInstanceOptions,
  type SailFdc3AppContribution,
  type SailFdc3SessionHandle,
} from "@finos/sail-extension-fdc3"
import {
  SAIL_PLATFORM_BUS,
  SAIL_PLATFORM_CATALOG,
  SAIL_PLATFORM_SESSION,
  SAIL_PLATFORM_STORAGE,
  SAIL_UI_CONFIG,
  SAIL_UI_HIDDEN,
  createLocalUserStorage,
  createSailPlatformBus,
  createSailPlatformCatalog,
  createSailStorage,
  createSessionService,
  type SailUserSession,
} from "@finos/sail-platform"

import { createSailOneExtensionStorage } from "./extension-storage"

export type LoadedSailExtensionUI = SailExtensionUI & { coreId: string }

const UI_CONTRIBUTION_POINTS = [SAIL_UI_CONFIG, SAIL_UI_HIDDEN] as const

let platformCaps: ReturnType<typeof ensurePlatformCaps> | null = null
let platformRegistry: SailExtensionRegistry | null = null
let uis: LoadedSailExtensionUI[] | null = null
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

function ensurePlatformCaps(): {
  sessions: ReturnType<typeof createSessionService>
  bus: ReturnType<typeof createSailPlatformBus>
  catalog: ReturnType<typeof createSailPlatformCatalog>
  storage: ReturnType<typeof createSailStorage>
} {
  if (platformCaps) {
    return platformCaps
  }
  const sessions = createSessionService()
  const bus = createSailPlatformBus()
  const catalog = createSailPlatformCatalog()
  const storage = createSailStorage({
    createUserStorage: sessionId =>
      createLocalUserStorage({ keyPrefix: `sail_one_${sessionId}_` }),
  })
  platformCaps = { sessions, bus, catalog, storage }
  return platformCaps
}

export function getPlatformCaps(): ReturnType<typeof ensurePlatformCaps> {
  return ensurePlatformCaps()
}

function platformExportsFromCaps(caps: ReturnType<typeof ensurePlatformCaps>) {
  return {
    [SAIL_PLATFORM_SESSION]: caps.sessions,
    [SAIL_PLATFORM_BUS]: caps.bus,
    [SAIL_PLATFORM_CATALOG]: caps.catalog,
    [SAIL_PLATFORM_STORAGE]: caps.storage,
  }
}

/** Warm platform capability objects and load active extensions (including sail.fdc3). */
export async function loadExtensionCores(): Promise<SailExtensionRegistry> {
  const caps = ensurePlatformCaps()
  if (!platformRegistry) {
    platformRegistry = new SailExtensionRegistry({
      platformExports: platformExportsFromCaps(caps),
      createStorage: createSailOneExtensionStorage,
    })
    await platformRegistry.load(await loadActiveExtensionManifestUrls())
  }
  return platformRegistry
}

export function getExtensionRegistry(): SailExtensionRegistry | null {
  return platformRegistry
}

/** Capability resolver for UI mounts — same map `activate` sees. */
export function getExtensionExport<T = unknown>(capabilityId: string): T | undefined {
  return platformRegistry?.getExport<T>(capabilityId)
}

export function getSailFdc3Factory(): SailFDC3ServerFactory | undefined {
  return platformRegistry?.getExport<SailFDC3ServerFactory>(SAIL_FDC3_SERVER_FACTORY)
}

export function getSailFdc3AppContribution(): SailFdc3AppContribution | undefined {
  return platformRegistry?.getExport<SailFdc3AppContribution>(SAIL_FDC3_APP_CONTRIBUTION)
}

export async function loadExtensionUIs(): Promise<LoadedSailExtensionUI[]> {
  if (uis) {
    return uis
  }

  const manifestUrls = await loadActiveExtensionManifestUrls()
  const loaded: LoadedSailExtensionUI[] = []
  for (const manifestUrl of manifestUrls) {
    try {
      const manifest = (await fetch(manifestUrl).then(r => r.json())) as SailExtensionManifest
      for (const point of UI_CONTRIBUTION_POINTS) {
        for (const c of manifest.contributes?.[point] ?? []) {
          const uiUrl = resolveExtensionModuleUrl(manifestUrl, c.module)
          const uiMod: unknown = await import(/* @vite-ignore */ uiUrl)
          for (const ui of pickSailExtensionUIs(uiMod)) {
            loaded.push({ ...ui, coreId: manifest.id })
          }
        }
      }
    } catch (error) {
      console.warn(`[Sail] Failed to load extension UI from ${manifestUrl}`, error)
    }
  }
  uis = loaded
  notifyUIs()
  return loaded
}

export function getLoadedExtensionUIs(type?: string): LoadedSailExtensionUI[] {
  const all = uis ?? []
  return type ? all.filter(ui => ui.type === type) : all
}

/** Boot a DA for a {@link SailUserSession} via `sail.fdc3` factory. */
export async function createFdc3SessionAgent(
  session: SailUserSession,
  options?: CreateInstanceOptions,
): Promise<SailFdc3SessionHandle> {
  const registry = await loadExtensionCores()
  const factory = registry.getExport<SailFDC3ServerFactory>(SAIL_FDC3_SERVER_FACTORY)
  if (!factory) {
    throw new Error("sail.fdc3.serverFactory missing — is sail.fdc3 active in extensions.json?")
  }
  return factory.createInstance(session, options)
}
