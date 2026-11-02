import type { SailExtensionStorage } from "@finos/sail-extension"
import type { ClientState } from "../common"

export function createClientStateExtensionStorage(
  cs: ClientState,
  extensionId: string,
): SailExtensionStorage {
  return {
    async get<T>(key: string): Promise<T | null> {
      const bag = cs.getExtensionData(extensionId)
      if (!Object.prototype.hasOwnProperty.call(bag, key)) {
        return null
      }
      return bag[key] as T
    },
    async set<T>(key: string, value: T): Promise<void> {
      await cs.setExtensionData(extensionId, { ...cs.getExtensionData(extensionId), [key]: value })
    },
    async remove(key: string): Promise<void> {
      const next = { ...cs.getExtensionData(extensionId) }
      delete next[key]
      await cs.setExtensionData(extensionId, next)
    },
  }
}
