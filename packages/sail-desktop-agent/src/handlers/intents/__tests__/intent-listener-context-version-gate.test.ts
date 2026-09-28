import { describe, expect, it } from "vite-plus/test"
import type { BrowserTypes } from "@finos/fdc3"

import { MockTransport } from "../../../__tests__/utils/mock-transport"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../../agent/default-user-channels"
import { createInitialState } from "../../../state/initial-state"
import { connectInstance, updateInstanceState } from "../../../state/mutators"
import { AppInstanceState } from "../../../state/types"
import {
  createDACPTestParams,
  createDacpRequestMeta,
  withResponseDispatcher,
} from "../../__tests__/test-params"
import { handleAddIntentListener } from "../intent-listener-handlers"

type AddIntentListenerRequest = BrowserTypes.AddIntentListenerRequest

function contextForVersion(fdc3Version: string) {
  const instanceId = "a1"
  let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
  state = connectInstance(state, {
    instanceId,
    appId: "App1",
    metadata: { name: "App1" },
  })
  state = updateInstanceState(state, instanceId, AppInstanceState.CONNECTED)

  const transport = new MockTransport()
  const { params: baseParams, getState } = createDACPTestParams({ instanceId, initialState: state })
  const params = {
    ...withResponseDispatcher(baseParams, transport),
    implementationMetadata: {
      ...baseParams.implementationMetadata,
      fdc3Version,
    },
  }

  return { params, getState, instanceId }
}

/**
 * Regression coverage for the FDC3 3.0 addIntentListenerWithContext version gate.
 *
 * `payload.contextType` is a 3.0-only field. The 2.2 JSON Schema sets
 * `additionalProperties: false`, so it must not be READ at 2.2 at all -- not just left
 * unenforced downstream. See src/handlers/intents/intent-listener-handlers.ts.
 */
describe("handleAddIntentListener payload.contextType version gate", () => {
  it("ignores payload.contextType at FDC3 2.2 -- listener is recorded unfiltered", () => {
    const { params, getState, instanceId } = contextForVersion("2.2")

    const message = {
      type: "addIntentListenerRequest",
      meta: createDacpRequestMeta("ctx-gate-2.2", { appId: "App1", instanceId }),
      payload: { intent: "aTestingIntent1", contextType: "fdc3.instrument" },
    } as AddIntentListenerRequest

    handleAddIntentListener(message, params)

    const listeners = Object.values(getState().intents.listeners)
    expect(listeners).toHaveLength(1)
    expect(listeners[0]?.contextTypes).toEqual([])
  })

  it("honors payload.contextType at FDC3 3.0", () => {
    const { params, getState, instanceId } = contextForVersion("3.0")

    const message = {
      type: "addIntentListenerRequest",
      meta: createDacpRequestMeta("ctx-gate-3.0", { appId: "App1", instanceId }),
      payload: { intent: "aTestingIntent1", contextType: "fdc3.instrument" },
    } as AddIntentListenerRequest

    handleAddIntentListener(message, params)

    const listeners = Object.values(getState().intents.listeners)
    expect(listeners).toHaveLength(1)
    expect(listeners[0]?.contextTypes).toEqual(["fdc3.instrument"])
  })
})
