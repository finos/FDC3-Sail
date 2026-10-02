/**
 * Vitest setup for sail-desktop-agent unit tests.
 */

import { afterEach, vi } from "vite-plus/test"

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})
