import type { BrowserTypes } from "@finos/fdc3"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../agent/default-user-channels"
import {
  DEFAULT_SAIL_DESKTOP_AGENT_CONFIG,
  DEFAULT_SAIL_DESKTOP_AGENT_METADATA,
} from "../../agent/default-config"
import { consoleLogger } from "../../logging/logger"
import type { DACPHandlerParams, DacpResponseDispatcher } from "../types"
import { createInitialState } from "../../state/initial-state"
import type { AgentState, StateSetter } from "../../state/types"
import type { Transport } from "../../../test/support/transport"
import { InMemoryTransport } from "../../../test/support/in-memory-transport"
import { createDacpResponseDispatcher } from "../../../test/support/transport"
export { createDacpResponseDispatcher } from "../../../test/support/transport"

/** Shared agent state for contexts created with the same initialState reference (multi-connection tests). */
const sharedStateByInitialSnapshot = new WeakMap<AgentState, AgentState>()

export function createDACPTestParams(options: { instanceId: string; initialState?: AgentState }): {
  params: DACPHandlerParams
  getState: () => AgentState
} {
  const initialSnapshot = options.initialState
  let state = initialSnapshot ?? createInitialState(DEFAULT_FDC3_USER_CHANNELS)

  if (initialSnapshot && !sharedStateByInitialSnapshot.has(initialSnapshot)) {
    sharedStateByInitialSnapshot.set(initialSnapshot, state)
  }

  const readState = (): AgentState =>
    initialSnapshot ? (sharedStateByInitialSnapshot.get(initialSnapshot) ?? state) : state

  const setState: StateSetter = callback => {
    const next = callback(readState())
    state = next
    if (initialSnapshot) {
      sharedStateByInitialSnapshot.set(initialSnapshot, next)
    }
  }

  const edgeTransport = new InMemoryTransport()
  const params: DACPHandlerParams = {
    responses: createDacpResponseDispatcher(edgeTransport),
    instanceId: options.instanceId,
    getState: readState,
    setState,
    logger: consoleLogger,
    // Taken from the real defaults, not re-stated, so there stays exactly one owner.
    validation: DEFAULT_SAIL_DESKTOP_AGENT_CONFIG.validation,
    logPayloadDetail: DEFAULT_SAIL_DESKTOP_AGENT_CONFIG.logPayloadDetail,
    implementationMetadata: {
      ...DEFAULT_SAIL_DESKTOP_AGENT_METADATA,
      provider: "test",
      providerVersion: "0.0.0",
    },
    openContextListenerTimeoutMs: 2000,
    pendingIntentTimeoutMs: 2000,
    heartbeatEnabled: true,
    heartbeatIntervalMs: 500,
    heartbeatTimeoutMs: 2000,
  }

  return { params, getState: readState }
}

/** Wire a delivery recorder into handler params for isolated DACP tests. */
export function withResponseDispatcher(
  params: DACPHandlerParams,
  delivery: DacpResponseDispatcher | Transport,
): DACPHandlerParams {
  const responses = "sendToInstance" in delivery ? delivery : createDacpResponseDispatcher(delivery)
  return { ...params, responses }
}

export function createDacpRequestMeta(
  requestUuid: string,
  source: BrowserTypes.AppIdentifier = { appId: "TestApp", instanceId: "a1" },
): BrowserTypes.AppRequestMessageMeta {
  return {
    requestUuid,
    timestamp: new Date(),
    source,
  }
}
