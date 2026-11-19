import fs from "node:fs"
import path from "node:path"

import {
  bundledExtensionManifestPath,
  DEFAULT_INACTIVE_EXTENSION_IDS,
  isSailExtensionManifest,
  type SailExtensionManifest,
  type StoredExtension,
} from "@finos/sail-extension"

export type DiscoveredExtension = {
  /** Directory name under `extensions/` (e.g. `demo`). */
  dirName: string
  root: string
  manifestPath: string
  manifest: SailExtensionManifest
}

/**
 * Scan `extensionsDir` for packages that contain a valid `sail.extension.json`.
 */
export function discoverExtensions(extensionsDir: string): DiscoveredExtension[] {
  if (!fs.existsSync(extensionsDir)) {
    return []
  }
  const entries = fs.readdirSync(extensionsDir, { withFileTypes: true })
  const found: DiscoveredExtension[] = []
  for (const ent of entries) {
    if (!ent.isDirectory()) {
      continue
    }
    const root = path.join(extensionsDir, ent.name)
    const manifestPath = path.join(root, "sail.extension.json")
    if (!fs.existsSync(manifestPath)) {
      continue
    }
    const raw = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as unknown
    if (!isSailExtensionManifest(raw)) {
      throw new Error(`Invalid sail.extension.json at ${manifestPath}`)
    }
    found.push({ dirName: ent.name, root, manifestPath, manifest: raw })
  }
  found.sort((a, b) => a.dirName.localeCompare(b.dirName))
  return found
}

export type DefaultStoredExtensionsOptions = {
  extensionsDir: string
  /** Public URL prefix for bundled manifests (default `/extensions`). */
  publicBasePath?: string
  /** Extension ids left inactive in the seed (default: none — sail.fdc3 is active). */
  inactiveIds?: ReadonlySet<string>
}

/**
 * Build the seed `StoredExtension[]` from every package under `extensionsDir`.
 */
export function defaultStoredExtensions(options: DefaultStoredExtensionsOptions): StoredExtension[] {
  const inactive = options.inactiveIds ?? DEFAULT_INACTIVE_EXTENSION_IDS
  const publicBasePath = options.publicBasePath ?? "/extensions"
  return discoverExtensions(options.extensionsDir).map(d => ({
    url: bundledExtensionManifestPath(d.dirName, publicBasePath),
    active: !inactive.has(d.manifest.id),
  }))
}
