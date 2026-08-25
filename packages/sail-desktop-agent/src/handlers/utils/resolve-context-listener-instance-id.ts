import { resolveLinkedInstanceId } from "../../state/selectors/wcp-handshake-routing"
import type { DACPHandlerParams } from "../types"
import { getInstance } from "../../state/selectors"

/**
 * Resolve the agent instance bucket for DACP handlers during WCP handshake.
 *
 * Prefer the registered MessagePort-routed id, then the WCP5 handshake-routing
 * link. Never guess identity from app-supplied meta.
 *
 * Identity is deliberately derived only from what the DA itself registered. An
 * earlier tier read `meta.hostInstanceId` — removed, because that field is
 * app-authored on the wire and let any app act as another live instance
 * (`closeRequest` reaches `appLauncher.close`). It is stripped at the trust
 * boundary (`BrowserAppConnection.enrichMessageWithSource`), but resolving from
 * it here would silently re-open the hole for any future edge that does not run
 * that strip. Host-assigned ids belong in the WCP4 payload, where WCP4 adoption
 * already handles them (`wcp-host-instance-adoption.ts`).
 */
export function resolveDacpHandlerInstanceId(params: DACPHandlerParams): string {
  const { instanceId, getState } = params
  const state = getState()

  // Prefer the MessagePort-routed instance when it is already registered. Pending
  // open-with-context targets are for a *different* instance awaiting a listener;
  // redirecting here breaks broadcastResponse routing back to the connected sender
  // (orphan tabs accumulate when windowClosed broadcasts time out).
  if (getInstance(state, instanceId)) {
    return instanceId
  }

  const linkedInstanceId = resolveLinkedInstanceId(state, instanceId)
  if (linkedInstanceId && getInstance(state, linkedInstanceId)) {
    return linkedInstanceId
  }

  return instanceId
}
