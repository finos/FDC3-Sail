import { describe, expect, it } from "vite-plus/test"

import { shapeForRecipient } from "../shape-for-recipient"

const metadata = { source: { appId: "A", instanceId: "a-1" }, timestamp: "t", traceId: "x" }

const broadcastEvent = {
  type: "broadcastEvent",
  meta: { eventUuid: "e", timestamp: "t", destination: { instanceId: "b-1" } },
  payload: {
    channelId: "one",
    context: { type: "fdc3.instrument" },
    originatingApp: { appId: "A", instanceId: "a-1" },
    metadata,
  },
}

describe("shapeForRecipient", () => {
  it("passes messages to a 3.0 recipient unchanged", () => {
    expect(shapeForRecipient(broadcastEvent, "3.0")).toBe(broadcastEvent)
  })

  it("drops 3.0 metadata for a 2.2 recipient and keeps originatingApp", () => {
    const shaped = shapeForRecipient(broadcastEvent, "2.2") as typeof broadcastEvent
    expect(shaped.payload).not.toHaveProperty("metadata")
    expect(shaped.payload.originatingApp).toEqual({ appId: "A", instanceId: "a-1" })
    expect(shaped.meta).toBe(broadcastEvent.meta)
    expect(broadcastEvent.payload.metadata).toBe(metadata)
  })

  it("drops metadata and resultMetadata from 2.2 responses", () => {
    const getCurrentContext = shapeForRecipient(
      { type: "getCurrentContextResponse", meta: {}, payload: { context: null, metadata: null } },
      "2.2",
    )
    expect(getCurrentContext).toEqual({
      type: "getCurrentContextResponse",
      meta: {},
      payload: { context: null },
    })
    const raiseIntentResult = shapeForRecipient(
      {
        type: "raiseIntentResultResponse",
        meta: {},
        payload: { intentResult: {}, resultMetadata: metadata },
      },
      "2.2",
    )
    expect(raiseIntentResult).toEqual({
      type: "raiseIntentResultResponse",
      meta: {},
      payload: { intentResult: {} },
    })
  })

  it("never sends a 2.2 recipient a 3.0-only event", () => {
    const event = {
      type: "contextClearedEvent",
      meta: {},
      payload: { channelId: "one", contextType: null },
    }
    expect(shapeForRecipient(event, "2.2")).toBeUndefined()
    expect(shapeForRecipient(event, "3.0")).toBe(event)
  })

  it("leaves messages 2.2 shares with 3.0 alone", () => {
    const event = { type: "channelChangedEvent", meta: {}, payload: { currentChannelId: "one" } }
    expect(shapeForRecipient(event, "2.2")).toBe(event)
  })
})
