import { Frame } from "./frame/frame"
import { createRoot } from "react-dom/client"
import { AppHosting, getClientState, getAppState, getServerState } from "@finos/fdc3-sail-common"
import type { DirectoryApp } from "@finos/sail-headless-agent"
import {
  resolveDeepLinkAppId,
  resolveNoSplash,
  resolveSoleFdc3Directory,
} from "@finos/sail-env"

const container = document.getElementById("app")
const root = createRoot(container!)
root.render(<Frame cs={getClientState()} as={getAppState()} />)

getClientState().addStateChangeCallback(() => {
  root.render(<Frame cs={getClientState()} as={getAppState()} />)
})

getAppState().addStateChangeCallback(() => {
  root.render(<Frame cs={getClientState()} as={getAppState()} />)
})

async function ensureSoleFdc3Directory(): Promise<void> {
  const url = resolveSoleFdc3Directory({
    search: window.location.search,
    viteDirectoryUrl: import.meta.env.VITE_FDC3_DIRECTORY_URL,
  })
  if (!url) {
    return
  }
  await getClientState().setDirectories([{ label: "App Directory", url, active: true }])
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

async function waitForDirectoryApp(
  appId: string,
  timeoutMs = 60_000,
): Promise<DirectoryApp> {
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
  console.log(`[Sail v2] Deep-linked open ${appId}`, opened)
  ;(window as Window & { __sailConformanceReady?: string }).__sailConformanceReady = appId
}

async function bootstrap(): Promise<void> {
  await ensureSoleFdc3Directory()

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
      console.error(`[Sail v2] Deep-link open failed for ${deepLinkAppId}`, e)
      ;(window as Window & { __sailConformanceOpenError?: string }).__sailConformanceOpenError =
        e instanceof Error ? e.message : String(e)
    }
  }
}

void bootstrap().catch((e: unknown) => {
  console.error("Failed to start Sail v2", e)
})
