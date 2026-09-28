import { describe, expect, it } from "vite-plus/test"
import { ResolveError } from "@finos/fdc3"

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

describe("handleAddIntentListener intent conflict (FDC3 3.0)", () => {
  it("rejects duplicate unfiltered listeners with IntentListenerConflict", () => {
    const instanceId = "a1"
    let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
    state = connectInstance(state, {
      instanceId,
      appId: "App1",
      metadata: { name: "App1" },
    })
    state = updateInstanceState(state, instanceId, AppInstanceState.CONNECTED)

    const transport = new MockTransport()
    const { params: baseParams } = createDACPTestParams({ instanceId, initialState: state })
    const params = {
      ...withResponseDispatcher(baseParams, transport),
      implementationMetadata: {
        ...baseParams.implementationMetadata,
        fdc3Version: "3.0",
      },
    }

    const request = {
      type: "addIntentListenerRequest" as const,
      meta: createDacpRequestMeta("intent-conflict-1", { appId: "App1", instanceId }),
      payload: { intent: "aTestingIntent1" },
    }

    handleAddIntentListener(request, params)
    handleAddIntentListener(request, params)

    const responses = transport.sentMessages
      .filter(
        (message): message is { type: string; payload: { error?: string } } =>
          typeof message === "object" &&
          message !== null &&
          "type" in message &&
          (message as { type: string }).type === "addIntentListenerResponse",
      )
      .map(message => message.payload)

    expect(responses[0]?.error).toBeUndefined()
    expect(responses[1]?.error).toBe(
      (ResolveError as { IntentListenerConflict?: string }).IntentListenerConflict ??
        "IntentListenerConflict",
    )
  })
})
