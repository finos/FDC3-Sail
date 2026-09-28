import { afterEach, describe, expect, it } from "vite-plus/test"
import type { BrowserTypes } from "@finos/fdc3"

import type { DirectoryApp } from "../../../app-directory/types"
import type { SailDesktopAgent } from "../../../agent/sail-desktop-agent"
import type { AgentAppConnection } from "../../../app-connection/types"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../../agent/default-user-channels"
import { DEFAULT_SAIL_DESKTOP_AGENT_METADATA } from "../../../agent/default-config"
import { connectInstance, updateInstanceState } from "../../../state/mutators"
import { createInitialState } from "../../../state/initial-state"
import { AppInstanceState } from "../../../state/types"
import { createDacpRequestMeta } from "../../__tests__/test-params"
import { createDesktopAgentWithTestConnection } from "../../../../test/support/desktop-agent-test-harness"

const CONFORMANCE_APP: DirectoryApp = {
  appId: "intent-a",
  name: "intent-a",
  title: "Intent A",
  type: "web",
  details: { url: "https://example.com/intent-a" },
}

type GetAppMetadataResponse = BrowserTypes.AgentResponseMessage & {
  type: "getAppMetadataResponse"
  payload: {
    appMetadata?: Record<string, unknown>
    error?: string
  }
}

function wireVisibleAppMetadata(response: GetAppMetadataResponse): Record<string, unknown> {
  return JSON.parse(JSON.stringify(response.payload.appMetadata ?? {})) as Record<string, unknown>
}

describe("getAppMetadata harness-equivalent DesktopAgent path", () => {
  const activeAgents: SailDesktopAgent<AgentAppConnection>[] = []

  afterEach(() => {
    for (const agent of activeAgents.splice(0)) {
      agent.stop()
    }
  })

  it("GetAppMetadata omits desktopAgent when DesktopAgentBridging is false (local 2.2 conformance)", async () => {
    const initialState = updateInstanceState(
      connectInstance(createInitialState(DEFAULT_FDC3_USER_CHANNELS), {
        instanceId: "caller-1",
        appId: "conformance1",
        metadata: { name: "conformance1" },
      }),
      "caller-1",
      AppInstanceState.CONNECTED,
    )

    const { agent, connection } = createDesktopAgentWithTestConnection({
      apps: [CONFORMANCE_APP],
      initialState,
      implementationMetadata: DEFAULT_SAIL_DESKTOP_AGENT_METADATA,
    })
    activeAgents.push(agent)

    await connection.receiveMessage({
      type: "getAppMetadataRequest",
      meta: createDacpRequestMeta("get-app-metadata-harness-directory", {
        appId: "conformance1",
        instanceId: "caller-1",
      }),
      payload: {
        app: { appId: CONFORMANCE_APP.appId },
      },
    })

    const response = connection.sentMessages.find(
      (message): message is GetAppMetadataResponse =>
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        (message as { type: string }).type === "getAppMetadataResponse",
    )

    expect(response).toBeDefined()
    const wireMetadata = wireVisibleAppMetadata(response!)
    // SeeWhatsOn/FDC3-Sail#73 — local 2.2 toolbox strict-whitelists AppMetadata keys
    expect(Object.keys(wireMetadata)).not.toContain("desktopAgent")
    expect(wireMetadata.appId).toBe(CONFORMANCE_APP.appId)
  })

  it("AppInstanceMetadata omits desktopAgent when DesktopAgentBridging is false", async () => {
    let initialState = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
    initialState = connectInstance(initialState, {
      instanceId: "caller-1",
      appId: "conformance1",
      metadata: { name: "conformance1" },
    })
    initialState = connectInstance(initialState, {
      instanceId: "intent-a-instance",
      appId: CONFORMANCE_APP.appId,
      metadata: { name: CONFORMANCE_APP.appId },
    })
    initialState = updateInstanceState(initialState, "caller-1", AppInstanceState.CONNECTED)
    initialState = updateInstanceState(
      initialState,
      "intent-a-instance",
      AppInstanceState.CONNECTED,
    )

    const { agent, connection } = createDesktopAgentWithTestConnection({
      apps: [CONFORMANCE_APP],
      initialState,
      implementationMetadata: DEFAULT_SAIL_DESKTOP_AGENT_METADATA,
    })
    activeAgents.push(agent)

    await connection.receiveMessage({
      type: "getAppMetadataRequest",
      meta: createDacpRequestMeta("get-app-metadata-harness-instance", {
        appId: "conformance1",
        instanceId: "caller-1",
      }),
      payload: {
        app: { appId: CONFORMANCE_APP.appId, instanceId: "intent-a-instance" },
      },
    })

    const response = connection.sentMessages.find(
      (message): message is GetAppMetadataResponse =>
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        (message as { type: string }).type === "getAppMetadataResponse",
    )

    expect(response).toBeDefined()
    const wireMetadata = wireVisibleAppMetadata(response!)
    expect(Object.keys(wireMetadata)).not.toContain("desktopAgent")
    expect(wireMetadata.instanceId).toBe("intent-a-instance")
  })

  it("GetAppMetadata includes desktopAgent when DesktopAgentBridging is true", async () => {
    const initialState = updateInstanceState(
      connectInstance(createInitialState(DEFAULT_FDC3_USER_CHANNELS), {
        instanceId: "caller-1",
        appId: "conformance1",
        metadata: { name: "conformance1" },
      }),
      "caller-1",
      AppInstanceState.CONNECTED,
    )

    const { agent, connection } = createDesktopAgentWithTestConnection({
      apps: [CONFORMANCE_APP],
      initialState,
      implementationMetadata: {
        ...DEFAULT_SAIL_DESKTOP_AGENT_METADATA,
        optionalFeatures: {
          ...DEFAULT_SAIL_DESKTOP_AGENT_METADATA.optionalFeatures,
          DesktopAgentBridging: true,
        },
      },
    })
    activeAgents.push(agent)

    await connection.receiveMessage({
      type: "getAppMetadataRequest",
      meta: createDacpRequestMeta("get-app-metadata-bridging-on", {
        appId: "conformance1",
        instanceId: "caller-1",
      }),
      payload: {
        app: { appId: CONFORMANCE_APP.appId },
      },
    })

    const response = connection.sentMessages.find(
      (message): message is GetAppMetadataResponse =>
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        (message as { type: string }).type === "getAppMetadataResponse",
    )

    expect(response).toBeDefined()
    const wireMetadata = wireVisibleAppMetadata(response!)
    expect(Object.keys(wireMetadata)).toContain("desktopAgent")
    expect(wireMetadata.desktopAgent).toBe(DEFAULT_SAIL_DESKTOP_AGENT_METADATA.provider)
  })
})
