import { describe, it, expect, vi } from "vite-plus/test"
import {
  InMemoryTransport,
  createInMemoryTransportPair,
} from "../../test/support/in-memory-transport"

/** Planned API for spec B — cast until GREEN wires onDeliveryError on InMemoryTransport */
type InMemoryTransportWithDeliveryError = InMemoryTransport & {
  onDeliveryError(handler: (error: unknown) => void): void
}

function registerOnDeliveryError(
  transport: InMemoryTransport,
  handler: (error: unknown) => void,
): void {
  ;(transport as InMemoryTransportWithDeliveryError).onDeliveryError(handler)
}

async function flushAsyncDelivery(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0))
}

describe("InMemoryTransport", () => {
  describe("createInMemoryTransportPair", () => {
    it("should create two linked transports", () => {
      const [transport1, transport2] = createInMemoryTransportPair()

      expect(transport1).toBeInstanceOf(InMemoryTransport)
      expect(transport2).toBeInstanceOf(InMemoryTransport)
      expect(transport1.isConnected()).toBe(true)
      expect(transport2.isConnected()).toBe(true)
    })

    it("should allow bidirectional communication", async () => {
      const [transport1, transport2] = createInMemoryTransportPair()

      const handler1 = vi.fn()
      const handler2 = vi.fn()

      transport1.onMessage(handler1)
      transport2.onMessage(handler2)

      const message1 = { type: "test", payload: "from transport2" }
      const message2 = { type: "test", payload: "from transport1" }

      transport2.send(message1)
      transport1.send(message2)

      // Wait for async delivery
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(handler1).toHaveBeenCalledWith(message1)
      expect(handler2).toHaveBeenCalledWith(message2)
    })

    it("should deep clone messages to prevent shared references", async () => {
      const [transport1, transport2] = createInMemoryTransportPair()

      let receivedMessage: { nested: { value: string } } | undefined
      transport2.onMessage(msg => {
        receivedMessage = msg as { nested: { value: string } }
      })

      const originalMessage = { nested: { value: "original" } }
      transport1.send(originalMessage)

      await new Promise(resolve => setTimeout(resolve, 10))

      // Modify original message
      originalMessage.nested.value = "modified"

      if (!receivedMessage) {
        throw new Error("Expected message to be received")
      }

      // Received message should not be affected
      expect(receivedMessage.nested.value).toBe("original")
    })
  })

  describe("send", () => {
    it("should throw if transport is disconnected", () => {
      const [transport1] = createInMemoryTransportPair()
      transport1.disconnect()

      expect(() => transport1.send({ type: "test" })).toThrow(
        "Cannot send message: InMemoryTransport is disconnected",
      )
    })

    it("should throw if peer is disconnected", () => {
      const [transport1, transport2] = createInMemoryTransportPair()
      transport2.disconnect()

      expect(() => transport1.send({ type: "test" })).toThrow(
        "Cannot send message: Peer transport is disconnected",
      )
    })

    it("should deliver messages asynchronously", async () => {
      const [transport1, transport2] = createInMemoryTransportPair()

      const handler = vi.fn()
      transport2.onMessage(handler)

      transport1.send({ type: "test" })

      // Should not be called synchronously
      expect(handler).not.toHaveBeenCalled()

      // Wait for async delivery
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe("send delivery guarantees", () => {
    describe("spec A — uncloneable payload fails before returning", () => {
      it("throws synchronously when message contains a function property", () => {
        const [transport1, transport2] = createInMemoryTransportPair()
        const peerHandler = vi.fn()
        transport2.onMessage(peerHandler)

        const messageWithFunction = { fn: () => {} }

        expect(() => transport1.send(messageWithFunction)).toThrow()
        expect(peerHandler).not.toHaveBeenCalled()
      })

      it("throws synchronously when message has a circular reference", () => {
        const [transport1, transport2] = createInMemoryTransportPair()
        const peerHandler = vi.fn()
        transport2.onMessage(peerHandler)

        const circular: Record<string, unknown> = { type: "test" }
        circular.self = circular

        expect(() => transport1.send(circular)).toThrow()
        expect(peerHandler).not.toHaveBeenCalled()
      })

      it("throws before setTimeout delivery so peer onMessage is never scheduled", async () => {
        const [transport1, transport2] = createInMemoryTransportPair()
        const peerHandler = vi.fn()
        transport2.onMessage(peerHandler)

        expect(() => transport1.send({ fn: () => {} })).toThrow()

        await flushAsyncDelivery()
        expect(peerHandler).not.toHaveBeenCalled()
      })
    })

    describe("spec B — peer handler failure observable to sender", () => {
      it("notifies sender via onDeliveryError when peer handler throws synchronously", async () => {
        const [transport1, transport2] = createInMemoryTransportPair()
        const onDeliveryError = vi.fn()
        registerOnDeliveryError(transport1, onDeliveryError)

        transport2.onMessage(() => {
          throw new Error("handler failed")
        })

        transport1.send({ type: "test" })
        await flushAsyncDelivery()

        expect(onDeliveryError).toHaveBeenCalledTimes(1)
        expect(onDeliveryError).toHaveBeenCalledWith(expect.any(Error))
        expect(onDeliveryError.mock.calls[0]?.[0]).toMatchObject({
          message: "handler failed",
        })
      })

      it("notifies sender via onDeliveryError when peer handler returns a rejected promise", async () => {
        const [transport1, transport2] = createInMemoryTransportPair()
        const onDeliveryError = vi.fn()
        registerOnDeliveryError(transport1, onDeliveryError)

        transport2.onMessage(() => Promise.reject(new Error("async handler failed")))

        transport1.send({ type: "test" })
        await flushAsyncDelivery()

        expect(onDeliveryError).toHaveBeenCalledTimes(1)
        expect(onDeliveryError).toHaveBeenCalledWith(expect.any(Error))
        expect(onDeliveryError.mock.calls[0]?.[0]).toMatchObject({
          message: "async handler failed",
        })
      })
    })

    describe("spec C — happy path", () => {
      it("delivers a deep clone asynchronously without shared references", async () => {
        const [transport1, transport2] = createInMemoryTransportPair()
        const peerHandler = vi.fn()
        transport2.onMessage(peerHandler)

        const originalMessage = { nested: { value: "original" }, tags: ["a"] }
        transport1.send(originalMessage)

        expect(peerHandler).not.toHaveBeenCalled()

        await flushAsyncDelivery()

        expect(peerHandler).toHaveBeenCalledTimes(1)
        const received = peerHandler.mock.calls[0]?.[0] as typeof originalMessage
        expect(received).not.toBe(originalMessage)
        expect(received.nested).not.toBe(originalMessage.nested)
        expect(received.tags).not.toBe(originalMessage.tags)
        expect(received.nested.value).toBe("original")

        originalMessage.nested.value = "mutated"
        expect(received.nested.value).toBe("original")
      })
    })
  })

  describe("onMessage", () => {
    it("should register message handler", async () => {
      const [transport1, transport2] = createInMemoryTransportPair()

      const handler = vi.fn()
      transport2.onMessage(handler)

      transport1.send({ type: "test" })

      await new Promise(resolve => setTimeout(resolve, 10))

      expect(handler).toHaveBeenCalledWith({ type: "test" })
    })

    it("should catch errors in message handler", async () => {
      const [transport1, transport2] = createInMemoryTransportPair()

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      transport2.onMessage(() => {
        throw new Error("Handler error")
      })

      transport1.send({ type: "test" })

      await new Promise(resolve => setTimeout(resolve, 10))

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[DACP ERROR] Error in peer message handler:",
        expect.any(Error),
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe("onDisconnect", () => {
    it("should register disconnect handler", () => {
      const [transport1] = createInMemoryTransportPair()

      const handler = vi.fn()
      transport1.onDisconnect(handler)

      transport1.disconnect()

      expect(handler).toHaveBeenCalledTimes(1)
    })

    it("should catch errors in disconnect handler", () => {
      const [transport1] = createInMemoryTransportPair()

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      transport1.onDisconnect(() => {
        throw new Error("Disconnect handler error")
      })

      transport1.disconnect()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[DACP ERROR] Error in disconnect handler:",
        expect.any(Error),
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe("isConnected", () => {
    it("should return true when connected", () => {
      const [transport1] = createInMemoryTransportPair()

      expect(transport1.isConnected()).toBe(true)
    })

    it("should return false after disconnect", () => {
      const [transport1] = createInMemoryTransportPair()

      transport1.disconnect()

      expect(transport1.isConnected()).toBe(false)
    })
  })

  describe("disconnect", () => {
    it("should set connected to false", () => {
      const [transport1] = createInMemoryTransportPair()

      transport1.disconnect()

      expect(transport1.isConnected()).toBe(false)
    })

    it("should be idempotent", () => {
      const [transport1] = createInMemoryTransportPair()

      const handler = vi.fn()
      transport1.onDisconnect(handler)

      transport1.disconnect()
      transport1.disconnect()
      transport1.disconnect()

      // Should only call handler once
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it("should clear peer reference", () => {
      const [transport1, transport2] = createInMemoryTransportPair()

      transport1.disconnect()

      // transport2 should not receive messages after transport1 disconnects
      const handler = vi.fn()
      transport2.onMessage(handler)

      expect(() => transport2.send({ type: "test" })).toThrow(
        "Cannot send message: Peer transport is disconnected",
      )
    })
  })

  describe("disconnect peer teardown", () => {
    it("marks the peer transport disconnected when the local endpoint disconnects", async () => {
      const [transportA, transportB] = createInMemoryTransportPair()

      transportA.disconnect()
      await flushAsyncDelivery()

      expect(transportA.isConnected()).toBe(false)
      expect(transportB.isConnected()).toBe(false)
    })

    it("when the peer initiates disconnect, the surviving endpoint reports disconnected and cannot send", async () => {
      const [transportA, transportB] = createInMemoryTransportPair()
      const onDisconnectA = vi.fn()
      transportA.onDisconnect(onDisconnectA)

      transportB.disconnect()
      await flushAsyncDelivery()

      expect(transportA.isConnected()).toBe(false)
      expect(transportB.isConnected()).toBe(false)
      expect(onDisconnectA).toHaveBeenCalledTimes(1)
      expect(() => transportA.send({ type: "test" })).toThrow(
        "Cannot send message: InMemoryTransport is disconnected",
      )
      expect(() => transportB.send({ type: "test" })).toThrow(
        "Cannot send message: InMemoryTransport is disconnected",
      )
    })

    it("invokes each side disconnect handler at most once when one endpoint disconnects", async () => {
      const [transportA, transportB] = createInMemoryTransportPair()
      const onDisconnectA = vi.fn()
      const onDisconnectB = vi.fn()
      transportA.onDisconnect(onDisconnectA)
      transportB.onDisconnect(onDisconnectB)

      transportA.disconnect()
      await flushAsyncDelivery()

      expect(onDisconnectA).toHaveBeenCalledTimes(1)
      expect(onDisconnectB).toHaveBeenCalledTimes(1)
    })

    it("clears peer references on both endpoints so neither can send after disconnect", async () => {
      const [transportA, transportB] = createInMemoryTransportPair()

      transportA.disconnect()
      await flushAsyncDelivery()

      expect(() => transportA.send({ type: "test" })).toThrow(
        "Cannot send message: InMemoryTransport is disconnected",
      )
      expect(() => transportB.send({ type: "test" })).toThrow(
        "Cannot send message: InMemoryTransport is disconnected",
      )
    })

    it("does not re-invoke disconnect handlers when local endpoint disconnects after peer disconnected", async () => {
      const [transportA, transportB] = createInMemoryTransportPair()
      const onDisconnectA = vi.fn()
      const onDisconnectB = vi.fn()
      transportA.onDisconnect(onDisconnectA)
      transportB.onDisconnect(onDisconnectB)

      transportB.disconnect()
      await flushAsyncDelivery()

      expect(onDisconnectA).toHaveBeenCalledTimes(1)
      expect(onDisconnectB).toHaveBeenCalledTimes(1)

      transportA.disconnect()
      await flushAsyncDelivery()

      expect(onDisconnectA).toHaveBeenCalledTimes(1)
      expect(onDisconnectB).toHaveBeenCalledTimes(1)
    })

    it("is idempotent when disconnect is called again on an already-disconnected endpoint", async () => {
      const [transportA, transportB] = createInMemoryTransportPair()
      const onDisconnectA = vi.fn()
      const onDisconnectB = vi.fn()
      transportA.onDisconnect(onDisconnectA)
      transportB.onDisconnect(onDisconnectB)

      transportA.disconnect()
      await flushAsyncDelivery()

      expect(onDisconnectA).toHaveBeenCalledTimes(1)
      expect(onDisconnectB).toHaveBeenCalledTimes(1)

      transportA.disconnect()
      await flushAsyncDelivery()

      expect(onDisconnectA).toHaveBeenCalledTimes(1)
      expect(onDisconnectB).toHaveBeenCalledTimes(1)
    })
  })

  describe("rapid message exchange", () => {
    it("should handle rapid back-and-forth without stack overflow", async () => {
      const [transport1, transport2] = createInMemoryTransportPair()

      let count1 = 0
      let count2 = 0
      const maxMessages = 100

      transport1.onMessage(() => {
        count1++
        if (count1 < maxMessages) {
          transport1.send({ type: "ping", count: count1 })
        }
      })

      transport2.onMessage(() => {
        count2++
        if (count2 < maxMessages) {
          transport2.send({ type: "pong", count: count2 })
        }
      })

      // Start the exchange
      transport1.send({ type: "ping", count: 0 })

      // Wait until both sides have received at least one message
      await vi.waitFor(
        () => {
          expect(count1).toBeGreaterThan(0)
          expect(count2).toBeGreaterThan(0)
        },
        { timeout: 5000 },
      )
    })
  })
})
