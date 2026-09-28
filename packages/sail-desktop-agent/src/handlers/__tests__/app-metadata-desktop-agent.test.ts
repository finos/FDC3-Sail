import { describe, expect, it } from "vite-plus/test"
import { MockTransport } from "../../__tests__/utils/mock-transport"
import type { DirectoryApp } from "../../app-directory/types"
import { retrieveAppsById } from "../../app-directory/app-directory-queries"
import { expectAppDirectoryOnState } from "../../app-directory/__tests__/app-directory-test-fixtures"
import { addApplications } from "../../state/mutators/app-directory"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../agent/default-user-channels"
import { connectInstance, updateInstanceState } from "../../state/mutators"
import { createInitialState } from "../../state/initial-state"
import { AppInstanceState, type AgentState } from "../../state/types"
import { handleFindInstancesRequest, handleGetAppMetadataRequest } from "../open/handlers"
import { createDACPTestParams, createDacpRequestMeta, withResponseDispatcher } from "./test-params"

const chartApp: DirectoryApp = {
  appId: "chartApp",
  name: "chartApp",
  title: "Chart App",
  type: "web",
  details: { url: "https://example.com/chart" },
}

function withCatalogApps(state: AgentState, apps: DirectoryApp[]): AgentState {
  return addApplications(state, apps)
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

describe("app directory vs runtime instance separation", () => {
  it("findInstances returns empty when app is in directory but not connected", () => {
    const state = withCatalogApps(createConnectedCallerState(), [chartApp])
    const transport = new MockTransport()
    const { params } = createDACPTestParams({ instanceId: "a1", initialState: state })

    handleFindInstancesRequest(
      {
        type: "findInstancesRequest",
        meta: createDacpRequestMeta("find-instances-directory-only", {
          appId: "portfolioApp",
          instanceId: "a1",
        }),
        payload: {
          app: { appId: "chartApp" },
        },
      },
      withResponseDispatcher(params, transport),
    )

    const response = transport.getLastMessage() as {
      type: string
      payload: { appIdentifiers: Array<{ appId: string; instanceId?: string }> }
    }
    expect(response.type).toBe("findInstancesResponse")
    expect(response.payload.appIdentifiers).toEqual([])
  })

  it("getAppMetadata directory lookup reads from the same appDirectory slice as agent state", () => {
    const state = withCatalogApps(createConnectedCallerState(), [chartApp])
    const transport = new MockTransport()
    const { params, getState } = createDACPTestParams({ instanceId: "a1", initialState: state })

    handleGetAppMetadataRequest(
      {
        type: "getAppMetadataRequest",
        meta: createDacpRequestMeta("get-app-metadata-state-slice", {
          appId: "portfolioApp",
          instanceId: "a1",
        }),
        payload: {
          app: { appId: "chartApp" },
        },
      },
      withResponseDispatcher(params, transport),
    )

    const response = transport.getLastMessage() as {
      type: string
      payload: { appMetadata: { appId: string } }
    }
    const stateSlice = expectAppDirectoryOnState(getState())

    expect(response.type).toBe("getAppMetadataResponse")
    expect(stateSlice.apps).toContainEqual(chartApp)
    expect(response.payload.appMetadata.appId).toBe("chartApp")
    expect(retrieveAppsById(getState().appDirectory, "chartApp")).toEqual(
      stateSlice.apps.filter(app => app.appId === "chartApp"),
    )
  })

  it("running instances remain keyed by instanceId and separate from directory apps", () => {
    let state = createConnectedCallerState()
    state = connectInstance(state, {
      instanceId: "chart-456",
      appId: "chartApp",
      metadata: { name: "chartApp" },
    })
    state = updateInstanceState(state, "chart-456", AppInstanceState.CONNECTED)
    state = withCatalogApps(state, [chartApp])

    const transport = new MockTransport()
    const { params, getState } = createDACPTestParams({ instanceId: "a1", initialState: state })

    handleFindInstancesRequest(
      {
        type: "findInstancesRequest",
        meta: createDacpRequestMeta("find-instances-running", {
          appId: "portfolioApp",
          instanceId: "a1",
        }),
        payload: {
          app: { appId: "chartApp" },
        },
      },
      withResponseDispatcher(params, transport),
    )

    const findResponse = transport.getLastMessage() as {
      payload: { appIdentifiers: Array<{ appId: string; instanceId: string }> }
    }
    expect(findResponse.payload.appIdentifiers).toEqual([
      { appId: "chartApp", instanceId: "chart-456" },
    ])
    expect(Object.keys(getState().instances)).toEqual(["a1", "chart-456"])
    expect(getState().appDirectory.apps).toHaveLength(1)
    expect(getState().appDirectory.apps[0]).not.toHaveProperty("instanceId")
  })
})
