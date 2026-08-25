/**
 * Test-only transport contract.
 *
 * Handler-isolated tests need a recorder they can attach in place of a real app
 * edge. Production code has no transport abstraction: the browser path is
 * app → WCP/MessagePort → `BrowserAppConnection` → `DesktopAgent` →
 * `AppConnectionRegistry.sendToAppInstance()`, with no swappable hop.
 *
 * Implemented by {@link InMemoryTransport} and the Cucumber/Vitest `MockTransport`s.
 */

import type { DacpResponseDispatcher } from "../../src/handlers/types"
import { withDestinationRouting } from "../../src/handlers/utils/dacp-response-utils"

/** Handler for inbound messages from apps. */
export type MessageHandler = (message: unknown) => void | Promise<void>

/** Handler for disconnect events. */
export type DisconnectHandler = () => void

/** Bidirectional message recorder used in place of a real app edge. */
export interface Transport {
  send(message: unknown): void
  onMessage(handler: MessageHandler): void
  onDisconnect(handler: DisconnectHandler): void
  isConnected(): boolean
  getInstanceId(): string | null
  disconnect(): void
}

/**
 * DACP response delivery over a test {@link Transport}.
 *
 * Production delivery is `createDacpResponseDispatcherFromDelivery`, which routes
 * through the browser app connection.
 */
export function createDacpResponseDispatcher(edgeTransport: Transport): DacpResponseDispatcher {
  return {
    connectionOwner: edgeTransport,

    sendToInstance(instanceId, message) {
      edgeTransport.send(withDestinationRouting(instanceId, message))
    },

    sendOutbound(message) {
      edgeTransport.send(message)
    },

    getInboundInstanceId() {
      return edgeTransport.getInstanceId()
    },
  }
}
