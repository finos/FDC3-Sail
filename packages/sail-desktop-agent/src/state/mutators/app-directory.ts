/**
 * AgentState mutators for the app directory catalog slice.
 */

import type { DirectoryApp, DirectoryData } from "../../app-directory/types"
import { consoleLogger, type Logger } from "../../logging/logger"
import {
  fetchAppDirectory,
  isValidDirectoryUrl,
  logDirectoryLoadFailure,
  mergeAppsWithoutDuplicates,
  parseDirectoryData,
  validateApplications,
} from "../../app-directory/fetch-app-directory"
import type { AgentState } from "../types"

/** Adds one app without dedupe (config seed). */
export function addApp(state: AgentState, app: DirectoryApp): AgentState {
  return {
    ...state,
    appDirectory: {
      ...state.appDirectory,
      apps: [...state.appDirectory.apps, app],
    },
  }
}

/** Removes every catalog entry whose appId matches case-insensitively. */
export function removeApplicationsByAppId(state: AgentState, appId: string): AgentState {
  const normalizedAppId = appId.toLowerCase()
  return {
    ...state,
    appDirectory: {
      ...state.appDirectory,
      apps: state.appDirectory.apps.filter(app => app.appId.toLowerCase() !== normalizedAppId),
    },
  }
}

/** Adds apps with case-insensitive duplicate appId skipping (first wins) and required-field validation. */
export function addApplications(
  state: AgentState,
  data: DirectoryApp[] | DirectoryData,
): AgentState {
  const applications = parseDirectoryData(data)
  validateApplications(applications)

  return {
    ...state,
    appDirectory: {
      ...state.appDirectory,
      apps: mergeAppsWithoutDuplicates(state.appDirectory.apps, applications),
    },
  }
}

export function addDirectoryUrl(state: AgentState, url: string): AgentState {
  if (!url || typeof url !== "string") {
    throw new Error("Directory URL must be a non-empty string")
  }

  if (!isValidDirectoryUrl(url)) {
    throw new Error(
      `Invalid directory URL: ${url}. ` +
        `Must be a valid http/https REST endpoint. ` +
        `Load directory files yourself and pass the apps via the "apps" option.`,
    )
  }

  if (state.appDirectory.directoryUrls.includes(url)) {
    return state
  }

  return {
    ...state,
    appDirectory: {
      ...state.appDirectory,
      directoryUrls: [...state.appDirectory.directoryUrls, url],
    },
  }
}

export async function loadDirectoryIntoState(
  state: AgentState,
  url: string,
  logger: Logger = consoleLogger,
): Promise<AgentState> {
  try {
    let next = addDirectoryUrl(state, url)
    const apps = await fetchAppDirectory(url)
    next = {
      ...next,
      appDirectory: {
        ...next.appDirectory,
        apps: mergeAppsWithoutDuplicates(next.appDirectory.apps, apps),
      },
    }
    return next
  } catch (error) {
    logDirectoryLoadFailure(url, error, logger)
    throw new Error(
      `Failed to load applications from ${url}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }
}

export function removeDirectoryUrl(state: AgentState, url: string): AgentState {
  return {
    ...state,
    appDirectory: {
      ...state.appDirectory,
      directoryUrls: state.appDirectory.directoryUrls.filter(entry => entry !== url),
    },
  }
}

export function clearDirectoryUrls(state: AgentState): AgentState {
  return {
    ...state,
    appDirectory: {
      ...state.appDirectory,
      directoryUrls: [],
    },
  }
}

export async function replaceDirectoriesInState(
  state: AgentState,
  urls: string[],
  logger: Logger = consoleLogger,
): Promise<AgentState> {
  if (!Array.isArray(urls)) {
    throw new Error("URLs must be an array")
  }

  if (urls.length === 0) {
    return {
      ...state,
      appDirectory: { apps: [], directoryUrls: [] },
    }
  }

  const invalidUrls = urls.filter(url => !isValidDirectoryUrl(url))
  if (invalidUrls.length > 0) {
    throw new Error(
      `Invalid directory URLs provided: ${invalidUrls.join(", ")}. ` +
        `Must be valid http/https REST endpoints. ` +
        `Load directory files yourself and pass the apps via the "apps" option.`,
    )
  }

  let next: AgentState = {
    ...state,
    appDirectory: { apps: [], directoryUrls: [...urls] },
  }

  // Fetch concurrently; fold results synchronously so concurrent loads cannot
  // overwrite each other via a shared mutable accumulator.
  const results = await Promise.allSettled(urls.map(url => fetchAppDirectory(url)))

  const errors: string[] = []
  for (const [index, result] of results.entries()) {
    const url = urls[index]
    if (url === undefined) {
      continue
    }
    if (result.status === "fulfilled") {
      next = {
        ...next,
        appDirectory: {
          ...next.appDirectory,
          apps: mergeAppsWithoutDuplicates(next.appDirectory.apps, result.value),
        },
      }
      continue
    }

    logDirectoryLoadFailure(url, result.reason, logger)
    errors.push(
      `Failed to load ${url}: ${
        result.reason instanceof Error ? result.reason.message : String(result.reason)
      }`,
    )
  }

  const successCount = results.filter(result => result.status === "fulfilled").length
  logger.info(
    `Loaded ${next.appDirectory.apps.length} apps from ${successCount}/${urls.length} directory source(s)`,
  )

  if (errors.length > 0) {
    logger.warn("Some directories failed to load:", errors)
  }

  return next
}
