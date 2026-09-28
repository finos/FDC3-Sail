import type { AppConnectionMetadata, AppConnectionOptions } from "./wcp-types"
import type { Logger } from "../../logging/logger"
import type { AgentState, StateSetter } from "../../state/types"
import type { AppConnectionRegistry } from "../app-connection-registry"
import type { EmitFunction } from "../app-connection-events"
import type { WebConnectionProtocolMessage } from "@finos/fdc3-schema/dist/generated/api/BrowserTypes"
import {
  linkHandshakeRoutingId,
  clearHandshakeRoutingIdsForInstance,
} from "../../state/mutators/wcp-handshake-routing"
import { resolveInstanceId } from "../../state/selectors/wcp-handshake-routing"

function resolveRoutingInstanceId(context: AppConnectionContext, instanceId: string): string {
  if (!context.getAgentState) {
    return instanceId
  }
  return resolveInstanceId(context.getAgentState(), instanceId)
}

function linkHandshakeRouting(
  context: AppConnectionContext,
  handshakeRoutingId: string,
  instanceId: string,
): void {
  if (handshakeRoutingId === instanceId || !context.setAgentState) {
    return
  }
  context.setAgentState(state => linkHandshakeRoutingId(state, handshakeRoutingId, instanceId))
}

function clearHandshakeRoutingForInstance(context: AppConnectionContext, instanceId: string): void {
  if (!context.setAgentState) {
    return
  }
  context.setAgentState(state => clearHandshakeRoutingIdsForInstance(state, instanceId))
}

function cancelPendingDisconnect(context: AppConnectionContext, instanceId: string): boolean {
  const pendingDisconnect = context.pendingDisconnects.get(instanceId)
  if (!pendingDisconnect) {
    return false
  }
  clearTimeout(pendingDisconnect)
  context.pendingDisconnects.delete(instanceId)
  return true
}

export interface AppConnectionContext {
  connectionRegistry: AppConnectionRegistry
  options: Required<AppConnectionOptions>
  pendingDisconnects: Map<string, ReturnType<typeof setTimeout>>
  recentlyDisconnected: Map<string, { metadata: AppConnectionMetadata; disconnectedAt: number }>
  emit: EmitFunction
  logger: Logger
  getAgentState?: () => AgentState
  setAgentState?: StateSetter
  /** Full instance teardown — FDC3 state cleanup plus connection registry prune. */
  onInstanceTeardown?: (instanceId: string) => void
}

/**
 * Handle WCP6Goodbye message from app
 * Implements delayed disconnect with grace period for reconnection
 */
export function handleWCP6Goodbye(context: AppConnectionContext, instanceId: string): void {
  context.logger.debug(`Received WCP6Goodbye from app instance ${instanceId}`)

  // NOTE: WCP6Goodbye is sent by FDC3 get-agent library on pagehide events with persisted=false.
  // This includes false positives like tab moves, navigation, etc. where the app is still active.
  //
  // Current approach: Delay disconnect to allow reconnection within grace period.
  // This handles false-positive pagehide events from tab moves/navigation.
  //
  // Alternative approach (TODO): Consider using heartbeat-based detection instead.
  // Heartbeat already runs (30s interval, 60s timeout) and can detect actual disconnections.
  // Trade-offs:
  //   - Heartbeat: More accurate (only disconnects on actual failure), but slower (up to 60s delay)
  //   - Delayed WCP6Goodbye: Faster response (configurable), but requires grace period for false positives
  //   - Hybrid: Could ignore WCP6Goodbye and rely solely on heartbeat timeout for cleanup

  // Cancel any existing pending disconnect
  const existingTimeout = context.pendingDisconnects.get(instanceId)
  if (existingTimeout) {
    clearTimeout(existingTimeout)
  }

  const connection = context.connectionRegistry.connections.get(instanceId)
  const timeoutId = setTimeout(() => {
    context.pendingDisconnects.delete(instanceId)

    // Snapshot for grace-period bookkeeping only. A later reconnect must keep the
    // new handshake's connection fields — do not copy these onto the new metadata.
    if (connection) {
      context.recentlyDisconnected.set(instanceId, {
        metadata: connection,
        disconnectedAt: Date.now(),
      })
    }

    const resolvedInstanceId = resolveRoutingInstanceId(context, instanceId)
    if (context.onInstanceTeardown) {
      context.onInstanceTeardown(resolvedInstanceId)
      return
    }
    disconnectApp(context, resolvedInstanceId)
  }, context.options.disconnectGracePeriod)

  context.pendingDisconnects.set(instanceId, timeoutId)
}

/**
 * Clean up stale entries from recentlyDisconnected Map
 * Called periodically to prevent memory leaks
 */
export function cleanupStaleDisconnects(context: AppConnectionContext): void {
  const fiveSecondsAgo = Date.now() - 5000
  for (const [id, entry] of context.recentlyDisconnected.entries()) {
    if (entry.disconnectedAt < fiveSecondsAgo) {
      context.recentlyDisconnected.delete(id)
    }
  }
}

/**
 * Disconnect an app by instanceId, sending WCP6Goodbye first
 * This is the public method to use when explicitly disconnecting an app
 *
 * @param instanceId - The instance ID of the app to disconnect
 */
export function disconnectAppByInstanceId(context: AppConnectionContext, instanceId: string): void {
  const resolvedInstanceId = resolveRoutingInstanceId(context, instanceId)

  const pendingDisconnect = context.pendingDisconnects.get(resolvedInstanceId)
  if (pendingDisconnect) {
    clearTimeout(pendingDisconnect)
    context.pendingDisconnects.delete(resolvedInstanceId)
  }

  const appTransport = context.connectionRegistry.messagePortTransports.get(resolvedInstanceId)
  if (appTransport && appTransport.isConnected()) {
    // Send WCP6Goodbye message to the app before disconnecting
    try {
      const goodbyeMessage: WebConnectionProtocolMessage = {
        type: "WCP6Goodbye",
        meta: {
          timestamp: new Date(),
        },
      }
      appTransport.send(goodbyeMessage)
      context.logger.debug(`Sent WCP6Goodbye to instance ${resolvedInstanceId}`)
    } catch (error) {
      context.logger.warn(
        `[BrowserAppConnection] Failed to send WCP6Goodbye to instance ${resolvedInstanceId}:`,
        error,
      )
      // Continue with disconnection even if goodbye fails
    }
  }

  if (context.onInstanceTeardown) {
    context.onInstanceTeardown(resolvedInstanceId)
    return
  }
  disconnectApp(context, resolvedInstanceId)
}

/**
 * Disconnect an app and clean up resources
 * This is the internal method that performs the actual cleanup
 */
export function disconnectApp(context: AppConnectionContext, instanceId: string): void {
  // Cancel any armed WCP6 grace timer for this id so a stale timeout cannot fire
  // onInstanceTeardown/disconnectApp against a session relaunched on the same
  // instanceId inside the grace window (see disconnectInstance -> pruneAppConnection).
  cancelPendingDisconnect(context, instanceId)

  const appTransport = context.connectionRegistry.messagePortTransports.get(instanceId)
  if (appTransport) {
    // Unregister before disconnect() so onDisconnect does not re-enter disconnectApp
    context.connectionRegistry.messagePortTransports.delete(instanceId)
    context.connectionRegistry.transportToInstanceId.delete(appTransport)
    appTransport.disconnect()
  }

  context.connectionRegistry.connections.delete(instanceId)
  clearHandshakeRoutingForInstance(context, instanceId)
  context.emit("appDisconnected", instanceId)
}

/**
 * Update connection metadata after WCP4 validation
 * Called by integration code when Desktop Agent validates app identity
 *
 * This method migrates the connection from temporary instanceId (temp-{uuid})
 * to the actual instanceId assigned by the Desktop Agent's AppInstanceRegistry.
 * Both the connections Map and messagePortTransports Map are updated to use
 * the new key, ensuring message routing continues to work correctly.
 */
export function updateConnectionMetadata(
  context: AppConnectionContext,
  tempInstanceId: string,
  actualInstanceId: string,
  appId: string,
): void {
  const metadata = context.connectionRegistry.connections.get(tempInstanceId)
  if (!metadata) {
    context.logger.warn(
      `Cannot update connection metadata: temp instanceId ${tempInstanceId} not found`,
    )
    return
  }

  // Cancel any pending disconnect for the actual instanceId (reconnection scenario)
  if (cancelPendingDisconnect(context, actualInstanceId)) {
    context.logger.debug(
      `Cancelled pending disconnect for instance ${actualInstanceId} - reconnection detected`,
    )
  }

  // A WCP6Goodbye that arrived before this handshake completed arms
  // pendingDisconnects[tempInstanceId] (bridgeAppPort still keys off the temp id at that point).
  // Left uncancelled, that grace timer would fire, resolve forward through the temp -> validated
  // handshake-routing link this function establishes below, and tear down the connection whose
  // handshake just succeeded.
  if (cancelPendingDisconnect(context, tempInstanceId)) {
    context.logger.debug(
      `Cancelled pending disconnect for temp instance ${tempInstanceId} - superseded by successful handshake`,
    )
  }
  // A recentlyDisconnected entry keyed by a temp handshake id is meaningless — nothing
  // reconnects to a temp id. Drop both temp and validated snapshots; reconnect metadata
  // comes from this handshake (identity continuity lives in agent/identity state).
  context.recentlyDisconnected.delete(tempInstanceId)
  context.recentlyDisconnected.delete(actualInstanceId)

  // Update metadata with validated info from Desktop Agent
  metadata.instanceId = actualInstanceId
  metadata.appId = appId

  // If the validated id already has a live (or leftover) connection, retire it before claiming the key.
  // Unregister the reverse map BEFORE disconnect — otherwise onDisconnect can tear down the
  // connection we are about to install under that same id.
  const existingValidated = context.connectionRegistry.connections.get(actualInstanceId)
  if (existingValidated && existingValidated !== metadata) {
    const displacedTransport =
      context.connectionRegistry.messagePortTransports.get(actualInstanceId)
    if (displacedTransport) {
      context.connectionRegistry.messagePortTransports.delete(actualInstanceId)
      context.connectionRegistry.transportToInstanceId.delete(displacedTransport)
      displacedTransport.disconnect()
    }
    context.connectionRegistry.connections.delete(actualInstanceId)
  }

  // Migrate connection to actual instanceId key
  // This ensures future lookups use the validated instanceId
  context.connectionRegistry.connections.delete(tempInstanceId)
  context.connectionRegistry.connections.set(actualInstanceId, metadata)

  // Migrate transport reference to actual instanceId key
  const appTransport = context.connectionRegistry.messagePortTransports.get(tempInstanceId)
  if (appTransport) {
    context.connectionRegistry.messagePortTransports.delete(tempInstanceId)
    context.connectionRegistry.messagePortTransports.set(actualInstanceId, appTransport)
    // Update reverse lookup so bridgeAppPort uses the actual instanceId
    context.connectionRegistry.transportToInstanceId.set(appTransport, actualInstanceId)
  } else {
    context.logger.warn(
      `Transport not found for temp instanceId ${tempInstanceId} during metadata update`,
    )
  }

  linkHandshakeRouting(context, tempInstanceId, actualInstanceId)

  // Fire connected event now that validation is complete
  context.emit("appConnected", metadata)
}

/**
 * Get all active connections
 */
export function getConnections(context: AppConnectionContext): AppConnectionMetadata[] {
  return Array.from(context.connectionRegistry.connections.values())
}

/**
 * Get connection metadata for a specific instance
 */
export function getConnection(
  context: AppConnectionContext,
  instanceId: string,
): AppConnectionMetadata | undefined {
  return context.connectionRegistry.connections.get(instanceId)
}
