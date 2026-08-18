import type { Logger } from "../../logging/logger"

export const SENSITIVE_MARKER = "SECRET-123"

export interface LogCall {
  message: string
  args: unknown[]
}

export interface CapturingLogger extends Logger {
  infoCalls: LogCall[]
  warnCalls: LogCall[]
  errorCalls: LogCall[]
  debugCalls: LogCall[]
}

export function createCapturingLogger(): CapturingLogger {
  const infoCalls: LogCall[] = []
  const warnCalls: LogCall[] = []
  const errorCalls: LogCall[] = []
  const debugCalls: LogCall[] = []

  return {
    infoCalls,
    warnCalls,
    errorCalls,
    debugCalls,
    info: (message, ...args) => {
      infoCalls.push({ message, args })
    },
    warn: (message, ...args) => {
      warnCalls.push({ message, args })
    },
    error: (message, ...args) => {
      errorCalls.push({ message, args })
    },
    debug: (message, ...args) => {
      debugCalls.push({ message, args })
    },
  }
}

export function serializeLogCalls(calls: LogCall[]): string {
  return JSON.stringify(calls)
}

export function serializeNonDebugLogs(logger: CapturingLogger): string {
  return JSON.stringify({
    info: logger.infoCalls,
    warn: logger.warnCalls,
    error: logger.errorCalls,
  })
}

export function assertSensitiveValueAbsentFromNonDebugLogs(
  logger: CapturingLogger,
  sensitiveValue: string = SENSITIVE_MARKER,
): void {
  const combined = serializeNonDebugLogs(logger)
  if (combined.includes(sensitiveValue)) {
    throw new Error(
      `Expected ${JSON.stringify(sensitiveValue)} to be absent from info/warn/error logs, but found it in: ${combined}`,
    )
  }
}
