import { DirectoryApp } from "@finos/fdc3-sail-da-impl"
import { v4 as uuid } from "uuid"

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ParseResult {
  success: boolean
  apps: DirectoryApp[]
  error?: string
  warnings: string[]
}

/**
 * Normalizes an arbitrary parsed object into an FDC3 DirectoryApp (Application) object
 */
export function normalizeAppRecord(raw: any, index = 0): DirectoryApp {
  const appId =
    typeof raw.appId === "string" && raw.appId.trim()
      ? raw.appId.trim()
      : typeof raw.name === "string" && raw.name.trim()
        ? raw.name.trim().toLowerCase().replace(/\s+/g, "-")
        : `app-${uuid().substring(0, 8)}`

  const title =
    typeof raw.title === "string" && raw.title.trim()
      ? raw.title.trim()
      : typeof raw.name === "string" && raw.name.trim()
        ? raw.name.trim()
        : `Imported App ${index + 1}`

  const type = raw.type === "native" ? "native" : "web"

  // Details handling (FDC3 v2 vs v1 or raw url)
  let details: any
  if (type === "web") {
    const url =
      typeof raw.details?.url === "string"
        ? raw.details.url
        : typeof raw.url === "string"
          ? raw.url
          : typeof raw.manifest === "string"
            ? raw.manifest
            : typeof raw.manifestUrl === "string"
              ? raw.manifestUrl
              : ""
    details = { url }
  } else {
    details = {
      path:
        typeof raw.details?.path === "string"
          ? raw.details.path
          : raw.path || "",
      arguments:
        typeof raw.details?.arguments === "string"
          ? raw.details.arguments
          : raw.arguments || "",
    }
  }

  // Icons normalization
  let icons: Array<{ src: string; size?: string; type?: string }> = []
  if (Array.isArray(raw.icons) && raw.icons.length > 0) {
    icons = raw.icons.map((icon: any) => ({
      src:
        typeof icon === "string"
          ? icon
          : icon?.src || "/icons/control/choose-app.svg",
      ...(icon?.size ? { size: String(icon.size) } : {}),
      ...(icon?.type ? { type: String(icon.type) } : {}),
    }))
  } else if (raw.icon) {
    icons = [
      {
        src:
          typeof raw.icon === "string"
            ? raw.icon
            : raw.icon.src || "/icons/control/choose-app.svg",
      },
    ]
  } else {
    icons = [{ src: "/icons/control/choose-app.svg" }]
  }

  // Screenshots normalization
  let screenshots: Array<{
    src: string
    size?: string
    type?: string
    label?: string
  }> = []
  if (Array.isArray(raw.screenshots) && raw.screenshots.length > 0) {
    screenshots = raw.screenshots.map((s: any) => ({
      src: typeof s === "string" ? s : s?.src || "/images/screenshot.webp",
      ...(s?.size ? { size: String(s.size) } : {}),
      ...(s?.type ? { type: String(s.type) } : {}),
      ...(s?.label ? { label: String(s.label) } : {}),
    }))
  } else {
    screenshots = [
      { src: "/images/screenshot.webp", label: "Default Screenshot" },
    ]
  }

  // Interop normalization (Intents listensFor, raises, channels)
  const interop: any = {}
  if (raw.interop) {
    if (raw.interop.intents) {
      interop.intents = {}
      // listensFor
      if (raw.interop.intents.listensFor) {
        if (Array.isArray(raw.interop.intents.listensFor)) {
          // Convert array format to map format
          interop.intents.listensFor = {}
          raw.interop.intents.listensFor.forEach((intent: any) => {
            const name = intent.name || intent.intent || "UnknownIntent"
            interop.intents.listensFor[name] = {
              displayName: intent.displayName || name,
              contexts: Array.isArray(intent.contexts) ? intent.contexts : [],
              ...(intent.resultType ? { resultType: intent.resultType } : {}),
            }
          })
        } else if (typeof raw.interop.intents.listensFor === "object") {
          interop.intents.listensFor = raw.interop.intents.listensFor
        }
      }

      // raises
      if (raw.interop.intents.raises) {
        if (Array.isArray(raw.interop.intents.raises)) {
          interop.intents.raises = {}
          raw.interop.intents.raises.forEach((intent: any) => {
            const name = intent.name || intent.intent || "UnknownIntent"
            interop.intents.raises[name] = Array.isArray(intent.contexts)
              ? intent.contexts
              : []
          })
        } else if (typeof raw.interop.intents.raises === "object") {
          interop.intents.raises = raw.interop.intents.raises
        }
      }
    }

    if (raw.interop.userChannels) {
      interop.userChannels = {
        broadcasts: Array.isArray(raw.interop.userChannels.broadcasts)
          ? raw.interop.userChannels.broadcasts
          : [],
        listensFor: Array.isArray(raw.interop.userChannels.listensFor)
          ? raw.interop.userChannels.listensFor
          : [],
      }
    }

    if (Array.isArray(raw.interop.appChannels)) {
      interop.appChannels = raw.interop.appChannels
    }
  }

  // Categories
  const categories: string[] = Array.isArray(raw.categories)
    ? raw.categories.filter((c: any) => typeof c === "string")
    : typeof raw.category === "string"
      ? [raw.category]
      : []

  const app: DirectoryApp = {
    appId,
    title,
    name: title,
    type,
    details,
    version:
      typeof raw.version === "string" && raw.version ? raw.version : "1.0.0",
    publisher:
      typeof raw.publisher === "string" && raw.publisher
        ? raw.publisher
        : "FINOS",
    description: typeof raw.description === "string" ? raw.description : "",
    tooltip: typeof raw.tooltip === "string" ? raw.tooltip : "",
    lang: typeof raw.lang === "string" ? raw.lang : "en-US",
    categories,
    icons,
    screenshots,
    ...(typeof raw.contactEmail === "string" && raw.contactEmail
      ? { contactEmail: raw.contactEmail }
      : {}),
    ...(typeof raw.supportEmail === "string" && raw.supportEmail
      ? { supportEmail: raw.supportEmail }
      : {}),
    ...(typeof raw.moreInfo === "string" && raw.moreInfo
      ? { moreInfo: raw.moreInfo }
      : {}),
    ...(Object.keys(interop).length > 0 ? { interop } : {}),
  }

  return app
}

/**
 * Parses raw text input (JSON) into an array of FDC3 DirectoryApp records.
 * Supports:
 * - Single AppD record object: { appId: "...", title: "...", ... }
 * - Array of AppD record objects: [ { appId: "..." }, { ... } ]
 * - App Directory catalog response: { applications: [ ... ] } or { apps: [ ... ] }
 */
export function parseAppDInput(rawText: string): ParseResult {
  const trimmed = rawText.trim()
  if (!trimmed) {
    return {
      success: false,
      apps: [],
      error: "Input is empty. Please paste an AppD JSON record or catalog.",
      warnings: [],
    }
  }

  let parsed: any
  try {
    parsed = JSON.parse(trimmed)
  } catch (err: any) {
    return {
      success: false,
      apps: [],
      error: `Invalid JSON syntax: ${err.message || "Could not parse input."}`,
      warnings: [],
    }
  }

  const warnings: string[] = []
  let rawList: any[] = []

  if (Array.isArray(parsed)) {
    rawList = parsed
  } else if (parsed && typeof parsed === "object") {
    if (Array.isArray(parsed.applications)) {
      rawList = parsed.applications
    } else if (Array.isArray(parsed.apps)) {
      rawList = parsed.apps
    } else {
      // Single record
      rawList = [parsed]
    }
  } else {
    return {
      success: false,
      apps: [],
      error: "JSON content must be an AppD object or array of objects.",
      warnings: [],
    }
  }

  if (rawList.length === 0) {
    return {
      success: false,
      apps: [],
      error: "No application records found in the provided JSON.",
      warnings: [],
    }
  }

  const apps: DirectoryApp[] = []
  for (let i = 0; i < rawList.length; i++) {
    const item = rawList[i]
    if (!item || typeof item !== "object") {
      warnings.push(`Skipping non-object item at index ${i}.`)
      continue
    }

    try {
      const normalized = normalizeAppRecord(item, i)
      apps.push(normalized)
    } catch (err: any) {
      warnings.push(`Failed to normalize item ${i}: ${err.message}`)
    }
  }

  if (apps.length === 0) {
    return {
      success: false,
      apps: [],
      error: "No valid application definitions could be extracted.",
      warnings,
    }
  }

  return {
    success: true,
    apps,
    warnings,
  }
}

/**
 * Exports a single DirectoryApp to a formatted AppD JSON string.
 */
export function exportAppDRecord(app: DirectoryApp, pretty = true): string {
  return JSON.stringify(app, null, pretty ? 2 : 0)
}

/**
 * Exports an array of DirectoryApps as an FDC3 App Directory Catalog response.
 */
export function exportAppDCatalog(apps: DirectoryApp[], pretty = true): string {
  const catalog = {
    message: "FDC3 Application Directory Export",
    applications: apps,
  }
  return JSON.stringify(catalog, null, pretty ? 2 : 0)
}

/**
 * Triggers a file download in the browser.
 */
export function downloadJsonFile(filename: string, content: string): void {
  try {
    const blob = new Blob([content], { type: "application/json;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename.endsWith(".json") ? filename : `${filename}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error("Failed to download file:", err)
  }
}

/**
 * Copies text to the clipboard with fallback support.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fallback below
    }
  }

  try {
    const textArea = document.createElement("textarea")
    textArea.value = text
    textArea.style.position = "fixed"
    textArea.style.left = "-999999px"
    textArea.style.top = "-999999px"
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    const successful = document.execCommand("copy")
    document.body.removeChild(textArea)
    return successful
  } catch (err) {
    console.error("Failed to copy to clipboard:", err)
    return false
  }
}
