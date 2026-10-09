/**
 * FDC3 Desktop Agent — public API.
 *
 * `SailDesktopAgent` extends `AbstractFDC3ServerInstance` from
 * `@finos/sail-headless-agent`. Construct it with `new SailDesktopAgent(options)`,
 * implement {@link AppLauncher}, call `.start()`, and wire host UI through the
 * grouped controllers (`intentResolver`, `channels`, `apps`).
 */

export { SailDesktopAgent } from "./agent/sail-desktop-agent"
export type {
  SailDesktopAgentOptions,
  DesktopAgentAppInstance,
  DesktopAgentAppInstanceStatus,
  DesktopAgentOpenOptions,
} from "./agent/sail-desktop-agent-types"
export type {
  SailDesktopAgentChannels,
  SailDesktopAgentApps,
  AppChannelChangeEvent,
  HandshakeFailureEvent,
} from "./agent/sail-desktop-agent-controllers"

export type { ValidationMode } from "./agent/default-config"
export type { SailDesktopAgentMetadata } from "./agent/default-config"

export { DEFAULT_FDC3_USER_CHANNELS } from "./agent/default-user-channels"

export * from "./host-contracts/index"

export {
  consoleLogger,
  noopLogger,
  createPrefixedLogger,
  type Logger,
  type LogPayloadDetail,
} from "./logging/logger"

/** App directory types for Sail shells (looser than sail-headless-agent openapi types). */
export type { DirectoryApp, WebAppDetails } from "./app-directory/types"

export type {
  AppConnectionMetadata,
  AppConnectionOptions,
} from "./app-connection/browser-app-connection"
export type { BrowserAppConnection } from "./app-connection/browser-app-connection"
