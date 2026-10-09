import "./styles/global.css"
import { Frame } from "./frame/frame"
import { createRoot } from "react-dom/client"
import {
  isConformanceAutoResolve,
  resolveConformanceDirectoryUrl,
  resolveConformanceFdc3Version,
  resolveDeepLinkAppId,
  shouldUseConformanceOnlyAppD,
} from "@finos/sail-browser-agent"
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

async function ensureConformanceDirectory(): Promise<void> {
  // Only inject for CI / deep-link / explicit directory override — not every interactive session.
  const wantsConformance =
    Boolean(import.meta.env.VITE_CONFORMANCE_DIRECTORY_URL) ||
    isConformanceAutoResolve(import.meta.env.VITE_CONFORMANCE_AUTO_RESOLVE) ||
    Boolean(resolveDeepLinkAppId(window.location.search))
  if (!wantsConformance) {
    return
  }

  const url = resolveConformanceDirectoryUrl({
    version: resolveConformanceFdc3Version(import.meta.env.VITE_FDC3_VERSION),
    override: import.meta.env.VITE_CONFORMANCE_DIRECTORY_URL,
  })
  const conformanceOnly = shouldUseConformanceOnlyAppD({
    autoResolve: import.meta.env.VITE_CONFORMANCE_AUTO_RESOLVE,
    directoryOverride: import.meta.env.VITE_CONFORMANCE_DIRECTORY_URL,
  })

  if (conformanceOnly) {
    // CI must not keep FINOS / other catalogs active — findIntent counts inflate otherwise.
    await getClientState().setDirectories([{ label: "FDC3 Conformance", url, active: true }])
    return
  }

  const dirs = getClientState().getDirectories()
  if (dirs.some(d => d.url === url)) {
    // Ensure active for CI even if a persisted session had it off.
    const existing = dirs.find(d => d.url === url)
    if (existing && !existing.active) {
      await getClientState().setDirectories(
        dirs.map(d => (d.url === url ? { ...d, active: true } : d)),
      )
    }
    return
  }
  await getClientState().setDirectories([...dirs, { label: "FDC3 Conformance", url, active: true }])
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
  await ensureConformanceDirectory()

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
