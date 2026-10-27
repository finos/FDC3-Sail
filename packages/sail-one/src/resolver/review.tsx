import { useEffect, useState } from "react"
import {
  REVIEW_TIMED_OUT,
  type SailReviewDecision,
  type SailReviewRequest,
} from "@finos/sail-extension"
import { Popup, PopupButton } from "../popups/popup"
import styles from "./styles.module.css"

/** Whole seconds left until `deadline` (never below zero), or null when there is none. */
function secondsLeft(deadline: number | undefined): number | null {
  return deadline === undefined ? null : Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
}

/** Pretty JSON of the activity, falling back to plain text when it can't be serialised. */
function describeActivity(activity: unknown): string {
  // JSON.stringify gives undefined for these, despite its return type.
  if (activity === undefined || typeof activity === "function") {
    return String(activity)
  }
  try {
    return JSON.stringify(activity, null, 2)
  } catch {
    // e.g. a circular object
    return "(activity can't be shown)"
  }
}

/** Shows an extension's review: what the agent tried and why, with Allow / Block and a note. */
export function ReviewPanel({
  request,
  decide,
}: {
  request: SailReviewRequest
  decide: (decision: SailReviewDecision) => void
}) {
  const [note, setNote] = useState("")
  const [remaining, setRemaining] = useState(() => secondsLeft(request.deadline))

  useEffect(() => {
    if (request.deadline === undefined) {
      return
    }
    const timer = setInterval(() => {
      setRemaining(secondsLeft(request.deadline))
    }, 1000)
    return () => {
      clearInterval(timer)
    }
  }, [request.deadline])

  useEffect(() => {
    // The host also blocks at the deadline; this just closes the dialog promptly.
    if (remaining === 0) {
      decide(REVIEW_TIMED_OUT)
    }
  }, [remaining, decide])

  function answer(outcome: SailReviewDecision["outcome"]): void {
    const trimmed = note.trim()
    decide(trimmed ? { outcome, note: trimmed } : { outcome })
  }

  return (
    <Popup
      key="Review"
      title="Review this action"
      area={
        <div className={styles.reviewContainer}>
          <p className={styles.reviewMessage}>{request.message}</p>
          <dl className={styles.reviewFacts}>
            <dt>Rule</dt>
            <dd>{request.ruleId}</dd>
            <dt>Score</dt>
            <dd>{request.score}</dd>
            {remaining !== null ? (
              <>
                <dt>Time left</dt>
                <dd>{remaining}s</dd>
              </>
            ) : null}
          </dl>
          <p className={styles.reviewLabel}>What the agent tried</p>
          <pre className={styles.reviewActivity}>{describeActivity(request.activity)}</pre>
          <label className={styles.reviewLabel}>
            Note (optional)
            <textarea
              className={styles.reviewNote}
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
            />
          </label>
        </div>
      }
      buttons={[
        <PopupButton
          key="allow"
          text="Allow"
          primary
          disabled={false}
          onClick={() => answer("Allow")}
        />,
      ]}
      closeAction={() => answer("Block")}
      closeName="Block"
    />
  )
}
