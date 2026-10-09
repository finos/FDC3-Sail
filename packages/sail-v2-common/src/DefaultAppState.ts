import { AppOpenDetails, AppState } from "./AppState"
import { AppHosting } from "./app-hosting"
import { DirectoryApp, WebAppDetails, State, Fdc3ApiVersion } from "@finos/sail-headless-agent"
import { normalizeIdentityUrl } from "./normalizeIdentityUrl"
import { SailAppStateArgs } from "./message-types"
import { WebConnectionProtocol1Hello } from "@finos/fdc3-schema-v3/dist/generated/api/BrowserTypes"
import { ServerState } from "./ServerState"
import { ClientState } from "./ClientState"

export class DefaultAppState implements AppState {
  windowInformation = new Map<Window, string>()
  /** Tab/popup windows polled for `window.closed` (2.2 mock window.close()). */
  private popupWindows = new Map<string, Window>()
  private popupPollId: ReturnType<typeof setInterval> | undefined
  states: SailAppStateArgs = []
  callbacks: (() => void)[] = []
  cs: ClientState | null = null
  ss: ServerState | null = null

  getAppState(instanceId: string): State | undefined {
    return this.states.find((x) => x.instanceId == instanceId)?.state
  }

  getFdc3Version(instanceId: string): Fdc3ApiVersion | undefined {
    return this.states.find((x) => x.instanceId == instanceId)?.fdc3Version
  }

  setAppState(state: SailAppStateArgs): void {
    this.states = state
    this.callbacks.forEach((x) => {
      x()
    })
  }

  getServerState(): ServerState {
    if (this.ss == null) {
      throw new Error("Server state not set")
    }
    return this.ss
  }

  getClientState(): ClientState {
    if (this.cs == null) {
      throw new Error("Client state not set")
    }
    return this.cs
  }

  addStateChangeCallback(cb: () => void): void {
    this.callbacks.push(cb)
  }

  getDirectoryAppForUrl(identityUrl: string): DirectoryApp | undefined {
    const strippedIdentityUrl = normalizeIdentityUrl(identityUrl)
    let identityPathname = ""
    try {
      identityPathname = new URL(identityUrl).pathname.replace(/\/+$/, "")
    } catch {
      identityPathname = strippedIdentityUrl
    }

    const applications: DirectoryApp[] = this.cs?.getKnownApps() ?? []
    const firstMatchingApp = applications.find((x) => {
      const d = x.details as WebAppDetails
      if (!d?.url) {
        return false
      }
      const dirUrl = normalizeIdentityUrl(d.url)
      if (
        dirUrl === strippedIdentityUrl ||
        d.url === identityUrl ||
        (d.url.startsWith("/") && identityUrl.endsWith(d.url))
      ) {
        return true
      }
      // Absolute AppD URLs vs identityUrl on a different host (Vite vs static CDN).
      try {
        const dirPath = new URL(d.url, window.location.origin).pathname.replace(
          /\/+$/,
          "",
        )
        return dirPath.length > 1 && dirPath === identityPathname
      } catch {
        return false
      }
    })
    if (firstMatchingApp) {
      return firstMatchingApp
    }

    // Fallback: panel already registered for this identity URL (deep-link Frame).
    const panel = (this.cs?.getPanels() ?? []).find((p) => {
      if (!p.url) {
        return false
      }
      const panelUrl = normalizeIdentityUrl(p.url)
      if (panelUrl === strippedIdentityUrl || p.url === identityUrl) {
        return true
      }
      try {
        const panelPath = new URL(p.url, window.location.origin).pathname.replace(
          /\/+$/,
          "",
        )
        return panelPath.length > 1 && panelPath === identityPathname
      } catch {
        return false
      }
    })
    if (panel) {
      return applications.find((a) => a.appId === panel.appId)
    }
    return undefined
  }

  init(ss: ServerState, cs: ClientState): void {
    if (this.cs == null) {
      this.cs = cs
      this.ss = ss
      // sets up postMessage listener for new applications joining
      // nosemgrep: javascript.browser.security.insufficient-postmessage-origin-validation.insufficient-postmessage-origin-validation
      window.addEventListener("message", (e: MessageEvent) => {
        const event = e

        if ((event.data as { type: string }).type == "WCP1Hello") {
          const data = event.data as WebConnectionProtocol1Hello
          const source = event.source as Window
          const origin = event.origin

          console.log("Received: " + JSON.stringify(event.data))

          let appD = this.getDirectoryAppForUrl(data.payload.identityUrl)
          this.getInstanceIdForWindow(source)
            .then((instanceId) => {
              // Last-resort: resolve appId from the panel registered for this instance.
              if (!appD && instanceId) {
                const panel = this.cs?.getPanels().find((p) => p.panelId === instanceId)
                if (panel) {
                  appD = (this.cs?.getKnownApps() ?? []).find(
                    (a) => a.appId === panel.appId,
                  )
                }
              }
              const appId = appD?.appId
              if (appD && instanceId) {
                source.postMessage(
                  {
                    type: "WCP2LoadUrl",
                    meta: {
                      connectionAttemptUuid: data.meta.connectionAttemptUuid,
                      timestamp: new Date(),
                    },
                    payload: {
                      iframeUrl:
                        window.location.origin +
                        `/html/embed.html?connectionAttemptUuid=${data.meta.connectionAttemptUuid}&desktopAgentId=${cs.getUserSessionID()}&instanceId=${instanceId}&appId=${appId ?? "unknown"}`,
                    },
                  },
                  origin,
                )
              } else {
                console.error(
                  "Illegal handshake attempt",
                  JSON.stringify(data, null, 2),
                  appD,
                  instanceId,
                )
              }
            })
            .catch((e: unknown) => {
              console.error("Error getting directory app for url", e)
            })
        }
      })
    }
  }

  registerAppWindow(window: Window, instanceId: string): void {
    this.windowInformation.set(window, instanceId)
  }

  private startPopupPolling(): void {
    if (this.popupPollId !== undefined || this.popupWindows.size === 0) {
      return
    }
    this.popupPollId = setInterval(() => {
      for (const [instanceId, win] of this.popupWindows) {
        if (win.closed) {
          this.popupWindows.delete(instanceId)
          this.windowInformation.delete(win)
          void this.getServerState()
            .reportAppWindowClosed(instanceId)
            .catch((e: unknown) => {
              console.warn(
                `[Sail v2] reportAppWindowClosed failed for ${instanceId}`,
                e,
              )
            })
        }
      }
      if (this.popupWindows.size === 0 && this.popupPollId !== undefined) {
        clearInterval(this.popupPollId)
        this.popupPollId = undefined
      }
    }, 100)
  }

  private registerPopup(instanceId: string, win: Window): void {
    this.popupWindows.set(instanceId, win)
    this.startPopupPolling()
  }

  private unregisterPopup(instanceId: string): void {
    this.popupWindows.delete(instanceId)
    if (this.popupWindows.size === 0 && this.popupPollId !== undefined) {
      clearInterval(this.popupPollId)
      this.popupPollId = undefined
    }
  }

  async closeApp(instanceId: string, hosting: AppHosting): Promise<void> {
    if (hosting === AppHosting.Frame) {
      await this.getClientState().removePanel(instanceId)
      this.forgetWindow(instanceId)
      return
    }

    if (hosting === AppHosting.Tab) {
      const win = this.findWindow(instanceId)
      this.unregisterPopup(instanceId)
      this.forgetWindow(instanceId)
      if (win && !win.closed) {
        win.close()
      }
    }
  }

  private findWindow(instanceId: string): Window | undefined {
    for (const [win, id] of this.windowInformation.entries()) {
      if (id === instanceId) {
        return win
      }
    }
    return undefined
  }

  private forgetWindow(instanceId: string): void {
    const win = this.findWindow(instanceId)
    if (win) {
      this.windowInformation.delete(win)
    }
  }

  /**
   * Since sometimes it takes the app windows a little while to load, here
   */
  async getInstanceIdForWindow(window: Window): Promise<string | undefined> {
    return new Promise<string | undefined>((resolve) => {
      const endTime = new Date().getTime() + 10000

      const retry = () => {
        const instanceId = this.windowInformation.get(window)
        if (instanceId) {
          resolve(instanceId)
        } else {
          if (new Date().getTime() > endTime) {
            resolve(undefined)
          } else {
            setTimeout(retry, 200)
          }
        }
      }

      retry()
    })
  }

  /**
   * Creates a unique title for the app by finding the first unused number
   * for the given app title
   */
  createTitle(detail: DirectoryApp): string {
    // Get all existing panels
    const existingPanels = this.cs?.getPanels() ?? []

    // Get all numbers currently in use for this app title
    const usedNumbers = new Set(
      existingPanels
        .filter((p) => p.title.startsWith(detail.title))
        .map((p) => {
          const match = /\d+$/.exec(p.title)
          return match ? parseInt(match[0]) : 0
        }),
    )

    // Find first unused number starting from 1
    let number = 1
    while (usedNumbers.has(number)) {
      number++
    }

    return `${detail.title} ${number.toString()}`
  }

  /**
   * Opens either a new panel or a browser tab for the application to go in,
   * returns the instance id for the new thing.
   */
  open(
    detail: DirectoryApp,
    destination?: AppHosting,
  ): Promise<AppOpenDetails> {
    return new Promise((resolve) => {
      const sailManifest = detail.hostManifests?.sail ?? {}
      const forceNewWindow =
        (typeof sailManifest === "string" ? {} : sailManifest).forceNewWindow ??
        false
      // Explicit destination (e.g. deep-link Frame for Playwright) wins over manifest.
      const hosting: AppHosting =
        destination ?? (forceNewWindow ? AppHosting.Tab : AppHosting.Frame)
      const instanceTitle = this.createTitle(detail)
      if (hosting == AppHosting.Tab) {
        this.getServerState()
          .registerAppLaunch(detail.appId, hosting, null, instanceTitle)
          .then((instanceId) => {
            // Use instanceId as window.name so closePopupForInstance / mocks can match.
            const w = window.open(
              (detail.details as WebAppDetails).url,
              instanceId,
            )
            if (w) {
              this.registerAppWindow(w, instanceId)
              this.registerPopup(instanceId, w)
              resolve({ instanceId, channel: null, instanceTitle })
            } else {
              throw new Error("Failed to open window")
            }
          })
          .catch((e: unknown) => {
            console.error("Error registering app launch", e)
          })
      } else {
        const channel = this.getClientState().getActiveTab().id
        this.getServerState()
          .registerAppLaunch(detail.appId, hosting, channel, instanceTitle)
          .then((instanceId) => {
            this.getClientState().newPanel(detail, instanceId, instanceTitle)
            resolve({ instanceId, channel, instanceTitle })
          })
          .catch((e: unknown) => {
            console.error("Error registering app launch", e)
          })
      }
    })
  }
}
