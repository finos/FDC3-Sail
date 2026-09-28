/**
 * @vitest-environment jsdom
 *
 * FINOS `app-control` return leg: a mock's `windowClosed` reply must reach Conformance1
 * even though the mock destroys its own browsing context 1-5ms later and the harness tears
 * the instance down on the strength of that very broadcast.
 *
 * The outbound leg (a `closeWindow` broadcast reaching both live instances of one appId) is
 * covered by `harness-two-instances.test.ts` and is not re-tested here.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  broadcastCloseWindow,
  elapseFinOsCloseContextBudget,
  replyWindowClosedThenSelfClose,
  RETURN_LEG_APP_ID,
  runHarnessReturnLegLaunch,
  subscribeToAppControl,
  windowClosedTestIdsDeliveredToConformance1,
} from "./__tests__/harness-window-closed-return.harness"

const CONFORMANCE1_APP_ID = "Conformance1"

describe("app-control windowClosed return leg", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("delivers a mock's windowClosed to a subscriber on another instance when the mock's browsing context closes straight after the broadcast", async () => {
    const fixture = await runHarnessReturnLegLaunch()

    try {
      const testId = "(AppInstanceMetadata) return leg — single reply"
      await subscribeToAppControl(
        fixture,
        { appId: CONFORMANCE1_APP_ID, instanceId: fixture.conformance1InstanceId },
        "windowClosed",
      )

      await replyWindowClosedThenSelfClose(fixture, fixture.mocks[0], testId)
      await elapseFinOsCloseContextBudget()

      expect(windowClosedTestIdsDeliveredToConformance1(fixture)).toContain(testId)
    } finally {
      fixture.cleanup()
    }
  })

  it("does not swallow the windowClosed broadcast that triggered the harness teardown of the replying instance", async () => {
    const fixture = await runHarnessReturnLegLaunch()

    try {
      const testId = "(AppInstanceMetadata) return leg — teardown must not swallow"
      const [mock] = fixture.mocks
      await subscribeToAppControl(
        fixture,
        { appId: CONFORMANCE1_APP_ID, instanceId: fixture.conformance1InstanceId },
        "windowClosed",
      )

      await replyWindowClosedThenSelfClose(fixture, mock, testId)
      await elapseFinOsCloseContextBudget()

      // The teardown this broadcast triggered really ran…
      const remaining = fixture.agent.apps
        .getInstances()
        .filter(instance => instance.appId === RETURN_LEG_APP_ID)
        .map(instance => instance.instanceId)
      expect(remaining).not.toContain(mock.openedInstanceId)
      expect(remaining).not.toContain(mock.wcp5InstanceId)

      // …and the broadcast that triggered it still reached Conformance1.
      expect(windowClosedTestIdsDeliveredToConformance1(fixture)).toContain(testId)
    } finally {
      fixture.cleanup()
    }
  })

  it("gets at least the first reply through when both live instances of one appId answer a single closeWindow", async () => {
    const fixture = await runHarnessReturnLegLaunch()

    try {
      const testId = "(AppInstanceMetadata) two MetadataAppId instances"
      const [first, second] = fixture.mocks

      await subscribeToAppControl(
        fixture,
        { appId: CONFORMANCE1_APP_ID, instanceId: fixture.conformance1InstanceId },
        "windowClosed",
      )
      await subscribeToAppControl(
        fixture,
        { appId: RETURN_LEG_APP_ID, instanceId: first.wcp5InstanceId },
        "closeWindow",
      )
      await subscribeToAppControl(
        fixture,
        { appId: RETURN_LEG_APP_ID, instanceId: second.wcp5InstanceId },
        "closeWindow",
      )

      await broadcastCloseWindow(fixture, testId)

      // Both mocks answer and immediately destroy their own browsing contexts.
      await replyWindowClosedThenSelfClose(fixture, first, testId)
      await replyWindowClosedThenSelfClose(fixture, second, testId)
      await elapseFinOsCloseContextBudget()

      // The toolbox waits for count=1, so the first reply through is enough.
      expect(windowClosedTestIdsDeliveredToConformance1(fixture)[0]).toBe(testId)
    } finally {
      fixture.cleanup()
    }
  })
})
