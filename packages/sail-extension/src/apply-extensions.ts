import type { FDC3ServerInstance } from "@finos/sail-headless-agent"

/**
 * Wrap an `FDC3ServerInstance` with method overrides.
 *
 * Uses a Proxy so host-specific methods (Sail session APIs, `SailDesktopAgent`
 * controllers) still resolve on the inner instance. Methods are bound to the
 * proxy so `this.receive` inside `start` / `handleMessage` hits overrides.
 */
export function applyExtensions<T extends FDC3ServerInstance>(
  inner: T,
  overrides: Partial<FDC3ServerInstance>,
): T {
  return new Proxy(inner, {
    get(target, prop, receiver) {
      if (Object.prototype.hasOwnProperty.call(overrides, prop)) {
        const value = overrides[prop as keyof FDC3ServerInstance]
        if (typeof value === "function") {
          return value.bind(receiver)
        }
        return value
      }
      const value: unknown = Reflect.get(target, prop, receiver)
      if (typeof value === "function") {
        // Bind to the proxy so `wrapped.start()` / `handleMessage` still see
        // overridden methods like `receive` via `this`.
        return (value as (this: unknown, ...args: never[]) => unknown).bind(receiver)
      }
      return value
    },
  })
}
