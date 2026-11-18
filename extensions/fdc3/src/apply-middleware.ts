import type { FDC3ServerInstance, InstanceID } from "@finos/sail-headless-agent"
import type { RegisterMiddleware, SailMiddleware } from "./api"

type Entry = SailMiddleware & { priority: number; id: number }
type Inbound = { type: string }

/**
 * Compose receive/post middleware around an FDC3ServerInstance (Proxy).
 */
export function createRegisterMiddleware(inner: FDC3ServerInstance): {
  agent: FDC3ServerInstance
  registerMiddleware: RegisterMiddleware
} {
  const entries: Entry[] = []
  let nextId = 0

  const agent = new Proxy(inner, {
    get(target, prop, receiver) {
      if (prop === "receive") {
        return async (message: Inbound, from: InstanceID) => {
          const chain = [...entries].sort((a, b) => b.priority - a.priority)
          const run = async (index: number): Promise<void> => {
            if (index >= chain.length) {
              return target.receive(message, from)
            }
            const mw = chain[index]!
            if (!mw.receive) {
              return run(index + 1)
            }
            const nextReceiver = new Proxy(receiver as FDC3ServerInstance, {
              get(t, p, r) {
                if (p === "receive") {
                  return (_m: Inbound, _f: InstanceID) => run(index + 1)
                }
                return Reflect.get(t, p, r)
              },
            })
            return mw.receive.call(nextReceiver, message, from)
          }
          return run(0)
        }
      }
      if (prop === "post") {
        return async (message: object, instanceId: InstanceID) => {
          const chain = [...entries].sort((a, b) => b.priority - a.priority)
          const run = async (index: number): Promise<void> => {
            if (index >= chain.length) {
              return target.post(message, instanceId)
            }
            const mw = chain[index]!
            if (!mw.post) {
              return run(index + 1)
            }
            const nextReceiver = new Proxy(receiver as FDC3ServerInstance, {
              get(t, p, r) {
                if (p === "post") {
                  return (_m: object, _id: InstanceID) => run(index + 1)
                }
                return Reflect.get(t, p, r)
              },
            })
            return mw.post.call(nextReceiver, message, instanceId)
          }
          return run(0)
        }
      }
      const value: unknown = Reflect.get(target, prop, receiver)
      if (typeof value === "function") {
        return (value as (this: unknown, ...args: never[]) => unknown).bind(receiver)
      }
      return value
    },
  }) as FDC3ServerInstance

  const registerMiddleware: RegisterMiddleware = mw => {
    const entry: Entry = {
      ...mw,
      priority: mw.priority ?? 0,
      id: nextId++,
    }
    entries.push(entry)
    return {
      dispose() {
        const idx = entries.indexOf(entry)
        if (idx >= 0) {
          entries.splice(idx, 1)
        }
      },
    }
  }

  return { agent, registerMiddleware }
}
