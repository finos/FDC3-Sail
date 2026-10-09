/**
 * FDC3 app directory fetch and validation helpers (REST /v2/apps).
 */

import type { DirectoryApp as DaDirectoryApp } from "@finos/sail-headless-agent"
import type { DirectoryApp } from "./types"
import { consoleLogger, type Logger } from "../logging/logger"

export interface DirectoryData {
  applications: DirectoryApp[]
  message?: string
}

export function parseDirectoryData(data: DirectoryApp[] | DirectoryData): DirectoryApp[] {
  if (Array.isArray(data)) {
    return data
  }
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- unvalidated remote JSON
  if (data.applications && Array.isArray(data.applications)) {
    return data.applications
  }
  throw new Error(
    "Invalid data format: expected array of DirectoryApp or DirectoryData with applications array",
  )
}

export function validateApplication(app: DirectoryApp, source?: string): void {
  // AppD records sometimes omit `title` (e.g. FINOS conformance MockAppId) — fall back.
  if (!app.title) {
    const withName = app as DirectoryApp & { name?: string }
    if (typeof withName.name === "string" && withName.name.length > 0) {
      app.title = withName.name
    } else if (app.appId) {
      app.title = app.appId
    }
  }
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- unvalidated remote JSON
  if (!app.appId || !app.title || !app.type || !app.details) {
    const sourceInfo = source ? ` in ${source}` : ""
    throw new Error(
      `Invalid application${sourceInfo}: missing required fields (appId, title, type, or details)`,
    )
  }
}

/**
 * Validate apps from a directory. Invalid entries are skipped with a warning so one
 * bad record (common in published conformance fixtures) does not discard the rest.
 */
export function validateApplications(
  applications: DirectoryApp[],
  source?: string,
): DirectoryApp[] {
  const valid: DirectoryApp[] = []
  for (const app of applications) {
    try {
      validateApplication(app, source)
      valid.push(app)
    } catch (error) {
      consoleLogger.warn(
        `Skipping invalid application${source ? ` in ${source}` : ""}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
  }
  return valid
}

function normalizeDirectoryUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname.replace(/\/$/, "") || "/"
    // Already an AppD REST endpoint
    if (pathname.endsWith("/v2/apps")) {
      return url
    }
    // Static App Directory JSON (local conformance / example-apps / hosted snapshots)
    if (pathname.endsWith(".json")) {
      return url
    }
    // Treat as AppD base URL and append the REST collection path
    urlObj.pathname = `${pathname}/v2/apps`
    return urlObj.toString()
  } catch {
    return url
  }
}

export function isValidDirectoryUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === "http:" || urlObj.protocol === "https:"
  } catch {
    return false
  }
}

export async function fetchAppDirectory(url: string): Promise<DaDirectoryApp[]> {
  try {
    const normalizedUrl = normalizeDirectoryUrl(url)
    const response = await fetch(normalizedUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch ${normalizedUrl}: ${response.status} ${response.statusText}`)
    }

    const data = (await response.json()) as DirectoryData | { applications?: DirectoryApp[] }
    const applications = parseDirectoryData(data as DirectoryApp[] | DirectoryData)
    return validateApplications(applications, normalizedUrl) as DaDirectoryApp[]
  } catch (error) {
    throw new Error(
      `Failed to fetch from ${url}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

export function mergeAppsWithoutDuplicates(
  existingApps: DaDirectoryApp[],
  incomingApps: DaDirectoryApp[],
): DaDirectoryApp[] {
  const existingAppIds = new Set(existingApps.map(app => app.appId.toLowerCase()))
  const newApps: DaDirectoryApp[] = []
  for (const app of incomingApps) {
    const normalizedAppId = app.appId.toLowerCase()
    if (!existingAppIds.has(normalizedAppId)) {
      existingAppIds.add(normalizedAppId)
      newApps.push(app)
    }
  }
  return [...existingApps, ...newApps]
}

export function logDirectoryLoadFailure(
  url: string,
  error: unknown,
  logger: Logger = consoleLogger,
): void {
  const errorMessage = `Failed to load applications from ${url}: ${
    error instanceof Error ? error.message : String(error)
  }`
  logger.error(errorMessage)
}
