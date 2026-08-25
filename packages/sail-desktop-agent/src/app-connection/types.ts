import type { HostIntentResolverPayload, HostIntentResolverResponse } from "../host-contracts"
import type { AgentState, StateSetter } from "../state/types"
import type { AppConnectionEvents } from "./app-connection-events"
import type { AppConnectionMetadata } from "./wcp/wcp-types"

/** Inbound DACP/WCP from a connected app instance. */
export type AppMessageHandler = (message: unknown) => void | Promise<void>

/**
 * Outbound delivery surface for connected FDC3 app instances.
 * Routes by `meta.destination.instanceId` on DACP messages.
 */
export interface AppConnectionDelivery {
  sendToAppInstance(message: unknown): void
}

/**
 * App edge wired into {@link SailDesktopAgent} for inbound DACP/WCP and outbound delivery.
 * Production: {@link BrowserAppConnection}. Tests: {@link DacpTestAppConnection} in test support.
 */
export interface AgentAppConnection {
  start(): void
  stop(): void
  onAppMessage(handler: AppMessageHandler): void
  setOnInstanceTeardown(handler: (instanceId: string) => void): void
  /**
   * Optional whole-agent disconnect hook (test edge). Browser path tears down
   * per-instance via {@link setOnInstanceTeardown} instead.
   */
  setOnAgentDisconnect?(handler: () => void): void
  readonly connectionRegistry: AppConnectionDelivery
  getConnection(instanceId: string): AppConnectionMetadata | undefined
  getConnections(): AppConnectionMetadata[]
  pruneAppConnection(instanceId: string): void
  /** Notify host shell when an instance joins or leaves a user channel (browser path). */
  notifyChannelMembershipChanged?(instanceId: string, channelId: string | null): void
  /**
   * Optional agent-state access wiring (browser path). Test edges have no host state to
   * mirror and omit it.
   */
  bindAgentState?(access: { getAgentState: () => AgentState; setAgentState: StateSetter }): void

  /**
   * Optional lifecycle/channel/intent event subscription (browser path). Edges with nothing
   * to emit — including {@link setOnAgentDisconnect}-style minimal test edges — may omit it.
   * Controllers that subscribe (`apps.onConnect`, `channels.onAppChannelChange`, …) degrade to
   * a safe no-op unsubscribe rather than silently listening on an edge nothing routes through.
   */
  on?<EventName extends keyof AppConnectionEvents>(
    event: EventName,
    handler: AppConnectionEvents[EventName],
  ): void
  off?<EventName extends keyof AppConnectionEvents>(
    event: EventName,
    handler: AppConnectionEvents[EventName],
  ): void
  /**
   * Host-initiated graceful disconnect (sends WCP6Goodbye before teardown). Edges that only
   * support silent teardown fall back to {@link pruneAppConnection}.
   */
  disconnectAppByInstanceId?(instanceId: string): void
  /** Ask a browser host-resolver UI to pick among ambiguous intent handlers. */
  requestIntentResolution?(
    payload: HostIntentResolverPayload,
    timeoutMs?: number,
  ): Promise<HostIntentResolverResponse>
  resolveIntentSelection?(response: HostIntentResolverResponse): void
}
