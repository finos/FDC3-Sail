/**
 * MessagePort Transport Implementation
 *
 * Transport implementation using browser MessagePort API.
 * Used for direct browser-to-browser communication (iframe to parent window).
 *
 * This is a browser-specific implementation and should only be used in
 * browser environments.
 */

import { consoleLogger, type Logger, type LogPayloadDetail } from "../logging/logger"

/** Handler for inbound messages from the connected app. */
type MessageHandler = (message: unknown) => void | Promise<void>

/** Handler for port disconnect. */
type DisconnectHandler = () => void

interface MessagePortTransportOptions {
  logger?: Logger
  logPayloadDetail?: LogPayloadDetail
}

/**
 * Transport implementation using MessagePort API.
 *
 * This transport wraps a MessagePort for bidirectional communication.
 * Commonly used for:
 * - Iframe to parent window communication (WCP)
 * - Worker to main thread communication
 * - Direct in-browser Desktop Agent connections
 *
 * @example
 * ```typescript
 * // Create MessageChannel
 * const channel = new MessageChannel()
 *
 * // Wrap port2 as transport
 * const transport = new MessagePortTransport(channel.port2)
 *
 * // Set up handlers
 * transport.onMessage((msg) => console.log('Received:', msg))
 * transport.onDisconnect(() => console.log('Disconnected'))
 *
 * // Send messages
 * transport.send({ type: 'hello', payload: { message: 'world' } })
 *
 * // Transfer port1 to iframe
 * iframe.contentWindow.postMessage(handshake, '*', [channel.port1])
 * ```
 */
export class MessagePortTransport {
  private port: MessagePort
  private readonly logger: Logger
  private readonly logPayloadDetail: LogPayloadDetail
  private messageHandler?: MessageHandler
  private disconnectHandler?: DisconnectHandler
  private connected: boolean = true
  /** True after listeners are removed and the port is closed (idempotent cleanup guard). */
  private portDisposed: boolean = false
  private readonly boundHandleMessage = this.handleMessage.bind(this)
  private readonly boundHandleError = this.handleError.bind(this)

  /**
   * Create a new MessagePort transport
   *
   * @param port - MessagePort to wrap
   */
  constructor(port: MessagePort, options?: MessagePortTransportOptions) {
    if (typeof MessagePort === "undefined") {
      throw new Error("MessagePort is not available (browser environment required)")
    }

    this.port = port
    this.logger = options?.logger ?? consoleLogger
    this.logPayloadDetail = options?.logPayloadDetail ?? "metadata"

    // Start the port (required for message delivery)
    this.port.start()

    // Listen for messages
    this.port.addEventListener("message", this.boundHandleMessage)

    // Listen for deserialization failures (logged only; see handleError policy)
    this.port.addEventListener("messageerror", this.boundHandleError)

    // Note: MessagePorts don't have a built-in disconnect event
    // Disconnect is detected via DACP heartbeat timeout
  }

  /**
   * Send a message through the MessagePort
   *
   * @param message - Message to send (will be structured cloned)
   */
  send(message: unknown): void {
    if (!this.connected) {
      throw new Error("Cannot send message: MessagePort is disconnected")
    }

    const messageType =
      message && typeof message === "object" && "type" in message ? message.type : "unknown"

    this.logger.debug("[MessagePortTransport] Sending message", {
      messageType,
      connected: this.connected,
    })

    try {
      this.port.postMessage(message)
      this.logger.debug("[MessagePortTransport] Message posted successfully", { messageType })
    } catch (error) {
      this.logger.error("[MessagePortTransport] Error sending message through MessagePort:", error)
      // If posting fails, treat as disconnection
      this.disconnect()
      throw error
    }
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
   * Note: MessagePort doesn't have native disconnect detection.
   * This is typically triggered by:
   * - Explicit disconnect() call
   * - postMessage failures (fatal)
   * - DACP heartbeat timeout
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
   * Disconnect the transport and clean up resources
   */
  disconnect(): void {
    if (this.portDisposed && !this.connected) {
      return
    }

    const wasConnected = this.connected
    this.connected = false
    this.disposePort()

    if (wasConnected) {
      this.notifyDisconnectHandler()
    }
  }

  /**
   * Remove port listeners and close the port exactly once.
   */
  private disposePort(): void {
    if (this.portDisposed) {
      return
    }

    this.portDisposed = true

    this.port.removeEventListener("message", this.boundHandleMessage)
    this.port.removeEventListener("messageerror", this.boundHandleError)
    this.port.close()
  }

  private notifyDisconnectHandler(): void {
    if (this.disconnectHandler) {
      try {
        this.disconnectHandler()
      } catch (error) {
        this.logger.error("Error in disconnect handler:", error)
      }
    }
  }

  /**
   * Handle incoming message event
   */
  private handleMessage(event: MessageEvent): void {
    if (!this.connected) {
      return
    }

    const message = event.data as unknown
    const messageType =
      message && typeof message === "object" && "type" in message ? message.type : "unknown"

    this.logger.debug("[MessagePortTransport] Received message", {
      messageType,
      hasHandler: !!this.messageHandler,
      connected: this.connected,
    })

    if (messageType === "broadcastEvent" && message && typeof message === "object") {
      const msg = message as Record<string, unknown>
      const payload = msg.payload as Record<string, unknown> | undefined
      const broadcastLog: Record<string, unknown> = {
        type: msg.type,
        hasPayload: !!payload,
        channelId: payload?.channelId,
        // oxlint-disable-next-line typescript/no-unnecessary-condition -- `payload` is parsed from raw `MessageEvent.data` off the MessagePort transport; the `Record<string, unknown>` cast is an assumption about a well-behaved peer, not a guarantee.
        contextType: (payload?.context as Record<string, unknown>)?.type,
        // oxlint-disable-next-line typescript/no-unnecessary-condition -- same MessagePort trust boundary as above; `payload` is raw `MessageEvent.data`, not a validated message.
        contextId: (payload?.context as Record<string, unknown>)?.id,
        contextKeys: payload?.context ? Object.keys(payload.context) : undefined,
      }

      if (this.logPayloadDetail === "full") {
        broadcastLog.fullMessage = JSON.stringify(message, null, 2)
      }

      this.logger.debug("[MessagePortTransport] BroadcastEvent details", broadcastLog)
    }

    if (this.messageHandler) {
      try {
        const result = this.messageHandler(message)
        // Handle promise if handler is async
        if (result instanceof Promise) {
          void result.catch(error => {
            this.logger.error("[MessagePortTransport] Error in async message handler:", error, {
              messageType,
            })
          })
        }
        this.logger.debug("[MessagePortTransport] Message handler executed successfully", {
          messageType,
        })
      } catch (error) {
        this.logger.error("[MessagePortTransport] Error in message handler:", error, {
          messageType,
        })
      }
    } else {
      this.logger.warn("[MessagePortTransport] No message handler registered", { messageType })
    }
  }

  /**
   * Handle messageerror (structured-clone / deserialization failure).
   *
   * Lenient policy: log at error level and keep the connection alive so one
   * bad inbound payload does not tear down an otherwise healthy app session.
   * Outbound postMessage failures remain fatal via send() → disconnect().
   */
  private handleError(event: MessageEvent): void {
    this.logger.error("MessagePort error:", event)
  }
}
