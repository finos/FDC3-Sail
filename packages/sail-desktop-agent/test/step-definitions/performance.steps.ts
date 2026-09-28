import { Then } from "@cucumber/cucumber"
import expect from "expect"

import { CustomWorld } from "../world/index.ts"

Then(
  "the last broadcast event was delivered within {string} ms of the broadcast request",
  function (this: CustomWorld, budgetMs: string) {
    const requestAt = this.props.lastInboundRequestAt as number | undefined
    if (requestAt === undefined) {
      throw new Error("No inbound request timestamp recorded")
    }

    const lastBroadcast = [...this.mockTransport.getPostedMessages()]
      .reverse()
      .find(record => record.msg.type === "broadcastEvent")

    expect(lastBroadcast).toBeDefined()
    const elapsed = lastBroadcast!.timestamp.getTime() - requestAt
    expect(elapsed).toBeLessThanOrEqual(Number.parseInt(budgetMs, 10))
  },
)

Then(
  "the last addIntentListener response was delivered within {string} ms of the request",
  function (this: CustomWorld, budgetMs: string) {
    const requestAt = this.props.lastInboundRequestAt as number | undefined
    if (requestAt === undefined) {
      throw new Error("No inbound request timestamp recorded")
    }

    const lastResponse = [...this.mockTransport.getPostedMessages()]
      .reverse()
      .find(record => record.msg.type === "addIntentListenerResponse")

    expect(lastResponse).toBeDefined()
    const elapsed = lastResponse!.timestamp.getTime() - requestAt
    expect(elapsed).toBeLessThanOrEqual(Number.parseInt(budgetMs, 10))
  },
)
