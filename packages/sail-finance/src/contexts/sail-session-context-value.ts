import { createContext } from "react"
import type { SailPlatformCatalog, SailUserSession } from "@finos/sail-platform"

import type { createAppDirectoryStore } from "../stores/app-directory-store"
import type { createConnectionStore } from "../stores/connection-store"

export interface SailSessionContextValue {
  session: SailUserSession
  catalog: SailPlatformCatalog
  useAppDirectoryStore: ReturnType<typeof createAppDirectoryStore>
  useConnectionStore: ReturnType<typeof createConnectionStore>
}

export const SailSessionContext = createContext<SailSessionContextValue | undefined>(undefined)
