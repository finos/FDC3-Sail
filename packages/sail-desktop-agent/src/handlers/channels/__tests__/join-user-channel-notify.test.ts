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
  addEventListener,
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
import { ALL_DA_EVENT_TYPES } from "../../events/handlers"
import { handleJoinUserChannelRequest, handleLeaveCurrentChannelRequest } from "../handlers"

const CHANNEL_ID = "fdc3.channel.1"
const CHANNEL_ID_2 = "fdc3.channel.2"
const INSTANCE_ID = "join-notify-instance"
const APP_ID = "JoinNotifyApp"
const OTHER_INSTANCE_ID = "other-notify-instance"
const OTHER_APP_ID = "OtherNotifyApp"

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

function seedOtherConnectedInstance(state: ReturnType<typeof seedConnectedInstance>) {
  let next = connectInstance(state, {
    instanceId: OTHER_INSTANCE_ID,
    appId: OTHER_APP_ID,
    metadata: { name: OTHER_APP_ID },
  })
  return updateInstanceState(next, OTHER_INSTANCE_ID, AppInstanceState.CONNECTED)
}

interface ChannelChangedRecord {
  type: string
  payload: { currentChannelId: string | null }
  meta: { destination?: { instanceId?: string } }
}

function channelChangedEvents(messages: unknown[]): ChannelChangedRecord[] {
  return messages.filter(
    (message): message is ChannelChangedRecord =>
      typeof message === "object" &&
      message !== null &&
      (message as { type?: string }).type === "channelChangedEvent",
  )
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

describe("channelChanged notify targeting (#383)", () => {
  it("notifies only the instance that joined, not other listening instances", () => {
    const transport = new MockTransport()
    let state = seedOtherConnectedInstance(seedConnectedInstance())
    state = addEventListener(state, {
      listenerId: "own-listener",
      instanceId: INSTANCE_ID,
      eventType: "channelChanged",
    })
    state = addEventListener(state, {
      listenerId: "other-listener",
      instanceId: OTHER_INSTANCE_ID,
      eventType: "channelChanged",
    })

    const { params } = createDACPTestParams({ instanceId: INSTANCE_ID, initialState: state })

    handleJoinUserChannelRequest(joinRequest(CHANNEL_ID), withResponseDispatcher(params, transport))

    const events = channelChangedEvents(transport.sentMessages)
    expect(events).toHaveLength(1)
    expect(events[0]?.meta.destination?.instanceId).toBe(INSTANCE_ID)
    expect(events[0]?.payload.currentChannelId).toBe(CHANNEL_ID)
  })

  it("does not notify a listening instance when another instance leaves its channel", () => {
    const transport = new MockTransport()
    let state = seedOtherConnectedInstance(seedConnectedInstance(CHANNEL_ID))
    state = addEventListener(state, {
      listenerId: "other-listener",
      instanceId: OTHER_INSTANCE_ID,
      eventType: ALL_DA_EVENT_TYPES,
    })

    const { params } = createDACPTestParams({ instanceId: INSTANCE_ID, initialState: state })

    handleLeaveCurrentChannelRequest(
      {
        type: "leaveCurrentChannelRequest",
        meta: createDacpRequestMeta("leave-req", { appId: APP_ID, instanceId: INSTANCE_ID }),
        payload: {},
      },
      withResponseDispatcher(params, transport),
    )

    expect(channelChangedEvents(transport.sentMessages)).toHaveLength(0)
  })

  it("notifies the joining instance when only it listens for all event types", () => {
    const transport = new MockTransport()
    let state = seedOtherConnectedInstance(seedConnectedInstance())
    state = addEventListener(state, {
      listenerId: "own-all-listener",
      instanceId: INSTANCE_ID,
      eventType: ALL_DA_EVENT_TYPES,
    })

    const { params } = createDACPTestParams({ instanceId: INSTANCE_ID, initialState: state })

    handleJoinUserChannelRequest(joinRequest(CHANNEL_ID), withResponseDispatcher(params, transport))

    const events = channelChangedEvents(transport.sentMessages)
    expect(events).toHaveLength(1)
    expect(events[0]?.meta.destination?.instanceId).toBe(INSTANCE_ID)
  })

  it("delivers host-initiated changes to the target instance even when another instance listens", () => {
    const transport = new MockTransport()
    let state = seedOtherConnectedInstance(seedConnectedInstance())
    state = addEventListener(state, {
      listenerId: "other-listener",
      instanceId: OTHER_INSTANCE_ID,
      eventType: "channelChanged",
    })

    const { params } = createDACPTestParams({ instanceId: INSTANCE_ID, initialState: state })

    handleJoinUserChannelRequest(
      joinRequest(CHANNEL_ID),
      withResponseDispatcher(params, transport),
      { hostInitiated: true },
    )

    const events = channelChangedEvents(transport.sentMessages)
    expect(events).toHaveLength(1)
    expect(events[0]?.meta.destination?.instanceId).toBe(INSTANCE_ID)
  })
})
