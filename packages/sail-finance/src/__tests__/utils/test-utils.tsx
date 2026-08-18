/* oxlint-disable react-refresh/only-export-components */
import { render, type RenderOptions } from "@testing-library/react"
import { type ReactElement } from "react"

import { ThemeProvider } from "../../components/theme/theme-provider"

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <ThemeProvider defaultTheme="system">{children}</ThemeProvider>
}

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) =>
  render(ui, { wrapper: AllTheProviders, ...options })

export * from "@testing-library/react"
export { customRender as render }

// Test utilities for store testing
export const createMockAppPanel = (overrides = {}) => ({
  title: "Test Panel",
  url: "https://example.com",
  tabId: "One",
  panelId: "test-panel-1",
  appId: "test-app",
  icon: null,
  ...overrides,
})

export const createMockFDC3AppPanel = (overrides = {}) => ({
  title: "Test FDC3 Panel",
  url: "https://example.com",
  tabId: "One",
  panelId: "test-fdc3-panel-1",
  appId: "test-fdc3-app",
  icon: null,
  ...overrides,
})
