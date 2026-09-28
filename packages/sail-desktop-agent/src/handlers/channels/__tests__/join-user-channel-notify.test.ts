/**
 * Reproduction + guards for channelChanged emission on join (#2 / #11).
 */

import { describe, expect, it, vi } from "vite-plus/test"
import type { BrowserTypes } from "@finos/fdc3"

import { MockTransport } from "../../../__tests__/utils/mock-transport"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../../agent/default-user-channels"
import { createInitialState } from "../../../state/initial-state"
import {
  addContextListener,
  connectInstance,
  joinUserChannel,
  storeContext,
  updateInstanceState,
} from "../../../state/mutators"
import { AppInstanceState } from "../../../state/types"
import {
  createDACPTestParams,
  createDacpRequestMeta,
  withResponseDispatcher,
} from "../../__tests__/test-params"
import { handleJoinUserChannelRequest } from "../handlers"

const CHANNEL_ID = "fdc3.channel.1"
const CHANNEL_ID_2 = "fdc3.channel.2"
const INSTANCE_ID = "join-notify-instance"
const APP_ID = "JoinNotifyApp"

function seedConnectedInstance(onChannel?: string) {
  let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
  state = connectInstance(state, {
    instanceId: INSTANCE_ID,
    appId: APP_ID,
    metadata: { name: APP_ID },
  })
  state = updateInstanceState(state, INSTANCE_ID, AppInstanceState.CONNECTED)
  if (onChannel) {
    state = joinUserChannel(state, INSTANCE_ID, onChannel)
  }
  return state
}

function joinRequest(channelId: string): BrowserTypes.JoinUserChannelRequest {
  return {
    type: "joinUserChannelRequest",
    meta: createDacpRequestMeta("join-req", { appId: APP_ID, instanceId: INSTANCE_ID }),
    payload: { channelId },
  }
}

describe("handleJoinUserChannelRequest channelChanged notify", () => {
  it("notifies host on redundant join (same channel already current)", () => {
    const transport = new MockTransport()
    const notifyChannelMembershipChanged = vi.fn()
    const { params } = createDACPTestParams({
      instanceId: INSTANCE_ID,
      initialState: seedConnectedInstance(CHANNEL_ID),
    })

    handleJoinUserChannelRequest(
      joinRequest(CHANNEL_ID),
      {
        ...withResponseDispatcher(params, transport),
        notifyChannelMembershipChanged,
      },
      { hostInitiated: true },
    )

    expect(notifyChannelMembershipChanged).toHaveBeenCalledTimes(1)
    expect(notifyChannelMembershipChanged).toHaveBeenCalledWith(INSTANCE_ID, CHANNEL_ID)
  })

  it("notifies host exactly once on a real channel change", () => {
    const transport = new MockTransport()
    const notifyChannelMembershipChanged = vi.fn()
    const { params } = createDACPTestParams({
      instanceId: INSTANCE_ID,
      initialState: seedConnectedInstance(CHANNEL_ID),
    })

    handleJoinUserChannelRequest(
      joinRequest(CHANNEL_ID_2),
      {
        ...withResponseDispatcher(params, transport),
        notifyChannelMembershipChanged,
      },
      { hostInitiated: true },
    )

    expect(notifyChannelMembershipChanged).toHaveBeenCalledTimes(1)
    expect(notifyChannelMembershipChanged).toHaveBeenCalledWith(INSTANCE_ID, CHANNEL_ID_2)
  })

  it("does not re-deliver current context to listeners on a redundant join", () => {
    const transport = new MockTransport()
    let state = seedConnectedInstance(CHANNEL_ID)
    state = addContextListener(state, INSTANCE_ID, "listener-1", "fdc3.instrument", CHANNEL_ID)
    state = storeContext(
      state,
      CHANNEL_ID,
      { type: "fdc3.instrument", id: { ticker: "AAPL" } },
      INSTANCE_ID,
    )

    const { params } = createDACPTestParams({
      instanceId: INSTANCE_ID,
      initialState: state,
    })

    handleJoinUserChannelRequest(
      joinRequest(CHANNEL_ID),
      withResponseDispatcher(params, transport),
      { hostInitiated: true },
    )

    const broadcastEvents = transport.sentMessages.filter(
      (message): message is { type: string } =>
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        (message as { type: string }).type === "broadcastEvent",
    )
    expect(broadcastEvents).toHaveLength(0)
  })
})
