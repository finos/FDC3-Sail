import { describe, expect, it } from "vite-plus/test"
import type { AugmentedAppIntent } from "../types"
import { generateStartState } from "../resolver"

describe("generateStartState", () => {
  it("never leaves chosenIntent as undefined when both the existing-app and new-app intent lists are empty", () => {
    // "ViewChart" has exactly one handler: a running instance sitting on a
    // channel other than the current one. It is excluded from the "existing
    // app" list (wrong channel) and from the "new app" list (it already has
    // an instanceId) - both unique-intent lists come back empty, mirroring
    // the "only handlers are on another channel" scenario from the plan.
    const appIntents: AugmentedAppIntent[] = [
      {
        intent: { name: "ViewChart" },
        apps: [
          {
            appId: "app1",
            instanceId: "instance-1",
            channelData: { id: "OtherChannel", icon: "", background: "" },
          },
        ],
      },
    ]

    const state = generateStartState(appIntents, "CurrentChannel")

    // The `State` type declares `chosenIntent: string | null` - it must never
    // silently become `undefined` because `uniqueNewAppIntents[0]` was read
    // from an empty array. An `undefined` chosenIntent here means the
    // Resolver popup renders with no selectable option and no way for the
    // user to complete it.
    expect(state.chosenIntent).toBeNull()
  })
})
