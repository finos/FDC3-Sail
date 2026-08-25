import { describe, expect, it } from "vite-plus/test"

import type { IntentListener } from "../../../state/types"
import {
  findConflictingIntentListener,
  intentListenerContextTypesOverlap,
} from "../intent-listener-conflict"

function listener(
  overrides: Partial<IntentListener> & Pick<IntentListener, "listenerId">,
): IntentListener {
  return {
    intentName: "aTestingIntent1",
    instanceId: "a1",
    appId: "App1",
    contextTypes: [],
    registeredAt: new Date(),
    lastActivity: new Date(),
    active: true,
    ...overrides,
  }
}

describe("intent listener conflict (FDC3 3.0)", () => {
  it("treats unfiltered listeners as overlapping any incoming listener", () => {
    expect(intentListenerContextTypesOverlap([], ["fdc3.instrument"])).toBe(true)
    expect(intentListenerContextTypesOverlap(["fdc3.instrument"], [])).toBe(true)
  })

  it("detects overlapping filtered context types", () => {
    expect(
      intentListenerContextTypesOverlap(
        ["fdc3.instrument", "fdc3.contact"],
        ["fdc3.contact", "fdc3.order"],
      ),
    ).toBe(true)
  })

  it("allows non-overlapping filtered context types", () => {
    expect(intentListenerContextTypesOverlap(["fdc3.instrument"], ["fdc3.order"])).toBe(false)
  })

  it("finds a conflicting listener for the same intent and instance", () => {
    const existing = listener({
      listenerId: "l1",
      contextTypes: ["fdc3.instrument"],
    })

    const conflict = findConflictingIntentListener([existing], "aTestingIntent1", "a1", [
      "fdc3.instrument",
      "fdc3.order",
    ])

    expect(conflict?.listenerId).toBe("l1")
  })

  it("ignores listeners for different intents or instances", () => {
    const existing = listener({ listenerId: "l1", intentName: "otherIntent" })

    expect(
      findConflictingIntentListener([existing], "aTestingIntent1", "a1", ["fdc3.instrument"]),
    ).toBeUndefined()
  })
})
