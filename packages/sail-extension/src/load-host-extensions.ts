import {
  activeManifestUrls,
  EXTENSIONS_JSON_FILENAME,
  isStoredExtensionList,
  type StoredExtension,
} from "./stored-extension"

export type LoadActiveExtensionManifestUrlsOptions = {
  /** Origin for Node fetch of path-absolute URLs (e.g. http://localhost:8090). */
  baseOrigin?: string
}

async function fetchJsonList(url: string): Promise<StoredExtension[] | null> {
  try {
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) {
      return null
    }
    const raw: unknown = await res.json()
    return isStoredExtensionList(raw) ? raw : null
  } catch {
    return null
  }
}

/**
 * Load host `extensions.json` (HTTP) and return active manifest URLs for `registry.load`.
 * Browser hosts use this. Node hosts should prefer
 * `loadActiveExtensionManifestUrlsFromDisk` from `@finos/sail-extension-server`.
 */
export async function loadActiveExtensionManifestUrls(
  options: LoadActiveExtensionManifestUrlsOptions = {},
): Promise<string[]> {
  const path = `/${EXTENSIONS_JSON_FILENAME}`
  const url = options.baseOrigin ? new URL(path, options.baseOrigin).href : path
  const list = await fetchJsonList(url)
  if (!list) {
    throw new Error(
      "Could not load host extensions.json (is the Sail extensions Vite plugin enabled?)",
    )
  }
  return activeManifestUrls(list, { baseOrigin: options.baseOrigin })
}
