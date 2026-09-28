/**
 * Mock Transport for Testing
 *
 * Simple, synchronous transport for testing Desktop Agent without Socket.IO
 */

import type { Transport, MessageHandler, DisconnectHandler } from "../../../test/support/transport"

/**
 * Mock transport - fully synchronous, no Socket.IO needed
 */
export class MockTransport implements Transport {
  private messageHandler?: MessageHandler
  private disconnectHandler?: DisconnectHandler
  private connected: boolean = true

  // Sent messages history for assertions
  public sentMessages: unknown[] = []

  send(message: unknown): void {
    this.sentMessages.push(message)
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

  // Test helper: Simulate receiving a message
  async receiveMessage(message: unknown): Promise<void> {
    if (!this.messageHandler) {
      throw new Error("No message handler registered")
    }
    await this.messageHandler(message)
  }

  // Test helper: Get last sent message
  getLastMessage(): unknown {
    return this.sentMessages[this.sentMessages.length - 1]
  }

  // Test helper: Clear history
  clear(): void {
    this.sentMessages = []
  }
}
