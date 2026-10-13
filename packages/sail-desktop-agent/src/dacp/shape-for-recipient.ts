/**
 * Fits an outbound DACP message to the FDC3 version its recipient was served at.
 *
 * Handlers build every message the 3.0 way. A 2.x app gets the same message with the 3.0-only
 * payload fields removed — the 2.2 schemas set `additionalProperties: false` — and never gets a
 * 3.0-only event at all. 2.2 apps still learn the sender: these events also carry the 2.2
 * `originatingApp`.
 */

import { isFdc3VersionAtLeast } from "../agent/fdc3-version"
import { getInstanceFdc3Version, resolveInstanceId } from "../state/selectors"
import type { AgentState } from "../state/types"

/** Event types FDC3 2.2 does not define. */
const FDC3_3_0_ONLY_MESSAGE_TYPES = new Set(["contextClearedEvent"])

/** Payload fields added in FDC3 3.0, by message type. */
const FDC3_3_0_ONLY_PAYLOAD_FIELDS: Record<string, readonly string[]> = {
  broadcastEvent: ["metadata"],
  intentEvent: ["metadata"],
  getCurrentContextResponse: ["metadata"],
  raiseIntentResultResponse: ["resultMetadata"],
}

/**
 * @returns the message to send, or `undefined` when the recipient's version has no such message.
 */
export function shapeForRecipient(message: unknown, recipientFdc3Version: string): unknown {
  if (isFdc3VersionAtLeast(recipientFdc3Version, "3.0")) {
    return message
  }
  if (typeof message !== "object" || message === null) {
    return message
  }

  const { type, payload } = message as { type?: unknown; payload?: unknown }
  if (typeof type !== "string") {
    return message
  }
  if (FDC3_3_0_ONLY_MESSAGE_TYPES.has(type)) {
    return undefined
  }

  const fields = FDC3_3_0_ONLY_PAYLOAD_FIELDS[type]
  if (!fields || typeof payload !== "object" || payload === null) {
    return message
  }
  const shapedPayload: Record<string, unknown> = { ...payload }
  for (const field of fields) {
    delete shapedPayload[field]
  }
  return { ...message, payload: shapedPayload }
}

/**
 * {@link shapeForRecipient} for the instance named in `meta.destination`. Messages without a
 * destination, or for an instance not (yet) in state, are shaped for the agent's version.
 */
export function shapeForDestination(
  message: unknown,
  state: AgentState,
  agentFdc3Version: string,
): unknown {
  const destination = (message as { meta?: { destination?: { instanceId?: unknown } } } | null)
    ?.meta?.destination?.instanceId
  if (typeof destination !== "string") {
    return message
  }
  const instanceId = resolveInstanceId(state, destination)
  return shapeForRecipient(message, getInstanceFdc3Version(state, instanceId, agentFdc3Version))
}
