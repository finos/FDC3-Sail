import {
  SailExtensionRegistry,
  loadActiveExtensionManifestUrls,
  pickSailExtensionUIs,
  resolveExtensionModuleUrl,
  type SailExtensionManifest,
} from "@finos/sail-extension"
import type { SailExtensionUI } from "@finos/sail-extension/ui"
import type { FDC3ServerInstance } from "@finos/sail-headless-agent"
import {
  SAIL_FDC3_SERVER_FACTORY,
  SailFDC3ServerFactory,
  createRegisterMiddleware,
} from "@finos/sail-extension-fdc3"
import type { SailDesktopAgent } from "@finos/sail-browser-agent"
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

import { createSailFinanceExtensionStorage } from "./extension-storage"

const UI_CONTRIBUTION_POINTS = [SAIL_UI_CONFIG, SAIL_UI_HIDDEN] as const

let uis: SailExtensionUI[] | null = null
let registry: SailExtensionRegistry | null = null

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

async function loadRegistry(): Promise<SailExtensionRegistry> {
  if (registry) {
    return registry
  }
  const sessions = createSessionService()
  const bus = createSailPlatformBus()
  const catalog = createSailPlatformCatalog()
  const storage = createSailStorage({
    createUserStorage: instanceId =>
      createLocalUserStorage({ keyPrefix: `sail_finance_${instanceId}_` }),
  })
  registry = new SailExtensionRegistry({
    platformExports: {
      [SAIL_PLATFORM_SESSION]: sessions,
      [SAIL_PLATFORM_BUS]: bus,
      [SAIL_PLATFORM_CATALOG]: catalog,
      [SAIL_PLATFORM_STORAGE]: storage,
    },
    createStorage: createSailFinanceExtensionStorage,
  })
  try {
    await registry.load(await loadActiveExtensionManifestUrls())
    if (typeof window !== "undefined") {
      const { startFdc3WcpEdge } = await import("@finos/sail-extension-fdc3/ui-hidden")
      await startFdc3WcpEdge()
    }
  } catch (error) {
    console.warn("[Sail Finance] Extension load failed", error)
  }
  return registry
}

/** Preferred: factory.createInstance(session). */
export async function createFdc3SessionAgent(session: SailUserSession) {
  const reg = await loadRegistry()
  const factory = reg.getExport<SailFDC3ServerFactory>(SAIL_FDC3_SERVER_FACTORY)
  if (!factory) {
    throw new Error("sail.fdc3.serverFactory missing — is sail.fdc3 active in extensions.json?")
  }
  return factory.createInstance(session)
}

/**
 * Platform-only exports + real sail.fdc3; apply queued middleware onto host DA.
 */
export async function wrapWithExtensions(instance: SailDesktopAgent): Promise<SailDesktopAgent> {
  const reg = await loadRegistry()
  const factory = reg.getExport<SailFDC3ServerFactory>(SAIL_FDC3_SERVER_FACTORY)
  if (!factory) {
    throw new Error("sail.fdc3.serverFactory missing — is sail.fdc3 active in extensions.json?")
  }

  const { agent, registerMiddleware } = createRegisterMiddleware(
    instance as unknown as FDC3ServerInstance,
  )
  factory.applyQueuedMiddleware(registerMiddleware)

  const published = factory.appDirectory.retrieveAllApps()
  if (published.length > 0) {
    instance.apps.addAll(published)
  }

  return agent as unknown as SailDesktopAgent
}
