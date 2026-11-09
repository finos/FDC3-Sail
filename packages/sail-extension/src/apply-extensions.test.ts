import { describe, expect, it, vi } from "vite-plus/test"
import type { FDC3ServerInstance } from "@finos/sail-headless-agent"
import { applyExtensions } from "./apply-extensions"
import type { SailReviewDecision } from "./review"
import type { SailExtensionContext, SailExtensionStorage } from "./types"

type ReceivableMessage = Parameters<FDC3ServerInstance["receive"]>[0]

const raiseIntent = {
  type: "raiseIntentRequest",
  payload: { intent: "PlaceOrder", context: { type: "fdc3.order" } },
  meta: { requestUuid: "r1", timestamp: new Date(0) },
} as unknown as ReceivableMessage

/** An inner agent that only records what reaches `receive`. */
function fakeAgent() {
  const received: ReceivableMessage[] = []
  const agent = {
    receive: (message: ReceivableMessage) => {
      received.push(message)
      return Promise.resolve()
    },
  } as unknown as FDC3ServerInstance
  return { agent, received }
}

/** The kind of `wrapServer` a review extension writes: hold raiseIntent until the user decides. */
function holdRaiseIntentForReview(
  inner: FDC3ServerInstance,
  ctx: SailExtensionContext,
): FDC3ServerInstance {
  return applyExtensions(inner, {
    async receive(message, from) {
      if (message.type !== "raiseIntentRequest") {
        return inner.receive(message, from)
      }
      // A host without the hook can't show the dialog, so the review counts as Block.
      const decision: SailReviewDecision = ctx.requestReview
        ? await ctx.requestReview({
            ruleId: "desk/trade-size",
            score: 0.6,
            message: "Large order",
            activity: message,
          })
        : { outcome: "Block" }
      if (decision.outcome === "Allow") {
        return inner.receive(message, from)
      }
    },
  })
}

const storage: SailExtensionStorage = {
  get: () => Promise.resolve(null),
  set: () => Promise.resolve(),
  remove: () => Promise.resolve(),
}

describe("wrapServer holding a raiseIntent for review", () => {
  it("forwards the raiseIntent once the user allows it", async () => {
    const { agent, received } = fakeAgent()
    let decide: (d: SailReviewDecision) => void = () => {}
    const requestReview = vi.fn(
      () => new Promise<SailReviewDecision>(resolve => (decide = resolve)),
    )
    const wrapped = holdRaiseIntentForReview(agent, { storage, requestReview })

    const handled = wrapped.receive(raiseIntent, "app-1")
    await Promise.resolve()
    expect(requestReview).toHaveBeenCalledWith(expect.objectContaining({ activity: raiseIntent }))
    expect(received).toEqual([])

    decide({ outcome: "Allow" })
    await handled
    expect(received).toEqual([raiseIntent])
  })

  it("drops the raiseIntent when the user blocks it", async () => {
    const { agent, received } = fakeAgent()
    const requestReview = vi.fn(() => Promise.resolve<SailReviewDecision>({ outcome: "Block" }))
    const wrapped = holdRaiseIntentForReview(agent, { storage, requestReview })

    await wrapped.receive(raiseIntent, "app-1")

    expect(requestReview).toHaveBeenCalledTimes(1)
    expect(received).toEqual([])
  })

  it("drops the raiseIntent when the host has no review hook", async () => {
    const { agent, received } = fakeAgent()
    const wrapped = holdRaiseIntentForReview(agent, { storage })

    await wrapped.receive(raiseIntent, "app-1")

    expect(received).toEqual([])
  })
})
