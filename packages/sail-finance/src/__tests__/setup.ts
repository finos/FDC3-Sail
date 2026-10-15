import { beforeAll, afterEach, afterAll, vi } from "vite-plus/test"
import { cleanup } from "@testing-library/react"
import { resetAllStores } from "../__mocks__/zustand"

beforeAll(() => {
  // Setup before all tests
  console.log("Test setup initialized")
})

afterEach(() => {
  // Clean up React Testing Library
  cleanup()

  // Reset all Zustand stores to initial state
  resetAllStores()

  // Clear all mocks
  vi.clearAllMocks()
})

afterAll(() => {
  // Cleanup after all tests
  console.log("Test cleanup completed")
})

// Mock localStorage for testing
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
})

// Mock window.matchMedia for theme testing
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock iframe contentWindow for FDC3 testing
const mockContentWindow = {
  postMessage: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
} as unknown as Window

Object.defineProperty(HTMLIFrameElement.prototype, "contentWindow", {
  get: () => mockContentWindow,
})
