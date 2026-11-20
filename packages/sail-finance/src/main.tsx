import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import {
  type SailApp,
  type SailPlatformCatalog,
  type SailUserSession,
  type SailWebApp,
} from "@finos/sail-platform"
import { createPopupCloseWatcher } from "@finos/sail-platform-browser"
import { resolveDeepLinkAppId } from "@finos/sail-env"

import { bootstrapDockviewPopoutShell, isDockviewPopoutShell } from "./utils/dockview-popout"

import "./index.css"
import App from "./App"
import { getPlatformCaps, loadExtensionUIs, loadRegistry } from "./state/extensions-runtime"
import { SailFinanceUserSession } from "./session/sail-finance-user-session"

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
  const app = (await catalog.list()).find(entry => entry.appId === appId)
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

if (isDockviewPopoutShell()) {
  bootstrapDockviewPopoutShell()
} else {
  console.log("[Sail] Initializing host shell")

  const deepLinkAppId = resolveDeepLinkAppId(window.location.search)

  let session: SailFinanceUserSession | null = null
  let catalog: SailPlatformCatalog | null = null

  const popupWatcher = createPopupCloseWatcher({
    onPopupClosed: instanceId => {
      console.log(`[Sail] Popup closed for ${instanceId}`)
      session?.unregisterHostWindow(instanceId)
    },
  })

  void (async () => {
    await loadRegistry()
    const caps = getPlatformCaps()
    catalog = caps.catalog

    session = new SailFinanceUserSession({
      catalog,
      popupWatcher,
    })
    session.load()
    caps.sessions.createSession(session)
    await loadExtensionUIs()

    console.log("[Sail] Host session ready", {
      catalogApps: (await catalog.list()).length,
      sessionApps: session.getSnapshot().apps.length,
    })

    if (deepLinkAppId) {
      session.forceNextOpenAsFrame()
      void openCatalogApp(session, catalog, deepLinkAppId)
        .then(id => {
          console.log("[Sail] Deep-linked open %s", deepLinkAppId, id)
          ;(window as Window & { __sailConformanceReady?: string }).__sailConformanceReady =
            deepLinkAppId
        })
        .catch((err: unknown) => {
          console.error("[Sail] Deep-link open failed for %s", deepLinkAppId, err)
          ;(window as Window & { __sailConformanceOpenError?: string }).__sailConformanceOpenError =
            err instanceof Error ? err.message : String(err)
        })
    }

    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <App session={session} catalog={catalog} />
      </StrictMode>,
    )
  })()
}
