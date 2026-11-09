/** What an extension asks the user to review. */
export type SailReviewDetails = {
  /** `<rule set id>/<rule id>` */
  ruleId: string
  score: number
  message: string
  /** What the agent tried to do, e.g. the held `raiseIntent`. */
  activity: unknown
  /** Epoch ms. After this the dialog closes and the review counts as Block. */
  deadline?: number
}

/** The user's answer to a review. */
export type SailReviewDecision = { outcome: "Allow" | "Block"; note?: string }

/** The decision when a review's deadline passes before the user answers. */
export const REVIEW_TIMED_OUT: SailReviewDecision = { outcome: "Block", note: "Review timed out" }

/** Asks the host to show a review;resolves with the user's decision. */
export type SailRequestReview = (details: SailReviewDetails) => Promise<SailReviewDecision>

/** A host's view of a review it is showing: the details plus an id to answer it by. */
export type SailReviewRequest = SailReviewDetails & { requestId: string }

/** Turns an untrusted answer (e.g. from a socket) into a decision; anything malformed is Block. */
export function toReviewDecision(raw: unknown): SailReviewDecision {
  if (typeof raw !== "object" || raw === null) {
    return { outcome: "Block" }
  }
  const { outcome, note } = raw as { outcome?: unknown; note?: unknown }
  if (outcome !== "Allow" && outcome !== "Block") {
    return { outcome: "Block" }
  }
  return typeof note === "string" && note.length > 0 ? { outcome, note } : { outcome }
}

/**
 * Runs `ask` for a host review and always settles: Block when the deadline passes
 * first, or when the host can't serve it (rejects or returns junk).
 */
export function settleReview(
  details: SailReviewDetails,
  ask: (details: SailReviewDetails) => Promise<unknown>,
): Promise<SailReviewDecision> {
  if (details.deadline === undefined) {
    return askSafely(details, ask)
  }
  const remaining = details.deadline - Date.now()
  if (remaining <= 0) {
    return Promise.resolve(REVIEW_TIMED_OUT)
  }
  const answer = askSafely(details, ask)
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<SailReviewDecision>(resolve => {
    timer = setTimeout(() => {
      resolve(REVIEW_TIMED_OUT)
    }, remaining)
  })
  return Promise.race([answer, timeout]).finally(() => {
    clearTimeout(timer)
  })
}

/** Runs `ask`, turning a rejection or a malformed answer into Block. */
function askSafely(
  details: SailReviewDetails,
  ask: (details: SailReviewDetails) => Promise<unknown>,
): Promise<SailReviewDecision> {
  const unavailable: SailReviewDecision = { outcome: "Block", note: "Review unavailable" }
  // Call `ask` synchronously so the host shows the dialog straight away; a throw is Block.
  try {
    return ask(details).then(toReviewDecision, () => unavailable)
  } catch {
    return Promise.resolve(unavailable)
  }
}
