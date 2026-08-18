export interface InstanceIdentityRecord {
  appId: string
  instanceUuid: string
  origin: string
  sourceWindow: unknown
}

const instanceIdentityRegistry = new WeakMap<object, Map<string, InstanceIdentityRecord>>()

export function getInstanceIdentityMap(owner: object): Map<string, InstanceIdentityRecord> {
  let map = instanceIdentityRegistry.get(owner)
  if (!map) {
    map = new Map<string, InstanceIdentityRecord>()
    instanceIdentityRegistry.set(owner, map)
  }
  return map
}

/** Remove a disconnected instance from the per-connection identity map. */
export function pruneInstanceIdentity(owner: object, instanceId: string): void {
  getInstanceIdentityMap(owner).delete(instanceId)
}

/** Test-only: count of identity records retained for a connection owner. */
export function getInstanceIdentityCountForTesting(owner: object): number {
  return instanceIdentityRegistry.get(owner)?.size ?? 0
}

/** Test-only: whether a specific instance id is still in the identity map. */
export function hasInstanceIdentityForTesting(owner: object, instanceId: string): boolean {
  return instanceIdentityRegistry.get(owner)?.has(instanceId) ?? false
}
