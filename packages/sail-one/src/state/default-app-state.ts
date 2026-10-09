import type { DirectoryApp, WebAppDetails } from "@finos/sail-browser-agent"
import { resolveSailForceNewWindow } from "./force-new-window"
import { getClientState, getServerState } from "./index"

export enum AppHosting {
  Frame,
  Tab,
}

export interface AppOpenDetails {
  instanceId: string
  channel: string | null
  instanceTitle: string
}

export interface AppState {
  registerAppWindow(window: Window, instanceId: string): void
  getInstanceIdForWindow(window: Window): string | undefined
  findWindow(instanceId: string): Window | undefined
  forgetWindow(instanceId: string): void
  createTitle(detail: DirectoryApp): string
  open(detail: DirectoryApp, destination?: AppHosting): Promise<AppOpenDetails>
}

export function normalizeIdentityUrl(identityUrl: string): string {
  return identityUrl.replace(/\/+$/, "")
}

export class DefaultAppState implements AppState {
  getDirectoryAppForUrl(identityUrl: string): DirectoryApp | undefined {
    const strippedIdentityUrl = normalizeIdentityUrl(identityUrl)
    const applications: DirectoryApp[] = getServerState().getKnownApps()
    return applications.find(x => {
      const d = x.details as WebAppDetails
      return (
        d.url == strippedIdentityUrl ||
        d.url == identityUrl ||
        (d.url.startsWith("/") && identityUrl.endsWith(d.url))
      )
    })
  }

  /** Delegates to the Desktop Agent host-window registry. */
  registerAppWindow(window: Window, instanceId: string): void {
    getServerState().registerHostWindow(window, instanceId)
  }

  getInstanceIdForWindow(window: Window): string | undefined {
    return getServerState().getInstanceIdForHostWindow(window)
  }

  findWindow(instanceId: string): Window | undefined {
    return getServerState().findHostWindow(instanceId)
  }

  forgetWindow(instanceId: string): void {
    getServerState().forgetHostWindow(instanceId)
  }

  createTitle(detail: DirectoryApp): string {
    const existingPanels = getClientState().getPanels()
    const usedNumbers = new Set(
      existingPanels
        .filter(p => p.title.startsWith(detail.title))
        .map(p => {
          const match = /\d+$/.exec(p.title)
          return match ? parseInt(match[0]) : 0
        }),
    )

    let number = 1
    while (usedNumbers.has(number)) {
      number++
    }

    return `${detail.title} ${number.toString()}`
  }

  /**
   * Ask the Desktop Agent to open `detail`, hosted as the user asked.
   *
   * The agent owns instance ids now, so the panel or window is created by the
   * host's `SailAppLauncher` callback once the id exists — this method only
   * records the hosting choice and reports the result back to the caller.
   */
  async open(detail: DirectoryApp, destination?: AppHosting): Promise<AppOpenDetails> {
    if (detail.type !== "web") {
      throw new Error("Unsupported app type: " + detail.type)
    }

    const sailManifest = detail.hostManifests?.sail ?? {}
    const manifestForceNewWindow =
      (typeof sailManifest === "string" ? {} : sailManifest).forceNewWindow ?? false
    // oxlint-disable-next-line typescript/no-unnecessary-condition -- FDC3 App Directory JSON: hostManifests.sail is Record<string, unknown>
    const forceNewWindow = resolveSailForceNewWindow(manifestForceNewWindow === true)
    const hosting: AppHosting =
      (forceNewWindow ? AppHosting.Tab : undefined) ?? destination ?? AppHosting.Frame
    const instanceTitle = this.createTitle(detail)
    const channel = hosting === AppHosting.Tab ? null : getClientState().getActiveTab().id

    const instanceId = await getServerState().registerAppLaunch(
      detail.appId,
      hosting,
      channel,
      instanceTitle,
    )

    return { instanceId, channel, instanceTitle }
  }
}
