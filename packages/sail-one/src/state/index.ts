import type { SailPlatformCatalog, SailUserSession } from "@finos/sail-platform"
import { type AppState, DefaultAppState } from "./default-app-state"
import type { ClientState } from "./client-state"
import type { SailOneUserSession } from "./sail-one-user-session"

export { AppHosting } from "./app-hosting"
export type { AppPanel, ClientState, TabDetail } from "./client-state"
export type { AppState, AppOpenDetails, PendingHosting } from "./default-app-state"
export { SailOneUserSession } from "./sail-one-user-session"
export type { SailOneUserSessionOptions } from "./sail-one-user-session"

let theSession: SailOneUserSession | null = null
let theCatalog: SailPlatformCatalog | null = null
let theAppState: DefaultAppState | null = null

export function setPlatformSession(
  session: SailOneUserSession,
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

export function getSailOneSession(): SailOneUserSession {
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
  theAppState = theAppState ?? new DefaultAppState()
  return theAppState
}

export function getClientState(): ClientState {
  if (!theSession) {
    throw new Error("Sail session not ready — bootstrap the platform session first")
  }
  return theSession.clientState
}
