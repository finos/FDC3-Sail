import type { AppConnectionEvents } from "../app-connection-events"
import { consoleLogger } from "../../logging/logger"

/**
 * `on` / `off` / `emit` registry for {@link AppConnectionEvents}.
 *
 * Named for app connections rather than WCP because the mechanism carries no WCP semantics —
 * any {@link AgentAppConnection} edge may extend it, and a non-WCP test edge already does
 * (`EmittingTestAppConnection` in `agent/__tests__/sail-desktop-agent-edge-routing.test.ts`).
 *
 * Its ties to WCP are in the payloads, not the emitter: `handshakeFailed` describes the WCP
 * handshake, and `appConnected` carries {@link AppConnectionMetadata}, which is WCP-shaped
 * (`connectionAttemptUuid` from WCP1Hello, `messageOrigin` for WCP4, `port`, `source`).
 * `appDisconnected`, `channelChanged` and `intentResolverNeeded` are transport-neutral.
 * {@link BrowserAppConnection} is the only production consumer today.
 */
export class AppConnectionEventEmitter {
  private handlers: { [K in keyof AppConnectionEvents]?: Set<AppConnectionEvents[K]> } = {}

  on<EventName extends keyof AppConnectionEvents>(
    event: EventName,
    handler: AppConnectionEvents[EventName],
  ): void {
    if (!this.handlers[event]) {
      ;(this.handlers as Record<EventName, Set<AppConnectionEvents[EventName]>>)[event] = new Set()
    }
    this.handlers[event]!.add(handler)
  }

  off<EventName extends keyof AppConnectionEvents>(
    event: EventName,
    handler: AppConnectionEvents[EventName],
  ): void {
    this.handlers[event]?.delete(handler)
  }

  protected emit<EventName extends keyof AppConnectionEvents>(
    event: EventName,
    ...args: Parameters<AppConnectionEvents[EventName]>
  ): void {
    const handlers = this.handlers[event]
    if (!handlers) {
      return
    }

    for (const handler of handlers) {
      try {
        ;(handler as (...args: Parameters<AppConnectionEvents[EventName]>) => void)(...args)
      } catch (error) {
        consoleLogger.error(`Error in ${event} handler:`, error)
      }
    }
  }
}
