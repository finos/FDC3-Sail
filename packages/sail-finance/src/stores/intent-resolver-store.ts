import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import type {
  IntentHandler as HostIntentHandler,
  IntentResolutionRequest,
  SailDesktopAgent,
} from "@finos/sail-desktop-agent"

/**
 * Handler option for intent resolution
 */
export interface IntentHandler {
  instanceId?: string
  appId: string
  appName?: string
  appIcon?: string
  isRunning: boolean
}

/**
 * State for the intent resolver dialog
 */
interface IntentResolverState {
  /** Whether the resolver dialog is open */
  isOpen: boolean
  /** Unique request ID for correlation */
  requestId: string | null
  /** Intent name being raised */
  intentName: string | null
  /** Context being passed with intent */
  context: unknown
  /** Available handlers to choose from */
  handlers: IntentHandler[]
}

/**
 * Actions for the intent resolver store
 */
interface IntentResolverActions {
  /** Select a handler and resolve the intent */
  selectHandler: (handler: IntentHandler) => void
  /** Cancel the resolution (user closed dialog) */
  cancel: () => void
}

export interface IntentResolverStore extends IntentResolverState, IntentResolverActions {}

/**
 * Create the intent resolver store wired through grouped host controllers.
 */
export const createIntentResolverStore = (agent: SailDesktopAgent) => {
  const store = create<IntentResolverStore>()(
    immer((set, get) => ({
      isOpen: false,
      requestId: null,
      intentName: null,
      context: null,
      handlers: [],

      selectHandler: (handler: IntentHandler) => {
        const { requestId, intentName } = get()
        if (!requestId || !intentName) {
          console.warn("[IntentResolverStore] Cannot select handler: no active request")
          return
        }

        console.log(
          `[IntentResolverStore] User selected handler: ${handler.appName || handler.appId}`,
        )

        agent.intentResolver.select(requestId, {
          app: {
            appId: handler.appId,
            name: handler.appName ?? handler.appId,
          },
          intent: { name: intentName, displayName: intentName },
          instanceId: handler.instanceId,
          isRunning: handler.isRunning,
        })

        set(state => {
          state.isOpen = false
          state.requestId = null
          state.intentName = null
          state.context = null
          state.handlers = []
        })
      },

      cancel: () => {
        const { requestId } = get()
        if (!requestId) {
          console.warn("[IntentResolverStore] Cannot cancel: no active request")
          return
        }

        console.log("[IntentResolverStore] User cancelled intent resolution")
        agent.intentResolver.cancel(requestId)

        set(state => {
          state.isOpen = false
          state.requestId = null
          state.intentName = null
          state.context = null
          state.handlers = []
        })
      },
    })),
  )

  const { intentResolver, apps } = agent

  intentResolver.onRequest((request: IntentResolutionRequest) => {
    console.log("[IntentResolverStore] Intent resolution needed:", request.intent)

    const intentName = request.intent

    const validHandlers = request.handlers
      .filter((handler: HostIntentHandler) => {
        if (handler.instanceId) {
          const connection = apps.getConnection(handler.instanceId)
          if (!connection) {
            console.warn(
              `[IntentResolverStore] Filtering out invalid handler: ${handler.app.appId} (instance ${handler.instanceId} not connected)`,
            )
            return false
          }
        }
        return true
      })
      .map((handler: HostIntentHandler) => ({
        instanceId: handler.instanceId,
        appId: handler.app.appId,
        appName: handler.app.name ?? handler.app.title,
        appIcon: handler.app.icons?.[0]?.src,
        isRunning: handler.isRunning,
      }))

    if (validHandlers.length !== request.handlers.length) {
      console.warn(
        `[IntentResolverStore] Filtered ${request.handlers.length - validHandlers.length} invalid handler(s), ${validHandlers.length} valid remaining`,
      )
    }

    store.setState(state => {
      state.isOpen = true
      state.requestId = request.requestId
      state.intentName = intentName
      state.context = request.context
      state.handlers = validHandlers
    })
  })

  apps.onDisconnect((instanceId: string) => {
    store.setState(state => {
      if (state.isOpen && state.handlers.length > 0) {
        const beforeCount = state.handlers.length
        state.handlers = state.handlers.filter(handler => handler.instanceId !== instanceId)
        if (state.handlers.length !== beforeCount) {
          console.log(
            `[IntentResolverStore] Removed ${beforeCount - state.handlers.length} handler(s) for disconnected instance ${instanceId}`,
          )
        }
      }
    })
  })

  return store
}
