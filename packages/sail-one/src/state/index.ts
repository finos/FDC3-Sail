import type { SailPlatformCatalog, SailUserSession } from "@finos/sail-platform"
import { type AppState, DefaultAppState } from "./default-app-state"
import { type ClientState, PlatformClientState } from "./client-state"

export { AppHosting } from "./default-app-state"
export type { AppPanel, ClientState, TabDetail } from "./client-state"
export type { AppState, AppOpenDetails, PendingHosting } from "./default-app-state"

let theSession: SailUserSession | null = null
let theCatalog: SailPlatformCatalog | null = null
let theClientState: PlatformClientState | null = null
let theAppState: DefaultAppState | null = null

function ensureClientAndApp(): void {
  theAppState = theAppState ?? new DefaultAppState()
  theClientState = theClientState ?? new PlatformClientState()
}

export function setPlatformSession(
  session: SailUserSession,
  catalog: SailPlatformCatalog,
): void {
  theSession = session
  theCatalog = catalog
}

export function getSession(): SailUserSession {
  if (!theSession) {
    throw new Error("Sail session not ready — bootstrap the platform session first")
  }
  return theSession
}

export function getCatalog(): SailPlatformCatalog {
  if (!theCatalog) {
    throw new Error("Sail catalog not ready — bootstrap the platform session first")
  }
  return theCatalog
}

export function getAppState(): AppState {
  ensureClientAndApp()
  return theAppState!
}

export function getClientState(): ClientState {
  ensureClientAndApp()
  return theClientState!
}
