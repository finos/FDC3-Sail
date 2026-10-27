import { afterEach, describe, expect, it, vi } from "vitest"
import type { SailReviewDetails } from "@finos/sail-extension"
import { requestReviewOverSocket, type ReviewSocket } from "../src/server/da/request-review"
import { SAIL_REVIEW_REQUEST } from "../src/common/message-types"

const details: SailReviewDetails = {
  ruleId: "desk/trade-size",
  score: 0.6,
  message: "Large order",
  activity: { intent: "PlaceOrder" },
}

function fakeSocket(connected: boolean, answer: (data: unknown) => Promise<unknown>) {
  const sent: { event: string; data: unknown }[] = []
  const socket: ReviewSocket = {
    connected,
    emitWithAck: (event, data) => {
      sent.push({ event, data })
      return answer(data)
    },
  }
  return { socket, sent }
}

describe("requestReviewOverSocket", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("asks the browser with a request id and returns its decision", async () => {
    const { socket, sent } = fakeSocket(true, () =>
      Promise.resolve({ outcome: "Allow", note: "checked" }),
    )

    const result = await requestReviewOverSocket(socket, details)

    expect(result).toEqual({ outcome: "Allow", note: "checked" })
    expect(sent).toHaveLength(1)
    expect(sent[0].event).toBe(SAIL_REVIEW_REQUEST)
    expect(sent[0].data).toMatchObject({ ...details, requestId: expect.any(String) })
  })

  it("blocks without asking when no browser is connected", async () => {
    const { socket, sent } = fakeSocket(false, () => Promise.resolve({ outcome: "Allow" }))

    const result = await requestReviewOverSocket(socket, details)

    expect(result.outcome).toBe("Block")
    expect(sent).toHaveLength(0)
  })

  it("blocks at the deadline when the browser never answers", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)
    const { socket } = fakeSocket(true, () => new Promise(() => {}))

    const pending = requestReviewOverSocket(socket, { ...details, deadline: 1_002_000 })
    await vi.advanceTimersByTimeAsync(2_000)

    await expect(pending).resolves.toEqual({ outcome: "Block", note: "Review timed out" })
  })

  it("blocks when the browser sends back something malformed", async () => {
    const { socket } = fakeSocket(true, () => Promise.resolve({ outcome: "yes" }))

    await expect(requestReviewOverSocket(socket, details)).resolves.toEqual({ outcome: "Block" })
  })
})
