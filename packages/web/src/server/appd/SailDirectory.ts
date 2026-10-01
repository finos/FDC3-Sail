import { BasicDirectory, DirectoryApp } from "@finos/fdc3-sail-da-impl"
import { FDC3_WEBSOCKET_PROPERTY } from "@finos/fdc3-sail-common"
import { createLogger } from "../logger"
import fs from "node:fs/promises"

const log = createLogger("Directory")

/* eslint-disable  @typescript-eslint/no-explicit-any */

export const DEFAULT_ICON = "/icons/control/choose-app.svg"

export function getIcon(a: DirectoryApp | undefined) {
  if (a) {
    const icons = a.icons ?? []
    if (icons.length > 0) {
      return icons[0].src
    }
  }

  return DEFAULT_ICON
}

function loadRemotely(u: string): Promise<any> {
  return fetch(u).then((response) => response.json())
}

async function loadFile(u: string): Promise<any> {
  const data = await fs.readFile(u, { encoding: "utf8" })
  return JSON.parse(data)
}

async function load(url: string): Promise<DirectoryApp[]> {
  if (url.startsWith("http")) {
    return await loadRemotely(url).then(convertToDirectoryList)
  } else {
    return await loadFile(url).then(convertToDirectoryList)
  }
}

const convertToDirectoryList = (data: any) => {
  return data.applications as DirectoryApp[]
}

/**
 * Handles local and remote url loading, and stamps the stable WSCP endpoint
 * onto native apps as connectionUrl for UI display.
 */
export class SailDirectory extends BasicDirectory {
  private readonly webSocketUrl: string
  private currentUrlsJson: string = "[]"
  private currentCustomAppsJson: string = "[]"

  /**
   * @param webSocketUrl Stable WSCP endpoint, e.g. ws://localhost:8090/fdc3/ws
   */
  constructor(webSocketUrl: string) {
    super([])
    this.webSocketUrl = webSocketUrl
  }

  getWebSocketUrl(): string {
    return this.webSocketUrl
  }

  /**
   * Refresh the directory with the given URLs and custom apps.
   * Only reloads if something has actually changed to avoid race conditions.
   * The update is atomic - allApps is replaced in a single assignment.
   */
  async refresh(urls: string[], customApps: DirectoryApp[]): Promise<void> {
    const urlsJson = JSON.stringify(urls)
    const customAppsJson = JSON.stringify(customApps)

    if (
      this.currentUrlsJson == urlsJson &&
      this.currentCustomAppsJson == customAppsJson
    ) {
      return
    }

    log.debug("Directory refresh triggered")

    const newApps: DirectoryApp[] = []

    for (const u of urls) {
      const apps = await this.loadFromUrl(u)
      apps.forEach((a) => {
        if (!newApps.find((a2) => a2.appId == a.appId)) {
          newApps.push(a)
        }
      })
    }

    const customAppsCopy: DirectoryApp[] = JSON.parse(customAppsJson)
    customAppsCopy.forEach((a) => {
      if (!newApps.find((a2) => a2.appId == a.appId)) {
        newApps.push(a)
      }
    })

    // Stamp stable WSCP URL for native apps (identity is via sharedSecret, not path)
    newApps.forEach((app) => {
      if (app.type === "native") {
        ;(app.details as any)[FDC3_WEBSOCKET_PROPERTY] = this.webSocketUrl
      }
    })

    this.allApps = newApps
    this.currentUrlsJson = urlsJson
    this.currentCustomAppsJson = customAppsJson

    log.debug({ totalApps: this.allApps.length }, "Directory refreshed")
  }

  private async loadFromUrl(url: string): Promise<DirectoryApp[]> {
    try {
      const apps = await load(url)
      log.debug({ count: apps.length, url }, "Loaded apps from URL")
      return apps
    } catch (e) {
      log.error({ url, error: e }, "Error loading from URL")
      return []
    }
  }

  retrieveAppsByUrl(url: string): DirectoryApp[] {
    return this.retrieveAllApps().filter(
      (a) => a.type == "web" && (a.details as any).url == url,
    )
  }
}
