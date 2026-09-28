import { useMemo, type ReactNode } from "react"
import type { SailDesktopAgent } from "@finos/sail-desktop-agent"

import { createAppDirectoryStore } from "../stores/app-directory-store"
import { createConnectionStore } from "../stores/connection-store"
import { createIntentResolverStore } from "../stores/intent-resolver-store"

import { SailDesktopAgentContext } from "./sail-desktop-agent-context-value"

interface SailDesktopAgentProviderProps {
  agent: SailDesktopAgent
  children: ReactNode
}

export function SailDesktopAgentProvider({ agent, children }: SailDesktopAgentProviderProps) {
  const appDirectoryStore = useMemo(() => createAppDirectoryStore(agent), [agent])
  const connectionStore = useMemo(() => createConnectionStore(agent), [agent])
  const intentResolverStore = useMemo(() => createIntentResolverStore(agent), [agent])

  const value = useMemo(
    () => ({
      agent,
      useAppDirectoryStore: appDirectoryStore,
      useConnectionStore: connectionStore,
      useIntentResolverStore: intentResolverStore,
    }),
    [agent, appDirectoryStore, connectionStore, intentResolverStore],
  )

  return (
    <SailDesktopAgentContext.Provider value={value}>{children}</SailDesktopAgentContext.Provider>
  )
}
