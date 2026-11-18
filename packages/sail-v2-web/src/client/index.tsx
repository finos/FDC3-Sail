import { Frame } from "./frame/frame"
import { createRoot } from "react-dom/client"
import { AppHosting, getClientState, getAppState, getServerState } from "../common"
import type { DirectoryApp } from "@finos/sail-headless-agent"
import { resolveDeepLinkAppId, resolveNoSplash } from "@finos/sail-env"
import { HiddenExtensionHost } from "./extensions/HiddenExtensionHost"
import { loadExtensionUIs } from "./extensions-runtime"

function renderApp() {
  root.render(
    <>
      <HiddenExtensionHost />
      <Frame cs={getClientState()} as={getAppState()} />
    </>,
  )
}

const container = document.getElementById("app")
const root = createRoot(container!)
renderApp()

getClientState().addStateChangeCallback(() => {
  renderApp()
})

getAppState().addStateChangeCallback(() => {
  renderApp()
})

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

async function waitForDirectoryApp(appId: string, timeoutMs = 60_000): Promise<DirectoryApp> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const apps = await getServerState().getApplications()
      const match = apps.find(a => a.appId === appId)
      if (match) {
        return match
      }
    } catch {
      // Socket may not be ready yet.
    }
    await sleep(250)
  }
  throw new Error(`Timed out waiting for directory app ${appId}`)
}

async function openDeepLinkApp(appId: string): Promise<void> {
  const detail = await waitForDirectoryApp(appId)
  // Explicit Frame destination must win over Conformance1 forceNewWindow for Playwright.
  const opened = await getAppState().open(detail, AppHosting.Frame)
  console.log("[Sail v2] Deep-linked open", appId, opened)
  ;(window as Window & { __sailConformanceReady?: string }).__sailConformanceReady = appId
}

async function bootstrap(): Promise<void> {
  await loadExtensionUIs()

  if (resolveNoSplash(window.location.search)) {
    await getClientState().setSplashScreenVisible(false)
  }

  getAppState().init(getServerState(), getClientState())
  await getServerState().registerDesktopAgent(getClientState().createArgs())

  const deepLinkAppId = resolveDeepLinkAppId(window.location.search)
  if (deepLinkAppId) {
    try {
      await openDeepLinkApp(deepLinkAppId)
    } catch (e: unknown) {
      console.error("[Sail v2] Deep-link open failed for", deepLinkAppId, e)
      ;(window as Window & { __sailConformanceOpenError?: string }).__sailConformanceOpenError =
        e instanceof Error ? e.message : String(e)
    }
  }
}

void bootstrap().catch((e: unknown) => {
  console.error("Failed to start Sail v2", e)
})
