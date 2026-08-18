/**
 * Contract: AppInstance carries no denormalized intent listener names; lifecycle enum is
 * Option A only (PENDING → CONNECTED → removed). Intent listeners live in intents.listeners.
 */
import { describe, expect, it } from "vite-plus/test"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../agent/default-user-channels"
import { createInitialState } from "../initial-state"
import { connectInstance } from "../mutators/instance"
import * as instanceMutators from "../mutators/instance"
import * as stateMutators from "../mutators/index"
import * as instanceSelectors from "../selectors/instance"
import * as stateSelectors from "../selectors/index"
import { AppInstanceState, type AppInstance } from "../types"

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
type Expect<T extends true> = T

/** String-literal union derived from the enum (sound for string enums; avoids enum `Equals`). */
type AppInstanceStateValues = `${AppInstanceState}`
type AllowedLifecycleStates = "pending" | "connected"

/** Compile-time contract (fails `tsc` while denormalized fields / tombstone enums remain). */
const _instanceTypeContract = {
  noIntentListenersOnInstance: true as Expect<
    Equals<"intentListeners" extends keyof AppInstance ? false : true, true>
  >,
  lifecycleStatesOnly: true as Expect<
    AppInstanceStateValues extends AllowedLifecycleStates
      ? AllowedLifecycleStates extends AppInstanceStateValues
        ? true
        : false
      : false
  >,
}
void _instanceTypeContract

const FORBIDDEN_INSTANCE_MUTATOR_EXPORTS = ["addIntentListener", "removeIntentListener"] as const

const FORBIDDEN_INSTANCE_SELECTOR_EXPORTS = ["getInstancesWithIntentListener"] as const

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

describe("AppInstance state hardening contract", () => {
  it("connectInstance does not attach a denormalized intentListeners array on the instance", () => {
    const state = connectInstance(createInitialState(DEFAULT_FDC3_USER_CHANNELS), {
      instanceId: "contract-instance",
      appId: "ContractApp",
      metadata: { name: "ContractApp" },
    })

    const instance = state.instances["contract-instance"]
    expect(instance).toBeDefined()
    expect(Object.prototype.hasOwnProperty.call(instance, "intentListeners")).toBe(false)
  })

  it("AppInstanceState exposes only pending and connected lifecycle values", () => {
    expect(Object.values(AppInstanceState).sort()).toEqual(["connected", "pending"])
    expect(AppInstanceState).not.toHaveProperty("TERMINATED")
    expect(AppInstanceState).not.toHaveProperty("NOT_RESPONDING")
    expect(AppInstanceState).not.toHaveProperty("DISCONNECTING")
  })

  it("instance mutator barrels do not export denormalized intent listener mutators", () => {
    assertNoForbiddenExports(
      instanceMutators,
      "mutators/instance",
      FORBIDDEN_INSTANCE_MUTATOR_EXPORTS,
    )
    assertNoForbiddenExports(stateMutators, "mutators/index", FORBIDDEN_INSTANCE_MUTATOR_EXPORTS)
  })

  it("instance selector barrels do not export denormalized intent listener selectors", () => {
    assertNoForbiddenExports(
      instanceSelectors,
      "selectors/instance",
      FORBIDDEN_INSTANCE_SELECTOR_EXPORTS,
    )
    assertNoForbiddenExports(stateSelectors, "selectors/index", FORBIDDEN_INSTANCE_SELECTOR_EXPORTS)
  })
})
