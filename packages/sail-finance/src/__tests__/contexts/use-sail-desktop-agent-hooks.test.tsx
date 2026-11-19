import { describe, test, expect, vi, afterEach } from "vite-plus/test"
import { renderHook } from "@testing-library/react"

import { SailHostAgentProvider } from "../../contexts/SailDesktopAgentContext"
import {
  useSailHostAgent,
  useAppDirectoryStore,
  useConnectionStore,
  useIntentResolverStore,
} from "../../contexts/use-sail-desktop-agent-hooks"
import type { SailHostAgent } from "../../agent/sail-host-agent"

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
} as unknown as SailHostAgent

function withProvider({ children }: { children: React.ReactNode }) {
  return <SailHostAgentProvider agent={fakeAgent}>{children}</SailHostAgentProvider>
}

function silenceExpectedConsoleError() {
  return vi.spyOn(console, "error").mockImplementation(() => {})
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("useSailHostAgent", () => {
  test("throws outside provider", () => {
    const spy = silenceExpectedConsoleError()
    expect(() => renderHook(() => useSailHostAgent())).toThrow(
      "useSailHostAgent must be used within SailHostAgentProvider",
    )
    spy.mockRestore()
  })

  test("returns agent inside provider", () => {
    const { result } = renderHook(() => useSailHostAgent(), { wrapper: withProvider })
    expect(result.current).toBe(fakeAgent)
  })
})

describe("useAppDirectoryStore", () => {
  test("throws outside provider", () => {
    const spy = silenceExpectedConsoleError()
    expect(() => renderHook(() => useAppDirectoryStore())).toThrow(
      "useAppDirectoryStore must be used within SailHostAgentProvider",
    )
    spy.mockRestore()
  })

  test("returns store inside provider", () => {
    const { result } = renderHook(() => useAppDirectoryStore(), { wrapper: withProvider })
    expect(result.current).toBeDefined()
  })
})

describe("useConnectionStore", () => {
  test("throws outside provider", () => {
    const spy = silenceExpectedConsoleError()
    expect(() => renderHook(() => useConnectionStore())).toThrow(
      "useConnectionStore must be used within SailHostAgentProvider",
    )
    spy.mockRestore()
  })

  test("returns store inside provider", () => {
    const { result } = renderHook(() => useConnectionStore(), { wrapper: withProvider })
    expect(result.current).toBeDefined()
  })
})

describe("useIntentResolverStore", () => {
  test("throws outside provider", () => {
    const spy = silenceExpectedConsoleError()
    expect(() => renderHook(() => useIntentResolverStore())).toThrow(
      "useIntentResolverStore must be used within SailHostAgentProvider",
    )
    spy.mockRestore()
  })

  test("returns store inside provider", () => {
    const { result } = renderHook(() => useIntentResolverStore(), { wrapper: withProvider })
    expect(result.current).toBeDefined()
  })
})
