import { beforeEach, describe, expect, it, vi } from "vite-plus/test"
import type { DirectoryApp } from "@finos/sail-desktop-agent"
import { getServerState } from "../../state"
import { installLocalStorage } from "../../state/__tests__/local-storage-mock"
import { getAllContextTypes, getAllIntentNames } from "../custom-apps"

describe("getAllIntentNames", () => {
  beforeEach(() => {
    installLocalStorage()
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("unexpected fetch in getAllIntentNames test"))),
    )
  })

  it("unions app-declared listensFor/raises intents with the static list, deduped", async () => {
    const apps: DirectoryApp[] = [
      {
        appId: "app-listener",
        name: "app-listener",
        title: "app-listener",
        type: "web",
        details: { url: "https://app-listener.example/" },
        interop: {
          intents: {
            listensFor: {
              // Declared only by this app - must appear in the result.
              CustomListenIntent: { contexts: ["fdc3.instrument"] },
              // Also a static `intentTypes` title - must not produce a duplicate.
              ViewChart: { contexts: ["fdc3.instrument"] },
            },
          },
        },
      },
      {
        appId: "app-raiser",
        name: "app-raiser",
        title: "app-raiser",
        type: "web",
        details: { url: "https://app-raiser.example/" },
        interop: {
          intents: {
            raises: {
              // Declared only by this app - must appear in the result.
              CustomRaiseIntent: ["fdc3.instrument"],
              // Also declared by app-listener's listensFor - must not duplicate.
              CustomListenIntent: ["fdc3.contact"],
            },
          },
        },
      },
      {
        // No `interop` at all - must not throw, and must contribute nothing.
        appId: "app-no-interop",
        name: "app-no-interop",
        title: "app-no-interop",
        type: "web",
        details: { url: "https://app-no-interop.example/" },
      },
    ]

    await getServerState().registerDesktopAgent({
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
      customApps: apps,
    })

    const names = getAllIntentNames()

    expect(names).toContain("CustomListenIntent")
    expect(names).toContain("CustomRaiseIntent")
    expect(names).toContain("ViewChart")
    // Named by both intentTypes and app-listener's listensFor - exactly one entry.
    expect(names.filter(n => n === "ViewChart")).toHaveLength(1)
    // Named by both app-listener's listensFor and app-raiser's raises - exactly one entry.
    expect(names.filter(n => n === "CustomListenIntent")).toHaveLength(1)
  })
})

describe("getAllContextTypes", () => {
  beforeEach(() => {
    installLocalStorage()
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("unexpected fetch in getAllContextTypes test"))),
    )
  })

  it("unions app-declared user channel and app channel context types with the static list", async () => {
    const apps: DirectoryApp[] = [
      {
        appId: "app-user-channels",
        name: "app-user-channels",
        title: "app-user-channels",
        type: "web",
        details: { url: "https://app-user-channels.example/" },
        interop: {
          userChannels: {
            // Declared only by this app - must appear in the result.
            listensFor: ["custom.userListen"],
            broadcasts: ["custom.userBroadcast"],
          },
        },
      },
      {
        appId: "app-app-channels",
        name: "app-app-channels",
        title: "app-app-channels",
        type: "web",
        details: { url: "https://app-app-channels.example/" },
        interop: {
          appChannels: [
            {
              id: "app-channel-1",
              // Declared only by this app - must appear in the result.
              broadcasts: ["custom.appBroadcast"],
              listensFor: ["custom.appListen"],
            },
          ],
        },
      },
      {
        // No `interop` at all - must not throw, and the static CONTEXT_TYPES seed list must
        // still come back.
        appId: "app-no-interop",
        name: "app-no-interop",
        title: "app-no-interop",
        type: "web",
        details: { url: "https://app-no-interop.example/" },
      },
    ]

    await getServerState().registerDesktopAgent({
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
      customApps: apps,
    })

    const contexts = getAllContextTypes()

    expect(contexts).toContain("custom.userListen")
    expect(contexts).toContain("custom.userBroadcast")
    expect(contexts).toContain("custom.appBroadcast")
    expect(contexts).toContain("custom.appListen")
    // Static CONTEXT_TYPES seed list still comes back alongside app-declared types.
    expect(contexts).toContain("fdc3.instrument")
  })

  it("unions app-declared intent listensFor/raises context types with the static list, deduped and sorted", async () => {
    const apps: DirectoryApp[] = [
      {
        appId: "app-intent-listener",
        name: "app-intent-listener",
        title: "app-intent-listener",
        type: "web",
        details: { url: "https://app-intent-listener.example/" },
        interop: {
          intents: {
            listensFor: {
              // Declared only by this app - must appear in the result.
              SomeIntent: { contexts: ["custom.intentListenContext", "fdc3.contact"] },
            },
          },
        },
      },
      {
        appId: "app-intent-raiser",
        name: "app-intent-raiser",
        title: "app-intent-raiser",
        type: "web",
        details: { url: "https://app-intent-raiser.example/" },
        interop: {
          intents: {
            raises: {
              // Declared only by this app - must appear in the result.
              OtherIntent: [
                "custom.intentRaiseContext",
                // Also declared by app-intent-listener's listensFor - must not duplicate.
                "custom.intentListenContext",
              ],
            },
          },
        },
      },
    ]

    await getServerState().registerDesktopAgent({
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
      customApps: apps,
    })

    const contexts = getAllContextTypes()

    expect(contexts).toContain("custom.intentListenContext")
    expect(contexts).toContain("custom.intentRaiseContext")
    // Named by both app-intent-listener's listensFor and app-intent-raiser's raises - exactly
    // one entry.
    expect(contexts.filter(c => c === "custom.intentListenContext")).toHaveLength(1)
    // The function ends with `[...new Set(...)].sort()` - the result must be in sorted order.
    expect(contexts).toEqual([...contexts].sort())
  })
})
