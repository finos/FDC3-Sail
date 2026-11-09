import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { settleReview, toReviewDecision, type SailReviewDetails } from "./review"

const details: SailReviewDetails = {
  ruleId: "desk/trade-size",
  score: 0.6,
  message: "Large order",
  activity: { intent: "PlaceOrder" },
}

describe("settleReview", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns the host's decision when it answers before the deadline", async () => {
    const result = await settleReview({ ...details, deadline: 1_005_000 }, () =>
      Promise.resolve({ outcome: "Allow", note: "ok" }),
    )
    expect(result).toEqual({ outcome: "Allow", note: "ok" })
  })

  it("blocks when the deadline passes before the host answers", async () => {
    const pending = settleReview({ ...details, deadline: 1_005_000 }, () => new Promise(() => {}))
    await vi.advanceTimersByTimeAsync(5_000)
    await expect(pending).resolves.toEqual({ outcome: "Block", note: "Review timed out" })
  })

  it("blocks without asking when the deadline has already passed", async () => {
    const ask = vi.fn(() => Promise.resolve({ outcome: "Allow" as const }))
    const result = await settleReview({ ...details, deadline: 999_000 }, ask)
    expect(result.outcome).toBe("Block")
    expect(ask).not.toHaveBeenCalled()
  })

  it("blocks when the host can't serve the review", async () => {
    const result = await settleReview(details, () => Promise.reject(new Error("no browser")))
    expect(result).toEqual({ outcome: "Block", note: "Review unavailable" })
  })

  it("waits for the host with no deadline", async () => {
    const result = await settleReview(details, () => Promise.resolve({ outcome: "Block" }))
    expect(result).toEqual({ outcome: "Block" })
  })
})

describe("toReviewDecision", () => {
  it("keeps a well-formed decision", () => {
    expect(toReviewDecision({ outcome: "Allow", note: "fine" })).toEqual({
      outcome: "Allow",
      note: "fine",
    })
  })

  it("drops an empty or non-string note", () => {
    expect(toReviewDecision({ outcome: "Allow", note: "" })).toEqual({ outcome: "Allow" })
    expect(toReviewDecision({ outcome: "Allow", note: 3 })).toEqual({ outcome: "Allow" })
  })

  it("treats anything malformed as Block", () => {
    expect(toReviewDecision(null)).toEqual({ outcome: "Block" })
    expect(toReviewDecision({ outcome: "Maybe" })).toEqual({ outcome: "Block" })
    expect(toReviewDecision("Allow")).toEqual({ outcome: "Block" })
  })
})
