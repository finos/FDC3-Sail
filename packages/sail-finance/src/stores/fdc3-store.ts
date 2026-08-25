import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import { enableMapSet } from "immer"

// Enable Map/Set support for Immer
enableMapSet()

interface FDC3State {
  registeredWindows: Map<string, Window>
}

interface FDC3Actions {
  registerWindow: (panelId: string, window: Window) => void
  unregisterWindow: (panelId: string) => void
  isWindowRegistered: (panelId: string) => boolean
  getAllRegisteredWindows: () => Map<string, Window>
  clearAllWindows: () => void
}

export interface FDC3Store extends FDC3State, FDC3Actions {}

export const createFDC3Store = () =>
  create<FDC3Store>()(
    immer((set, get) => ({
      // Initial state
      registeredWindows: new Map<string, Window>(),

      // Actions using Immer for clean immutable updates
      registerWindow: (panelId: string, window: Window) =>
        set(state => {
          // oxlint-disable-next-line typescript/no-unnecessary-condition -- nullable Window argument: window is typed required, but a caller can still pass null/undefined at runtime (see fdc3-store.test.ts:119-145)
          if (!panelId || !window) {
            console.warn("FDC3Store: Invalid panelId or window for registration")
            return
          }
          // Immer automatically handles Map updates
          state.registeredWindows.set(panelId, window as never)
        }),

      unregisterWindow: (panelId: string) =>
        set(state => {
          if (!panelId) {
            console.warn("FDC3Store: Invalid panelId for unregistration")
            return
          }
          state.registeredWindows.delete(panelId)
        }),

      clearAllWindows: () =>
        set(state => {
          state.registeredWindows.clear()
        }),

      // Computed getters - don't need Immer
      isWindowRegistered: (panelId: string) => {
        return get().registeredWindows.has(panelId)
      },

      getAllRegisteredWindows: () => {
        return new Map(get().registeredWindows)
      },
    })),
  )

export const useFDC3Store = createFDC3Store()
