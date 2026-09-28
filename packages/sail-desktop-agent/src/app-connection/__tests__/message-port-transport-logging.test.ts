/**
 * MessagePortTransport structured logging policy tests.
 */

import { beforeEach, describe, expect, it } from "vite-plus/test"

import {
  assertSensitiveValueAbsentFromNonDebugLogs,
  createCapturingLogger,
  SENSITIVE_MARKER,
  serializeLogCalls,
} from "../../__tests__/utils/capturing-logger"
import type { Logger } from "../../logging/logger"
import { MessagePortTransport } from "../message-port"

type MessagePortTransportLoggingOptions = {
  logger?: Logger
  logPayloadDetail?: "metadata" | "full"
}

function createTransportWithLogging(
  port: MessagePort,
  options?: MessagePortTransportLoggingOptions,
): MessagePortTransport {
  return new MessagePortTransport(port, options)
}

describe("MessagePortTransport logging", () => {
  let channel: MessageChannel
  let port1: MessagePort

  beforeEach(() => {
    channel = new MessageChannel()
    port1 = channel.port1
  })

  it("routes transport logs through the injected logger", () => {
    const logger = createCapturingLogger()
    const transport = createTransportWithLogging(port1, { logger, logPayloadDetail: "metadata" })

    transport.send({ type: "ping" })

    expect(logger.debugCalls.some(call => call.message.includes("Sending message"))).toBe(true)
  })

  it("does not log full broadcast payloads at info warn or error with default metadata policy", () => {
    const logger = createCapturingLogger()
    const transport = createTransportWithLogging(port1, { logger, logPayloadDetail: "metadata" })

    transport.onMessage(() => undefined)

    const broadcastEvent = {
      type: "broadcastEvent",
      meta: { eventUuid: "broadcast-event-log-redaction-uuid" },
      payload: {
        channelId: "fdc3.channel.1",
        context: {
          type: "fdc3.instrument",
          accountNumber: SENSITIVE_MARKER,
        },
      },
    }

    port1.dispatchEvent(new MessageEvent("message", { data: broadcastEvent }))

    assertSensitiveValueAbsentFromNonDebugLogs(logger)
    expect(serializeLogCalls(logger.debugCalls)).not.toContain("fullMessage")
    expect(serializeLogCalls(logger.debugCalls)).not.toContain(SENSITIVE_MARKER)
  })

  it("may include full broadcast payload on debug when logPayloadDetail is full", () => {
    const logger = createCapturingLogger()
    const transport = createTransportWithLogging(port1, { logger, logPayloadDetail: "full" })

    transport.onMessage(() => undefined)

    const broadcastEvent = {
      type: "broadcastEvent",
      meta: { eventUuid: "broadcast-event-full-log-uuid" },
      payload: {
        channelId: "fdc3.channel.1",
        context: {
          type: "fdc3.instrument",
          accountNumber: SENSITIVE_MARKER,
        },
      },
    }

    port1.dispatchEvent(new MessageEvent("message", { data: broadcastEvent }))

    assertSensitiveValueAbsentFromNonDebugLogs(logger)
    expect(serializeLogCalls(logger.debugCalls)).toContain(SENSITIVE_MARKER)
  })
})
