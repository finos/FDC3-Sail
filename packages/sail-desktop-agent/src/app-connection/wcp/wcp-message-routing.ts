import type {
  AppRequestMessage,
  WebConnectionProtocolMessage,
} from "@finos/fdc3-schema/dist/generated/api/BrowserTypes"
import type { MessagePortTransport } from "../message-port"
import type { AppMessageHandler } from "../types"
import type { AppConnectionRegistry } from "../app-connection-registry"
import { isAppMessage } from "./wcp-types"
import type { Logger } from "../../logging/logger"
import type { EmitFunction } from "../app-connection-events"
import { applyInboundValidationPolicy, type ValidationMode } from "../../dacp/validate-dacp-message"

export interface WCPRoutingContext {
  connectionRegistry: AppConnectionRegistry
  onAppMessage: AppMessageHandler
  logger: Logger
  /** Same ValidationMode as DesktopAgent — applied to raw MessagePort messages. */
  validation: ValidationMode
  emit: EmitFunction
  enrichMessageWithSource: (
    message: AppRequestMessage | WebConnectionProtocolMessage,
    instanceId: string,
  ) => AppRequestMessage | WebConnectionProtocolMessage
  handleWCP6Goodbye: (instanceId: string) => void
  onInstanceTeardown: (instanceId: string) => void
  /**
   * Disconnect a connection still keyed by its temporary handshake id, using that id exactly —
   * it must not be resolved forward to a validated instanceId. Used by the pre-WCP5 handshake
   * timeout; the WCP5-failure path in {@link AppConnectionRegistry} has the same requirement.
   */
  disconnectApp: (instanceId: string) => void
}

/**
 * Bridge app MessagePort → Desktop Agent DACP ingest.
 * Outbound uses {@link AppConnectionRegistry.sendToAppInstance}.
 */
export function bridgeAppPort(
  appTransport: MessagePortTransport,
  context: WCPRoutingContext,
): void {
  const { connectionRegistry } = context

  appTransport.onMessage((message: unknown) => {
    if (!isAppMessage(message)) {
      context.logger.warn("Received invalid message from app, ignoring", message)
      return
    }

    const currentInstanceId = connectionRegistry.transportToInstanceId.get(appTransport)
    if (!currentInstanceId) {
      context.logger.warn("Cannot route message: transport not found in reverse lookup")
      return
    }

    // Validate raw wire shape before enrichment / WCP6 handling. Sail stamps
    // meta.source and messageOrigin after this point; those fields fail FDC3 WCP schemas.
    if (
      applyInboundValidationPolicy(message, {
        logger: context.logger,
        validation: context.validation,
      }) === "rejected"
    ) {
      return
    }

    if (message.type === "WCP6Goodbye") {
      context.handleWCP6Goodbye(currentInstanceId)
      return
    }

    const enrichedMessage = context.enrichMessageWithSource(message, currentInstanceId)
    void Promise.resolve(context.onAppMessage(enrichedMessage)).catch(error => {
      context.logger.error("Error ingesting app message:", error)
    })
  })

  appTransport.onDisconnect(() => {
    const currentInstanceId = connectionRegistry.transportToInstanceId.get(appTransport)
    if (currentInstanceId) {
      context.onInstanceTeardown(currentInstanceId)
    }
    connectionRegistry.transportToInstanceId.delete(appTransport)
  })
}
