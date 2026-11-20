import { useMemo, type ReactNode } from "react"
import type { SailPlatformCatalog, SailUserSession } from "@finos/sail-platform"

import { createAppDirectoryStore } from "../stores/app-directory-store"
import { createConnectionStore } from "../stores/connection-store"
import { SailSessionContext } from "./sail-session-context-value"

interface SailSessionProviderProps {
  session: SailUserSession
  catalog: SailPlatformCatalog
  children: ReactNode
}

export function SailSessionProvider({ session, catalog, children }: SailSessionProviderProps) {
  const appDirectoryStore = useMemo(() => createAppDirectoryStore(catalog), [catalog])
  const connectionStore = useMemo(() => createConnectionStore(), [])

  const value = useMemo(
    () => ({
      session,
      catalog,
      useAppDirectoryStore: appDirectoryStore,
      useConnectionStore: connectionStore,
    }),
    [session, catalog, appDirectoryStore, connectionStore],
  )

  return <SailSessionContext.Provider value={value}>{children}</SailSessionContext.Provider>
}
