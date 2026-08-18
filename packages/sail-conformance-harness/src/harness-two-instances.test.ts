/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import {
  broadcastCloseWindowOnAppControl,
  getAppMetadataInstanceId,
  runHarnessTwoInstanceLaunch,
  TWO_INSTANCE_APP_ID,
} from "./__tests__/harness-two-instances.harness"

describe("two instances of one forceNewWindow appId", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns each opened instanceId from getAppMetadata (FDC3 round-trip identity)", async () => {
    const fixture = await runHarnessTwoInstanceLaunch()

    try {
      const [first, second] = fixture.launched

      await expect(
        getAppMetadataInstanceId(fixture, {
          appId: TWO_INSTANCE_APP_ID,
          instanceId: first.openedInstanceId,
        }),
      ).resolves.toBe(first.openedInstanceId)

      await expect(
        getAppMetadataInstanceId(fixture, {
          appId: TWO_INSTANCE_APP_ID,
          instanceId: second.openedInstanceId,
        }),
      ).resolves.toBe(second.openedInstanceId)
    } finally {
      fixture.cleanup()
    }
  })

  it("keeps both opened instances registered and distinct in the agent", async () => {
    const fixture = await runHarnessTwoInstanceLaunch()

    try {
      const [first, second] = fixture.launched

      // Weak but harmless: two crypto.randomUUID()-backed ids are all but guaranteed distinct
      // regardless of correctness, so this alone can't catch a mixed-up registration. Kept
      // because it documents the intended invariant; the assertions below are what actually
      // guard it.
      expect(first.openedInstanceId).not.toBe(second.openedInstanceId)

      // The real contract: the id open() handed back to the caller must be the same id the
      // instance itself validated as over WCP4/WCP5. If one launch's pending registration were
      // reaped and its pending open migrated onto the other instance, these would diverge.
      expect(first.wcp5InstanceId).toBe(first.openedInstanceId)
      expect(second.wcp5InstanceId).toBe(second.openedInstanceId)

      const registeredIds = fixture.agent.apps
        .getInstances()
        .filter(instance => instance.appId === TWO_INSTANCE_APP_ID)
        .map(instance => instance.instanceId)

      expect(registeredIds).toEqual(
        expect.arrayContaining([first.openedInstanceId, second.openedInstanceId]),
      )
    } finally {
      fixture.cleanup()
    }
  })

  it("delivers an app-control closeWindow broadcast to both live instances", async () => {
    const fixture = await runHarnessTwoInstanceLaunch()

    try {
      const [first, second] = fixture.launched

      const deliveredTo = await broadcastCloseWindowOnAppControl(fixture, [
        first.wcp5InstanceId,
        second.wcp5InstanceId,
      ])

      expect(deliveredTo).toEqual(
        expect.arrayContaining([first.openedInstanceId, second.openedInstanceId]),
      )
    } finally {
      fixture.cleanup()
    }
  })
})
