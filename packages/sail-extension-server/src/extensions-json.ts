import fs from "node:fs"
import path from "node:path"

import {
  activeManifestUrls,
  EXTENSIONS_JSON_FILENAME,
  isStoredExtensionList,
  type StoredExtension,
} from "@finos/sail-extension"

export function extensionsJsonPath(hostRoot: string): string {
  return path.join(hostRoot, EXTENSIONS_JSON_FILENAME)
}

export function readExtensionsJson(filePath: string): StoredExtension[] {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown
  if (!isStoredExtensionList(raw)) {
    throw new Error(`Invalid extensions.json at ${filePath}`)
  }
  return raw
}

export function writeExtensionsJson(filePath: string, list: StoredExtension[]): void {
  if (!isStoredExtensionList(list)) {
    throw new Error("writeExtensionsJson: list is not StoredExtension[]")
  }
  const dir = path.dirname(filePath)
  fs.mkdirSync(dir, { recursive: true })
  const tmp = `${filePath}.${process.pid}.tmp`
  fs.writeFileSync(tmp, `${JSON.stringify(list, null, 2)}\n`, "utf8")
  fs.renameSync(tmp, filePath)
}

/**
 * If `filePath` is missing, write `seed` and return it; otherwise read existing.
 */
export function ensureExtensionsJson(filePath: string, seed: StoredExtension[]): StoredExtension[] {
  if (!fs.existsSync(filePath)) {
    writeExtensionsJson(filePath, seed)
    return seed
  }
  return readExtensionsJson(filePath)
}

/**
 * Ensure + read host `extensions.json`, return active manifest URLs (Node).
 */
export function loadActiveExtensionManifestUrlsFromDisk(options: {
  hostRoot: string
  seed: StoredExtension[]
  baseOrigin?: string
}): string[] {
  const filePath = extensionsJsonPath(options.hostRoot)
  const list = ensureExtensionsJson(filePath, options.seed)
  return activeManifestUrls(list, { baseOrigin: options.baseOrigin })
}
