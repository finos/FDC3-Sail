/**
 * @vitest-environment jsdom
 *
 * A plain `fdc3.open({ appId })` — no context — must not resolve before the launched app has
 * connected. The FINOS suites treat the resolved promise as "the app is there now" and start
 * talking to it on the next line; an instrumented run showed the app finishing its boot 38-60ms
 * after `openResponse`, so a teardown broadcast issued straight after `open()` reached nobody.
 *
 * The open-WITH-context path already waits (`handlers/utils/open-with-context.ts`), and
 * `harness-open-with-context.test.ts` covers it. Only the plain-open branch is exercised here.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { OpenError } from "@finos/fdc3"

import {
  broadcastCloseWindowFromCaller,
  connectedLaunchedInstanceIds,
  deliverPlainOpenRequest,
  elapseLaunchWaitBudget,
  openResponsesSoFar,
  runHarnessOpenWaitLaunch,
  settleOpenResponse,
} from "./__tests__/harness-open-waits-for-connect.harness"

describe("plain fdc3.open() waits for the launched app to connect", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("emits no openResponse while the launched app is still booting", async () => {
    const fixture = await runHarnessOpenWaitLaunch()

    try {
      await deliverPlainOpenRequest(fixture)

      // The launcher has run — a browsing context exists — but it has not connected yet.
      expect(fixture.panels).toHaveLength(1)
      expect(connectedLaunchedInstanceIds(fixture)).toEqual([])

      expect(openResponsesSoFar(fixture)).toEqual([])
    } finally {
      fixture.cleanup()
    }
  })

  it("lets the caller broadcast to the app on an app channel the moment open() resolves", async () => {
    const fixture = await runHarnessOpenWaitLaunch()

    try {
      await deliverPlainOpenRequest(fixture)

      const opened = await settleOpenResponse(fixture)
      expect(opened.error).toBeUndefined()
      expect(opened.instanceId).toBeDefined()

      // Nothing else happens in between: this is the caller's very next FDC3 call.
      const deliveredTo = await broadcastCloseWindowFromCaller(
        fixture,
        "(Open) plain open then immediate app-control broadcast",
      )

      expect(deliveredTo).toContain(opened.instanceId)
    } finally {
      fixture.cleanup()
    }
  })

  it("rejects with AppTimeout when the launched app never connects", async () => {
    const fixture = await runHarnessOpenWaitLaunch({ bootLaunchedApps: false })

    try {
      await deliverPlainOpenRequest(fixture)
      await elapseLaunchWaitBudget()

      expect(openResponsesSoFar(fixture).at(-1)?.error).toBe(OpenError.AppTimeout)
    } finally {
      fixture.cleanup()
    }
  })
})
