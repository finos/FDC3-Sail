import { describe, test, expect, beforeEach, vi } from "vite-plus/test"
import { createFDC3Store } from "../../stores/fdc3-store"

let store: ReturnType<typeof createFDC3Store>

describe("FDC3Store", () => {
  const mockWindow = {
    postMessage: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as Window

  const mockWindow2 = {
    postMessage: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as Window

  beforeEach(() => {
    // Create fresh store for each test
    store = createFDC3Store()
    vi.clearAllMocks()
  })

  describe("Initial State", () => {
    test("should have empty registeredWindows Map initially", () => {
      expect(store.getState().registeredWindows).toBeInstanceOf(Map)
      expect(store.getState().registeredWindows.size).toBe(0)
    })
  })

  describe("Window Registration", () => {
    test("should register a window for a panel", () => {
      const panelId = "test-panel-1"

      store.getState().registerWindow(panelId, mockWindow)

      expect(store.getState().registeredWindows.get(panelId)).toBe(mockWindow)
      expect(store.getState().isWindowRegistered(panelId)).toBe(true)
    })

    test("should unregister a window by panelId", () => {
      const panelId = "test-panel-1"

      // Register then unregister
      store.getState().registerWindow(panelId, mockWindow)
      expect(store.getState().isWindowRegistered(panelId)).toBe(true)

      store.getState().unregisterWindow(panelId)
      expect(store.getState().isWindowRegistered(panelId)).toBe(false)
    })

    test("should check if window is registered", () => {
      const panelId = "test-panel-1"

      expect(store.getState().isWindowRegistered(panelId)).toBe(false)

      store.getState().registerWindow(panelId, mockWindow)
      expect(store.getState().isWindowRegistered(panelId)).toBe(true)
    })

    test("should get all registered windows", () => {
      const panelId1 = "test-panel-1"
      const panelId2 = "test-panel-2"

      store.getState().registerWindow(panelId1, mockWindow)
      store.getState().registerWindow(panelId2, mockWindow2)

      const allWindows = store.getState().getAllRegisteredWindows()

      expect(allWindows).toBeInstanceOf(Map)
      expect(allWindows.size).toBe(2)
      expect(allWindows.get(panelId1)).toBe(mockWindow)
      expect(allWindows.get(panelId2)).toBe(mockWindow2)

      // Should return a new Map (not direct reference)
      expect(allWindows).not.toBe(store.getState().registeredWindows)
    })

    test("should replace existing window for same panelId", () => {
      const panelId = "test-panel-1"

      // Register first window
      store.getState().registerWindow(panelId, mockWindow)
      expect(store.getState().registeredWindows.get(panelId)).toBe(mockWindow)

      // Register second window with same panelId - should replace
      store.getState().registerWindow(panelId, mockWindow2)
      expect(store.getState().registeredWindows.get(panelId)).toBe(mockWindow2)
      expect(store.getState().registeredWindows.size).toBe(1)
    })
  })

  describe("Cleanup Operations", () => {
    test("should clear all registered windows", () => {
      const panelId1 = "test-panel-1"
      const panelId2 = "test-panel-2"

      // Register multiple windows
      store.getState().registerWindow(panelId1, mockWindow)
      store.getState().registerWindow(panelId2, mockWindow2)
      expect(store.getState().registeredWindows.size).toBe(2)

      // Clear all
      store.getState().clearAllWindows()
      expect(store.getState().registeredWindows.size).toBe(0)
    })

    test("should handle unregistering non-existent window gracefully", () => {
      const initialSize = store.getState().registeredWindows.size

      store.getState().unregisterWindow("non-existent-panel")

      expect(store.getState().registeredWindows.size).toBe(initialSize)
    })
  })

  describe("Edge Cases", () => {
    test("should handle null window registration gracefully", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
      const panelId = "test-panel-1"

      store.getState().registerWindow(panelId, null as unknown as Window)

      expect(store.getState().isWindowRegistered(panelId)).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        "FDC3Store: Invalid panelId or window for registration",
      )

      consoleSpy.mockRestore()
    })

    test("should handle undefined window registration gracefully", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
      const panelId = "test-panel-1"

      store.getState().registerWindow(panelId, undefined as unknown as Window)

      expect(store.getState().isWindowRegistered(panelId)).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        "FDC3Store: Invalid panelId or window for registration",
      )

      consoleSpy.mockRestore()
    })

    test("should handle empty panelId gracefully", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

      store.getState().registerWindow("", mockWindow)

      expect(store.getState().registeredWindows.size).toBe(0)
      expect(consoleSpy).toHaveBeenCalledWith(
        "FDC3Store: Invalid panelId or window for registration",
      )

      consoleSpy.mockRestore()
    })

    test("should handle unregistering with empty panelId gracefully", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

      store.getState().unregisterWindow("")

      expect(consoleSpy).toHaveBeenCalledWith("FDC3Store: Invalid panelId for unregistration")

      consoleSpy.mockRestore()
    })
  })
})
