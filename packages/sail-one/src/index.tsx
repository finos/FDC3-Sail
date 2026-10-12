import "./styles/global.css"
import { Frame } from "./frame/frame"
import { createRoot } from "react-dom/client"
import {
  AppHosting,
  bindClientStateToHost,
  getAppState,
  getClientState,
  getServerState,
  hostParams,
} from "./state"
import { useSailState } from "./state/use-sail-state"

function App() {
  useSailState()
  return <Frame cs={getClientState()} />
}

async function bootstrap(): Promise<void> {
  // Platform storage is async, so hydrate before first render — otherwise the
  // Desktop Agent would be seeded with default channels and then immediately
  // restarted when the persisted set arrived.
  await getClientState().load()

  const container = document.getElementById("app")
  const root = createRoot(container!)
  root.render(<App />)

  bindClientStateToHost()
  await getServerState().registerDesktopAgent(getClientState().createArgs())

  const { deepLinkAppId } = hostParams()
  if (deepLinkAppId) {
    await openDeepLinkedApp(deepLinkAppId)
  }
}

/** `?appId=`: open one app in a frame on start-up; the conformance run reads the flags it sets. */
async function openDeepLinkedApp(appId: string): Promise<void> {
  const flags = window as Window & {
    __sailConformanceReady?: string
    __sailConformanceOpenError?: string
  }
  try {
    const app = getServerState()
      .getKnownApps()
      .find(known => known.appId === appId)
    if (!app) {
      throw new Error(`App not found in directory: ${appId}`)
    }
    // A reload restores the saved panels; don't open the app a second time.
    if (
      getClientState()
        .getPanels()
        .some(panel => panel.appId === appId)
    ) {
      flags.__sailConformanceReady = appId
      return
    }
    const instanceId = await getServerState().registerAppLaunch(
      appId,
      AppHosting.Frame,
      getClientState().getActiveTab().id,
      getAppState().createTitle(app),
    )
    console.log(`[Sail] Deep-linked open ${appId}`, { instanceId })
    flags.__sailConformanceReady = appId
  } catch (error) {
    console.error(`[Sail] Deep-link open failed for ${appId}`, error)
    flags.__sailConformanceOpenError = error instanceof Error ? error.message : String(error)
  }
}

void bootstrap().catch((e: unknown) => {
  console.error("Failed to start Sail", e)
})
