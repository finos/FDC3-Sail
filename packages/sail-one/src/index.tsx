import "./styles/global.css"
import { Frame } from "./frame/frame"
import { createRoot } from "react-dom/client"
import {
  NEW_WINDOW,
  type SailApp,
  type SailPlatformCatalog,
  type SailUserSession,
  type SailWebApp,
} from "@finos/sail-platform"
import {
  createBrowserSessionHostHooks,
  createPopupCloseWatcher,
} from "@finos/sail-platform-browser"
import { resolveDeepLinkAppId } from "@finos/sail-env"
import {
  AppHosting,
  getAppState,
  getCatalog,
  getClientState,
  getSession,
  setPlatformSession,
} from "./state"
import { HiddenExtensionHost } from "./extensions/HiddenExtensionHost"
import { getPlatformCaps, loadExtensionCores, loadExtensionUIs } from "./state/extensions-runtime"
import { useSailState } from "./state/use-sail-state"

function App() {
  useSailState()
  return (
    <>
      <HiddenExtensionHost />
      <Frame cs={getClientState()} />
    </>
  )
}

function isWebApp(app: SailApp | undefined): app is SailWebApp {
  return typeof (app as SailWebApp | undefined)?.url === "string"
}

function catalogAppUrl(app: SailApp | undefined): string | undefined {
  return isWebApp(app) && app.url.length > 0 ? app.url : undefined
}

async function openCatalogApp(
  session: SailUserSession,
  catalog: SailPlatformCatalog,
  appId: string,
): Promise<string> {
  const app = catalog.list().find(entry => entry.appId === appId)
  const url = catalogAppUrl(app)
  if (!url) {
    throw new Error(`App ${appId} has no URL in the platform catalog`)
  }
  return session.openApp({
    appId,
    url,
    title: app?.title ?? appId,
    icon: app?.icon,
  })
}

async function bootstrap(): Promise<void> {
  // Platform storage is async — hydrate shell chrome before first render.
  await getClientState().load()
  await loadExtensionCores()
  const caps = getPlatformCaps()

  let session: SailUserSession | null = null
  let forceFrameForNextLaunch = false

  const popupWatcher = createPopupCloseWatcher({
    onPopupClosed: instanceId => {
      session?.unregisterHostWindow(instanceId)
    },
  })

  const sessionHost = createBrowserSessionHostHooks({
    mountApp: async (request, instanceId) => {
      const apps = caps.catalog.list()
      const app =
        apps.find(a => a.appId === request.appId) ??
        (request.url
          ? ({
              appId: request.appId,
              title: request.title ?? request.appId,
              icon: request.icon,
              url: request.url,
            } satisfies SailWebApp)
          : ({
              appId: request.appId,
              title: request.title ?? request.appId,
              icon: request.icon,
            } satisfies SailApp))

      const url = request.url ?? catalogAppUrl(app)
      if (!url) {
        throw new Error(`App ${request.appId} has no URL`)
      }

      const preferFrame = forceFrameForNextLaunch
      forceFrameForNextLaunch = false
      const pending = getAppState().takePendingHosting(request.appId)
      const openAsTab =
        !preferFrame &&
        (pending?.hosting === AppHosting.Tab ||
          (pending == null && isWebApp(app) && app.location === NEW_WINDOW))

      if (openAsTab) {
        const win = window.open(url, instanceId)
        if (!win) {
          throw new Error(`Failed to open window for ${request.appId}`)
        }
        session?.registerHostWindow(win, instanceId)
        popupWatcher.registerPopup(instanceId, win)
        return
      }

      const detail: SailWebApp = isWebApp(app) ? app : { ...app, url }
      const title = pending?.instanceTitle ?? getAppState().createTitle(detail)
      getClientState().newPanel(detail, instanceId, title)
    },
    unmountApp: async instanceId => {
      if (popupWatcher.hasPopup(instanceId)) {
        popupWatcher.closePopupForInstance(instanceId)
        session?.unregisterHostWindow(instanceId)
        return
      }
      await getClientState().removePanel(instanceId)
      session?.unregisterHostWindow(instanceId)
    },
  })

  session = caps.sessions.createSession({
    host: sessionHost,
  })
  setPlatformSession(session, caps.catalog)
  await loadExtensionUIs()

  // Allow async directory contributors a beat to warm the catalog.
  if (caps.catalog.list().length === 0) {
    await new Promise<void>(resolve => setTimeout(resolve, 250))
  }

  const container = document.getElementById("app")
  createRoot(container!).render(<App />)

  const deepLinkAppId = resolveDeepLinkAppId(window.location.search)
  if (deepLinkAppId) {
    forceFrameForNextLaunch = true
    try {
      const opened = await openCatalogApp(getSession(), getCatalog(), deepLinkAppId)
      console.log("[Sail] Deep-linked open %s", deepLinkAppId, opened)
      ;(window as Window & { __sailConformanceReady?: string }).__sailConformanceReady =
        deepLinkAppId
    } catch (e: unknown) {
      console.error("[Sail] Deep-link open failed for %s", deepLinkAppId, e)
      ;(window as Window & { __sailConformanceOpenError?: string }).__sailConformanceOpenError =
        e instanceof Error ? e.message : String(e)
    }
  }
}

void bootstrap().catch((e: unknown) => {
  console.error("Failed to start Sail", e)
})
