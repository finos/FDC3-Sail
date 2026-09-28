/**
 * In-Memory Transport Implementation
 *
 * Transport implementation for same-process communication.
 * Used when Desktop Agent and connection manager are in the same process.
 *
 * Environment-agnostic when `structuredClone` is available (browser, Node.js 17+,
 * Deno, etc.). **Requires `structuredClone` at runtime** for message cloning;
 * runtimes without it cannot use this transport.
 */

import type { Transport, MessageHandler, DisconnectHandler } from "./transport"
import { consoleLogger } from "../../src/logging/logger"

/**
 * In-memory transport for same-process communication.
 *
 * Requires `structuredClone` at runtime to deep-clone messages before delivery.
 * This transport enables direct function calls between two components
 * in the same process. Messages are delivered asynchronously to the peer handler.
 *
 * Commonly used for:
 * - Browser Desktop Agent + WCP Connector in same window
 * - Testing and development
 * - Embedded Desktop Agent scenarios
 *
 * @example
 * ```typescript
 * // Create a pair of linked transports
 * const [transport1, transport2] = createInMemoryTransportPair()
 *
 * // Messages sent to transport1 are received by transport2
 * transport2.onMessage((msg) => console.log('Transport2 received:', msg))
 * transport1.send({ hello: 'from transport1' })
 *
 * // And vice versa
 * transport1.onMessage((msg) => console.log('Transport1 received:', msg))
 * transport2.send({ hello: 'from transport2' })
 * ```
 */
export type DeliveryErrorHandler = (error: unknown) => void

export class InMemoryTransport implements Transport {
  private messageHandler?: MessageHandler
  private disconnectHandler?: DisconnectHandler
  private deliveryErrorHandler?: DeliveryErrorHandler
  private connected: boolean = true
  /** True when the linked peer called disconnect(); used for send() error text on the surviving endpoint. */
  private tornDownByPeer = false
  private peer?: InMemoryTransport

  /**
   * Set the peer transport for bidirectional communication.
   * This is typically called by createInMemoryTransportPair().
   *
   * @param peer - The other transport to link with
   * @internal
   */
  setPeer(peer: InMemoryTransport): void {
    this.peer = peer
  }

  /**
   * Linked peer for same-process registries (e.g. WCP4 pending source window).
   * @internal
   */
  getLinkedPeer(): InMemoryTransport | undefined {
    return this.peer
  }

  /**
   * Send a message to the peer transport.
   *
   * Delivery semantics:
   * - Validates connection state synchronously; throws if this transport or the peer is disconnected.
   * - Deep-clones the message synchronously before scheduling delivery; throws if the payload
   *   cannot be cloned (e.g. functions, circular references).
   * - Delivers the clone to the peer's `onMessage` handler asynchronously on the next macrotask
   *   (`setTimeout(0)`), so `send()` returns before the peer handler runs.
   * - Peer handler failures (sync throw or rejected Promise) are logged and reported to any
   *   handler registered via {@link onDeliveryError} on this (sender) transport.
   *
   * @param message - Message to send
   */
  send(message: unknown): void {
    if (!this.connected) {
      if (this.tornDownByPeer) {
        throw new Error(
          "Cannot send message: InMemoryTransport is disconnected\nCannot send message: Peer transport is disconnected",
        )
      }
      throw new Error("Cannot send message: InMemoryTransport is disconnected")
    }

    if (!this.peer) {
      throw new Error("Cannot send message: No peer transport connected")
    }

    if (!this.peer.isConnected()) {
      throw new Error("Cannot send message: Peer transport is disconnected")
    }

    // Clone before scheduling delivery so uncloneable payloads fail synchronously in send().
    const clonedMessage = this.deepClone(message)

    // Use setTimeout to make delivery async, preventing:
    // 1. Stack overflow with rapid back-and-forth messages
    // 2. Synchronous call stack issues that could block the event loop
    setTimeout(() => {
      if (this.peer?.isConnected() && this.peer?.messageHandler) {
        try {
          void Promise.resolve(this.peer.messageHandler(clonedMessage)).catch(error => {
            consoleLogger.error("Error in peer message handler:", error)
            this.deliveryErrorHandler?.(error)
          })
        } catch (error) {
          consoleLogger.error("Error in peer message handler:", error)
          this.deliveryErrorHandler?.(error)
        }
      }
    }, 0)
  }

  /**
   * Register a handler for delivery failures on messages sent through this transport.
   *
   * Called when the peer's `onMessage` handler throws synchronously or returns a rejected Promise.
   * Errors are also logged via the DACP console logger.
   *
   * @param handler - Function to call when peer delivery fails
   */
  onDeliveryError(handler: DeliveryErrorHandler): void {
    this.deliveryErrorHandler = handler
  }

  /**
   * Register handler for incoming messages
   *
   * @param handler - Function to call when message is received
   */
  onMessage(handler: MessageHandler): void {
    this.messageHandler = handler
  }

  /**
   * Register handler for disconnect events
   *
   * @param handler - Function to call when disconnected
   */
  onDisconnect(handler: DisconnectHandler): void {
    this.disconnectHandler = handler
  }

  /**
   * Check if the transport is connected
   *
   * @returns true if connected, false otherwise
   */
  isConnected(): boolean {
    return this.connected
  }

  /**
   * Get the instance ID associated with this transport connection.
   * For InMemoryTransport, this is not applicable as it's not a per-instance connection.
   */
  getInstanceId(): string | null {
    return null
  }

  /**
   * Disconnect the transport
   *
   * Bilaterally tears down the linked peer synchronously so neither endpoint
   * remains half-open. Safe to call multiple times (idempotent).
   */
  disconnect(): void {
    if (!this.connected) {
      return
    }

    const peer = this.peer
    this.connected = false
    this.peer = undefined

    if (peer?.isConnected()) {
      peer.tearDownFromPeerDisconnect()
    }

    this.invokeDisconnectHandler()
  }

  /**
   * Peer-initiated teardown: mark disconnected, clear refs, notify handler once.
   * Does not recurse back to the initiator (already disconnected).
   *
   * @internal
   */
  private tearDownFromPeerDisconnect(): void {
    if (!this.connected) {
      return
    }

    this.connected = false
    this.tornDownByPeer = true
    this.peer = undefined
    this.invokeDisconnectHandler()
  }

  private invokeDisconnectHandler(): void {
    if (!this.disconnectHandler) {
      return
    }

    try {
      this.disconnectHandler()
    } catch (error) {
      consoleLogger.error("Error in disconnect handler:", error)
    }
  }

  /**
   * Deep clone a message to prevent shared object references
   * between the two transports.
   *
   * Why clone instead of JSON serialize/parse:
   * - Preserve transport-style message isolation (sender/receiver never share references).
   * - Preserve non-JSON values supported by structured clone semantics.
   * - Fail fast on unsupported payloads rather than silently dropping/coercing fields.
   *
   * This uses newer structuredClone API for better performance and security.
   * NOTE: We may need to fallback to JSON serialization for environments that don't have structuredClone.
   */
  private deepClone(obj: unknown): unknown {
    if (typeof structuredClone === "undefined") {
      throw new Error("structuredClone is required but not available in this environment")
    }

    try {
      // structuredClone accepts cycles; DACP payloads must be acyclic trees.
      this.rejectCircularReferences(obj)
      return structuredClone(obj)
    } catch (error) {
      // structuredClone throws for functions, DOM nodes, etc.
      consoleLogger.error("Cannot clone message - contains unsupported types:", error)
      throw error
    }
  }

  /** Fail fast on cyclic object graphs before structuredClone would silently preserve them. */
  private rejectCircularReferences(value: unknown, seen: WeakSet<object> = new WeakSet()): void {
    if (value === null || typeof value !== "object") {
      return
    }

    if (seen.has(value)) {
      throw new TypeError("Cannot clone circular structure")
    }

    seen.add(value)

    if (Array.isArray(value)) {
      for (const item of value) {
        this.rejectCircularReferences(item, seen)
      }
      return
    }

    for (const key of Object.keys(value)) {
      this.rejectCircularReferences((value as Record<string, unknown>)[key], seen)
    }
  }
}
/**
 * Create a pair of linked InMemoryTransport instances.
 *
 * Messages sent to transport1 are received by transport2, and vice versa.
 * This is useful for connecting two components in the same process.
 *
 * @returns Tuple of [transport1, transport2]
 *
 * @example
 * ```typescript
 * // Create linked transports for isolated handler or protocol tests
 * const [leftTransport, rightTransport] = createInMemoryTransportPair()
 *
 * leftTransport.onMessage(message => {
 *   console.log("received from right", message)
 * })
 *
 * rightTransport.send({ type: "test" })
 * ```
 */
/** Resolve the other endpoint of an in-memory transport pair, if any. */
export function getInMemoryTransportPeer(transport: Transport): Transport | undefined {
  if (transport instanceof InMemoryTransport) {
    return transport.getLinkedPeer()
  }
  return undefined
}

export function createInMemoryTransportPair(): [InMemoryTransport, InMemoryTransport] {
  const transport1 = new InMemoryTransport()
  const transport2 = new InMemoryTransport()

  transport1.setPeer(transport2)
  transport2.setPeer(transport1)

  return [transport1, transport2]
}
