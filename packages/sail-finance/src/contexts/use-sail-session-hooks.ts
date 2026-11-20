import { useContext } from "react"
import type { SailPlatformCatalog, SailUserSession } from "@finos/sail-platform"

import { SailSessionContext } from "./sail-session-context-value"
import type { AppDirectoryStore } from "../stores/app-directory-store"
import type { ConnectionStore } from "../stores/connection-store"

export function useSailSession(): SailUserSession {
  const context = useContext(SailSessionContext)
  if (!context) {
    throw new Error("useSailSession must be used within SailSessionProvider")
  }
  return context.session
}

export function useSailCatalog(): SailPlatformCatalog {
  const context = useContext(SailSessionContext)
  if (!context) {
    throw new Error("useSailCatalog must be used within SailSessionProvider")
  }
  return context.catalog
}

export function useAppDirectoryStore(): AppDirectoryStore
export function useAppDirectoryStore<T>(selector: (state: AppDirectoryStore) => T): T
export function useAppDirectoryStore<T>(selector?: (state: AppDirectoryStore) => T) {
  const context = useContext(SailSessionContext)
  if (!context) {
    throw new Error("useAppDirectoryStore must be used within SailSessionProvider")
  }
  return selector
    ? context.useAppDirectoryStore(selector)
    : context.useAppDirectoryStore()
}

export function useConnectionStore(): ConnectionStore
export function useConnectionStore<T>(selector: (state: ConnectionStore) => T): T
export function useConnectionStore<T>(selector?: (state: ConnectionStore) => T) {
  const context = useContext(SailSessionContext)
  if (!context) {
    throw new Error("useConnectionStore must be used within SailSessionProvider")
  }
  return selector ? context.useConnectionStore(selector) : context.useConnectionStore()
}
