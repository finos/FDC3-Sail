import { beforeEach, describe, expect, it, vi } from "vite-plus/test"
import type { DirectoryApp } from "@finos/sail-desktop-agent"
import { AppInstanceState, SailHost } from "../sail-host"
import { AppHosting } from "../default-app-state"
import type { SailClientStateArgs } from "../client-state"
import { installLocalStorage } from "./local-storage-mock"

function makeWebApp(appId: string, url: string): DirectoryApp {
  return {
    appId,
    name: appId,
    title: appId,
    type: "web",
    details: { url },
  }
}

function clientArgs(overrides: Partial<SailClientStateArgs> = {}): SailClientStateArgs {
  return {
    userSessionId: "user-test",
    directories: [],
    channels: [
      {
        id: "One",
        icon: "/icons/tabs/noun-airplane-3707662.svg",
        background: "#0061F2",
      },
    ],
    panels: [],
    customApps: [makeWebApp("demo-app", "https://app.example/page")],
    ...overrides,
  }
}

describe("SailHost", () => {
  beforeEach(() => {
    installLocalStorage()
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("unexpected fetch in smoke test"))),
    )
  })

  it("registerDesktopAgent exposes local custom apps via getKnownApps", async () => {
    const host = new SailHost()
    await host.registerDesktopAgent(clientArgs())

    const apps = host.getKnownApps()
    expect(apps.map(a => a.appId)).toContain("demo-app")
  })

  it("registerAppLaunch returns the instance id minted by the desktop agent", async () => {
    const host = new SailHost()
    await host.registerDesktopAgent(clientArgs())

    const instanceId = await host.registerAppLaunch("demo-app", AppHosting.Frame, "One", "Demo 1")

    expect(instanceId).toBeTruthy()
    expect(host.getAppInstanceState(instanceId)).toBe(AppInstanceState.Pending)
  })

  it("sendClientState absorbs a new tab channel without throwing", async () => {
    const host = new SailHost()
    const initial = clientArgs()
    await host.registerDesktopAgent(initial)

    await host.sendClientState(
      clientArgs({
        channels: [
          ...initial.channels,
          {
            id: "Four",
            icon: "/icons/tabs/noun-console-3707664.svg",
            background: "#00A86B",
          },
        ],
      }),
    )

    // Restarting for the new channel set must leave a usable agent behind.
    expect(host.getKnownApps().map(a => a.appId)).toContain("demo-app")
  })

  it("setUserChannel returns immediately for an instance the agent does not know", async () => {
    const host = new SailHost()
    await host.registerDesktopAgent(clientArgs())

    // Without the guard this waits out the agent's channel-change timeout.
    await host.setUserChannel("never-connected", "One")
  })

  it("sendClientState adds a newly activated directory without restarting", async () => {
    const host = new SailHost()
    await host.registerDesktopAgent(clientArgs())
    const before = host.getKnownApps()

    // The stubbed fetch rejects, so the add is logged and swallowed; the point is
    // that an additive directory change does not tear the agent down.
    await host.sendClientState(clientArgs({ directories: ["https://directory.example/v2/apps"] }))

    expect(host.getKnownApps()).toEqual(before)
  })

  it("registerAppLaunch throws before the desktop agent is registered", async () => {
    const host = new SailHost()
    await expect(
      host.registerAppLaunch("demo-app", AppHosting.Frame, null, "Demo"),
    ).rejects.toThrow("Desktop Agent not registered")
  })
})
