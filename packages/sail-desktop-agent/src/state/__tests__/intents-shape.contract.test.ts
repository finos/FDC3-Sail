/**
 * Contract: AgentState.intents exposes only FDC3 2.2-required slices (listeners + pending).
 * Intent resolution history is not part of agent state.
 */
import { describe, expect, it } from "vite-plus/test"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../agent/default-user-channels"
import { createInitialState } from "../initial-state"
import { addPendingIntent, registerIntentListener, resolvePendingIntent } from "../mutators/intent"
import * as intentMutators from "../mutators/intent"
import * as stateMutators from "../mutators/index"
import * as intentSelectors from "../selectors/intent"
import * as stateSelectors from "../selectors/index"
import * as statsSelectors from "../selectors/stats"
import type { AgentState } from "../types"

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
type Expect<T extends true> = T

/** Compile-time contract (fails `tsc` if intents shape drifts). */
const _intentsTypeContract = {
  noHistory: true as Expect<
    Equals<"history" extends keyof AgentState["intents"] ? false : true, true>
  >,
  listenersAndPendingOnly: true as Expect<
    Equals<keyof AgentState["intents"], "listeners" | "pending">
  >,
}
void _intentsTypeContract

const FORBIDDEN_MUTATOR_EXPORTS = ["recordIntentResolution"] as const

const FORBIDDEN_SELECTOR_EXPORTS = ["getIntentResolution", "getAllIntentResolutions"] as const

function assertNoForbiddenExports(
  moduleExports: Record<string, unknown>,
  moduleName: string,
  forbiddenExports: readonly string[],
): void {
  for (const exportName of forbiddenExports) {
    expect(
      Object.prototype.hasOwnProperty.call(moduleExports, exportName),
      `${moduleName} must not export ${exportName}`,
    ).toBe(false)
  }
}

function expectIntentSliceKeys(intents: AgentState["intents"]): void {
  expect(Object.keys(intents).sort()).toEqual(["listeners", "pending"])
}

describe("AgentState.intents contract", () => {
  it("initial state intents has only listeners and pending keys", () => {
    const intents = createInitialState(DEFAULT_FDC3_USER_CHANNELS).intents

    expectIntentSliceKeys(intents)
    expect(intents.listeners).toEqual({})
    expect(intents.pending).toEqual({})
  })

  it("state mutator barrels do not export intent history APIs", () => {
    assertNoForbiddenExports(intentMutators, "mutators/intent", FORBIDDEN_MUTATOR_EXPORTS)
    assertNoForbiddenExports(stateMutators, "mutators/index", FORBIDDEN_MUTATOR_EXPORTS)
  })

  it("state selector barrels do not export intent history selectors", () => {
    assertNoForbiddenExports(intentSelectors, "selectors/intent", FORBIDDEN_SELECTOR_EXPORTS)
    assertNoForbiddenExports(stateSelectors, "selectors/index", FORBIDDEN_SELECTOR_EXPORTS)
  })

  it("getStats does not expose intent resolution history counters", () => {
    const stats = statsSelectors.getStats(createInitialState(DEFAULT_FDC3_USER_CHANNELS))

    expect(stats).not.toHaveProperty("intentResolutions")
  })

  it("intent raise and resolve flows leave intents with only listeners and pending", () => {
    let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)

    state = registerIntentListener(state, {
      listenerId: "listener-1",
      intentName: "ViewChart",
      instanceId: "target-instance",
      appId: "ChartApp",
      contextTypes: ["fdc3.instrument"],
    })

    state = addPendingIntent(state, {
      requestId: "request-1",
      intentName: "ViewChart",
      context: { type: "fdc3.instrument", id: { ticker: "AAPL" } },
      sourceInstanceId: "source-instance",
      targetInstanceId: "target-instance",
      targetAppId: "ChartApp",
    })

    expectIntentSliceKeys(state.intents)

    state = resolvePendingIntent(state, "request-1")

    expectIntentSliceKeys(state.intents)
    expect(state.intents.pending).toEqual({})
    expect(Object.keys(state.intents.listeners)).toEqual(["listener-1"])
  })
})
