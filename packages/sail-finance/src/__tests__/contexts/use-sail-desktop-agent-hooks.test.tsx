import { describe, test, expect, vi, afterEach } from "vite-plus/test"
import { renderHook } from "@testing-library/react"
import type { SailDesktopAgent } from "@finos/sail-desktop-agent"

import { SailDesktopAgentProvider } from "../../contexts/SailDesktopAgentContext"
import {
  useSailDesktopAgent,
  useAppDirectoryStore,
  useConnectionStore,
  useIntentResolverStore,
} from "../../contexts/use-sail-desktop-agent-hooks"

// Minimal fake: createConnectionStore and createIntentResolverStore subscribe
// to agent.apps/agent.channels/agent.intentResolver eagerly at
// store-construction time (see stores/connection-store.ts and
// stores/intent-resolver-store.ts), so the provider needs no-op subscription
// methods to mount without crashing. createAppDirectoryStore only touches
// `agent` inside action closures.
const fakeAgent = {
  apps: {
    onConnect: vi.fn(() => () => {}),
    onDisconnect: vi.fn(() => () => {}),
    onHandshakeFailure: vi.fn(() => () => {}),
    getConnection: vi.fn(() => undefined),
  },
  channels: {
    onAppChannelChange: vi.fn(() => () => {}),
  },
  intentResolver: {
    onRequest: vi.fn(() => () => {}),
  },
} as unknown as SailDesktopAgent

function withProvider({ children }: { children: React.ReactNode }) {
  return <SailDesktopAgentProvider agent={fakeAgent}>{children}</SailDesktopAgentProvider>
}

// React logs a component-stack error to the console whenever a render throws.
// That's expected here (it's the bug under test), so keep the test output
// readable without hiding the thrown error itself, which the assertions
// below still observe via renderHook's exception propagation.
function silenceExpectedConsoleError() {
  return vi.spyOn(console, "error").mockImplementation(() => {})
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("useSailDesktopAgent", () => {
  test("throws when called outside SailDesktopAgentProvider", () => {
    const consoleError = silenceExpectedConsoleError()

    expect(() => renderHook(() => useSailDesktopAgent())).toThrow(
      "useSailDesktopAgent must be used within SailDesktopAgentProvider",
    )

    consoleError.mockRestore()
  })

  test("returns the provided agent when called inside SailDesktopAgentProvider", () => {
    const { result } = renderHook(() => useSailDesktopAgent(), { wrapper: withProvider })

    expect(result.current).toBe(fakeAgent)
  })
})

describe("useAppDirectoryStore", () => {
  test("throws when called outside SailDesktopAgentProvider", () => {
    const consoleError = silenceExpectedConsoleError()

    expect(() => renderHook(() => useAppDirectoryStore())).toThrow(
      "useAppDirectoryStore must be used within SailDesktopAgentProvider",
    )

    consoleError.mockRestore()
  })

  test("returns app directory state when called inside SailDesktopAgentProvider", () => {
    const { result } = renderHook(() => useAppDirectoryStore(), { wrapper: withProvider })

    expect(result.current.apps).toEqual([])
  })
})

describe("useConnectionStore", () => {
  test("throws when called outside SailDesktopAgentProvider", () => {
    const consoleError = silenceExpectedConsoleError()

    expect(() => renderHook(() => useConnectionStore())).toThrow(
      "useConnectionStore must be used within SailDesktopAgentProvider",
    )

    consoleError.mockRestore()
  })

  test("returns connection state when called inside SailDesktopAgentProvider", () => {
    const { result } = renderHook(() => useConnectionStore(), { wrapper: withProvider })

    expect(result.current.connections).toBeInstanceOf(Map)
  })
})

describe("useIntentResolverStore", () => {
  test("throws when called outside SailDesktopAgentProvider", () => {
    const consoleError = silenceExpectedConsoleError()

    expect(() => renderHook(() => useIntentResolverStore())).toThrow(
      "useIntentResolverStore must be used within SailDesktopAgentProvider",
    )

    consoleError.mockRestore()
  })

  test("returns intent resolver state when called inside SailDesktopAgentProvider", () => {
    const { result } = renderHook(() => useIntentResolverStore(), { wrapper: withProvider })

    expect(result.current.isOpen).toBe(false)
  })
})
