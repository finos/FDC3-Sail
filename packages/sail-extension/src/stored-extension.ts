/**
 * Host-local enablement record (persisted in package-root `extensions.json`).
 * Not per-user — do not store this in sail.platform.storage / sail.ui.config.
 */
export type StoredExtension = {
  /** URL of `sail.extension.json` (path-absolute or absolute). */
  url: string
  active: boolean
}

/** Extension ids left inactive in the default seed (empty — sail.fdc3 is on by default). */
export const DEFAULT_INACTIVE_EXTENSION_IDS: ReadonlySet<string> = new Set()

export const EXTENSIONS_JSON_FILENAME = "extensions.json"

export function isStoredExtension(value: unknown): value is StoredExtension {
  if (value === null || typeof value !== "object") {
    return false
  }
  const e = value as StoredExtension
  return typeof e.url === "string" && e.url.length > 0 && typeof e.active === "boolean"
}

export function isStoredExtensionList(value: unknown): value is StoredExtension[] {
  return Array.isArray(value) && value.every(isStoredExtension)
}

function browserOrigin(): string | undefined {
  if (typeof globalThis === "undefined" || !("location" in globalThis)) {
    return undefined
  }
  const loc = (globalThis as { location?: { origin?: string } }).location
  return typeof loc?.origin === "string" && loc.origin !== "null" ? loc.origin : undefined
}

/**
 * Resolve path-absolute URLs against `baseOrigin`, or `location.origin` in the browser.
 */
export function resolveExtensionUrl(url: string, baseOrigin?: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) {
    return url
  }
  const origin = baseOrigin ?? browserOrigin()
  if (url.startsWith("/") && origin) {
    return new URL(url, origin.replace(/\/$/, "") + "/").href
  }
  return url
}

/** Active manifest URLs for `registry.load`. */
export function activeManifestUrls(
  list: StoredExtension[],
  options?: {
    baseOrigin?: string
  },
): string[] {
  return list
    .filter(e => e.active)
    .map(e => resolveExtensionUrl(e.url, options?.baseOrigin))
}

/** Public path for a bundled extension manifest under the host origin. */
export function bundledExtensionManifestPath(dirName: string, publicBasePath = "/extensions"): string {
  const base = publicBasePath.replace(/\/$/, "") || "/extensions"
  return `${base}/${dirName}/sail.extension.json`
}
