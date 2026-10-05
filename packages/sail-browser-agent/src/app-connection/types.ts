import type { HostIntentResolverPayload, HostIntentResolverResponse } from "../host-contracts"
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
 */
export interface AgentAppConnection {
  start(): void
  stop(): void
  onAppMessage(handler: AppMessageHandler): void
  setOnInstanceTeardown(handler: (instanceId: string) => void): void
  setOnAgentDisconnect?(handler: () => void): void
  readonly connectionRegistry: AppConnectionDelivery
  getConnection(instanceId: string): AppConnectionMetadata | undefined
  getConnections(): AppConnectionMetadata[]
  pruneAppConnection(instanceId: string): void
  notifyChannelMembershipChanged?(instanceId: string, channelId: string | null): void
  on?<EventName extends keyof AppConnectionEvents>(
    event: EventName,
    handler: AppConnectionEvents[EventName],
  ): void
  off?<EventName extends keyof AppConnectionEvents>(
    event: EventName,
    handler: AppConnectionEvents[EventName],
  ): void
  disconnectAppByInstanceId?(instanceId: string): void
  requestIntentResolution?(
    payload: HostIntentResolverPayload,
    timeoutMs?: number,
  ): Promise<HostIntentResolverResponse>
  resolveIntentSelection?(response: HostIntentResolverResponse): void
}
