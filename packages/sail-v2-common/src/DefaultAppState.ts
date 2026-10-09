import { AppOpenDetails, AppState } from "./AppState"
import { AppHosting } from "./app-hosting"
import { DirectoryApp, WebAppDetails, State, Fdc3ApiVersion } from "@finos/sail-headless-agent"
import {
  normalizeIdentityUrl,
  normalizeUrlPathname,
  urlsReferToSameApp,
} from "./normalizeIdentityUrl"
import {
  APP_HELLO,
  AppHelloArgs,
  FDC3_APP_EVENT,
  FDC3_DA_EVENT,
  SailAppStateArgs,
} from "./message-types"
import { WebConnectionProtocol1Hello } from "@finos/fdc3-schema-v3/dist/generated/api/BrowserTypes"
import { ServerState } from "./ServerState"
import { ClientState } from "./ClientState"
import { io } from "socket.io-client"

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
      identityPathname = normalizeUrlPathname(new URL(identityUrl).pathname)
    } catch {
      identityPathname = strippedIdentityUrl
    }

    const applications: DirectoryApp[] = this.cs?.getKnownApps() ?? []
    const firstMatchingApp = applications.find((x) => {
      const d = x.details as WebAppDetails
      if (!d?.url) {
        return false
      }
      if (
        urlsReferToSameApp(d.url, identityUrl, window.location.origin) ||
        (d.url.startsWith("/") && identityUrl.endsWith(d.url))
      ) {
        return true
      }
      // Path-only match when AppD host differs from identity host (CDN vs Vite).
      try {
        const dirPath = normalizeUrlPathname(
          new URL(d.url, window.location.origin).pathname,
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
      return urlsReferToSameApp(p.url, identityUrl, window.location.origin)
    })
    if (panel) {
      return applications.find((a) => a.appId === panel.appId)
    }
    return undefined
  }

  /**
   * Resolve instance id for a WCP hello source window. Prefers the registration
   * map, then iframe[name], then panel URL / sole-panel fallbacks (cross-origin
   * hosted 3.0 Conformance1 often loses Map identity after GridStack moves).
   */
  private resolveInstanceIdForHello(
    source: Window,
    identityUrl: string,
  ): Promise<string | undefined> {
    return this.getInstanceIdForWindow(source).then((fromMap) => {
      if (fromMap) {
        return fromMap
      }

      for (const iframe of Array.from(document.querySelectorAll("iframe"))) {
        try {
          if (iframe.contentWindow === source && iframe.name) {
            this.registerAppWindow(source, iframe.name)
            return iframe.name
          }
        } catch {
          // Cross-origin name/contentWindow access can throw in edge cases.
        }
      }

      const panels = this.cs?.getPanels() ?? []
      const byUrl = panels.find(
        (p) =>
          p.url &&
          urlsReferToSameApp(p.url, identityUrl, window.location.origin),
      )
      if (byUrl) {
        this.registerAppWindow(source, byUrl.panelId)
        return byUrl.panelId
      }

      if (panels.length === 1) {
        this.registerAppWindow(source, panels[0].panelId)
        return panels[0].panelId
      }

      return undefined
    })
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

          const identityUrl = data.payload.identityUrl
          let appD = this.getDirectoryAppForUrl(identityUrl)
          this.resolveInstanceIdForHello(source, identityUrl)
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
              const appId =
                appD?.appId ??
                (instanceId
                  ? this.cs?.getPanels().find((p) => p.panelId === instanceId)
                      ?.appId
                  : undefined)
              if (appId && instanceId) {
                // Direct WCP3 (browser-agent style). Avoid WCP2LoadUrl → embed.html:
                // HTTPS hosted apps (fdc3.finos.org) cannot load HTTP localhost
                // embed iframes (mixed content), which left Conformance1 Pending.
                this.completeDirectWcpHandshake(
                  source,
                  origin,
                  data,
                  instanceId,
                  appId,
                  cs.getUserSessionID(),
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

  /**
   * Parent-side WCP1→WCP3 handshake with MessageChannel + socket.io bridge.
   * Same role as `embed.html`, but safe for cross-origin HTTPS apps.
   */
  private completeDirectWcpHandshake(
    source: Window,
    origin: string,
    data: WebConnectionProtocol1Hello,
    instanceId: string,
    appId: string,
    userSessionId: string,
  ): void {
    const channel = new MessageChannel()
    const socket = io()
    const clientVersion = data.payload?.fdc3Version
    const fdc3Version =
      clientVersion && clientVersion.startsWith("3") ? "3.0" : "2.2"

    socket.on("connect", () => {
      void (async () => {
        try {
          socket.on(FDC3_DA_EVENT, (msg: unknown) => {
            channel.port2.postMessage(msg)
          })
          channel.port2.onmessage = (event: MessageEvent) => {
            socket.emit(FDC3_APP_EVENT, event.data, instanceId)
          }

          const hosting: unknown = await socket.emitWithAck(APP_HELLO, {
            userSessionId,
            instanceId,
            appId,
            fdc3Version,
          } as AppHelloArgs)

          if (hosting == null) {
            console.error(
              "[Sail v2] APP_HELLO rejected for direct WCP handshake",
              { instanceId, appId },
            )
            socket.close()
            return
          }

          const suffix = `?desktopAgentId=${userSessionId}&instanceId=${instanceId}`
          const isTab = hosting === AppHosting.Tab || hosting === "Tab"
          const intentResolverUrl = isTab
            ? `${window.location.origin}/html/ui/intent-resolver.html${suffix}`
            : undefined
          const channelSelectorUrl = isTab
            ? `${window.location.origin}/html/ui/channel-selector.html${suffix}`
            : undefined

          source.postMessage(
            {
              type: "WCP3Handshake",
              meta: {
                connectionAttemptUuid: data.meta.connectionAttemptUuid,
                timestamp: new Date(),
              },
              payload: {
                fdc3Version,
                intentResolverUrl,
                channelSelectorUrl,
              },
            },
            origin,
            [channel.port1],
          )
          console.log("[Sail v2] Direct WCP3Handshake sent", {
            instanceId,
            appId,
            fdc3Version,
            origin,
          })
        } catch (e: unknown) {
          console.error("[Sail v2] Direct WCP handshake failed", e)
          socket.close()
        }
      })()
    })
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
