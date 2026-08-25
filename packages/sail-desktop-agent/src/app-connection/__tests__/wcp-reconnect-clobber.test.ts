/**
 * Reconnect must not leave two ports under one instance id, and must not copy
 * stale grace-period metadata onto a new handshake.
 *
 * When retiring a displaced transport, unregister `transportToInstanceId` (and
 * `messagePortTransports`) before `transport.disconnect()`. bridgeAppPort wires
 * onDisconnect → onInstanceTeardown; disconnect-before-unregister can tear down
 * the connection just installed under that id.
 *
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from "vite-plus/test"
import type { BrowserTypes } from "@finos/fdc3"
import type { SailDesktopAgent } from "../../agent/sail-desktop-agent"
import { clearAllHeartbeatTimersForTesting } from "../../handlers/heartbeat/runtime"
import { AppInstanceState } from "../../state/types"
import { MessagePortTransport } from "../message-port"
import { AppConnectionRegistry } from "../app-connection-registry"
import { consoleLogger } from "../../logging/logger"
import {
  disconnectApp,
  disconnectAppByInstanceId,
  handleWCP6Goodbye,
  updateConnectionMetadata,
  type AppConnectionContext,
} from "../wcp/wcp-connection-management"
import type { AppConnectionMetadata } from "../wcp/wcp-types"
import { connectWcpApp, flushAsyncDelivery, TEST_ORIGIN } from "./wcp-edge-test-helpers"
import { createTestAgent, PORTFOLIO_APP } from "./wcp-desktop-agent.integration.fixtures"

function createWCP6Goodbye(): BrowserTypes.WebConnectionProtocol6Goodbye {
  return {
    type: "WCP6Goodbye",
    meta: {
      timestamp: new Date(),
    },
  }
}

function createUnitConnectionContext(options?: {
  disconnectGracePeriod?: number
  onInstanceTeardown?: (instanceId: string) => void
}): AppConnectionContext {
  const emit = vi.fn()
  const pendingDisconnects = new Map<string, ReturnType<typeof setTimeout>>()
  const recentlyDisconnected = new Map<
    string,
    { metadata: AppConnectionMetadata; disconnectedAt: number }
  >()

  const context: AppConnectionContext = {
    connectionRegistry: undefined as unknown as AppConnectionRegistry,
    options: {
      intentResolverUrl: false,
      channelSelectorUrl: false,
      getIntentResolverUrl: () => false,
      getChannelSelectorUrl: () => false,
      handshakeTimeout: 5000,
      disconnectGracePeriod: options?.disconnectGracePeriod ?? 2000,
      intentResolutionTimeout: 60000,
      debug: false,
      logger: consoleLogger,
      resolveHostIdentifier: () => undefined,
    },
    pendingDisconnects,
    recentlyDisconnected,
    emit,
    logger: consoleLogger,
    onInstanceTeardown: options?.onInstanceTeardown,
  }

  context.connectionRegistry = new AppConnectionRegistry({
    emit,
    logger: consoleLogger,
    updateConnectionMetadata: (temp, actual, appId) =>
      updateConnectionMetadata(context, temp, actual, appId),
    disconnectApp: instanceId => disconnectApp(context, instanceId),
  })

  return context
}

function seedConnection(
  context: AppConnectionContext,
  params: {
    instanceId: string
    appId?: string
    connectionAttemptUuid: string
    messageOrigin?: string
    source?: Window
    port: MessagePort
    transport: MessagePortTransport
    connectedAt?: Date
  },
): AppConnectionMetadata {
  const metadata: AppConnectionMetadata = {
    instanceId: params.instanceId,
    appId: params.appId ?? "portfolioApp",
    connectionAttemptUuid: params.connectionAttemptUuid,
    messageOrigin: params.messageOrigin ?? TEST_ORIGIN,
    source: params.source ?? ({} as Window),
    port: params.port,
    connectedAt: params.connectedAt ?? new Date(0),
  }
  context.connectionRegistry.connections.set(params.instanceId, metadata)
  context.connectionRegistry.messagePortTransports.set(params.instanceId, params.transport)
  context.connectionRegistry.transportToInstanceId.set(params.transport, params.instanceId)
  return metadata
}

describe("WCP reconnect clobber", () => {
  const activeAgents: SailDesktopAgent[] = []

  afterEach(() => {
    clearAllHeartbeatTimersForTesting()
    for (const agent of activeAgents.splice(0)) {
      agent.stop()
    }
    vi.useRealTimers()
  })

  it("does not Object.assign recentlyDisconnected metadata onto a reconnecting connection", () => {
    const context = createUnitConnectionContext()
    const validatedId = "validated-reconnect-wcp-d"

    const oldChannel = new MessageChannel()
    const oldTransport = new MessagePortTransport(oldChannel.port2)
    const oldSource = { name: "old-window" } as unknown as Window
    const oldMetadata = seedConnection(context, {
      instanceId: validatedId,
      connectionAttemptUuid: "old-attempt-uuid",
      messageOrigin: "https://old.example",
      source: oldSource,
      port: oldChannel.port2,
      transport: oldTransport,
      connectedAt: new Date(1),
    })

    // Grace already fired: snapshot sits in recentlyDisconnected; live maps no longer hold it.
    context.connectionRegistry.connections.delete(validatedId)
    context.connectionRegistry.messagePortTransports.delete(validatedId)
    context.connectionRegistry.transportToInstanceId.delete(oldTransport)
    context.recentlyDisconnected.set(validatedId, {
      metadata: { ...oldMetadata },
      disconnectedAt: Date.now(),
    })

    const newChannel = new MessageChannel()
    const newTransport = new MessagePortTransport(newChannel.port2)
    const newSource = { name: "new-window" } as unknown as Window
    const tempId = "temp-new-reconnect-uuid"
    seedConnection(context, {
      instanceId: tempId,
      connectionAttemptUuid: "new-attempt-uuid",
      messageOrigin: "https://new.example",
      source: newSource,
      port: newChannel.port2,
      transport: newTransport,
      connectedAt: new Date(9_000),
    })

    updateConnectionMetadata(context, tempId, validatedId, "portfolioApp")

    const restored = context.connectionRegistry.connections.get(validatedId)
    expect(restored).toBeDefined()

    // New handshake fields must win — never the recentlyDisconnected snapshot.
    // Boolean checks avoid Vitest deep-printing MessagePort/Window (circular → stack overflow).
    expect(restored!.connectionAttemptUuid).toBe("new-attempt-uuid")
    expect(restored!.messageOrigin).toBe("https://new.example")
    expect(restored!.port === newChannel.port2).toBe(true)
    expect(restored!.source === newSource).toBe(true)
    expect(restored!.connectionAttemptUuid).not.toBe("old-attempt-uuid")
    expect(restored!.messageOrigin).not.toBe("https://old.example")
    expect(restored!.port === oldChannel.port2).toBe(false)
    expect(restored!.source === oldSource).toBe(false)
    expect(context.recentlyDisconnected.has(validatedId)).toBe(false)
  })

  it("does not tear down the new connection when the reconnect displaces the old port", async () => {
    const agent = createTestAgent({ disconnectGracePeriod: 25 })
    activeAgents.push(agent)
    const connector = agent.appConnection

    const disconnectedInstanceIds: string[] = []
    connector.on("appDisconnected", instanceId => {
      disconnectedInstanceIds.push(instanceId)
    })

    const first = await connectWcpApp(agent, {
      connectionAttemptUuid: "wcp-c-first-uuid",
      appId: PORTFOLIO_APP.appId,
      identityUrl: PORTFOLIO_APP.details.url,
    })

    // Reconnecting onto the same validated id makes updateConnectionMetadata retire the
    // first tab's transport. MessagePortTransport.disconnect() runs bridgeAppPort's
    // onDisconnect synchronously, and that handler resolves the instance id through
    // transportToInstanceId. Unregistering the displaced transport after disconnect()
    // instead of before would resolve the teardown to the validated id and kill the
    // connection this very handshake is installing.
    const second = await connectWcpApp(agent, {
      connectionAttemptUuid: "wcp-c-second-uuid",
      appId: PORTFOLIO_APP.appId,
      identityUrl: PORTFOLIO_APP.details.url,
      hostInstanceId: first.validatedInstanceId,
      instanceUuid: first.instanceUuid,
    })

    expect(second.validatedInstanceId).toBe(first.validatedInstanceId)
    await flushAsyncDelivery()

    expect(disconnectedInstanceIds).not.toContain(second.validatedInstanceId)
    expect(connector.getConnection(second.validatedInstanceId)).toBeDefined()
    expect(agent.getState().instances[second.validatedInstanceId]?.state).toBe(
      AppInstanceState.CONNECTED,
    )
  })

  it("cancels grace teardown when reconnect completes before the timer fires", async () => {
    const agent = createTestAgent({ disconnectGracePeriod: 80 })
    activeAgents.push(agent)
    const connector = agent.appConnection

    const disconnectedInstanceIds: string[] = []
    connector.on("appDisconnected", instanceId => {
      disconnectedInstanceIds.push(instanceId)
    })

    const first = await connectWcpApp(agent, {
      connectionAttemptUuid: "grace-armed-first-uuid",
      appId: PORTFOLIO_APP.appId,
      identityUrl: PORTFOLIO_APP.details.url,
    })

    first.appPort.postMessage(createWCP6Goodbye())
    await flushAsyncDelivery()

    const second = await connectWcpApp(agent, {
      connectionAttemptUuid: "grace-armed-second-uuid",
      appId: PORTFOLIO_APP.appId,
      identityUrl: PORTFOLIO_APP.details.url,
      hostInstanceId: first.validatedInstanceId,
      instanceUuid: first.instanceUuid,
    })

    expect(second.validatedInstanceId).toBe(first.validatedInstanceId)

    // Advance past the original grace window — no late disconnect for validated id.
    await new Promise(resolve => setTimeout(resolve, 200))
    await flushAsyncDelivery()

    expect(disconnectedInstanceIds).not.toContain(first.validatedInstanceId)
    expect(connector.getConnection(first.validatedInstanceId)).toBeDefined()
    expect(agent.getState().instances[first.validatedInstanceId]?.state).toBe(
      AppInstanceState.CONNECTED,
    )
  })

  it("keeps the new connection when the displaced transport is retired via disconnect", () => {
    const tornDown: string[] = []
    const context = createUnitConnectionContext({
      onInstanceTeardown: instanceId => {
        tornDown.push(instanceId)
        disconnectApp(context, instanceId)
      },
    })

    const validatedId = "validated-retire-order"
    const oldChannel = new MessageChannel()
    const oldTransport = new MessagePortTransport(oldChannel.port2)
    seedConnection(context, {
      instanceId: validatedId,
      connectionAttemptUuid: "old-retire-uuid",
      source: { name: "old" } as unknown as Window,
      port: oldChannel.port2,
      transport: oldTransport,
    })
    // Mirror bridgeAppPort: onDisconnect → teardown using reverse-map lookup.
    oldTransport.onDisconnect(() => {
      const mappedId = context.connectionRegistry.transportToInstanceId.get(oldTransport)
      if (mappedId) {
        context.onInstanceTeardown?.(mappedId)
      }
    })

    const newChannel = new MessageChannel()
    const newTransport = new MessagePortTransport(newChannel.port2)
    const tempId = "temp-retire-order-uuid"
    seedConnection(context, {
      instanceId: tempId,
      connectionAttemptUuid: "new-retire-uuid",
      messageOrigin: "https://new.example",
      source: { name: "new" } as unknown as Window,
      port: newChannel.port2,
      transport: newTransport,
    })

    updateConnectionMetadata(context, tempId, validatedId, "portfolioApp")

    // Displaced transport must already be unmapped; disconnect must not tear down the validated id.
    expect(context.connectionRegistry.transportToInstanceId.has(oldTransport)).toBe(false)
    oldTransport.disconnect()

    expect(tornDown).not.toContain(validatedId)
    expect(context.connectionRegistry.connections.get(validatedId)).toBeDefined()
    expect(context.connectionRegistry.messagePortTransports.get(validatedId) === newTransport).toBe(
      true,
    )
    expect(context.connectionRegistry.transportToInstanceId.get(newTransport)).toBe(validatedId)
  })

  it("removes the instance when grace expires with no reconnect", async () => {
    const agent = createTestAgent({ disconnectGracePeriod: 25 })
    activeAgents.push(agent)
    const connector = agent.appConnection

    const connected = await connectWcpApp(agent, {
      connectionAttemptUuid: "grace-expire-no-reconnect-uuid",
      appId: PORTFOLIO_APP.appId,
      identityUrl: PORTFOLIO_APP.details.url,
    })

    connected.appPort.postMessage(createWCP6Goodbye())
    await flushAsyncDelivery()
    await new Promise(resolve => setTimeout(resolve, 150))
    await flushAsyncDelivery()

    expect(connector.getConnection(connected.validatedInstanceId)).toBeUndefined()
    expect(agent.getState().instances[connected.validatedInstanceId]).toBeUndefined()
  })

  it("does not half-restore stale recentlyDisconnected metadata onto a fresh post-grace connection", () => {
    // After grace, remapping onto the same validated id must keep this handshake's
    // port/source/origin/uuid — not copy fields from a stale recentlyDisconnected snapshot.
    const context = createUnitConnectionContext()
    const validatedId = "validated-post-grace"

    const staleChannel = new MessageChannel()
    const staleTransport = new MessagePortTransport(staleChannel.port2)
    const staleMeta = seedConnection(context, {
      instanceId: validatedId,
      connectionAttemptUuid: "stale-post-grace-uuid",
      messageOrigin: "https://stale.example",
      source: { name: "stale" } as unknown as Window,
      port: staleChannel.port2,
      transport: staleTransport,
    })
    context.connectionRegistry.connections.delete(validatedId)
    context.connectionRegistry.messagePortTransports.delete(validatedId)
    context.connectionRegistry.transportToInstanceId.delete(staleTransport)
    context.recentlyDisconnected.set(validatedId, {
      metadata: { ...staleMeta },
      disconnectedAt: Date.now() - 10,
    })

    const freshChannel = new MessageChannel()
    const freshTransport = new MessagePortTransport(freshChannel.port2)
    const tempId = "temp-post-grace-uuid"
    seedConnection(context, {
      instanceId: tempId,
      connectionAttemptUuid: "fresh-post-grace-uuid",
      messageOrigin: "https://fresh.example",
      source: { name: "fresh" } as unknown as Window,
      port: freshChannel.port2,
      transport: freshTransport,
    })

    updateConnectionMetadata(context, tempId, validatedId, "portfolioApp")

    const live = context.connectionRegistry.connections.get(validatedId)
    expect(live).toBeDefined()
    expect(live!.connectionAttemptUuid).toBe("fresh-post-grace-uuid")
    expect(live!.messageOrigin).toBe("https://fresh.example")
    expect(live!.port === freshChannel.port2).toBe(true)
    expect((live!.source as { name?: string }).name).toBe("fresh")
  })

  it("leaves exactly one transport mapped to the validated id after remap (no dual reverse-map)", () => {
    const context = createUnitConnectionContext()
    const validatedId = "validated-dual-map"

    const oldChannel = new MessageChannel()
    const oldTransport = new MessagePortTransport(oldChannel.port2)
    seedConnection(context, {
      instanceId: validatedId,
      connectionAttemptUuid: "old-dual-uuid",
      port: oldChannel.port2,
      transport: oldTransport,
    })

    const newChannel = new MessageChannel()
    const newTransport = new MessagePortTransport(newChannel.port2)
    const tempId = "temp-dual-uuid"
    seedConnection(context, {
      instanceId: tempId,
      connectionAttemptUuid: "new-dual-uuid",
      messageOrigin: "https://new.example",
      port: newChannel.port2,
      transport: newTransport,
    })

    updateConnectionMetadata(context, tempId, validatedId, "portfolioApp")

    const reverseValidatedCount = [
      ...context.connectionRegistry.transportToInstanceId.values(),
    ].filter(id => id === validatedId).length
    expect(reverseValidatedCount).toBe(1)
    expect(context.connectionRegistry.transportToInstanceId.get(newTransport)).toBe(validatedId)
    expect(context.connectionRegistry.messagePortTransports.get(validatedId) === newTransport).toBe(
      true,
    )
    expect(context.connectionRegistry.transportToInstanceId.has(oldTransport)).toBe(false)
  })

  /**
   * Defect register #4 (major): WCP6Goodbye arms a grace-period timer in
   * `context.pendingDisconnects`. `disconnectAppByInstanceId` and `updateConnectionMetadata`
   * already know to cancel a leftover timer for the id they are about to touch (see the two
   * "guard" tests below) -- but `disconnectApp` itself, the low-level function
   * `pruneAppConnection`/`disconnectHandshakeApp`/`handleWCP6Goodbye`'s own fallback all call,
   * does not. Any teardown that goes through plain `disconnectApp` (e.g.
   * `SailDesktopAgent.disconnectInstance` -> `pruneAppConnection` -> `disconnectApp`, see
   * `wcp-temp-id-teardown.test.ts`) leaves that timer running.
   */
  it("does not clear the armed grace timer when disconnectApp tears the instance down directly (defect #4)", () => {
    vi.useFakeTimers()
    const tornDown: string[] = []
    const context = createUnitConnectionContext({
      onInstanceTeardown: instanceId => tornDown.push(instanceId),
    })
    const instanceId = "defect-4-disconnect-app-direct"

    const channel = new MessageChannel()
    const transport = new MessagePortTransport(channel.port2)
    seedConnection(context, {
      instanceId,
      connectionAttemptUuid: "defect-4-uuid",
      port: channel.port2,
      transport,
    })

    // Step 1: WCP6Goodbye arms the grace timer.
    handleWCP6Goodbye(context, instanceId)
    expect(context.pendingDisconnects.has(instanceId)).toBe(true)

    // Step 2: something tears the instance down through disconnectApp directly, without
    // going through either of the two paths that already know to cancel a pending timer.
    disconnectApp(context, instanceId)

    // (a) Disconnecting the instance must clear the armed entry.
    expect(context.pendingDisconnects.has(instanceId)).toBe(false)

    // (b) Advancing time past disconnectGracePeriod afterwards must fire no onInstanceTeardown.
    vi.advanceTimersByTime(context.options.disconnectGracePeriod + 10)
    expect(tornDown).not.toContain(instanceId)
  })

  /**
   * The end-to-end shape of defect #4: arm the timer, tear down through a path that leaves it
   * armed, relaunch the same instance id inside the grace window, advance past the grace
   * period, and confirm the relaunched session survives.
   *
   * This deliberately reproduces the relaunch at the connection-management level rather than by
   * driving a second `connectWcpApp` through the full WCP1-5 handshake: a standard handshake
   * reconnect always finishes in `updateConnectionMetadata`, which *already* cancels any
   * leftover `pendingDisconnects` entry for the id it is about to install (see the
   * "updateConnectionMetadata" guard test below) -- so it would mask this exact bug in
   * `disconnectApp` regardless of whether the fix lands. Seeding the relaunched connection
   * directly, the way `wcp-reconnect-clobber.test.ts`'s other unit tests already model a
   * reconnect displacing a prior session, isolates the bug: nothing here cancels the stale
   * timer except a fixed `disconnectApp`.
   */
  it("does not tear down a relaunched session when a teardown path left its grace timer armed (defect #4 end-to-end)", () => {
    vi.useFakeTimers()
    const tornDown: string[] = []
    const context = createUnitConnectionContext({
      disconnectGracePeriod: 50,
      onInstanceTeardown: instanceId => {
        tornDown.push(instanceId)
        disconnectApp(context, instanceId)
      },
    })
    const relaunchedId = "defect-4-relaunch-id"

    // First session under relaunchedId.
    const oldChannel = new MessageChannel()
    const oldTransport = new MessagePortTransport(oldChannel.port2)
    seedConnection(context, {
      instanceId: relaunchedId,
      connectionAttemptUuid: "defect-4-first-session-uuid",
      port: oldChannel.port2,
      transport: oldTransport,
    })

    // Step 1: app sends WCP6Goodbye -> grace timer armed for relaunchedId.
    handleWCP6Goodbye(context, relaunchedId)
    expect(context.pendingDisconnects.has(relaunchedId)).toBe(true)

    // Step 2: something tears the instance down through a path that (currently) does not
    // cancel the armed timer -- disconnectApp itself.
    disconnectApp(context, relaunchedId)
    expect(context.connectionRegistry.connections.get(relaunchedId)).toBeUndefined()

    // Step 3: the same instance id relaunches/reconnects inside the grace window -- a brand
    // new session gets installed under the same id.
    const newChannel = new MessageChannel()
    const newTransport = new MessagePortTransport(newChannel.port2)
    const newMetadata = seedConnection(context, {
      instanceId: relaunchedId,
      connectionAttemptUuid: "defect-4-relaunch-session-uuid",
      port: newChannel.port2,
      transport: newTransport,
    })

    // Step 4: advance past the original grace period.
    vi.advanceTimersByTime(60)

    // The stale timer must not have fired and torn down the relaunched session.
    expect(tornDown).not.toContain(relaunchedId)
    expect(context.connectionRegistry.connections.get(relaunchedId)).toBe(newMetadata)
  })

  /**
   * Guard: disconnectAppByInstanceId already cancels an armed grace timer for the id it
   * disconnects. The defect #4 fix must not change this.
   */
  it("guard: disconnectAppByInstanceId already clears the armed grace timer", () => {
    vi.useFakeTimers()
    const tornDown: string[] = []
    const context = createUnitConnectionContext({
      onInstanceTeardown: instanceId => tornDown.push(instanceId),
    })
    const instanceId = "guard-disconnect-by-instance-id"

    const channel = new MessageChannel()
    const transport = new MessagePortTransport(channel.port2)
    seedConnection(context, {
      instanceId,
      connectionAttemptUuid: "guard-disconnect-by-id-uuid",
      port: channel.port2,
      transport,
    })

    handleWCP6Goodbye(context, instanceId)
    expect(context.pendingDisconnects.has(instanceId)).toBe(true)

    // disconnectAppByInstanceId always calls onInstanceTeardown itself as part of completing
    // *this* disconnect -- that legitimate call is expected. What must not happen is a second,
    // later call produced by a stale timer the resolveInstanceId call above failed to cancel.
    disconnectAppByInstanceId(context, instanceId)
    expect(context.pendingDisconnects.has(instanceId)).toBe(false)
    expect(tornDown).toEqual([instanceId])

    vi.advanceTimersByTime(context.options.disconnectGracePeriod + 10)
    expect(tornDown).toEqual([instanceId])
  })

  /**
   * Guard: updateConnectionMetadata already cancels an armed grace timer for the validated id
   * it is about to install a reconnecting handshake onto. The defect #4 fix must not change
   * this -- it is exactly the behaviour that masks the bug for a standard WCP reconnect (see
   * the end-to-end test above).
   */
  it("guard: updateConnectionMetadata already clears an armed grace timer for the reused validated id", () => {
    vi.useFakeTimers()
    const tornDown: string[] = []
    const context = createUnitConnectionContext({
      onInstanceTeardown: instanceId => tornDown.push(instanceId),
    })
    const validatedId = "guard-update-metadata-validated-id"

    const oldChannel = new MessageChannel()
    const oldTransport = new MessagePortTransport(oldChannel.port2)
    seedConnection(context, {
      instanceId: validatedId,
      connectionAttemptUuid: "guard-update-metadata-old-uuid",
      port: oldChannel.port2,
      transport: oldTransport,
    })

    // Arms the grace timer directly under the validated id (models a goodbye that already
    // resolved through handshake routing to the validated id).
    handleWCP6Goodbye(context, validatedId)
    expect(context.pendingDisconnects.has(validatedId)).toBe(true)

    const newChannel = new MessageChannel()
    const newTransport = new MessagePortTransport(newChannel.port2)
    const tempId = "temp-guard-update-metadata-uuid"
    seedConnection(context, {
      instanceId: tempId,
      connectionAttemptUuid: "guard-update-metadata-new-uuid",
      port: newChannel.port2,
      transport: newTransport,
    })

    updateConnectionMetadata(context, tempId, validatedId, "portfolioApp")
    expect(context.pendingDisconnects.has(validatedId)).toBe(false)

    vi.advanceTimersByTime(context.options.disconnectGracePeriod + 10)
    expect(tornDown).not.toContain(validatedId)
  })
})
