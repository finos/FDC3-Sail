import { v4 as uuidv4 } from "uuid"
import {
  settleReview,
  type SailReviewDecision,
  type SailReviewDetails,
  type SailReviewRequest,
} from "@finos/sail-extension"
import {
  SAIL_REVIEW_CLOSED,
  SAIL_REVIEW_REQUEST,
  type SailReviewClosedArgs,
} from "../../common/message-types"

/** The slice of a socket.io socket the review hook needs. */
export type ReviewSocket = {
  connected: boolean
  emitWithAck(event: string, data: SailReviewRequest): Promise<unknown>
  emit(event: string, data: SailReviewClosedArgs): boolean
  once(event: "disconnect", listener: () => void): unknown
  off(event: "disconnect", listener: () => void): unknown
}

/**
 * `ctx.requestReview` for sail-v2-web: the extension runs here on the server, so
 * the dialog is shown in the session's browser over its socket (like SAIL_INTENT_RESOLVE).
 * Resolves Block if no browser is connected, it disconnects or errors, or the deadline passes.
 */
export function requestReviewOverSocket(
  socket: ReviewSocket,
  details: SailReviewDetails,
): Promise<SailReviewDecision> {
  const requestId = uuidv4()
  let onDisconnect: (() => void) | undefined
  let browserAnswered = false
  return settleReview(details, d => {
    if (!socket.connected) {
      return Promise.reject(new Error("No browser connected for review"))
    }
    // socket.io's emitWithAck never settles if the socket drops, so a disconnect rejects it.
    return new Promise<unknown>((resolve, reject) => {
      onDisconnect = () => reject(new Error("Browser disconnected during review"))
      socket.once("disconnect", onDisconnect)
      socket.emitWithAck(SAIL_REVIEW_REQUEST, { ...d, requestId }).then(answer => {
        browserAnswered = true
        resolve(answer)
      }, reject)
    })
  }).finally(() => {
    if (onDisconnect) {
      socket.off("disconnect", onDisconnect)
    }
    // Settled here (deadline, error) while the dialog may still be open: close it from the
    // server so it goes even if the browser's clock is behind. A later ack is ignored.
    if (!browserAnswered && socket.connected) {
      socket.emit(SAIL_REVIEW_CLOSED, { requestId })
    }
  })
}
