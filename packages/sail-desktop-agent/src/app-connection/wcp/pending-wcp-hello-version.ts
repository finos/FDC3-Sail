/**
 * WCP4 identity validation stores the app's FDC3 version on its instance, but the version arrived
 * earlier, in `WCP1Hello`, and `WCP4ValidateAppIdentity` does not carry it. The edge that saw the
 * hello threads it here, keyed by the connection backend owner and the pending temp instanceId —
 * the same seam as {@link setPendingWcpMessageOrigin}.
 */
const pendingHelloVersionRegistry = new WeakMap<object, Map<string, string>>()

function getPendingMap(owner: object): Map<string, string> {
  let map = pendingHelloVersionRegistry.get(owner)
  if (!map) {
    map = new Map<string, string>()
    pendingHelloVersionRegistry.set(owner, map)
  }
  return map
}

export function setPendingWcpHelloFdc3Version(
  owner: object,
  tempInstanceId: string,
  fdc3Version: string,
): void {
  getPendingMap(owner).set(tempInstanceId, fdc3Version)
}

export function takePendingWcpHelloFdc3Version(
  owner: object,
  tempInstanceId: string,
): string | undefined {
  const map = pendingHelloVersionRegistry.get(owner)
  const fdc3Version = map?.get(tempInstanceId)
  if (fdc3Version !== undefined) {
    map?.delete(tempInstanceId)
    return fdc3Version
  }
  return undefined
}
