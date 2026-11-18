import type { ActivateFn, DeactivateFn, SailExtensionManifest } from "./types"
import type { SailExtensionUI } from "./ui"

export function isSailExtensionManifest(value: unknown): value is SailExtensionManifest {
  if (value === null || typeof value !== "object") {
    return false
  }
  const m = value as SailExtensionManifest
  return (
    typeof m.id === "string" &&
    typeof m.title === "string" &&
    typeof m.version === "string" &&
    m.activation !== null &&
    typeof m.activation === "object" &&
    typeof m.activation.module === "string"
  )
}

export function pickActivate(mod: unknown): ActivateFn | undefined {
  if (typeof mod === "function") {
    return mod as ActivateFn
  }
  if (mod === null || typeof mod !== "object") {
    return undefined
  }
  const record = mod as Record<string, unknown>
  if (typeof record.activate === "function") {
    return record.activate as ActivateFn
  }
  if (record.default !== null && typeof record.default === "object") {
    const def = record.default as Record<string, unknown>
    if (typeof def.activate === "function") {
      return def.activate as ActivateFn
    }
  }
  if (typeof record.default === "function") {
    return record.default as ActivateFn
  }
  return undefined
}

export function pickDeactivate(mod: unknown): DeactivateFn | undefined {
  if (mod === null || typeof mod !== "object") {
    return undefined
  }
  const record = mod as Record<string, unknown>
  if (typeof record.deactivate === "function") {
    return record.deactivate as DeactivateFn
  }
  if (record.default !== null && typeof record.default === "object") {
    const def = record.default as Record<string, unknown>
    if (typeof def.deactivate === "function") {
      return def.deactivate as DeactivateFn
    }
  }
  return undefined
}

export function isSailExtensionUI(value: unknown): value is SailExtensionUI {
  if (value === null || typeof value !== "object") {
    return false
  }
  const candidate = value as SailExtensionUI
  const hasConfig = typeof candidate.ConfigScreen === "function"
  const hasMount = typeof candidate.mount === "function"
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.type === "string" &&
    (hasConfig || hasMount)
  )
}

export function pickSailExtensionUIs(mod: unknown): SailExtensionUI[] {
  if (isSailExtensionUI(mod)) {
    return [mod]
  }
  if (Array.isArray(mod)) {
    return mod.filter(isSailExtensionUI)
  }
  if (mod === null || typeof mod !== "object") {
    return []
  }
  const found: SailExtensionUI[] = []
  const seen = new Set<SailExtensionUI>()
  const record = mod as Record<string, unknown>
  for (const value of [record.default, ...Object.values(record)]) {
    const items = Array.isArray(value) ? value : [value]
    for (const item of items) {
      if (isSailExtensionUI(item) && !seen.has(item)) {
        seen.add(item)
        found.push(item)
      }
    }
  }
  return found
}

/**
 * Resolve a relative module URL against the manifest document URL.
 * Path-absolute manifests (e.g. `/extensions/demo/sail.extension.json`) are
 * absolutized against `globalThis.location` when present.
 */
export function resolveExtensionModuleUrl(manifestUrl: string, modulePath: string): string {
  const base =
    /^[a-z][a-z0-9+.-]*:/i.test(manifestUrl)
      ? manifestUrl
      : new URL(
          manifestUrl,
          typeof globalThis !== "undefined" &&
            "location" in globalThis &&
            (globalThis as { location?: { href?: string } }).location?.href
            ? (globalThis as { location: { href: string } }).location.href
            : "http://localhost/",
        ).href
  return new URL(modulePath, base).href
}
