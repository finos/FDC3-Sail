import { Given, When } from "@cucumber/cucumber"
import { CustomWorld } from "../world/index.ts"
import { createMeta, getAppInstanceId } from "./generic.steps"
import { BrowserTypes } from "@finos/fdc3-schema"
import { handleResolve } from "../support/testing-utils"
import { AppInstanceState } from "../../src/state/types"
import { getInstance } from "../../src/state/selectors"
import {
  connectInstance,
  connectInstanceToPrivateChannel,
  updateInstanceState,
} from "../../src/state/mutators"

type CreatePrivateChannelRequest = BrowserTypes.CreatePrivateChannelRequest
type PrivateChannelAddEventListenerRequest = BrowserTypes.PrivateChannelAddEventListenerRequest
type PrivateChannelUnsubscribeEventListenerRequest =
  BrowserTypes.PrivateChannelUnsubscribeEventListenerRequest
type PrivateChannelDisconnectRequest = BrowserTypes.PrivateChannelDisconnectRequest

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

/**
 * Fixture grant for scenarios that exercise private-channel relay/lifecycle after
 * membership exists. Production grant for a non-creator is via intent-result
 * (`handleIntentResultRequest` → `connectInstanceToPrivateChannel`).
 */
Given(
  "{string} is granted access to private channel {string}",
  function (this: CustomWorld, app: string, channelId: string) {
    const instanceId = ensureAppInstance(this, app)
    const resolvedChannelId = handleResolve(channelId, this) ?? channelId
    this.updateState(state => connectInstanceToPrivateChannel(state, resolvedChannelId, instanceId))
  },
)

When(
  "{string} creates a private channel [fdc3.createPrivateChannel]",
  async function (this: CustomWorld, app: string) {
    ensureAppInstance(this, app)
    const meta = createMeta(this, app)

    const message: CreatePrivateChannelRequest = {
      meta,
      payload: {},
      type: "createPrivateChannelRequest",
    }

    await this.mockTransport.receiveMessage(message)

    const lastMessage = this.mockTransport.getLastMessage()
    const payload = lastMessage?.msg?.payload as
      | { channel?: { id?: string }; privateChannel?: { id?: string } }
      | undefined
    const channelId = payload?.privateChannel?.id ?? payload?.channel?.id
    if (channelId) {
      this.props.lastPrivateChannelId = channelId
    }
  },
)

When(
  "{string} removes event listener {string} [PrivateChannel.removeContextListener]",
  async function (this: CustomWorld, app: string, listenerUUID: string) {
    ensureAppInstance(this, app)
    const meta = createMeta(this, app)

    const message: PrivateChannelUnsubscribeEventListenerRequest = {
      meta,
      payload: {
        listenerUUID: handleResolve(listenerUUID, this) ?? listenerUUID,
      },
      type: "privateChannelUnsubscribeEventListenerRequest",
    }

    await this.mockTransport.receiveMessage(message)
  },
)

When(
  "{string} adds a catch-all private channel event listener on {string} [PrivateChannel.addEventListener]",
  async function (this: CustomWorld, app: string, channelId: string) {
    ensureAppInstance(this, app)
    const meta = createMeta(this, app)

    const message: PrivateChannelAddEventListenerRequest = {
      meta,
      payload: {
        privateChannelId: handleResolve(channelId, this) as string,
        listenerType: null,
      },
      type: "privateChannelAddEventListenerRequest",
    }

    await this.mockTransport.receiveMessage(message)

    const lastMessage = this.mockTransport.getLastMessage()
    const listenerUUID = (lastMessage?.msg?.payload as { listenerUUID?: string } | undefined)
      ?.listenerUUID
    if (listenerUUID) {
      this.props.lastPrivateChannelEventListenerId = listenerUUID
    }
  },
)

When(
  "{string} adds an {string} event listener on {string} [PrivateChannel.addEventListener]",
  async function (this: CustomWorld, app: string, listenerType: string, channelId: string) {
    ensureAppInstance(this, app)
    const meta = createMeta(this, app)

    const message: PrivateChannelAddEventListenerRequest = {
      meta,
      payload: {
        privateChannelId: handleResolve(channelId, this) as string,
        listenerType:
          listenerType as BrowserTypes.PrivateChannelAddEventListenerRequest["payload"]["listenerType"],
      },
      type: "privateChannelAddEventListenerRequest",
    }

    await this.mockTransport.receiveMessage(message)

    const lastMessage = this.mockTransport.getLastMessage()
    const listenerUUID = (lastMessage?.msg?.payload as { listenerUUID?: string } | undefined)
      ?.listenerUUID
    if (listenerUUID) {
      this.props.lastPrivateChannelEventListenerId = listenerUUID
    }
  },
)

When(
  "{string} disconnects from private channel {string} [PrivateChannel.disconnect]",
  async function (this: CustomWorld, app: string, channelId: string) {
    ensureAppInstance(this, app)
    const meta = createMeta(this, app)

    const message: PrivateChannelDisconnectRequest = {
      meta,
      payload: {
        channelId: handleResolve(channelId, this) as string,
      },
      type: "privateChannelDisconnectRequest",
    }

    await this.mockTransport.receiveMessage(message)
  },
)
