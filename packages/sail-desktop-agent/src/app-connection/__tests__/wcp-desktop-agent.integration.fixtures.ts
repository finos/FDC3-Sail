import type { AppLauncher } from "../../host-contracts/app-launcher"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../agent/default-user-channels"
import { SailDesktopAgent } from "../../agent/sail-desktop-agent"
import type { SailDesktopAgentOptions } from "../../agent/sail-desktop-agent-types"

export const CHANNEL_ID = "fdc3.channel.1"
export const HOST_LAUNCHER_INSTANCE_ID = "uuid-host-0"

export const PORTFOLIO_APP = {
  appId: "portfolioApp",
  title: "Portfolio",
  type: "web" as const,
  details: { url: "https://example.com/portfolio" },
}

export const CHART_APP = {
  appId: "chartApp",
  title: "Chart",
  type: "web" as const,
  details: { url: "https://example.com/chart" },
}

export type TestAgentOptions = Pick<
  SailDesktopAgentOptions,
  | "appLauncher"
  | "heartbeatEnabled"
  | "heartbeatIntervalMs"
  | "heartbeatTimeoutMs"
  | "openContextListenerTimeoutMs"
> & {
  disconnectGracePeriod?: number
  resolveHostIdentifier?: NonNullable<
    SailDesktopAgentOptions["appConnectionOptions"]
  >["resolveHostIdentifier"]
}

export function createTestAgent(options?: TestAgentOptions): SailDesktopAgent {
  const agent = new SailDesktopAgent({
    userChannels: DEFAULT_FDC3_USER_CHANNELS,
    apps: [PORTFOLIO_APP, CHART_APP],
    appLauncher: options?.appLauncher,
    heartbeatEnabled: options?.heartbeatEnabled,
    heartbeatIntervalMs: options?.heartbeatIntervalMs,
    heartbeatTimeoutMs: options?.heartbeatTimeoutMs,
    openContextListenerTimeoutMs: options?.openContextListenerTimeoutMs,
    appConnectionOptions: {
      getIntentResolverUrl: () => false,
      getChannelSelectorUrl: () => false,
      handshakeTimeout: 30_000,
      disconnectGracePeriod: options?.disconnectGracePeriod,
      ...(options?.resolveHostIdentifier !== undefined
        ? { resolveHostIdentifier: options.resolveHostIdentifier }
        : {}),
    },
  })

  agent.start()
  return agent
}

export function createHostInstanceAppLauncher(): AppLauncher {
  return {
    launch(request) {
      return Promise.resolve({
        appId: request.app.appId,
        instanceId: request.app.instanceId ?? HOST_LAUNCHER_INSTANCE_ID,
      })
    },
  }
}
