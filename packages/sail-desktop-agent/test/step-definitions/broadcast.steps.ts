import { When } from "@cucumber/cucumber"
import { CustomWorld } from "../world/index.ts"
import { createMeta, getAppInstanceId } from "./generic.steps"
import { handleResolve } from "../support/testing-utils"
import { contextMap } from "./generic.steps"
import { BrowserTypes } from "@finos/fdc3-schema"
import { AppInstanceState } from "../../src/state/types"
import { getInstance } from "../../src/state/selectors"
import { connectInstance, updateInstanceState } from "../../src/state/mutators"

type AddContextListenerRequest = BrowserTypes.AddContextListenerRequest
type ContextListenerUnsubscribeRequest = BrowserTypes.ContextListenerUnsubscribeRequest
type BroadcastRequest = BrowserTypes.BroadcastRequest
type GetCurrentContextRequest = BrowserTypes.GetCurrentContextRequest

/**
 * Helper to ensure app instance exists and is connected before sending messages
 */
function ensureAppInstance(world: CustomWorld, appStr: string): string {
  const instanceId = getAppInstanceId(world, appStr)

  const state = world.getState()
  const instance = getInstance(state, instanceId)
  if (!instance) {
    const meta = createMeta(world, appStr)
    world.updateState(currentState =>
      updateInstanceState(
        connectInstance(currentState, {
          instanceId,
          appId: meta.source.appId,
          metadata: {
            name: meta.source.appId,
          },
        }),
        instanceId,
        AppInstanceState.CONNECTED,
      ),
    )
  }

  return instanceId
}

When(
  "{string} adds a context listener on {string} with type {string} [fdc3.addContextListener]",
  async function (this: CustomWorld, app: string, channelId: string, contextType: string) {
    ensureAppInstance(this, app)
    const meta = createMeta(this, app)

    const message: AddContextListenerRequest = {
      meta,
      payload: {
        channelId: handleResolve(channelId, this) ?? null,
        contextType: handleResolve(contextType, this) ?? null,
      },
      type: "addContextListenerRequest",
    }

    await this.mockTransport.receiveMessage(message)

    const lastMessage = this.mockTransport.getLastMessage()
    const listenerUUID = (lastMessage?.msg?.payload as { listenerUUID?: string } | undefined)
      ?.listenerUUID
    if (listenerUUID) {
      this.props.lastContextListenerId = listenerUUID
      const instanceId = getAppInstanceId(this, app)
      const byInstance =
        (this.props.contextListenersByInstance as Record<string, string> | undefined) ?? {}
      byInstance[instanceId] = listenerUUID
      this.props.contextListenersByInstance = byInstance
    }
  },
)

When(
  "{string} asks for the latest context on {string} with type {string} [fdc3.getCurrentContext]",
  async function (this: CustomWorld, app: string, channelId: string, contextType: string) {
    ensureAppInstance(this, app)
    const meta = createMeta(this, app)

    const message: GetCurrentContextRequest = {
      meta,
      payload: {
        channelId: handleResolve(channelId, this) as string,
        contextType,
      },
      type: "getCurrentContextRequest",
    }

    await this.mockTransport.receiveMessage(message)
  },
)

When(
  "{string} removes context listener with id {string} [fdc3.removeContextListener]",
  async function (this: CustomWorld, app: string, id: string) {
    ensureAppInstance(this, app)
    const meta = createMeta(this, app)

    const resolvedId = handleResolve(id, this) ?? id

    const message: ContextListenerUnsubscribeRequest = {
      meta,
      payload: {
        listenerUUID: resolvedId,
      },
      type: "contextListenerUnsubscribeRequest",
    }

    await this.mockTransport.receiveMessage(message)
  },
)

When(
  "{string} broadcasts {string} on {string} [fdc3.broadcast]",
  async function (this: CustomWorld, app: string, contextType: string, channelId: string) {
    ensureAppInstance(this, app)
    const meta = createMeta(this, app)

    const message: BroadcastRequest = {
      meta,
      payload: {
        channelId: handleResolve(channelId, this) as string,
        context: contextMap[contextType]!,
      },
      type: "broadcastRequest",
    }

    this.props.lastInboundRequestAt = Date.now()
    await this.mockTransport.receiveMessage(message)
  },
)

When(
  "{string} broadcasts {string} on {string} with metadata traceId {string} [fdc3.broadcast]",
  async function (
    this: CustomWorld,
    app: string,
    contextType: string,
    channelId: string,
    traceId: string,
  ) {
    ensureAppInstance(this, app)
    const meta = createMeta(this, app)

    const message = {
      meta,
      payload: {
        channelId: handleResolve(channelId, this) as string,
        context: contextMap[contextType],
        metadata: { traceId: handleResolve(traceId, this) as string },
      },
      type: "broadcastRequest" as const,
    } as BroadcastRequest

    this.props.lastInboundRequestAt = Date.now()
    await this.mockTransport.receiveMessage(message)
  },
)

When(
  "{string} broadcasts {string} without channel id [fdc3.broadcast]",
  async function (this: CustomWorld, app: string, contextType: string) {
    ensureAppInstance(this, app)
    const meta = createMeta(this, app)

    // `BroadcastRequestPayload` requires `channelId` on the wire (2.2 and 3.0 schema). This
    // simulates a malformed message missing it, to prove the DA rejects it instead of silently
    // falling back to the sender's current user channel.
    const message = {
      meta,
      payload: {
        context: contextMap[contextType],
      },
      type: "broadcastRequest" as const,
    } as BroadcastRequest

    await this.mockTransport.receiveMessage(message)
  },
)
