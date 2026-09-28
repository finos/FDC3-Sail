/**
 * FDC3 Desktop Agent — public API.
 *
 * `SailDesktopAgent` is the entry point and the whole implementation — there is no base
 * class to extend or attach to. Construct it with `new SailDesktopAgent(options)`,
 * implement {@link AppLauncher}, call `.start()`, and wire host UI through the grouped
 * controllers (`intentResolver`, `channels`, `apps`).
 *
 * The browser app-connection edge (WCP handshake, per-app `MessagePort`, routing) is
 * internal — the agent owns it and builds one on construction. There is no transport
 * abstraction to configure; test suites may inject a lighter edge via the `appConnection`
 * constructor option instead.
 */

// The Desktop Agent
export { SailDesktopAgent } from "./agent/sail-desktop-agent"
export type {
  SailDesktopAgentOptions,
  DesktopAgentAppInstance,
  DesktopAgentOpenOptions,
} from "./agent/sail-desktop-agent-types"
export type {
  SailDesktopAgentChannels,
  SailDesktopAgentApps,
  AppChannelChangeEvent,
  HandshakeFailureEvent,
} from "./agent/sail-desktop-agent-controllers"

// Validation policy
export type { ValidationMode } from "./agent/default-config"

// Agent identity reported to apps via fdc3.getInfo()
export type { SailDesktopAgentMetadata } from "./agent/default-config"

/**
 * The eight FDC3 standard user channels.
 *
 * Exported so hosts can extend rather than redeclare them:
 * `userChannels: [...DEFAULT_FDC3_USER_CHANNELS, ...myChannels]`. Omit the option
 * entirely to get exactly this set.
 */
export { DEFAULT_FDC3_USER_CHANNELS } from "./agent/default-user-channels"

// Host contracts — implement these to integrate a shell
export * from "./host-contracts/index"

// Logging
export {
  consoleLogger,
  noopLogger,
  createPrefixedLogger,
  type Logger,
  type LogPayloadDetail,
} from "./logging/logger"

// App directory
export type { DirectoryApp, WebAppDetails } from "./app-directory/types"

/**
 * App-connection types that appear in the public agent surface.
 *
 * `AppConnectionMetadata` is the `onAppConnected` / `apps.getConnection(s)` payload;
 * `AppConnectionOptions` configures the edge. All three — including `BrowserAppConnection`,
 * which types `SailDesktopAgent.appConnection` — are genuinely public, not internal-only
 * declaration-emit artifacts: `sail-platform.ts` imports `AppConnectionMetadata` and
 * `BrowserAppConnection` by name, `sail-platform`'s own re-exports and test suite pull in
 * `AppConnectionOptions`, and `sail-conformance-harness` imports `AppConnectionMetadata`.
 * Verified by cutting each and rebuilding: removing any one breaks a real consumer's
 * typecheck, not just this package's own declaration emit.
 */
export type {
  AppConnectionMetadata,
  AppConnectionOptions,
} from "./app-connection/browser-app-connection"
export type { BrowserAppConnection } from "./app-connection/browser-app-connection"
