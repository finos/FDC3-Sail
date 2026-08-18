import { When } from "@cucumber/cucumber"
import { CustomWorld } from "../world/index.ts"
import { createMeta, getAppInstanceId } from "./generic.steps"
import { BrowserTypes } from "@finos/fdc3-schema"
import { handleResolve } from "../support/testing-utils"
import { AppInstanceState } from "../../src/state/types"
import { getInstance } from "../../src/state/selectors"
import { connectInstance, updateInstanceState } from "../../src/state/mutators"

type GetUserChannelsRequest = BrowserTypes.GetUserChannelsRequest
type GetCurrentChannelRequest = BrowserTypes.GetCurrentChannelRequest
type JoinUserChannelRequest = BrowserTypes.JoinUserChannelRequest
type LeaveCurrentChannelRequest = BrowserTypes.LeaveCurrentChannelRequest
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
  "{string} gets the list of user channels [fdc3.getUserChannels]",
  async function (this: CustomWorld, app: string) {
    ensureAppInstance(this, app)
    const meta = createMeta(this, app)

    const message: GetUserChannelsRequest = {
      meta,
      payload: {},
      type: "getUserChannelsRequest",
    }

    await this.mockTransport.receiveMessage(message)
  },
)

When(
  "{string} gets the current user channel [fdc3.getCurrentChannel]",
  async function (this: CustomWorld, app: string) {
    ensureAppInstance(this, app)
    const meta = createMeta(this, app)

    const message: GetCurrentChannelRequest = {
      meta,
      payload: {},
      type: "getCurrentChannelRequest",
    }

    await this.mockTransport.receiveMessage(message)
  },
)

When(
  "{string} leaves the current user channel [fdc3.leaveCurrentChannel]",
  async function (this: CustomWorld, app: string) {
    ensureAppInstance(this, app)
    const meta = createMeta(this, app)

    const message: LeaveCurrentChannelRequest = {
      meta,
      payload: {},
      type: "leaveCurrentChannelRequest",
    }

    await this.mockTransport.receiveMessage(message)
  },
)

When(
  "{string} joins user channel {string} [fdc3.joinUserChannel]",
  async function (this: CustomWorld, app: string, channel: string) {
    ensureAppInstance(this, app)
    const meta = createMeta(this, app)

    const message: JoinUserChannelRequest = {
      meta,
      payload: {
        channelId: handleResolve(channel, this) as string,
      },
      type: "joinUserChannelRequest",
    }

    await this.mockTransport.receiveMessage(message)
  },
)

When(
  "{string} gets the latest context on {string} with type {string} [fdc3.getCurrentContext]",
  async function (this: CustomWorld, app: string, channel: string, type: string) {
    ensureAppInstance(this, app)
    const meta = createMeta(this, app)

    const message: GetCurrentContextRequest = {
      meta,
      payload: {
        channelId: handleResolve(channel, this) as string,
        contextType: handleResolve(type, this) ?? null,
      },
      type: "getCurrentContextRequest",
    }

    await this.mockTransport.receiveMessage(message)
  },
)
