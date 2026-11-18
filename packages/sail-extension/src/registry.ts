import type {
  ActivateResult,
  SailExtensionContext,
  SailExtensionDisposable,
  SailExtensionManifest,
  SailExtensionStorage,
} from "./types"
import { isSailExtensionManifest, pickActivate, pickDeactivate, resolveExtensionModuleUrl } from "./utils"

export type FetchJson = (url: string) => Promise<unknown>
export type ImportModule = (url: string) => Promise<unknown>

export type SailExtensionRegistryOptions = {
  /** Pre-registered platform (or host) capabilities. */
  platformExports?: Record<string, unknown>
  createStorage: (extensionId: string) => SailExtensionStorage
  fetchJson?: FetchJson
  importModule?: ImportModule
}

type LoadedExtension = {
  manifest: SailExtensionManifest
  manifestUrl: string
  deactivate?: () => void | Promise<void>
  disposables: SailExtensionDisposable[]
}

/**
 * Host-side registry: load manifests, topo-sort by capability deps, activate,
 * and resolve `getExport`.
 */
export class SailExtensionRegistry {
  private readonly exports = new Map<string, unknown>()
  private readonly extensions = new Map<string, LoadedExtension>()
  private readonly createStorage: (extensionId: string) => SailExtensionStorage
  private readonly fetchJson: FetchJson
  private readonly importModule: ImportModule

  constructor(options: SailExtensionRegistryOptions) {
    this.createStorage = options.createStorage
    this.fetchJson = options.fetchJson ?? defaultFetchJson
    this.importModule = options.importModule ?? defaultImportModule
    for (const [id, value] of Object.entries(options.platformExports ?? {})) {
      this.registerExport(id, value)
    }
  }

  getExport<T = unknown>(capabilityId: string): T | undefined {
    return this.exports.get(capabilityId) as T | undefined
  }

  /** Register a platform/host capability before loading extensions. */
  registerExport(capabilityId: string, value: unknown): void {
    if (this.exports.has(capabilityId)) {
      throw new Error(`Duplicate capability id: ${capabilityId}`)
    }
    this.exports.set(capabilityId, value)
  }

  /**
   * Load and activate extensions from `sail.extension.json` URLs.
   * Providers of required capabilities activate before dependents.
   */
  async load(manifestUrls: string[]): Promise<void> {
    const pending: Array<{ manifest: SailExtensionManifest; manifestUrl: string }> = []
    for (const url of manifestUrls) {
      const raw = await this.fetchJson(url)
      if (!isSailExtensionManifest(raw)) {
        throw new Error(`Invalid sail.extension.json at ${url}`)
      }
      pending.push({ manifest: raw, manifestUrl: url })
    }

    const order = topoSortExtensions(pending.map(p => p.manifest), this.exports)
    const byId = new Map(pending.map(p => [p.manifest.id, p]))

    for (const id of order) {
      const entry = byId.get(id)
      if (!entry) {
        continue
      }
      await this.activateOne(entry.manifest, entry.manifestUrl)
    }
  }

  async disposeAll(): Promise<void> {
    for (const loaded of [...this.extensions.values()].reverse()) {
      for (const d of loaded.disposables) {
        d.dispose()
      }
      await loaded.deactivate?.()
    }
    this.extensions.clear()
  }

  private async activateOne(manifest: SailExtensionManifest, manifestUrl: string): Promise<void> {
    if (this.extensions.has(manifest.id)) {
      throw new Error(`Extension already loaded: ${manifest.id}`)
    }

    for (const dep of manifest.extensionDependencies ?? []) {
      if (!this.exports.has(dep)) {
        throw new Error(
          `Extension ${manifest.id} requires capability ${dep}, which is not registered`,
        )
      }
    }

    const moduleUrl = resolveExtensionModuleUrl(manifestUrl, manifest.activation.module)
    const mod = await this.importModule(moduleUrl)
    const activate = pickActivate(mod)
    if (!activate) {
      throw new Error(`Activation module for ${manifest.id} does not export activate()`)
    }

    const disposables: SailExtensionDisposable[] = []

    const ctx: SailExtensionContext = {
      id: manifest.id,
      storage: this.createStorage(manifest.id),
      getExport: <T = unknown>(capabilityId: string) => this.getExport<T>(capabilityId),
      subscriptions: { push: d => disposables.push(d) },
    }

    const result: ActivateResult = await activate(ctx)
    const exported = result && typeof result === "object" ? (result.exports ?? {}) : {}

    for (const key of Object.keys(manifest.exports ?? {})) {
      if (!(key in exported)) {
        throw new Error(`Extension ${manifest.id} declared export ${key} but activate() did not provide it`)
      }
    }

    for (const [capabilityId, value] of Object.entries(exported)) {
      this.registerExport(capabilityId, value)
    }

    this.extensions.set(manifest.id, {
      manifest,
      manifestUrl,
      deactivate: pickDeactivate(mod),
      disposables,
    })
  }
}

function defaultFetchJson(url: string): Promise<unknown> {
  return fetch(url).then(r => {
    if (!r.ok) {
      throw new Error(`Failed to fetch ${url}: ${r.status}`)
    }
    return r.json()
  })
}

function defaultImportModule(url: string): Promise<unknown> {
  return import(/* @vite-ignore */ url)
}

/**
 * Kahn topo-sort: an extension may activate once every capability in
 * `extensionDependencies` is already available (platform or earlier extension).
 */
function topoSortExtensions(
  manifests: SailExtensionManifest[],
  already: Map<string, unknown>,
): string[] {
  const byId = new Map(manifests.map(m => [m.id, m]))
  const providedBy = new Map<string, string>()
  for (const m of manifests) {
    for (const cap of Object.keys(m.exports ?? {})) {
      if (providedBy.has(cap) || already.has(cap)) {
        throw new Error(`Duplicate capability id: ${cap}`)
      }
      providedBy.set(cap, m.id)
    }
  }

  const remaining = new Set(manifests.map(m => m.id))
  const ordered: string[] = []
  const available = new Set(already.keys())

  while (remaining.size > 0) {
    const ready: string[] = []
    for (const id of remaining) {
      const m = byId.get(id)!
      const deps = m.extensionDependencies ?? []
      if (deps.every(d => available.has(d))) {
        ready.push(id)
      }
    }
    if (ready.length === 0) {
      throw new Error(
        `Cannot resolve extensionDependencies (cycle or missing provider): ${[...remaining].join(", ")}`,
      )
    }
    ready.sort()
    for (const id of ready) {
      remaining.delete(id)
      ordered.push(id)
      const m = byId.get(id)!
      for (const cap of Object.keys(m.exports ?? {})) {
        available.add(cap)
      }
    }
  }

  return ordered
}
