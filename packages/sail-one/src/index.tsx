import "./styles/global.css"
import { Frame } from "./frame/frame"
import { createRoot } from "react-dom/client"
import {
  type SailApp,
  type SailPlatformCatalog,
  type SailUserSession,
  type SailWebApp,
} from "@finos/sail-platform"
import { createPopupCloseWatcher } from "@finos/sail-platform-browser"
import { resolveDeepLinkAppId } from "@finos/sail-env"
import {
  getCatalog,
  getClientState,
  getSailOneSession,
  getSession,
  SailOneUserSession,
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
  await loadExtensionCores()
  const caps = getPlatformCaps()

  const popupWatcher = createPopupCloseWatcher({
    onPopupClosed: instanceId => {
      getSailOneSession().unregisterHostWindow(instanceId)
    },
  })

  const session = new SailOneUserSession({
    catalog: caps.catalog,
    popupWatcher,
  })
  await session.load()
  caps.sessions.createSession(session)
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
    getSailOneSession().forceNextOpenAsFrame()
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
