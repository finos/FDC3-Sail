import type { DACPHandlerParams } from "../types"
import { getInstance } from "../../state/selectors"
import { migratePendingOpenWithContextTarget, removeInstance } from "../../state/mutators"
import { AppInstanceState } from "../../state/types"
import type { AgentState } from "../../state/types"
import type { InstanceIdentityRecord } from "../../app-connection/wcp/instance-identity-registry"

export function tryAdoptHostPreRegisteredInstance(params: {
  reconnectInstanceId?: string
  reconnectInstanceUuid?: string
  /** Host-assigned browsing context name from WCP1 (`window.name` / iframe `name`). */
  hostIdentifier?: string
  sourceWindow: unknown
  appId: string
  getState: () => AgentState
  identityMap: Map<string, InstanceIdentityRecord>
}): { instanceId: string; instanceUuid: string } | undefined {
  const {
    reconnectInstanceId,
    reconnectInstanceUuid,
    hostIdentifier,
    sourceWindow,
    appId,
    getState,
    identityMap,
  } = params

  const adoptParams = { sourceWindow, appId, getState, identityMap }

  const explicitHostInstanceId =
    reconnectInstanceId && canAdoptPendingHostInstance({ reconnectInstanceId, ...adoptParams })
      ? reconnectInstanceId
      : undefined

  const hostIdentifierInstanceId =
    hostIdentifier &&
    hostIdentifier !== reconnectInstanceId &&
    canAdoptPendingHostInstance({ reconnectInstanceId: hostIdentifier, ...adoptParams })
      ? hostIdentifier
      : undefined

  const solePendingHostInstanceId = findSolePendingHostInstanceId(getState(), appId, identityMap)

  const hostInstanceId =
    explicitHostInstanceId ?? hostIdentifierInstanceId ?? solePendingHostInstanceId
  if (!hostInstanceId) {
    return undefined
  }

  return {
    instanceId: hostInstanceId,
    instanceUuid: reconnectInstanceUuid ?? crypto.randomUUID(),
  }
}

export function reconcileOrphanPendingHostInstances(
  params: DACPHandlerParams,
  appId: string,
  validatedInstanceId: string,
): void {
  // Reap only PENDING registrations made *before* the one that just connected. A registration
  // made *after* it is a concurrent launch whose context has not connected yet, and reaping that
  // would delete an instanceId its `open()` caller already holds.
  //
  // This is a heuristic, not an implication. `openResponse` is returned before WCP4 (see
  // `handleOpenRequest`), so nothing serialises which of two concurrent launches connects first.
  // When the *later* launch validates first, the earlier PENDING row is reaped even though it was
  // never abandoned, and its own WCP4 then mints an id no caller holds — the same defect mirrored.
  //
  // That is deliberate: a later launch reaching WCP4 first is the only abandoned-launch signal the
  // agent has. Only the host knows whether a browsing context is still alive (the harness uses
  // `popupWatcher.hasPopup()`), and plumbing liveness in would be a new host contract.
  //
  // Registration order is derived explicitly from `registrationSequence` — a monotonic counter
  // assigned once per instance at `connectInstance` — not from `Object.values()` key order or from
  // `createdAt`. Two reasons neither of those suffices:
  //   - `Object.values()` enumerates integer-like keys first, in ascending numeric order, ahead of
  //     every string key, regardless of insertion order. An instance with an integer-like id
  //     (reachable via `open({ instanceId: "7" })` or a host-injectable `createId`) would otherwise
  //     always sort to index 0 no matter when it was actually registered.
  //   - `createdAt` is `new Date()`, millisecond resolution. Concurrent same-appId launches — the
  //     exact case this function exists to arbitrate — are pre-registered back-to-back and routinely
  //     land in the same millisecond, at which point a `createdAt` sort falls back to the original
  //     (unstable, key-order-dependent) array order via `Array.prototype.sort`'s stability guarantee.
  const instances = Object.values(params.getState().instances).sort(
    (a, b) => a.registrationSequence - b.registrationSequence,
  )
  const validatedIndex = instances.findIndex(
    instance => instance.instanceId === validatedInstanceId,
  )

  // If the validated instance is somehow not in state, fail safe and reap nothing rather than
  // treating a `-1` index as "reap everything" (`Math.max` clamps the slice to empty). Unreachable
  // from the single call site today — all three id-producing branches upstream guarantee the
  // instance is in state first — so this is defensive only.
  const orphanInstanceIds = instances
    .slice(0, Math.max(validatedIndex, 0))
    .filter(instance => instance.appId === appId && instance.state === AppInstanceState.PENDING)
    .map(instance => instance.instanceId)

  if (orphanInstanceIds.length === 0) {
    return
  }

  // Migrating a reaped row's pending open means the two open flavours land differently. For an
  // open *with* context the context has to be delivered somewhere and the validated instance is
  // the only live candidate, so re-targeting is right. For a *plain* open it substitutes a
  // different instance: the caller is answered with `validatedInstanceId`, an id its own launch
  // never produced, so two `open()` calls can resolve to one instanceId. That still beats the
  // pre-migration outcome of handing back an id whose browsing context is gone.
  params.setState(state => {
    let nextState = state
    for (const orphanInstanceId of orphanInstanceIds) {
      nextState = migratePendingOpenWithContextTarget(
        nextState,
        orphanInstanceId,
        validatedInstanceId,
      )
      nextState = removeInstance(nextState, orphanInstanceId)
    }
    return nextState
  })
}

function canAdoptPendingHostInstance(params: {
  reconnectInstanceId: string
  sourceWindow?: unknown
  appId: string
  getState: () => AgentState
  identityMap: Map<string, InstanceIdentityRecord>
}): boolean {
  const { reconnectInstanceId, appId, getState, identityMap } = params

  if (identityMap.has(reconnectInstanceId)) {
    return false
  }

  const existingInstance = getInstance(getState(), reconnectInstanceId)
  return existingInstance?.state === AppInstanceState.PENDING && existingInstance.appId === appId
}

function findSolePendingHostInstanceId(
  state: AgentState,
  appId: string,
  identityMap: Map<string, InstanceIdentityRecord>,
): string | undefined {
  const pendingHostInstances = Object.values(state.instances).filter(
    instance =>
      instance.appId === appId &&
      instance.state === AppInstanceState.PENDING &&
      !identityMap.has(instance.instanceId),
  )

  if (pendingHostInstances.length !== 1) {
    return undefined
  }

  return pendingHostInstances[0]!.instanceId
}
