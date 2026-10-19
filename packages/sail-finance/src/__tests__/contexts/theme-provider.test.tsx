import { describe, test, expect, vi, afterEach } from "vite-plus/test"
import { renderHook } from "@testing-library/react"

import { ThemeProvider, useTheme } from "../../components/theme/theme-provider"

// React logs a component-stack error to the console whenever a render throws.
// That's expected here (it's the bug under test); suppress it per-test so
// output stays readable without hiding the assertion itself.
function silenceExpectedConsoleError() {
  return vi.spyOn(console, "error").mockImplementation(() => {})
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("useTheme", () => {
  test("throws when called outside ThemeProvider", () => {
    const consoleError = silenceExpectedConsoleError()

    expect(() => renderHook(() => useTheme())).toThrow(
      "useTheme must be used within a ThemeProvider",
    )

    consoleError.mockRestore()
  })

  test("returns the provided theme state when called inside ThemeProvider", () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider defaultTheme="dark">{children}</ThemeProvider>,
    })

    expect(result.current.theme).toBe("dark")
    expect(typeof result.current.setTheme).toBe("function")
  })
})
