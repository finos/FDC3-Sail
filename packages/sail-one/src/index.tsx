import "./styles/global.css"
import { Frame } from "./frame/frame"
import { createRoot } from "react-dom/client"
import {
  isConformanceAutoResolve,
  resolveConformanceDirectoryUrl,
  resolveConformanceFdc3Version,
  resolveDeepLinkAppId,
} from "@finos/sail-browser-agent"
import { getClientState, getServerState, bindClientStateToHost } from "./state"
import { useSailState } from "./state/use-sail-state"

function App() {
  useSailState()
  return <Frame cs={getClientState()} />
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

async function openDeepLinkApp(appId: string): Promise<void> {
  const instanceId = await getServerState().openDirectoryApp(appId)
  console.log(`[Sail] Deep-linked open ${appId}`, { instanceId })
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
    }
  }
}

void bootstrap().catch((e: unknown) => {
  console.error("Failed to start Sail", e)
})
