import { useContext } from "react"
import { useStore } from "zustand"
import type { SailDesktopAgent } from "@finos/sail-desktop-agent"

import type { AppDirectoryStore } from "../stores/app-directory-store"
import type { ConnectionStore } from "../stores/connection-store"
import type { IntentResolverStore } from "../stores/intent-resolver-store"

import { SailDesktopAgentContext } from "./sail-desktop-agent-context-value"

export function useSailDesktopAgent(): SailDesktopAgent {
  const context = useContext(SailDesktopAgentContext)
  if (!context) {
    throw new Error("useSailDesktopAgent must be used within SailDesktopAgentProvider")
  }
  return context.agent
}

export function useAppDirectoryStore(): AppDirectoryStore {
  const context = useContext(SailDesktopAgentContext)
  if (!context) {
    throw new Error("useAppDirectoryStore must be used within SailDesktopAgentProvider")
  }
  return context.useAppDirectoryStore()
}

export function useConnectionStore(): ConnectionStore
export function useConnectionStore<T>(selector: (state: ConnectionStore) => T): T
export function useConnectionStore<T>(
  selector?: (state: ConnectionStore) => T,
): ConnectionStore | T {
  const context = useContext(SailDesktopAgentContext)
  if (!context) {
    throw new Error("useConnectionStore must be used within SailDesktopAgentProvider")
  }
  const store = context.useConnectionStore
  if (selector) {
    return useStore(store, selector)
  }
  return useStore(store)
}

export function useIntentResolverStore(): IntentResolverStore {
  const context = useContext(SailDesktopAgentContext)
  if (!context) {
    throw new Error("useIntentResolverStore must be used within SailDesktopAgentProvider")
  }
  return context.useIntentResolverStore()
}
