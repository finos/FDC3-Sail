import { describe, expect, it } from "vite-plus/test"
import { MockTransport } from "../../__tests__/utils/mock-transport"
import { connectInstance, updateInstanceState } from "../../state/mutators"
import { AppInstanceState } from "../../state/types"
import { createInitialState } from "../../state/initial-state"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../agent/default-user-channels"
import { CloseError } from "../../errors/fdc3-errors"
import { MockAppLauncher } from "../../../test/support/mock-app-launcher"
import { createDACPTestParams, createDacpRequestMeta } from "./test-params"
import { withResponseDispatcher } from "./test-params"
import { handleCloseRequest } from "../open/handlers"

function createConnectedCloseContext(instanceId: string) {
  let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
  state = connectInstance(state, {
    instanceId,
    appId: "TestApp",
    metadata: { name: "TestApp" },
  })
  state = updateInstanceState(state, instanceId, AppInstanceState.CONNECTED)

  const transport = new MockTransport()
  const appLauncher = new MockAppLauncher()
  const { params, getState } = createDACPTestParams({ instanceId, initialState: state })

  return {
    params: {
      ...withResponseDispatcher(params, transport),
      appLauncher,
      implementationMetadata: {
        ...params.implementationMetadata,
        fdc3Version: "3.0",
      },
    },
    transport,
    appLauncher,
    getState,
    instanceId,
  }
}

describe("handleCloseRequest", () => {
  it("closes via AppLauncher and removes instance without sending success closeResponse", async () => {
    const { params, transport, appLauncher, getState, instanceId } =
      createConnectedCloseContext("close-me")

    await handleCloseRequest(
      {
        type: "closeRequest",
        meta: createDacpRequestMeta("close-success", {
          appId: "TestApp",
          instanceId,
        }),
        payload: {},
      },
      params,
    )

    expect(appLauncher.getCloseHistory()).toEqual([instanceId])
    expect(getState().instances[instanceId]).toBeUndefined()
    expect(transport.sentMessages).toHaveLength(0)
  })

  it("returns ErrorOnClose when AppLauncher.close is not configured", async () => {
    const { params, transport, instanceId } = createConnectedCloseContext("no-close-launcher")

    await handleCloseRequest(
      {
        type: "closeRequest",
        meta: createDacpRequestMeta("close-no-launcher", {
          appId: "TestApp",
          instanceId,
        }),
        payload: {},
      },
      { ...params, appLauncher: undefined },
    )

    const last = transport.getLastMessage() as {
      type: string
      payload: { error: string }
    }
    expect(last.type).toBe("closeResponse")
    expect(last.payload.error).toBe(CloseError.ErrorOnClose)
  })

  it("returns ErrorOnClose when AppLauncher.close throws", async () => {
    const { params, transport, appLauncher, instanceId } =
      createConnectedCloseContext("close-fails")
    appLauncher.setInstanceToFailOnClose(instanceId)

    await handleCloseRequest(
      {
        type: "closeRequest",
        meta: createDacpRequestMeta("close-throws", {
          appId: "TestApp",
          instanceId,
        }),
        payload: {},
      },
      params,
    )

    const last = transport.getLastMessage() as {
      type: string
      payload: { error: string }
    }
    expect(last.type).toBe("closeResponse")
    expect(last.payload.error).toBe(CloseError.ErrorOnClose)
    expect(params.getState().instances[instanceId]).toBeDefined()
  })

  it("returns ErrorOnClose when instance is unknown", async () => {
    const transport = new MockTransport()
    const appLauncher = new MockAppLauncher()
    const missingInstanceId = "missing-instance"
    const { params } = createDACPTestParams({ instanceId: missingInstanceId })

    await handleCloseRequest(
      {
        type: "closeRequest",
        meta: createDacpRequestMeta("close-missing", {
          appId: "TestApp",
          instanceId: missingInstanceId,
        }),
        payload: {},
      },
      { ...withResponseDispatcher(params, transport), appLauncher },
    )

    const last = transport.getLastMessage() as {
      type: string
      payload: { error: string }
    }
    expect(last.type).toBe("closeResponse")
    expect(last.payload.error).toBe(CloseError.ErrorOnClose)
  })

  it("returns ErrorOnClose when agent advertises FDC3 2.2", async () => {
    const { params, transport, appLauncher, instanceId } = createConnectedCloseContext("close-22")

    await handleCloseRequest(
      {
        type: "closeRequest",
        meta: createDacpRequestMeta("close-22", {
          appId: "TestApp",
          instanceId,
        }),
        payload: {},
      },
      {
        ...params,
        implementationMetadata: {
          ...params.implementationMetadata,
          fdc3Version: "2.2",
        },
      },
    )

    const last = transport.getLastMessage() as {
      type: string
      payload: { error: string }
    }
    expect(last.type).toBe("closeResponse")
    expect(last.payload.error).toBe(CloseError.ErrorOnClose)
    expect(appLauncher.getCloseHistory()).toEqual([])
  })
})
