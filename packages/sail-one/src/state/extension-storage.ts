import { createLocalStorage, type SailStorage } from "@finos/sail-platform"
import type { SailExtensionStorage } from "@finos/sail-extension"

const STORAGE_CONFIG = { keyPrefix: "sail_one_" }

function asExtensionStorage(storage: SailStorage, prefix: string): SailExtensionStorage {
  const scoped = (key: string): string => `${prefix}${key}`
  return {
    get: <T>(key: string) => storage.get<T>(scoped(key)),
    set: <T>(key: string, value: T) => storage.set(scoped(key), value),
    remove: (key: string) => storage.remove(scoped(key)),
  }
}

const root = createLocalStorage(STORAGE_CONFIG)

export function createSailOneExtensionStorage(extensionId: string): SailExtensionStorage {
  return asExtensionStorage(root, `ext/${extensionId}/`)
}
