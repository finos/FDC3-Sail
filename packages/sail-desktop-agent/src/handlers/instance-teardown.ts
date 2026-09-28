import { resolvePendingIntent, removeListenersForInstance, removeInstance } from "../state/mutators"
import { type DACPHandlerParams } from "./types"
import * as eventHandlers from "./events/handlers"
import * as privateChannelHandlers from "./private-channels/handlers"
import { resolveLinkedInstanceId } from "../state/selectors/wcp-handshake-routing"
import { clearHandshakeRoutingIdsForInstance } from "../state/mutators/wcp-handshake-routing"
import { getActiveHeartbeatInstanceIds, stopHeartbeat } from "./heartbeat/runtime"
import {
  clearPendingOpenWithContextForInstance,
  clearPendingOpenWithContextForSourceInstance,
} from "./utils/open-with-context"
import { pruneInstanceIdentity } from "../app-connection/wcp/instance-identity-registry"
import type { AgentState } from "../state/types"
import { clearPendingIntentTimeouts } from "./intents/intent-pending-timeout-registry"
import { sendTerminalPendingIntentResponse } from "./intents/intent-delivery-helpers"

/**
 * WCP4 validation runs under a temp connection id while heartbeat and instance state
 * use the validated WCP5 instanceId (see wcp-handlers startHeartbeat call).
 */
function resolveTeardownInstanceId(params: DACPHandlerParams): string {
  const { instanceId, getState } = params
  const state = getState()

  if (state.heartbeats[instanceId] || getActiveHeartbeatInstanceIds().includes(instanceId)) {
    return instanceId
  }

  if (instanceId.startsWith("temp-")) {
    const linkedInstanceId = resolveLinkedInstanceId(state, instanceId)
    if (
      linkedInstanceId &&
      (state.heartbeats[linkedInstanceId] ||
        getActiveHeartbeatInstanceIds().includes(linkedInstanceId) ||
        state.instances[linkedInstanceId])
    ) {
      return linkedInstanceId
    }
  }

  return instanceId
}

function instanceHasTeardownWork(state: AgentState, instanceId: string): boolean {
  if (state.instances[instanceId] || state.heartbeats[instanceId]) {
    return true
  }

  if (getActiveHeartbeatInstanceIds().includes(instanceId)) {
    return true
  }

  if ((state.open.pendingWithContext[instanceId]?.length ?? 0) > 0) {
    return true
  }

  return Object.values(state.intents.pending).some(
    pending => pending.targetInstanceId === instanceId || pending.sourceInstanceId === instanceId,
  )
}

/**
 * Tear down DACP-owned agent state for a disconnected instance (WCP6Goodbye, heartbeat
 * timeout, or `disconnectInstance`). Peer entry point to `routeDACPMessage` — not a router
 * helper. Kept in a leaf module so callers do not import the DACP router `index.ts`,
 * avoiding circular module graphs.
 */
export function cleanupInstanceDacpState(params: DACPHandlerParams): void {
  const resolvedParams = {
    ...params,
    instanceId: resolveTeardownInstanceId(params),
  }
  const { instanceId, getState, setState, logger } = resolvedParams

  if (!instanceHasTeardownWork(getState(), instanceId)) {
    logger.debug("Skipping teardown for already-removed instance", { instanceId })
    return
  }

  logger.info("Tearing down DACP state for instance", { instanceId })

  // Cancel any pending intents involving this instance (as source or target)
  const state = getState()
  const pendingIntents = Object.values(state.intents.pending).filter(
    p => p.targetInstanceId === instanceId || p.sourceInstanceId === instanceId,
  )
  pendingIntents.forEach(pending => {
    clearPendingIntentTimeouts(pending.requestId)
    // Terminal raiseIntentResultResponse so IntentResolution.getResult() settles (same as
    // open-with-context AppTimeout on disconnect). Only when the *target* is the one going away:
    // the response is addressed to the raiser, so if the raiser is itself the disconnecting
    // instance there is nobody left to settle and this would post to a closed instance.
    if (pending.sourceInstanceId !== instanceId) {
      try {
        // Stage matters: `clearPendingIntentTimeouts` above has just cancelled the delivery
        // timer, so if the intent was never delivered this is the only thing left that can
        // settle the raiser — and what it is waiting on is `raiseIntentResponse`, not the
        // result. `sendTerminalPendingIntentResponse` picks the stage off `pending.delivered`.
        sendTerminalPendingIntentResponse(
          resolvedParams,
          pending,
          "Target instance disconnected before the intent completed",
        )
      } catch (error) {
        logger.warn("Failed to send pending-intent timeout response on disconnect", {
          requestId: pending.requestId,
          sourceInstanceId: pending.sourceInstanceId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
    setState(state => resolvePendingIntent(state, pending.requestId))
  })
  if (pendingIntents.length > 0) {
    logger.info(`Cancelled ${pendingIntents.length} pending intents for disconnected instance`, {
      instanceId,
    })
  }

  clearPendingOpenWithContextForInstance(instanceId, resolvedParams)
  clearPendingOpenWithContextForSourceInstance(instanceId, resolvedParams)

  // Remove event listeners
  eventHandlers.removeInstanceEventListeners(instanceId, setState)
  logger.info("Removed event listeners for disconnected instance", { instanceId })

  // Remove private channels
  const removedPrivateChannels =
    privateChannelHandlers.removeInstancePrivateChannels(resolvedParams)
  if (removedPrivateChannels > 0) {
    logger.info(`Removed ${removedPrivateChannels} private channels for disconnected instance`, {
      instanceId,
    })
  }

  // Stop heartbeat
  stopHeartbeat(instanceId, setState)

  setState(state => clearHandshakeRoutingIdsForInstance(state, instanceId))

  // Remove intent listeners
  setState(state => removeListenersForInstance(state, instanceId))

  // Remove instance from state
  setState(state => removeInstance(state, instanceId))

  pruneInstanceIdentity(resolvedParams.responses.connectionOwner, instanceId)

  logger.info("DACP instance teardown completed", { instanceId })
}

/**
 * Unified instance teardown when available; DACP-only state cleanup for headless ingest tests.
 */
export function teardownInstance(params: DACPHandlerParams, instanceId: string): void {
  if (params.disconnectInstance) {
    params.disconnectInstance(instanceId)
    return
  }
  cleanupInstanceDacpState({ ...params, instanceId })
}
