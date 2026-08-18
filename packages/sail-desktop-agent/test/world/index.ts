import { World, setWorldConstructor, type IWorldOptions } from "@cucumber/cucumber"
import { SailDesktopAgent } from "../../src/agent/sail-desktop-agent"
import { DacpTestAppConnection } from "../support/dacp-test-app-connection"
import { MockAppLauncher } from "../support/mock-app-launcher"
import { MockIntentResolver } from "../support/mock-intent-resolver"
import type { BrowserTypes } from "@finos/fdc3"
import type { DirectoryApp } from "../../src/app-directory/types"
import type { AgentState } from "../../src/state/types"
import { connectInstance } from "../../src/state/mutators"
import { linkHandshakeRoutingId } from "../../src/state/mutators/wcp-handshake-routing"
import { applyDesktopAgentStateUpdate } from "../support/agent-state"

/**
 * Test properties stored in World for sharing data between Cucumber steps.
 *
 * Known properties:
 * - `instances`: Maps app identifier strings to instance IDs
 * - `apps`: Array of DirectoryApp definitions for test setup
 * - `result`: Test results stored for later assertions
 *
 * Additional arbitrary properties can be stored for variable substitution
 * (e.g. `{lastContextListenerId}`, `{channel1Id}` from alias steps).
 */
export interface TestProps {
  /** Maps app identifier strings (e.g., "App1", "appId: App1, instanceId: a1") to instance IDs */
  instances?: Record<string, string>
  /** Array of DirectoryApp definitions used to initialize the DesktopAgent */
  apps?: DirectoryApp[]
  /** Test results stored for later assertions */
  result?: unknown
  /** Arbitrary properties for variable substitution and test data sharing */
  [key: string]: unknown
}

/**
 * Cucumber World for FDC3 Desktop Agent tests
 *
 * Clean architecture that uses:
 * - REAL state (internal state - no mocking needed)
 * - MOCK external dependencies (transport, app launcher, intent resolver)
 * - Direct access to state via getState() for assertions
 */
export class CustomWorld extends World {
  // The actual Desktop Agent instance being tested
  desktopAgent!: SailDesktopAgent<DacpTestAppConnection>

  // DACP oracle app edge (records outbound; receiveMessage drives inbound)
  mockTransport!: DacpTestAppConnection
  mockAppLauncher!: MockAppLauncher
  mockIntentResolver!: MockIntentResolver

  // Test data storage (for sharing data between steps)
  props: TestProps = {}
  /** Deterministic ids for step createMeta / createUUID only — not wire response/event ids. */
  private testUuidCounter: number = 0

  constructor(options: IWorldOptions<unknown>) {
    super(options)
  }

  /**
   * Initialize the DesktopAgent for a test scenario.
   * Called by setup steps (e.g., "Given a desktop agent")
   *
   * Uses the new functional state management pattern.
   * Access state via desktopAgent.getState() for assertions.
   */
  initializeDesktopAgent(
    apps: DirectoryApp[],
    channels: BrowserTypes.Channel[],
    heartbeatConfig?: { intervalMs?: number; timeoutMs?: number },
    fdc3Version?: string,
  ): void {
    // Cucumber defaults: no heartbeat timers unless a scenario opts in via heartbeatConfig
    // (see "A desktop agent with heartbeat checking"). WCP5-on-open would otherwise leave
    // timers active and break disconnect-cleanup assertions.
    const heartbeatEnabled = heartbeatConfig !== undefined
    this.testUuidCounter = 0
    // Fresh scenario: drop stale instance/uuid harness state from the prior scenario.
    delete this.props.instances
    delete this.props.lastContextListenerId
    delete this.props.lastIntentListenerId
    delete this.props.lastEventListenerId
    delete this.props.lastPrivateChannelId
    delete this.props.intentListenersByInstance
    // Do not replace globalThis.crypto.randomUUID — Cucumber uses it for test-case ids;
    // a per-scenario counter caused duplicate ids and only ~15 scenarios actually ran.

    // Create MOCK external dependencies - avoid side effects
    this.mockTransport = new DacpTestAppConnection()
    this.mockAppLauncher = new MockAppLauncher()
    this.mockIntentResolver = new MockIntentResolver()
    const originalCancelNext = this.mockIntentResolver.cancelNextResolution.bind(
      this.mockIntentResolver,
    )
    this.mockIntentResolver.cancelNextResolution = () => {
      originalCancelNext()
      this.enableIntentResolverCallback()
    }

    // Create the agent with catalog seeded via config.apps (state.appDirectory.apps)
    this.desktopAgent = new SailDesktopAgent({
      appLauncher: this.mockAppLauncher,
      apps,
      userChannels: channels,
      implementationMetadata: {
        provider: "cucumber-provider",
        providerVersion: "1.0.0",
        fdc3Version: fdc3Version ?? (this.props.fdc3Version as string | undefined) ?? "2.2",
      },
      openContextListenerTimeoutMs: 2000,
      heartbeatEnabled,
      heartbeatIntervalMs: heartbeatConfig?.intervalMs ?? 30_000,
      heartbeatTimeoutMs: heartbeatConfig?.timeoutMs ?? 60_000,
      appConnection: this.mockTransport,
    })

    this.mockTransport.onHandshakeRoutingLinked = (handshakeRoutingId, instanceId) => {
      applyDesktopAgentStateUpdate(this.desktopAgent, state =>
        linkHandshakeRoutingId(state, handshakeRoutingId, instanceId),
      )
    }

    // Wire up MockAppLauncher callback to register instances in state
    this.mockAppLauncher.onInstanceCreated = (instanceId, appId) => {
      const instanceAppIds = (this.props.instanceAppIds as Record<string, string> | undefined) ?? {}
      instanceAppIds[instanceId] = appId
      this.props.instanceAppIds = instanceAppIds
      this.updateState(state =>
        connectInstance(state, {
          instanceId,
          appId,
          metadata: { name: appId },
        }),
      )
    }

    // Start the agent
    this.desktopAgent.start()
  }

  /**
   * Wire host intent resolver callback on the live agent (no re-init).
   * Used when a scenario simulates user cancellation via the mock resolver.
   */
  enableIntentResolverCallback(): void {
    const agent = this.desktopAgent as unknown as {
      requestIntentResolution?: ReturnType<MockIntentResolver["createCallback"]>
    }
    agent.requestIntentResolution = this.mockIntentResolver.createCallback()
  }

  /**
   * Get current agent state for assertions.
   * Use this instead of accessing registries directly.
   */
  getState(): AgentState {
    return this.desktopAgent.getState()
  }

  /**
   * Update agent state for BDD fixture setup (see test/support/agent-state.ts).
   */
  updateState(fn: (state: AgentState) => AgentState): void {
    applyDesktopAgentStateUpdate(this.desktopAgent, fn)
  }

  /**
   * Deterministic request ids for Cucumber steps (createMeta).
   */
  createUUID(): string {
    return `uuid${this.testUuidCounter++}`
  }
}

setWorldConstructor(CustomWorld)
