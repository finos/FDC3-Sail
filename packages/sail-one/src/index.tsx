import "./styles/global.css"
import { Frame } from "./frame/frame"
import { createRoot } from "react-dom/client"
import { resolveDeepLinkAppId, resolveSoleFdc3Directory } from "@finos/sail-env"
import { AppHosting, getClientState, getServerState, bindClientStateToHost } from "./state"
import { useSailState } from "./state/use-sail-state"

function App() {
  useSailState()
  return <Frame cs={getClientState()} />
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

async function ensureSoleFdc3Directory(): Promise<void> {
  const url = resolveSoleFdc3Directory({
    search: window.location.search,
    viteDirectoryUrl: import.meta.env.VITE_FDC3_DIRECTORY_URL,
  })
  if (!url) {
    return
  }
  // Sole directory so findIntent counts match the injected AppD only.
  await getClientState().setDirectories([{ label: "App Directory", url, active: true }])
}

async function waitForDirectoryApp(appId: string, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const apps = getServerState().getKnownApps()
    if (apps.some(a => a.appId === appId)) {
      return
    }
    await sleep(250)
  }
  throw new Error(`Timed out waiting for directory app ${appId}`)
}

async function openDeepLinkApp(appId: string): Promise<void> {
  await waitForDirectoryApp(appId)
  // Conformance1 declares forceNewWindow; Playwright scrapes the host page iframe.
  const instanceId = await getServerState().registerAppLaunch(
    appId,
    AppHosting.Frame,
    getClientState().getActiveTab().id,
    appId,
  )
  console.log(`[Sail] Deep-linked open ${appId}`, { instanceId })
  ;(window as Window & { __sailConformanceReady?: string }).__sailConformanceReady = appId
}

async function bootstrap(): Promise<void> {
  // Platform storage is async, so hydrate before first render — otherwise the
  // Desktop Agent would be seeded with default channels and then immediately
  // restarted when the persisted set arrived.
  await getClientState().load()
  await ensureSoleFdc3Directory()

  const container = document.getElementById("app")
  const root = createRoot(container!)
  root.render(<App />)

  bindClientStateToHost()
  await getServerState().registerDesktopAgent(getClientState().createArgs())

  const deepLinkAppId = resolveDeepLinkAppId(window.location.search)
  if (deepLinkAppId) {
    try {
      await openDeepLinkApp(deepLinkAppId)
    } catch (e: unknown) {
      console.error(`[Sail] Deep-link open failed for ${deepLinkAppId}`, e)
      ;(window as Window & { __sailConformanceOpenError?: string }).__sailConformanceOpenError =
        e instanceof Error ? e.message : String(e)
    }
  }
}

void bootstrap().catch((e: unknown) => {
  console.error("Failed to start Sail", e)
})
