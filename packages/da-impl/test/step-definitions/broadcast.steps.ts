import { When } from "@cucumber/cucumber"
import { CustomWorld } from "../world"
import { createMeta } from "./generic.steps"
import {} from "@finos/fdc3-standard"
import { handleResolve } from "@finos/cucumber-testing-steps"
import { contextMap } from "./generic.steps"
import { BrowserTypes } from "@finos/fdc3-schema"

type AddContextListenerRequest = BrowserTypes.AddContextListenerRequest
type ContextListenerUnsubscribeRequest =
  BrowserTypes.ContextListenerUnsubscribeRequest
type BroadcastRequest = BrowserTypes.BroadcastRequest
type GetCurrentContextRequest = BrowserTypes.GetCurrentContextRequest

/** Parses `iat/exp/jti` from a single Gherkin string (three slash-separated parts). */
function parseAntiReplayClaims(claims: string): {
  iat: number
  exp: number
  jti: string
} {
  const parts = claims.split("/")
  if (parts.length !== 3) {
    throw new Error(
      `antiReplay claims must be three slash-separated parts (iat/exp/jti), got: ${claims}`,
    )
  }
  const iat = Number(parts[0])
  const exp = Number(parts[1])
  const jti = parts[2]
  if (!Number.isFinite(iat) || !Number.isFinite(exp)) {
    throw new Error(
      `antiReplay iat and exp must be finite numbers, got iat=${parts[0]}, exp=${parts[1]}`,
    )
  }
  return { iat, exp, jti }
}

When(
  "{string} adds a context listener on {string} with type {string}",
  function (
    this: CustomWorld,
    app: string,
    channelId: string,
    contextType: string,
  ) {
    const meta = createMeta(this, app)
    const uuid = this.sc.getInstanceUUID(meta.source)!
    const message = {
      meta,
      payload: {
        channelId: handleResolve(channelId, this),
        contextType: handleResolve(contextType, this),
      },
      type: "addContextListenerRequest",
    } as AddContextListenerRequest

    this.sc.receive(message, uuid)
  },
)

When(
  "{string} adds a user-channel context listener with type {string}",
  function (this: CustomWorld, app: string, contextType: string) {
    const meta = createMeta(this, app)
    const uuid = this.sc.getInstanceUUID(meta.source)!
    const message = {
      meta,
      payload: {
        channelId: null, // null indicates it's added at the DesktopAgent level and listens on the current user-channel
        contextType: handleResolve(contextType, this),
      },
      type: "addContextListenerRequest",
    } as AddContextListenerRequest

    this.sc.receive(message, uuid)
  },
)

When(
  "{string} adds a context listener on {string} with types {string}",
  function (
    this: CustomWorld,
    app: string,
    channelId: string,
    contextTypes: string,
  ) {
    const meta = createMeta(this, app)
    const uuid = this.sc.getInstanceUUID(meta.source)!
    const types = contextTypes.split(",").map((t) => t.trim())
    const message = {
      meta,
      payload: {
        channelId: handleResolve(channelId, this),
        contextTypes: types,
      },
      type: "addContextListenerRequest",
    } as unknown as AddContextListenerRequest

    this.sc.receive(message, uuid)
  },
)

When(
  "{string} asks for the latest context on {string} with type {string}",
  function (
    this: CustomWorld,
    app: string,
    channelId: string,
    contextType: string,
  ) {
    const meta = createMeta(this, app)
    const uuid = this.sc.getInstanceUUID(meta.source)!
    const message = {
      meta,
      payload: {
        channelId: handleResolve(channelId, this),
        contextType,
      },
      type: "getCurrentContextRequest",
    } as GetCurrentContextRequest

    this.sc.receive(message, uuid)
  },
)

When(
  "{string} removes context listener with id {string}",
  function (this: CustomWorld, app: string, id: string) {
    const meta = createMeta(this, app)
    const uuid = this.sc.getInstanceUUID(meta.source)!

    const message = {
      meta,
      payload: {
        listenerUUID: id,
      },
      type: "contextListenerUnsubscribeRequest",
    } as ContextListenerUnsubscribeRequest

    this.sc.receive(message, uuid)
  },
)

When(
  "{string} broadcasts {string} on {string}",
  function (
    this: CustomWorld,
    app: string,
    contextType: string,
    channelId: string,
  ) {
    const meta = createMeta(this, app)
    const uuid = this.sc.getInstanceUUID(meta.source)!

    const message = {
      meta,
      payload: {
        channelId: handleResolve(channelId, this),
        context: contextMap[contextType],
      },
      type: "broadcastRequest",
    } as BroadcastRequest

    this.sc.receive(message, uuid)
  },
)

When(
  "{string} broadcasts {string} on {string} with metadata traceId {string} signature {string} antiReplay claims {string} and custom key {string}",
  function (
    this: CustomWorld,
    app: string,
    contextType: string,
    channelId: string,
    traceId: string,
    signature: string,
    antiReplayClaims: string,
    customKey: string,
  ) {
    const meta = createMeta(this, app)
    const uuid = this.sc.getInstanceUUID(meta.source)!

    const message = {
      meta,
      payload: {
        channelId: handleResolve(channelId, this),
        context: contextMap[contextType],
        metadata: {
          traceId: handleResolve(traceId, this),
          signature: {
            signature: handleResolve(signature, this) + " (signature part)",
            protected: handleResolve(signature, this) + " (protected part)",
          },
          custom: { region: handleResolve(customKey, this) },
          antiReplay: parseAntiReplayClaims(antiReplayClaims),
        },
      },
      type: "broadcastRequest",
    } as BroadcastRequest

    this.sc.receive(message, uuid)
  },
)

When(
  "{string} broadcasts {string} on {string} without metadata",
  function (
    this: CustomWorld,
    app: string,
    contextType: string,
    channelId: string,
  ) {
    const meta = createMeta(this, app)
    const uuid = this.sc.getInstanceUUID(meta.source)!

    const message = {
      meta,
      payload: {
        channelId: handleResolve(channelId, this),
        context: contextMap[contextType],
      },
      type: "broadcastRequest",
    } as BroadcastRequest

    this.sc.receive(message, uuid)
  },
)
