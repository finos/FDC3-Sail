import type { SailExtension } from "./types"
import type { SailExtensionUI } from "./ui"

export function isSailExtension(value: unknown): value is SailExtension {
  if (value === null || typeof value !== "object") {
    return false
  }
  const candidate = value as SailExtension
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.getUIExtensions === "function"
  )
}

export function pickSailExtension(mod: unknown): SailExtension | undefined {
  if (isSailExtension(mod)) {
    return mod
  }
  if (mod === null || typeof mod !== "object") {
    return undefined
  }
  const record = mod as Record<string, unknown>
  if (isSailExtension(record.default)) {
    return record.default
  }
  return Object.values(record).find(value => isSailExtension(value))
}

export function isSailExtensionUI(value: unknown): value is SailExtensionUI {
  if (value === null || typeof value !== "object") {
    return false
  }
  const candidate = value as SailExtensionUI
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.type === "string" &&
    typeof candidate.ConfigScreen === "function"
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
