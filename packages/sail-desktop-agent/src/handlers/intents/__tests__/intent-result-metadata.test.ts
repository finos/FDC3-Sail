import { describe, expect, it } from "vite-plus/test"

import { buildIntentResultWirePayload } from "../intent-result-metadata"

const TIMESTAMP = "2026-06-19T12:00:00.000Z"
const TARGET = { appId: "intent-b", instanceId: "instance-b-1" }

describe("buildIntentResultWirePayload", () => {
  it("builds DA metadata for void results", () => {
    const { wireIntentResult, resultMetadata } = buildIntentResultWirePayload(
      {},
      undefined,
      TARGET,
      TIMESTAMP,
    )

    expect(wireIntentResult).toEqual({})
    expect(resultMetadata.source).toEqual(TARGET)
    expect(resultMetadata.timestamp).toBe(TIMESTAMP)
    expect(resultMetadata.traceId).toEqual(expect.any(String))
    expect(resultMetadata.traceId.length).toBeGreaterThan(0)
  })

  it("builds DA metadata for plain context results", () => {
    const context = { type: "testContextY", id: { value: "1" } }
    const { wireIntentResult, resultMetadata } = buildIntentResultWirePayload(
      { context },
      undefined,
      TARGET,
      TIMESTAMP,
    )

    expect(wireIntentResult).toEqual({ context })
    expect(resultMetadata.source).toEqual(TARGET)
    expect(resultMetadata.traceId).toEqual(expect.any(String))
  })

  it("merges the handler's signature, antiReplay and custom into context result metadata", () => {
    const context = { type: "testContextY", id: { value: "1" } }
    const signature = { protected: "header", signature: "sig" }
    const antiReplay = { iat: 1, exp: 2, jti: "jti" }
    const { wireIntentResult, resultMetadata } = buildIntentResultWirePayload(
      { context },
      { traceId: "app-trace-id", signature, antiReplay, custom: { key: "value" } },
      TARGET,
      TIMESTAMP,
    )

    expect(wireIntentResult).toEqual({ context })
    expect(resultMetadata.signature).toEqual(signature)
    expect(resultMetadata.antiReplay).toEqual(antiReplay)
    expect(resultMetadata.custom).toEqual({ key: "value" })
    // The agent's traceId takes precedence (FDC3 3.0 IntentResolution.getResultMetadata).
    expect(resultMetadata.traceId).not.toBe("app-trace-id")
    expect(resultMetadata.source).toEqual(TARGET)
  })

  it("builds DA metadata for channel results", () => {
    const channel = { id: "app-channel-1", type: "app" as const }
    const { wireIntentResult, resultMetadata } = buildIntentResultWirePayload(
      { channel },
      { signature: { protected: "header", signature: "sig" } },
      TARGET,
      TIMESTAMP,
    )

    expect(wireIntentResult).toEqual({ channel })
    expect(resultMetadata.source).toEqual(TARGET)
    expect(resultMetadata.signature).toBeUndefined()
  })
})
