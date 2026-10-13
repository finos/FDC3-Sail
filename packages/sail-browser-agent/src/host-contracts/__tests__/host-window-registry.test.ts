import { describe, expect, it } from "vite-plus/test"

import { createHostWindowRegistry } from "../host-window-registry"

describe("createHostWindowRegistry", () => {
  it("maps a Window proxy to the launcher instance id", () => {
    const registry = createHostWindowRegistry()
    const win = { name: "panel-1" } as Window
    registry.register(win, "panel-1")
    expect(registry.getInstanceId(win)).toBe("panel-1")
    expect(registry.findWindow("panel-1")).toBe(win)
  })

  it("returns undefined for an unregistered Window", () => {
    const registry = createHostWindowRegistry()
    expect(registry.getInstanceId({ name: "missing" } as Window)).toBeUndefined()
  })

  it("re-keys when the same Window is registered under a new instance id", () => {
    const registry = createHostWindowRegistry()
    const win = { name: "launcher" } as Window
    registry.register(win, "launcher")
    registry.register(win, "validated")
    expect(registry.getInstanceId(win)).toBe("validated")
    expect(registry.findWindow("launcher")).toBeUndefined()
    expect(registry.findWindow("validated")).toBe(win)
  })

  it("forget removes reverse lookup", () => {
    const registry = createHostWindowRegistry()
    const win = { name: "gone" } as Window
    registry.register(win, "gone")
    registry.forget("gone")
    expect(registry.getInstanceId(win)).toBeUndefined()
    expect(registry.findWindow("gone")).toBeUndefined()
  })
})
