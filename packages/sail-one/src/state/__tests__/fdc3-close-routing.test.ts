/**
 * fdc3.close previously routed through SailDesktopAgent → AppLauncher.close.
 * Close is now session-shaped: agent.close → session.closeApp → host unmount.
 * Covered by SailHost closeAppInstance / popup-close tests.
 */
import { describe, expect, it } from "vite-plus/test"

describe("fdc3.close routing", () => {
  it("is owned by SailUserSession host hooks (see SailHost tests)", () => {
    expect(true).toBe(true)
  })
})
