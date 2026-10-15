/**
 * How much message/context detail agent-internal structured logs include.
 */
export type LogPayloadDetail = "metadata" | "full"

/**
 * Injectable logger interface for DACP handlers.
 * Allows custom logging implementations to be injected.
 *
 * @remarks Agent-internal DACP/WCP helpers may emit full serialized payloads on
 * {@link Logger.debug} when `logPayloadDetail` is `'full'`. The default
 * {@link consoleLogger} leaves `debug` as a no-op so production hosts are not
 * flooded; inject a custom logger to capture debug output.
 */
export interface Logger {
  error: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
  info: (message: string, ...args: unknown[]) => void
  debug: (message: string, ...args: unknown[]) => void
}

/**
 * Default console-based logger implementation.
 * Used when no custom logger is provided.
 */
export const consoleLogger: Logger = {
  error: (message: string, ...args: unknown[]) => {
    console.error(`[DACP ERROR] ${message}`, ...args)
  },
  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[DACP WARN] ${message}`, ...args)
  },
  info: (message: string, ...args: unknown[]) => {
    console.log(`[DACP INFO] ${message}`, ...args)
  },
  debug: () => {
    // No-op by default — enable via custom logger if needed
  },
}

/**
 * Logger that discards all output — useful in tests.
 */
export const noopLogger: Logger = {
  error: () => undefined,
  warn: () => undefined,
  info: () => undefined,
  debug: () => undefined,
}

/**
 * Creates a logger with a prefix.
 */
export function createPrefixedLogger(prefix: string, baseLogger: Logger = consoleLogger): Logger {
  return {
    error: (msg, ...args) => baseLogger.error(`[${prefix}] ${msg}`, ...args),
    warn: (msg, ...args) => baseLogger.warn(`[${prefix}] ${msg}`, ...args),
    info: (msg, ...args) => baseLogger.info(`[${prefix}] ${msg}`, ...args),
    debug: (msg, ...args) => baseLogger.debug(`[${prefix}] ${msg}`, ...args),
  }
}
