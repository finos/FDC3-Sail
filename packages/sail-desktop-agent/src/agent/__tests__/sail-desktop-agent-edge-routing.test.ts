/**
 * Controllers must wire to the injected `appConnection` edge (not a second unused edge).
 *
 * `DacpTestAppConnection` has no event emitter, so it cannot distinguish "wired to the right
 * object" from "wired to nothing". This edge adds just enough (extends
 * `AppConnectionEventEmitter`) to prove which object the controllers listen on.
 */

import { describe, expect, it } from "vite-plus/test"
import { SailDesktopAgent } from "../sail-desktop-agent"
import { AppConnectionEventEmitter } from "../../app-connection/wcp/app-connection-event-emitter"
import type { AgentAppConnection, AppMessageHandler } from "../../app-connection/types"
import type { AppConnectionMetadata } from "../../app-connection/wcp/wcp-types"

/**
 * Minimal injectable test edge that both satisfies {@link AgentAppConnection} and can emit
 * the lifecycle events `apps`/`channels` controllers subscribe to.
 */
class EmittingTestAppConnection extends AppConnectionEventEmitter implements AgentAppConnection {
  readonly connectionRegistry = { sendToAppInstance: (_message: unknown): void => {} }
  start(): void {}
  stop(): void {}
  onAppMessage(_handler: AppMessageHandler): void {}
  setOnInstanceTeardown(_handler: (instanceId: string) => void): void {}
  getConnection(_instanceId: string): AppConnectionMetadata | undefined {
    return undefined
  }
  getConnections(): AppConnectionMetadata[] {
    return []
  }
  pruneAppConnection(_instanceId: string): void {}

  /** Simulate the edge itself announcing a new app connection. */
  simulateAppConnected(metadata: AppConnectionMetadata): void {
    this.emit("appConnected", metadata)
  }
}

const fakeMetadata: AppConnectionMetadata = {
  instanceId: "instance-1",
  appId: "app-1",
  connectionAttemptUuid: "attempt-1",
  messageOrigin: "https://example.com",
  source: {} as Window,
  port: {} as MessagePort,
  connectedAt: new Date(),
}

describe("SailDesktopAgent — injected edge routing (slice 2.6)", () => {
  it("apps.onConnect fires from the injected appConnection edge", () => {
    const edge = new EmittingTestAppConnection()
    const agent = new SailDesktopAgent({ appConnection: edge })

    const received: AppConnectionMetadata[] = []
    agent.apps.onConnect(metadata => {
      received.push(metadata)
    })

    edge.simulateAppConnected(fakeMetadata)

    expect(received).toEqual([fakeMetadata])
  })

  it("appConnection is the injected edge itself", () => {
    const edge = new EmittingTestAppConnection()
    const agent = new SailDesktopAgent({ appConnection: edge })

    expect(agent.appConnection).toBe(edge)
  })
})
