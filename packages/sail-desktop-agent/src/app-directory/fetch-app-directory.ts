/**
 * FDC3 app directory fetch and validation helpers (REST /v2/apps).
 */

import type { DirectoryApp, DirectoryData } from "./types"
import { consoleLogger, type Logger } from "../logging/logger"

export function parseDirectoryData(data: DirectoryApp[] | DirectoryData): DirectoryApp[] {
  if (Array.isArray(data)) {
    return data
  }
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- data is unvalidated JSON from a remote app-directory URL; the type is an assumption, not a guarantee.
  if (data.applications && Array.isArray(data.applications)) {
    return data.applications
  }
  throw new Error(
    "Invalid data format: expected array of DirectoryApp or DirectoryData with applications array",
  )
}

export function validateApplication(app: DirectoryApp, source?: string): void {
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- app is unvalidated JSON from a remote app-directory URL; the DirectoryApp type is an assumption about what should arrive, not a fact about what does.
  if (!app.appId || !app.title || !app.type || !app.details) {
    const sourceInfo = source ? ` in ${source}` : ""
    throw new Error(
      `Invalid application${sourceInfo}: missing required fields (appId, title, type, or details)`,
    )
  }
}

export function validateApplications(applications: DirectoryApp[], source?: string): void {
  for (const app of applications) {
    validateApplication(app, source)
  }
}

function normalizeDirectoryUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    if (urlObj.pathname.endsWith("/v2/apps")) {
      return url
    }
    const basePath = urlObj.pathname.replace(/\/$/, "")
    urlObj.pathname = `${basePath}/v2/apps`
    return urlObj.toString()
  } catch {
    return url
  }
}

/** Directory URLs must be http/https REST endpoints (FDC3 app directory spec). */
export function isValidDirectoryUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === "http:" || urlObj.protocol === "https:"
  } catch {
    return false
  }
}

/** Fetches and validates apps from a remote /v2/apps endpoint. */
export async function fetchAppDirectory(url: string): Promise<DirectoryApp[]> {
  try {
    const normalizedUrl = normalizeDirectoryUrl(url)
    const response = await fetch(normalizedUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch ${normalizedUrl}: ${response.status} ${response.statusText}`)
    }

    const data = (await response.json()) as DirectoryData | { applications?: DirectoryApp[] }
    const applications = parseDirectoryData(data as DirectoryApp[] | DirectoryData)
    validateApplications(applications, normalizedUrl)
    return applications
  } catch (error) {
    throw new Error(
      `Failed to fetch from ${url}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Merges fetched apps into catalog.apps without duplicate appIds.
 *
 * Identity is `appId` (including fully-qualified forms like `app1@company1.com`),
 * compared case-insensitively so `App1` and `app1` do not both enter the catalog.
 * When the same id appears again (across directories or batches), the first entry wins.
 */
export function mergeAppsWithoutDuplicates(
  existingApps: DirectoryApp[],
  incomingApps: DirectoryApp[],
): DirectoryApp[] {
  const existingAppIds = new Set(existingApps.map(app => app.appId.toLowerCase()))
  const newApps: DirectoryApp[] = []
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
