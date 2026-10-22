import type { SailExtensionStorage } from "@finos/sail-extension"

export type SessionExtensionData = {
  data: Record<string, Record<string, unknown>>
}

export function createSessionExtensionStorage(
  holder: SessionExtensionData,
  extensionId: string,
): SailExtensionStorage {
  return {
    get<T>(key: string): Promise<T | null> {
      const bag = holder.data[extensionId]
      if (!bag || !Object.prototype.hasOwnProperty.call(bag, key)) {
        return Promise.resolve(null)
      }
      return Promise.resolve(bag[key] as T)
    },
    set<T>(key: string, value: T): Promise<void> {
      holder.data[extensionId] = { ...holder.data[extensionId], [key]: value }
      return Promise.resolve()
    },
    remove(key: string): Promise<void> {
      const bag = holder.data[extensionId]
      if (!bag) {
        return Promise.resolve()
      }
      const next = { ...bag }
      delete next[key]
      holder.data[extensionId] = next
      return Promise.resolve()
    },
  }
}
