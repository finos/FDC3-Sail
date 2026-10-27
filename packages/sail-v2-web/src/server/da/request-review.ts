import { v4 as uuidv4 } from "uuid"
import {
  settleReview,
  type SailReviewDecision,
  type SailReviewDetails,
  type SailReviewRequest,
} from "@finos/sail-extension"
import { SAIL_REVIEW_REQUEST } from "../../common/message-types"

/** The slice of a socket.io socket the review hook needs. */
export type ReviewSocket = {
  connected: boolean
  emitWithAck(event: string, data: SailReviewRequest): Promise<unknown>
}

/**
 * `ctx.requestReview` for sail-v2-web: the extension runs here on the server, so
 * the dialog is shown in the session's browser over its socket (like SAIL_INTENT_RESOLVE).
 * Resolves Block if no browser is connected, it errors, or the deadline passes.
 */
export function requestReviewOverSocket(
  socket: ReviewSocket,
  details: SailReviewDetails,
): Promise<SailReviewDecision> {
  return settleReview(details, d => {
    if (!socket.connected) {
      return Promise.reject(new Error("No browser connected for review"))
    }
    return socket.emitWithAck(SAIL_REVIEW_REQUEST, { ...d, requestId: uuidv4() })
  })
}
