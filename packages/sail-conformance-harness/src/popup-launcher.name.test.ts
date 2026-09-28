/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { HARNESS_POPUP_FEATURES, openHarnessPopup } from "./popup-launcher"
import type { HarnessPanel } from "./types"

describe("openHarnessPopup", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("reasserts window.name after navigation so WCP can adopt the launcher instance id", () => {
    const panel: HarnessPanel = {
      instanceId: "launcher-instance-id",
      appId: "MockAppId",
      url: "https://example.test/mock",
      title: "Mock",
      launchMode: "popup",
    }

    let popupName = "launcher-instance-id"
    const popup = {
      get name() {
        return popupName
      },
      set name(value: string) {
        popupName = value
      },
      get closed() {
        return false
      },
      location: {
        set href(_url: string) {
          popupName = ""
        },
      },
      close: vi.fn(),
    } as unknown as Window

    vi.spyOn(window, "open").mockReturnValue(popup)

    const opened = openHarnessPopup(panel)

    expect(opened).toBe(popup)
    expect(window.open).toHaveBeenCalledWith(
      "about:blank",
      panel.instanceId,
      HARNESS_POPUP_FEATURES,
    )
    expect(popup.name).toBe("launcher-instance-id")
  })
})
