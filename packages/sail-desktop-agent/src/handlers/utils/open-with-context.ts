import type { BrowserTypes, Context } from "@finos/fdc3"
import { OpenError } from "@finos/fdc3"
import { createDACPEvent, createDACPSuccessResponse } from "../../dacp/dacp-message-creators"
import { sendDACPResponse, sendDACPErrorResponse } from "./dacp-response-utils"
import type { DACPHandlerParams } from "../types"
import { getInstance, isInstanceConnected } from "../../state/selectors"
import type { AgentState, PendingOpenWithContext } from "../../state/types"
import {
  addPendingOpenWithContext,
  removePendingOpenWithContextByRequest,
  setPendingOpenWithContextForInstance,
} from "../../state/mutators"

// Timeout handles are not serializable, so keep them separate from AgentState.
// Pending open-with-context requests themselves live in AgentState so they can be
// inspected/cleared alongside other agent state.
const pendingOpenWithContextTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

/** @internal Returns scheduled open-with-context timeout count (for tests). */
export function getPendingOpenWithContextTimeoutCount(): number {
  return pendingOpenWithContextTimeouts.size
}

/** @internal Clears all open-with-context timeouts (tests only). */
export function clearAllPendingOpenWithContextTimeoutsForTesting(): void {
  for (const handle of pendingOpenWithContextTimeouts.values()) {
    clearTimeout(handle)
  }
  pendingOpenWithContextTimeouts.clear()
}

/**
 * Holds an `openRequest` until its target can be used, then completes it.
 *
 * With a launch context that means the target has a matching context listener; without one
 * (a plain `open()`) it means the target has connected — `handleOpenRequest` pre-registers the
 * launcher id as PENDING before the app is really there, so only WCP5 says it has arrived.
 */
export function registerOpenWithContext(
  message: BrowserTypes.OpenRequest,
  appIdentifier: BrowserTypes.AppIdentifier,
  launchContext: Context | undefined,
  params: DACPHandlerParams,
): void {
  const { instanceId: sourceInstanceId, openContextListenerTimeoutMs } = params
  const targetInstanceId = appIdentifier.instanceId
  if (!targetInstanceId) {
    throw new Error("App identifier missing instanceId for open-with-context")
  }

  // Fast path: if the app is already usable, deliver immediately.
  const targetInstance = getInstance(params.getState(), targetInstanceId)
  const targetIsReady = launchContext
    ? hasMatchingContextListener(targetInstanceId, launchContext.type, params)
    : targetInstance !== undefined && isInstanceConnected(targetInstance)
  if (targetIsReady) {
    deliverOpenWithContext(message, appIdentifier, launchContext, params, sourceInstanceId)
    return
  }

  // Otherwise, store the request and time out if the app never becomes usable.
  // The timeout triggers an AppTimeout error to the caller.
  const requestUuid = message.meta.requestUuid
  const timeoutHandle = setTimeout(() => {
    params.setState((state: AgentState) =>
      removePendingOpenWithContextByRequest(state, targetInstanceId, requestUuid),
    )
    pendingOpenWithContextTimeouts.delete(requestUuid)
    sendDACPErrorResponse({
      message,
      errorType: OpenError.AppTimeout,
      errorMessage: launchContext
        ? "Timed out waiting for context listener"
        : "Timed out waiting for app to connect",
      instanceId: sourceInstanceId,
      responses: params.responses,
    })
  }, openContextListenerTimeoutMs)

  const pendingEntry: PendingOpenWithContext = {
    message,
    appIdentifier,
    launchContext,
    sourceInstanceId,
  }

  // Track the pending request in state; the timeout map is keyed by requestUuid.
  params.setState((state: AgentState) =>
    addPendingOpenWithContext(state, targetInstanceId, pendingEntry),
  )
  pendingOpenWithContextTimeouts.set(requestUuid, timeoutHandle)
}

export function notifyContextListenerAdded(
  instanceId: string,
  contextType: string,
  params: DACPHandlerParams,
): void {
  // Called when an instance adds a context listener; resolve any pending opens that carry a
  // launch context. A listener for "*" matches any pending context type.
  resolvePendingOpens(
    instanceId,
    params,
    pending =>
      pending.launchContext !== undefined &&
      (contextType === "*" || pending.launchContext.type === contextType),
  )
}

/**
 * Called when an instance completes WCP5; resolves plain `open()` requests waiting on it.
 * Pending opens that carry a launch context keep waiting for their listener.
 */
export function notifyInstanceConnected(instanceId: string, params: DACPHandlerParams): void {
  resolvePendingOpens(instanceId, params, pending => pending.launchContext === undefined)
}

/** Complete every pending open on `instanceId` that `matches`; the rest keep waiting. */
function resolvePendingOpens(
  instanceId: string,
  params: DACPHandlerParams,
  matches: (pending: PendingOpenWithContext) => boolean,
): void {
  const state: AgentState = params.getState()
  const pendingList = state.open.pendingWithContext[instanceId]
  if (!pendingList || pendingList.length === 0) {
    return
  }

  const matched = pendingList.filter(matches)
  if (matched.length === 0) {
    return
  }

  params.setState((state: AgentState) =>
    setPendingOpenWithContextForInstance(
      state,
      instanceId,
      pendingList.filter(pending => !matches(pending)),
    ),
  )

  matched.forEach(pending => {
    clearPendingTimeout(pending.message.meta.requestUuid)
    deliverOpenWithContext(
      pending.message,
      pending.appIdentifier,
      pending.launchContext,
      params,
      pending.sourceInstanceId,
    )
  })
}

function clearPendingTimeout(requestUuid: string): void {
  const timeoutHandle = pendingOpenWithContextTimeouts.get(requestUuid)
  if (!timeoutHandle) {
    return
  }
  clearTimeout(timeoutHandle)
  pendingOpenWithContextTimeouts.delete(requestUuid)
}

/**
 * Clears all open-with-context pending entries and module timeouts when the
 * target instance disconnects (invoked from cleanupInstanceDacpState).
 */
export function clearPendingOpenWithContextForInstance(
  targetInstanceId: string,
  params: DACPHandlerParams,
): void {
  const pendingList = params.getState().open.pendingWithContext[targetInstanceId]
  if (!pendingList || pendingList.length === 0) {
    return
  }

  pendingList.forEach(pending => {
    clearPendingTimeout(pending.message.meta.requestUuid)
    sendDACPErrorResponse({
      message: pending.message,
      errorType: OpenError.AppTimeout,
      errorMessage: pending.launchContext
        ? "Timed out waiting for context listener"
        : "Timed out waiting for app to connect",
      instanceId: pending.sourceInstanceId,
      responses: params.responses,
    })
  })
  params.setState(state => setPendingOpenWithContextForInstance(state, targetInstanceId, []))
}

/**
 * Clears open-with-context pending entries whose source disconnected.
 * Scans all target buckets and sends AppTimeout openResponse to the source for each
 * removed pending entry so fdc3.open() promises settle before state is cleared.
 */
export function clearPendingOpenWithContextForSourceInstance(
  sourceInstanceId: string,
  params: DACPHandlerParams,
): void {
  const pendingByInstance = params.getState().open.pendingWithContext
  const bucketsToUpdate: Array<{ targetInstanceId: string; remaining: PendingOpenWithContext[] }> =
    []

  for (const [targetInstanceId, pendingList] of Object.entries(pendingByInstance)) {
    const toRemove = pendingList.filter(pending => pending.sourceInstanceId === sourceInstanceId)
    if (toRemove.length === 0) {
      continue
    }

    toRemove.forEach(pending => {
      clearPendingTimeout(pending.message.meta.requestUuid)
      sendDACPErrorResponse({
        message: pending.message,
        errorType: OpenError.AppTimeout,
        errorMessage: pending.launchContext
          ? "Timed out waiting for context listener"
          : "Timed out waiting for app to connect",
        instanceId: sourceInstanceId,
        responses: params.responses,
      })
    })
    bucketsToUpdate.push({
      targetInstanceId,
      remaining: pendingList.filter(pending => pending.sourceInstanceId !== sourceInstanceId),
    })
  }

  if (bucketsToUpdate.length === 0) {
    return
  }

  params.setState(state => {
    let nextState = state
    for (const { targetInstanceId, remaining } of bucketsToUpdate) {
      nextState = setPendingOpenWithContextForInstance(nextState, targetInstanceId, remaining)
    }
    return nextState
  })
}

function hasMatchingContextListener(
  targetInstanceId: string,
  contextType: string,
  params: DACPHandlerParams,
): boolean {
  const instance = getInstance(params.getState(), targetInstanceId)
  if (!instance) {
    return false
  }

  // Each entry is a listener registration: { contextType, optional channelId } keyed by listener id.
  return Object.values(instance.contextListeners).some(
    listenerRegistration =>
      listenerRegistration.contextType === contextType || listenerRegistration.contextType === "*",
  )
}

function deliverOpenWithContext(
  message: BrowserTypes.OpenRequest,
  appIdentifier: BrowserTypes.AppIdentifier,
  launchContext: Context | undefined,
  params: DACPHandlerParams,
  sourceInstanceId: string,
): void {
  // "Open with context" is modeled as a broadcast to the target instance,
  // then the original openRequest is completed with openResponse. A plain open has
  // nothing to broadcast and only needs the openResponse.
  if (launchContext) {
    const callerInstance = getInstance(params.getState(), sourceInstanceId)
    const broadcastEvent = createDACPEvent("broadcastEvent", {
      channelId: null,
      context: launchContext,
      originatingApp: {
        appId: callerInstance?.appId ?? "unknown",
        instanceId: sourceInstanceId,
      },
    })

    const broadcastEventWithRouting = {
      ...broadcastEvent,
      meta: {
        ...broadcastEvent.meta,
        destination: { instanceId: appIdentifier.instanceId },
      },
    }

    params.responses.sendOutbound(broadcastEventWithRouting)
  }

  const response = createDACPSuccessResponse(message, "openResponse", {
    appIdentifier,
  })

  sendDACPResponse({
    response,
    instanceId: sourceInstanceId,
    responses: params.responses,
  })
}
