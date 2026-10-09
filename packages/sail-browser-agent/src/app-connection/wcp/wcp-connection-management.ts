import type { AppConnectionMetadata, AppConnectionOptions } from "./wcp-types"
import type { Logger } from "../../logging/logger"
import type { AppConnectionRegistry } from "../app-connection-registry"
import type { EmitFunction } from "../app-connection-events"
import type { WebConnectionProtocolMessage } from "@finos/fdc3-schema/dist/generated/api/BrowserTypes"

function resolveRoutingInstanceId(context: AppConnectionContext, instanceId: string): string {
  return context.handshakeRouting.get(instanceId) ?? instanceId
}

function linkHandshakeRouting(
  context: AppConnectionContext,
  handshakeRoutingId: string,
  instanceId: string,
): void {
  if (handshakeRoutingId === instanceId) {
    return
  }
  context.handshakeRouting.set(handshakeRoutingId, instanceId)
}

function clearHandshakeRoutingForInstance(context: AppConnectionContext, instanceId: string): void {
  for (const [tempId, validatedId] of context.handshakeRouting) {
    if (tempId === instanceId || validatedId === instanceId) {
      context.handshakeRouting.delete(tempId)
    }
  }
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
  /** temp handshake id → validated instanceId */
  handshakeRouting: Map<string, string>
  emit: EmitFunction
  logger: Logger
  /** Full instance teardown — FDC3 state cleanup plus connection registry prune. */
  onInstanceTeardown?: (instanceId: string) => void
}

/**
 * Handle WCP6Goodbye message from app
 * Implements delayed disconnect with grace period for reconnection
 */
export function handleWCP6Goodbye(context: AppConnectionContext, instanceId: string): void {
  context.logger.debug(`Received WCP6Goodbye from app instance ${instanceId}`)

  const existingTimeout = context.pendingDisconnects.get(instanceId)
  if (existingTimeout) {
    clearTimeout(existingTimeout)
  }

  const connection = context.connectionRegistry.connections.get(instanceId)
  const timeoutId = setTimeout(() => {
    context.pendingDisconnects.delete(instanceId)

    if (connection) {
      context.recentlyDisconnected.set(instanceId, {
        metadata: connection,
        disconnectedAt: Date.now(),
      })
    }

    const resolvedInstanceId = resolveRoutingInstanceId(context, instanceId)
    if (context.onInstanceTeardown) {
      context.onInstanceTeardown(resolvedInstanceId)
    } else {
      disconnectApp(context, resolvedInstanceId)
    }
  }, context.options.disconnectGracePeriod)

  context.pendingDisconnects.set(instanceId, timeoutId)
}

/**
 * Host-initiated disconnect: send WCP6Goodbye then tear down.
 */
export function disconnectAppByInstanceId(context: AppConnectionContext, instanceId: string): void {
  const connection = context.connectionRegistry.connections.get(instanceId)
  const transport = context.connectionRegistry.messagePortTransports.get(instanceId)

  if (connection && transport?.isConnected()) {
    const goodbye = {
      type: "WCP6Goodbye",
      meta: {
        connectionAttemptUuid: connection.connectionAttemptUuid,
        timestamp: new Date(),
      },
      payload: {},
    } as unknown as WebConnectionProtocolMessage
    try {
      transport.send(goodbye)
    } catch (error) {
      context.logger.warn(`Failed to send WCP6Goodbye to ${instanceId}`, { error })
    }
  }

  if (context.onInstanceTeardown) {
    context.onInstanceTeardown(instanceId)
  } else {
    disconnectApp(context, instanceId)
  }
}

export function cleanupStaleDisconnects(context: AppConnectionContext): void {
  const now = Date.now()
  const maxAge = 5 * 60 * 1000
  for (const [instanceId, entry] of context.recentlyDisconnected) {
    if (now - entry.disconnectedAt > maxAge) {
      context.recentlyDisconnected.delete(instanceId)
    }
  }
}

/**
 * Disconnect an app connection and clean up registry entries.
 */
export function disconnectApp(context: AppConnectionContext, instanceId: string): void {
  cancelPendingDisconnect(context, instanceId)

  const appTransport = context.connectionRegistry.messagePortTransports.get(instanceId)
  if (appTransport) {
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

  if (cancelPendingDisconnect(context, actualInstanceId)) {
    context.logger.debug(
      `Cancelled pending disconnect for instance ${actualInstanceId} - reconnection detected`,
    )
  }

  if (cancelPendingDisconnect(context, tempInstanceId)) {
    context.logger.debug(
      `Cancelled pending disconnect for temp instance ${tempInstanceId} - superseded by successful handshake`,
    )
  }
  context.recentlyDisconnected.delete(tempInstanceId)
  context.recentlyDisconnected.delete(actualInstanceId)

  metadata.instanceId = actualInstanceId
  metadata.appId = appId

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

  context.connectionRegistry.connections.delete(tempInstanceId)
  context.connectionRegistry.connections.set(actualInstanceId, metadata)

  const appTransport = context.connectionRegistry.messagePortTransports.get(tempInstanceId)
  if (appTransport) {
    context.connectionRegistry.messagePortTransports.delete(tempInstanceId)
    context.connectionRegistry.messagePortTransports.set(actualInstanceId, appTransport)
    context.connectionRegistry.transportToInstanceId.set(appTransport, actualInstanceId)
  } else {
    context.logger.warn(
      `Transport not found for temp instanceId ${tempInstanceId} during metadata update`,
    )
  }

  linkHandshakeRouting(context, tempInstanceId, actualInstanceId)
  context.emit("appConnected", metadata)
}

export function getConnections(context: AppConnectionContext): AppConnectionMetadata[] {
  return Array.from(context.connectionRegistry.connections.values())
}

export function getConnection(
  context: AppConnectionContext,
  instanceId: string,
): AppConnectionMetadata | undefined {
  return context.connectionRegistry.connections.get(instanceId)
}
