/**
 * DACP oracle app connection for Vitest and Cucumber.
 *
 * Implements the same app-edge contract as {@link BrowserAppConnection} without WCP/MessagePort.
 * Outbound messages are recorded for step assertions; inbound uses {@link receiveMessage}.
 */

import type { AppMessageHandler } from "../../src/app-connection/types"
import type { AppConnectionMetadata } from "../../src/app-connection/wcp/wcp-types"
import { setPendingWcpSourceWindow } from "../../src/app-connection/wcp/pending-source-window"
import { setPendingWcpMessageOrigin } from "../../src/app-connection/wcp/pending-wcp4-message-origin"
import { MockTransport, type MessageRecord } from "./mock-transport"

/** Test-only WCP4 inputs `receiveMessage` cannot legally carry on the wire message. */
export type Wcp4TestInputs = {
  sourceWindow?: unknown
  messageOrigin?: string
}

export class DacpTestAppConnection {
  private appMessageHandler?: AppMessageHandler
  private onAgentDisconnect?: () => void

  /** Outbound DACP/WCP recorder (same query API as legacy Cucumber MockTransport). */
  readonly outbound = new MockTransport()

  readonly connectionRegistry = {
    sendToAppInstance: (message: unknown): void => {
      this.outbound.send(message)
    },
  }

  start(): void {
    // No-op — tests drive inbound via receiveMessage.
  }

  stop(): void {
    this.outbound.disconnect()
  }

  onAppMessage(handler: AppMessageHandler): void {
    this.appMessageHandler = handler
  }

  setOnInstanceTeardown(_handler: (instanceId: string) => void): void {
    // Test connections do not own instance lifecycle; tests drive cleanup explicitly.
  }

  /** Cucumber shutdown step — mirrors legacy transport disconnect cleanup. */
  setOnAgentDisconnect(handler: () => void): void {
    this.onAgentDisconnect = handler
  }

  getConnection(_instanceId: string): AppConnectionMetadata | undefined {
    return undefined
  }

  getConnections(): AppConnectionMetadata[] {
    return []
  }

  pruneAppConnection(_instanceId: string): void {
    // BrowserAppConnection prunes MessagePort maps here; test edge has no registry state.
    // Do not call onInstanceTeardown — that callback is WCP→agent teardown (disconnectInstance).
  }

  /**
   * @param wcp4Inputs - WCP1Hello stand-ins for WCP4ValidateAppIdentity messages. Mirrors
   *   {@link BrowserAppConnection.enrichMessageWithSource}, which stores the real
   *   `MessageEvent.source` and origin and hands them to WCP4 validation via the same
   *   {@link setPendingWcpSourceWindow} / {@link setPendingWcpMessageOrigin} seams instead of
   *   `meta` fields — neither is legal on the raw wire message (`ConnectionStepMeta` only
   *   permits `connectionAttemptUuid`/`timestamp`).
   */
  async receiveMessage(message: unknown, wcp4Inputs?: Wcp4TestInputs): Promise<void> {
    if (!this.appMessageHandler) {
      throw new Error("No app message handler registered — call DesktopAgent.start() first")
    }
    if (wcp4Inputs && (message as { type?: string })?.type === "WCP4ValidateAppIdentity") {
      const connectionAttemptUuid = (message as { meta?: { connectionAttemptUuid?: string } }).meta
        ?.connectionAttemptUuid
      if (connectionAttemptUuid) {
        const tempInstanceId = `temp-${connectionAttemptUuid}`
        if (wcp4Inputs.sourceWindow !== undefined) {
          setPendingWcpSourceWindow(this, tempInstanceId, wcp4Inputs.sourceWindow)
        }
        if (wcp4Inputs.messageOrigin !== undefined) {
          setPendingWcpMessageOrigin(this, tempInstanceId, wcp4Inputs.messageOrigin)
        }
      }
    }
    this.outbound.trackInboundMessage(message)
    await this.appMessageHandler(message)
  }

  disconnect(): void {
    this.outbound.disconnect()
    this.onAgentDisconnect?.()
  }

  // --- Delegate outbound query API used by Cucumber steps ---

  get allMessages(): MessageRecord[] {
    return this.outbound.allMessages
  }

  set allMessages(records: MessageRecord[]) {
    this.outbound.allMessages = records
  }

  get lastWcp5ValidatedInstanceId(): string | null {
    return this.outbound.lastWcp5ValidatedInstanceId
  }

  set onHandshakeRoutingLinked(
    handler: ((handshakeRoutingId: string, instanceId: string) => void) | undefined,
  ) {
    this.outbound.onHandshakeRoutingLinked = handler
  }

  resolveWcp5InstanceId(connectionId: string): string {
    return this.outbound.resolveWcp5InstanceId(connectionId)
  }

  registerWcp5Mapping(connectionId: string, validatedInstanceId: string): void {
    this.outbound.registerWcp5Mapping(connectionId, validatedInstanceId)
  }

  getPostedMessages(): MessageRecord[] {
    return this.outbound.getPostedMessages()
  }

  getLastMessage(): MessageRecord | undefined {
    return this.outbound.getLastMessage()
  }

  getMessagesByType(type: string): MessageRecord[] {
    return this.outbound.getMessagesByType(type)
  }

  getMessagesForInstance(instanceId: string): MessageRecord[] {
    return this.outbound.getMessagesForInstance(instanceId)
  }

  /** Raw outbound payloads (Vitest-style) from recorded DACP/WCP messages. */
  get sentMessages(): unknown[] {
    return this.outbound.allMessages.map(record => record.msg)
  }

  clear(): void {
    this.outbound.clear()
  }
}
