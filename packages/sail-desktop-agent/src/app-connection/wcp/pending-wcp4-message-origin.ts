/**
 * WCP4 identity validation needs the WCP1Hello message origin for its origin-match check.
 * On the browser edge, {@link BrowserAppConnection}'s `enrichMessageWithSource` stamps
 * `meta.messageOrigin` directly onto the (already schema-validated) message, so
 * `wcp-identity-validation.ts` reads it straight off `message.meta` there.
 *
 * The DACP test edge has no such enrichment step, and `meta.messageOrigin` is not a legal
 * WCP4 wire field (`ConnectionStepMeta` only permits `connectionAttemptUuid`/`timestamp`) — a
 * fixture that puts it in `meta` fails schema validation. This registry threads the value out
 * of band instead, the same way {@link setPendingWcpSourceWindow} threads the WCP1Hello source
 * window, keyed by the connection backend owner and the pending temp instanceId.
 */
const pendingMessageOriginRegistry = new WeakMap<object, Map<string, string>>()

function getPendingMap(owner: object): Map<string, string> {
  let map = pendingMessageOriginRegistry.get(owner)
  if (!map) {
    map = new Map<string, string>()
    pendingMessageOriginRegistry.set(owner, map)
  }
  return map
}

export function setPendingWcpMessageOrigin(
  owner: object,
  tempInstanceId: string,
  messageOrigin: string,
): void {
  getPendingMap(owner).set(tempInstanceId, messageOrigin)
}

export function takePendingWcpMessageOrigin(
  owner: object,
  tempInstanceId: string,
): string | undefined {
  const map = pendingMessageOriginRegistry.get(owner)
  const messageOrigin = map?.get(tempInstanceId)
  if (messageOrigin !== undefined) {
    map?.delete(tempInstanceId)
    return messageOrigin
  }
  return undefined
}
