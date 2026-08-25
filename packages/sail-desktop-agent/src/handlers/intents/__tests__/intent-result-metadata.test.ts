import { describe, expect, it } from "vite-plus/test"

import { buildIntentResultWirePayload } from "../intent-result-metadata"

const TIMESTAMP = "2026-06-19T12:00:00.000Z"
const TARGET = { appId: "intent-b", instanceId: "instance-b-1" }

describe("buildIntentResultWirePayload", () => {
  it("builds DA metadata for void results", () => {
    const { wireIntentResult, resultMetadata } = buildIntentResultWirePayload(
      {},
      TARGET.appId,
      TARGET.instanceId,
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
      TARGET.appId,
      TARGET.instanceId,
      TIMESTAMP,
    )

    expect(wireIntentResult).toEqual({ context })
    expect(resultMetadata.source).toEqual(TARGET)
    expect(resultMetadata.traceId).toEqual(expect.any(String))
  })

  it("strips app metadata from wire intentResult and merges for ContextWithMetadata", () => {
    const context = { type: "testContextY", id: { value: "1" } }
    const { wireIntentResult, resultMetadata } = buildIntentResultWirePayload(
      {
        context,
        metadata: {
          traceId: "app-trace-id",
          signature: "app-sig",
          custom: { key: "value" },
        },
      },
      TARGET.appId,
      TARGET.instanceId,
      TIMESTAMP,
    )

    expect(wireIntentResult).toEqual({ context })
    expect(resultMetadata.signature).toBe("app-sig")
    expect(resultMetadata.custom).toEqual({ key: "value" })
    expect(resultMetadata.traceId).not.toBe("app-trace-id")
    expect(resultMetadata.source).toEqual(TARGET)
  })

  it("builds DA metadata for channel results", () => {
    const channel = { id: "app-channel-1", type: "app" as const }
    const { wireIntentResult, resultMetadata } = buildIntentResultWirePayload(
      { channel },
      TARGET.appId,
      TARGET.instanceId,
      TIMESTAMP,
    )

    expect(wireIntentResult).toEqual({ channel })
    expect(resultMetadata.source).toEqual(TARGET)
    expect(resultMetadata.signature).toBeUndefined()
  })
})
