/**
 * Handler integration: DACP paths read catalog data from AgentState via query
 * helpers — catalog lives on state.appDirectory only.
 */

import { describe, expect, it } from "vite-plus/test"
import { MockTransport } from "../../__tests__/utils/mock-transport"
import type { DirectoryApp } from "../../app-directory/types"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../agent/default-user-channels"
import { addApplications } from "../../state/mutators/app-directory"
import { connectInstance, updateInstanceState } from "../../state/mutators"
import { createInitialState } from "../../state/initial-state"
import { AppInstanceState } from "../../state/types"
import { handleGetAppMetadataRequest } from "../open/handlers"
import { createDACPTestParams, createDacpRequestMeta, withResponseDispatcher } from "./test-params"

const TEST_PROVIDER = "test-provider"

const chartApp: DirectoryApp = {
  appId: "chartApp",
  name: "chartApp",
  title: "Chart App",
  type: "web",
  details: { url: "https://example.com/chart" },
}

function createConnectedCallerState() {
  let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
  state = connectInstance(state, {
    instanceId: "a1",
    appId: "portfolioApp",
    metadata: { name: "portfolioApp" },
  })
  state = updateInstanceState(state, "a1", AppInstanceState.CONNECTED)
  return state
}

describe("DACP handlers without context.appDirectory", () => {
  it("getAppMetadata resolves directory app from state.appDirectory via query helpers", () => {
    let state = createConnectedCallerState()
    state = addApplications(state, [chartApp])

    const transport = new MockTransport()
    const { params, getState } = createDACPTestParams({
      instanceId: "a1",
      initialState: state,
    })

    expect("appDirectory" in params).toBe(false)

    handleGetAppMetadataRequest(
      {
        type: "getAppMetadataRequest",
        meta: createDacpRequestMeta("get-app-metadata-state-catalog", {
          appId: "portfolioApp",
          instanceId: "a1",
        }),
        payload: {
          app: { appId: "chartApp" },
        },
      },
      {
        ...withResponseDispatcher(params, transport),
        implementationMetadata: {
          ...params.implementationMetadata,
          provider: TEST_PROVIDER,
        },
      },
    )

    const last = transport.getLastMessage() as {
      type: string
      payload: { appMetadata: { appId: string; desktopAgent?: string } }
    }
    expect(last.type).toBe("getAppMetadataResponse")
    expect(last.payload.appMetadata.appId).toBe("chartApp")
    expect(last.payload.appMetadata.desktopAgent).toBeUndefined()
    expect(getState().appDirectory.apps).toContainEqual(chartApp)
  })

  it("createDACPTestParams does not attach appDirectory on handler params", () => {
    const { params } = createDACPTestParams({ instanceId: "test-instance" })
    expect(params).not.toHaveProperty("appDirectory")
  })
})
