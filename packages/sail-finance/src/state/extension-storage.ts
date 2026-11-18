import { createLocalUserStorage, type SailUserStorage } from "@finos/sail-platform"
import type { SailExtensionStorage } from "@finos/sail-extension"

const root: SailUserStorage = createLocalUserStorage({ keyPrefix: "sail_finance_ext_" })

export function createSailFinanceExtensionStorage(extensionId: string): SailExtensionStorage {
  const prefix = `${extensionId}/`
  return {
    async get<T>(key: string): Promise<T | null> {
      return root.get<T>(`${prefix}${key}`)
    },
    async set<T>(key: string, value: T): Promise<void> {
      await root.set(`${prefix}${key}`, value)
    },
    async remove(key: string): Promise<void> {
      await root.remove(`${prefix}${key}`)
    },
    onChange(listener) {
      return root.onChange(change => {
        if (!change.key.startsWith(prefix)) {
          return
        }
        listener({ key: change.key.slice(prefix.length), op: change.op })
      })
    },
  }
}
