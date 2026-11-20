import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import type { SailApp, SailPlatformCatalog } from "@finos/sail-platform"

interface AppDirectoryState {
  apps: SailApp[]
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
}

interface AppDirectoryActions {
  setApps: (apps: SailApp[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearApps: () => void
  loadApps: () => void | Promise<void>
  refreshApps: () => Promise<void>
}

export interface AppDirectoryStore extends AppDirectoryState, AppDirectoryActions {}

export const createAppDirectoryStore = (catalog: SailPlatformCatalog) =>
  create<AppDirectoryStore>()(
    immer((set, get) => ({
      apps: [] as SailApp[],
      isLoading: false,
      error: null as string | null,
      lastUpdated: null as Date | null,

      setApps: (apps: SailApp[]) =>
        set(state => {
          state.apps = apps
          state.lastUpdated = new Date()
          state.error = null
        }),

      setLoading: (loading: boolean) =>
        set(state => {
          state.isLoading = loading
        }),

      setError: (error: string | null) =>
        set(state => {
          state.error = error
          if (error) {
            state.isLoading = false
          }
        }),

      clearApps: () =>
        set(state => {
          state.apps = []
          state.lastUpdated = new Date()
          state.error = null
        }),

      loadApps: async () => {
        const { setLoading, setError, setApps } = get()

        try {
          setLoading(true)
          setError(null)
          setApps((await catalog.list()).filter(app => !app.hidden))
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to load apps"
          setError(errorMessage)
          console.error("Failed to load app catalogue:", error)
        } finally {
          setLoading(false)
        }
      },

      refreshApps: async () => {
        await get().loadApps()
      },
    })),
  )
