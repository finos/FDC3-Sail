/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from "vite-plus/test"
import { clearAllPendingOpenWithContextTimeoutsForTesting } from "../../sail-desktop-agent/src/handlers/utils/open-with-context"

import {
  assertHarnessOpenWithContextDelivered,
  runHarnessOpenWithContext,
  snapshotHarnessOpenWithContext,
} from "./__tests__/harness-open-with-context.harness"

describe("harness open-with-context regression", () => {
  afterEach(() => {
    clearAllPendingOpenWithContextTimeoutsForTesting()
    vi.restoreAllMocks()
  })

  it("delivers openResponse and broadcastEvent through harness launcher and first-connect WCP4", async () => {
    const fixture = await runHarnessOpenWithContext()

    try {
      await vi.waitFor(() => {
        const snapshot = snapshotHarnessOpenWithContext(fixture)
        assertHarnessOpenWithContextDelivered(snapshot)
      })
    } finally {
      fixture.cleanup()
    }
  })

  it("clears pending open-with-context on the adopted launcher id after delivery", async () => {
    const fixture = await runHarnessOpenWithContext()

    try {
      await vi.waitFor(() => {
        const snapshot = snapshotHarnessOpenWithContext(fixture)
        assertHarnessOpenWithContextDelivered(snapshot)
        expect(
          fixture.agent.getState().open.pendingWithContext[snapshot.launcherInstanceId],
        ).toBeUndefined()
      })
    } finally {
      fixture.cleanup()
    }
  })
})
