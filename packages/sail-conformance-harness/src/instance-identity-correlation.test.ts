import { describe, expect, it } from "vite-plus/test"
import type { Logger } from "@finos/sail-desktop-agent"
import {
  assertInstanceIdentityCorrelated,
  findHarnessCorrelationLog,
  HARNESS_CORRELATION_LOG_TAG,
  runHarnessOpenAndWcpHandshake,
} from "./__tests__/harness-instance-correlation.harness"

function createCaptureLogger(lines: string[]): Logger {
  const append = (level: string, message: string, meta?: unknown) => {
    const payload = meta === undefined ? message : `${message} ${JSON.stringify(meta)}`
    lines.push(`[${level}] ${payload}`)
  }

  return {
    info: (message, meta) => append("info", message, meta),
    warn: (message, meta) => append("warn", message, meta),
    error: (message, meta) => append("error", message, meta),
    debug: (message, meta) => append("debug", message, meta),
  }
}

describe("harness instance identity correlation (Phase 1 spike)", () => {
  it("correlates launcher instanceId, iframe name, WCP5 id, and findInstances after fdc3.open + WCP handshake", async () => {
    const snapshot = await runHarnessOpenAndWcpHandshake()

    assertInstanceIdentityCorrelated(snapshot)
  })

  it(`emits ${HARNESS_CORRELATION_LOG_TAG} when logPayloadDetail is full`, async () => {
    const logLines: string[] = []
    await runHarnessOpenAndWcpHandshake({
      logger: createCaptureLogger(logLines),
      logPayloadDetail: "full",
    })

    const correlationLog = findHarnessCorrelationLog(logLines)
    expect(correlationLog).toBeDefined()
    assertInstanceIdentityCorrelated(correlationLog!)
  })
})
