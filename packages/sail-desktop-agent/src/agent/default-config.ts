/**
 * FDC3-Sail product defaults for Desktop Agent configuration.
 *
 * Single source of truth for implementation metadata, user channels, and timing
 * defaults. `SailDesktopAgent` merges these with caller overrides in its constructor.
 */

import type { BrowserTypes } from "@finos/fdc3"
import pkg from "../../package.json"
import { DACP_TIMEOUTS } from "../dacp/dacp-constants"
import type { SailDesktopAgentConfig, SailDesktopAgentOptions } from "./sail-desktop-agent-types"
import { DEFAULT_FDC3_USER_CHANNELS } from "./default-user-channels"
import type { AgentAppConnection } from "../app-connection/types"

export type { ValidationMode } from "../dacp/validate-dacp-message"

export type SailDesktopAgentMetadata = Pick<
  BrowserTypes.ImplementationMetadata,
  "fdc3Version" | "provider" | "providerVersion"
> &
  Pick<Required<BrowserTypes.ImplementationMetadata>, "optionalFeatures">

export const DEFAULT_SAIL_DESKTOP_AGENT_METADATA: SailDesktopAgentMetadata = {
  fdc3Version: "2.2",
  provider: "FDC3-Sail",
  providerVersion: pkg.version,
  optionalFeatures: {
    DesktopAgentBridging: false,
    OriginatingAppMetadata: true,
    UserChannelMembershipAPIs: true,
  },
}

/** Product defaults merged into every `SailDesktopAgent` unless overridden. */
export const DEFAULT_SAIL_DESKTOP_AGENT_CONFIG = {
  desktopAgentMetadata: DEFAULT_SAIL_DESKTOP_AGENT_METADATA,
  userChannels: DEFAULT_FDC3_USER_CHANNELS,
  logPayloadDetail: "metadata" as const,
  validation: "warn" as const,
  openContextListenerTimeoutMs: DACP_TIMEOUTS.MINIMUM_APP_LAUNCH,
  pendingIntentTimeoutMs: 90_000,
  heartbeatEnabled: true,
  heartbeatIntervalMs: 30_000,
  heartbeatTimeoutMs: 60_000,
  channelChangeTimeoutMs: 10_000,
} satisfies Pick<
  SailDesktopAgentConfig,
  | "desktopAgentMetadata"
  | "userChannels"
  | "logPayloadDetail"
  | "validation"
  | "openContextListenerTimeoutMs"
  | "pendingIntentTimeoutMs"
  | "heartbeatEnabled"
  | "heartbeatIntervalMs"
  | "heartbeatTimeoutMs"
  | "channelChangeTimeoutMs"
>

function mergeImplementationMetadata(
  base: SailDesktopAgentMetadata,
  override?: Partial<SailDesktopAgentMetadata>,
): SailDesktopAgentMetadata {
  if (!override) {
    return base
  }

  return {
    ...base,
    ...override,
    optionalFeatures: {
      ...base.optionalFeatures,
      ...override.optionalFeatures,
    },
  }
}

/**
 * Merge FDC3-Sail product defaults with caller options.
 * Used by `SailDesktopAgent`'s constructor; exported for tests and pre-built config.
 *
 * Accepts `SailDesktopAgentOptions<AgentAppConnection>` — the widest edge bound — because this
 * function only merges and forwards `appConnection`, never inspects its specific edge type. That
 * lets `SailDesktopAgent<TEdge>`'s constructor call it with `SailDesktopAgentOptions<TEdge>` for
 * any `TEdge`, not just the default `BrowserAppConnection`.
 */
export function resolveDesktopAgentConfig(
  options: SailDesktopAgentOptions<AgentAppConnection> = {},
): SailDesktopAgentConfig {
  const { implementationMetadata, ...rest } = options

  return {
    ...DEFAULT_SAIL_DESKTOP_AGENT_CONFIG,
    ...rest,
    userChannels: rest.userChannels ?? DEFAULT_SAIL_DESKTOP_AGENT_CONFIG.userChannels,
    logPayloadDetail: rest.logPayloadDetail ?? DEFAULT_SAIL_DESKTOP_AGENT_CONFIG.logPayloadDetail,
    validation: rest.validation ?? DEFAULT_SAIL_DESKTOP_AGENT_CONFIG.validation,
    openContextListenerTimeoutMs:
      rest.openContextListenerTimeoutMs ??
      DEFAULT_SAIL_DESKTOP_AGENT_CONFIG.openContextListenerTimeoutMs,
    pendingIntentTimeoutMs:
      rest.pendingIntentTimeoutMs ?? DEFAULT_SAIL_DESKTOP_AGENT_CONFIG.pendingIntentTimeoutMs,
    heartbeatEnabled: rest.heartbeatEnabled ?? DEFAULT_SAIL_DESKTOP_AGENT_CONFIG.heartbeatEnabled,
    heartbeatIntervalMs:
      rest.heartbeatIntervalMs ?? DEFAULT_SAIL_DESKTOP_AGENT_CONFIG.heartbeatIntervalMs,
    heartbeatTimeoutMs:
      rest.heartbeatTimeoutMs ?? DEFAULT_SAIL_DESKTOP_AGENT_CONFIG.heartbeatTimeoutMs,
    channelChangeTimeoutMs:
      rest.channelChangeTimeoutMs ?? DEFAULT_SAIL_DESKTOP_AGENT_CONFIG.channelChangeTimeoutMs,
    desktopAgentMetadata: mergeImplementationMetadata(
      DEFAULT_SAIL_DESKTOP_AGENT_METADATA,
      implementationMetadata,
    ),
  }
}
