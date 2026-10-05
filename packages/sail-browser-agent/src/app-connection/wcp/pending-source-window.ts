/**
 * WCP4 identity validation needs the WCP1Hello source window for reconnect binding.
 * Window references are stored on the connection backend owner (not AgentState).
 */
const pendingSourceWindowRegistry = new WeakMap<object, Map<string, unknown>>()

function getPendingMap(owner: object): Map<string, unknown> {
  let map = pendingSourceWindowRegistry.get(owner)
  if (!map) {
    map = new Map<string, unknown>()
    pendingSourceWindowRegistry.set(owner, map)
  }
  return map
}

export function setPendingWcpSourceWindow(
  owner: object,
  tempInstanceId: string,
  sourceWindow: unknown,
): void {
  getPendingMap(owner).set(tempInstanceId, sourceWindow)
}

export function takePendingWcpSourceWindow(owner: object, tempInstanceId: string): unknown {
  const map = pendingSourceWindowRegistry.get(owner)
  const sourceWindow = map?.get(tempInstanceId)
  if (sourceWindow !== undefined) {
    map?.delete(tempInstanceId)
    return sourceWindow
  }
  return undefined
}

export function clearPendingWcpSourceWindow(owner: object, tempInstanceId: string): void {
  pendingSourceWindowRegistry.get(owner)?.delete(tempInstanceId)
}

/** Test-only: read pending source without removing. */
export function getPendingWcpSourceWindowForTesting(
  owner: object,
  tempInstanceId: string,
): unknown {
  return pendingSourceWindowRegistry.get(owner)?.get(tempInstanceId)
}
