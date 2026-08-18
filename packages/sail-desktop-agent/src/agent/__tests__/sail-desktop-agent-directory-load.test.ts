/**
 * Constructor appDirectories must not leave fetch failures as unhandled rejections.
 *
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { createCapturingLogger } from "../../__tests__/utils/capturing-logger"
import { DEFAULT_FDC3_USER_CHANNELS } from "../default-user-channels"
import { SailDesktopAgent } from "../sail-desktop-agent"

const FAILING_DIRECTORY_URL = "https://example.com/constructor-reject/apps"

describe("SailDesktopAgent constructor directory load", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("logs a rejecting appDirectories URL on the host logger without an unhandled rejection", async () => {
    const logger = createCapturingLogger()
    const unhandledReasons: unknown[] = []

    const onUnhandledRejection = (reason: unknown) => {
      unhandledReasons.push(reason)
    }
    const onWindowUnhandledRejection = (event: PromiseRejectionEvent) => {
      unhandledReasons.push(event.reason)
      event.preventDefault()
    }

    process.on("unhandledRejection", onUnhandledRejection)
    window.addEventListener("unhandledrejection", onWindowUnhandledRejection)

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
    })

    let agent: SailDesktopAgent | undefined
    try {
      agent = new SailDesktopAgent({
        userChannels: DEFAULT_FDC3_USER_CHANNELS,
        logger,
        appDirectories: [FAILING_DIRECTORY_URL],
        appConnectionOptions: {
          getIntentResolverUrl: () => false,
          getChannelSelectorUrl: () => false,
        },
      })

      await vi.waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
      // Allow the voided addAppDirectory rejection to surface if uncaught.
      await new Promise(resolve => setTimeout(resolve, 0))
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(unhandledReasons).toEqual([])

      expect(
        logger.errorCalls.some(
          call =>
            typeof call.message === "string" &&
            (call.message.includes(FAILING_DIRECTORY_URL) ||
              call.message.includes("Failed to load")),
        ),
      ).toBe(true)

      expect(agent.directoriesLoaded).toBeInstanceOf(Promise)
      await expect(agent.directoriesLoaded).resolves.toBeUndefined()
    } finally {
      process.off("unhandledRejection", onUnhandledRejection)
      window.removeEventListener("unhandledrejection", onWindowUnhandledRejection)
      agent?.stop()
    }
  })

  it("exposes directoriesLoaded that settles after configured directory loads finish", async () => {
    const logger = createCapturingLogger()

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([]),
    })

    const agent = new SailDesktopAgent({
      userChannels: DEFAULT_FDC3_USER_CHANNELS,
      logger,
      appDirectories: ["https://example.com/ok-directory/apps"],
      appConnectionOptions: {
        getIntentResolverUrl: () => false,
        getChannelSelectorUrl: () => false,
      },
    })

    try {
      expect(agent.directoriesLoaded).toBeInstanceOf(Promise)
      await expect(agent.directoriesLoaded).resolves.toBeUndefined()
    } finally {
      agent.stop()
    }
  })
})
