import { NEW_WINDOW, type SailApp, type SailWebApp } from "@finos/sail-platform"
import { AppHosting } from "./app-hosting"
import { getCatalog, getClientState, getSession } from "./index"
import type { SailOneUserSession } from "./sail-one-user-session"

export { AppHosting } from "./app-hosting"
export type { PendingHosting } from "./app-hosting"

export type AppOpenDetails = {
  instanceId: string
  channel: string | null
  instanceTitle: string
}

export type AppState = {
  registerAppWindow(window: Window, instanceId: string): void
  getInstanceIdForWindow(window: Window): string | undefined
  findWindow(instanceId: string): Window | undefined
  forgetWindow(instanceId: string): void
  createTitle(detail: SailApp): string
  open(detail: SailApp, destination?: AppHosting): Promise<AppOpenDetails>
}

function isWebApp(app: SailApp): app is SailWebApp {
  return typeof (app as SailWebApp).url === "string"
}

function catalogUrl(app: SailApp | undefined): string | undefined {
  const url = (app as SailWebApp | undefined)?.url
  return typeof url === "string" && url.length > 0 ? url : undefined
}

function asOneSession(): SailOneUserSession {
  return getSession() as SailOneUserSession
}

export class DefaultAppState implements AppState {
  registerAppWindow(windowRef: Window, instanceId: string): void {
    getSession().registerHostWindow(windowRef, instanceId)
  }

  getInstanceIdForWindow(windowRef: Window): string | undefined {
    return getSession().getInstanceIdForHostWindow(windowRef)
  }

  findWindow(instanceId: string): Window | undefined {
    return getSession().getHostWindow(instanceId)
  }

  forgetWindow(instanceId: string): void {
    getSession().unregisterHostWindow(instanceId)
  }

  createTitle(detail: SailApp): string {
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

  async open(detail: SailApp, destination?: AppHosting): Promise<AppOpenDetails> {
    if (!isWebApp(detail)) {
      throw new Error(`App ${detail.appId} has no URL`)
    }

    const hosting: AppHosting =
      destination ?? (detail.location === NEW_WINDOW ? AppHosting.Tab : AppHosting.Frame)
    const instanceTitle = this.createTitle(detail)
    const channel = hosting === AppHosting.Tab ? null : getClientState().getActiveTab().id

    const catalogApp = getCatalog().list().find(entry => entry.appId === detail.appId) ?? detail
    const url = catalogUrl(catalogApp) ?? detail.url
    if (!url) {
      throw new Error(`App ${detail.appId} has no URL in the platform catalog`)
    }

    const session = asOneSession()
    session.queueHosting(detail.appId, hosting, instanceTitle)
    try {
      const instanceId = await session.openApp({
        appId: detail.appId,
        url,
        title: catalogApp.title ?? detail.appId,
        icon: catalogApp.icon,
      })
      return { instanceId, channel, instanceTitle }
    } catch (e) {
      session.takePendingHosting(detail.appId)
      throw e
    }
  }
}
