import { describe, expect, it } from "vite-plus/test"
import type { BrowserTypes } from "@finos/fdc3"
import { SailDesktopAgent } from "../agent/sail-desktop-agent"
import type { AgentAppConnection } from "../app-connection/types"
import { connectInstance, updateInstanceState } from "../state/mutators"
import { getAllUserChannels } from "../state/selectors"
import type { AgentState } from "../state/types"
import { AppInstanceState } from "../state/types"
import { createDacpRequestMeta } from "../handlers/__tests__/test-params"
import { createDesktopAgentWithTestConnection } from "../../test/support/desktop-agent-test-harness"

const CONFIGURED_USER_CHANNELS: BrowserTypes.Channel[] = [
  {
    id: "config.channel.1",
    type: "user",
    displayMetadata: {
      name: "Config Channel 1",
      color: "#111111",
    },
  },
  {
    id: "config.channel.2",
    type: "user",
    displayMetadata: {
      name: "Config Channel 2",
      color: "#222222",
    },
  },
]

const RUNTIME_USER_CHANNELS: Record<string, BrowserTypes.Channel> = {
  "runtime.channel.1": {
    id: "runtime.channel.1",
    type: "user",
    displayMetadata: {
      name: "Runtime Channel",
      color: "#ABCDEF",
    },
  },
}

function sortChannelsById(channels: BrowserTypes.Channel[]): BrowserTypes.Channel[] {
  return [...channels].sort((left, right) => left.id.localeCompare(right.id))
}

type DesktopAgentInternals = {
  state: AgentState
}

function asInternals(agent: SailDesktopAgent<AgentAppConnection>): DesktopAgentInternals {
  return agent as SailDesktopAgent<AgentAppConnection> & DesktopAgentInternals
}

/** Same pattern as Cucumber `applyDesktopAgentStateUpdate` — mutates agent state like DACP setState. */
function applyAgentStateUpdate(
  agent: SailDesktopAgent<AgentAppConnection>,
  callback: (state: AgentState) => AgentState,
): void {
  const internal = asInternals(agent)
  internal.state = callback(agent.getState())
}

function seedConnectedInstance(state: AgentState, instanceId: string, appId: string): AgentState {
  const next = connectInstance(state, {
    instanceId,
    appId,
    metadata: { name: appId },
  })
  return updateInstanceState(next, instanceId, AppInstanceState.CONNECTED)
}

describe("DesktopAgent user channel state", () => {
  it("seeds state.channels.user from constructor config at initialization", () => {
    const agent = new SailDesktopAgent({
      userChannels: CONFIGURED_USER_CHANNELS,
    })

    const stateChannels = getAllUserChannels(agent.getState())

    expect(Object.keys(agent.getState().channels.user)).toEqual([
      "config.channel.1",
      "config.channel.2",
    ])
    expect(sortChannelsById(stateChannels)).toEqual(sortChannelsById(CONFIGURED_USER_CHANNELS))
  })

  it("getUserChannels returns channels from agent state not constructor config copy", () => {
    const agent = new SailDesktopAgent({
      userChannels: CONFIGURED_USER_CHANNELS,
    })

    applyAgentStateUpdate(agent, state => ({
      ...state,
      channels: {
        ...state.channels,
        user: RUNTIME_USER_CHANNELS,
      },
    }))

    const expectedFromState = getAllUserChannels(agent.getState())

    expect(sortChannelsById(agent.channels.getUserChannels())).toEqual(
      sortChannelsById(expectedFromState),
    )
  })

  it("host getUserChannels stays aligned with DACP getUserChannelsResponse", async () => {
    const { agent, connection } = createDesktopAgentWithTestConnection({
      userChannels: CONFIGURED_USER_CHANNELS,
    })

    applyAgentStateUpdate(agent, state =>
      seedConnectedInstance(
        {
          ...state,
          channels: {
            ...state.channels,
            user: RUNTIME_USER_CHANNELS,
          },
        },
        "a1",
        "App1",
      ),
    )

    await connection.receiveMessage({
      type: "getUserChannelsRequest",
      payload: {},
      meta: createDacpRequestMeta("get-user-channels-state-source", {
        appId: "App1",
        instanceId: "a1",
      }),
    })

    const response = connection.sentMessages.at(-1) as {
      type: string
      payload: { userChannels: BrowserTypes.Channel[] }
    }

    expect(response.type).toBe("getUserChannelsResponse")
    expect(sortChannelsById(agent.channels.getUserChannels())).toEqual(
      sortChannelsById(response.payload.userChannels),
    )
  })
})
