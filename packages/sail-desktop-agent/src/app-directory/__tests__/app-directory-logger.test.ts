/**
 * Directory-load failure logging must use the host-supplied logger, not console.
 */

import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { createCapturingLogger } from "../../__tests__/utils/capturing-logger"
import { SailDesktopAgent } from "../../agent/sail-desktop-agent"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../agent/default-user-channels"

describe("app directory host logger", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("routes directory-load failure through the host logger instead of console", async () => {
    const logger = createCapturingLogger()
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const agent = new SailDesktopAgent({
      userChannels: DEFAULT_FDC3_USER_CHANNELS,
      logger,
    })

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Server Error",
    })

    await expect(agent.apps.addDirectory("https://example.com/apps")).rejects.toThrow(
      /Failed to load applications/,
    )

    expect(
      logger.errorCalls.some(
        call =>
          call.message.includes("Failed to load applications from") &&
          call.message.includes("https://example.com/apps"),
      ),
    ).toBe(true)

    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })
})
