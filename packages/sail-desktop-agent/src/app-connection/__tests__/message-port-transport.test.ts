/**
 * MessagePortTransport Tests
 *
 * These tests use JSDOM to provide browser APIs (MessagePort, MessageChannel)
 * in the Node.js test environment.
 */

import { describe, it, expect, beforeEach, vi } from "vite-plus/test"
import { disconnectApp, type AppConnectionContext } from "../wcp/wcp-connection-management"
import { MessagePortTransport } from "../message-port"
import { consoleLogger } from "../../logging/logger"
import { AppConnectionRegistry } from "../../app-connection/app-connection-registry"

function createListenerTracker(port: MessagePort) {
  const activeListeners = new Map<string, Set<EventListenerOrEventListenerObject>>()

  const trackAdd = (type: string, listener: EventListenerOrEventListenerObject) => {
    if (!activeListeners.has(type)) {
      activeListeners.set(type, new Set())
    }
    activeListeners.get(type)!.add(listener)
  }

  const trackRemove = (type: string, listener: EventListenerOrEventListenerObject) => {
    activeListeners.get(type)?.delete(listener)
  }

  vi.spyOn(port, "addEventListener").mockImplementation((type, listener, options) => {
    trackAdd(type, listener)
    return MessagePort.prototype.addEventListener.call(port, type, listener, options)
  })

  vi.spyOn(port, "removeEventListener").mockImplementation((type, listener, options) => {
    trackRemove(type, listener)
    return MessagePort.prototype.removeEventListener.call(port, type, listener, options)
  })

  return {
    activeListeners,
    listenerCount(type: string) {
      return activeListeners.get(type)?.size ?? 0
    },
  }
}

function createMinimalWCPContext(): AppConnectionContext {
  const emit = vi.fn()
  const connectionRegistry = new AppConnectionRegistry({
    emit,
    logger: consoleLogger,
    updateConnectionMetadata: vi.fn(),
    disconnectApp: vi.fn(),
  })
  return {
    connectionRegistry,
    options: {
      intentResolverUrl: false,
      channelSelectorUrl: false,
      getIntentResolverUrl: () => false,
      getChannelSelectorUrl: () => false,
      handshakeTimeout: 5000,
      disconnectGracePeriod: 2000,
      intentResolutionTimeout: 60000,
      debug: false,
      logger: consoleLogger,
      resolveHostIdentifier: () => undefined,
    },
    pendingDisconnects: new Map(),
    recentlyDisconnected: new Map(),
    emit,
    logger: consoleLogger,
  }
}

describe("MessagePortTransport", () => {
  let channel: MessageChannel
  let port1: MessagePort
  let port2: MessagePort

  beforeEach(() => {
    // Create a MessageChannel for testing
    channel = new MessageChannel()
    port1 = channel.port1
    port2 = channel.port2
  })

  describe("constructor", () => {
    it("should create transport with MessagePort", () => {
      const transport = new MessagePortTransport(port1)

      expect(transport).toBeInstanceOf(MessagePortTransport)
      expect(transport.isConnected()).toBe(true)
    })

    it("should start the port automatically", () => {
      // MessagePort.start() should be called in constructor
      const startSpy = vi.spyOn(port1, "start")
      new MessagePortTransport(port1)

      expect(startSpy).toHaveBeenCalled()
    })
  })

  describe("send", () => {
    it("should send message through MessagePort", () => {
      const transport = new MessagePortTransport(port1)
      const message = { type: "test", payload: "data" }

      const postMessageSpy = vi.spyOn(port1, "postMessage")
      transport.send(message)

      expect(postMessageSpy).toHaveBeenCalledWith(message)
    })

    it("should throw if transport is disconnected", () => {
      const transport = new MessagePortTransport(port1)
      transport.disconnect()

      expect(() => transport.send({ type: "test" })).toThrow(
        "Cannot send message: MessagePort is disconnected",
      )
    })

    it("should handle postMessage errors", () => {
      const transport = new MessagePortTransport(port1)

      // Mock postMessage to throw
      vi.spyOn(port1, "postMessage").mockImplementation(() => {
        throw new Error("postMessage failed")
      })

      expect(() => transport.send({ type: "test" })).toThrow("postMessage failed")
      // Should mark as disconnected
      expect(transport.isConnected()).toBe(false)
    })
  })

  describe("messageerror policy (lenient)", () => {
    it("keeps the transport connected when messageerror fires", () => {
      const transport = new MessagePortTransport(port1)

      port1.dispatchEvent(new MessageEvent("messageerror", { data: null }))

      expect(transport.isConnected()).toBe(true)
    })

    it("does not call disconnect handler when messageerror fires", () => {
      const transport = new MessagePortTransport(port1)
      const disconnectHandler = vi.fn()
      transport.onDisconnect(disconnectHandler)

      port1.dispatchEvent(new MessageEvent("messageerror", { data: null }))

      expect(disconnectHandler).not.toHaveBeenCalled()
    })

    it("logs messageerror at error level without tearing down the connection", () => {
      const transport = new MessagePortTransport(port1)
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      const errorEvent = new MessageEvent("messageerror", { data: null })

      port1.dispatchEvent(errorEvent)

      expect(consoleErrorSpy).toHaveBeenCalledWith("[DACP ERROR] MessagePort error:", errorEvent)
      expect(transport.isConnected()).toBe(true)

      consoleErrorSpy.mockRestore()
    })

    it("does not close the port or remove listeners when messageerror fires", () => {
      const tracker = createListenerTracker(port1)
      const transport = new MessagePortTransport(port1)
      const closeSpy = vi.spyOn(port1, "close")

      port1.dispatchEvent(new MessageEvent("messageerror", { data: null }))

      expect(closeSpy).not.toHaveBeenCalled()
      expect(tracker.listenerCount("message")).toBe(1)
      expect(tracker.listenerCount("messageerror")).toBe(1)
      expect(transport.isConnected()).toBe(true)
    })

    it("continues to deliver messages after messageerror", () => {
      return new Promise<void>(resolve => {
        const transport1 = new MessagePortTransport(port1)
        const transport2 = new MessagePortTransport(port2)
        const testMessage = { type: "after-messageerror", payload: "still-works" }

        port2.dispatchEvent(new MessageEvent("messageerror", { data: null }))
        expect(transport2.isConnected()).toBe(true)

        transport2.onMessage(msg => {
          expect(msg).toEqual(testMessage)
          resolve()
        })

        transport1.send(testMessage)
      })
    })
  })

  describe("error-driven disconnect (postMessage failure)", () => {
    it("closes the MessagePort when postMessage throws", () => {
      const transport = new MessagePortTransport(port1)
      const closeSpy = vi.spyOn(port1, "close")

      vi.spyOn(port1, "postMessage").mockImplementation(() => {
        throw new Error("postMessage failed")
      })

      expect(() => transport.send({ type: "test" })).toThrow("postMessage failed")

      expect(closeSpy).toHaveBeenCalledTimes(1)
    })

    it("removes message and messageerror listeners when postMessage throws", () => {
      const tracker = createListenerTracker(port1)
      const transport = new MessagePortTransport(port1)

      vi.spyOn(port1, "postMessage").mockImplementation(() => {
        throw new Error("postMessage failed")
      })

      expect(() => transport.send({ type: "test" })).toThrow("postMessage failed")

      expect(tracker.listenerCount("message")).toBe(0)
      expect(tracker.listenerCount("messageerror")).toBe(0)
    })

    it("closes the port exactly once when postMessage throws and disconnectApp runs afterward", () => {
      const instanceId = "temp-error-disconnect-uuid"
      const context = createMinimalWCPContext()
      const transport = new MessagePortTransport(port1)
      const closeSpy = vi.spyOn(port1, "close")

      context.connectionRegistry.messagePortTransports.set(instanceId, transport)
      context.connectionRegistry.transportToInstanceId.set(transport, instanceId)
      transport.onDisconnect(() => disconnectApp(context, instanceId))

      vi.spyOn(port1, "postMessage").mockImplementation(() => {
        throw new Error("postMessage failed")
      })

      expect(() => transport.send({ type: "test" })).toThrow("postMessage failed")

      expect(closeSpy).toHaveBeenCalledTimes(1)
      expect(transport.isConnected()).toBe(false)
    })

    it("removes instance from WCP maps when postMessage throws and onDisconnect triggers disconnectApp", () => {
      const instanceId = "temp-wcp-map-cleanup-uuid"
      const context = createMinimalWCPContext()
      const transport = new MessagePortTransport(port1)

      context.connectionRegistry.messagePortTransports.set(instanceId, transport)
      context.connectionRegistry.transportToInstanceId.set(transport, instanceId)
      context.connectionRegistry.connections.set(instanceId, {
        instanceId,
        appId: "test-app",
        connectionAttemptUuid: "wcp-map-cleanup-uuid",
        messageOrigin: "https://example.com",
        source: {} as Window,
        port: port1,
        connectedAt: new Date(),
      })
      transport.onDisconnect(() => disconnectApp(context, instanceId))

      vi.spyOn(port1, "postMessage").mockImplementation(() => {
        throw new Error("postMessage failed")
      })

      expect(() => transport.send({ type: "test" })).toThrow("postMessage failed")

      expect(context.connectionRegistry.messagePortTransports.has(instanceId)).toBe(false)
      expect(context.connectionRegistry.transportToInstanceId.has(transport)).toBe(false)
      expect(context.connectionRegistry.connections.has(instanceId)).toBe(false)
      expect(context.emit).toHaveBeenCalledWith("appDisconnected", instanceId)
    })
  })

  describe("error-driven disconnect idempotency when connected is already false", () => {
    it("disconnect still closes the port and removes listeners if error path set connected false without cleanup", () => {
      const tracker = createListenerTracker(port1)
      const transport = new MessagePortTransport(port1)
      const closeSpy = vi.spyOn(port1, "close")

      vi.spyOn(port1, "postMessage").mockImplementation(() => {
        throw new Error("postMessage failed")
      })

      expect(() => transport.send({ type: "test" })).toThrow("postMessage failed")
      expect(transport.isConnected()).toBe(false)

      transport.disconnect()

      expect(closeSpy).toHaveBeenCalledTimes(1)
      expect(tracker.listenerCount("message")).toBe(0)
      expect(tracker.listenerCount("messageerror")).toBe(0)
    })

    it("disconnect is a no-op for port close when error path already performed full cleanup", () => {
      const transport = new MessagePortTransport(port1)
      const closeSpy = vi.spyOn(port1, "close")
      const disconnectHandler = vi.fn()
      transport.onDisconnect(disconnectHandler)

      vi.spyOn(port1, "postMessage").mockImplementation(() => {
        throw new Error("postMessage failed")
      })

      expect(() => transport.send({ type: "test" })).toThrow("postMessage failed")

      transport.disconnect()
      transport.disconnect()

      expect(closeSpy).toHaveBeenCalledTimes(1)
      expect(disconnectHandler).toHaveBeenCalledTimes(1)
    })
  })

  describe("onMessage", () => {
    it("should register message handler", () => {
      return new Promise<void>(resolve => {
        const transport1 = new MessagePortTransport(port1)
        const transport2 = new MessagePortTransport(port2)

        const testMessage = { type: "test", payload: "hello" }

        transport2.onMessage(msg => {
          expect(msg).toEqual(testMessage)
          resolve()
        })

        transport1.send(testMessage)
      })
    })

    it("should handle multiple messages", () => {
      return new Promise<void>(resolve => {
        const transport1 = new MessagePortTransport(port1)
        const transport2 = new MessagePortTransport(port2)

        const messages: unknown[] = []
        const expectedMessages = [{ type: "msg1" }, { type: "msg2" }, { type: "msg3" }]

        transport2.onMessage(msg => {
          messages.push(msg)
          if (messages.length === expectedMessages.length) {
            expect(messages).toEqual(expectedMessages)
            resolve()
          }
        })

        expectedMessages.forEach(msg => transport1.send(msg))
      })
    })

    it("should catch errors in message handler", async () => {
      const transport1 = new MessagePortTransport(port1)
      const transport2 = new MessagePortTransport(port2)

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      transport2.onMessage(() => {
        throw new Error("Handler error")
      })

      transport1.send({ type: "test" })

      // Give time for message to be processed
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[DACP ERROR] [MessagePortTransport] Error in message handler:",
        expect.any(Error),
        { messageType: "test" },
      )
      consoleErrorSpy.mockRestore()
    })

    it("should not process messages after disconnect", async () => {
      const transport1 = new MessagePortTransport(port1)
      const transport2 = new MessagePortTransport(port2)

      const handler = vi.fn()
      transport2.onMessage(handler)

      transport2.disconnect()
      transport1.send({ type: "test" })

      // Give time for message (should not arrive)
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe("onDisconnect", () => {
    it("should register disconnect handler", () => {
      const transport = new MessagePortTransport(port1)
      const handler = vi.fn()

      transport.onDisconnect(handler)
      transport.disconnect()

      expect(handler).toHaveBeenCalledTimes(1)
    })

    it("should catch errors in disconnect handler", () => {
      const transport = new MessagePortTransport(port1)
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      transport.onDisconnect(() => {
        throw new Error("Disconnect handler error")
      })

      transport.disconnect()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[DACP ERROR] Error in disconnect handler:",
        expect.any(Error),
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe("isConnected", () => {
    it("should return true when connected", () => {
      const transport = new MessagePortTransport(port1)

      expect(transport.isConnected()).toBe(true)
    })

    it("should return false after disconnect", () => {
      const transport = new MessagePortTransport(port1)

      transport.disconnect()

      expect(transport.isConnected()).toBe(false)
    })
  })

  describe("listener cleanup", () => {
    it("removeEventListener uses the same handler references as addEventListener when disconnect runs", () => {
      const addSpy = vi.spyOn(port1, "addEventListener")
      const removeSpy = vi.spyOn(port1, "removeEventListener")

      const transport = new MessagePortTransport(port1)
      transport.disconnect()

      const messageHandlerAdded = addSpy.mock.calls.find(call => call[0] === "message")?.[1]
      const messageHandlerRemoved = removeSpy.mock.calls.find(call => call[0] === "message")?.[1]

      expect(messageHandlerAdded).toBeDefined()
      expect(messageHandlerRemoved).toBe(messageHandlerAdded)

      const errorHandlerAdded = addSpy.mock.calls.find(call => call[0] === "messageerror")?.[1]
      const errorHandlerRemoved = removeSpy.mock.calls.find(call => call[0] === "messageerror")?.[1]

      expect(errorHandlerAdded).toBeDefined()
      expect(errorHandlerRemoved).toBe(errorHandlerAdded)
    })

    it("removes all message and messageerror listeners from the port after disconnect", () => {
      const activeListeners = new Map<string, Set<EventListenerOrEventListenerObject>>()

      const trackAdd = (type: string, listener: EventListenerOrEventListenerObject) => {
        if (!activeListeners.has(type)) {
          activeListeners.set(type, new Set())
        }
        activeListeners.get(type)!.add(listener)
      }

      const trackRemove = (type: string, listener: EventListenerOrEventListenerObject) => {
        activeListeners.get(type)?.delete(listener)
      }

      vi.spyOn(port1, "addEventListener").mockImplementation((type, listener, options) => {
        trackAdd(type, listener)
        return MessagePort.prototype.addEventListener.call(port1, type, listener, options)
      })

      vi.spyOn(port1, "removeEventListener").mockImplementation((type, listener, options) => {
        trackRemove(type, listener)
        return MessagePort.prototype.removeEventListener.call(port1, type, listener, options)
      })

      const transport = new MessagePortTransport(port1)
      transport.disconnect()

      expect(activeListeners.get("message")?.size ?? 0).toBe(0)
      expect(activeListeners.get("messageerror")?.size ?? 0).toBe(0)
    })
  })

  describe("disconnect", () => {
    it("should close the MessagePort", () => {
      const transport = new MessagePortTransport(port1)
      const closeSpy = vi.spyOn(port1, "close")

      transport.disconnect()

      expect(closeSpy).toHaveBeenCalled()
    })

    it("should set connected to false", () => {
      const transport = new MessagePortTransport(port1)

      transport.disconnect()

      expect(transport.isConnected()).toBe(false)
    })

    it("should be idempotent", () => {
      const transport = new MessagePortTransport(port1)
      const handler = vi.fn()
      transport.onDisconnect(handler)

      transport.disconnect()
      transport.disconnect()
      transport.disconnect()

      // Should only call handler once
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it("should call disconnect handler", () => {
      const transport = new MessagePortTransport(port1)
      const handler = vi.fn()

      transport.onDisconnect(handler)
      transport.disconnect()

      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe("bidirectional communication", () => {
    it("should support bidirectional message exchange", () => {
      return new Promise<void>(resolve => {
        const transport1 = new MessagePortTransport(port1)
        const transport2 = new MessagePortTransport(port2)

        const messages1: unknown[] = []
        const messages2: unknown[] = []

        const checkComplete = () => {
          if (messages1.length === 2 && messages2.length === 2) {
            expect(messages1).toEqual([
              { from: 2, count: 1 },
              { from: 2, count: 2 },
            ])
            expect(messages2).toEqual([
              { from: 1, count: 1 },
              { from: 1, count: 2 },
            ])
            resolve()
          }
        }

        transport1.onMessage(msg => {
          messages1.push(msg)
          checkComplete()
        })

        transport2.onMessage(msg => {
          messages2.push(msg)
          checkComplete()
        })

        transport1.send({ from: 1, count: 1 })
        transport2.send({ from: 2, count: 1 })
        transport1.send({ from: 1, count: 2 })
        transport2.send({ from: 2, count: 2 })
      })
    })
  })

  describe("structured clone behavior", () => {
    it("should clone complex objects", () => {
      return new Promise<void>(resolve => {
        const transport1 = new MessagePortTransport(port1)
        const transport2 = new MessagePortTransport(port2)

        type ComplexMessage = {
          nested: {
            deep: {
              value: string
              array: number[]
              date: Date
            }
          }
        }

        const complexMessage: ComplexMessage = {
          nested: {
            deep: {
              value: "test",
              array: [1, 2, 3],
              date: new Date("2024-01-01"),
            },
          },
        }

        transport2.onMessage((msg: unknown) => {
          const received = msg as ComplexMessage
          expect(received).toEqual(complexMessage)
          // Date should be cloned
          expect(received.nested.deep.date).toBeInstanceOf(Date)
          expect(received.nested.deep.date.getTime()).toBe(
            complexMessage.nested.deep.date.getTime(),
          )
          resolve()
        })

        transport1.send(complexMessage)
      })
    })

    it("should prevent shared references", () => {
      return new Promise<void>(resolve => {
        const transport1 = new MessagePortTransport(port1)
        const transport2 = new MessagePortTransport(port2)

        type NestedMessage = { nested: { value: string } }
        const original: NestedMessage = { nested: { value: "original" } }

        transport2.onMessage((msg: unknown) => {
          const received = msg as NestedMessage
          // Modify received message
          received.nested.value = "modified"

          // Original should be unchanged (because structuredClone creates a copy)
          expect(original.nested.value).toBe("original")
          resolve()
        })

        transport1.send(original)
      })
    })
  })
})
