import { describe, expect, it, vi } from "vite-plus/test"
import { renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import type { SailPlatformCatalog, SailUserSession } from "@finos/sail-platform"

import { SailSessionProvider } from "../../contexts/SailSessionContext"
import {
  useSailSession,
  useSailCatalog,
  useAppDirectoryStore,
  useConnectionStore,
} from "../../contexts/use-sail-session-hooks"

const fakeSession = {
  closeApp: vi.fn(),
  registerHostWindow: vi.fn(),
  unregisterHostWindow: vi.fn(),
} as unknown as SailUserSession

const fakeCatalog = {
  list: vi.fn(() => []),
  addProvider: vi.fn(),
  removeProvider: vi.fn(),
} as unknown as SailPlatformCatalog

function withProvider({ children }: { children: ReactNode }) {
  return (
    <SailSessionProvider session={fakeSession} catalog={fakeCatalog}>
      {children}
    </SailSessionProvider>
  )
}

describe("useSailSession", () => {
  it("throws outside the provider", () => {
    expect(() => renderHook(() => useSailSession())).toThrow(
      "useSailSession must be used within SailSessionProvider",
    )
  })

  it("returns the session from context", () => {
    const { result } = renderHook(() => useSailSession(), { wrapper: withProvider })
    expect(result.current).toBe(fakeSession)
  })
})

describe("useSailCatalog", () => {
  it("returns the catalog from context", () => {
    const { result } = renderHook(() => useSailCatalog(), { wrapper: withProvider })
    expect(result.current).toBe(fakeCatalog)
  })
})

describe("useAppDirectoryStore", () => {
  it("throws outside the provider", () => {
    expect(() => renderHook(() => useAppDirectoryStore())).toThrow(
      "useAppDirectoryStore must be used within SailSessionProvider",
    )
  })
})

describe("useConnectionStore", () => {
  it("throws outside the provider", () => {
    expect(() => renderHook(() => useConnectionStore())).toThrow(
      "useConnectionStore must be used within SailSessionProvider",
    )
  })
})
