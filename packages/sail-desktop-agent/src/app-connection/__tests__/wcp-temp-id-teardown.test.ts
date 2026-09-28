/**
 * Regression tests for temp-handshake-id teardown escalation.
 *
 * Between WCP1 and WCP5 a connection is keyed by a temporary id (`temp-{connectionAttemptUuid}`).
 * `updateConnectionMetadata` remaps it to the validated instanceId on WCP5 success and records a
 * `temp -> validated` link in `wcpHandshakeRouting` so late handshake-keyed traffic still routes.
 * That link is what makes any *teardown* arriving keyed by the temp id dangerous: it resolves
 * forward and destroys the live connection instead of the dead handshake.
 *
 * Two such paths are covered here. Both were real defects found by code reading, each reproduced
 * as a failing test before being fixed. The guards are what keep them fixed:
 *
 *   1. A `WCP6Goodbye` arriving before WCP4 arms a grace timer under the temp id, because
 *      `bridgeAppPort` still resolves the port through `transportToInstanceId` at that point.
 *      Fixed in `updateConnectionMetadata`, which now cancels the temp-keyed pending disconnect
 *      as well as the validated-keyed one.
 *   2. A WCP5 *failure* response is always addressed to the temp id, so pruning it resolved
 *      forward onto a connection an earlier successful handshake had established under that same
 *      temp id. Fixed by `BrowserAppConnection.disconnectHandshakeApp`, which disconnects the id
 *      it is given without resolving.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, afterEach, vi } from "vite-plus/test"
import type { BrowserTypes } from "@finos/fdc3"
import type { SailDesktopAgent } from "../../agent/sail-desktop-agent"
import { AppInstanceState } from "../../state/types"
import { clearAllHeartbeatTimersForTesting } from "../../handlers/heartbeat/runtime"
import * as openWithContext from "../../handlers/utils/open-with-context"
import { clearAllPendingOpenWithContextTimeoutsForTesting } from "../../handlers/utils/open-with-context"
import {
  beginWcpAppFirstConnect,
  connectWcpApp,
  flushAsyncDelivery,
  waitForPortMessage,
} from "./wcp-edge-test-helpers"
import { createTestAgent, PORTFOLIO_APP } from "./wcp-desktop-agent.integration.fixtures"

/**
 * Schema-valid WCP6Goodbye, modeled on the message `disconnectAppByInstanceId` builds in
 * `wcp-connection-management.ts`. The inbound schema-validation gate in `bridgeAppPort` runs
 * before the WCP6 early-return, so a malformed goodbye here would be dropped for the wrong
 * reason and the test would "pass" without ever arming the temp-keyed grace timer.
 */
function createWCP6Goodbye(): BrowserTypes.WebConnectionProtocol6Goodbye {
  return {
    type: "WCP6Goodbye",
    meta: {
      timestamp: new Date(),
    },
  }
}

describe("WCP6Goodbye arriving on a temp handshake id", () => {
  const activeAgents: SailDesktopAgent[] = []

  afterEach(() => {
    clearAllHeartbeatTimersForTesting()
    for (const agent of activeAgents.splice(0)) {
      agent.stop()
    }
  })

  it("does not tear down the validated instance when WCP6Goodbye arrives on the temp id before WCP4 completes", async () => {
    const agent = createTestAgent({ disconnectGracePeriod: 25 })
    activeAgents.push(agent)
    const connector = agent.appConnection

    const disconnectedInstanceIds: string[] = []
    connector.on("appDisconnected", instanceId => {
      disconnectedInstanceIds.push(instanceId)
    })

    // Start the handshake through WCP3 but stop before WCP4 — the connection is still keyed by
    // the temp id (bridgeAppPort resolves transportToInstanceId, which is temp-{uuid} until the
    // WCP5 remap runs).
    const session = beginWcpAppFirstConnect(agent, {
      connectionAttemptUuid: "wcp-a-goodbye-before-wcp4-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    // Goodbye arrives while still temp-keyed: handleWCP6Goodbye arms
    // pendingDisconnects[temp-{uuid}].
    session.appPort.postMessage(createWCP6Goodbye())
    await flushAsyncDelivery()

    // Complete the handshake. updateConnectionMetadata cancels pendingDisconnects[actual] (a
    // no-op here — nothing is armed under the actual id yet) but never looks at
    // pendingDisconnects[temp], so the temp-keyed timer from the goodbye above keeps running.
    await session.postFirstConnectWcp4()
    const { validatedInstanceId } = await session.completeFirstConnect()

    // Wait comfortably past the 25ms grace period (real timer — no fake-timer wind-forward,
    // since MessagePort delivery needs real task turns).
    await new Promise(resolve => setTimeout(resolve, 150))
    await flushAsyncDelivery()

    // Proof this fails for the real reason, not a timeout or a dropped/never-received message:
    // the surviving temp-keyed timer fired, resolved forward through the temp -> validated
    // handshake-routing link, and tore down the *validated* instance whose handshake succeeded.
    expect(disconnectedInstanceIds).not.toContain(validatedInstanceId)
    expect(connector.getConnection(validatedInstanceId)).toBeDefined()
    expect(agent.getState().instances[validatedInstanceId]?.state).toBe(AppInstanceState.CONNECTED)
  })

  it("still disconnects the validated instance when WCP6Goodbye arrives after the handshake remap (guard)", async () => {
    const agent = createTestAgent({ disconnectGracePeriod: 25 })
    activeAgents.push(agent)
    const connector = agent.appConnection

    const connected = await connectWcpApp(agent, {
      connectionAttemptUuid: "wcp-a-goodbye-after-remap-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    expect(agent.getState().instances[connected.validatedInstanceId]?.state).toBe(
      AppInstanceState.CONNECTED,
    )

    // Goodbye now arrives keyed by the validated id (the remap already ran) — this is
    // legitimate teardown, and cancelling the temp-keyed timer must not suppress it.
    connected.appPort.postMessage(createWCP6Goodbye())
    await flushAsyncDelivery()

    await new Promise(resolve => setTimeout(resolve, 150))
    await flushAsyncDelivery()

    expect(connector.getConnection(connected.validatedInstanceId)).toBeUndefined()
    expect(agent.getState().instances[connected.validatedInstanceId]).toBeUndefined()
  })

  // KNOWN COVERAGE GAP: the third caller of the non-resolving disconnect — the WCP1 handshake
  // timeout in wcp1-3-handshake.ts, which prunes a connection that never completed WCP4 — has no
  // test here. createTestAgent hard-codes handshakeTimeout: 30_000 in
  // wcp-desktop-agent.integration.fixtures.ts with no override, so exercising it for real means a
  // 30s-plus test, and this file uses real timers because MessagePort delivery needs real task
  // turns. Add an override to that fixture if you touch handshake teardown again.
})

/**
 * Defect register #4 (major): a WCP6Goodbye arms a grace-period timer keyed by the (validated)
 * instance id. If the instance is later torn down through `SailDesktopAgent.disconnectInstance`
 * -> `BrowserAppConnection.pruneAppConnection` -> the low-level `disconnectApp` -- the real path
 * this defect was found on -- that armed timer is not cancelled. When it eventually fires it
 * calls `onInstanceTeardown` again for the same id, which is wired back to
 * `SailDesktopAgent.disconnectInstance` (see `bindEdgeCallbacks`), producing a second, spurious
 * teardown for whatever now lives under that id.
 *
 * `wcp-reconnect-clobber.test.ts` covers the same defect at the connection-management unit level
 * (inspecting `pendingDisconnects` directly, and the full relaunch-inside-the-grace-window
 * reproduction). This test drives it through the actual public entry point instead.
 *
 * @vitest-environment jsdom
 */
describe("Grace timer armed by WCP6Goodbye survives a direct disconnectInstance() teardown (defect #4)", () => {
  const activeAgents: SailDesktopAgent[] = []

  afterEach(() => {
    clearAllHeartbeatTimersForTesting()
    for (const agent of activeAgents.splice(0)) {
      agent.stop()
    }
  })

  it("does not fire a second teardown after disconnectInstance tears the app down while its grace timer is still armed", async () => {
    const agent = createTestAgent({ disconnectGracePeriod: 40 })
    activeAgents.push(agent)
    const connector = agent.appConnection

    const disconnectedInstanceIds: string[] = []
    connector.on("appDisconnected", instanceId => {
      disconnectedInstanceIds.push(instanceId)
    })

    const connected = await connectWcpApp(agent, {
      connectionAttemptUuid: "disconnect-instance-grace-armed-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    // WCP6Goodbye arms the grace timer for the validated instance.
    connected.appPort.postMessage(createWCP6Goodbye())
    await flushAsyncDelivery()

    // Something other than the timer tears the instance down directly — the real-world path
    // this defect was found on.
    agent.disconnectInstance(connected.validatedInstanceId)
    await flushAsyncDelivery()

    expect(connector.getConnection(connected.validatedInstanceId)).toBeUndefined()
    // Exactly one appDisconnected for the explicit disconnectInstance() call above. A second
    // entry here means the WCP6-armed timer was left running and fired later.
    expect(disconnectedInstanceIds.filter(id => id === connected.validatedInstanceId)).toHaveLength(
      1,
    )

    // Advance comfortably past the original grace period (real timer — MessagePort delivery
    // needs real task turns, matching the rest of this file).
    await new Promise(resolve => setTimeout(resolve, 150))
    await flushAsyncDelivery()

    // Proof this fails for the real reason: the stale timer fired and called
    // onInstanceTeardown -> disconnectInstance a second time for the same id, producing a
    // second appDisconnected event that never should have happened.
    expect(disconnectedInstanceIds.filter(id => id === connected.validatedInstanceId)).toHaveLength(
      1,
    )
  })
})

/**
 * A WCP5 failure response is always addressed to the temp handshake id: `sendFailureResponse`
 * falls back to `temp-{uuid}` because `getInboundInstanceId()` returns null on the browser edge.
 * If that temp id was already remapped to a validated instanceId by an earlier successful
 * handshake, disconnecting it must not resolve forward through the `temp -> validated`
 * handshake-routing link — that would tear down the live connection instead of the failed attempt.
 *
 * Reproduced by reusing the same `connectionAttemptUuid` for a second, mismatched-origin WCP4 on
 * an already-connected app's port: `bridgeAppPort` keys the message by the now-validated transport
 * id (so enrichment finds the live connection and supplies `messageOrigin`), but
 * `DesktopAgent.handleWcpMessage` recomputes `tempInstanceId` from the message meta and hands the
 * handler a context addressed to the stale temp id.
 *
 * @vitest-environment jsdom
 */
describe("WCP5 failure addressed to an already-remapped temp id", () => {
  const activeAgents: SailDesktopAgent[] = []

  afterEach(() => {
    clearAllHeartbeatTimersForTesting()
    for (const agent of activeAgents.splice(0)) {
      agent.stop()
    }
  })

  /**
   * Schema-valid WCP4ValidateAppIdentity reusing `connectionAttemptUuid`, with `identityUrl`
   * and `actualUrl` on different origins so `handleWcp4ValidateAppIdentity` fails the
   * origin-mismatch check before ever reaching the app-directory lookup.
   */
  function createMismatchedOriginWcp4(
    connectionAttemptUuid: string,
    identityUrl: string,
  ): BrowserTypes.WebConnectionProtocol4ValidateAppIdentity {
    return {
      type: "WCP4ValidateAppIdentity",
      meta: {
        connectionAttemptUuid,
        timestamp: new Date(),
      },
      payload: {
        identityUrl,
        actualUrl: "https://malicious.example.org/portfolio",
      },
    } as unknown as BrowserTypes.WebConnectionProtocol4ValidateAppIdentity
  }

  it("does not tear down the validated instance when a WCP5 failure resolves the stale temp id forward", async () => {
    const agent = createTestAgent({ disconnectGracePeriod: 25 })
    activeAgents.push(agent)
    const connector = agent.appConnection

    const disconnectedInstanceIds: string[] = []
    connector.on("appDisconnected", instanceId => {
      disconnectedInstanceIds.push(instanceId)
    })

    const connected = await connectWcpApp(agent, {
      connectionAttemptUuid: "wcp-b-remapped-temp-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    expect(agent.getState().instances[connected.validatedInstanceId]?.state).toBe(
      AppInstanceState.CONNECTED,
    )

    // Second WCP4 on the now-connected port, reusing the same connectionAttemptUuid, with a
    // mismatched actualUrl origin. bridgeAppPort keys it by the validated transport id (the
    // live connection), so it is genuinely entered — but handleWcpMessage recomputes the
    // routing context from temp-{connectionAttemptUuid}, which was already remapped.
    connected.appPort.postMessage(
      createMismatchedOriginWcp4(connected.connectionAttemptUuid, PORTFOLIO_APP.details.url),
    )
    await flushAsyncDelivery()

    // Proof this fails for the real reason, not a timeout or a dropped/never-received message:
    // the WCP5 failure response resolved temp -> validated and tore down the live instance
    // whose handshake had already succeeded.
    expect(disconnectedInstanceIds).not.toContain(connected.validatedInstanceId)
    expect(connector.getConnection(connected.validatedInstanceId)).toBeDefined()
    expect(agent.getState().instances[connected.validatedInstanceId]?.state).toBe(
      AppInstanceState.CONNECTED,
    )
  })

  it("still prunes the temp connection on a WCP5 failure for a genuinely unvalidated first handshake (guard)", async () => {
    const agent = createTestAgent({ disconnectGracePeriod: 25 })
    activeAgents.push(agent)
    const connector = agent.appConnection

    const session = beginWcpAppFirstConnect(agent, {
      connectionAttemptUuid: "wcp-b-guard-unvalidated-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    expect(connector.getConnection(session.tempInstanceId)).toBeDefined()

    // WCP4 with mismatched origins fails identity validation before WCP5 success — the temp
    // connection here was never remapped, so pruning it is the legitimate handshake-timeout
    // contract this fix must preserve.
    session.appPort.postMessage(
      createMismatchedOriginWcp4(session.connectionAttemptUuid, PORTFOLIO_APP.details.url),
    )
    await flushAsyncDelivery()

    expect(connector.getConnection(session.tempInstanceId)).toBeUndefined()
  })
})

/**
 * Slice 6: a step that runs *after* `handleWcp4ValidateAppIdentity` has already put the WCP5
 * success response on the wire (starting the heartbeat, notifying pending `fdc3.open()` callers)
 * must not produce a second, contradictory WCP5 failure response for the same
 * `connectionAttemptUuid`. The throw must still be logged, not silently swallowed.
 *
 * How the throw is induced: every avenue that runs a *real* post-success step through a
 * transport that "throws on send" was tried first and ruled out, because
 * `AppConnectionRegistry.sendOnPort` already wraps `appTransport.send()` in its own try/catch
 * (logging and swallowing) — so a throwing MessagePort transport never reaches
 * `handleWcp4ValidateAppIdentity`'s own catch:
 *   - A crafted pending plain-open (registerOpenWithContext → notifyInstanceConnected →
 *     deliverOpenWithContext → sendDACPResponse) still ends at `sendOnPort`, guarded.
 *   - `startHeartbeat`'s synchronous first `sendHeartbeat()` (heartbeatIntervalMs <= 1000) also
 *     ends at `sendOnPort`, guarded.
 * Neither state mutator on that path (`linkHandshakeRoutingId`, the heartbeat/open reducers)
 * throws for any reachable legitimate state either.
 *
 * So this reproduces the throw at the one remaining honest boundary: `notifyInstanceConnected`
 * is a real module export `handleWcp4ValidateAppIdentity` calls by name as the *last* post-success
 * step, after the heartbeat start. Spying on that export (Vitest/Vite ESM live bindings — verified
 * the spy is observed by the handler's own import) throws from genuinely after the WCP5 success
 * send: `connectWcpApp`'s own wait for the WCP5 success message on the port proves the ordering,
 * since the helper would time out if the success were never sent.
 */
describe("WCP4 post-success throw does not produce a second WCP5 failure (slice 6)", () => {
  const activeAgents: SailDesktopAgent[] = []

  afterEach(() => {
    clearAllPendingOpenWithContextTimeoutsForTesting()
    clearAllHeartbeatTimersForTesting()
    for (const agent of activeAgents.splice(0)) {
      agent.stop()
    }
    vi.restoreAllMocks()
  })

  it("keeps the WCP5 success, logs the error, and does not disconnect the temp handshake id when a post-success step throws", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const postSuccessError = new Error("boom-post-success-slice6")
    vi.spyOn(openWithContext, "notifyInstanceConnected").mockImplementation(() => {
      throw postSuccessError
    })

    const agent = createTestAgent()
    activeAgents.push(agent)
    const connector = agent.appConnection

    const disconnectedInstanceIds: string[] = []
    connector.on("appDisconnected", instanceId => {
      disconnectedInstanceIds.push(instanceId)
    })

    // connectWcpApp itself waits for (and type-asserts) the WCP5 *success* message on the app's
    // port before returning — if the mocked throw happened before that send, this call would
    // time out instead of resolving, so reaching the assertions below is itself proof the throw
    // landed after the success response was already on the wire.
    const connected = await connectWcpApp(agent, {
      connectionAttemptUuid: "post-success-throw-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    // No second, contradictory WCP5 failure was ever attempted for this connectionAttemptUuid:
    // the only way one reaches the wire/registry is `sendFailureResponse` disconnecting the temp
    // handshake id (WCP5 failures are always addressed to `temp-{connectionAttemptUuid}`, see the
    // "WCP5 failure addressed to an already-remapped temp id" block above) — so an absent
    // `appDisconnected(tempInstanceId)` is the real, production-observable signature of "no
    // failure response was emitted", not a mock call count.
    expect(disconnectedInstanceIds).not.toContain(connected.tempInstanceId)

    // The successful handshake's connection and FDC3 state must be untouched by the later throw.
    expect(connector.getConnection(connected.validatedInstanceId)).toBeDefined()
    expect(agent.getState().instances[connected.validatedInstanceId]?.state).toBe(
      AppInstanceState.CONNECTED,
    )

    // The throw is logged, not silently swallowed.
    expect(
      consoleErrorSpy.mock.calls.some(args =>
        args.some(
          arg => arg === postSuccessError || String(arg).includes("boom-post-success-slice6"),
        ),
      ),
    ).toBe(true)
  })

  it("still sends the WCP5 failure response on the wire for a genuine pre-success validation failure (guard against over-correction)", async () => {
    const agent = createTestAgent()
    activeAgents.push(agent)
    const connector = agent.appConnection

    const connectionAttemptUuid = "pre-success-genuine-failure-uuid"
    const identityUrl = PORTFOLIO_APP.details.url

    const session = beginWcpAppFirstConnect(agent, {
      connectionAttemptUuid,
      appId: "portfolioApp",
      identityUrl,
    })

    const wcp5FailurePromise =
      waitForPortMessage<BrowserTypes.WebConnectionProtocol5ValidateAppIdentityFailedResponse>(
        session.appPort,
        data => (data as { type?: string }).type === "WCP5ValidateAppIdentityFailedResponse",
      )

    // Origin mismatch: fails identity validation before any WCP5 success is ever constructed —
    // a wholly separate, earlier code path than the post-success throw above.
    session.appPort.postMessage({
      type: "WCP4ValidateAppIdentity",
      meta: { connectionAttemptUuid, timestamp: new Date() },
      payload: { identityUrl, actualUrl: "https://malicious.example.org/portfolio" },
    })

    const failure = await wcp5FailurePromise

    expect(failure.type).toBe("WCP5ValidateAppIdentityFailedResponse")
    expect(failure.payload.message).toContain("Origin mismatch")
    expect((failure.meta as { connectionAttemptUuid?: string }).connectionAttemptUuid).toBe(
      connectionAttemptUuid,
    )
    expect(connector.getConnection(session.tempInstanceId)).toBeUndefined()
  })
})
