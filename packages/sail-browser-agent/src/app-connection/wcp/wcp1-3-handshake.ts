import { MessagePortTransport } from "../message-port"
import { bridgeAppPort } from "./wcp-message-routing"
import type { WCPRoutingContext } from "./wcp-message-routing"
import type {
  AppConnectionMetadata,
  WCP1HelloMessage,
  WCP3HandshakeMessage,
  AppConnectionOptions,
} from "./wcp-types"
import { resolveHostIdentifierFromSource } from "./wcp-host-identifier"
import type { LogPayloadDetail } from "../../logging/logger"

export interface WCPHandshakeContext extends WCPRoutingContext {
  options: Required<AppConnectionOptions>
  /** Host-configured payload detail for MessagePortTransport logs. */
  logPayloadDetail: LogPayloadDetail
  /**
   * FDC3 version advertised in WCP3Handshake. Threaded from the agent's
   * `implementationMetadata.fdc3Version` — the single source of truth, shared with WCP5,
   * `getInfo` and `closeRequest` gating.
   */
  fdc3Version: string
}

/**
 * Handle WCP1Hello message from an app
 *
 * Steps:
 * 1. Create MessageChannel
 * 2. Wrap port2 as MessagePortTransport
 * 3. Bridge app port messages into BrowserAppConnection routing
 * 4. Send WCP3Handshake with port1 to app
 * 5. Store connection metadata
 */
export function handleWCP1Hello(
  event: MessageEvent<WCP1HelloMessage>,
  context: WCPHandshakeContext,
): void {
  // Validate event source exists (required for postMessage)
  if (!event.source) {
    context.logger.warn("WCP1Hello received from null source, ignoring")
    return
  }

  const { data: message } = event
  const { connectionAttemptUuid } = message.meta

  // Create MessageChannel for this app connection
  const channel = new MessageChannel()

  // Generate temporary instanceId until WCP4 validation completes.
  // After validation, updateConnectionMetadata() migrates to actual instanceId
  // from AppInstanceRegistry. This allows routing messages during handshake
  // before the Desktop Agent has validated the app identity.
  const instanceId = `temp-${connectionAttemptUuid}`

  // Wrap port2 as the app-side MessagePort adapter (host logger + payload detail).
  const appTransport = new MessagePortTransport(channel.port2, {
    logger: context.options.logger,
    logPayloadDetail: context.logPayloadDetail,
  })

  // Bridge app port messages into BrowserAppConnection routing.
  bridgeAppPort(appTransport, context)

  // Extract host identifier from iframe's name attribute (AppLauncher.instanceId).
  // WCP4 carries this as claimed instanceId; the agent only adopts it on reconnect reuse.
  // Note: For cross-origin iframes, accessing window.name will throw SecurityError
  // so we wrap it in try-catch and gracefully fall back to undefined
  const sourceWindow = event.source as Window
  const hostIdentifier = resolveHostIdentifierFromSource(sourceWindow, context.options)

  // Store connection metadata
  const metadata: AppConnectionMetadata = {
    instanceId,
    appId: "unknown", // Will be set after WCP4 validation
    connectionAttemptUuid,
    messageOrigin: event.origin,
    source: sourceWindow,
    port: channel.port2,
    connectedAt: new Date(),
    hostIdentifier,
  }
  context.connectionRegistry.connections.set(instanceId, metadata)
  context.connectionRegistry.messagePortTransports.set(instanceId, appTransport)
  context.connectionRegistry.transportToInstanceId.set(appTransport, instanceId)

  // Create WCP3Handshake response
  const handshake: WCP3HandshakeMessage = {
    type: "WCP3Handshake",
    meta: {
      connectionAttemptUuid,
      timestamp: new Date().toISOString(),
    },
    payload: {
      fdc3Version: context.fdc3Version,
      intentResolverUrl: context.options.getIntentResolverUrl(instanceId) ?? false,
      channelSelectorUrl: context.options.getChannelSelectorUrl(instanceId) ?? false,
    },
  } as unknown as WCP3HandshakeMessage

  // Send WCP3Handshake to app with port1
  // event.source is validated above, safe to cast
  ;(event.source as Window).postMessage(handshake, event.origin, [channel.port1])

  // Set timeout to clean up stale connections that don't complete WCP4 validation
  // If appId is still "unknown" after timeout, the handshake failed
  setTimeout(() => {
    const connection = context.connectionRegistry.connections.get(instanceId)
    if (connection && connection.appId === "unknown") {
      context.logger.warn(
        `[BrowserAppConnection] Connection ${instanceId} timed out waiting for WCP4 validation, cleaning up`,
      )
      context.disconnectApp(instanceId)
      context.emit("handshakeFailed", new Error("WCP4 validation timeout"), connectionAttemptUuid)
    }
  }, context.options.handshakeTimeout)

  // Note: appConnected event will be fired after WCP4 validation by Desktop Agent
}
