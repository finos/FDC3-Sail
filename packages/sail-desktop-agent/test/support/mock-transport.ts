/**
 * Enhanced Mock Transport for Cucumber Tests
 *
 * Extends the basic MockTransport with capabilities needed for Cucumber step definitions:
 * - Track messages by destination instance
 * - Query messages by type, instance, payload fields
 * - Support for multiple "clients" in test scenarios
 */

import type { Transport, MessageHandler, DisconnectHandler } from "./transport"

/**
 * DACP message structure (partial, just what we need for routing/querying)
 */
interface DACPMessage {
  type: string
  meta?: {
    requestUuid?: string
    responseUuid?: string
    timestamp?: string | Date
    source?: {
      appId?: string
      instanceId?: string
    }
    destination?: {
      appId?: string
      instanceId?: string
    }
  }
  payload?: Record<string, unknown>
}

/**
 * Message record with parsed routing info
 */
export interface MessageRecord {
  msg: DACPMessage
  to?: {
    appId?: string
    instanceId?: string
  }
  timestamp: Date
}

/**
 * Enhanced MockTransport for Cucumber tests.
 *
 * Key features:
 * - Tracks ALL sent messages with timestamps
 * - Indexes messages by destination instance ID
 * - Provides rich query API for step definitions
 * - Supports message verification and assertions
 */
export class MockTransport implements Transport {
  private messageHandler?: MessageHandler
  private disconnectHandler?: DisconnectHandler
  private connected: boolean = true
  private appIdsByInstanceId: Map<string, string> = new Map()

  // Message tracking
  public allMessages: MessageRecord[] = []
  private messagesByInstance: Map<string, MessageRecord[]> = new Map()

  /**
   * Last `instanceId` from an outgoing WCP5ValidateAppIdentityResponse (Desktop Agent → app).
   * Tests use this because WCP4 may mint a new instance id that differs from a pre-seeded connection id.
   *
   * Nit (optional rename): if you start recording ids from other WCP5 message types, prefer a neutral
   * name such as `lastIdentityValidatedInstanceId` so the field is not tied to a single response shape.
   */
  public lastWcp5ValidatedInstanceId: string | null = null

  /** WCP4 connection id → validated WCP5 instanceId assigned during validation. */
  private wcp5InstanceIdByConnectionId: Map<string, string> = new Map()

  /** WCP4 connectionAttemptUuid → host instance id from validate payload (pre-WCP5). */
  private hostInstanceIdByConnectionAttempt: Map<string, string> = new Map()

  /**
   * Optional hook to mirror WCP5 routing links onto AgentState (Cucumber harness).
   */
  onHandshakeRoutingLinked?: (handshakeRoutingId: string, instanceId: string) => void

  private recordHandshakeRoutingLink(handshakeRoutingId: string, instanceId: string): void {
    this.onHandshakeRoutingLinked?.(handshakeRoutingId, instanceId)
  }

  /**
   * Resolve the validated WCP5 instance id for a connection id when validation ran.
   * Falls back to the connection id when no WCP5 mapping exists.
   */
  resolveWcp5InstanceId(connectionId: string): string {
    return this.wcp5InstanceIdByConnectionId.get(connectionId) ?? connectionId
  }

  /** Record test connection id → validated WCP5 instance id after validate. */
  registerWcp5Mapping(connectionId: string, validatedInstanceId: string): void {
    this.wcp5InstanceIdByConnectionId.set(connectionId, validatedInstanceId)
    this.lastWcp5ValidatedInstanceId = validatedInstanceId
    this.recordHandshakeRoutingLink(connectionId, validatedInstanceId)
  }

  send(message: unknown): void {
    const msg = message as DACPMessage

    if (msg.type === "WCP5ValidateAppIdentityResponse") {
      const id = (msg.payload as { instanceId?: string } | undefined)?.instanceId
      const connectionId = msg.meta?.destination?.instanceId
      const connectionAttemptUuid = (msg.meta as { connectionAttemptUuid?: string } | undefined)
        ?.connectionAttemptUuid
      if (id) {
        this.lastWcp5ValidatedInstanceId = id
      }
      if (connectionId && id) {
        this.wcp5InstanceIdByConnectionId.set(connectionId, id)
        this.recordHandshakeRoutingLink(connectionId, id)
      }
      if (connectionAttemptUuid && id) {
        const hostInstanceId = this.hostInstanceIdByConnectionAttempt.get(connectionAttemptUuid)
        if (hostInstanceId) {
          this.wcp5InstanceIdByConnectionId.set(hostInstanceId, id)
          this.recordHandshakeRoutingLink(hostInstanceId, id)
          this.hostInstanceIdByConnectionAttempt.delete(connectionAttemptUuid)
        }
      }
    }

    // Backfill destination appId from known instance mapping.
    if (msg.meta?.destination?.instanceId && !msg.meta.destination.appId) {
      const appId = this.appIdsByInstanceId.get(msg.meta.destination.instanceId)
      if (appId) {
        msg.meta.destination.appId = appId
      }
    }

    // Create record
    const record: MessageRecord = {
      msg: msg,
      to: msg.meta?.destination
        ? {
            appId: msg.meta.destination.appId,
            instanceId: msg.meta.destination.instanceId,
          }
        : undefined,
      timestamp: new Date(),
    }

    // Track globally
    this.allMessages.push(record)

    // Index by destination instance
    const instanceId = msg.meta?.destination?.instanceId
    if (instanceId) {
      if (!this.messagesByInstance.has(instanceId)) {
        this.messagesByInstance.set(instanceId, [])
      }
      this.messagesByInstance.get(instanceId)!.push(record)
    }
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandler = handler
  }

  onDisconnect(handler: DisconnectHandler): void {
    this.disconnectHandler = handler
  }

  isConnected(): boolean {
    return this.connected
  }

  getInstanceId(): string | null {
    return null
  }

  disconnect(): void {
    this.connected = false
    this.disconnectHandler?.()
  }

  // ======= Test Helper Methods =======

  /** Record inbound routing metadata used by WCP identity tests (no handler invocation). */
  trackInboundMessage(message: unknown): void {
    const incoming = message as DACPMessage
    const sourceInstanceId = incoming.meta?.source?.instanceId
    const sourceAppId = incoming.meta?.source?.appId
    if (sourceInstanceId && sourceAppId) {
      this.appIdsByInstanceId.set(sourceInstanceId, sourceAppId)
    }
    if (incoming.type === "WCP4ValidateAppIdentity") {
      const attemptUuid = (incoming.meta as { connectionAttemptUuid?: string } | undefined)
        ?.connectionAttemptUuid
      const hostInstanceId = (incoming.payload as { instanceId?: string } | undefined)?.instanceId
      if (attemptUuid && hostInstanceId) {
        this.hostInstanceIdByConnectionAttempt.set(attemptUuid, hostInstanceId)
      }
    }
  }

  /**
   * Simulate receiving a message from an app
   */
  async receiveMessage(message: unknown): Promise<void> {
    if (!this.messageHandler) {
      throw new Error("No message handler registered")
    }
    this.trackInboundMessage(message)
    await this.messageHandler(message)
  }

  /**
   * Get all messages sent to a specific instance
   */
  getMessagesForInstance(instanceId: string): MessageRecord[] {
    return this.messagesByInstance.get(instanceId) || []
  }

  /**
   * Get all messages of a specific type
   */
  getMessagesByType(type: string): MessageRecord[] {
    return this.allMessages.filter(r => r.msg.type === type)
  }

  /**
   * Get messages matching a predicate
   */
  findMessages(predicate: (record: MessageRecord) => boolean): MessageRecord[] {
    return this.allMessages.filter(predicate)
  }

  /**
   * Get the last N messages
   */
  getLastMessages(count: number): MessageRecord[] {
    return this.allMessages.slice(-count)
  }

  /**
   * Get the last sent message (any destination)
   */
  getLastMessage(): MessageRecord | undefined {
    return this.allMessages[this.allMessages.length - 1]
  }

  /**
   * Clear all message history
   */
  clear(): void {
    this.allMessages = []
    this.messagesByInstance.clear()
    this.lastWcp5ValidatedInstanceId = null
    this.wcp5InstanceIdByConnectionId.clear()
    this.hostInstanceIdByConnectionAttempt.clear()
  }

  /**
   * Get count of messages sent to instance
   */
  getMessageCountForInstance(instanceId: string): number {
    return this.getMessagesForInstance(instanceId).length
  }

  /**
   * Check if any message matches a type pattern and destination
   */
  hasMessageMatching(
    typePattern: string | RegExp,
    instanceId?: string,
    payloadMatch?: (payload: Record<string, unknown>) => boolean,
  ): boolean {
    const messages = instanceId ? this.getMessagesForInstance(instanceId) : this.allMessages

    return messages.some(record => {
      const msg = record.msg

      // Check type
      const typeMatches =
        typeof typePattern === "string" ? msg.type === typePattern : typePattern.test(msg.type)

      if (!typeMatches) return false

      // Check payload if predicate provided
      if (payloadMatch && msg.payload) {
        return payloadMatch(msg.payload)
      }

      return true
    })
  }

  /**
   * Get messages in chronological order (alias for readability)
   */
  getPostedMessages(): MessageRecord[] {
    return this.allMessages
  }
}
